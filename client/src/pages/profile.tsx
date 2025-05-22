import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation as useI18nTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MainShell from "@/components/MainShell";
import SideNav from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import PostItem from "@/components/post/PostItem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Post, User } from "@/types";
import ProfilePictureUpload from '@/components/users/ProfilePictureUpload';
import EditProfileModal from '@/components/users/EditProfileModal';
import MutualFollowers from '@/components/users/MutualFollowers';
import { LuGlobe } from "react-icons/lu";
import { LANGUAGE_NAMES } from '@/lib/translation';

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const [, navigate] = useLocation();
  const { t } = useI18nTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("posts");
  const [editOpen, setEditOpen] = useState(false);

  const { data: currentUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
  });

  const { data: profileUser, isLoading: isLoadingUser, error: profileUserError } = useQuery<User>({
    queryKey: [`/api/users/profile/${username}`],
  });

  const { data: userPosts, isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: [`/api/users/${profileUser?.id}/posts`, { activeTab }],
    enabled: !!profileUser,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profileUser) return;
      return apiRequest("POST", `/api/users/${profileUser.id}/follow`, { currentUserId: currentUser?.id });
    },
    onSuccess: (data, variables, context) => {
      let newIsFollowingStateForToast: boolean | undefined;

      // Optimistically update the profile data in the cache
      queryClient.setQueryData([`/api/users/profile/${username}`], (oldData: User | undefined) => {
        if (oldData) {
          const updatedIsFollowing = !oldData.isFollowing;
          newIsFollowingStateForToast = updatedIsFollowing; // Capture the new state for the toast
          return {
            ...oldData,
            isFollowing: updatedIsFollowing, // Toggle the isFollowing state
            followers: oldData.isFollowing ? oldData.followers - 1 : oldData.followers + 1, // Adjust follower count
          };
        }
        return oldData;
      });

      // Invalidate queries to ensure data consistency with the server eventually
      queryClient.invalidateQueries({ queryKey: [`/api/users/profile/${username}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      
      // Display toast based on the new state captured from the optimistic update
      if (newIsFollowingStateForToast !== undefined && profileUser) {
        toast({
          title: newIsFollowingStateForToast ? "Following" : "Unfollowed",
          description: newIsFollowingStateForToast ? `You're now following @${profileUser.username}` : `You unfollowed @${profileUser.username}`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${profileUser!.isFollowing ? 'unfollow' : 'follow'} user: ${error}`,
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

  // Handle user not found error
  useEffect(() => {
    if (profileUserError) {
      toast({
        title: "User not found",
        description: "The user you're looking for doesn't exist.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [profileUserError, toast, navigate]);

  if (isLoadingUser) {
    return (
      <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
        <div className="max-w-[680px] w-full mx-auto flex flex-col gap-6">
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
        </div>
      </MainShell>
    );
  }

  if (!profileUser || profileUserError) return null;

  const isOwnProfile = currentUser?.id === profileUser!.id;

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-[680px] w-full mx-auto flex flex-col gap-6">
        {/* Profile Header */}
        <div className="rounded-xl border bg-white dark:bg-dark-bg/40 shadow-sm overflow-hidden relative">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 w-full relative">
            {profileUser!.coverImage ? (
              <img
                src={profileUser!.coverImage}
                alt={`${profileUser!.name}'s cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                {/* Background pattern or design when no banner */}
                <div className="absolute inset-0 opacity-10 bg-repeat" 
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }}>
                </div>
              </div>
            )}
            {/* Profile Image */}
            <div className="absolute left-8 -bottom-16">
              <Avatar className="w-32 h-32 border-4 border-white dark:border-dark-bg/40 shadow-lg">
                <AvatarImage src={profileUser!.profileImage} alt={profileUser!.name} />
                <AvatarFallback className="text-3xl">{profileUser!.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            {/* Follow/Edit Button */}
            <div className="absolute right-6 bottom-6">
              {isOwnProfile ? (
                <>
                  <Button variant="outline" onClick={() => setEditOpen(true)} className="bg-white/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                    Edit Profile
                  </Button>
                  <EditProfileModal open={editOpen} onOpenChange={setEditOpen} user={profileUser!} />
                </>
              ) : (
                <Button
                  variant={profileUser!.isFollowing ? "outline" : "default"}
                  onClick={() => followMutation.mutate()}
                  className={profileUser!.isFollowing ? "bg-white/90 dark:bg-dark-bg/90 backdrop-blur-sm" : ""}
                >
                  {profileUser!.isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>
          {/* Profile Info */}
          <div className="pt-20 pb-6 px-8">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{profileUser!.name}</h1>
              {profileUser!.isVerified && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-500 ml-1">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 text-sm">@{profileUser!.username}</p>
            {profileUser!.bio && (
              <p className="mt-2 text-neutral-700 dark:text-neutral-200">{profileUser!.bio}</p>
            )}

            {/* Display DID if available */}
            {profileUser!.did && (
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">Decentralized ID (DID)</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200 truncate select-all" title={profileUser!.did}>
                    {profileUser!.did}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    onClick={() => {
                      navigator.clipboard.writeText(profileUser!.did!)
                        .then(() => toast({ title: "DID Copied!", description: "Your DID has been copied to the clipboard." }))
                        .catch(() => toast({ title: "Copy Failed", description: "Could not copy DID to clipboard.", variant: "destructive" }));
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="sr-only">Copy DID</span>
                  </Button>
                </div>
              </div>
            )}
            
            {/* Language preference */}
            {profileUser!.language && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                <LuGlobe className="w-3.5 h-3.5" />
                <span>
                  {LANGUAGE_NAMES[profileUser!.language] || profileUser!.language}
                </span>
              </div>
            )}
            
            <div className="flex mt-3 gap-6">
              <div 
                onClick={() => navigate(`/following/${profileUser!.username}`)} 
                className="cursor-pointer hover:underline"
              >
                <span className="font-bold">{profileUser!.following}</span>{" "}
                <span className="text-neutral-600 dark:text-neutral-300">Following</span>
              </div>
              <div 
                onClick={() => navigate(`/followers/${profileUser!.username}`)}
                className="cursor-pointer hover:underline"
              >
                <span className="font-bold">{profileUser!.followers}</span>{" "}
                <span className="text-neutral-600 dark:text-neutral-300">Followers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mutual Followers (only shown when viewing another user's profile) */}
        {!isOwnProfile && currentUser && (
          <MutualFollowers userId={profileUser!.id} username={profileUser!.username} />
        )}
        
        {/* Profile Tabs */}
        <div className="rounded-xl border bg-white dark:bg-dark-bg/40 shadow-sm">
          <Tabs defaultValue="posts" onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b p-0">
              <TabsTrigger
                value="posts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 px-4 py-3"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="replies"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 px-4 py-3"
              >
                Replies
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 px-4 py-3"
              >
                Media
              </TabsTrigger>
              <TabsTrigger
                value="likes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:text-primary-500 px-4 py-3"
              >
                Likes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="posts">
              {isLoadingPosts ? (
                <Skeleton className="h-40 w-full" />
              ) : userPosts && userPosts.length > 0 ? (
                userPosts.map((post) => <PostItem key={post.id} post={post} />)
              ) : (
                <div className="py-12 text-center text-neutral-500 dark:text-neutral-300">No posts yet.</div>
              )}
            </TabsContent>
            {/* Add more TabsContent for replies, media, likes as needed */}
          </Tabs>
        </div>
      </div>
    </MainShell>
  );
}
