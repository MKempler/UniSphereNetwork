import {
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
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  getFollowerCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  addFollow(followerId: number, followingId: number): Promise<Follow>;
  removeFollow(followerId: number, followingId: number): Promise<void>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private follows: Map<number, Follow>;
  private postInteractions: Map<number, PostInteraction>;
  private comments: Map<number, Comment>;
  private circuits: Map<number, Circuit>;
  private circuitSubscriptions: Map<number, CircuitSubscription>;
  private communities: Map<number, Community>;
  private communityMembers: Map<number, CommunityMember>;
  private trends: Map<number, Trend>;
  private notifications: Map<number, Notification>;

  private userIdCounter: number;
  private postIdCounter: number;
  private followIdCounter: number;
  private interactionIdCounter: number;
  private commentIdCounter: number;
  private circuitIdCounter: number;
  private subscriptionIdCounter: number;
  private communityIdCounter: number;
  private memberIdCounter: number;
  private trendIdCounter: number;
  private notificationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.follows = new Map();
    this.postInteractions = new Map();
    this.comments = new Map();
    this.circuits = new Map();
    this.circuitSubscriptions = new Map();
    this.communities = new Map();
    this.communityMembers = new Map();
    this.trends = new Map();
    this.notifications = new Map();

    this.userIdCounter = 1;
    this.postIdCounter = 1;
    this.followIdCounter = 1;
    this.interactionIdCounter = 1;
    this.commentIdCounter = 1;
    this.circuitIdCounter = 1;
    this.subscriptionIdCounter = 1;
    this.communityIdCounter = 1;
    this.memberIdCounter = 1;
    this.trendIdCounter = 1;
    this.notificationIdCounter = 1;

    // Initialize with sample data for demo purposes
    this.initSampleData();
  }

  // Initialize sample data
  private async initSampleData() {
    // Create a few sample users
    const emma = await this.createUser({
      username: "emma",
      password: "password123",
      name: "Emma Wilson",
      email: "emma@example.com",
      bio: "Digital creator | Photographer | Travel enthusiast",
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&h=256",
      language: "en"
    });

    const david = await this.createUser({
      username: "david",
      password: "password123",
      name: "David Chen",
      email: "david@example.com",
      bio: "Tech entrepreneur & investor",
      profileImage: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&h=256",
      language: "en"
    });

    const maria = await this.createUser({
      username: "maria",
      password: "password123",
      name: "María Rodríguez",
      email: "maria@example.com",
      bio: "Writer and translator | Barcelona",
      profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&h=256",
      language: "es"
    });

    const kenji = await this.createUser({
      username: "kenji",
      password: "password123",
      name: "Kenji Tanaka",
      email: "kenji@example.com",
      bio: "Photographer based in Kyoto, Japan",
      profileImage: "https://images.unsplash.com/photo-1605379399642-870262d3d051?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=256&h=256",
      language: "ja"
    });

    // Set some users as verified
    this.users.set(david.id, { ...david, isVerified: true });
    this.users.set(kenji.id, { ...kenji, isVerified: true });

    // Create follow relationships
    await this.addFollow(emma.id, david.id);
    await this.addFollow(emma.id, maria.id);
    await this.addFollow(maria.id, emma.id);
    await this.addFollow(david.id, emma.id);
    await this.addFollow(kenji.id, david.id);

    // Create communities
    const globalCommons = await this.createCommunity({
      name: "Global Commons",
      description: "A community for global discussions and news",
      color: "secondary"
    });

    const northAmerica = await this.createCommunity({
      name: "North America",
      description: "Regional community for North American users",
      color: "primary"
    });

    const photographersCollective = await this.createCommunity({
      name: "Photographers Collective",
      description: "For passionate photographers around the world",
      color: "accent"
    });

    // Add users to communities
    await this.joinCommunity(emma.id, globalCommons.id);
    await this.joinCommunity(emma.id, northAmerica.id);
    await this.joinCommunity(david.id, globalCommons.id);
    await this.joinCommunity(maria.id, globalCommons.id);
    await this.joinCommunity(kenji.id, photographersCollective.id);

    // Create circuits
    const globalNews = await this.createCircuit({
      name: "Global News",
      description: "Top news from around the world",
      creatorId: david.id,
      color: "primary",
      type: "news"
    });

    const photography = await this.createCircuit({
      name: "Photography",
      description: "Amazing shots from photographers worldwide",
      creatorId: kenji.id,
      color: "secondary",
      type: "photography"
    });

    const techTrends = await this.createCircuit({
      name: "Tech Trends",
      description: "Latest in technology and innovation",
      creatorId: david.id,
      color: "accent",
      type: "tech"
    });

    // Circuit subscriptions
    await this.subscribeToCircuit(emma.id, globalNews.id);
    await this.subscribeToCircuit(emma.id, photography.id);
    await this.subscribeToCircuit(maria.id, globalNews.id);
    await this.subscribeToCircuit(kenji.id, photography.id);
    await this.subscribeToCircuit(david.id, techTrends.id);

    // Create posts
    const davidPost = await this.createPost({
      content: "Excited to announce that our company is joining the UniSphere community! Looking forward to connecting with everyone in this innovative decentralized network. #DecentralizedFuture #UniSphere",
      media: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=675",
      language: "en",
      userId: david.id
    });

    const mariaPost = await this.createPost({
      content: "¡Acabo de unirme a UniSphere y me encanta! La traducción automática hace que sea muy fácil comunicarse con personas de todo el mundo. #ComunidadGlobal",
      language: "es",
      userId: maria.id
    });

    const kenjiPost = await this.createPost({
      content: "京都の竹林で夕暮れ時に撮影した素晴らしい瞬間。光が竹林を通して作り出す魔法のような雰囲気。 #写真 #自然 #京都",
      media: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=675",
      language: "ja",
      userId: kenji.id,
      circuitId: photography.id
    });

    // Post interactions
    await this.addInteraction(davidPost.id, emma.id, "like");
    await this.addInteraction(davidPost.id, maria.id, "like");
    await this.addInteraction(davidPost.id, kenji.id, "like");
    await this.addInteraction(mariaPost.id, emma.id, "like");
    await this.addInteraction(mariaPost.id, david.id, "like");
    await this.addInteraction(kenjiPost.id, emma.id, "like");
    await this.addInteraction(kenjiPost.id, david.id, "like");
    await this.addInteraction(kenjiPost.id, maria.id, "like");

    await this.addInteraction(davidPost.id, maria.id, "repost");
    await this.addInteraction(kenjiPost.id, emma.id, "repost");

    await this.addInteraction(kenjiPost.id, emma.id, "save");

    // Create trends
    await this.updateTrend("#DecentralizedFuture", "Technology");
    await this.updateTrend("#UniSphere", "Technology");
    await this.updateTrend("#GlobalCommunity", "Global");
    await this.updateTrend("#NaturePhotography", "Photography");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = {
      ...insertUser,
      id,
      isVerified: false,
      unreadNotifications: 0,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getFollowerCount(userId: number): Promise<number> {
    return Array.from(this.follows.values()).filter(
      (follow) => follow.followingId === userId
    ).length;
  }

  async getFollowingCount(userId: number): Promise<number> {
    return Array.from(this.follows.values()).filter(
      (follow) => follow.followerId === userId
    ).length;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      (follow) => follow.followerId === followerId && follow.followingId === followingId
    );
  }

  async addFollow(followerId: number, followingId: number): Promise<Follow> {
    const id = this.followIdCounter++;
    const follow: Follow = {
      id,
      followerId,
      followingId,
      createdAt: new Date()
    };
    this.follows.set(id, follow);
    return follow;
  }

  async removeFollow(followerId: number, followingId: number): Promise<void> {
    const follow = Array.from(this.follows.values()).find(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    
    if (follow) {
      this.follows.delete(follow.id);
    }
  }

  async getSuggestedUsers(currentUserId?: number): Promise<User[]> {
    let users = Array.from(this.users.values());
    
    if (currentUserId) {
      // Exclude current user and followed users
      const followedUserIds = (await this.getFollowedUserIds(currentUserId)).concat(currentUserId);
      users = users.filter(user => !followedUserIds.includes(user.id));
    }
    
    // For a real implementation, we would have smarter algorithms
    // For now, prioritize verified users and limit to 3
    return users
      .sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0))
      .slice(0, 3);
  }

  async getFollowedUserIds(userId: number): Promise<number[]> {
    return Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);
  }

  // Post methods
  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getAllPosts(page = 1, limit = 10): Promise<Post[]> {
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return Array.from(this.posts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(start, end);
  }

  async getFollowingPosts(userId: number, page = 1, limit = 10): Promise<Post[]> {
    const followedUserIds = await this.getFollowedUserIds(userId);
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return Array.from(this.posts.values())
      .filter(post => followedUserIds.includes(post.userId) || post.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(start, end);
  }

  async getCircuitPosts(userId: number, page = 1, limit = 10): Promise<Post[]> {
    const subscribedCircuitIds = await this.getSubscribedCircuitIds(userId);
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return Array.from(this.posts.values())
      .filter(post => post.circuitId !== undefined && subscribedCircuitIds.includes(post.circuitId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(start, end);
  }

  async getUserPosts(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postIdCounter++;
    const post: Post = {
      ...insertPost,
      id,
      createdAt: new Date()
    };
    this.posts.set(id, post);
    return post;
  }

  async deletePost(id: number): Promise<void> {
    this.posts.delete(id);
    
    // Clean up interactions
    for (const [interactionId, interaction] of this.postInteractions.entries()) {
      if (interaction.postId === id) {
        this.postInteractions.delete(interactionId);
      }
    }
  }

  async getPostCount(feedType: string, userId?: number): Promise<number> {
    if (feedType === "following" && userId) {
      const followedUserIds = await this.getFollowedUserIds(userId);
      return Array.from(this.posts.values())
        .filter(post => followedUserIds.includes(post.userId) || post.userId === userId)
        .length;
    } else if (feedType === "circuits" && userId) {
      const subscribedCircuitIds = await this.getSubscribedCircuitIds(userId);
      return Array.from(this.posts.values())
        .filter(post => post.circuitId !== undefined && subscribedCircuitIds.includes(post.circuitId))
        .length;
    } else {
      return this.posts.size;
    }
  }

  // Post interactions
  async addInteraction(postId: number, userId: number, type: string): Promise<PostInteraction> {
    // First, check if the interaction already exists
    const existingInteraction = Array.from(this.postInteractions.values()).find(
      (interaction) => interaction.postId === postId && interaction.userId === userId && interaction.type === type
    );
    
    if (existingInteraction) {
      return existingInteraction;
    }
    
    const id = this.interactionIdCounter++;
    const interaction: PostInteraction = {
      id,
      postId,
      userId,
      type,
      createdAt: new Date()
    };
    this.postInteractions.set(id, interaction);
    return interaction;
  }

  async removeInteraction(postId: number, userId: number, type: string): Promise<void> {
    const interaction = Array.from(this.postInteractions.values()).find(
      (i) => i.postId === postId && i.userId === userId && i.type === type
    );
    
    if (interaction) {
      this.postInteractions.delete(interaction.id);
    }
  }

  async hasInteraction(postId: number, userId: number, type: string): Promise<boolean> {
    return Array.from(this.postInteractions.values()).some(
      (interaction) => interaction.postId === postId && interaction.userId === userId && interaction.type === type
    );
  }

  async getPostInteractionCount(postId: number, type: string): Promise<number> {
    return Array.from(this.postInteractions.values()).filter(
      (interaction) => interaction.postId === postId && interaction.type === type
    ).length;
  }

  // Circuit methods
  async getCircuit(id: number): Promise<Circuit | undefined> {
    return this.circuits.get(id);
  }

  async getPopularCircuits(): Promise<Circuit[]> {
    // In a real implementation, we would sort by activity or subscriber count
    return Array.from(this.circuits.values()).slice(0, 3);
  }

  async createCircuit(insertCircuit: InsertCircuit): Promise<Circuit> {
    const id = this.circuitIdCounter++;
    const circuit: Circuit = {
      ...insertCircuit,
      id,
      createdAt: new Date()
    };
    this.circuits.set(id, circuit);
    return circuit;
  }

  async subscribeToCircuit(userId: number, circuitId: number): Promise<CircuitSubscription> {
    const id = this.subscriptionIdCounter++;
    const subscription: CircuitSubscription = {
      id,
      userId,
      circuitId,
      createdAt: new Date()
    };
    this.circuitSubscriptions.set(id, subscription);
    return subscription;
  }

  async unsubscribeFromCircuit(userId: number, circuitId: number): Promise<void> {
    const subscription = Array.from(this.circuitSubscriptions.values()).find(
      (s) => s.userId === userId && s.circuitId === circuitId
    );
    
    if (subscription) {
      this.circuitSubscriptions.delete(subscription.id);
    }
  }

  async isSubscribedToCircuit(userId: number, circuitId: number): Promise<boolean> {
    return Array.from(this.circuitSubscriptions.values()).some(
      (subscription) => subscription.userId === userId && subscription.circuitId === circuitId
    );
  }

  async getCircuitSubscriberCount(circuitId: number): Promise<number> {
    return Array.from(this.circuitSubscriptions.values()).filter(
      (subscription) => subscription.circuitId === circuitId
    ).length;
  }

  async getSubscribedCircuitIds(userId: number): Promise<number[]> {
    return Array.from(this.circuitSubscriptions.values())
      .filter(subscription => subscription.userId === userId)
      .map(subscription => subscription.circuitId);
  }

  // Community methods
  async getCommunity(id: number): Promise<Community | undefined> {
    return this.communities.get(id);
  }

  async getUserCommunities(userId: number): Promise<Community[]> {
    const memberCommunityIds = Array.from(this.communityMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.communityId);
    
    return Array.from(this.communities.values())
      .filter(community => memberCommunityIds.includes(community.id));
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const id = this.communityIdCounter++;
    const community: Community = {
      ...insertCommunity,
      id,
      createdAt: new Date()
    };
    this.communities.set(id, community);
    return community;
  }

  async joinCommunity(userId: number, communityId: number): Promise<CommunityMember> {
    const id = this.memberIdCounter++;
    const member: CommunityMember = {
      id,
      userId,
      communityId,
      createdAt: new Date()
    };
    this.communityMembers.set(id, member);
    return member;
  }

  async leaveCommunity(userId: number, communityId: number): Promise<void> {
    const member = Array.from(this.communityMembers.values()).find(
      (m) => m.userId === userId && m.communityId === communityId
    );
    
    if (member) {
      this.communityMembers.delete(member.id);
    }
  }

  async isJoinedCommunity(userId: number, communityId: number): Promise<boolean> {
    return Array.from(this.communityMembers.values()).some(
      (member) => member.userId === userId && member.communityId === communityId
    );
  }

  async getCommunityMemberCount(communityId: number): Promise<number> {
    return Array.from(this.communityMembers.values()).filter(
      (member) => member.communityId === communityId
    ).length;
  }

  // Trend methods
  async getTrends(): Promise<Trend[]> {
    return Array.from(this.trends.values())
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 3);
  }

  async updateTrend(tag: string, category: string): Promise<Trend> {
    const existingTrend = Array.from(this.trends.values()).find(
      (trend) => trend.tag.toLowerCase() === tag.toLowerCase()
    );
    
    if (existingTrend) {
      const updatedTrend = {
        ...existingTrend,
        postCount: existingTrend.postCount + 1
      };
      this.trends.set(existingTrend.id, updatedTrend);
      return updatedTrend;
    } else {
      const id = this.trendIdCounter++;
      const trend: Trend = {
        id,
        tag,
        category,
        postCount: 1,
        createdAt: new Date()
      };
      this.trends.set(id, trend);
      return trend;
    }
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: false,
      createdAt: new Date()
    };
    this.notifications.set(id, notification);
    
    // Update unread count for the recipient
    const user = await this.getUser(insertNotification.recipientId);
    if (user) {
      await this.updateUser(user.id, {
        unreadNotifications: (user.unreadNotifications || 0) + 1
      });
    }
    
    return notification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.recipientId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(id: number): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification && !notification.isRead) {
      this.notifications.set(id, { ...notification, isRead: true });
      
      // Update unread count for the recipient
      const user = await this.getUser(notification.recipientId);
      if (user && user.unreadNotifications > 0) {
        await this.updateUser(user.id, {
          unreadNotifications: user.unreadNotifications - 1
        });
      }
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    const userNotifications = await this.getUserNotifications(userId);
    const unreadCount = userNotifications.filter(n => !n.isRead).length;
    
    if (unreadCount > 0) {
      // Mark all as read
      for (const notification of userNotifications) {
        if (!notification.isRead) {
          this.notifications.set(notification.id, { ...notification, isRead: true });
        }
      }
      
      // Reset unread count
      const user = await this.getUser(userId);
      if (user) {
        await this.updateUser(user.id, { unreadNotifications: 0 });
      }
    }
  }
}

// Create a translation helper module
export const generateTranslation = async (text: string, sourceLanguage: string, targetLanguage: string): Promise<string> => {
  // For MVP, we'll just simulate translation
  // In a real app, this would connect to Google Translate API or similar
  
  // Sample translations for demo
  const translations: Record<string, Record<string, string>> = {
    "es": {
      "en": "I just joined UniSphere and I love it! Automatic translation makes it very easy to communicate with people from all over the world. #GlobalCommunity"
    },
    "ja": {
      "en": "Captured this incredible moment during sunset in Kyoto yesterday. The way the light filters through the bamboo forest creates a magical atmosphere. #Photography #Nature #Kyoto"
    }
  };
  
  // If we have a predefined translation, use it
  if (translations[sourceLanguage]?.[targetLanguage]) {
    return translations[sourceLanguage][targetLanguage];
  }
  
  // Otherwise, just return the original text (simulating no translation available)
  return text;
};

export const detectLanguage = async (text: string): Promise<string> => {
  // For MVP, use simple detection based on common words
  // In a real app, would use a language detection API
  
  // Very simplistic detection for demo purposes
  if (/¡|¿|hola|gracias|buenos días|cómo estás/.test(text.toLowerCase())) {
    return "es";
  } else if (/こんにちは|ありがとう|私は|です|ます|京都|竹林/.test(text)) {
    return "ja";
  } else if (/bonjour|merci|comment|ça va|français/.test(text.toLowerCase())) {
    return "fr";
  }
  
  // Default to English
  return "en";
};

export const storage = new MemStorage();
