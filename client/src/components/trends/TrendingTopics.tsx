import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Trend } from "@/types";

interface TrendingTopicsProps {
  trends: Trend[];
}

export default function TrendingTopics({ trends }: TrendingTopicsProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-neutral-dark">{t("sidebar.trending")}</h3>
        <button className="text-neutral-dark p-1 rounded-full hover:bg-neutral-light transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {trends.map((trend) => (
          <Link key={trend.id} href={`/explore/trends/${trend.tag.replace('#', '')}`}>
            <a className="block p-2 hover:bg-neutral-light rounded-lg transition-colors">
              <p className="text-xs text-neutral-dark opacity-75">{trend.category}</p>
              <p className="font-medium text-neutral-dark">{trend.tag}</p>
              <p className="text-xs text-neutral-dark opacity-75">{trend.postCount.toLocaleString()} posts</p>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
