import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import MainShell from "@/components/MainShell";
import SideNav from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import CreatePostForm from "@/components/post/CreatePostForm";
import FeedSelector from "@/components/post/FeedSelector";
import PostItem from "@/components/post/PostItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Post, User } from "@/types";
import { Link } from "wouter";
import EmptyFeed from "@/components/EmptyFeed";
import { useInView } from "react-intersection-observer";
import React from "react";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { t } = useTranslation();
  const [feedType, setFeedType] = useState("for-you");

  const { data: currentUser, isLoading: isLoadingUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
  });

  const {
    data,
    isLoading: isLoadingPosts,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<{ posts: Post[]; page: number; totalPages: number }, Error>({
    queryKey: ["/api/posts", feedType],
    queryFn: async ({ pageParam = 1 }) => {
      const url = `/api/posts?feedType=${feedType}&page=${pageParam}`;
      const res = await apiRequest("GET", url);
      return res;
    },
    getNextPageParam: (lastPage: { page: number; totalPages: number }) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Intersection Observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({ triggerOnce: false });

  // Fetch next page when inView
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Debug: log posts array
  if (data && data.pages) {
    // Flatten all posts from all pages
    const allPosts = data.pages.flatMap((page) => (page as { posts: Post[] }).posts);
    console.log('DEBUG: Posts to render:', allPosts);
  }

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      {/* Main feed area */}
      <div className="max-w-[680px] w-full mx-auto flex flex-col gap-6">
        {currentUser ? (
          <CreatePostForm user={currentUser} />
        ) : (
          <div className="bg-background rounded-xl border border-neutral-300 dark:border-neutral-800 p-8 text-center max-w-[560px] mx-auto my-4">
            <h2 className="text-2xl font-bold mb-2">Join UniSphere Today</h2>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">Sign in or create an account to start posting and interacting with the global community.</p>
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/login">{t("auth.login")}</Link>
              </Button>
              <Button asChild>
                <Link href="/register">{t("auth.register")}</Link>
              </Button>
            </div>
          </div>
        )}
        <FeedSelector onFeedChange={setFeedType} />
        {/* Feed content */}
        {isLoadingPosts ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-neutral-50 rounded-2xl shadow p-4 mb-4">
              <div className="flex items-center mb-3">
                <Skeleton className="w-10 h-10 rounded-full mr-3" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : data && data.pages && data.pages.flatMap((page) => (page as { posts: Post[] }).posts).length > 0 ? (
          <>
            {data.pages.flatMap((page) => (page as { posts: Post[] }).posts).map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
            <div ref={loadMoreRef} />
            {isFetchingNextPage && (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-neutral-50 rounded-2xl shadow p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <Skeleton className="w-10 h-10 rounded-full mr-3" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-1/3 mb-2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-5/6 mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            )}
          </>
        ) : (
          <EmptyFeed />
        )}
      </div>
    </MainShell>
  );
}
