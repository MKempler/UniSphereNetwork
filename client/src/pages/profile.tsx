import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import PostItem from "@/components/post/PostItem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Post, User } from "@/types";

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("posts");

  const { data: currentUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
  });

  const { data: profileUser, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/profile/${username}`],
    onError: () => {
      toast({
        title: "User not found",
        description: "The user you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/");
    }
  });

  const { data: userPosts, isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${profileUser?.id}/posts`, { activeTab }],
    enabled: !!profileUser,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profileUser) return;
      return apiRequest("POST", `/api/users/${profileUser.id}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${username}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: profileUser?.isFollowing ? "Unfollowed" : "Following",
        description: profileUser?.isFollowing ? `You unfollowed @${profileUser.username}` : `You're now following @${profileUser.username}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${profileUser?.isFollowing ? 'unfollow' : 'follow'} user: ${error}`,
        variant: "destructive",
      });
    }
  });

  // If no username is provided, redirect to the current user's profile
  useEffect(() => {
    if (!username && currentUser) {
      navigate(`/profile/${currentUser.username}`);
    }
  }, [username, currentUser, navigate]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-light">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-4">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-4 mt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  if (!profileUser) return null;

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-light">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-4 py-4">
          {/* Left Sidebar - only on desktop */}
          <LeftSidebar />

          {/* Main Content */}
          <div className="col-span-1 md:col-span-6 space-y-4">
            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="relative">
                {/* Cover Image */}
                <div className="h-32 bg-primary/20 rounded-t-lg mb-16">
                  {profileUser.coverImage && (
                    <img 
                      src={profileUser.coverImage} 
                      alt={`${profileUser.name}'s cover`}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  )}
                </div>
                
                {/* Profile Image */}
                <Avatar className="absolute left-4 bottom-0 transform translate-y-1/2 w-24 h-24 border-4 border-white">
                  <AvatarImage src={profileUser.profileImage} alt={profileUser.name} />
                  <AvatarFallback className="text-2xl">{profileUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                {/* Follow/Edit Button */}
                <div className="absolute right-4 bottom-0 transform translate-y-1/2">
                  {isOwnProfile ? (
                    <Button variant="outline">Edit Profile</Button>
                  ) : (
                    <Button
                      variant={profileUser.isFollowing ? "outline" : "default"}
                      onClick={() => followMutation.mutate()}
                    >
                      {profileUser.isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="mt-12 px-4">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold">{profileUser.name}</h1>
                  {profileUser.isVerified && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary ml-1">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-neutral-dark text-sm">@{profileUser.username}</p>
                
                {profileUser.bio && (
                  <p className="mt-2 text-neutral-dark">{profileUser.bio}</p>
                )}
                
                <div className="flex mt-3 gap-4">
                  <div>
                    <span className="font-bold">{profileUser.following}</span>{" "}
                    <span className="text-neutral-dark">Following</span>
                  </div>
                  <div>
                    <span className="font-bold">{profileUser.followers}</span>{" "}
                    <span className="text-neutral-dark">Followers</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Profile Tabs */}
            <Tabs defaultValue="posts" onValueChange={setActiveTab}>
              <div className="bg-white rounded-xl shadow-sm">
                <TabsList className="w-full justify-start rounded-none border-b p-0">
                  <TabsTrigger 
                    value="posts" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-3"
                  >
                    Posts
                  </TabsTrigger>
                  <TabsTrigger 
                    value="replies" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-3"
                  >
                    Replies
                  </TabsTrigger>
                  <TabsTrigger 
                    value="media" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-3"
                  >
                    Media
                  </TabsTrigger>
                  <TabsTrigger 
                    value="likes" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-3"
                  >
                    Likes
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="posts" className="mt-0 p-0">
                  {isLoadingPosts ? (
                    // Skeleton loaders for posts
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="border-b border-neutral-medium p-4">
                        <div className="flex items-start space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-3 w-1/3" />
                            <Skeleton className="h-24 w-full mt-2" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : userPosts && userPosts.length > 0 ? (
                    <div className="divide-y divide-neutral-medium">
                      {userPosts.map(post => (
                        <div key={post.id} className="border-b border-neutral-medium">
                          <PostItem post={post} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-neutral-dark">No posts yet</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="replies" className="mt-0 p-0">
                  <div className="p-8 text-center">
                    <p className="text-neutral-dark">No replies yet</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="media" className="mt-0 p-0">
                  <div className="p-8 text-center">
                    <p className="text-neutral-dark">No media posts yet</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="likes" className="mt-0 p-0">
                  <div className="p-8 text-center">
                    <p className="text-neutral-dark">No liked posts yet</p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Sidebar - only on desktop */}
          <RightSidebar />
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}
