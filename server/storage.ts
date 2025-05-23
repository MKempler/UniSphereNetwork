import type {
  User, InsertUser,
  Post, InsertPost,
  Follow, InsertFollow,
  PostInteraction, InsertPostInteraction,
  Comment, InsertComment,
  Circuit, InsertCircuit,
  CircuitSubscription, InsertCircuitSubscription,
  Category, InsertCategory,
  Community, InsertCommunity,
  CommunityMember, InsertCommunityMember,
  Trend, InsertTrend,
  Notification, InsertNotification
} from "../shared/schema.ts";
import {
  users, posts, follows, postInteractions, comments,
  circuits, circuit_subscriptions, categories,
  communities, communityMembers, trends, notifications
} from "../shared/schema.ts";
import { db } from "./db.ts";
import { eq, and, sql, inArray, isNotNull } from "drizzle-orm";
import { translateText, detectLanguage } from './translation.ts';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByDid(did: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  getFollowerCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  addFollow(followerId: number, followingId: number): Promise<Follow>;
  addFollow(followerId: number, remoteDid: string, remoteNode?: string): Promise<Follow>;
  removeFollow(followerId: number, followingId: number): Promise<void>;
  removeFollow(followerId: number, remoteDid: string): Promise<void>;
  getSuggestedUsers(currentUserId?: number): Promise<User[]>;

  // Post operations
  getPost(id: number): Promise<Post | undefined>;
  getAllPosts(page?: number, limit?: number): Promise<Post[]>;
  getFollowingPosts(userId: number, page?: number, limit?: number): Promise<Post[]>;
  getCircuitPosts(userId: number, page?: number, limit?: number): Promise<Post[]>;
  getUserPosts(userId: number): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  deletePost(id: number): Promise<void>;
  getPostCount(feedType: string, userId?: number): Promise<number>;

  // Post interactions
  addInteraction(postId: number, userId: number, type: string): Promise<PostInteraction>;
  removeInteraction(postId: number, userId: number, type: string): Promise<void>;
  hasInteraction(postId: number, userId: number, type: string): Promise<boolean>;
  getPostInteractionCount(postId: number, type: string): Promise<number>;

  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getPostComments(postId: number): Promise<Comment[]>;
  getComment(id: number): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<void>;
  getCommentReplies(parentId: number): Promise<Comment[]>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<Pick<Category, 'name' | 'description' | 'icon' | 'color' | 'sortOrder' | 'isActive'>>): Promise<Category | undefined>;

  // Circuit operations
  getCircuit(id: number): Promise<Circuit | undefined>;
  getPopularCircuits(): Promise<Circuit[]>;
  getCircuitsByCategory(categoryId: number): Promise<Circuit[]>;
  getTrendingCircuits(limit?: number): Promise<Circuit[]>;
  getSuggestedCircuits(userId?: number, limit?: number): Promise<Circuit[]>;
  createCircuit(circuit: InsertCircuit): Promise<Circuit>;
  updateCircuit(id: number, data: Partial<Pick<Circuit, 'name' | 'description' | 'categoryId' | 'isPublic'>>): Promise<Circuit | undefined>;
  subscribeToCircuit(userId: number, circuitId: number): Promise<CircuitSubscription>;
  unsubscribeFromCircuit(userId: number, circuitId: number): Promise<void>;
  isSubscribedToCircuit(userId: number, circuitId: number): Promise<boolean>;
  getCircuitSubscriberCount(circuitId: number): Promise<number>;

  // Community operations
  getCommunity(id: number): Promise<Community | undefined>;
  getUserCommunities(userId: number): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  joinCommunity(userId: number, communityId: number): Promise<CommunityMember>;
  leaveCommunity(userId: number, communityId: number): Promise<void>;
  isJoinedCommunity(userId: number, communityId: number): Promise<boolean>;
  getCommunityMemberCount(communityId: number): Promise<number>;

  // Trends
  getTrends(): Promise<Trend[]>;
  updateTrend(tag: string, category: string): Promise<Trend>;
  // Enhanced trending methods
  getTrendingHashtags(limit?: number, timeframe?: '24h' | '7d' | '30d'): Promise<Trend[]>;
  getTrendingTopics(language?: string, region?: string, limit?: number): Promise<Trend[]>;
  searchTrends(query: string): Promise<Trend[]>;

  // Discovery and search methods
  globalSearch(query: string, type?: 'posts' | 'users' | 'circuits', limit?: number): Promise<{
    posts: Post[];
    users: User[];
    circuits: Circuit[];
  }>;
  getRecommendedUsers(currentUserId: number, limit?: number): Promise<User[]>;
  getPopularPosts(timeframe?: '24h' | '7d' | '30d', limit?: number): Promise<Post[]>;
  getPostsByHashtag(hashtag: string, page?: number, limit?: number): Promise<Post[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Remote follow operations
  getFollow(followerId: number, remoteDid: string): Promise<Follow | undefined>;
  addFollow(followerId: number, remoteDid: string, remoteNode?: string): Promise<Follow>;
  removeFollow(followerId: number, remoteDid: string): Promise<void>;

  // New method
  getPostsByUserIds(userIds: number[], page?: number, limit?: number): Promise<Post[]>;

  // New functions
  getUserFollowers(userId: number): Promise<User[]>;
  getUserFollowing(userId: number): Promise<User[]>;
  getMutualFollowers(userId: number, otherUserId: number): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Database connection is setup in db.ts and imported where needed
  }

  // User methods implementation with database
  async getUser(id: number): Promise<User | undefined> {
    try {
      if (id === undefined || id === null || isNaN(id)) {
        console.warn("getUser called with invalid id:", id);
        return undefined;
      }
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }
  
  async getUserByDid(did: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.did, did));
      return user;
    } catch (error) {
      console.error("Error in getUserByDid:", error);
      return undefined;
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values({
        ...insertUser,
        coverImage: insertUser.coverImage || null,
        bio: insertUser.bio || null,
        language: insertUser.language || 'en',
        createdAt: new Date(),
        isVerified: false,
        unreadNotifications: 0
      }).returning();
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error("Error in updateUser:", error);
      throw error;
    }
  }
  
  async getFollowerCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(follows)
        .where(eq(follows.followingId, userId));
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error in getFollowerCount:", error);
      return 0;
    }
  }

  async getFollowingCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(follows)
        .where(eq(follows.followerId, userId));
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error in getFollowingCount:", error);
      return 0;
    }
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    try {
      const [follow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followingId, followingId)
          )
        );
      return !!follow;
    } catch (error) {
      console.error("Error in isFollowing:", error);
      return false;
    }
  }

  async addFollow(followerId: number, arg2: number | string, remoteNode?: string): Promise<Follow> {
    if (typeof arg2 === 'number') {
      // Local follow
      const followingId = arg2;
      const [follow] = await db
        .insert(follows)
        .values({
          followerId,
          followingId,
          createdAt: new Date()
        })
        .returning();
      return follow;
    } else {
      // Remote follow
      const remoteDid = arg2;
      const [follow] = await db.insert(follows).values({
        followerId,
        remoteDid,
        remoteNode: remoteNode || null,
        createdAt: new Date()
      }).returning();
      return follow;
    }
  }

  async removeFollow(followerId: number, arg2: number | string): Promise<void> {
    if (typeof arg2 === 'number') {
      // Local unfollow
      const followingId = arg2;
      await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followingId, followingId)
          )
        );
    } else {
      // Remote unfollow
      const remoteDid = arg2;
      await db.delete(follows)
        .where(and(eq(follows.followerId, followerId), eq(follows.remoteDid, remoteDid)));
    }
  }
  
  async getSuggestedUsers(currentUserId?: number): Promise<User[]> {
    try {
      // If no current user, return some random users
      if (!currentUserId) {
        return await db.select().from(users).limit(5);
      }
      
      // Get users that the current user is already following
      const followingIds = await this.getFollowedUserIds(currentUserId);
      followingIds.push(currentUserId); // Add current user to exclude them
      
      // For more personalized suggestions, let's look for users that are followed
      // by people the current user follows (mutual connections)
      
      // First, check if we have enough following to make this approach worthwhile
      if (followingIds.length > 1) { // More than just the current user
        // Get all the users that are followed by the people the current user follows
        // This is a common social network recommendation approach
        const mutualConnectionsQuery = `
          SELECT f2.following_id, COUNT(f2.following_id) as mutual_count
          FROM follows f1
          JOIN follows f2 ON f1.following_id = f2.follower_id
          WHERE f1.follower_id = ${currentUserId}
            AND f2.following_id NOT IN (${followingIds.join(',')})
          GROUP BY f2.following_id
          ORDER BY mutual_count DESC
          LIMIT 5
        `;
        
        // @ts-ignore
        const mutualConnections = await db.execute(mutualConnectionsQuery);
        
        // If we have mutual connections to suggest
        if (mutualConnections && mutualConnections.length > 0) {
          // Get the full user details for these recommended users
          const recommendedIds = mutualConnections.map((row: any) => row.following_id);
          
          if (recommendedIds.length > 0) {
            // Fetch the full user records
            const suggestedUsersQuery = `
              SELECT * FROM users 
              WHERE id IN (${recommendedIds.join(',')})
            `;
            // @ts-ignore
            const suggestedUsers = await db.execute(suggestedUsersQuery);
            
            if (suggestedUsers && suggestedUsers.length > 0) {
              return suggestedUsers;
            }
          }
        }
      }
      
      // Fallback: If we couldn't find mutual connections or don't have enough following,
      // return users that the current user is not following
      const excludeIds = followingIds.length > 0 ? 
        followingIds.map(id => Number(id)).filter(Boolean).join(',') : 
        currentUserId.toString();
        
      const fallbackQuery = `
        SELECT * FROM users 
        WHERE id NOT IN (${excludeIds})
        ORDER BY RANDOM()
        LIMIT 5
      `;
      
      // @ts-ignore
      const result = await db.execute(fallbackQuery);
      return result;
    } catch (error) {
      console.error("Error in getSuggestedUsers:", error);
      return [];
    }
  }
  
  async getFollowedUserIds(userId: number): Promise<number[]> {
    try {
      const followings = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId));
      // Filter out nulls to ensure number[]
      return followings.map(f => f.followingId).filter((id): id is number => typeof id === 'number' && id !== null);
    } catch (error) {
      console.error("Error in getFollowedUserIds:", error);
      return [];
    }
  }
  
  // Post methods
  async getPost(id: number): Promise<Post | undefined> {
    try {
      const [post] = await db.select().from(posts).where(eq(posts.id, id));
      return post;
    } catch (error) {
      console.error("Error in getPost:", error);
      return undefined;
    }
  }
  
  async getAllPosts(page = 1, limit = 10): Promise<Post[]> {
    try {
      const offset = (page - 1) * limit;
      return await db
        .select()
        .from(posts)
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error in getAllPosts:", error);
      return [];
    }
  }
  
  async getFollowingPosts(userId: number, page = 1, limit = 10): Promise<Post[]> {
    try {
      const offset = (page - 1) * limit;
      const followingIds = await this.getFollowedUserIds(userId);
      
      if (followingIds.length === 0) return [];
      
      return await db
        .select()
        .from(posts)
        .where(inArray(posts.userId, followingIds))
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error in getFollowingPosts:", error);
      return [];
    }
  }
  
  async getCircuitPosts(userId: number, page = 1, limit = 10): Promise<Post[]> {
    try {
      const offset = (page - 1) * limit;
      // Get user's subscribed circuits
      const circuitIds = await this.getSubscribedCircuitIds(userId);
      
      if (circuitIds.length === 0) return [];
      
      return await db
        .select()
        .from(posts)
        .where(and(
          isNotNull(posts.circuitId),
          inArray(posts.circuitId, circuitIds)
        ))
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error in getCircuitPosts:", error);
      return [];
    }
  }
  
  async getSubscribedCircuitIds(userId: number): Promise<number[]> {
    try {
      const subscriptions = await db
        .select({ circuitId: circuit_subscriptions.circuitId })
        .from(circuit_subscriptions)
        .where(eq(circuit_subscriptions.userId, userId));
      
      return subscriptions.map(s => s.circuitId);
    } catch (error) {
      console.error("Error in getSubscribedCircuitIds:", error);
      return [];
    }
  }
  
  async getUserPosts(userId: number): Promise<Post[]> {
    try {
      return await db
        .select()
        .from(posts)
        .where(eq(posts.userId, userId))
        .orderBy(sql`${posts.createdAt} DESC`);
    } catch (error) {
      console.error("Error in getUserPosts:", error);
      return [];
    }
  }
  
  async createPost(insertPost: InsertPost): Promise<Post> {
    try {
      const [post] = await db
        .insert(posts)
        .values({
          ...insertPost,
          media: insertPost.media || null,
          circuitId: insertPost.circuitId || null,
          createdAt: new Date()
        })
        .returning();
      return post;
    } catch (error) {
      console.error("Error in createPost:", error);
      throw error;
    }
  }
  
  async deletePost(id: number): Promise<void> {
    try {
      await db.delete(posts).where(eq(posts.id, id));
    } catch (error) {
      console.error("Error in deletePost:", error);
      throw error;
    }
  }
  
  async getPostCount(feedType: string, userId?: number): Promise<number> {
    try {
      let query;
      switch (feedType) {
        case 'following':
          if (!userId) return 0;
          const followingIds = await this.getFollowedUserIds(userId);
          if (followingIds.length === 0) return 0;
          query = db
            .select({ count: sql`count(*)` })
            .from(posts)
            .where(inArray(posts.userId, followingIds));
          break;
        case 'circuit':
          if (!userId) return 0;
          const circuitIds = await this.getSubscribedCircuitIds(userId);
          if (circuitIds.length === 0) return 0;
          query = db
            .select({ count: sql`count(*)` })
            .from(posts)
            .where(and(
              isNotNull(posts.circuitId),
              inArray(posts.circuitId, circuitIds)
            ));
          break;
        case 'user':
          if (!userId) return 0;
          query = db
            .select({ count: sql`count(*)` })
            .from(posts)
            .where(eq(posts.userId, userId));
          break;
        default:
          query = db.select({ count: sql`count(*)` }).from(posts);
      }
      
      const result = await query;
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error in getPostCount:", error);
      return 0;
    }
  }
  
  // Post interactions
  async addInteraction(postId: number, userId: number, type: string): Promise<PostInteraction> {
    try {
      const [interaction] = await db
        .insert(postInteractions)
        .values({
          postId,
          userId,
          type,
          createdAt: new Date()
        })
        .returning();
      return interaction;
    } catch (error) {
      console.error("Error in addInteraction:", error);
      throw error;
    }
  }
  
  async removeInteraction(postId: number, userId: number, type: string): Promise<void> {
    try {
      await db
        .delete(postInteractions)
        .where(
          and(
            eq(postInteractions.postId, postId),
            eq(postInteractions.userId, userId),
            eq(postInteractions.type, type)
          )
        );
    } catch (error) {
      console.error("Error in removeInteraction:", error);
      throw error;
    }
  }
  
  async hasInteraction(postId: number, userId: number, type: string): Promise<boolean> {
    try {
      const [interaction] = await db
        .select()
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.postId, postId),
            eq(postInteractions.userId, userId),
            eq(postInteractions.type, type)
          )
        );
      return !!interaction;
    } catch (error) {
      console.error("Error in hasInteraction:", error);
      return false;
    }
  }
  
  async getPostInteractionCount(postId: number, type: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(postInteractions)
        .where(
          and(
            eq(postInteractions.postId, postId),
            eq(postInteractions.type, type)
          )
        );
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error in getPostInteractionCount:", error);
      return 0;
    }
  }
  
  // Circuit operations
  async getCircuit(id: number): Promise<Circuit | undefined> {
    try {
      console.log(`[storage.getCircuit] Called with id: ${id}, type: ${typeof id}, isNaN: ${isNaN(id)}`);
      
      if (isNaN(id) || id === null || id === undefined) {
        console.error(`[storage.getCircuit] Invalid circuit ID received: ${id}`);
        throw new Error(`Invalid circuit ID: ${id}`);
      }
      
      const [circuit] = await db.select().from(circuits).where(eq(circuits.id, id));
      console.log(`[storage.getCircuit] Query result for id ${id}:`, circuit ? 'found' : 'not found');
      return circuit;
    } catch (error) {
      console.error("Error in getCircuit:", error);
      return undefined;
    }
  }
  
  async getPopularCircuits(): Promise<Circuit[]> {
    try {
      // In the future, we could order by subscriber count or activity
      return await db.select().from(circuits).limit(5);
    } catch (error) {
      console.error("Error in getPopularCircuits:", error);
      return [];
    }
  }
  
  async createCircuit(insertCircuit: InsertCircuit): Promise<Circuit> {
    try {
      console.log("[storage.createCircuit] Received data:", JSON.stringify(insertCircuit, null, 2));
      const [circuit] = await db.insert(circuits).values({
        ...insertCircuit,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      if (!circuit) {
        throw new Error("Circuit creation failed, no record returned.");
      }
      console.log("[storage.createCircuit] Created circuit:", JSON.stringify(circuit, null, 2));
      return circuit;
    } catch (error) {
      console.error("Error in createCircuit:", error);
      throw error;
    }
  }
  
  async updateCircuit(id: number, data: Partial<Pick<Circuit, 'name' | 'description' | 'isPublic'>>): Promise<Circuit | undefined> {
    try {
      console.log(`[storage.updateCircuit] Updating circuit ${id} with data:`, JSON.stringify(data, null, 2));
      const [updatedCircuit] = await db.update(circuits)
        .set({...data, updatedAt: new Date()})
        .where(eq(circuits.id, id))
        .returning();
      
      if (!updatedCircuit) {
        console.warn(`[storage.updateCircuit] Circuit with id ${id} not found or update failed.`);
        return undefined;
      }
      console.log("[storage.updateCircuit] Updated circuit:", JSON.stringify(updatedCircuit, null, 2));
      return updatedCircuit;
    } catch (error) {
      console.error(`Error in updateCircuit for id ${id}:`, error);
      throw error;
    }
  }
  
  async subscribeToCircuit(userId: number, circuitId: number): Promise<CircuitSubscription> {
    try {
      // Check if already subscribed
      const [existingSubscription] = await db
        .select()
        .from(circuit_subscriptions)
        .where(
          and(
            eq(circuit_subscriptions.userId, userId),
            eq(circuit_subscriptions.circuitId, circuitId)
          )
        );

      if (existingSubscription) {
        console.log(`User ${userId} already subscribed to circuit ${circuitId}. Returning existing.`);
        return existingSubscription; // Or handle as an "already subscribed" case if preferred
      }

      // If not subscribed, create new subscription
      const [newSubscription] = await db
        .insert(circuit_subscriptions)
        .values({
          userId,
          circuitId,
          subscribedAt: new Date()
        })
        .returning();
      console.log(`User ${userId} newly subscribed to circuit ${circuitId}.`);
      return newSubscription;

    } catch (error) {
      console.error("Error in subscribeToCircuit:", error);
      // Consider if this error could be due to a race condition if two requests try to insert simultaneously
      // after the check. A unique constraint in the DB is the ultimate guard.
      throw error;
    }
  }
  
  async unsubscribeFromCircuit(userId: number, circuitId: number): Promise<void> {
    try {
      await db
        .delete(circuit_subscriptions)
        .where(
          and(
            eq(circuit_subscriptions.userId, userId),
            eq(circuit_subscriptions.circuitId, circuitId)
          )
        );
    } catch (error) {
      console.error("Error in unsubscribeFromCircuit:", error);
      throw error;
    }
  }
  
  async isSubscribedToCircuit(userId: number, circuitId: number): Promise<boolean> {
    try {
      const [subscription] = await db
        .select()
        .from(circuit_subscriptions)
        .where(
          and(
            eq(circuit_subscriptions.userId, userId),
            eq(circuit_subscriptions.circuitId, circuitId)
          )
        );
      return !!subscription;
    } catch (error) {
      console.error("Error in isSubscribedToCircuit:", error);
      return false;
    }
  }
  
  async getCircuitSubscriberCount(circuitId: number): Promise<number> {
    try {
      console.log(`[storage.getCircuitSubscriberCount] Called with circuitId: ${circuitId}, type: ${typeof circuitId}, isNaN: ${isNaN(circuitId)}`);
      
      if (isNaN(circuitId) || circuitId === null || circuitId === undefined) {
        console.error(`[storage.getCircuitSubscriberCount] Invalid circuit ID received: ${circuitId}`);
        throw new Error(`Invalid circuit ID for subscriber count: ${circuitId}`);
      }
      
      const result = await db
        .select({ count: sql`count(*)` })
        .from(circuit_subscriptions)
        .where(eq(circuit_subscriptions.circuitId, circuitId));
      
      const count = Number(result[0]?.count || 0);
      console.log(`[storage.getCircuitSubscriberCount] Circuit ${circuitId} has ${count} subscribers`);
      return count;
    } catch (error) {
      console.error("Error in getCircuitSubscriberCount:", error);
      return 0;
    }
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    try {
      return await db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.sortOrder);
    } catch (error) {
      console.error("Error in getCategories:", error);
      return [];
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    try {
      const [category] = await db.select().from(categories).where(eq(categories.id, id));
      return category;
    } catch (error) {
      console.error("Error in getCategory:", error);
      return undefined;
    }
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    try {
      const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
      return category;
    } catch (error) {
      console.error("Error in getCategoryBySlug:", error);
      return undefined;
    }
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    try {
      const [category] = await db.insert(categories).values({
        ...insertCategory,
        createdAt: new Date(),
      }).returning();
      return category;
    } catch (error) {
      console.error("Error in createCategory:", error);
      throw error;
    }
  }

  async updateCategory(id: number, data: Partial<Pick<Category, 'name' | 'description' | 'icon' | 'color' | 'sortOrder' | 'isActive'>>): Promise<Category | undefined> {
    try {
      const [category] = await db
        .update(categories)
        .set(data)
        .where(eq(categories.id, id))
        .returning();
      return category;
    } catch (error) {
      console.error("Error in updateCategory:", error);
      return undefined;
    }
  }

  async getCircuitsByCategory(categoryId: number): Promise<Circuit[]> {
    try {
      return await db
        .select()
        .from(circuits)
        .where(eq(circuits.categoryId, categoryId))
        .orderBy(sql`${circuits.createdAt} DESC`);
    } catch (error) {
      console.error("Error in getCircuitsByCategory:", error);
      return [];
    }
  }

  async getTrendingCircuits(limit = 10): Promise<Circuit[]> {
    try {
      // Get circuits with most subscribers (trending by popularity)
      const query = `
        SELECT c.*, COUNT(cs.user_id) as subscriber_count
        FROM circuits c
        LEFT JOIN circuit_subscriptions cs ON c.id = cs.circuit_id
        WHERE c.is_public = true
        GROUP BY c.id
        ORDER BY subscriber_count DESC, c.created_at DESC
        LIMIT ${limit}
      `;
      // @ts-ignore
      return await db.execute(query);
    } catch (error) {
      console.error("Error in getTrendingCircuits:", error);
      return [];
    }
  }

  async getSuggestedCircuits(userId?: number, limit = 10): Promise<Circuit[]> {
    try {
      if (!userId) {
        // For anonymous users, return popular public circuits
        return await db
          .select()
          .from(circuits)
          .where(eq(circuits.isPublic, true))
          .orderBy(sql`${circuits.createdAt} DESC`)
          .limit(limit);
      }

      // For logged-in users, suggest circuits from categories they're interested in
      // or circuits created by people they follow
      const query = `
        SELECT DISTINCT c.*, 
               CASE WHEN f.follower_id = ${userId} THEN 2 ELSE 1 END as priority
        FROM circuits c
        LEFT JOIN circuit_subscriptions cs ON c.id = cs.circuit_id
        LEFT JOIN follows f ON c.creator_id = f.following_id
        WHERE c.is_public = true
          AND c.id NOT IN (
            SELECT circuit_id FROM circuit_subscriptions WHERE user_id = ${userId}
          )
          AND (f.follower_id = ${userId} OR c.category_id IN (
            SELECT DISTINCT c2.category_id 
            FROM circuits c2 
            JOIN circuit_subscriptions cs2 ON c2.id = cs2.circuit_id 
            WHERE cs2.user_id = ${userId}
          ))
        ORDER BY priority DESC, c.created_at DESC
        LIMIT ${limit}
      `;
      // @ts-ignore
      return await db.execute(query);
    } catch (error) {
      console.error("Error in getSuggestedCircuits:", error);
      return [];
    }
  }
  
  // Community operations
  async getCommunity(id: number): Promise<Community | undefined> {
    try {
      const [community] = await db.select().from(communities).where(eq(communities.id, id));
      return community;
    } catch (error) {
      console.error("Error in getCommunity:", error);
      return undefined;
    }
  }
  
  async getUserCommunities(userId: number): Promise<Community[]> {
    try {
      const memberCommunities = await db
        .select({
          communityId: communityMembers.communityId
        })
        .from(communityMembers)
        .where(eq(communityMembers.userId, userId));
      
      if (memberCommunities.length === 0) return [];
      
      const communityIds = memberCommunities.map(m => m.communityId);
      
      return await db
        .select()
        .from(communities)
        .where(sql`${communities.id} IN (${communityIds.join(',')})`);
    } catch (error) {
      console.error("Error in getUserCommunities:", error);
      return [];
    }
  }
  
  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    try {
      const [community] = await db
        .insert(communities)
        .values({
          ...insertCommunity,
          color: insertCommunity.color || null,
          createdAt: new Date()
        })
        .returning();
      return community;
    } catch (error) {
      console.error("Error in createCommunity:", error);
      throw error;
    }
  }
  
  async joinCommunity(userId: number, communityId: number): Promise<CommunityMember> {
    try {
      const [member] = await db
        .insert(communityMembers)
        .values({
          userId,
          communityId,
          createdAt: new Date()
        })
        .returning();
      return member;
    } catch (error) {
      console.error("Error in joinCommunity:", error);
      throw error;
    }
  }
  
  async leaveCommunity(userId: number, communityId: number): Promise<void> {
    try {
      await db
        .delete(communityMembers)
        .where(
          and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId)
          )
        );
    } catch (error) {
      console.error("Error in leaveCommunity:", error);
      throw error;
    }
  }
  
  async isJoinedCommunity(userId: number, communityId: number): Promise<boolean> {
    try {
      const [member] = await db
        .select()
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.userId, userId),
            eq(communityMembers.communityId, communityId)
          )
        );
      return !!member;
    } catch (error) {
      console.error("Error in isJoinedCommunity:", error);
      return false;
    }
  }
  
  async getCommunityMemberCount(communityId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(communityMembers)
        .where(eq(communityMembers.communityId, communityId));
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error in getCommunityMemberCount:", error);
      return 0;
    }
  }
  
  // Trends
  async getTrends(): Promise<Trend[]> {
    try {
      return await db
        .select()
        .from(trends)
        .orderBy(sql`${trends.postCount} DESC`)
        .limit(10);
    } catch (error) {
      console.error("Error in getTrends:", error);
      return [];
    }
  }
  
  async updateTrend(tag: string, category: string): Promise<Trend> {
    try {
      const [existingTrend] = await db
        .select()
        .from(trends)
        .where(eq(trends.tag, tag));
      
      if (existingTrend) {
        // Update existing trend
        const [trend] = await db
          .update(trends)
          .set({
            postCount: existingTrend.postCount + 1
          })
          .where(eq(trends.id, existingTrend.id))
          .returning();
        return trend;
      } else {
        // Create new trend
        const [trend] = await db
          .insert(trends)
          .values({
            tag,
            category,
            postCount: 1,
            createdAt: new Date()
          })
          .returning();
        return trend;
      }
    } catch (error) {
      console.error("Error in updateTrend:", error);
      throw error;
    }
  }
  
  // Notifications
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          ...insertNotification,
          isRead: false,
          createdAt: new Date(),
          postId: insertNotification.postId || null,
          data: insertNotification.data || {}
        })
        .returning();
      return notification;
    } catch (error) {
      console.error("Error in createNotification:", error);
      throw error;
    }
  }
  
  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.recipientId, userId))
        .orderBy(sql`${notifications.createdAt} DESC`);
    } catch (error) {
      console.error("Error in getUserNotifications:", error);
      return [];
    }
  }
  
  async markNotificationAsRead(id: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id));
    } catch (error) {
      console.error("Error in markNotificationAsRead:", error);
      throw error;
    }
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, userId));
    } catch (error) {
      console.error("Error in markAllNotificationsAsRead:", error);
      throw error;
    }
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error in getUnreadNotificationCount:", error);
      return 0;
    }
  }

  async getFollow(followerId: number, remoteDid: string): Promise<Follow | undefined> {
    try {
      const [follow] = await db.select().from(follows)
        .where(and(eq(follows.followerId, followerId), eq(follows.remoteDid, remoteDid)));
      return follow;
    } catch (error) {
      console.error("Error in getFollow (remote):", error);
      return undefined;
    }
  }

  async getPostsByUserIds(userIds: number[], page?: number, limit?: number): Promise<Post[]> {
    // Filter out nulls to avoid SQL errors
    userIds = userIds.filter((id): id is number => typeof id === 'number' && id !== null);
    if (!userIds.length) return [];
    page = page ?? 1;
    limit = limit ?? 10;
    try {
      const offset = (page - 1) * limit;
      return await db
        .select()
        .from(posts)
        .where(inArray(posts.userId, userIds))
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error in getPostsByUserIds:", error);
      return [];
    }
  }

  async getUserFollowers(userId: number): Promise<User[]> {
    try {
      const followerRows = await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(eq(follows.followingId, userId));
      
      const followerIds = followerRows.map(row => row.followerId);
      
      if (followerIds.length === 0) return [];
      
      const followers = await db
        .select()
        .from(users)
        .where(inArray(users.id, followerIds));
      
      return followers;
    } catch (error) {
      console.error("Error in getUserFollowers:", error);
      return [];
    }
  }

  async getUserFollowing(userId: number): Promise<User[]> {
    try {
      const followingRows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId));
      
      const followingIds = followingRows.map(row => row.followingId);
      
      if (followingIds.length === 0) return [];
      
      const following = await db
        .select()
        .from(users)
        .where(inArray(users.id, followingIds));
      
      return following;
    } catch (error) {
      console.error("Error in getUserFollowing:", error);
      return [];
    }
  }
  
  async getMutualFollowers(userId: number, otherUserId: number): Promise<User[]> {
    try {
      // Find user IDs who follow both users
      const query = `
        SELECT f1.follower_id
        FROM follows f1
        JOIN follows f2 ON f1.follower_id = f2.follower_id
        WHERE f1.following_id = ${userId}
          AND f2.following_id = ${otherUserId}
          AND f1.follower_id != ${userId}
          AND f1.follower_id != ${otherUserId}
      `;
      
      // @ts-ignore
      const mutualFollowerRows = await db.execute(query);
      
      if (!mutualFollowerRows || mutualFollowerRows.length === 0) {
        return [];
      }
      
      const mutualFollowerIds = mutualFollowerRows.map((row: any) => row.follower_id);
      
      if (mutualFollowerIds.length === 0) {
        return [];
      }
      
      // Get the full user details for these mutual followers
      const usersQuery = `
        SELECT * FROM users 
        WHERE id IN (${mutualFollowerIds.join(',')})
      `;
      
      // @ts-ignore
      const mutualFollowers = await db.execute(usersQuery);
      
      return mutualFollowers || [];
    } catch (error) {
      console.error("Error in getMutualFollowers:", error);
      return [];
    }
  }

  // Comment operations
  async createComment(insertComment: InsertComment): Promise<Comment> {
    try {
      const detectedLanguage = await detectLanguage(insertComment.content);
      const [comment] = await db
        .insert(comments)
        .values({
          ...insertComment,
          language: detectedLanguage,
          createdAt: new Date()
        })
        .returning();
      return comment;
    } catch (error) {
      console.error("Error in createComment:", error);
      throw error;
    }
  }

  async getPostComments(postId: number): Promise<Comment[]> {
    try {
      return await db
        .select()
        .from(comments)
        .where(and(
          eq(comments.postId, postId),
          sql`parent_id IS NULL` // Only get top-level comments
        ))
        .orderBy(comments.createdAt);
    } catch (error) {
      console.error("Error in getPostComments:", error);
      return [];
    }
  }

  async getComment(id: number): Promise<Comment | undefined> {
    try {
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, id));
      return comment;
    } catch (error) {
      console.error("Error in getComment:", error);
      return undefined;
    }
  }

  async deleteComment(id: number): Promise<void> {
    try {
      await db
        .delete(comments)
        .where(eq(comments.id, id));
    } catch (error) {
      console.error("Error in deleteComment:", error);
      throw error;
    }
  }

  async getCommentReplies(parentId: number): Promise<Comment[]> {
    try {
      return await db
        .select()
        .from(comments)
        .where(eq(comments.parentId, parentId))
        .orderBy(comments.createdAt);
    } catch (error) {
      console.error("Error in getCommentReplies:", error);
      return [];
    }
  }

  // Enhanced trending methods
  async getTrendingHashtags(limit = 10, timeframe: '24h' | '7d' | '30d' = '24h'): Promise<Trend[]> {
    try {
      // Simple implementation - return basic trends for now
      return await this.getTrends();
    } catch (error) {
      console.error("Error in getTrendingHashtags:", error);
      return [];
    }
  }

  async getTrendingTopics(language?: string, region?: string, limit = 10): Promise<Trend[]> {
    try {
      // For now, return basic trends. Can be enhanced with language/region filtering
      return await db
        .select()
        .from(trends)
        .orderBy(sql`${trends.postCount} DESC`)
        .limit(limit);
    } catch (error) {
      console.error("Error in getTrendingTopics:", error);
      return [];
    }
  }

  async searchTrends(query: string): Promise<Trend[]> {
    try {
      return await db
        .select()
        .from(trends)
        .where(sql`${trends.tag} ILIKE ${`%${query}%`}`)
        .orderBy(sql`${trends.postCount} DESC`)
        .limit(20);
    } catch (error) {
      console.error("Error in searchTrends:", error);
      return [];
    }
  }

  // Discovery and search methods
  async globalSearch(query: string, type?: 'posts' | 'users' | 'circuits', limit = 20): Promise<{
    posts: Post[];
    users: User[];
    circuits: Circuit[];
  }> {
    try {
      const results = {
        posts: [] as Post[],
        users: [] as User[],
        circuits: [] as Circuit[]
      };

      if (!type || type === 'posts') {
        results.posts = await db
          .select()
          .from(posts)
          .where(sql`${posts.content} ILIKE ${`%${query}%`}`)
          .orderBy(sql`${posts.createdAt} DESC`)
          .limit(limit);
      }

      if (!type || type === 'users') {
        results.users = await db
          .select()
          .from(users)
          .where(sql`${users.name} ILIKE ${`%${query}%`} OR ${users.username} ILIKE ${`%${query}%`}`)
          .orderBy(sql`${users.createdAt} DESC`)
          .limit(limit);
      }

      if (!type || type === 'circuits') {
        results.circuits = await db
          .select()
          .from(circuits)
          .where(sql`${circuits.name} ILIKE ${`%${query}%`} OR ${circuits.description} ILIKE ${`%${query}%`}`)
          .orderBy(sql`${circuits.createdAt} DESC`)
          .limit(limit);
      }

      return results;
    } catch (error) {
      console.error("Error in globalSearch:", error);
      return { posts: [], users: [], circuits: [] };
    }
  }

  async getRecommendedUsers(currentUserId: number, limit = 10): Promise<User[]> {
    try {
      // Simplified user recommendations - users not followed by current user
      const usersNotFollowed = await db
        .select()
        .from(users)
        .where(sql`${users.id} != ${currentUserId} AND ${users.id} NOT IN (
          SELECT following_id FROM follows WHERE follower_id = ${currentUserId}
        )`)
        .orderBy(sql`${users.createdAt} DESC`)
        .limit(limit);

      return usersNotFollowed;
    } catch (error) {
      console.error("Error in getRecommendedUsers:", error);
      // Fallback to basic suggested users
      return await this.getSuggestedUsers(currentUserId);
    }
  }

  async getPopularPosts(timeframe: '24h' | '7d' | '30d' = '24h', limit = 20): Promise<Post[]> {
    try {
      let timeThreshold = new Date();
      
      switch (timeframe) {
        case '24h':
          timeThreshold.setHours(timeThreshold.getHours() - 24);
          break;
        case '7d':
          timeThreshold.setDate(timeThreshold.getDate() - 7);
          break;
        case '30d':
          timeThreshold.setDate(timeThreshold.getDate() - 30);
          break;
      }

      // Simple popularity based on recent posts
      return await db
        .select()
        .from(posts)
        .where(sql`${posts.createdAt} >= ${timeThreshold.toISOString()}`)
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(limit);
    } catch (error) {
      console.error("Error in getPopularPosts:", error);
      return [];
    }
  }

  async getPostsByHashtag(hashtag: string, page = 1, limit = 20): Promise<Post[]> {
    try {
      const offset = (page - 1) * limit;
      // Remove # prefix if present
      const cleanHashtag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
      
      return await db
        .select()
        .from(posts)
        .where(sql`${posts.content} ILIKE ${`%#${cleanHashtag}%`}`)
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error in getPostsByHashtag:", error);
      return [];
    }
  }
}

// Storage instance

export const storage = new DatabaseStorage();