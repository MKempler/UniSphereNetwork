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
    <div>
      <Header />
      
      <div className="pt-16 pb-16 sm:pb-0">
        {/* Left Sidebar - visible on lg screens */}
        <LeftSidebar />

        <div className="container mx-auto px-4">
          <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Main Content Area */}
            <main className="col-span-1 md:col-span-8 lg:col-span-6 lg:col-start-4 xl:col-start-4 space-y-4 pt-4">
              {/* Create Post Form - only visible if user is logged in */}
              {currentUser ? (
                <CreatePostForm user={currentUser} />
              ) : (
                <div className="bg-background rounded-xl border border-neutral-300 dark:border-neutral-800 p-5 text-center">
                  <h3 className="font-semibold text-lg mb-2">Join UniSphere Today</h3>
                  <p className="text-neutral-600 dark:text-neutral-300 mb-4">Sign in or create an account to start posting and interacting with the global community.</p>
                  <div className="flex justify-center gap-3">
                    <Link href="/login">
                      <a className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white h-10 px-4 py-2">
                        {t("auth.login")}
                      </a>
                    </Link>
                    <Link href="/register">
                      <a className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary-500 text-white hover:bg-primary-600 h-10 px-4 py-2">
                        {t("auth.register")}
                      </a>
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
                    <div key={i} className="bg-background rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
                      <div className="flex items-start space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-3 w-1/3" />
                          <Skeleton className="h-24 w-full mt-2" />
                        </div>
                      </div>
                      <div className="flex mt-3 pt-3 border-t border-neutral-300 dark:border-neutral-800 justify-between">
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
                          className="border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white rounded-full"
                        >
                          {isFetching ? t("common.loading") : t("feed.load_more")}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-background rounded-xl border border-neutral-300 dark:border-neutral-800 p-8 text-center">
                    <h3 className="font-semibold text-lg mb-2">{t("feed.empty.title")}</h3>
                    <p className="text-neutral-600 dark:text-neutral-300">
                      {feedType === "following" 
                        ? t("feed.empty.following") 
                        : feedType === "circuits" 
                          ? t("feed.empty.circuits")
                          : t("feed.empty.default")}
                    </p>
                  </div>
                )}
              </div>
            </main>

            {/* Right Sidebar - visible on md+ screens */}
            <aside className="hidden md:block md:col-span-4 lg:col-span-3">
              <RightSidebar />
            </aside>
          </div>
        </div>

        {/* Mobile Navigation - visible on sm and smaller screens */}
        <MobileNavigation />
      </div>
    </div>
  );
}
