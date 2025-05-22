import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@/types";

interface MutualFollowersProps {
  userId: number;
  username: string;
}

export default function MutualFollowers({ userId, username }: MutualFollowersProps) {
  const { t } = useTranslation();
  
  const { data: mutualFollowers, isLoading, error } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/mutual-followers`],
    enabled: !!userId,
    retry: false, // Don't retry on error (especially for 401s)
  });
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-semibold text-neutral-900 mb-3">{t("profile.mutual_followers")}</h3>
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="ml-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Handle errors or empty results gracefully
  if (error || !mutualFollowers || mutualFollowers.length === 0) {
    return null; // Don't display the component if there's an error or no mutual followers
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <h3 className="font-semibold text-neutral-900 mb-3">
        {t("profile.mutual_followers", { count: mutualFollowers.length })}
      </h3>
      
      <div className="space-y-3">
        {mutualFollowers.slice(0, 3).map((user) => (
          <Link key={user.id} href={`/profile/${user.username}`}>
            <a className="flex items-center group">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImage} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-2">
                <div className="font-medium text-sm text-neutral-900 group-hover:underline">
                  {user.name}
                  {user.isVerified && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-primary inline-block ml-1">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-neutral-500">
                  @{user.username}
                </div>
              </div>
            </a>
          </Link>
        ))}
        
        {mutualFollowers.length > 3 && (
          <Link href={`/followers/${username}`}>
            <a className="text-primary text-sm font-medium hover:underline block pt-2">
              {t("profile.view_more_mutual", { count: mutualFollowers.length - 3 })}
            </a>
          </Link>
        )}
      </div>
    </div>
  );
} 