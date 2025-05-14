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
    <div className="hidden md:block md:w-72 lg:w-80 xl:w-96 fixed right-0 top-16 bottom-0 overflow-auto p-4">
      {/* Search bar for larger screens */}
      <div className="mb-6 md:hidden lg:block">
        <div className="relative">
          <input
            type="text"
            placeholder={t("nav.search")}
            className="w-full py-2 pl-10 pr-4 bg-neutral-100 dark:bg-neutral-800 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-600 dark:text-neutral-300 absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      {/* Trends section */}
      <div className="bg-background rounded-xl border border-neutral-300 dark:border-neutral-800 mb-4">
        <div className="p-4 border-b border-neutral-300 dark:border-neutral-800">
          <h2 className="font-bold text-xl">{t("trending.title")}</h2>
        </div>
        
        {trends.length > 0 ? (
          <div className="divide-y divide-neutral-300 dark:divide-neutral-800">
            {trends.map((trend) => (
              <Link key={trend.id} href={`/trends/${trend.tag}`}>
                <a className="block p-4 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <div className="text-sm text-neutral-600 dark:text-neutral-300">{trend.category}</div>
                  <div className="font-semibold">#{trend.tag}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                    {trend.postCount.toLocaleString()} {t("trending.posts")}
                  </div>
                </a>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-neutral-600 dark:text-neutral-300">
            {t("trending.empty")}
          </div>
        )}
        
        <div className="p-3 border-t border-neutral-300 dark:border-neutral-800">
          <Link href="/trending">
            <a className="text-primary-500 text-sm hover:underline">
              {t("trending.showMore")}
            </a>
          </Link>
        </div>
      </div>

      {/* Suggested users section */}
      <div className="bg-background rounded-xl border border-neutral-300 dark:border-neutral-800">
        <div className="p-4 border-b border-neutral-300 dark:border-neutral-800">
          <h2 className="font-bold text-xl">{t("suggested.title")}</h2>
        </div>
        
        {suggestedUsers.length > 0 ? (
          <div className="divide-y divide-neutral-300 dark:divide-neutral-800">
            {suggestedUsers.slice(0, 3).map((user) => (
              <div key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <Link href={`/profile/${user.username}`}>
                    <a className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={user.profileImage} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold line-clamp-1">{user.name}</div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-300">@{user.username}</div>
                      </div>
                    </a>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 rounded-full border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white transition-colors"
                    onClick={() => {
                      apiRequest(`/api/users/${user.id}/follow`, {
                        method: 'POST',
                      });
                    }}
                  >
                    {t("user.follow")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-neutral-600 dark:text-neutral-300">
            {t("suggested.empty")}
          </div>
        )}
        
        <div className="p-3 border-t border-neutral-300 dark:border-neutral-800">
          <Link href="/explore/people">
            <a className="text-primary-500 text-sm hover:underline">
              {t("suggested.showMore")}
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