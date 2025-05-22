import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types";

interface SuggestedUsersProps {
  users: User[];
}

export default function SuggestedUsers({ users }: SuggestedUsersProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
      const currentUser = queryClient.getQueryData<User>(["/api/users/me"]);
      return apiRequest("POST", `/api/users/${userId}/follow`, { currentUserId: currentUser?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/suggested"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to follow user: ${error}`,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold text-neutral-dark mb-4">{t("sidebar.who_to_follow")}</h3>
      
      <ul className="space-y-4">
        {users.map((user) => (
          <li key={user.id} className="flex items-center">
            <Link href={`/profile/${user.username}`}>
              <a>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.profileImage} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </a>
            </Link>
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <Link href={`/profile/${user.username}`}>
                  <a className="font-medium text-neutral-dark hover:underline">{user.name}</a>
                </Link>
                {user.isVerified && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary ml-1">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-neutral-dark opacity-75">@{user.username}</p>
            </div>
            <button 
              className="bg-primary text-white text-sm px-3 py-1.5 rounded-full hover:bg-primary-dark transition-colors"
              onClick={() => followMutation.mutate(user.id)}
            >
              Follow
            </button>
          </li>
        ))}
      </ul>
      
      <Link href="/explore/users">
        <a className="block text-primary text-sm mt-4 hover:underline">{t("sidebar.show_more")}</a>
      </Link>
    </div>
  );
}
