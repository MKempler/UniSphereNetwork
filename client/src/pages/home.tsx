import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
          <Skeleton className="h-40 w-full" />
        ) : posts && posts.posts.length > 0 ? (
          posts.posts.map((post) => <PostItem key={post.id} post={post} />)
        ) : (
          <EmptyFeed />
        )}
      </div>
    </MainShell>
  );
}
