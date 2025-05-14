// User types
export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  bio?: string;
  profileImage: string;
  coverImage?: string;
  isVerified: boolean;
  following: number;
  followers: number;
  isFollowing?: boolean;
  unreadNotifications?: number;
  joined?: string;
}

// Post types
export interface Post {
  id: number;
  content: string;
  media?: string;
  language: string;
  createdAt: string;
  author: User;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isSaved: boolean;
  circuitId?: number;
  circuitName?: string;
}

// Community types
export interface Community {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  color?: string;
  isJoined: boolean;
}

// Circuit types
export interface Circuit {
  id: number;
  name: string;
  description: string;
  creatorId: number;
  creatorName: string;
  subscriberCount: number;
  color?: string;
  type: 'news' | 'photography' | 'tech' | 'other';
  isSubscribed: boolean;
}

// Trend types
export interface Trend {
  id: number;
  tag: string;
  category: string;
  postCount: number;
}

// Comment types
export interface Comment {
  id: number;
  content: string;
  createdAt: string;
  author: User;
  likeCount: number;
  isLiked: boolean;
}

// Notification types
export interface Notification {
  id: number;
  type: 'follow' | 'like' | 'comment' | 'repost' | 'mention';
  isRead: boolean;
  createdAt: string;
  actor: User;
  postId?: number;
  postContent?: string;
}
