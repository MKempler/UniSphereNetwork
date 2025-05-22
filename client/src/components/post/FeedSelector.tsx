import { useState } from "react";
import { useTranslation } from "react-i18next";

interface FeedSelectorProps {
  onFeedChange: (feedType: string) => void;
}

export default function FeedSelector({ onFeedChange }: FeedSelectorProps) {
  const { t } = useTranslation();
  const [activeFeed, setActiveFeed] = useState("for-you");

  const handleFeedChange = (feedType: string) => {
    setActiveFeed(feedType);
    onFeedChange(feedType);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-2">
      <div className="flex gap-2 mt-1">
        <button 
          className={`px-4 py-1 rounded-full font-medium transition shadow-sm focus-visible:outline-primary-500 ${
            activeFeed === "for-you" 
              ? "bg-primary-500 text-white"
              : "border border-primary-500 text-primary-500 bg-white hover:bg-primary-50"
          }`}
          onClick={() => handleFeedChange("for-you")}
        >
          {t("feed.for_you")}
        </button>
        <button 
          className={`px-4 py-1 rounded-full font-medium transition shadow-sm focus-visible:outline-primary-500 ${
            activeFeed === "following" 
              ? "bg-primary-500 text-white"
              : "border border-primary-500 text-primary-500 bg-white hover:bg-primary-50"
          }`}
          onClick={() => handleFeedChange("following")}
        >
          {t("feed.following")}
        </button>
        <button 
          className={`px-4 py-1 rounded-full font-medium transition shadow-sm focus-visible:outline-primary-500 ${
            activeFeed === "circuits" 
              ? "bg-primary-500 text-white"
              : "border border-primary-500 text-primary-500 bg-white hover:bg-primary-50"
          }`}
          onClick={() => handleFeedChange("circuits")}
        >
          {t("feed.circuits")}
        </button>
        <button 
          className={`px-4 py-1 rounded-full font-medium transition shadow-sm focus-visible:outline-primary-500 ${
            activeFeed === "discover" 
              ? "bg-primary-500 text-white"
              : "border border-primary-500 text-primary-500 bg-white hover:bg-primary-50"
          }`}
          onClick={() => handleFeedChange("discover")}
        >
          {t("nav.discover")}
        </button>
      </div>
      
      <div className="flex items-center mt-2 px-3 py-2">
        <div className="flex-1">
          <h3 className="font-semibold text-neutral-dark">{t("feed.global")}</h3>
          <p className="text-xs text-neutral-dark opacity-75">{t("feed.global_description")}</p>
        </div>
        <button className="p-1.5 text-neutral-dark rounded-full hover:bg-neutral-light transition-colors" title="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button className="p-1.5 text-neutral-dark rounded-full hover:bg-neutral-light transition-colors ml-1" title="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
