import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { loginSchema, insertUserSchema, insertPostSchema, type Circuit, type Follow } from "../shared/schema.ts";
import { detectLanguage, translateText } from "./translation.ts";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { webcrypto } from 'node:crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
// @ts-ignore
if (!globalThis.crypto && typeof window === 'undefined') globalThis.crypto = webcrypto; // Ensure it only runs in Node.js
import { and, eq, gt, inArray } from "drizzle-orm";
// @ts-ignore: No type definitions for node-fetch (should be resolved by @types/node-fetch, but just in case)
import fetch from "node-fetch";
import { sql } from "drizzle-orm";
import { follows } from "../shared/schema.ts";
import { relayed_posts, circuits, circuit_posts, posts, users, conversations, messages, conversationParticipants, messageReactions, conversationSettings } from "../shared/schema.ts";
import { db } from "./db.ts";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import type { Session } from "express-session";
import { resolve as ionResolve, DID, generateKeyPair as generateIonKeys, sign as ionSign, verify as ionVerify } from '@decentralized-identity/ion-tools';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { verify as secp256k1Verify } from '@noble/secp256k1';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { circuit_subscriptions } from "../shared/schema.ts";

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

// Helper for noble/secp256k1 verify
const verifyNoble = secp256k1Verify;
const sha256 = nobleSha256;

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  // Configure multer for image uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `image-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));

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
    const commentCount = (await storage.getPostComments(post.id)).length;
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

    // Handle quoted post data
    let quotedPost = null;
    if (post.quotedPostId) {
      const quotedPostData = await storage.getPost(post.quotedPostId);
      if (quotedPostData) {
        // Recursively format the quoted post (but avoid infinite recursion)
        quotedPost = await formatPost(quotedPostData, currentUserId);
      }
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
      circuitName,
      quotedPost
    };
  };

  const formatUser = async (user: any, currentUserId?: number) => {
    const { password, ...userWithoutPassword } = user;
    const followers = await storage.getFollowerCount(user.id);
    const following = await storage.getFollowingCount(user.id);
    let isFollowing = false;
    let unreadNotifications = 0;
    
    if (currentUserId && currentUserId !== user.id) {
      isFollowing = await storage.isFollowing(currentUserId, user.id);
    }
    
    // Get unread notification count for the current user
    if (currentUserId && currentUserId === user.id) {
      unreadNotifications = await storage.getUnreadNotificationCount(user.id);
    }
    
    return {
      ...userWithoutPassword,
      followers,
      following,
      isFollowing,
      unreadNotifications,
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
    try {
      console.log('[/api/auth/register] Attempting to resolve DID:', did);
      const didDocumentResolution = await ionResolve(did); // Use ionResolve from ion-tools
      console.log('[/api/auth/register] DID resolved. Resolution object:', JSON.stringify(didDocumentResolution, null, 2));

      if (!didDocumentResolution || !didDocumentResolution.didDocument) {
        console.error('[/api/auth/register] ionResolve did not return a valid DID document structure for DID:', did);
        return res.status(400).json({ message: "Failed to resolve DID: No DID document found in resolution result." });
      }
      
      const didDocument = didDocumentResolution.didDocument;
      let actualPublicKeyJwk = null;

      // Corrected logic to find the public key based on DID Document structure
      if (didDocument.verificationMethod && Array.isArray(didDocument.verificationMethod)) {
        for (const vm of didDocument.verificationMethod) {
          if (vm.id && vm.publicKeyJwk) {
            // Check if this verification method is used for authentication or assertion
            const isAuthMethod = didDocument.authentication && Array.isArray(didDocument.authentication) && didDocument.authentication.some((auth: string | any) => (typeof auth === 'string' && auth === vm.id) || (typeof auth === 'object' && auth?.id === vm.id));
            const isAssertionMethod = didDocument.assertionMethod && Array.isArray(didDocument.assertionMethod) && didDocument.assertionMethod.some((assert: string | any) => (typeof assert === 'string' && assert === vm.id) || (typeof assert === 'object' && assert?.id === vm.id));
            
            // DID Core spec allows purposes to be directly in verificationMethod too, though ion-tools output seems to use the reference model primarily.
            // We check for direct purposes as a fallback.
            const directPurposes = vm.purposes && Array.isArray(vm.purposes) && (vm.purposes.includes('authentication') || vm.purposes.includes('assertionMethod'));

            if (isAuthMethod || isAssertionMethod || directPurposes) {
              actualPublicKeyJwk = vm.publicKeyJwk;
              console.log(`[/api/auth/register] Found matching publicKeyJwk in verificationMethod with id: ${vm.id}`);
              break; // Found the key
            }
          }
        }
      }

      if (!actualPublicKeyJwk) {
          // Fallback: Check the deprecated `publicKey` section if it exists (less common for ION DIDs but good for robustness)
          if (didDocument.publicKey && Array.isArray(didDocument.publicKey)) {
              console.log('[/api/auth/register] Checking deprecated publicKey array in DID document.');
              for (const pk of didDocument.publicKey) {
                  if (pk.id && pk.publicKeyJwk && pk.type === 'EcdsaSecp256k1VerificationKey2019') {
                       // Check if this public key is referenced in authentication or assertionMethod
                      const isAuthMethod = didDocument.authentication && Array.isArray(didDocument.authentication) && didDocument.authentication.some((auth: string | any) => (typeof auth === 'string' && auth === pk.id) || (typeof auth === 'object' && auth?.id === pk.id));
                      const isAssertionMethod = didDocument.assertionMethod && Array.isArray(didDocument.assertionMethod) && didDocument.assertionMethod.some((assert: string | any) => (typeof assert === 'string' && assert === pk.id) || (typeof assert === 'object' && assert?.id === pk.id));
                      
                      if (isAuthMethod || isAssertionMethod) {
                          actualPublicKeyJwk = pk.publicKeyJwk;
                          console.log(`[/api/auth/register] Found matching publicKeyJwk in deprecated publicKey array with id: ${pk.id}`);
                          break;
                      }
                  }
              }
          }
      }

      if (!actualPublicKeyJwk) {
          console.error('[/api/auth/register] Could not find a suitable public key in DID document for DID:', did, 'Document:', JSON.stringify(didDocument, null, 2));
          return res.status(400).json({ message: "Failed to extract a suitable public key from DID document for validation." });
      }
      
      const providedKeyString = JSON.stringify(parsedPublicKey, Object.keys(parsedPublicKey).sort());
      const resolvedKeyString = JSON.stringify(actualPublicKeyJwk, Object.keys(actualPublicKeyJwk).sort());

      console.log('[/api/auth/register] Provided PublicKey for comparison:', providedKeyString);
      console.log('[/api/auth/register] Resolved PublicKeyJwk from DID for comparison:', resolvedKeyString);

      if (providedKeyString !== resolvedKeyString) {
        console.error('[/api/auth/register] Public key mismatch. Provided:', providedKeyString, 'Resolved from DID:', resolvedKeyString);
        return res.status(400).json({ message: "Public key mismatch between provided key and DID document." });
      }
      console.log('[/api/auth/register] DID and PublicKey validated successfully.');

    } catch (error: any) {
      console.error('[/api/auth/register] Error during DID resolution/validation for DID:', did, error);
      return res.status(400).json({ message: "Failed to resolve/validate DID.", errorName: error.name, errorMessage: error.message });
    }

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
      console.log(`Logging out user ID ${userId || 'unknown'} with session ${sessionId}`);
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          // Ensure response is sent even if destroy fails
          if (!res.headersSent) {
            return res.status(500).json({ message: "Error destroying session" }); 
          }
          return; // exit if headers already sent
        }
        // req.session is not available here, it has been destroyed.
        console.log(`Session ${sessionId} destroyed successfully.`);
        if (!res.headersSent) {
            res.status(200).json({ message: "Logged out successfully" });
        }
      });
    } else {
      console.log(`Logout: Session ID ${sessionId} not found or no active session to destroy.`);
      return res.status(400).json({ message: "Invalid session" });
    }
  });

  app.get("/api/auth/did/challenge", (req, res) => {
    try {
      const challenge = crypto.randomBytes(32).toString('hex');
      // In a more robust system, you might temporarily store this challenge server-side
      // to prevent replay attacks or associate it with a pre-login session.
      // For now, we'll just return it. The client must send it back with the signature.
      console.log("[/api/auth/did/challenge] Generated challenge:", challenge);
      res.status(200).json({ challenge });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/auth/did/login", async (req, res) => {
    const { did, challenge, jws } = req.body;

    if (!did || !challenge || !jws) {
      return res.status(400).json({ message: "DID, challenge, and JWS are required." });
    }

    try {
      console.log(`[/api/auth/did/login] Attempting login for DID: ${did}`);
      const user = await storage.getUserByDid(did);

      if (!user) {
        console.log(`[/api/auth/did/login] User not found for DID: ${did}`);
        return res.status(404).json({ message: "User with this DID not found." });
      }

      if (!user.publicKey) {
        console.log(`[/api/auth/did/login] Public key not found for user with DID: ${did}`);
        return res.status(400).json({ message: "Public key for user not found. Cannot verify signature." });
      }

      let publicKeyJwk;
      try {
        publicKeyJwk = JSON.parse(user.publicKey);
      } catch (e) {
        console.error(`[/api/auth/did/login] Failed to parse stored publicKeyJwk for DID: ${did}`, e);
        return res.status(500).json({ message: "Error parsing stored public key." });
      }

      console.log(`[/api/auth/did/login] Verifying JWS for DID: ${did}. Challenge: ${challenge}`);
      
      // Extensive publicKeyJwk debugging before ionVerify
      console.log(`[/api/auth/did/login] typeof publicKeyJwk: ${typeof publicKeyJwk}`);
      if (publicKeyJwk) {
        console.log(`[/api/auth/did/login] Object.keys(publicKeyJwk): ${Object.keys(publicKeyJwk).join(', ')}`);
        console.log(`[/api/auth/did/login] publicKeyJwk.crv: ${publicKeyJwk.crv}`);
        console.log(`[/api/auth/did/login] publicKeyJwk.kty: ${publicKeyJwk.kty}`);
        console.log(`[/api/auth/did/login] publicKeyJwk.x: ${publicKeyJwk.x}`);
        console.log(`[/api/auth/did/login] publicKeyJwk directly:`, JSON.stringify(publicKeyJwk));
      } else {
        console.log(`[/api/auth/did/login] publicKeyJwk is null or undefined before ionVerify.`);
        return res.status(500).json({ message: "Internal server error: public key not found for user." }); // Should not happen if user is found by DID
      }
      
      // Defensively reconstruct the publicKeyJwk to ensure it's a plain object with expected properties
      const reconstructedPublicKeyJwk = {
        kty: publicKeyJwk.kty,
        crv: publicKeyJwk.crv,
        x: publicKeyJwk.x,
        y: publicKeyJwk.y
        // Do not include other properties like 'd' even if they exist on the parsed object
      };

      console.log(`[/api/auth/did/login] Reconstructed publicKeyJwk:`, JSON.stringify(reconstructedPublicKeyJwk));
      console.log(`[/api/auth/did/login] typeof reconstructedPublicKeyJwk.crv: ${typeof reconstructedPublicKeyJwk.crv}`);

      // JWS structure is: header_encoded.payload_encoded.signature_encoded
      const parts = jws.split('.');
      if (parts.length !== 3) {
        console.log(`[/api/auth/did/login] JWS has invalid structure (not 3 parts) for DID: ${did}`);
        return res.status(400).json({ message: "Invalid JWS structure." });
      }
      const headerEncoded = parts[0];
      const payloadEncoded = parts[1];
      const signatureEncoded = parts[2];

      // The "JWS Signing Input" is ASCII(BASE64URL(UTF8(JWS Protected Header)) + '.' + BASE64URL(JWS Payload))
      // This is what the signature is calculated over.
      const signingInput = `${headerEncoded}.${payloadEncoded}`;
      const messageToVerify = Buffer.from(signingInput, 'utf8'); // noble expects Uint8Array or string for message

      // Hash the message (signing input) as required by secp256k1.verify
      // noble's verify function takes the hash of the message, not the raw message for ECDSA.
      const messageHash = sha256(messageToVerify); // Returns Uint8Array

      console.log(`[/api/auth/did/login] Verifying with @noble/secp256k1.`);
      console.log(`[/api/auth/did/login] JWS Signing Input: ${signingInput}`);
      console.log(`[/api/auth/did/login] Message hash (hex): ${Buffer.from(messageHash).toString('hex')}`);

      // The signature from JWS is Base64URL encoded. Decode it to raw bytes.
      let signatureBytes: Uint8Array;
      try {
        signatureBytes = Buffer.from(signatureEncoded, 'base64url');
      } catch (e) {
        console.log(`[/api/auth/did/login] Failed to Base64URL decode signature for DID: ${did}`, e);
        return res.status(400).json({ message: "Invalid JWS signature encoding." });
      }
      
      console.log(`[/api/auth/did/login] Signature (hex): ${Buffer.from(signatureBytes).toString('hex')}`);

      // Correct way to form uncompressed public key from x and y JWK parts:
      // Convert x and y from Base64URL to hex, then prefix with '04'
      const xHex = Buffer.from(reconstructedPublicKeyJwk.x, 'base64url').toString('hex');
      const yHex = Buffer.from(reconstructedPublicKeyJwk.y, 'base64url').toString('hex');
      const correctUncompressedPublicKeyHex = `04${xHex}${yHex}`;

      console.log(`[/api/auth/did/login] Uncompressed Public Key (hex): ${correctUncompressedPublicKeyHex}`);

      let isSignatureValid = false;
      try {
        isSignatureValid = secp256k1Verify(
          signatureBytes, // r,s signature (raw bytes)
          messageHash,    // hash of the message (raw bytes)
          correctUncompressedPublicKeyHex // public key (hex string or raw bytes)
        );
      } catch (nobleError) {
        console.error(`[/api/auth/did/login] Error during noble.verify: `, nobleError);
        // isSignatureValid remains false
      }

      console.log(`[/api/auth/did/login] @noble/secp256k1.verify result: ${isSignatureValid}`);

      if (!isSignatureValid) {
        return res.status(401).json({ message: "Invalid signature (failed @noble/secp256k1 verification)." });
      }

      // Signature is cryptographically valid.
      // Now, additionally verify that the JWS payload (the challenge) matches the expected challenge.
      let decodedPayloadString: string;
      try {
        decodedPayloadString = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
      } catch (e) {
        console.log(`[/api/auth/did/login] Failed to decode JWS payload for challenge comparison for DID: ${did}`, e);
        return res.status(400).json({ message: "Invalid JWS payload encoding for challenge check." });
      }

      let jwsPayloadChallenge: any;
      try {
        jwsPayloadChallenge = JSON.parse(decodedPayloadString);
      } catch (e) {
        console.log(`[/api/auth/did/login] Failed to JSON.parse decoded JWS payload: '${decodedPayloadString}' for DID: ${did}`, e);
        return res.status(400).json({ message: "JWS payload is not valid JSON for challenge check." });
      }
      
      console.log(`[/api/auth/did/login] Decoded JWS payload for challenge check:`, jwsPayloadChallenge);

      if (jwsPayloadChallenge !== challenge) {
        console.log(`[/api/auth/did/login] Challenge mismatch. Expected: '${challenge}', Got from JWS: '${jwsPayloadChallenge}' for DID: ${did}`);
        return res.status(401).json({ message: "Challenge mismatch." });
      }

      console.log(`[/api/auth/did/login] Signature and challenge verified for DID: ${did}. Logging in...`);
      const formattedUser = await formatUser(user);

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.did = user.did ?? null;

      req.session.save((err) => {
        if (err) {
          console.error('[/api/auth/did/login] Error saving session:', err);
          return res.status(500).json({ message: 'Session creation failed' });
        }
        console.log(`[/api/auth/did/login] Session created for ${user.username}. Session ID: ${req.sessionID}`);
        res.cookie('connect.sid', req.sessionID, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.json({
          message: "Logged in successfully with DID",
          user: formattedUser,
          sessionId: req.sessionID
        });
      });

    } catch (error) {
      console.error(`[/api/auth/did/login] Error during DID login for ${did}:`, error);
      // Distinguish between expected errors (like user not found, which are handled) and unexpected ones.
      if (!res.headersSent) {
         handleError(error, res); // Use generic handler for unexpected errors
      }
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
      
      const currentUserId = req.session?.userId || req.body.currentUserId;
      
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
      
      const currentUserId = req.session?.userId || req.body.currentUserId;
      
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
      const { limit = 10 } = req.query;
      const currentUserId = req.session?.userId || req.body.currentUserId;
      
      if (currentUserId) {
        // Use enhanced recommendations for authenticated users
        const users = await storage.getRecommendedUsers(currentUserId, parseInt(limit as string));
        const formattedUsers = await Promise.all(
          users.map(user => formatUser(user, currentUserId))
        );
        res.status(200).json(formattedUsers);
      } else {
        // Use basic suggestions for anonymous users
        const users = await storage.getSuggestedUsers(undefined);
        const formattedUsers = await Promise.all(
          users.slice(0, parseInt(limit as string)).map(user => formatUser(user))
        );
        res.status(200).json(formattedUsers);
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  // Get individual post
  app.get("/api/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const currentUserId = req.session?.userId || req.body.currentUserId;
      
      const formattedPost = await formatPost(post, currentUserId);
      
      if (!formattedPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      res.status(200).json(formattedPost);
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
        const localFollowingIds = localFollows.map((f: Follow) => f.followingId).filter((id: number | null | undefined): id is number => typeof id === 'number' && id !== null);
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
        posts = relayed.map((post: typeof relayed_posts.$inferSelect) => ({
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
        // Remove the repost interaction
        await storage.removeInteraction(postId, userId, "repost");
        
        // Also delete any repost posts created by this user for this post
        await db.delete(posts).where(and(
          eq(posts.userId, userId),
          eq(posts.quotedPostId, postId),
          eq(posts.content, "") // Repost posts have empty content
        ));
        
        res.status(200).json({ message: "Post un-reposted successfully" });
      } else {
        // Add the repost interaction
        await storage.addInteraction(postId, userId, "repost");
        
        // Create a repost post (empty content, just references the original)
        const repostPost = await storage.createPost({
          content: "", // Empty content indicates this is a pure repost
          userId,
          language: "en",
          quotedPostId: postId
        });
        
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
        
        res.status(200).json({ message: "Post reposted successfully", repostPost });
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

  // Comment Routes
  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      
      const currentUserId = req.session?.userId || req.body.currentUserId;
      
      // Format comments with author info and like status
      const formattedComments = await Promise.all(
        comments.map(async (comment) => {
          const author = await storage.getUser(comment.userId);
          if (!author) return null;
          
          const likeCount = await storage.getPostInteractionCount(comment.id, "like");
          let isLiked = false;
          
          if (currentUserId) {
            isLiked = await storage.hasInteraction(comment.id, currentUserId, "like");
          }
          
          // Get replies for this comment
          const replies = await storage.getCommentReplies(comment.id);
          const formattedReplies = await Promise.all(
            replies.map(async (reply) => {
              const replyAuthor = await storage.getUser(reply.userId);
              if (!replyAuthor) return null;
              
              const replyLikeCount = await storage.getPostInteractionCount(reply.id, "like");
              let replyIsLiked = false;
              
              if (currentUserId) {
                replyIsLiked = await storage.hasInteraction(reply.id, currentUserId, "like");
              }
              
              return {
                id: reply.id,
                content: reply.content,
                createdAt: formatDate(reply.createdAt),
                author: {
                  id: replyAuthor.id,
                  username: replyAuthor.username,
                  name: replyAuthor.name,
                  profileImage: replyAuthor.profileImage,
                  isVerified: replyAuthor.isVerified
                },
                likeCount: replyLikeCount,
                isLiked: replyIsLiked,
                parentId: reply.parentId
              };
            })
          );
          
          return {
            id: comment.id,
            content: comment.content,
            createdAt: formatDate(comment.createdAt),
            author: {
              id: author.id,
              username: author.username,
              name: author.name,
              profileImage: author.profileImage,
              isVerified: author.isVerified
            },
            likeCount,
            isLiked,
            replies: formattedReplies.filter(Boolean)
          };
        })
      );
      
      res.status(200).json(formattedComments.filter(Boolean));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/posts/:id/comments", authMiddleware, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      const { content, parentId } = req.body;
      
      if (!content?.trim()) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // If replying to a comment, verify the parent comment exists
      if (parentId) {
        const parentComment = await storage.getComment(parentId);
        if (!parentComment) {
          return res.status(404).json({ message: "Parent comment not found" });
        }
        if (parentComment.postId !== postId) {
          return res.status(400).json({ message: "Parent comment does not belong to this post" });
        }
      }
      
      const newComment = await storage.createComment({
        content: content.trim(),
        postId,
        userId,
        parentId: parentId || null
      });
      
      // Create notification for post author (if not commenting on own post)
      if (post.userId !== userId) {
        await storage.createNotification({
          type: "comment",
          actorId: userId,
          recipientId: post.userId,
          postId,
          data: {}
        });
      }
      
      // If replying to a comment, create notification for comment author
      if (parentId) {
        const parentComment = await storage.getComment(parentId);
        if (parentComment && parentComment.userId !== userId) {
          await storage.createNotification({
            type: "comment",
            actorId: userId,
            recipientId: parentComment.userId,
            postId,
            data: { parentCommentId: parentId }
          });
        }
      }
      
      // Format the created comment
      const author = await storage.getUser(userId);
      const formattedComment = {
        id: newComment.id,
        content: newComment.content,
        createdAt: formatDate(newComment.createdAt),
        author: {
          id: author!.id,
          username: author!.username,
          name: author!.name,
          profileImage: author!.profileImage,
          isVerified: author!.isVerified
        },
        likeCount: 0,
        isLiked: false,
        parentId: newComment.parentId,
        replies: []
      };
      
      res.status(201).json(formattedComment);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/comments/:id/like", authMiddleware, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      
      const comment = await storage.getComment(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      const hasLiked = await storage.hasInteraction(commentId, userId, "like");
      
      if (hasLiked) {
        await storage.removeInteraction(commentId, userId, "like");
        res.status(200).json({ message: "Comment unliked successfully" });
      } else {
        await storage.addInteraction(commentId, userId, "like");
        
        // Create notification if the comment author is not the current user
        if (comment.userId !== userId) {
          await storage.createNotification({
            type: "like",
            actorId: userId,
            recipientId: comment.userId,
            postId: comment.postId,
            data: { commentId }
          });
        }
        
        res.status(200).json({ message: "Comment liked successfully" });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  app.delete("/api/comments/:id", authMiddleware, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      
      const comment = await storage.getComment(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      if (comment.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }
      
      await storage.deleteComment(commentId);
      res.status(204).end();
    } catch (error) {
      handleError(error, res);
    }
  });

  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.status(200).json(categories);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/categories/:slug/circuits", async (req, res) => {
    try {
      const { slug } = req.params;
      const category = await storage.getCategoryBySlug(slug);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const circuits = await storage.getCircuitsByCategory(category.id);
      
      let currentUserId = undefined;
      if (req.session && req.session.userId !== undefined) {
        currentUserId = req.session.userId;
      }

      // Format circuits with subscriber info like in popular circuits
      const formattedCircuits = await Promise.all(
        circuits.map(async (circuit) => {
          let creator = null;
          if (circuit.creatorId) {
            creator = await storage.getUser(circuit.creatorId);
          }
          const subscriberCount = await storage.getCircuitSubscriberCount(circuit.id);
          let isSubscribed = false;
          
          if (currentUserId) {
            isSubscribed = await storage.isSubscribedToCircuit(currentUserId, circuit.id);
          }
          
          return {
            ...circuit,
            creatorName: creator?.name,
            creatorProfileImage: creator?.profileImage,
            subscriberCount,
            isSubscribed,
            isPublic: circuit.isPublic === undefined ? true : circuit.isPublic,
          };
        })
      );

      res.status(200).json(formattedCircuits);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Circuits (curated feeds)
  app.get("/api/circuits/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '10');
      const circuits = await storage.getTrendingCircuits(limit);
      
      let currentUserId = undefined;
      if (req.session && req.session.userId !== undefined) {
        currentUserId = req.session.userId;
      }

      const formattedCircuits = await Promise.all(
        circuits.map(async (circuit) => {
          let creator = null;
          if (circuit.creatorId) {
            creator = await storage.getUser(circuit.creatorId);
          }
          const subscriberCount = await storage.getCircuitSubscriberCount(circuit.id);
          let isSubscribed = false;
          
          if (currentUserId) {
            isSubscribed = await storage.isSubscribedToCircuit(currentUserId, circuit.id);
          }
          
          return {
            ...circuit,
            creatorName: creator?.name,
            creatorProfileImage: creator?.profileImage,
            subscriberCount,
            isSubscribed,
            isPublic: circuit.isPublic === undefined ? true : circuit.isPublic,
          };
        })
      );

      res.status(200).json(formattedCircuits);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/circuits/suggested", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || '10');
      let currentUserId = undefined;
      
      if (req.session && req.session.userId !== undefined) {
        currentUserId = req.session.userId;
      }

      const circuits = await storage.getSuggestedCircuits(currentUserId, limit);

      const formattedCircuits = await Promise.all(
        circuits.map(async (circuit) => {
          let creator = null;
          if (circuit.creatorId) {
            creator = await storage.getUser(circuit.creatorId);
          }
          const subscriberCount = await storage.getCircuitSubscriberCount(circuit.id);
          let isSubscribed = false;
          
          if (currentUserId) {
            isSubscribed = await storage.isSubscribedToCircuit(currentUserId, circuit.id);
          }
          
          return {
            ...circuit,
            creatorName: creator?.name,
            creatorProfileImage: creator?.profileImage,
            subscriberCount,
            isSubscribed,
            isPublic: circuit.isPublic === undefined ? true : circuit.isPublic,
          };
        })
      );

      res.status(200).json(formattedCircuits);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/circuits/popular", async (req, res) => {
    try {
      let currentUserId = undefined;
      console.log(`[GET /api/circuits/popular] Headers: ${JSON.stringify(req.headers)}`);
      console.log(`[GET /api/circuits/popular] Session before check: ${JSON.stringify(req.session)}`);

      if (req.session && req.session.userId !== undefined) {
        currentUserId = req.session.userId;
        console.log(`[GET /api/circuits/popular] User ID from session: ${currentUserId}`);
      } else {
        console.log(`[GET /api/circuits/popular] No valid session user ID found for popular circuits.`);
      }
      
      const circuitsData = await storage.getPopularCircuits();

      const formattedCircuits = await Promise.all(
        circuitsData.map(async (circuit) => {
          let creator = null;
          if (circuit.creatorId) {
            creator = await storage.getUser(circuit.creatorId);
          }
          const subscriberCount = await storage.getCircuitSubscriberCount(circuit.id);
          let isSubscribed = false;
          
          if (currentUserId) {
            isSubscribed = await storage.isSubscribedToCircuit(currentUserId, circuit.id);
            console.log(`[GET /api/circuits/popular] Circuit ${circuit.id} isSubscribed: ${isSubscribed} for user ${currentUserId}`);
          }
          
          return {
            // Spread existing circuit properties
            ...circuit, 
            // Explicitly map core properties (some might be undefined on the base circuit object)
            id: circuit.id,
            name: circuit.name,
            description: circuit.description,
            creatorId: circuit.creatorId,
            // Add enriched/calculated properties
            creatorName: creator?.name,
            creatorProfileImage: creator?.profileImage,
            subscriberCount,
            isSubscribed,
            // Ensure isPublic is included, defaulting to true if not present
            isPublic: circuit.isPublic === undefined ? true : circuit.isPublic,
            createdAt: circuit.createdAt, 
            updatedAt: circuit.updatedAt,
          };
        })
      );

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

  // Enhanced trending endpoints
  app.get("/api/trends/hashtags", async (req, res) => {
    try {
      const { timeframe = '24h', limit = 10 } = req.query;
      const trends = await storage.getTrendingHashtags(
        parseInt(limit as string), 
        timeframe as '24h' | '7d' | '30d'
      );
      res.status(200).json(trends);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/trends/topics", async (req, res) => {
    try {
      const { language, region, limit = 10 } = req.query;
      const trends = await storage.getTrendingTopics(
        language as string, 
        region as string, 
        parseInt(limit as string)
      );
      res.status(200).json(trends);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Global search endpoint
  app.get("/api/search/global", async (req, res) => {
    try {
      const { q, type, limit = 20 } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const results = await storage.globalSearch(
        q as string, 
        type as 'posts' | 'users' | 'circuits' | undefined,
        parseInt(limit as string)
      );
      
      // Format posts with author information
      const currentUserId = req.session?.userId;
      const formattedPosts = await Promise.all(
        results.posts.map(post => formatPost(post, currentUserId))
      );
      
      // Format users
      const formattedUsers = await Promise.all(
        results.users.map(user => formatUser(user, currentUserId))
      );
      
      // Return formatted results
      res.status(200).json({
        posts: formattedPosts.filter(Boolean),
        users: formattedUsers,
        circuits: results.circuits
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  // Discovery endpoints
  app.get("/api/discover/users", authMiddleware, async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const currentUserId = req.session?.userId || req.body.currentUserId;
      
      if (!currentUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const users = await storage.getRecommendedUsers(currentUserId, parseInt(limit as string));
      const formattedUsers = await Promise.all(
        users.map(user => formatUser(user, currentUserId))
      );
      
      res.status(200).json(formattedUsers);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/discover/posts", async (req, res) => {
    try {
      const { timeframe = '24h', limit = 20 } = req.query;
      const posts = await storage.getPopularPosts(
        timeframe as '24h' | '7d' | '30d',
        parseInt(limit as string)
      );
      
      const currentUserId = req.session?.userId || req.body.currentUserId;
      const formattedPosts = await Promise.all(
        posts.map(post => formatPost(post, currentUserId))
      );
      
      res.status(200).json(formattedPosts.filter(Boolean));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/posts/hashtag/:hashtag", async (req, res) => {
    try {
      const { hashtag } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const posts = await storage.getPostsByHashtag(
        hashtag,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      const currentUserId = req.session?.userId || req.body.currentUserId;
      const formattedPosts = await Promise.all(
        posts.map(post => formatPost(post, currentUserId))
      );
      
      res.status(200).json(formattedPosts.filter(Boolean));
    } catch (error) {
      handleError(error, res);
    }
  });

  // Image upload endpoint
  app.post("/api/upload/image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Return the URL where the image can be accessed
      const imageUrl = `/uploads/${req.file.filename}`;
      
      res.status(200).json({
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
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
        translatedText: req.body.text,
        sourceLanguage: req.body.sourceLanguage || 'auto'
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
      const { name, description, isPublic, categoryId } = req.body;
      const creatorId = req.body.currentUserId;

      if (!creatorId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      if (!name) {
        return res.status(400).json({ message: 'Circuit name is required' });
      }
      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ message: 'isPublic must be a boolean value' });
      }

      // Validate categoryId if provided
      if (categoryId) {
        const category = await storage.getCategory(categoryId);
        if (!category || !category.isActive) {
          return res.status(400).json({ message: 'Invalid category selected' });
        }
      }

      const circuitData: { name: string; description?: string; creatorId: number; isPublic: boolean; categoryId?: number } = {
        name,
        description,
        creatorId,
        isPublic,
        categoryId: categoryId || null,
      };
      
      const circuit = await storage.createCircuit(circuitData);
      res.status(201).json(circuit);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Update an existing circuit (only creator)
  app.put('/api/circuits/:id', authMiddleware, async (req, res) => {
    try {
      const circuitId = parseInt(req.params.id);
      const currentUserId = req.body.currentUserId;
      const { name, description, isPublic, categoryId } = req.body;

      if (!currentUserId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const existingCircuit = await storage.getCircuit(circuitId);
      if (!existingCircuit) {
        return res.status(404).json({ message: 'Circuit not found' });
      }

      if (existingCircuit.creatorId !== currentUserId) {
        return res.status(403).json({ message: 'Only the creator can update this circuit' });
      }

      // Prepare data for update, only include fields that are provided in the request
      const updateData: Partial<Pick<Circuit, 'name' | 'description' | 'categoryId' | 'isPublic'>> = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Circuit name cannot be empty' });
        }
        updateData.name = name.trim();
      }
      if (description !== undefined) {
        updateData.description = description; // Allow empty string for description
      }
      if (categoryId !== undefined) {
        // Validate categoryId if provided
        if (categoryId !== null) {
          const category = await storage.getCategory(categoryId);
          if (!category || !category.isActive) {
            return res.status(400).json({ message: 'Invalid category selected' });
          }
        }
        updateData.categoryId = categoryId;
      }
      if (isPublic !== undefined) {
        if (typeof isPublic !== 'boolean') {
            return res.status(400).json({ message: 'isPublic must be a boolean value' });
        }
        updateData.isPublic = isPublic;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No update data provided' });
      }

      const updatedCircuit = await storage.updateCircuit(circuitId, updateData);
      res.status(200).json(updatedCircuit);
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

  // Get user's subscribed circuits - MUST come before /api/circuits/:id
  app.get('/api/circuits/my-subscriptions', authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      
      console.log(`[my-subscriptions] Starting request for user ${userId}`);
      
      // Get user's circuit subscriptions
      const subscriptions = await db.select()
        .from(circuit_subscriptions)
        .where(eq(circuit_subscriptions.userId, userId));
      
      console.log(`[my-subscriptions] Found ${subscriptions.length} subscriptions:`, subscriptions);
      
      if (subscriptions.length === 0) {
        return res.status(200).json([]);
      }
      
      const circuitIds = subscriptions.map(sub => sub.circuitId);
      console.log(`[my-subscriptions] Circuit IDs:`, circuitIds);
      
      // Validate that all circuitIds are valid numbers
      const invalidIds = circuitIds.filter(id => isNaN(id) || id === null || id === undefined);
      if (invalidIds.length > 0) {
        console.error(`[my-subscriptions] Found invalid circuit IDs:`, invalidIds);
        return res.status(500).json({ message: 'Invalid circuit subscription data found' });
      }
      
      // Get circuit details with stats
      const circuitsData = await db.select()
        .from(circuits)
        .where(inArray(circuits.id, circuitIds));
      
      console.log(`[my-subscriptions] Found ${circuitsData.length} circuits in database`);
      
      // Format circuits with subscriber count and creator info
      const formattedCircuits = await Promise.all(
        circuitsData.map(async (circuit: any) => {
          console.log(`[my-subscriptions] Processing circuit ${circuit.id}`);
          
          // Validate circuit.id before passing to storage methods
          if (isNaN(circuit.id) || circuit.id === null || circuit.id === undefined) {
            console.error(`[my-subscriptions] Invalid circuit ID found in circuit data:`, circuit);
            throw new Error(`Invalid circuit ID: ${circuit.id}`);
          }
          
          const subscriberCount = await storage.getCircuitSubscriberCount(circuit.id);
          
          // Get creator info
          let creatorName = 'Unknown User';
          let creatorProfileImage = '/default-profile.png';
          if (circuit.creatorId && !isNaN(circuit.creatorId)) {
            const creator = await storage.getUser(circuit.creatorId);
            if (creator) {
              creatorName = creator.name || creator.username;
              creatorProfileImage = creator.profileImage;
            }
          }
          
          return {
            ...circuit,
            subscriberCount,
            isSubscribed: true, // All circuits in this response are subscribed to
            creatorName,
            creatorProfileImage,
          };
        })
      );
      
      // Sort by subscription date (most recently joined first)
      const sortedCircuits = formattedCircuits.sort((a: any, b: any) => {
        const subA = subscriptions.find(sub => sub.circuitId === a.id);
        const subB = subscriptions.find(sub => sub.circuitId === b.id);
        if (!subA || !subB) return 0;
        return new Date(subB.subscribedAt).getTime() - new Date(subA.subscribedAt).getTime();
      });
      
      console.log(`[my-subscriptions] Successfully formatted ${sortedCircuits.length} circuits`);
      res.status(200).json(sortedCircuits);
    } catch (error) {
      console.error('[my-subscriptions] Error:', error);
      handleError(error, res);
    }
  });

  // Get circuit details and posts (paginated)
  app.get('/api/circuits/:id', async (req, res) => {
    try {
      console.log(`[GET /api/circuits/:id] Raw id param: "${req.params.id}", type: ${typeof req.params.id}`);
      
      const circuitId = parseInt(req.params.id);
      console.log(`[GET /api/circuits/:id] Parsed circuitId: ${circuitId}, isNaN: ${isNaN(circuitId)}`);
      
      if (isNaN(circuitId)) {
        console.error(`[GET /api/circuits/:id] Invalid circuit ID parameter: "${req.params.id}"`);
        return res.status(400).json({ message: 'Invalid circuit ID parameter' });
      }
      
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const circuit = await storage.getCircuit(circuitId);
      if (!circuit) return res.status(404).json({ message: 'Circuit not found' });

      // Fetch creator details
      let creatorName = 'Unknown User';
      let creatorProfileImage = '/default-profile.png'; // Default image
      if (circuit.creatorId) {
        const creator = await storage.getUser(circuit.creatorId);
        if (creator) {
          creatorName = creator.name || creator.username; // Use username as fallback
          creatorProfileImage = creator.profileImage;
        }
      }

      // Get posts in this circuit (from circuit_posts)
      const postLinks = await db.select().from(circuit_posts)
        .where(eq(circuit_posts.circuitId, circuitId))
        .orderBy(sql`${circuit_posts.addedAt} DESC`)
        .limit(limit)
        .offset((page - 1) * limit);
      const postIds = postLinks.map((link: typeof circuit_posts.$inferSelect) => Number(link.postId));
      let circuitPostsRaw: any[] = [];
      if (postIds.length > 0) {
        circuitPostsRaw = await db.select().from(posts).where(inArray(posts.id, postIds));
      }
      // Check if the current user is subscribed
      let isSubscribed = false;
      let currentUserId = undefined;
      const authHeader = req.headers.authorization;
      console.log(`[GET /api/circuits/:id] Headers: ${JSON.stringify(req.headers)}`);
      console.log(`[GET /api/circuits/:id] Session before check: ${JSON.stringify(req.session)}`);

      if (req.session && req.session.userId !== undefined) {
        currentUserId = req.session.userId;
        console.log(`[GET /api/circuits/:id] User ID from session: ${currentUserId}`);
        isSubscribed = await storage.isSubscribedToCircuit(currentUserId, circuitId);
        console.log(`[GET /api/circuits/:id] isSubscribed status: ${isSubscribed} for user ${currentUserId}`);
      } else {
        console.log(`[GET /api/circuits/:id] No valid session user ID found. isSubscribed remains false.`);
      }
      // Enrich posts with author info and interaction state
      const formattedPosts: any[] = await Promise.all(
        circuitPostsRaw.map((post: any) => formatPost(post, currentUserId))
      );
      // Get total post count for pagination
      const totalPostsResult = await db.select({ count: sql`count(*)` }).from(circuit_posts).where(eq(circuit_posts.circuitId, circuitId));
      const totalPosts = Number(totalPostsResult[0]?.count || 0);
      const totalPages = Math.max(1, Math.ceil(totalPosts / limit));
      
      // Fetch subscriber count
      const subscriberCount = await storage.getCircuitSubscriberCount(circuitId);

      // Add creator info and subscriber count to the response
      const circuitWithDetails = {
        ...circuit,
        creatorName,
        creatorProfileImage,
        subscriberCount
      };

      res.status(200).json({ circuit: circuitWithDetails, posts: formattedPosts, isSubscribed, totalPages, page });
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
      
      // Get circuit info to notify the creator
      const circuit = await storage.getCircuit(circuitId);
      if (circuit && circuit.creatorId !== userId) {
        await storage.createNotification({
          type: 'circuit_join',
          actorId: userId,
          recipientId: circuit.creatorId,
          data: { circuitId, circuitName: circuit.name }
        });
      }
      
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

  // Notifications endpoints
  app.get("/api/notifications", authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const notifications = await storage.getUserNotifications(userId);
      
      // Format notifications with actor info
      const formattedNotifications = (await Promise.all(
        notifications.map(async (notification) => {
          const actor = await storage.getUser(notification.actorId);
          let post = null;
          if (notification.postId) {
            post = await storage.getPost(notification.postId);
          }
          
          // Skip notification if actor doesn't exist
          if (!actor) {
            return null;
          }
          
          return {
            ...notification,
            actor: {
              id: actor.id,
              username: actor.username,
              name: actor.name,
              profileImage: actor.profileImage,
              isVerified: actor.isVerified
            },
            post: post ? {
              id: post.id,
              content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
              createdAt: formatDate(post.createdAt)
            } : null,
            createdAt: formatDate(notification.createdAt),
            timeAgo: getTimeAgo(notification.createdAt)
          };
        })
      )).filter(notification => notification !== null);
      
      res.status(200).json(formattedNotifications);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      
      // Make sure user owns this notification before marking it read
      const notification = await storage.getUserNotifications(userId);
      const userNotification = notification.find(n => n.id === notificationId);
      
      if (!userNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.patch("/api/notifications/read-all", authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      await storage.markAllNotificationsAsRead(userId);
      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      handleError(error, res);
    }
  });

  // Helper function for time ago formatting
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return formatDate(date);
  };

  app.post("/api/posts/:id/quote", authMiddleware, async (req, res) => {
    try {
      const quotedPostId = parseInt(req.params.id);
      const { content, circuitId } = req.body;
      const userId = req.body.currentUserId;
      
      // Validate the quoted post exists
      const quotedPost = await storage.getPost(quotedPostId);
      if (!quotedPost) {
        return res.status(404).json({ message: "Post to quote not found" });
      }
      
      // Create the quote post
      const newPost = await storage.createPost({
        content: content || "",
        userId,
        language: req.body.language || "en",
        circuitId: circuitId || null,
        quotedPostId
      });
      
      // Create notification for the quoted post author (if different user)
      if (quotedPost.userId !== userId) {
        await storage.createNotification({
          type: "quote",
          actorId: userId,
          recipientId: quotedPost.userId,
          postId: newPost.id,
          data: { quotedPostId }
        });
      }
      
      res.status(201).json({ message: "Quote post created successfully", post: newPost });
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
        // Remove the repost interaction
        await storage.removeInteraction(postId, userId, "repost");
        
        // Also delete any repost posts created by this user for this post
        await db.delete(posts).where(and(
          eq(posts.userId, userId),
          eq(posts.quotedPostId, postId),
          eq(posts.content, "") // Repost posts have empty content
        ));
        
        res.status(200).json({ message: "Post un-reposted successfully" });
      } else {
        // Add the repost interaction
        await storage.addInteraction(postId, userId, "repost");
        
        // Create a repost post (empty content, just references the original)
        const repostPost = await storage.createPost({
          content: "", // Empty content indicates this is a pure repost
          userId,
          language: "en",
          quotedPostId: postId
        });
        
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
        
        res.status(200).json({ message: "Post reposted successfully", repostPost });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  // Messaging endpoints
  app.get("/api/conversations", authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const conversations = await storage.getUserConversations(userId);
      
      // Format conversations with participant info and last message
      const formattedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          // Get participants
          const participants = await db
            .select({
              id: users.id,
              username: users.username,
              name: users.name,
              profileImage: users.profileImage,
              isVerified: users.isVerified
            })
            .from(conversationParticipants)
            .innerJoin(users, eq(conversationParticipants.userId, users.id))
            .where(and(
              eq(conversationParticipants.conversationId, conversation.id),
              eq(conversationParticipants.isActive, true)
            ));
          
          // Get last message
          const lastMessage = await db
            .select()
            .from(messages)
            .where(and(
              eq(messages.conversationId, conversation.id),
              eq(messages.isDeleted, false)
            ))
            .orderBy(sql`${messages.createdAt} DESC`)
            .limit(1);
          
          // Get unread count
          const unreadCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(messages)
            .innerJoin(conversationParticipants, eq(messages.conversationId, conversationParticipants.conversationId))
            .where(and(
              eq(conversationParticipants.userId, userId),
              eq(conversationParticipants.conversationId, conversation.id),
              sql`${messages.createdAt} > ${conversationParticipants.lastReadAt}`,
              eq(messages.isDeleted, false)
            ));
          
          return {
            ...conversation,
            participants: participants.filter(p => p.id !== userId), // Don't include current user
            lastMessage: lastMessage[0] ? {
              ...lastMessage[0],
              createdAt: formatDate(lastMessage[0].createdAt),
              timeAgo: getTimeAgo(lastMessage[0].createdAt)
            } : null,
            unreadCount: unreadCount[0]?.count || 0,
            createdAt: formatDate(conversation.createdAt),
            updatedAt: formatDate(conversation.updatedAt)
          };
        })
      );
      
      res.status(200).json(formattedConversations);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/conversations", authMiddleware, async (req, res) => {
    try {
      const { type, title, participantIds } = req.body;
      const userId = req.body.currentUserId;
      
      // For direct conversations, check if one already exists
      if (type === 'direct' && participantIds.length === 1) {
        const existingConversation = await storage.findDirectConversation(userId, participantIds[0]);
        if (existingConversation) {
          return res.status(200).json({ conversationId: existingConversation.id });
        }
      }
      
      // Create new conversation
      const conversation = await storage.createConversation({
        type: type || 'direct',
        title: title || null,
        createdBy: userId
      });
      
      // Add participants
      const allParticipants = [userId, ...participantIds];
      for (const participantId of allParticipants) {
        await storage.addParticipant({
          conversationId: conversation.id,
          userId: participantId
        });
      }
      
      res.status(201).json({ conversationId: conversation.id });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/conversations/:id/messages", authMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify user is participant
      const isParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
          eq(conversationParticipants.isActive, true)
        ))
        .limit(1);
      
      if (!isParticipant.length) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getConversationMessages(conversationId, page, limit);
      
      // Format messages with sender info, reactions, and reply data
      const formattedMessages = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          
          // Get reactions for this message
          const reactions = await db
            .select({
              emoji: messageReactions.emoji,
              userId: messageReactions.userId
            })
            .from(messageReactions)
            .where(eq(messageReactions.messageId, message.id));
          
          // Group reactions by emoji and count them
          const reactionMap = new Map();
          reactions.forEach(reaction => {
            const key = reaction.emoji;
            if (!reactionMap.has(key)) {
              reactionMap.set(key, { emoji: key, count: 0, hasReacted: false, users: [] });
            }
            const reactionData = reactionMap.get(key);
            reactionData.count++;
            reactionData.users.push(reaction.userId);
            if (reaction.userId === userId) {
              reactionData.hasReacted = true;
            }
          });
          
          const formattedReactions = Array.from(reactionMap.values()).map(reaction => ({
            emoji: reaction.emoji,
            count: reaction.count,
            hasReacted: reaction.hasReacted
          }));
          
                               // Fetch reply-to message if this message is a reply
          let replyToMessage = null;
          if (message.replyToMessageId) {
            try {
              const replyMsg = await db
                .select({
                  id: messages.id,
                  content: messages.content,
                  senderId: messages.senderId
                })
                .from(messages)
                .where(eq(messages.id, Number(message.replyToMessageId)))
                .limit(1);
              
              if (replyMsg.length > 0) {
                const replyMessage = replyMsg[0];
                const replySender = await storage.getUser(replyMessage.senderId);
                replyToMessage = {
                  id: replyMessage.id,
                  content: replyMessage.content,
                  sender: replySender ? {
                    id: replySender.id,
                    username: replySender.username,
                    name: replySender.name,
                    profileImage: replySender.profileImage,
                    isVerified: replySender.isVerified
                  } : null
                };
              }
            } catch (error) {
              console.error('Error fetching reply-to message:', error);
            }
          }
          
          const formattedMessage = {
            ...message,
            sender: sender ? {
              id: sender.id,
              username: sender.username,
              name: sender.name,
              profileImage: sender.profileImage,
              isVerified: sender.isVerified
            } : null,
            reactions: formattedReactions,
            replyToMessage,
            createdAt: formatDate(message.createdAt),
            timeAgo: getTimeAgo(message.createdAt)
          };
          

          
          return formattedMessage;
        })
      );
      
      // Reverse to show oldest first
      formattedMessages.reverse();
      
      res.status(200).json(formattedMessages);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/conversations/:id/messages", authMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, messageType, replyToMessageId, fileUrl, fileName, fileType, fileSize } = req.body;
      const userId = req.body.currentUserId;
      
      console.log('Message data received:', { content, messageType, replyToMessageId, fileUrl, fileName, fileType, fileSize });
      
      // Verify user is participant
      const isParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
          eq(conversationParticipants.isActive, true)
        ))
        .limit(1);
      
      if (!isParticipant.length) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Send message
      const message = await storage.sendMessage({
        conversationId,
        senderId: userId,
        content,
        messageType: messageType || 'text',
        replyToMessageId,
        fileUrl,
        fileName,
        fileType,
        fileSize
      });
      
      // Get sender info for response
      const sender = await storage.getUser(userId);
      
      // Fetch reply-to message data for response
      let replyToMessage = null;
      if (message.replyToMessageId) {
        try {
          const replyMsg = await db
            .select({
              id: messages.id,
              content: messages.content,
              senderId: messages.senderId
            })
            .from(messages)
            .where(eq(messages.id, Number(message.replyToMessageId)))
            .limit(1);
          
          if (replyMsg.length > 0) {
            const replyMessage = replyMsg[0];
            const replySender = await storage.getUser(replyMessage.senderId);
            replyToMessage = {
              id: replyMessage.id,
              content: replyMessage.content,
              sender: replySender ? {
                id: replySender.id,
                username: replySender.username,
                name: replySender.name,
                profileImage: replySender.profileImage,
                isVerified: replySender.isVerified
              } : null
            };
          }
        } catch (error) {
          console.error('Error fetching reply-to message for response:', error);
        }
      }
      
      const formattedMessage = {
        ...message,
        sender: sender ? {
          id: sender.id,
          username: sender.username,
          name: sender.name,
          profileImage: sender.profileImage,
          isVerified: sender.isVerified
        } : null,
        replyToMessage,
        createdAt: formatDate(message.createdAt),
        timeAgo: getTimeAgo(message.createdAt)
      };
      
      res.status(201).json(formattedMessage);
    } catch (error) {
      handleError(error, res);
    }
  });

  app.patch("/api/conversations/:id/read", authMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.body.currentUserId;
      
      await storage.markAsRead(conversationId, userId);
      res.status(200).json({ message: "Conversation marked as read" });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/messages/unread-count", authMiddleware, async (req, res) => {
    try {
      const userId = req.body.currentUserId;
      const unreadCount = await storage.getUnreadMessageCount(userId);
      res.status(200).json({ unreadCount });
    } catch (error) {
      handleError(error, res);
    }
  });

  // Message reactions
  app.post("/api/messages/:id/react", authMiddleware, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { emoji } = req.body;
      const userId = req.body.currentUserId;
      
      if (!emoji) {
        return res.status(400).json({ message: "Emoji is required" });
      }
      
      // Check if user already reacted with this emoji
      const existingReaction = await db
        .select()
        .from(messageReactions)
        .where(and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji)
        ))
        .limit(1);
      
      if (existingReaction.length > 0) {
        // Remove existing reaction
        await db
          .delete(messageReactions)
          .where(eq(messageReactions.id, existingReaction[0].id));
        res.status(200).json({ message: "Reaction removed" });
      } else {
        // Add new reaction
        await db.insert(messageReactions).values({
          messageId,
          userId,
          emoji
        });
        res.status(201).json({ message: "Reaction added" });
      }
    } catch (error) {
      handleError(error, res);
    }
  });

  // Search messages
  app.get("/api/conversations/:id/search", authMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { q } = req.query;
      const userId = req.body.currentUserId;
      
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      // Verify user is participant
      const isParticipant = await db
        .select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
          eq(conversationParticipants.isActive, true)
        ))
        .limit(1);
      
      if (!isParticipant.length) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Search messages using full-text search
      const searchResults = await db
        .select()
        .from(messages)
        .where(and(
          eq(messages.conversationId, conversationId),
          eq(messages.isDeleted, false),
          sql`to_tsvector('english', ${messages.content}) @@ plainto_tsquery('english', ${q as string})`
        ))
        .orderBy(sql`${messages.createdAt} DESC`)
        .limit(50);
      
      // Format messages with sender info
      const formattedMessages = await Promise.all(
        searchResults.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return {
            ...message,
            sender: sender ? {
              id: sender.id,
              username: sender.username,
              name: sender.name,
              profileImage: sender.profileImage,
              isVerified: sender.isVerified
            } : null,
            createdAt: formatDate(message.createdAt),
            timeAgo: getTimeAgo(message.createdAt)
          };
        })
      );
      
      res.status(200).json(formattedMessages);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Create an HTTP server instance
  const httpServer = createServer(app);

  return httpServer;
}
