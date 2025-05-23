import { useState } from "react";
import { Link } from "wouter";
import { useTranslation as useI18nTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getLanguageTag } from "@/lib/translation";
import { Post, Comment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import TranslatedText from "@/components/common/TranslatedText";
import { LuGlobe } from "react-icons/lu";
import { useAuth } from "@/hooks/simpleAuth";
import { Input } from "@/components/ui/input";
import QuotePostDialog from "@/components/post/QuotePostDialog";

// Add UI components for menu and modal
import { Menu, MenuButton, MenuList, MenuItem } from "@/components/ui/menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PostItemProps {
  post: Post;
  isCircuitPost?: boolean;
  circuitName?: string;
  hideInlineComments?: boolean; // Hide inline comments (for post detail page)
}

// Component to display quoted posts
const QuotedPostCard: React.FC<{ quotedPost: Post }> = ({ quotedPost }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days}d`;
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 mt-3 bg-gray-50 hover:bg-gray-100 transition-colors">
      <Link href={`/post/${quotedPost.id}`}>
        <a className="block">
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={quotedPost.author.profileImage || '/default-profile.png'} 
                alt={quotedPost.author.name} 
              />
              <AvatarFallback className="text-xs">
                {quotedPost.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <p className="font-semibold text-sm text-gray-900">{quotedPost.author.name}</p>
                <p className="text-sm text-gray-500">@{quotedPost.author.username}</p>
                <span className="text-gray-400">•</span>
                <p className="text-sm text-gray-500">{formatDate(quotedPost.createdAt)}</p>
                {quotedPost.language && (
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-primary/15 text-primary flex items-center gap-1.5 border border-primary/20">
                    <LuGlobe className="w-3 h-3" />
                    {getLanguageTag(quotedPost.language)}
                  </span>
                )}
              </div>
              
              <TranslatedText
                text={quotedPost.content}
                as="p"
                className="text-gray-800 text-sm mb-2"
                showControls={false}
                originalLanguage={quotedPost.language}
              />
              
              {quotedPost.media && (
                <img 
                  src={quotedPost.media} 
                  alt="Quoted post media" 
                  className="max-w-full h-auto rounded-lg border mt-2"
                />
              )}
              
              {/* Interaction counts for quoted post */}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{quotedPost.commentCount} comments</span>
                <span>{quotedPost.repostCount} reposts</span>
                <span>{quotedPost.likeCount} likes</span>
              </div>
            </div>
          </div>
        </a>
      </Link>
    </div>
  );
};

export default function PostItem({ post, isCircuitPost, circuitName, hideInlineComments = false }: PostItemProps) {
  if (!post.author) {
    return null;
  }

  // Check if this is a repost (either simple repost with empty content, or quote repost with quoted post)
  const isSimpleRepost = post.content === "" && post.quotedPost;
  const isQuoteRepost = post.content !== "" && post.quotedPost;
  const isRepost = isSimpleRepost || isQuoteRepost;

  const { t } = useI18nTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);

  // Fetch first few comments for inline display (only if not hiding them)
  const { data: comments = [] } = useQuery({
    queryKey: ["post-comments-preview", post.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${post.id}/comments`);
      console.log('PostItem: Comments data received:', response);
      return (response as Comment[]).slice(0, 3); // Show only first 3 comments
    },
    enabled: post.commentCount > 0 && !hideInlineComments, // Only fetch if there are comments and not hiding them
  });

  const likePostMutation = useMutation({
    mutationFn: async () => {
      // For reposts, like the original post
      const targetPostId = isRepost && post.quotedPost ? post.quotedPost.id : post.id;
      return apiRequest("POST", `/api/posts/${targetPostId}/like`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to like post: ${error}`,
        variant: "destructive",
      });
    }
  });

  const repostMutation = useMutation({
    mutationFn: async () => {
      // For reposts, repost the original post
      const targetPostId = isRepost && post.quotedPost ? post.quotedPost.id : post.id;
      return apiRequest("POST", `/api/posts/${targetPostId}/repost`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to repost: ${error}`,
        variant: "destructive",
      });
    }
  });

  const savePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/save`, {});
    },
    onSuccess: () => {
      toast({
        title: "Post saved",
        description: "This post has been added to your saved items.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save post: ${error}`,
        variant: "destructive",
      });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Post deleted",
        description: "Your post has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete post: ${error}`,
        variant: "destructive",
      });
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      console.log('PostItem: Making API request for comment like:', commentId);
      const result = await apiRequest("POST", `/api/comments/${commentId}/like`, {});
      console.log('PostItem: API response:', result);
      return result;
    },
    onSuccess: (data, commentId) => {
      console.log('PostItem: Like mutation success for comment:', commentId, 'data:', data);
      // Invalidate both the comments preview and the main post data
      queryClient.invalidateQueries({ queryKey: ["post-comments-preview", post.id] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      console.error('PostItem: Like mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to like comment: ${error}`,
        variant: "destructive",
      });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/comments`, {
        content: commentText.trim()
      });
    },
    onSuccess: () => {
      setCommentText("");
      setIsCommenting(false);
      // Invalidate queries to refresh comments and post data
      queryClient.invalidateQueries({ queryKey: ["post-comments-preview", post.id] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add comment: ${error}`,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="bg-neutral-50 rounded-2xl shadow p-4 mb-4 hover:shadow-md hover:-translate-y-0.5 transition focus-within:ring-1 ring-primary-500">
      {/* Repost indicator */}
      {isRepost && (
        <div className="flex items-center mb-2 text-gray-500 text-sm">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          <span>{post.author.name} reposted</span>
        </div>
      )}

      {/* Circuit badge */}
      {(isCircuitPost || post.circuitId) && (
        <div className="flex items-center mb-2 text-sm text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M12 1v6m0 6v6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="m15.4 6.4 4.2-4.2M15.4 17.6l4.2 4.2M6.6 6.4 2.4 2.2M6.6 17.6l2.4 4.2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          {circuitName || post.circuitName}
        </div>
      )}
      
      {/* Post Header */}
      {/* Show header for all posts - for reposts this shows the reposter's info */}
      {(
        <div className="flex justify-between">
          <div className="flex">
            <Link href={`/profile/${post.author.username}`}>
              <a>
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={post.author.profileImage} 
                    alt={post.author.name} 
                  />
                  <AvatarFallback>
                    {post.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </a>
            </Link>
            <div className="ml-3">
              <div className="flex items-center mb-1 gap-1">
                <Link href={`/profile/${post.author.username}`}>
                  <a className="font-semibold text-neutral-dark hover:underline">
                    {post.author.name}
                  </a>
                </Link>
                {post.author.isVerified && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary ml-1">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.498 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-1" style={{ marginBottom: 4 }}>
                <p className="text-sm text-neutral-dark opacity-75">
                  @{post.author.username}
                </p>
                <span className="mx-1 text-neutral-dark opacity-50">•</span>
                <p className="text-sm text-neutral-dark opacity-75">
                  {post.createdAt}
                </p>
                {post.language && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-md font-medium bg-primary/15 text-primary flex items-center gap-1.5 border border-primary/20">
                    <LuGlobe className="w-3.5 h-3.5" />
                    {getLanguageTag(post.language)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Menu open={menuOpen} onOpenChange={setMenuOpen}>
            <MenuButton className="text-neutral-dark p-1 rounded-full hover:bg-neutral-light transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </MenuButton>
            <MenuList>
              {currentUser && currentUser.id === post.author.id && (
                <MenuItem onClick={() => { setMenuOpen(false); setConfirmOpen(true); }} className="text-red-600">
                  Delete post
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </div>
      )}
      
      {/* Post Content */}
      <div className="mb-4">
        {/* For simple reposts (no content, just reposting), show only the quoted card */}
        {isSimpleRepost ? (
          post.quotedPost ? (
            <QuotedPostCard quotedPost={post.quotedPost} />
          ) : (
            <div className="p-4 border border-red-200 rounded-xl bg-red-50">
              <p className="text-red-600 text-sm">Error: Repost data missing</p>
            </div>
          )
        ) : (
          /* Regular post content (including quote reposts) */
          <>
            <Link href={`/post/${post.id}`}>
              <a className="block group">
                <TranslatedText
                  text={post.content}
                  as="p"
                  className="text-neutral-dark mb-3 group-hover:text-neutral-900 transition leading-relaxed"
                  originalLanguage={post.language}
                />
                
                {post.media && (
                  <img 
                    src={post.media} 
                    alt="Post media" 
                    className="w-full h-auto rounded-xl object-cover group-hover:opacity-90 transition"
                  />
                )}
              </a>
            </Link>
            
            {/* Render quoted post if it exists (for quote posts with content) */}
            {post.quotedPost && (
              <QuotedPostCard quotedPost={post.quotedPost} />
            )}
          </>
        )}
      </div>
      
      {/* Feed divider above actions */}
      <div className="border-b border-neutral-200 mt-3 mb-1" />
      
      {/* Post Interactions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-200">
        <div className="flex items-center space-x-6">
          <button 
            className={`flex items-center transition-colors ${
              (isRepost && post.quotedPost ? post.quotedPost.isLiked : post.isLiked)
                ? 'text-red-500 hover:text-red-600' 
                : 'text-neutral-400 hover:text-red-500'
            }`}
            onClick={() => likePostMutation.mutate()}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-1.5" 
              fill={(isRepost && post.quotedPost ? post.quotedPost.isLiked : post.isLiked) ? "currentColor" : "none"} 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              strokeWidth="2"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
              />
            </svg>
            <span className="text-sm">{isRepost && post.quotedPost ? post.quotedPost.likeCount : post.likeCount}</span>
          </button>

          <Link href={`/post/${isRepost && post.quotedPost ? post.quotedPost.id : post.id}`}>
            <a className="flex items-center text-neutral-400 hover:text-blue-500 transition-colors mr-6">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-1.5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth="2"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                />
              </svg>
              <span className="text-sm">{isRepost && post.quotedPost ? post.quotedPost.commentCount : post.commentCount}</span>
            </a>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className={`flex items-center transition-colors mr-6 ${
                post.isReposted 
                  ? 'text-green-500 hover:text-green-600' 
                  : 'text-neutral-400 hover:text-green-500'
              }`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-1.5" 
                fill={post.isReposted ? "currentColor" : "none"} 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth="2"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              <span className="text-sm">{post.repostCount}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => repostMutation.mutate()}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              {post.isReposted ? 'Undo Repost' : 'Repost'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuoteDialogOpen(true)}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                />
              </svg>
              Quote Post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button 
          className={`flex items-center transition-colors ${
            post.isSaved 
              ? 'text-yellow-500 hover:text-yellow-600' 
              : 'text-neutral-400 hover:text-yellow-500'
          }`}
          onClick={() => savePostMutation.mutate()}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1.5" 
            fill={post.isSaved ? "currentColor" : "none"} 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth="2"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
            />
          </svg>
          <span className="text-sm">Save</span>
        </button>
      </div>

      {/* Inline Comments Preview */}
      {!hideInlineComments && comments.length > 0 && (
        <div className="mt-3 border-t border-neutral-200 pt-3">
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2">
                <Link href={`/profile/${comment.author.username}`}>
                  <a>
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={comment.author.profileImage} alt={comment.author.name} />
                      <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </a>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="bg-neutral-100 dark:bg-dark-bg-hover rounded-lg px-3 py-1.5">
                    <div className="flex items-center space-x-2">
                      <Link href={`/profile/${comment.author.username}`} className="font-semibold text-xs hover:underline">{comment.author.name}</Link>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">• {comment.createdAt}</span>
                      {comment.language && comment.language.toLowerCase() !== 'en' && (
                        <span className="ml-1 text-xs px-1 py-0.5 rounded-md font-medium bg-blue-100 text-blue-600 flex items-center gap-0.5 border border-blue-200">
                          <LuGlobe className="w-2.5 h-2.5" />
                          {getLanguageTag(comment.language)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5">
                      <TranslatedText
                        text={comment.content}
                        originalLanguage={comment.language}
                        showControls={true}
                      />
                    </div>
                  </div>
                  <div className="flex items-center mt-1.5 space-x-4">
                    {/* Like button */}
                    <button 
                      className={`flex items-center space-x-1 text-xs transition-colors ${
                        comment.isLiked 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'text-neutral-500 hover:text-red-500'
                      }`}
                      onClick={(e) => {
                        console.log('Inline comment heart clicked:', {
                          commentId: comment.id,
                          isLiked: comment.isLiked,
                          likeCount: comment.likeCount,
                          event: e
                        });
                        e.preventDefault();
                        e.stopPropagation();
                        likeCommentMutation.mutate(comment.id);
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3.5 w-3.5" 
                        fill={comment.isLiked ? "currentColor" : "none"} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                        />
                      </svg>
                      {comment.likeCount > 0 && (
                        <span>{comment.likeCount}</span>
                      )}
                    </button>
                    
                    {/* Reply button */}
                    <Link href={`/post/${post.id}`}>
                      <a className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors font-medium">
                        Reply
                      </a>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* View all comments link */}
          {post.commentCount > comments.length && (
            <div className="mt-3 pt-2">
              <Link href={`/post/${post.id}`}>
                <a className="text-sm text-primary hover:underline font-medium">
                  View all {post.commentCount} comments
                </a>
              </Link>
            </div>
          )}

          {/* Quick comment input */}
          {currentUser && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              {!isCommenting ? (
                <button
                  onClick={() => setIsCommenting(true)}
                  className="flex items-center space-x-2 w-full text-left"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src="/default-profile.png" alt={currentUser.name || currentUser.username} />
                    <AvatarFallback className="text-xs">{(currentUser.name || currentUser.username).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
                    Add a comment...
                  </span>
                </button>
              ) : (
                <div className="flex items-start space-x-2">
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src="/default-profile.png" alt={currentUser.name || currentUser.username} />
                    <AvatarFallback className="text-xs">{(currentUser.name || currentUser.username).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && commentText.trim() && !addCommentMutation.isPending) {
                          addCommentMutation.mutate();
                        }
                        if (e.key === 'Escape') {
                          setIsCommenting(false);
                          setCommentText("");
                        }
                      }}
                      className="text-sm border-0 border-b-2 border-neutral-200 rounded-none focus:border-primary px-0 bg-transparent"
                      autoFocus
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          if (commentText.trim()) {
                            addCommentMutation.mutate();
                          }
                        }}
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                        className="text-xs text-primary hover:text-primary-600 font-medium disabled:text-neutral-400 disabled:cursor-not-allowed"
                      >
                        {addCommentMutation.isPending ? "Posting..." : "Post"}
                      </button>
                      <button
                        onClick={() => {
                          setIsCommenting(false);
                          setCommentText("");
                        }}
                        className="text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-neutral-700">
            Are you sure? This action is <span className="font-bold text-red-600">permanent</span> and cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deletePostMutation.status === 'pending'}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { deletePostMutation.mutate(); setConfirmOpen(false); }} disabled={deletePostMutation.status === 'pending'}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Post Dialog */}
      <QuotePostDialog 
        post={isRepost && post.quotedPost ? post.quotedPost : post}
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
      />
    </div>
  );
}
