import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { translateText, getLanguageTag } from "@/lib/translation";
import { Post } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface PostItemProps {
  post: Post;
  isCircuitPost?: boolean;
  circuitName?: string;
}

export default function PostItem({ post, isCircuitPost, circuitName }: PostItemProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOriginal, setShowOriginal] = useState(true);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const needsTranslation = post.language && post.language !== navigator.language.split('-')[0];

  const translatePost = async () => {
    if (translatedContent && !showOriginal) {
      setShowOriginal(true);
      return;
    }

    if (translatedContent && showOriginal) {
      setShowOriginal(false);
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translateText(post.content);
      setTranslatedContent(result.translatedText);
      setShowOriginal(false);
    } catch (error) {
      toast({
        title: "Translation failed",
        description: "Couldn't translate this post. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const likePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/posts/${post.id}/like`, {});
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
      return apiRequest("POST", `/api/posts/${post.id}/repost`, {});
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Circuit Header (if from a circuit) */}
      {isCircuitPost && circuitName && (
        <div className="flex items-center mb-3">
          <div className="bg-accent rounded-full w-8 h-8 flex items-center justify-center text-white mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-neutral-dark opacity-75">
              From <Link href={`/circuits/${post.circuitId}`}><a className="text-primary font-medium hover:underline">{circuitName}</a></Link>
            </p>
          </div>
        </div>
      )}
      
      {/* Post Header */}
      <div className="flex justify-between">
        <div className="flex">
          <Link href={`/profile/${post.author.username}`}>
            <a>
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.author.profileImage} alt={post.author.name} />
                <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </a>
          </Link>
          <div className="ml-3">
            <div className="flex items-center">
              <Link href={`/profile/${post.author.username}`}>
                <a className="font-semibold text-neutral-dark hover:underline">{post.author.name}</a>
              </Link>
              {post.author.isVerified && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary ml-1">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center">
              <p className="text-sm text-neutral-dark opacity-75">@{post.author.username}</p>
              <span className="mx-1 text-neutral-dark opacity-50">•</span>
              <p className="text-sm text-neutral-dark opacity-75">{post.createdAt}</p>
              {post.language && (
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary">
                  {getLanguageTag(post.language)}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="text-neutral-dark p-1 rounded-full hover:bg-neutral-light transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </button>
      </div>
      
      {/* Post Content */}
      <div className="mt-3">
        {needsTranslation && !showOriginal && translatedContent ? (
          <>
            <div className="bg-neutral-light rounded-lg p-3 text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-neutral-dark opacity-75">
                  {t("post.translate")} {post.language.toUpperCase()}
                </span>
                <button 
                  className="text-xs text-primary hover:underline"
                  onClick={translatePost}
                  disabled={isTranslating}
                >
                  {t("post.show_original")}
                </button>
              </div>
              <p className="text-neutral-dark">
                {translatedContent}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-neutral-dark mb-3">
              {post.content}
            </p>
            {needsTranslation && (
              <button 
                className="text-xs text-primary hover:underline block mb-3"
                onClick={translatePost}
                disabled={isTranslating}
              >
                {isTranslating ? "Translating..." : t("post.show_translation")}
              </button>
            )}
          </>
        )}
        
        {post.media && (
          <img 
            src={post.media} 
            alt="Post media" 
            className="w-full h-auto rounded-xl object-cover"
          />
        )}
      </div>
      
      {/* Post Actions */}
      <div className="flex mt-3 pt-3 border-t border-neutral-medium">
        <button className="flex items-center text-neutral-dark hover:text-primary transition-colors mr-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm">{post.commentCount}</span>
        </button>
        <button 
          className={`flex items-center ${post.isReposted ? 'text-secondary' : 'text-neutral-dark hover:text-secondary'} transition-colors mr-6`}
          onClick={() => repostMutation.mutate()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill={post.isReposted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm">{post.repostCount}</span>
        </button>
        <button 
          className={`flex items-center ${post.isLiked ? 'text-error' : 'text-neutral-dark hover:text-error'} transition-colors mr-6`}
          onClick={() => likePostMutation.mutate()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill={post.isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-sm">{post.likeCount}</span>
        </button>
        <button className="flex items-center text-neutral-dark hover:text-primary transition-colors ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
        <button 
          className="ml-4 flex items-center text-neutral-dark hover:text-primary transition-colors"
          onClick={() => savePostMutation.mutate()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={post.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
