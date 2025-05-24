import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio"),
  profileImage: text("profile_image").notNull().default("/default-profile.png"),
  coverImage: text("cover_image"),
  isVerified: boolean("is_verified").notNull().default(false),
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  unreadNotifications: integer("unread_notifications").notNull().default(0),
  did: text("did").unique(), // Decentralized Identifier (DID)
  publicKey: text("public_key"), // Public key for signature verification
  homeNode: text("home_node") // URL or DID of the user's home node
});

// Post model
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  media: text("media"),
  language: text("language").notNull().default("en"),
  userId: integer("user_id").notNull(),
  circuitId: integer("circuit_id"),
  quotedPostId: integer("quoted_post_id"), // For quote posts - references another post
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// User Follows
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id"), // nullable for remote follows
  remoteDid: text("remote_did"), // nullable, set for remote follows
  remoteNode: text("remote_node"), // nullable, set for remote follows
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Post Interactions (likes, reposts, saves)
export const postInteractions = pgTable("post_interactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "like", "repost", "save"
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Comments
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  language: text("language").notNull().default("en"),
  parentId: integer("parent_id"), // For threaded comments (replies)
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // URL-friendly version
  description: text('description'),
  icon: varchar('icon', { length: 50 }).default('HelpCircle'), // Lucide icon name
  color: varchar('color', { length: 20 }).default('#3B82F6'), // Hex color
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Circuits (curated feeds)
export const circuits = pgTable('circuits', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  creatorId: integer('creator_id').notNull().references(() => users.id),
  categoryId: integer('category_id').references(() => categories.id), // New category reference
  isPublic: boolean('is_public').default(true).notNull(),
  curationType: varchar('curation_type', { length: 50 }).default('manual').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Circuit Subscriptions
export const circuit_subscriptions = pgTable('circuit_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  circuitId: integer('circuit_id').notNull().references(() => circuits.id),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCircuitUnique: unique().on(table.userId, table.circuitId),
}));

export const circuit_posts = pgTable('circuit_posts', {
  id: serial('id').primaryKey(),
  circuitId: integer('circuit_id').notNull().references(() => circuits.id),
  postId: integer('post_id').notNull().references(() => posts.id),
  addedByUserId: integer('added_by_user_id').notNull().references(() => users.id),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  circuitPostUnique: unique().on(table.circuitId, table.postId),
}));

// Communities (server nodes)
export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Community Members
export const communityMembers = pgTable("community_members", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Trends
export const trends = pgTable("trends", {
  id: serial("id").primaryKey(),
  tag: text("tag").notNull(),
  category: text("category").notNull(),
  postCount: integer("post_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "follow", "like", "comment", "repost", "mention"
  isRead: boolean("is_read").notNull().default(false),
  actorId: integer("actor_id").notNull(), // User who triggered the notification
  recipientId: integer("recipient_id").notNull(), // User who receives the notification
  postId: integer("post_id"), // Optional, for post-related notifications
  data: json("data"), // Additional data as needed
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Relayed Posts
export const relayed_posts = pgTable('relayed_posts', {
  id: serial('id').primaryKey(),
  originalPostId: varchar('original_post_id', { length: 255 }),
  authorDid: text('author_did').notNull(),
  content: text('content').notNull(),
  media: text('media'),
  language: varchar('language', { length: 32 }),
  originalCreatedAt: timestamp('original_created_at', { withTimezone: true }).notNull(),
  relayedAt: timestamp('relayed_at', { withTimezone: true }).notNull(),
  sourceRelayUrl: varchar('source_relay_url', { length: 255 }).notNull(),
});

// Conversations
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 20 }).notNull().default('direct'), // 'direct' or 'group'
  title: text('title'), // For group conversations
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 20 }).notNull().default('text'), // 'text', 'image', 'file', 'system'
  replyToMessageId: integer('reply_to_message_id'),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  isDeleted: boolean('is_deleted').notNull().default(false)
});

// Conversation Participants
export const conversationParticipants = pgTable('conversation_participants', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }).defaultNow(),
  isActive: boolean('is_active').notNull().default(true), // For leaving/rejoining groups
  isAdmin: boolean('is_admin').notNull().default(false) // Admin role for group management
}, (table) => ({
  conversationUserUnique: unique().on(table.conversationId, table.userId),
}));

// Message Reactions
export const messageReactions = pgTable('message_reactions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji: varchar('emoji', { length: 10 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  messageUserEmojiUnique: unique().on(table.messageId, table.userId, table.emoji),
}));

// Conversation Settings
export const conversationSettings = pgTable('conversation_settings', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  allowMemberAdd: boolean('allow_member_add').notNull().default(true),
  allowMemberRemove: boolean('allow_member_remove').notNull().default(false),
  allowNameChange: boolean('allow_name_change').notNull().default(true),
  muteNotifications: boolean('mute_notifications').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Create schemas for insertable data
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  bio: true,
  profileImage: true,
  coverImage: true,
  language: true,
  did: true,
  publicKey: true,
  homeNode: true
});

export const insertPostSchema = createInsertSchema(posts).pick({
  content: true,
  media: true,
  language: true,
  userId: true,
  circuitId: true,
  quotedPostId: true
});

export const insertFollowSchema = createInsertSchema(follows).pick({
  followerId: true,
  followingId: true,
  remoteDid: true,
  remoteNode: true
});

export const insertPostInteractionSchema = createInsertSchema(postInteractions).pick({
  postId: true,
  userId: true,
  type: true
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  postId: true,
  userId: true,
  parentId: true,
  language: true
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  slug: true,
  description: true,
  icon: true,
  color: true,
  sortOrder: true,
  isActive: true
});

export const insertCircuitSchema = createInsertSchema(circuits).pick({
  name: true,
  description: true,
  creatorId: true,
  categoryId: true,
  isPublic: true
});

export const insertCircuitSubscriptionSchema = createInsertSchema(circuit_subscriptions).pick({
  circuitId: true,
  userId: true
});

export const insertCommunitySchema = createInsertSchema(communities).pick({
  name: true,
  description: true,
  color: true
});

export const insertCommunityMemberSchema = createInsertSchema(communityMembers).pick({
  communityId: true,
  userId: true
});

export const insertTrendSchema = createInsertSchema(trends).pick({
  tag: true,
  category: true,
  postCount: true
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  type: true,
  actorId: true,
  recipientId: true,
  postId: true,
  data: true
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  type: true,
  title: true,
  createdBy: true
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  content: true,
  messageType: true,
  replyToMessageId: true,
  fileUrl: true,
  fileName: true,
  fileType: true,
  fileSize: true
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).pick({
  conversationId: true,
  userId: true,
  lastReadAt: true,
  isActive: true,
  isAdmin: true
});

export const insertMessageReactionSchema = createInsertSchema(messageReactions).pick({
  messageId: true,
  userId: true,
  emoji: true
});

export const insertConversationSettingsSchema = createInsertSchema(conversationSettings).pick({
  conversationId: true,
  allowMemberAdd: true,
  allowMemberRemove: true,
  allowNameChange: true,
  muteNotifications: true
});

// Define types for insert operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type InsertPostInteraction = z.infer<typeof insertPostInteractionSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertCircuit = z.infer<typeof insertCircuitSchema>;
export type InsertCircuitSubscription = z.infer<typeof insertCircuitSubscriptionSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type InsertConversationSettings = z.infer<typeof insertConversationSettingsSchema>;

// Define types for select operations
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type PostInteraction = typeof postInteractions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Circuit = typeof circuits.$inferSelect;
export type CircuitSubscription = typeof circuit_subscriptions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type Trend = typeof trends.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type ConversationSettings = typeof conversationSettings.$inferSelect;

// Custom schemas for client-side operations
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export type LoginData = z.infer<typeof loginSchema>;
