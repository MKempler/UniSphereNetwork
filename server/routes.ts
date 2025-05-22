import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { loginSchema, insertUserSchema, insertPostSchema } from "../shared/schema.ts";
import { detectLanguage, translateText } from "./translation.ts";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
// @ts-ignore: No type definitions for @decentralized-identity/ion-tools
// import * as Ion from '@decentralized-identity/ion-tools';
import { and, eq, gt, inArray } from "drizzle-orm";
// @ts-ignore: No type definitions for node-fetch (should be resolved by @types/node-fetch, but just in case)
import fetch from "node-fetch";
import { sql } from "drizzle-orm";
import { follows } from "../shared/schema.ts";
import { relayed_posts, circuits, circuit_posts, posts } from "../shared/schema.ts";
import { db } from "./db.ts";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import type { Session } from "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
    did?: string | null;
  }
}

// Node identity (did:web) config
const NODE_DID = process.env.NODE_DID || "did:web:localhost";
const NODE_PUBLIC_KEY = process.env.NODE_PUBLIC_KEY || "<replace-with-your-public-key>";
const NODE_DID_DOC = {
  "@context": "https://www.w3.org/ns/did/v1",
  id: NODE_DID,
  verificationMethod: [
    {
      id: `${NODE_DID}#key-1`,
      type: "JsonWebKey2020",
      controller: NODE_DID,
      publicKeyJwk: JSON.parse(NODE_PUBLIC_KEY)
    }
  ],
  authentication: [
    `${NODE_DID}#key-1`
  ]
};

const RELAY_URL = process.env.RELAY_URL || "http://localhost:5000";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to check authentication
  const authMiddleware = (req: Request, res: Response, next: () => void) => {
    // First check session from cookies
    if (req.session && req.session.userId) {
      console.log(`Auth successful via session for user ID: ${req.session.userId}`);
      // Ensure req.body.currentUserId is consistently set if primary auth is via session cookie
      if (!req.body.currentUserId) {
        req.body.currentUserId = req.session.userId;
      }
      next();
      return;
    }

    // If no session, check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionIdFromToken = authHeader.substring(7);
      console.log(`Attempting auth via Bearer token: ${sessionIdFromToken.substring(0, 8)}...`);
      
      // IDEALLY: Validate sessionIdFromToken against session store here and get userId
      // For now, if req.session.userId is somehow populated by express-session based on this token, use it.
      // This part is a bit weak if express-session isn't configured to link Bearer tokens to sessions directly.
      if (req.session && req.session.userId) { // This might be true if cookie also sent or session middleware somehow links token
        console.log(`Auth successful via Bearer token (linked to session) for user ID: ${req.session.userId}`);
        if (!req.body.currentUserId) {
          req.body.currentUserId = req.session.userId;
        }
        next();
        return;
      } else if (req.body.currentUserId && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
        // Fallback for mutations if token is present but not linked to an active server session by express-session,
        // AND currentUserId is in body. This assumes the client is trusted to send currentUserId after initial login.
        // This is a potential security trade-off if sessionIdFromToken is not validated.
        console.log(`Auth partially successful for mutation via Bearer token (token present but no direct session.userId), using currentUserId from body: ${req.body.currentUserId}`);
        next();
        return;
      }
    }

    // Fallback for non-GET requests if currentUserId is in the body, as a last resort.
    // This is a workaround for client-side issues with sending session/token headers.
    // Security consideration: This trusts currentUserId from the body without other auth headers.
    if (req.body.currentUserId && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      console.warn(`Auth fallback: Using currentUserId from body for ${req.method} ${req.path} as session/token failed. UserID: ${req.body.currentUserId}`);
      next();
      return;
    }

    console.log(`Auth failed for ${req.method} ${req.path}: No valid session, token, or acceptable fallback for this request type.`);
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Error handling helper
  const handleError = (error: unknown, res: Response) => {
    console.error("API Error:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({ message: fromZodError(error).message });
    } else if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500).json({ message: "An unknown error occurred" });
  };

  // Format post helper
  const formatPost = async (post: any, currentUserId?: number) => {
    const author = await storage.getUser(post.userId);
    if (!author) {
      // If author is not found, return null or a fallback object
      return null;
    }
    const likeCount = await storage.getPostInteractionCount(post.id, "like");
    const commentCount = await storage.getPostInteractionCount(post.id, "comment");
    const repostCount = await storage.getPostInteractionCount(post.id, "repost");
    let isLiked = false;
    let isReposted = false;
    let isSaved = false;
    
    if (currentUserId) {
      isLiked = await storage.hasInteraction(post.id, currentUserId, "like");
      isReposted = await storage.hasInteraction(post.id, currentUserId, "repost");
      isSaved = await storage.hasInteraction(post.id, currentUserId, "save");
    }
    
    let circuitName;
    if (post.circuitId) {
      const circuit = await storage.getCircuit(post.circuitId);
      circuitName = circuit?.name;
    }

    return {
      id: post.id,
      content: post.content,
      media: post.media,
      language: post.language,
      createdAt: formatDate(post.createdAt),
      author: {
        id: author.id,
        username: author.username,
        name: author.name,
        profileImage: author.profileImage,
        isVerified: author.isVerified
      },
      likeCount,
      commentCount,
      repostCount,
      isLiked,
      isReposted,
      isSaved,
      circuitId: post.circuitId,
      circuitName
    };
  };

  const formatUser = async (user: any, currentUserId?: number) => {
    const { password, ...userWithoutPassword } = user;
    const followers = await storage.getFollowerCount(user.id);
    const following = await storage.getFollowingCount(user.id);
    let isFollowing = false;
    
    if (currentUserId && currentUserId !== user.id) {
      isFollowing = await storage.isFollowing(currentUserId, user.id);
    }
    
    return {
      ...userWithoutPassword,
      followers,
      following,
      isFollowing,
      did: user.did,
      publicKey: user.publicKey
    };
  };

  // Helper to format dates
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
  };

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, username, email, password, did, publicKey, homeNode, language } = req.body;

    console.log('[/api/auth/register] Received request:');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    if (!name || !username || !email || !password || !did || !publicKey || !homeNode) {
      return res.status(400).json({ message: 'All fields are required, including did, publicKey, and homeNode.' });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    let parsedPublicKey;
    try {
      parsedPublicKey = JSON.parse(publicKey);
    } catch (e) {
      console.error('[/api/auth/register] Failed to parse publicKey JSON:', publicKey, e);
      return res.status(400).json({ message: "Invalid publicKey format. Should be a JSON string." });
    }

    // In the /api/auth/register route, comment out or remove the DID resolution/validation block that uses Ion
    // try {
    //   console.log('[/api/auth/register] Attempting to resolve DID:', did);
    //   const didDocumentResolution = await Ion.resolve(did);
    //   console.log('[/api/auth/register] DID resolved. Resolution object:', JSON.stringify(didDocumentResolution, null, 2));

    //   if (!didDocumentResolution || !didDocumentResolution.didDocument) {
    //     console.error('[/api/auth/register] Ion.resolve did not return a valid DID document structure for DID:', did);
    //     return res.status(400).json({ message: "Failed to resolve DID: No DID document found in resolution result." });
    //   }
    //   
    //   const didDocument = didDocumentResolution.didDocument;
    //   let actualPublicKeyJwk = null;
    //
    //   // Corrected logic to find the public key based on DID Document structure
    //   if (didDocument.verificationMethod && Array.isArray(didDocument.verificationMethod)) {
    //     for (const vm of didDocument.verificationMethod) {
    //       if (vm.id && vm.publicKeyJwk) {
    //         // Check if this verification method is used for authentication or assertion
    //         const isAuthMethod = didDocument.authentication && Array.isArray(didDocument.authentication) && didDocument.authentication.some((auth: string | any) => (typeof auth === 'string' && auth === vm.id) || (typeof auth === 'object' && auth?.id === vm.id));
    //         const isAssertionMethod = didDocument.assertionMethod && Array.isArray(didDocument.assertionMethod) && didDocument.assertionMethod.some((assert: string | any) => (typeof assert === 'string' && assert === vm.id) || (typeof assert === 'object' && assert?.id === vm.id));
    //         
    //         // DID Core spec allows purposes to be directly in verificationMethod too, though ion-tools output seems to use the reference model primarily.
    //         // We check for direct purposes as a fallback.
    //         const directPurposes = vm.purposes && Array.isArray(vm.purposes) && (vm.purposes.includes('authentication') || vm.purposes.includes('assertionMethod'));
    //
    //         if (isAuthMethod || isAssertionMethod || directPurposes) {
    //           actualPublicKeyJwk = vm.publicKeyJwk;
    //           console.log(`[/api/auth/register] Found matching publicKeyJwk in verificationMethod with id: ${vm.id}`);
    //           break; // Found the key
    //         }
    //       }
    //     }
    //   }
    //
    //   if (!actualPublicKeyJwk) {
    //       // Fallback: Check the deprecated `publicKey` section if it exists (less common for ION DIDs but good for robustness)
    //       if (didDocument.publicKey && Array.isArray(didDocument.publicKey)) {
    //           console.log('[/api/auth/register] Checking deprecated publicKey array in DID document.');
    //           for (const pk of didDocument.publicKey) {
    //               if (pk.id && pk.publicKeyJwk && pk.type === 'EcdsaSecp256k1VerificationKey2019') {
    //                    // Check if this public key is referenced in authentication or assertionMethod
    //                   const isAuthMethod = didDocument.authentication && Array.isArray(didDocument.authentication) && didDocument.authentication.some((auth: string | any) => (typeof auth === 'string' && auth === pk.id) || (typeof auth === 'object' && auth?.id === pk.id));
    //                   const isAssertionMethod = didDocument.assertionMethod && Array.isArray(didDocument.assertionMethod) && didDocument.assertionMethod.some((assert: string | any) => (typeof assert === 'string' && assert === pk.id) || (typeof assert === 'object' && assert?.id === pk.id));
    //                   
    //                   if (isAuthMethod || isAssertionMethod) {
    //                       actualPublicKeyJwk = pk.publicKeyJwk;
    //                       console.log(`[/api/auth/register] Found matching publicKeyJwk in deprecated publicKey array with id: ${pk.id}`);
    //                       break;
    //                   }
    //               }
    //           }
    //       }
    //   }
    //
    //   if (!actualPublicKeyJwk) {
    //       console.error('[/api/auth/register] Could not find a suitable public key in DID document for DID:', did, 'Document:', JSON.stringify(didDocument, null, 2));
    //       return res.status(400).json({ message: "Failed to extract a suitable public key from DID document for validation." });
    //   }
    //   
    //   const providedKeyString = JSON.stringify(parsedPublicKey, Object.keys(parsedPublicKey).sort());
    //   const resolvedKeyString = JSON.stringify(actualPublicKeyJwk, Object.keys(actualPublicKeyJwk).sort());
    //
    //   console.log('[/api/auth/register] Provided PublicKey for comparison:', providedKeyString);
    //   console.log('[/api/auth/register] Resolved PublicKeyJwk from DID for comparison:', resolvedKeyString);
    //
    //   if (providedKeyString !== resolvedKeyString) {
    //     console.error('[/api/auth/register] Public key mismatch. Provided:', providedKeyString, 'Resolved from DID:', resolvedKeyString);
    //     return res.status(400).json({ message: "Public key mismatch between provided key and DID document." });
    //   }
    //   console.log('[/api/auth/register] DID and PublicKey validated successfully.');
    //
    // } catch (error: any) {
    //   console.error('[/api/auth/register] Error during DID resolution/validation for DID:', did, error);
    //   return res.status(400).json({ message: "Failed to resolve/validate DID.", errorName: error.name, errorMessage: error.message });
    // }

    try {
      const newUser = await storage.createUser({
        name,
        username,
        email,
        password: hashedPassword,
        did,
        publicKey: JSON.stringify(parsedPublicKey),
        homeNode,
        language
      });

      if (!newUser) {
        console.error('[/api/auth/register] User creation failed after validation.');
        return res.status(500).json({ message: 'User creation failed.' });
      }
      
      const userDidForSession: string | null = newUser.did ?? null;

      const sessionId = crypto.randomBytes(16).toString('hex');
      req.session.userId = newUser.id;
      req.session.username = newUser.username;
      req.session.did = userDidForSession;
      console.log(`[/api/auth/register] User ${newUser.username} registered. Session created: ${sessionId}`);
      res.cookie('connect.sid', sessionId, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.status(201).json({
          message: "User registered successfully",
          user: await formatUser(newUser),
          sessionId: sessionId
      });

    } catch (error: any) {
      console.error('[/api/auth/register] Error during user creation or session handling:', error);
      if (error.code === '23505') { 
          if (error.constraint === 'users_username_key') {
              return res.status(400).json({ message: 'Username already exists.' });
          }
          if (error.constraint === 'users_email_key') {
              return res.status(400).json({ message: 'Email already in use.' });
          }
          if (error.constraint === 'users_did_key') {
              return res.status(400).json({ message: 'DID already registered.' });
          }
      }
      res.status(500).json({ message: 'Error registering user.', error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    const user = await storage.getUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    
    // Format user before calling session.save to avoid awaiting inside the callback
    const formattedUser = await formatUser(user);
    // const sessionId = crypto.randomBytes(16).toString('hex'); // We will use req.sessionID from express-session
    
    // Update session creation to include all fields for SessionData
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.did = user.did ?? null;
    
    // Wait for session to be saved to Redis before responding
    req.session.save((err) => {
      if (err) {
        console.error('[/api/auth/login] Error saving session:', err);
        return res.status(500).json({ message: 'Session creation failed' });
      }
      
      // The cookie is already set by express-session.
      // For Bearer token usage / localStorage on client, send req.sessionID.
      console.log(`[/api/auth/login] User ${user.username} logged in. Actual Session ID: ${req.sessionID}`);
      res.cookie('connect.sid', req.sessionID, { httpOnly: true, secure: process.env.NODE_ENV === 'production' }); // Ensure cookie value matches
      res.json({ 
          message: 'Logged in successfully', 
          user: formattedUser,
          sessionId: req.sessionID // Use the actual session ID
      });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader?.split(" ")[1];
    
    console.log(`Logout attempt - Auth Header: ${authHeader}, SessionId: ${sessionId}`);
    
    if (!sessionId) {
      console.log('Logout: No session ID provided');
      return res.status(400).json({ message: "No session ID provided" });
    }
    
    if (req.session) {
      const userId = req.session.userId;
      console.log(`Logging out user ID ${userId} with session ${sessionId}`);
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      console.log(`Session removed, remaining sessions: ${Object.keys(req.session).length}`);
      return res.status(200).json({ message: "Logged out successfully" });
    } else {
      console.log(`Logout: Session ID ${sessionId} not found`);
      return res.status(400).json({ message: "Invalid session" });
    }
  });

  // Current User Route
  app.get("/api/users/me", authMiddleware, async (req, res) => {
    try {
      console.log(`Fetching user profile for ID: ${req.body.currentUserId}`);
      
      const user = await storage.getUser(req.body.currentUserId);
      
      if (!user) {
        console.log(`User profile fetch failed: User ID ${req.body.currentUserId} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`User profile fetch successful for ${user.username} (ID: ${user.id})`);
      const formattedUser = await formatUser(user);
      
      res.status(200).json(formattedUser);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      handleError(error, res);
    }
  });

  // Update Current User Profile
  app.patch("/api/users/me", authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const { name, bio, profileImage, coverImage } = req.body;
      
      console.log(`Updating user profile for ID: ${userId} with data:`, { name, bio, profileImage, coverImage });
      
      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`User profile update failed: User ID ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with provided fields
      const updatedUser = await storage.updateUser(userId, {
        name: name !== undefined ? name : user.name,
        bio: bio !== undefined ? bio : user.bio,
        profileImage: profileImage !== undefined ? profileImage : user.profileImage,
        coverImage: coverImage !== undefined ? coverImage : user.coverImage
      });
      
      console.log(`User profile updated successfully for ${updatedUser.username} (ID: ${updatedUser.id})`);
      const formattedUser = await formatUser(updatedUser);
      
      res.status(200).json(formattedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      handleError(error, res);
    }
  });

  // User Profile Route
  app.get("/api/users/profile/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentUserId = req.headers.authorization ? 
        req.session?.userId : undefined;
      
      res.status(200).json(await formatUser(user, currentUserId));
    } catch (error) {
      handleError(error, res);
    }
  });

  // Get User Posts
  app.get("/api/users/:id/posts", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const tab = req.query.activeTab || "posts";
      const posts = await storage.getUserPosts(userId);
      
      const currentUserId = req.headers.authorization ? 
        req.session?.userId : undefined;
      
      const formattedPosts = await Promise.all(
        posts.map(post => formatPost(post, currentUserId))
      );
      
      res.status(200).json(formattedPosts);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Follow/Unfollow User (supports local and remote follows)
  app.post("/api/users/:id/follow", authMiddleware, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const currentUserId = req.body.currentUserId;
      const { targetDid, targetNode } = req.body; // for remote follows

      // If targetDid is provided, this is a remote follow
      if (targetDid && targetNode) {
        // Check if already following
        const existing = await storage.getFollow(currentUserId, targetDid);
        if (existing) {
          // Unfollow remote
          await storage.removeFollow(currentUserId, targetDid);
          return res.status(200).json({ message: "Unfollowed remote user successfully" });
        } else {
          // Fetch remote profile (optional: cache it)
          try {
            const remoteProfileRes = await fetch(`${targetNode}/api/federation/user/${encodeURIComponent(targetDid)}`);
            if (!remoteProfileRes.ok) throw new Error('Remote user not found');
            // Optionally cache remote profile here
          } catch (e) {
            return res.status(404).json({ message: "Remote user not found or node unreachable" });
          }
          // Follow remote
          await storage.addFollow(currentUserId, targetDid);
          return res.status(200).json({ message: "Followed remote user successfully" });
        }
      }

      // Otherwise, this is a local follow
      if (currentUserId === targetUserId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const isAlreadyFollowing = await storage.isFollowing(currentUserId, targetUserId);
      if (isAlreadyFollowing) {
        await storage.removeFollow(currentUserId, targetUserId);
        res.status(200).json({ message: "Unfollowed successfully" });
      } else {
        await storage.addFollow(currentUserId, targetUserId);
        // Create notification
        await storage.createNotification({
          type: "follow",
          actorId: currentUserId,
          recipientId: targetUserId,
          data: {}
        });
        res.status(200).json({ message: "Followed successfully" });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  // Suggested Users
  app.get("/api/users/suggested", async (req, res) => {
    try {
      const currentUserId = req.headers.authorization ? 
        req.session?.userId : undefined;
      
      let suggestedUsers = await storage.getSuggestedUsers(currentUserId);
      
      const formattedUsers = await Promise.all(
        suggestedUsers.map(user => formatUser(user, currentUserId))
      );
      
      res.status(200).json(formattedUsers);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Post Routes
  app.get("/api/posts", authMiddleware, async (req, res) => {
    try {
      const feedType = req.query.feedType as string || "for-you";
      const page = parseInt(req.query.page as string || "1");
      const limit = 10;
      const currentUserId = req.body.currentUserId;
      
      let posts: any[] = [];
      if (feedType === "following" && currentUserId) {
        // Get local follows
        const localFollows = await db.select().from(follows)
          .where(and(eq(follows.followerId, currentUserId), sql`remote_did IS NULL`));
        const localFollowingIds = localFollows.map(f => f.followingId).filter((id): id is number => typeof id === 'number' && id !== null);
        if (localFollowingIds.length > 0) {
          const localPosts = await storage.getPostsByUserIds(localFollowingIds, page, limit);
          posts = posts.concat(localPosts);
        }
        // Get remote follows
        const remoteFollows = await db.select().from(follows)
          .where(and(eq(follows.followerId, currentUserId), sql`remote_did IS NOT NULL`));
        for (const follow of remoteFollows) {
          if (follow.remoteNode && follow.remoteDid) {
            try {
              const remotePostsRes = await fetch(`${follow.remoteNode}/api/federation/posts/${encodeURIComponent(follow.remoteDid)}`);
              if (remotePostsRes.ok) {
                const remotePosts = await remotePostsRes.json();
                posts = posts.concat(remotePosts);
              }
            } catch (e) {
              // Ignore remote fetch errors for now
            }
          }
        }
      } else if (feedType === "circuits" && currentUserId) {
        posts = await storage.getCircuitPosts(currentUserId, page, limit);
      } else if (feedType === "discover") {
        // Discover feed: show relayed posts
        const offset = (page - 1) * limit;
        const relayed = await db.select().from(relayed_posts)
          .orderBy(relayed_posts.relayedAt)
          .limit(limit)
          .offset(offset);
        // Format relayed posts for the feed
        posts = relayed.map(post => ({
          id: `relay-${post.id}`,
          content: post.content,
          media: post.media,
          language: post.language,
          createdAt: post.originalCreatedAt,
          author: {
            id: null,
            username: post.authorDid,
            name: post.authorDid,
            profileImage: "/default-profile.png",
            isVerified: false
          },
          likeCount: 0,
          commentCount: 0,
          repostCount: 0,
          isLiked: false,
          isReposted: false,
          isSaved: false,
          circuitId: null,
          circuitName: null
        })).reverse(); // reverse for DESC order
      } else {
        posts = await storage.getAllPosts(page, limit);
      }
      // For all non-discover feeds, format posts with author info
      if (feedType !== "discover") {
        posts = await Promise.all(posts.map(post => formatPost(post, currentUserId)));
        posts = posts.filter(Boolean); // Remove any nulls
      }
      // Sort posts by createdAt descending
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // Paginate
      const pagedPosts = posts.slice(0, limit);
      res.status(200).json({
        posts: pagedPosts,
        page,
        totalPages: Math.ceil(posts.length / limit)
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const { content, language, media, circuitId } = req.body;
      const userId = req.body.currentUserId;
      
      const detectedLanguage = language || await detectLanguage(content);
      
      const newPost = await storage.createPost({
        content,
        language: detectedLanguage,
        media,
        userId,
        circuitId: circuitId ? parseInt(circuitId) : undefined
      });
      
      // If the post is associated with a circuit, add it to circuit_posts
      if (circuitId) {
        const circuitIdNum = parseInt(circuitId);
        await db.insert(circuit_posts).values({
          circuitId: circuitIdNum,
          postId: newPost.id,
          addedByUserId: userId,
          addedAt: new Date()
        });
      }
      
      // Extract hashtags and update trends
      const hashtags = content.match(/#\w+/g) || [];
      for (const hashtag of hashtags) {
        await storage.updateTrend(hashtag, "Trending");
      }

      // --- Relay submission logic ---
      try {
        // Get the author's DID
        const author = await storage.getUser(userId);
        const authorDid = author?.did;
        if (authorDid) {
          await fetch(`${RELAY_URL}/api/relay/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originalPostId: newPost.id.toString(),
              authorDid,
              content: newPost.content,
              media: newPost.media,
              language: newPost.language,
              originalCreatedAt: newPost.createdAt,
              sourceRelayUrl: process.env.NODE_URL || "http://localhost:5000"
            })
          });
        }
      } catch (relayErr) {
        console.error("[Relay] Failed to submit post to relay:", relayErr);
      }
      // --- End relay submission logic ---
      
      res.status(201).json(await formatPost(newPost, userId));
    } catch (error) {
      handleError(error, res);
    }
  });

  // Post Interactions (Like, Repost, Save)
  app.post("/api/posts/:id/like", authMiddleware, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const hasLiked = await storage.hasInteraction(postId, userId, "like");
      
      if (hasLiked) {
        await storage.removeInteraction(postId, userId, "like");
        res.status(200).json({ message: "Post unliked successfully" });
      } else {
        await storage.addInteraction(postId, userId, "like");
        
        // Create notification if the post author is not the current user
        if (post.userId !== userId) {
          await storage.createNotification({
            type: "like",
            actorId: userId,
            recipientId: post.userId,
            postId,
            data: {}
          });
        }
        
        res.status(200).json({ message: "Post liked successfully" });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/posts/:id/repost", authMiddleware, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const hasReposted = await storage.hasInteraction(postId, userId, "repost");
      
      if (hasReposted) {
        await storage.removeInteraction(postId, userId, "repost");
        res.status(200).json({ message: "Post un-reposted successfully" });
      } else {
        await storage.addInteraction(postId, userId, "repost");
        
        // Create notification if the post author is not the current user
        if (post.userId !== userId) {
          await storage.createNotification({
            type: "repost",
            actorId: userId,
            recipientId: post.userId,
            postId,
            data: {}
          });
        }
        
        res.status(200).json({ message: "Post reposted successfully" });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/posts/:id/save", authMiddleware, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const hasSaved = await storage.hasInteraction(postId, userId, "save");
      
      if (hasSaved) {
        await storage.removeInteraction(postId, userId, "save");
        res.status(200).json({ message: "Post unsaved successfully" });
      } else {
        await storage.addInteraction(postId, userId, "save");
        res.status(200).json({ message: "Post saved successfully" });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  // Circuits (curated feeds)
  app.get("/api/circuits/popular", async (req, res) => {
    try {
      const currentUserId = req.headers.authorization ? 
        req.session?.userId : undefined;
      
      const circuits = await storage.getPopularCircuits();
      
      const formattedCircuits = await Promise.all(circuits.map(async (circuit) => {
        const creator = await storage.getUser(circuit.creatorId);
        const subscriberCount = await storage.getCircuitSubscriberCount(circuit.id);
        let isSubscribed = false;
        
        if (currentUserId) {
          isSubscribed = await storage.isSubscribedToCircuit(currentUserId, circuit.id);
        }
        
        return {
          id: circuit.id,
          name: circuit.name,
          description: circuit.description,
          creatorId: circuit.creatorId,
          creatorName: creator?.name,
          subscriberCount,
          isSubscribed
        };
      }));
      
      res.status(200).json(formattedCircuits);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Communities
  app.get("/api/communities/user", authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const communities = await storage.getUserCommunities(userId);
      
      const formattedCommunities = await Promise.all(communities.map(async (community) => {
        const memberCount = await storage.getCommunityMemberCount(community.id);
        const isJoined = await storage.isJoinedCommunity(userId, community.id);
        
        return {
          id: community.id,
          name: community.name,
          description: community.description,
          color: community.color,
          memberCount,
          isJoined
        };
      }));
      
      res.status(200).json(formattedCommunities);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Trends
  app.get("/api/trends", async (req, res) => {
    try {
      const trends = await storage.getTrends();
      res.status(200).json(trends);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Translation service
  app.post("/api/detect-language", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const language = await detectLanguage(text);
      res.status(200).json({ language });
    } catch (error) {
      console.error("Error in /api/detect-language:", error);
      // Don't fail completely, just return English as fallback
      res.status(200).json({ language: 'en' });
    }
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (!targetLanguage) {
        return res.status(400).json({ message: "Target language is required" });
      }
      
      const translatedText = await translateText(
        text,
        sourceLanguage || 'auto',
        targetLanguage
      );
      
      res.status(200).json({
        translatedText,
        sourceLanguage: sourceLanguage || 'auto'
      });
    } catch (error) {
      console.error("Error in /api/translate:", error);
      // Don't fail completely, just return the original text
      res.status(200).json({
        translatedText: text,
        sourceLanguage: sourceLanguage || 'auto'
      });
    }
  });

  // Serve the node's DID document at /.well-known/did.json
  app.get('/.well-known/did.json', (req, res) => {
    res.json(NODE_DID_DOC);
  });

  // Also serve at /api/node/info for convenience
  app.get('/api/node/info', (req, res) => {
    res.json({
      did: NODE_DID,
      publicKey: NODE_PUBLIC_KEY,
      didDocument: NODE_DID_DOC
    });
  });

  // Federation endpoint: fetch user profile by DID
  app.get('/api/federation/user/:did', async (req, res) => {
    try {
      const did = decodeURIComponent(req.params.did);
      const user = await storage.getUserByDid(did);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(await formatUser(user));
    } catch (error) {
      handleError(error, res);
    }
  });

  // Federation endpoint: fetch public posts by user DID
  app.get('/api/federation/posts/:did', async (req, res) => {
    try {
      const did = decodeURIComponent(req.params.did);
      const user = await storage.getUserByDid(did);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const posts = await storage.getUserPosts(user.id);
      res.json(posts);
    } catch (error) {
      handleError(error, res);
    }
  });

  // --- RELAY ENDPOINTS ---
  // Accept a public post from another node and store it in relayed_posts
  app.post('/api/relay/submit', async (req, res) => {
    try {
      const { originalPostId, authorDid, content, media, language, originalCreatedAt, sourceRelayUrl } = req.body;
      if (!authorDid || !content || !originalCreatedAt || !sourceRelayUrl) {
        return res.status(400).json({ message: 'Missing required fields.' });
      }
      // Insert into relayed_posts
      await db.insert(relayed_posts).values({
        originalPostId,
        authorDid,
        content,
        media,
        language,
        originalCreatedAt: new Date(originalCreatedAt),
        relayedAt: new Date(),
        sourceRelayUrl
      });
      res.status(201).json({ message: 'Relayed post stored.' });
    } catch (error) {
      handleError(error, res);
    }
  });

  // Return relayed posts (optionally paginated or filtered by since)
  app.get('/api/relay/posts', async (req, res) => {
    try {
      const { since, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      let posts;
      if (since) {
        posts = await db.select().from(relayed_posts)
          .where(gt(relayed_posts.relayedAt, new Date(since as string)))
          .orderBy(relayed_posts.relayedAt)
          .limit(Number(limit))
          .offset(offset);
      } else {
        posts = await db.select().from(relayed_posts)
          .orderBy(relayed_posts.relayedAt)
          .limit(Number(limit))
          .offset(offset);
      }
      res.status(200).json(posts.reverse());
    } catch (error) {
      handleError(error, res);
    }
  });

  // Fetch new relayed posts from the relay and store them locally
  app.post('/api/relay/fetch-latest', async (req, res) => {
    try {
      // Find the most recent relayedAt timestamp in local relayed_posts
      const latest = await db.select({ relayedAt: relayed_posts.relayedAt })
        .from(relayed_posts)
        .orderBy(relayed_posts.relayedAt)
        .limit(1);
      const since = latest.length > 0 ? latest[0].relayedAt.toISOString() : undefined;
      // Fetch from relay
      const url = since ? `${RELAY_URL}/api/relay/posts?since=${encodeURIComponent(since)}` : `${RELAY_URL}/api/relay/posts`;
      const resp = await fetch(url);
      if (!resp.ok) {
        return res.status(502).json({ message: 'Failed to fetch from relay', status: resp.status });
      }
      const posts = await resp.json();
      let imported = 0;
      for (const post of posts) {
        // Check for duplicate (by originalPostId and sourceRelayUrl)
        const exists = await db.select().from(relayed_posts)
          .where(and(
            eq(relayed_posts.originalPostId, post.originalPostId),
            eq(relayed_posts.sourceRelayUrl, post.sourceRelayUrl)
          ));
        if (exists.length === 0) {
          await db.insert(relayed_posts).values({
            originalPostId: post.originalPostId,
            authorDid: post.authorDid,
            content: post.content,
            media: post.media,
            language: post.language,
            originalCreatedAt: new Date(post.originalCreatedAt),
            relayedAt: new Date(post.relayedAt || Date.now()),
            sourceRelayUrl: post.sourceRelayUrl
          });
          imported++;
        }
      }
      res.status(200).json({ imported });
    } catch (error) {
      handleError(error, res);
    }
  });

  // --- Social Circuits API ---
  // Create a new circuit
  app.post('/api/circuits', authMiddleware, async (req, res) => {
    try {
      const { name, description } = req.body;
      const creatorId = req.body.currentUserId;
      if (!name) return res.status(400).json({ message: 'Name is required' });
      const circuit = await storage.createCircuit({ name, description, creatorId });
      res.status(201).json(circuit);
    } catch (error) {
      handleError(error, res);
    }
  });

  // List all public circuits (paginated)
  app.get('/api/circuits', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const circuitList = await db.select().from(circuits)
        .where(eq(circuits.isPublic, true))
        .orderBy(sql`${circuits.createdAt} DESC`)
        .limit(limit)
        .offset((page - 1) * limit);
      res.status(200).json(circuitList);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Get circuit details and posts (paginated)
  app.get('/api/circuits/:id', async (req, res) => {
    try {
      const circuitId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const circuit = await storage.getCircuit(circuitId);
      if (!circuit) return res.status(404).json({ message: 'Circuit not found' });
      // Get posts in this circuit (from circuit_posts)
      const postLinks = await db.select().from(circuit_posts)
        .where(eq(circuit_posts.circuitId, circuitId))
        .orderBy(sql`${circuit_posts.addedAt} DESC`)
        .limit(limit)
        .offset((page - 1) * limit);
      const postIds = postLinks.map(link => Number(link.postId));
      let circuitPostsRaw: any[] = [];
      if (postIds.length > 0) {
        circuitPostsRaw = await db.select().from(posts).where(inArray(posts.id, postIds));
      }
      // Check if the current user is subscribed
      let isSubscribed = false;
      let currentUserId = undefined;
      const authHeader = req.headers.authorization;
      const sessionId = authHeader?.split(" ")[1];
      if (sessionId && req.session) {
        currentUserId = req.session.userId;
        isSubscribed = await storage.isSubscribedToCircuit(currentUserId, circuitId);
      }
      // Enrich posts with author info and interaction state
      const formattedPosts: any[] = await Promise.all(
        circuitPostsRaw.map((post: any) => formatPost(post, currentUserId))
      );
      // Get total post count for pagination
      const totalPostsResult = await db.select({ count: sql`count(*)` }).from(circuit_posts).where(eq(circuit_posts.circuitId, circuitId));
      const totalPosts = Number(totalPostsResult[0]?.count || 0);
      const totalPages = Math.max(1, Math.ceil(totalPosts / limit));
      res.status(200).json({ circuit, posts: formattedPosts, isSubscribed, totalPages, page });
    } catch (error) {
      handleError(error, res);
    }
  });

  // Subscribe to a circuit
  app.post('/api/circuits/:id/subscribe', authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const circuitId = parseInt(req.params.id);
      const subscription = await storage.subscribeToCircuit(userId, circuitId);
      res.status(201).json(subscription);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Unsubscribe from a circuit
  app.delete('/api/circuits/:id/subscribe', authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const circuitId = parseInt(req.params.id);
      await storage.unsubscribeFromCircuit(userId, circuitId);
      res.status(204).end();
    } catch (error) {
      handleError(error, res);
    }
  });

  // Add a post to a circuit (only creator)
  app.post('/api/circuits/:id/posts', authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const circuitId = parseInt(req.params.id);
      const { postId } = req.body;
      const circuit = await storage.getCircuit(circuitId);
      if (!circuit) return res.status(404).json({ message: 'Circuit not found' });
      if (circuit.creatorId !== userId) return res.status(403).json({ message: 'Only the creator can add posts' });
      // Add post to circuit_posts
      const [link] = await db.insert(circuit_posts).values({ circuitId, postId, addedByUserId: userId, addedAt: new Date() }).returning();
      res.status(201).json(link);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Remove a post from a circuit (only creator)
  app.delete('/api/circuits/:id/posts/:postId', authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const circuitId = parseInt(req.params.id);
      const postId = parseInt(req.params.postId);
      const circuit = await storage.getCircuit(circuitId);
      if (!circuit) return res.status(404).json({ message: 'Circuit not found' });
      if (circuit.creatorId !== userId) return res.status(403).json({ message: 'Only the creator can remove posts' });
      await db.delete(circuit_posts).where(and(eq(circuit_posts.circuitId, circuitId), eq(circuit_posts.postId, postId)));
      res.status(204).end();
    } catch (error) {
      handleError(error, res);
    }
  });

  // Users
  app.get("/api/users/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json(await formatUser(user));
    } catch (error) {
      handleError(error, res);
    }
  });
  
  // Update user settings
  app.patch("/api/users/settings", authMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { language } = req.body;
      
      // Validate input
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Update user settings
      const updatedUser = await storage.updateUser(userId, { 
        language: language || undefined
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({
        message: "Settings updated successfully",
        user: await formatUser(updatedUser)
      });
    } catch (error) {
      console.error("Error updating user settings:", error);
      handleError(error, res);
    }
  });

  // Delete a post (only author)
  app.delete("/api/posts/:id", authMiddleware, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }
      await storage.deletePost(postId);
      res.status(204).end();
    } catch (error) {
      handleError(error, res);
    }
  });

  // Get followers list for a user
  app.get("/api/users/:id/followers", authMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.body.currentUserId;
      
      const followers = await storage.getUserFollowers(userId);
      
      const formattedFollowers = await Promise.all(
        followers.map(user => formatUser(user, currentUserId))
      );
      
      res.status(200).json(formattedFollowers);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Get following list for a user
  app.get("/api/users/:id/following", authMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUserId = req.body.currentUserId;
      
      const following = await storage.getUserFollowing(userId);
      
      const formattedFollowing = await Promise.all(
        following.map(user => formatUser(user, currentUserId))
      );
      
      res.status(200).json(formattedFollowing);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Get mutual followers between two users
  app.get("/api/users/:id/mutual-followers", authMiddleware, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const currentUserId = req.body.currentUserId;
      
      const mutualFollowers = await storage.getMutualFollowers(currentUserId, targetUserId);
      
      const formattedFollowers = await Promise.all(
        mutualFollowers.map(user => formatUser(user, currentUserId))
      );
      
      res.status(200).json(formattedFollowers);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Create an HTTP server instance
  const httpServer = createServer(app);

  return httpServer;
}
