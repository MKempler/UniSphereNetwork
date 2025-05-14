import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";

export default function MobileNavigation() {
  const { t } = useTranslation();
  const [location] = useLocation();

  const { data: currentUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
  });

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-medium flex justify-around items-center p-2 z-40">
      <Link href="/">
        <a className={`p-2 ${location === "/" ? "text-primary" : "text-neutral-dark"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </a>
      </Link>
      
      <Link href="/explore">
        <a className={`p-2 ${location === "/explore" ? "text-primary" : "text-neutral-dark"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        </a>
      </Link>
      
      <Link href="/create">
        <a className="p-2 text-neutral-dark">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </a>
      </Link>
      
      <Link href="/notifications">
        <a className={`p-2 ${location === "/notifications" ? "text-primary" : "text-neutral-dark"} relative`}>
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
      
      <Link href={currentUser ? `/profile/${currentUser.username}` : "/login"}>
        <a className={`p-2 ${location.startsWith("/profile") ? "text-primary" : "text-neutral-dark"}`}>
          {currentUser ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentUser.profileImage} alt={currentUser.name} />
              <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </a>
      </Link>
    </div>
  );
}
