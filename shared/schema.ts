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
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Circuits (curated feeds)
export const circuits = pgTable('circuits', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  creatorId: integer('creator_id').notNull().references(() => users.id),
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
  authorDid: varchar('author_did', { length: 255 }).notNull(),
  content: text('content').notNull(),
  media: text('media'),
  language: varchar('language', { length: 32 }),
  originalCreatedAt: timestamp('original_created_at', { withTimezone: true }).notNull(),
  relayedAt: timestamp('relayed_at', { withTimezone: true }).notNull(),
  sourceRelayUrl: varchar('source_relay_url', { length: 255 }).notNull(),
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
  circuitId: true
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
  userId: true
});

export const insertCircuitSchema = createInsertSchema(circuits).pick({
  name: true,
  description: true,
  creatorId: true
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

// Define types for insert operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type InsertPostInteraction = z.infer<typeof insertPostInteractionSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertCircuit = z.infer<typeof insertCircuitSchema>;
export type InsertCircuitSubscription = z.infer<typeof insertCircuitSubscriptionSchema>;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Define types for select operations
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type PostInteraction = typeof postInteractions.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Circuit = typeof circuits.$inferSelect;
export type CircuitSubscription = typeof circuit_subscriptions.$inferSelect;
export type Community = typeof communities.$inferSelect;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type Trend = typeof trends.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

// Custom schemas for client-side operations
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export type LoginData = z.infer<typeof loginSchema>;
