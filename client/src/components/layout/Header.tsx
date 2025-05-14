import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";

export default function Header() {
  const { t } = useTranslation();
  const [location] = useLocation();

  const { data: currentUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-medium">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary">
                  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 1010.562-.766 4.5 4.5 0 01-1.318 1.357L14.25 7.5l.165.33a.809.809 0 01-1.086 1.085l-.604-.302a1.125 1.125 0 00-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 01-2.288 4.04l-.723.724a1.125 1.125 0 01-1.298.21l-.153-.076a1.125 1.125 0 01-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 01-.21-1.298L9.75 12l-1.64-1.64a6 6 0 01-1.676-3.257l-.172-1.03z" clipRule="evenodd" />
                </svg>
                <span className="text-2xl font-bold text-primary ml-1 hidden md:inline">
                  {t("app.name")}
                </span>
              </a>
            </Link>
          </div>

          <div className="relative hidden md:block ml-4">
            <input 
              type="text" 
              placeholder={t("nav.search")}
              className="bg-neutral-light rounded-full py-2 pl-10 pr-4 w-64 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search className="h-5 w-5 text-neutral-dark absolute left-3 top-2.5" />
          </div>
        </div>

        <nav className="flex items-center space-x-1 md:space-x-3">
          <Link href="/">
            <a className={`p-2 rounded-full hover:bg-neutral-light transition-colors ${location === "/" ? "text-primary" : "text-neutral-dark"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </a>
          </Link>
          <Link href="/explore">
            <a className={`p-2 rounded-full hover:bg-neutral-light transition-colors ${location === "/explore" ? "text-primary" : "text-neutral-dark"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </a>
          </Link>
          <Link href="/circuits">
            <a className={`p-2 rounded-full hover:bg-neutral-light transition-colors ${location === "/circuits" ? "text-primary" : "text-neutral-dark"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </a>
          </Link>
          <Link href="/notifications">
            <a className={`p-2 rounded-full hover:bg-neutral-light transition-colors ${location === "/notifications" ? "text-primary" : "text-neutral-dark"} relative`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {currentUser?.unreadNotifications && currentUser.unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 bg-error text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {currentUser.unreadNotifications > 9 ? '9+' : currentUser.unreadNotifications}
                </span>
              )}
            </a>
          </Link>
          
          <div className="relative group">
            {currentUser ? (
              <Link href={`/profile/${currentUser.username}`}>
                <a className="flex items-center focus:outline-none">
                  <Avatar className="w-8 h-8 border-2 border-white">
                    <AvatarImage src={currentUser.profileImage} alt={currentUser.name} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </a>
              </Link>
            ) : (
              <Link href="/login">
                <a className="flex items-center focus:outline-none text-sm font-medium text-primary px-3 py-1.5 border border-primary rounded-full">
                  {t("auth.login")}
                </a>
              </Link>
            )}
            
            {currentUser && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <Link href={`/profile/${currentUser.username}`}>
                  <a className="block px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light">{t("nav.profile")}</a>
                </Link>
                <Link href="/settings">
                  <a className="block px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light">{t("nav.settings")}</a>
                </Link>
                <Link href="/help">
                  <a className="block px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light">{t("footer.help")}</a>
                </Link>
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-error hover:bg-neutral-light" 
                  onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST' })
                      .then(() => window.location.href = '/');
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
