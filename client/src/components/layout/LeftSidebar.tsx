import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Home, 
  Globe, 
  Shield, 
  Bell, 
  User, 
  Settings, 
  HelpCircle, 
  MessageCircle, 
  Users, 
  Hash
} from "lucide-react";
import { useAuth } from "@/hooks/simpleAuth.js";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LeftSidebar() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-neutral-300 dark:lg:border-neutral-800 lg:pt-16 lg:bg-background">
      <div className="flex flex-col px-4 py-6 h-full justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 px-3">{t("nav.main")}</p>
          
          <Link href="/">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/" 
                ? "bg-primary-500 text-white font-medium" 
                : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}>
              <Home className="h-5 w-5 mr-3" />
              {t("nav.home")}
            </a>
          </Link>
          
          <Link href="/explore">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/explore" 
                ? "bg-primary-500 text-white font-medium" 
                : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}>
              <Globe className="h-5 w-5 mr-3" />
              {t("nav.explore")}
            </a>
          </Link>
          
          <Link href="/notifications">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/notifications" 
                ? "bg-primary-500 text-white font-medium" 
                : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            } relative`}>
              <Bell className="h-5 w-5 mr-3" />
              {t("nav.notifications")}
              {currentUser?.unreadNotifications && currentUser.unreadNotifications > 0 && (
                <span className="ml-auto bg-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {currentUser.unreadNotifications > 9 ? '9+' : currentUser.unreadNotifications}
                </span>
              )}
            </a>
          </Link>
          
          <Link href="/messages">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/messages" 
                ? "bg-primary-500 text-white font-medium" 
                : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}>
              <MessageCircle className="h-5 w-5 mr-3" />
              {t("nav.messages")}
            </a>
          </Link>
          
          {currentUser && (
            <Link href={`/profile/${currentUser.username}`}>
              <a className={`flex items-center px-3 py-2 text-base rounded-md ${
                location.startsWith("/profile") 
                  ? "bg-primary-500 text-white font-medium" 
                  : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}>
                <User className="h-5 w-5 mr-3" />
                {t("nav.profile")}
              </a>
            </Link>
          )}
          
          <div className="pt-4 pb-2">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 px-3">{t("nav.discover")}</p>
          </div>
          
          <Link href="/circuits">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/circuits" 
                ? "bg-primary-500 text-white font-medium" 
                : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}>
              <Shield className="h-5 w-5 mr-3" />
              {t("nav.circuits")}
            </a>
          </Link>
          
          <Link href="/communities">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/communities" 
                ? "bg-primary-500 text-white font-medium" 
                : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}>
              <Users className="h-5 w-5 mr-3" />
              {t("nav.communities")}
            </a>
          </Link>
          
          <Link href="/trending">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/trending" 
                ? "bg-primary-500 text-white font-medium" 
                : "text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}>
              <Hash className="h-5 w-5 mr-3" />
              {t("nav.trending")}
            </a>
          </Link>
        </div>
        
        <div className="space-y-1 mt-auto">
          <div className="flex items-center px-3 pt-2 justify-between">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{t("nav.theme")}</p>
            <ThemeToggle />
          </div>
          
          <Link href="/settings">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/settings" 
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 font-medium" 
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100"
            }`}>
              <Settings className="h-5 w-5 mr-3" />
              {t("nav.settings")}
            </a>
          </Link>
          
          <Link href="/help">
            <a className={`flex items-center px-3 py-2 text-base rounded-md ${
              location === "/help" 
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 font-medium" 
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100"
            }`}>
              <HelpCircle className="h-5 w-5 mr-3" />
              {t("footer.help")}
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}