import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertPostSchema } from "@shared/schema";
import { generateTranslation, detectLanguage } from "./translation";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Simple session handling
const sessions: Record<string, { userId: number }> = {};

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to check authentication
  const authMiddleware = (req: Request, res: Response, next: () => void) => {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader?.split(" ")[1];
    
    console.log(`Auth check - Auth Header: ${authHeader}, SessionId: ${sessionId}`);
    console.log(`Active sessions: ${Object.keys(sessions).length}`);
    
    if (!sessionId) {
      console.log('No session ID in request');
      return res.status(401).json({ message: "Unauthorized - No session ID" });
    }
    
    if (!sessions[sessionId]) {
      console.log(`Session ID ${sessionId} not found in active sessions`);
      return res.status(401).json({ message: "Unauthorized - Invalid session" });
    }
    
    console.log(`Auth successful for user ID: ${sessions[sessionId].userId}`);
    req.body.currentUserId = sessions[sessionId].userId;
    next();
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
      isFollowing
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
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const newUser = await storage.createUser(userData);
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt:", req.body);
      
      const loginData = loginSchema.parse(req.body);
      console.log("Validated login data:", loginData);
      
      const user = await storage.getUserByUsername(loginData.username);
      console.log("User found:", user ? `ID: ${user.id}, username: ${user.username}` : "No user found");
      
      if (!user) {
        console.log(`Login failed: User '${loginData.username}' not found`);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      if (user.password !== loginData.password) {
        console.log(`Login failed: Password mismatch for user '${loginData.username}'`);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Generate a secure session ID
      const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessions[sessionId] = { userId: user.id };
      
      console.log(`Login successful - Created session ${sessionId} for user ${user.id}`);
      console.log(`Total active sessions: ${Object.keys(sessions).length}`);
      
      const formattedUser = await formatUser(user);
      
      res.status(200).json({ 
        message: "Login successful",
        sessionId,
        user: formattedUser
      });
    } catch (error) {
      console.error("Login error:", error);
      handleError(error, res);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader?.split(" ")[1];
    
    console.log(`Logout attempt - Auth Header: ${authHeader}, SessionId: ${sessionId}`);
    
    if (!sessionId) {
      console.log('Logout: No session ID provided');
      return res.status(400).json({ message: "No session ID provided" });
    }
    
    if (sessions[sessionId]) {
      const userId = sessions[sessionId].userId;
      console.log(`Logging out user ID ${userId} with session ${sessionId}`);
      delete sessions[sessionId];
      console.log(`Session removed, remaining sessions: ${Object.keys(sessions).length}`);
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

  // User Profile Route
  app.get("/api/users/profile/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentUserId = req.headers.authorization ? 
        sessions[req.headers.authorization.split(" ")[1]]?.userId : undefined;
      
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
        sessions[req.headers.authorization.split(" ")[1]]?.userId : undefined;
      
      const formattedPosts = await Promise.all(
        posts.map(post => formatPost(post, currentUserId))
      );
      
      res.status(200).json(formattedPosts);
    } catch (error) {
      handleError(error, res);
    }
  });

  // Follow/Unfollow User
  app.post("/api/users/:id/follow", authMiddleware, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const currentUserId = req.body.currentUserId;
      
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
        sessions[req.headers.authorization.split(" ")[1]]?.userId : undefined;
      
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
  app.get("/api/posts", async (req, res) => {
    try {
      const feedType = req.query.feedType as string || "for-you";
      const page = parseInt(req.query.page as string || "1");
      const limit = 10;
      const currentUserId = req.headers.authorization ? 
        sessions[req.headers.authorization.split(" ")[1]]?.userId : undefined;
      
      let posts;
      if (feedType === "following" && currentUserId) {
        posts = await storage.getFollowingPosts(currentUserId, page, limit);
      } else if (feedType === "circuits" && currentUserId) {
        posts = await storage.getCircuitPosts(currentUserId, page, limit);
      } else {
        posts = await storage.getAllPosts(page, limit);
      }
      
      const formattedPosts = await Promise.all(
        posts.map(post => formatPost(post, currentUserId))
      );
      
      const totalPosts = await storage.getPostCount(feedType, currentUserId);
      const totalPages = Math.ceil(totalPosts / limit);
      
      res.status(200).json({
        posts: formattedPosts,
        page,
        totalPages
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
      
      // Extract hashtags and update trends
      const hashtags = content.match(/#\w+/g) || [];
      for (const hashtag of hashtags) {
        await storage.updateTrend(hashtag, "Trending");
      }
      
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
        sessions[req.headers.authorization.split(" ")[1]]?.userId : undefined;
      
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
          creatorName: creator.name,
          color: circuit.color,
          type: circuit.type,
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
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage = "en" } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text to translate is required" });
      }
      
      const sourceLanguage = await detectLanguage(text);
      const translatedText = await generateTranslation(text, sourceLanguage, targetLanguage);
      
      res.status(200).json({
        translatedText,
        detectedSourceLanguage: sourceLanguage
      });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/detect-language", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const language = await detectLanguage(text);
      res.status(200).json({ language });
    } catch (error) {
      handleError(error, res);
    }
  });

  // Create an HTTP server instance
  const httpServer = createServer(app);

  return httpServer;
}
