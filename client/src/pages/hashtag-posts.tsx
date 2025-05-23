import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import MainShell from "@/components/MainShell";
import SideNav from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import PostItem from "@/components/post/PostItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Post } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { Hash, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function HashtagPosts() {
  const { t } = useTranslation();
  const { hashtag } = useParams();

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts/hashtag', hashtag],
    queryFn: async () => {
      if (!hashtag) return [];
      return await apiRequest('GET', `/api/posts/hashtag/${hashtag}?limit=50`);
    },
    enabled: !!hashtag,
    placeholderData: [],
  });

  if (!hashtag) {
    return (
      <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
        <div className="max-w-[680px] w-full mx-auto space-y-6">
          <div className="text-center py-8">
            <p className="text-neutral-500 dark:text-neutral-400">Invalid hashtag</p>
          </div>
        </div>
      </MainShell>
    );
  }

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-[680px] w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <Link href="/trending">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <Hash className="h-8 w-8 text-primary-500" />
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                #{hashtag}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </p>
            </div>
          </div>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="flex items-center mb-3">
                  <Skeleton className="w-10 h-10 rounded-full mr-3" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <Skeleton className="h-4 w-5/6 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Hash className="h-16 w-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              No posts found
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              No posts have been found with the hashtag #{hashtag} yet.
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
              Be the first to post about #{hashtag}!
            </p>
          </div>
        )}
      </div>
    </MainShell>
  );
} 