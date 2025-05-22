export interface CircuitCreator {
  id: number;
  name: string | null;
  username: string;
}

export interface CircuitListItem {
  id: number;
  name: string;
  description: string | null;
  creatorId: number;
  creatorName?: string; 
  subscriberCount: number;
  isSubscribed: boolean;
  curationType?: string;
}

export interface CircuitPostAuthor {
  id: number;
  username: string;
  name: string | null;
  profileImage: string | null;
  isVerified: boolean;
}

export interface CircuitPost {
  id: number;
  content: string;
  media: string | null;
  language: string;
  createdAt: string; 
  author: CircuitPostAuthor;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isSaved: boolean;
  circuitId: number | null;
  circuitName: string | null;
}

export interface CircuitDetail extends CircuitListItem {
  posts: CircuitPost[];
  totalPages: number;
  currentPage: number;
} 