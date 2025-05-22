import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { User, Trend } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function RightRail() {
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
    <aside
      className="hidden xl:block w-[300px] bg-white shadow-sm border-l border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 sticky top-16 h-max px-4 py-3 space-y-6"
      role="complementary"
      aria-label="Trending and suggestions"
    >
      {/* Trending Widget */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center justify-between font-semibold border-b pb-2 mb-2">
          <span className="text-lg">{t("trending.title")}</span>
          <div className="flex items-center gap-1">
            {/* Globe icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 0c2.21 0 4 4.03 4 9s-1.79 9-4 9-4-4.03-4-9 1.79-9 4-9z" /></svg>
            <select className="bg-transparent text-sm text-gray-500 focus:outline-none">
              <option>EN</option>
              <option>ES</option>
              {/* Add more languages as needed */}
            </select>
          </div>
        </div>
        {trends.length > 0 ? (
          <div className="divide-y divide-neutral-200">
            {trends.slice(0, 5).map((trend) => (
              <Link key={trend.id} href={`/trends/${trend.tag}`} className="block py-3 hover:bg-neutral-100 rounded transition-colors">
                <div className="text-xs text-neutral-500 mb-1">{trend.category}</div>
                <div className="font-semibold text-neutral-700">#{trend.tag}</div>
                <div className="text-xs text-neutral-500 mt-1">
                    {trend.postCount.toLocaleString()} {t("trending.posts", { count: trend.postCount })}
                  </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-neutral-500">{t("trending.empty")}</div>
        )}
        <div className="pt-3 border-t border-neutral-200 text-right">
          <Link href="/trending" className="text-primary-500 text-sm font-medium hover:underline">
              {t("trending.showMore")} <span aria-hidden>▶</span>
          </Link>
        </div>
      </div>

      {/* Who to Follow Widget */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="font-semibold border-b pb-2 mb-2 text-lg">{t("suggested.title")}</div>
        {suggestedUsers.length > 0 ? (
          <div className="divide-y divide-neutral-200">
            {suggestedUsers.slice(0, 3).map((user) => (
              <div key={user.id} className="py-3 flex items-center justify-between">
                <Link href={`/profile/${user.username}`} className="flex items-center">
                    <Avatar className="h-9 w-9 mr-3">
                      <AvatarImage src={user.profileImage} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                    <div className="font-semibold text-neutral-700 line-clamp-1">{user.name}</div>
                    <div className="text-xs text-neutral-500">@{user.username}</div>
                    </div>
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
          <div className="py-6 text-center text-neutral-500">{t("suggested.empty")}</div>
        )}
        <div className="pt-3 border-t border-neutral-200 text-right">
          <Link href="/explore/people" className="text-primary-500 text-sm font-medium hover:underline">
              {t("suggested.showMore")} <span aria-hidden>▶</span>
          </Link>
        </div>
      </div>
      
      {/* Footer links */}
      <div className="mt-4 text-xs text-neutral-600 dark:text-neutral-300">
        <div className="flex flex-wrap gap-2">
          <Link href="/about" className="hover:underline">{t("footer.about")}</Link>
          <Link href="/privacy" className="hover:underline">{t("footer.privacy")}</Link>
          <Link href="/terms" className="hover:underline">{t("footer.terms")}</Link>
          <Link href="/help" className="hover:underline">{t("footer.help")}</Link>
        </div>
        <div className="mt-2">
          © {new Date().getFullYear()} UniSphere
        </div>
      </div>
    </aside>
  );
}