import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import MainShell from "@/components/MainShell";
import SideNav from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import PostItem from "@/components/post/PostItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trend, Post } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { Hash, TrendingUp, Clock, Globe } from "lucide-react";

export default function Trending() {
  const { t } = useTranslation();
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedTrend, setSelectedTrend] = useState<string | null>(null);

  const { data: trends = [], isLoading: trendsLoading } = useQuery<Trend[]>({
    queryKey: ['/api/trends/hashtags', timeframe],
    queryFn: async () => {
      return await apiRequest('GET', `/api/trends/hashtags?timeframe=${timeframe}&limit=20`);
    },
    placeholderData: [],
  });

  const { data: popularPosts = [], isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/discover/posts', timeframe],
    queryFn: async () => {
      return await apiRequest('GET', `/api/discover/posts?timeframe=${timeframe}&limit=10`);
    },
    placeholderData: [],
  });

  const { data: hashtagPosts = [] } = useQuery<Post[]>({
    queryKey: ['/api/posts/hashtag', selectedTrend],
    queryFn: async () => {
      if (!selectedTrend) return [];
      return await apiRequest('GET', `/api/posts/hashtag/${selectedTrend}?limit=5`);
    },
    enabled: !!selectedTrend,
    placeholderData: [],
  });

  const timeframeLabels = {
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days'
  };

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-[680px] w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary-500" />
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {t("trending.title")}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Discover what's happening on UniSphere
              </p>
            </div>
          </div>
          
          {/* Timeframe selector */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-500" />
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as '24h' | '7d' | '30d')}
              className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.entries(timeframeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Trending Hashtags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary-500" />
              Trending Hashtags
              <Badge variant="secondary" className="ml-2">
                {timeframeLabels[timeframe]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : trends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trends.map((trend, index) => (
                  <button
                    key={trend.id}
                    onClick={() => setSelectedTrend(selectedTrend === trend.tag ? null : trend.tag)}
                    className={`p-4 border rounded-lg text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                      selectedTrend === trend.tag 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {trend.tag}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      {trend.postCount.toLocaleString()} posts
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      {trend.category}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No trending hashtags found for this timeframe</p>
                <p className="text-sm mt-2">Try a different time period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Hashtag Posts */}
        {selectedTrend && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary-500" />
                Posts with {selectedTrend}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hashtagPosts.length > 0 ? (
                <div className="space-y-4">
                  {hashtagPosts.map((post) => (
                    <PostItem key={post.id} post={post} />
                  ))}
                  <div className="text-center pt-4">
                    <Link href={`/posts/hashtag/${selectedTrend}`}>
                      <Button variant="outline">View all posts with #{selectedTrend}</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-500 dark:text-neutral-400">
                  No posts found with #{selectedTrend}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Popular Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary-500" />
              Popular Posts
              <Badge variant="secondary" className="ml-2">
                {timeframeLabels[timeframe]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
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
            ) : popularPosts.length > 0 ? (
              <div className="space-y-4">
                {popularPosts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No popular posts found for this timeframe</p>
                <p className="text-sm mt-2">Try a different time period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainShell>
  );
} 