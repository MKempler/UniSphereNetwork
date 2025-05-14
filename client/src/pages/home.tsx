import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Header from "@/components/layout/Header";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import CreatePostForm from "@/components/post/CreatePostForm";
import FeedSelector from "@/components/post/FeedSelector";
import PostItem from "@/components/post/PostItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Post, User } from "@/types";
import { Link } from "wouter";

export default function Home() {
  const { t } = useTranslation();
  const [feedType, setFeedType] = useState("for-you");
  const [page, setPage] = useState(1);

  const { data: currentUser, isLoading: isLoadingUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
  });

  const { data: posts, isLoading: isLoadingPosts, isFetching } = useQuery<{
    posts: Post[];
    totalPages: number;
  }>({
    queryKey: [`/api/posts`, { feedType, page }],
  });

  return (
    <div className="min-h-screen flex flex-col bg-neutral-light">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-4 py-4">
          {/* Left Sidebar */}
          <LeftSidebar />

          {/* Center Feed */}
          <div className="col-span-1 md:col-span-6 space-y-4">
            {/* Create Post Form - only visible if user is logged in */}
            {currentUser ? (
              <CreatePostForm user={currentUser} />
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <h3 className="font-semibold text-lg mb-2">Join UniSphere Today</h3>
                <p className="text-neutral-dark mb-4">Sign in or create an account to start posting and interacting with the global community.</p>
                <div className="flex justify-center gap-3">
                  <Link href="/login">
                    <Button variant="outline">{t("auth.login")}</Button>
                  </Link>
                  <Link href="/register">
                    <Button>{t("auth.register")}</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Feed Selector */}
            <FeedSelector onFeedChange={setFeedType} />

            {/* Post Feed */}
            <div className="space-y-4">
              {isLoadingPosts ? (
                // Loading skeletons
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-start space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-24 w-full mt-2" />
                      </div>
                    </div>
                    <div className="flex mt-3 pt-3 border-t border-neutral-medium justify-between">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                  </div>
                ))
              ) : posts && posts.posts.length > 0 ? (
                <>
                  {posts.posts.map(post => (
                    <PostItem 
                      key={post.id} 
                      post={post} 
                      isCircuitPost={post.circuitId !== undefined}
                      circuitName={post.circuitName} 
                    />
                  ))}
                  
                  {/* Load More */}
                  {posts.totalPages > page && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={isFetching}
                        className="border-primary text-primary hover:bg-primary hover:text-white"
                      >
                        {isFetching ? "Loading..." : t("feed.load_more")}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <h3 className="font-semibold text-lg mb-2">No posts found</h3>
                  <p className="text-neutral-dark">
                    {feedType === "following" 
                      ? "Follow some users to see their posts here!" 
                      : feedType === "circuits" 
                        ? "Join some Social Circuits to see curated content here!"
                        : "There are no posts to display at the moment."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}
