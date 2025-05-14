import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { User, Community } from "@/types";

export default function LeftSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();

  const { data: currentUser } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
  });

  const { data: communities } = useQuery<Community[]>({
    queryKey: ["/api/communities/user"],
    enabled: !!currentUser,
  });

  if (!currentUser) return null;

  const navItems = [
    { 
      path: "/", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>,
      label: t("nav.home")
    },
    { 
      path: `/profile/${currentUser.username}`, 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>,
      label: t("nav.profile")
    },
    { 
      path: "/explore", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>,
      label: t("nav.explore")
    },
    { 
      path: "/circuits", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>,
      label: t("nav.circuits")
    },
    { 
      path: "/messages", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>,
      label: t("nav.messages")
    },
    { 
      path: "/saved", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>,
      label: t("nav.saved")
    },
    { 
      path: "/settings", 
      icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>,
      label: t("nav.settings")
    },
  ];

  return (
    <aside className="hidden md:block md:col-span-3 space-y-4 h-fit sticky top-20">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={currentUser.profileImage} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <h3 className="font-semibold text-neutral-dark">{currentUser.name}</h3>
            <p className="text-sm text-neutral-dark opacity-75">@{currentUser.username}</p>
          </div>
        </div>
        
        <div className="flex justify-between text-sm mb-2">
          <div>
            <span className="font-bold">{currentUser.following}</span> 
            <span className="text-neutral-dark opacity-75"> Following</span>
          </div>
          <div>
            <span className="font-bold">{currentUser.followers}</span> 
            <span className="text-neutral-dark opacity-75"> Followers</span>
          </div>
        </div>
        
        <nav className="mt-6 space-y-1.5">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a className={`flex items-center p-2 rounded-lg ${location === item.path ? 'bg-primary bg-opacity-10 text-primary' : 'text-neutral-dark hover:bg-neutral-light'} transition-colors`}>
                {item.icon}
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
      </div>

      {communities && communities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-neutral-dark mb-3">{t("sidebar.communities")}</h3>
          <ul className="space-y-2">
            {communities.map((community) => (
              <li key={community.id} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm mr-2 bg-${community.color || 'primary'}`}
                >
                  {community.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-dark">{community.name}</p>
                  <p className="text-xs text-neutral-dark opacity-75">
                    {community.memberCount.toLocaleString()} members
                  </p>
                </div>
              </li>
            ))}
            <li className="mt-2">
              <Link href="/communities/browse">
                <a className="text-sm text-primary hover:underline">
                  {t("sidebar.browse_communities")} →
                </a>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </aside>
  );
}
