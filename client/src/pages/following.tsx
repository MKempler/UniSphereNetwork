import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MainShell from "@/components/MainShell";
import SideNav from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/simpleAuth.js";

export default function Following() {
  const { username } = useParams<{ username?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Fetch the profile user to get their ID
  const { data: profileUser, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/profile/${username}`],
  });

  // Fetch the following list once we have the profile user's ID
  const { data: following, isLoading: isLoadingFollowing } = useQuery<User[]>({
    queryKey: [`/api/users/${profileUser?.id}/following`],
    enabled: !!profileUser?.id,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/users/${userId}/follow`, { currentUserId: currentUser?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUser?.id}/following`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Success",
        description: "Follow status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update follow status: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Redirect to home if no username provided
  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [username, navigate]);

  const isLoading = isLoadingUser || isLoadingFollowing;
  const isOwnProfile = currentUser?.username === username;

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-[680px] w-full mx-auto">
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b p-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/profile/${username}`)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {profileUser?.name} <span className="font-normal text-neutral-500">@{username}</span>
              </h1>
              <p className="text-sm text-neutral-500">Following</p>
            </div>
          </div>

          {/* Following list */}
          <div className="divide-y">
            {isLoading ? (
              // Loading skeletons
              Array(5)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="p-4 flex items-center">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="ml-3 flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-24 rounded-full" />
                  </div>
                ))
            ) : following?.length ? (
              following.map((followedUser) => (
                <div key={followedUser.id} className="p-4 flex items-center">
                  <Link href={`/profile/${followedUser.username}`}>
                    <a className="flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={followedUser.profileImage} alt={followedUser.name} />
                        <AvatarFallback>{followedUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </a>
                  </Link>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <Link href={`/profile/${followedUser.username}`}>
                        <a className="font-semibold hover:underline">{followedUser.name}</a>
                      </Link>
                      {followedUser.isVerified && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary ml-1">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">@{followedUser.username}</p>
                  </div>
                  {currentUser?.id !== followedUser.id && (
                    <Button
                      variant={followedUser.isFollowing ? "outline" : "default"}
                      size="sm"
                      className={followedUser.isFollowing ? "rounded-full" : "rounded-full"}
                      onClick={() => followMutation.mutate(followedUser.id)}
                    >
                      {followedUser.isFollowing ? (isOwnProfile ? "Unfollow" : "Following") : "Follow"}
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-neutral-500">
                Not following anyone yet
              </div>
            )}
          </div>
        </div>
      </div>
    </MainShell>
  );
} 