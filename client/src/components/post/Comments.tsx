import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/simpleAuth";
import { Comment } from "@/types";
import { MessageCircle, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TranslatedText from "@/components/common/TranslatedText";
import { getLanguageTag } from "@/lib/translation";
import { LuGlobe } from "react-icons/lu";

interface CommentsProps {
  postId: number;
}

interface CommentItemProps {
  comment: Comment;
  postId: number;
  onReply: (commentId: number) => void;
  replyingTo?: number;
}

const CommentItem = ({ comment, postId, onReply, replyingTo }: CommentItemProps) => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const likeCommentMutation = useMutation({
    mutationFn: async () => {
      console.log('Making API request to like comment:', comment.id);
      const result = await apiRequest("POST", `/api/comments/${comment.id}/like`, {});
      console.log('API response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Like mutation success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      console.error('Like mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to like comment: ${error}`,
        variant: "destructive",
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/comments/${comment.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete comment: ${error}`,
        variant: "destructive",
      });
    }
  });

  const isOwner = currentUser?.id === comment.author.id;

  return (
    <div className="space-y-3">
      <div className="flex space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.author.profileImage} alt={comment.author.name} />
          <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-neutral-100 rounded-2xl px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm">{comment.author.name}</span>
                <span className="text-xs text-neutral-500">@{comment.author.username}</span>
                <span className="text-xs text-neutral-500">•</span>
                <span className="text-xs text-neutral-500">{comment.createdAt}</span>
                {comment.language && comment.language.toLowerCase() !== 'en' && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md font-medium bg-blue-100 text-blue-600 flex items-center gap-1 border border-blue-200">
                    <LuGlobe className="w-3 h-3" />
                    {getLanguageTag(comment.language)}
                  </span>
                )}
              </div>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => deleteCommentMutation.mutate()}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className="text-sm mt-1">
              <TranslatedText
                text={comment.content}
                originalLanguage={comment.language}
                showControls={true}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-1 ml-1">
            <button 
              className={`flex items-center space-x-1 text-xs transition-colors mr-4 ${
                comment.isLiked 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-neutral-400 hover:text-red-500'
              }`}
              onClick={() => {
                console.log('Comment like clicked:', { 
                  commentId: comment.id, 
                  isLiked: comment.isLiked, 
                  likeCount: comment.likeCount 
                });
                likeCommentMutation.mutate();
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                fill={comment.isLiked ? "currentColor" : "none"} 
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
              <span>{comment.likeCount}</span>
            </button>
            
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center space-x-1 text-xs text-neutral-500 hover:text-primary transition-colors"
            >
              <Reply className="h-4 w-4" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Render replies with indentation */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onReply={onReply}
              replyingTo={replyingTo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentForm = ({ 
  postId, 
  parentId, 
  onCancel, 
  placeholder 
}: { 
  postId: number; 
  parentId?: number; 
  onCancel?: () => void;
  placeholder?: string;
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation({
    mutationFn: async (newComment: { content: string; parentId?: number }) => {
      return apiRequest("POST", `/api/posts/${postId}/comments`, newComment);
    },
    onSuccess: () => {
      setContent("");
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      onCancel?.();
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: `Failed to post comment: ${error}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    createCommentMutation.mutate({
      content: content.trim(),
      parentId: parentId || undefined
    });
  };

  if (!currentUser) {
    return (
      <div className="text-center py-4 text-neutral-500">
        Please log in to comment
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={(currentUser as any).profileImage || "/default-profile.png"} alt={currentUser.name || currentUser.username} />
          <AvatarFallback>{(currentUser.name || currentUser.username).charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || "Write a comment..."}
            className="w-full p-3 border border-neutral-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            disabled={isSubmitting}
          />
          
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-neutral-500">
              {content.length}/280
            </div>
            
            <div className="flex space-x-2">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                size="sm" 
                disabled={!content.trim() || content.length > 280 || isSubmitting}
              >
                {isSubmitting ? "Posting..." : parentId ? "Reply" : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default function Comments({ postId }: CommentsProps) {
  const [replyingTo, setReplyingTo] = useState<number | undefined>(undefined);
  
  const { data: comments, isLoading, error } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${postId}/comments`);
      return response as Comment[];
    }
  });

  const handleReply = (commentId: number) => {
    setReplyingTo(replyingTo === commentId ? undefined : commentId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-neutral-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-neutral-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-neutral-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        Failed to load comments
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comment form */}
      <CommentForm postId={postId} placeholder="Share your thoughts..." />
      
      {/* Comments list */}
      <div className="space-y-6">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentItem
                comment={comment}
                postId={postId}
                onReply={handleReply}
                replyingTo={replyingTo}
              />
              
              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="ml-11">
                  <CommentForm
                    postId={postId}
                    parentId={comment.id}
                    onCancel={() => setReplyingTo(undefined)}
                    placeholder={`Reply to ${comment.author.name}...`}
                  />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <MessageCircle className="mx-auto h-12 w-12 mb-4 text-neutral-300" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
} 