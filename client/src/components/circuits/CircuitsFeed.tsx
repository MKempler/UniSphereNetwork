import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, TrendingUp, Users, Sparkles, ChevronRight, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PostItem from "@/components/post/PostItem";
import { apiRequest } from "@/lib/queryClient";
import { Circuit, Post, User } from "@/types";

interface CircuitWithStats extends Omit<Circuit, 'creatorName'> {
  subscriberCount: number;
  isSubscribed: boolean;
  creatorName?: string;
  creatorProfileImage?: string;
}

export default function CircuitsFeed() {
  const [activeTab, setActiveTab] = useState<"my-circuits" | "discover">("my-circuits");
  const queryClient = useQueryClient();

  // Get current user
  const { data: currentUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
  });

  // Join/Leave circuit mutation
  const joinCircuitMutation = useMutation({
    mutationFn: async ({ circuitId, isSubscribed }: { circuitId: number; isSubscribed: boolean }) => {
      if (isSubscribed) {
        return apiRequest("DELETE", `/api/circuits/${circuitId}/subscribe`);
      } else {
        return apiRequest("POST", `/api/circuits/${circuitId}/subscribe`);
      }
    },
    onSuccess: () => {
      // Invalidate all circuit-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", "circuits"] });
    },
  });

  // Get user's subscribed circuits
  const { data: myCircuits, isLoading: isLoadingMyCircuits } = useQuery<CircuitWithStats[]>({
    queryKey: ["/api/circuits/my-subscriptions"],
    queryFn: () => apiRequest("GET", "/api/circuits/my-subscriptions"),
    enabled: !!currentUser,
  });

  // Get trending circuits
  const { data: trendingCircuits, isLoading: isLoadingTrending } = useQuery<CircuitWithStats[]>({
    queryKey: ["/api/circuits/trending"],
    queryFn: () => apiRequest("GET", "/api/circuits/trending?limit=6"),
  });

  // Get suggested circuits
  const { data: suggestedCircuits, isLoading: isLoadingSuggested } = useQuery<CircuitWithStats[]>({
    queryKey: ["/api/circuits/suggested"],
    queryFn: () => apiRequest("GET", "/api/circuits/suggested?limit=8"),
  });

  // Get user's subscribed circuit posts (if any)
  const { data: circuitPosts, isLoading: isLoadingPosts } = useQuery<{ posts: Post[] }>({
    queryKey: ["/api/posts", "circuits"],
    queryFn: () => apiRequest("GET", "/api/posts?feedType=circuits"),
    enabled: !!currentUser && activeTab === "my-circuits",
  });

  // Get popular posts from all circuits for discovery
  const { data: popularPosts, isLoading: isLoadingPopular } = useQuery<Post[]>({
    queryKey: ["/api/discover/posts"],
    queryFn: () => apiRequest("GET", "/api/discover/posts?timeframe=24h&limit=10"),
    enabled: activeTab === "discover",
  });

  const CircuitSkeleton = () => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-9 w-20 ml-3" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      </CardContent>
    </Card>
  );

  const CircuitCard = ({ circuit, showSubscriptionStatus = true }: { circuit: CircuitWithStats; showSubscriptionStatus?: boolean }) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Link href={`/circuits/${circuit.id}`}>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-primary-600 transition-colors line-clamp-1">
                {circuit.name}
              </h3>
            </Link>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
              {circuit.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {circuit.subscriberCount} {circuit.subscriberCount === 1 ? 'member' : 'members'}
              </Badge>
              {circuit.isSubscribed && showSubscriptionStatus && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <Heart className="h-3 w-3 mr-1" />
                  Joined
                </Badge>
              )}
            </div>
          </div>
          {showSubscriptionStatus && (
            <Button 
              size="sm" 
              variant={circuit.isSubscribed ? "outline" : "default"}
              className="ml-3 shrink-0"
              onClick={() => joinCircuitMutation.mutate({ 
                circuitId: circuit.id, 
                isSubscribed: circuit.isSubscribed 
              })}
              disabled={joinCircuitMutation.isPending}
            >
              {joinCircuitMutation.isPending ? "..." : circuit.isSubscribed ? "Leave" : "Join"}
            </Button>
          )}
        </div>
        {circuit.creatorName && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Avatar className="h-4 w-4">
              <AvatarImage src={circuit.creatorProfileImage} />
              <AvatarFallback>{circuit.creatorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>by {circuit.creatorName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Header with prominent tabs */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">Social Circuits</CardTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {activeTab === "my-circuits" 
                  ? "Your personalized feed from joined circuits" 
                  : "Discover and join new communities"
                }
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/circuits/create">
                <Plus className="h-4 w-4 mr-1" />
                Create Circuit
              </Link>
            </Button>
          </div>
          
          {/* Prominent tab buttons with better styling */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <Button
              variant={activeTab === "my-circuits" ? "default" : "ghost"}
              size="sm"
              className={`flex-1 ${activeTab === "my-circuits" ? "shadow-sm" : ""}`}
              onClick={() => setActiveTab("my-circuits")}
            >
              <Heart className="h-4 w-4 mr-2" />
              My Circuits
              {myCircuits && myCircuits.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {myCircuits.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === "discover" ? "default" : "ghost"}
              size="sm"
              className={`flex-1 ${activeTab === "discover" ? "shadow-sm" : ""}`}
              onClick={() => setActiveTab("discover")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Discover
            </Button>
          </div>
        </CardHeader>
      </Card>

      {activeTab === "my-circuits" ? (
        <>
          {/* My Circuits Tab */}
          {myCircuits && myCircuits.length > 0 ? (
            <>
              {/* My Circuits Grid */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Your Circuits ({myCircuits.length})
                  </CardTitle>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Circuits you've joined and are actively participating in
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoadingMyCircuits
                      ? Array.from({ length: 4 }).map((_, i) => <CircuitSkeleton key={i} />)
                      : myCircuits.map((circuit) => (
                          <CircuitCard key={circuit.id} circuit={circuit} showSubscriptionStatus={false} />
                        ))
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Recent Posts from My Circuits */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    Latest from Your Circuits
                  </CardTitle>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Recent posts from circuits you follow
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingPosts ? (
                    <div className="p-4 space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
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
                  ) : circuitPosts?.posts && circuitPosts.posts.length > 0 ? (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {circuitPosts.posts.map((post) => (
                        <div key={post.id} className="p-4">
                          <PostItem post={post} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-neutral-500">
                      <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <h3 className="font-medium mb-2">No recent posts</h3>
                      <p className="text-sm mb-4">
                        Your circuits are quiet right now. Check back later or explore new circuits!
                      </p>
                      <Button 
                        onClick={() => setActiveTab("discover")}
                        variant="outline"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Discover More Circuits
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="h-16 w-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                <h3 className="text-xl font-semibold mb-2">You haven't joined any circuits yet</h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                  Circuits are communities centered around topics you care about. Join your first circuit to start connecting with like-minded people!
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => setActiveTab("discover")}
                    size="lg"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Discover Circuits
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/circuits/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Circuit
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Discover Tab */}
          {/* Trending Circuits */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-lg">Trending Circuits</CardTitle>
                </div>
                <Link href="/circuits/trending">
                  <Button variant="ghost" size="sm">
                    View all
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Most active and growing circuits right now
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoadingTrending
                  ? Array.from({ length: 4 }).map((_, i) => <CircuitSkeleton key={i} />)
                  : trendingCircuits?.slice(0, 4).map((circuit) => (
                      <CircuitCard key={circuit.id} circuit={circuit} />
                    ))
                }
              </div>
            </CardContent>
          </Card>

          {/* Popular Posts from Circuits */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Popular in Circuits</CardTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Trending posts from active circuits
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingPopular ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
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
              ) : popularPosts && popularPosts.length > 0 ? (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {popularPosts.slice(0, 5).map((post) => (
                    <div key={post.id} className="p-4">
                      <PostItem post={post} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <h3 className="font-medium mb-1">No popular posts yet</h3>
                  <p className="text-sm">Be the first to create engaging circuit content!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggested Circuits */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Suggested for You</CardTitle>
                <Link href="/circuits">
                  <Button variant="ghost" size="sm">
                    Browse all
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Circuits we think you'll enjoy based on your interests
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {isLoadingSuggested
                  ? Array.from({ length: 4 }).map((_, i) => <CircuitSkeleton key={i} />)
                  : suggestedCircuits?.map((circuit) => (
                      <CircuitCard key={circuit.id} circuit={circuit} />
                    ))
                }
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 