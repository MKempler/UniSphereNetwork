import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, Home, Globe, Shield, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/simpleAuth.js";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { User } from "@/types";

export default function Header() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user: currentUser, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-neutral-300 dark:border-neutral-800">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary-500">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 1010.562-.766 4.5 4.5 0 01-1.318 1.357L14.25 7.5l.165.33a.809.809 0 01-1.086 1.085l-.604-.302a1.125 1.125 0 00-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 01-2.288 4.04l-.723.724a1.125 1.125 0 01-1.298.21l-.153-.076a1.125 1.125 0 01-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 01-.21-1.298L9.75 12l-1.64-1.64a6 6 0 01-1.676-3.257l-.172-1.03z" clipRule="evenodd" />
                </svg>
                <span className="text-2xl font-bold text-primary-500 ml-1 hidden md:inline">
                  {t("app.name")}
                </span>
              </a>
            </Link>
          </div>

          <div className="relative hidden md:block ml-4">
            <input 
              type="text" 
              placeholder={t("nav.search")}
              className="bg-neutral-100 dark:bg-neutral-800 rounded-full py-2 pl-10 pr-4 w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Search className="h-5 w-5 text-neutral-600 dark:text-neutral-300 absolute left-3 top-2.5" />
          </div>
        </div>

        <nav className="flex items-center space-x-1 md:space-x-3">
          <Link href="/">
            <a className={`p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${location === "/" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"}`}>
              <Home className="h-6 w-6" />
            </a>
          </Link>
          <Link href="/explore">
            <a className={`p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${location === "/explore" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"}`}>
              <Globe className="h-6 w-6" />
            </a>
          </Link>
          <Link href="/circuits">
            <a className={`p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${location === "/circuits" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"}`}>
              <Shield className="h-6 w-6" />
            </a>
          </Link>
          <Link href="/notifications">
            <a className={`p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${location === "/notifications" ? "text-primary-500" : "text-neutral-600 dark:text-neutral-300"} relative`}>
              <Bell className="h-6 w-6" />
              {currentUser?.unreadNotifications && currentUser.unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 bg-accent-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {currentUser.unreadNotifications > 9 ? '9+' : currentUser.unreadNotifications}
                </span>
              )}
            </a>
          </Link>
          
          <ThemeToggle />
          
          <div className="relative group">
            {currentUser ? (
              <Link href={`/profile/${currentUser.username}`}>
                <a className="flex items-center focus:outline-none">
                  <Avatar className="w-8 h-8 border-2 border-neutral-100 dark:border-neutral-800">
                    <AvatarImage src={currentUser.profileImage} alt={currentUser.name} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </a>
              </Link>
            ) : (
              <Link href="/login">
                <a className="flex items-center focus:outline-none text-sm font-medium text-primary-500 px-3 py-1.5 border border-primary-500 rounded-full hover:bg-primary-500 hover:text-white transition-colors">
                  {t("auth.login")}
                </a>
              </Link>
            )}
            
            {currentUser && (
              <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg py-1 z-10 hidden group-hover:block dark:border dark:border-neutral-800">
                <Link href={`/profile/${currentUser.username}`}>
                  <a className="block px-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800">{t("nav.profile")}</a>
                </Link>
                <Link href="/settings">
                  <a className="block px-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800">{t("nav.settings")}</a>
                </Link>
                <Link href="/help">
                  <a className="block px-4 py-2 text-sm text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800">{t("footer.help")}</a>
                </Link>
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" 
                  onClick={() => {
                    logout();
                    window.location.href = '/';
                  }}
                >
                  {t("auth.logout")}
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
