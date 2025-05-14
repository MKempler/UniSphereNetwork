import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Circuit, Trend, User } from "@/types";
import CircuitItem from "@/components/circuits/CircuitItem";
import TrendingTopics from "@/components/trends/TrendingTopics";
import SuggestedUsers from "@/components/users/SuggestedUsers";

export default function RightSidebar() {
  const { t } = useTranslation();

  const { data: circuits } = useQuery<Circuit[]>({
    queryKey: ["/api/circuits/popular"],
  });

  const { data: trends } = useQuery<Trend[]>({
    queryKey: ["/api/trends"],
  });

  const { data: suggestedUsers } = useQuery<User[]>({
    queryKey: ["/api/users/suggested"],
  });

  return (
    <aside className="hidden md:block md:col-span-3 space-y-4 h-fit sticky top-20">
      {/* Popular Circuits */}
      {circuits && circuits.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-neutral-dark">{t("sidebar.popular_circuits")}</h3>
            <Link href="/circuits/explore">
              <a className="text-primary text-sm hover:underline">{t("sidebar.see_all")}</a>
            </Link>
          </div>
          
          <ul className="space-y-3">
            {circuits.map(circuit => (
              <CircuitItem key={circuit.id} circuit={circuit} />
            ))}
            <li className="flex justify-center mt-4">
              <Link href="/circuits/create">
                <a className="flex items-center text-primary hover:underline">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t("sidebar.create_circuit")}
                </a>
              </Link>
            </li>
          </ul>
        </div>
      )}

      {/* Trending Topics */}
      {trends && trends.length > 0 && (
        <TrendingTopics trends={trends} />
      )}

      {/* Who to follow */}
      {suggestedUsers && suggestedUsers.length > 0 && (
        <SuggestedUsers users={suggestedUsers} />
      )}

      {/* Footer Info */}
      <div className="p-4 text-xs text-neutral-dark opacity-75">
        <div className="flex flex-wrap gap-2 mb-2">
          <Link href="/about"><a className="hover:underline">{t("footer.about")}</a></Link>
          <Link href="/help"><a className="hover:underline">{t("footer.help")}</a></Link>
          <Link href="/terms"><a className="hover:underline">{t("footer.terms")}</a></Link>
          <Link href="/privacy"><a className="hover:underline">{t("footer.privacy")}</a></Link>
          <Link href="/cookies"><a className="hover:underline">{t("footer.cookies")}</a></Link>
          <Link href="/accessibility"><a className="hover:underline">{t("footer.accessibility")}</a></Link>
        </div>
        <p>{t("footer.copyright")}</p>
      </div>
    </aside>
  );
}
