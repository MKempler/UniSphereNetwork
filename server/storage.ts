import type {
  User, InsertUser,
  Post, InsertPost,
  Follow, InsertFollow,
  PostInteraction, InsertPostInteraction,
  Comment, InsertComment,
  Circuit, InsertCircuit,
  CircuitSubscription, InsertCircuitSubscription,
  Community, InsertCommunity,
  CommunityMember, InsertCommunityMember,
  Trend, InsertTrend,
  Notification, InsertNotification
} from "../shared/schema.ts";
import {
  users, posts, follows, postInteractions, comments,
  circuits, circuit_subscriptions, communities,
  communityMembers, trends, notifications
} from "../shared/schema.ts";
import { db } from "./db.ts";
import { eq, and, sql } from "drizzle-orm";
import { generateTranslation, detectLanguage } from './translation.ts';

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

  // Circuit operations
  getCircuit(id: number): Promise<Circuit | undefined>;
  getPopularCircuits(): Promise<Circuit[]>;
  createCircuit(circuit: InsertCircuit): Promise<Circuit>;
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

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  // Remote follow operations
  getFollow(followerId: number, remoteDid: string): Promise<Follow | undefined>;
  addFollow(followerId: number, remoteDid: string, remoteNode?: string): Promise<Follow>;
  removeFollow(followerId: number, remoteDid: string): Promise<void>;

  // New method
  getPostsByUserIds(userIds: number[], page?: number, limit?: number): Promise<Post[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Database connection is setup in db.ts and imported where needed
  }

  // User methods implementation with database
  async getUser(id: number): Promise<User | undefined> {
    try {
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
      if (!currentUserId) {
        return await db.select().from(users).limit(5);
      }
        const followingIds = await this.getFollowedUserIds(currentUserId);
          followingIds.push(currentUserId);
      if (followingIds.length > 0) {
        // Use a fully raw SQL query to avoid drizzle-orm type mismatches
        const idsList = followingIds.map(id => Number(id)).filter(Boolean).join(',');
        const sqlStr = `SELECT * FROM users WHERE id NOT IN (${idsList}) LIMIT 5`;
        // @ts-ignore
        const result = await db.execute(sqlStr);
        return result;
        } else {
        return await db.select().from(users).where(sql`${users.id} != ${currentUserId}`).limit(5);
        }
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
        .where(sql`${posts.userId} IN (${followingIds.join(',')})`)
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
        .where(sql`${posts.circuitId} IN (${circuitIds.join(',')})`)
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
            .where(sql`${posts.userId} IN (${followingIds.join(',')})`);
          break;
        case 'circuit':
          if (!userId) return 0;
          const circuitIds = await this.getSubscribedCircuitIds(userId);
          if (circuitIds.length === 0) return 0;
          query = db
            .select({ count: sql`count(*)` })
            .from(posts)
            .where(sql`${posts.circuitId} IN (${circuitIds.join(',')})`);
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
      const [circuit] = await db.select().from(circuits).where(eq(circuits.id, id));
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
      const [circuit] = await db
        .insert(circuits)
        .values({
          ...insertCircuit,
          createdAt: new Date()
        })
        .returning();
      return circuit;
    } catch (error) {
      console.error("Error in createCircuit:", error);
      throw error;
    }
  }
  
  async subscribeToCircuit(userId: number, circuitId: number): Promise<CircuitSubscription> {
    try {
      const [subscription] = await db
        .insert(circuit_subscriptions)
        .values({
          userId,
          circuitId,
          subscribedAt: new Date()
        })
        .returning();
      return subscription;
    } catch (error) {
      console.error("Error in subscribeToCircuit:", error);
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
      const result = await db
        .select({ count: sql`count(*)` })
        .from(circuit_subscriptions)
        .where(eq(circuit_subscriptions.circuitId, circuitId));
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error in getCircuitSubscriberCount:", error);
      return 0;
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
        .where(sql`${posts.userId} IN (${userIds.join(',')})`)
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error("Error in getPostsByUserIds:", error);
      return [];
    }
  }
}

// Storage instance

export const storage = new DatabaseStorage();