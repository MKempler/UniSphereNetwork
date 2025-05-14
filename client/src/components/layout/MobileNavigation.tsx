import { Link, useLocation } from "wouter";
import { Home, Globe, Shield, Bell, User } from "lucide-react";
import { useAuth } from "@/hooks/simpleAuth.js";
import { useTranslation } from "react-i18next";

export default function MobileNavigation() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-neutral-300 dark:border-neutral-800 block sm:hidden z-50">
      <div className="grid grid-cols-5 gap-1">
        <Link href="/">
          <a className={`flex flex-col items-center justify-center py-2 ${
            location === "/" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"
          }`}>
            <Home className="h-6 w-6" />
            <span className="text-xs mt-1">{t("nav.home")}</span>
          </a>
        </Link>
        
        <Link href="/explore">
          <a className={`flex flex-col items-center justify-center py-2 ${
            location === "/explore" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"
          }`}>
            <Globe className="h-6 w-6" />
            <span className="text-xs mt-1">{t("nav.explore")}</span>
          </a>
        </Link>
        
        <Link href="/circuits">
          <a className={`flex flex-col items-center justify-center py-2 ${
            location === "/circuits" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"
          }`}>
            <Shield className="h-6 w-6" />
            <span className="text-xs mt-1">{t("nav.circuits")}</span>
          </a>
        </Link>
        
        <Link href="/notifications">
          <a className={`flex flex-col items-center justify-center py-2 ${
            location === "/notifications" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"
          } relative`}>
            <Bell className="h-6 w-6" />
            {currentUser?.unreadNotifications && currentUser.unreadNotifications > 0 && (
              <span className="absolute top-1 right-1/4 bg-accent-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {currentUser.unreadNotifications > 9 ? '9+' : currentUser.unreadNotifications}
              </span>
            )}
            <span className="text-xs mt-1">{t("nav.notifications")}</span>
          </a>
        </Link>
        
        <Link href={currentUser ? `/profile/${currentUser.username}` : "/login"}>
          <a className={`flex flex-col items-center justify-center py-2 ${
            location.startsWith("/profile") ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"
          }`}>
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">{currentUser ? t("nav.profile") : t("auth.login")}</span>
          </a>
        </Link>
      </div>
    </div>
  );
}