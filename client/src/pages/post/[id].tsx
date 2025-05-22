import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Post } from "@/types";
import PostItem from "@/components/post/PostItem";
import Comments from "@/components/post/Comments";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PostDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const postId = parseInt(id || "0");

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${postId}`);
      return response as Post;
    },
    enabled: !!postId && postId > 0
  });

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-neutral-200 p-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Post</h1>
            </div>
          </div>

          {/* Loading skeleton */}
          <div className="p-6 space-y-4">
            <div className="animate-pulse">
              <div className="flex space-x-3">
                <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
                  <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-32 bg-neutral-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-neutral-200 p-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold">Post</h1>
            </div>
          </div>

          {/* Error state */}
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="text-6xl">😞</div>
            <h2 className="text-2xl font-bold text-neutral-800">Post not found</h2>
            <p className="text-neutral-600 text-center max-w-md">
              This post might have been deleted, or the link is incorrect.
            </p>
            <Button onClick={goBack} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-neutral-200 p-4 z-10">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Post</h1>
          </div>
        </div>

        {/* Post content */}
        <div className="border-b border-neutral-200 pb-4">
          <PostItem post={post} hideInlineComments={true} />
        </div>

        {/* Comments section */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-1">
              Comments {post.commentCount > 0 && `(${post.commentCount})`}
            </h2>
            <p className="text-sm text-neutral-500">
              Join the conversation
            </p>
          </div>
          <Comments postId={postId} />
        </div>
      </div>
    </div>
  );
} 