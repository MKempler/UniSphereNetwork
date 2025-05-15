import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { User, Trend } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function RightSidebar() {
  const { t } = useTranslation();
  
  const { data: suggestedUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users/suggested'],
    placeholderData: [],
  });
  
  const { data: trends = [] } = useQuery<Trend[]>({
    queryKey: ['/api/trends'],
    placeholderData: [],
  });

  return (
    <div className="space-y-6">
      {/* Trending Widget */}
      <div className="rounded-lg border bg-neutral-50 dark:bg-dark-bg/40 p-4 space-y-3">
        <h2 className="font-bold text-lg mb-2">{t("trending.title")}</h2>
        {trends.length > 0 ? (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {trends.slice(0, 5).map((trend) => (
              <Link key={trend.id} href={`/trends/${trend.tag}`}>
                <a className="block py-3 hover:bg-neutral-100 dark:hover:bg-dark-bg/60 rounded transition-colors">
                  <div className="text-xs text-neutral-500 dark:text-neutral-300 mb-1">{trend.category}</div>
                  <div className="font-semibold text-neutral-700 dark:text-neutral-100">#{trend.tag}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-300 mt-1">
                    {trend.postCount.toLocaleString()} {t("trending.posts", { count: trend.postCount })}
                  </div>
                </a>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-neutral-500 dark:text-neutral-300">{t("trending.empty")}</div>
        )}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-right">
          <Link href="/trending">
            <a className="text-primary-500 text-sm font-medium hover:underline">
              {t("trending.showMore")} <span aria-hidden>▶</span>
            </a>
          </Link>
        </div>
      </div>

      {/* Who to Follow Widget */}
      <div className="rounded-lg border bg-neutral-50 dark:bg-dark-bg/40 p-4 space-y-3">
        <h2 className="font-bold text-lg mb-2">{t("suggested.title")}</h2>
        {suggestedUsers.length > 0 ? (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {suggestedUsers.slice(0, 3).map((user) => (
              <div key={user.id} className="py-3 flex items-center justify-between">
                <Link href={`/profile/${user.username}`}>
                  <a className="flex items-center">
                    <Avatar className="h-9 w-9 mr-3">
                      <AvatarImage src={user.profileImage} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-neutral-700 dark:text-neutral-100 line-clamp-1">{user.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-300">@{user.username}</div>
                    </div>
                  </a>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 rounded-full border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white transition-colors"
                  onClick={() => {
                    apiRequest('POST', `/api/users/${user.id}/follow`);
                  }}
                >
                  {t("user.follow")}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-neutral-500 dark:text-neutral-300">{t("suggested.empty")}</div>
        )}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-right">
          <Link href="/explore/people">
            <a className="text-primary-500 text-sm font-medium hover:underline">
              {t("suggested.showMore")} <span aria-hidden>▶</span>
            </a>
          </Link>
        </div>
      </div>
      
      {/* Footer links */}
      <div className="mt-4 text-xs text-neutral-600 dark:text-neutral-300">
        <div className="flex flex-wrap gap-2">
          <Link href="/about"><a className="hover:underline">{t("footer.about")}</a></Link>
          <Link href="/privacy"><a className="hover:underline">{t("footer.privacy")}</a></Link>
          <Link href="/terms"><a className="hover:underline">{t("footer.terms")}</a></Link>
          <Link href="/help"><a className="hover:underline">{t("footer.help")}</a></Link>
        </div>
        <div className="mt-2">
          © {new Date().getFullYear()} UniSphere
        </div>
      </div>
    </div>
  );
}