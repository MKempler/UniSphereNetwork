import { Home, Globe, Bell, MessageCircle, Shield, Users, Hash, Settings, HelpCircle } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/simpleAuth.js";

const navItems = [
  { label: "nav.home", icon: Home, href: "/", section: "main" },
  { label: "nav.explore", icon: Globe, href: "/explore", section: "main" },
  { label: "nav.notifications", icon: Bell, href: "/notifications", section: "main" },
  { label: "nav.messages", icon: MessageCircle, href: "/messages", section: "main" },
  { label: "nav.circuits", icon: Shield, href: "/circuits", section: "discover" },
  { label: "nav.communities", icon: Users, href: "/communities", section: "discover" },
  { label: "nav.trending", icon: Hash, href: "/trending", section: "discover" },
];

const bottomItems = [
  { label: "nav.settings", icon: Settings, href: "/settings" },
  { label: "nav.help", icon: HelpCircle, href: "/help" },
];

const SideNav = () => {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="w-[240px] h-screen sticky top-0 flex flex-col justify-between bg-background border-r border-neutral-200 dark:border-dark-bg/40 py-6" aria-label="Sidebar">
      <div>
        <div className="mb-4 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-100 uppercase tracking-wider">{t("nav.main")}</div>
        <ul className="space-y-1 mb-6">
          {navItems.filter(i => i.section === "main").map(({ label, icon: Icon, href }) => (
            <li key={href}>
              <Link href={href} className={`group flex items-center px-4 py-2 rounded-lg transition-colors focus-visible:outline-primary-500 ${location === href ? "bg-primary-500/10 text-primary-600" : "text-neutral-700 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-dark-bg/40"}`} aria-label={t(label)}>
                <Icon className={`w-5 h-5 mr-3 transition-colors ${location === href ? "text-primary-500" : "group-hover:text-primary-600 group-active:text-primary-600"}`} />
                  <span>{t(label)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mb-4 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-100 uppercase tracking-wider">{t("nav.discover")}</div>
        <ul className="space-y-1 mb-6">
          {navItems.filter(i => i.section === "discover").map(({ label, icon: Icon, href }) => (
            <li key={href}>
              <Link href={href} className={`group flex items-center px-4 py-2 rounded-lg transition-colors focus-visible:outline-primary-500 ${location === href ? "bg-primary-500/10 text-primary-600" : "text-neutral-700 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-dark-bg/40"}`} aria-label={t(label)}>
                <Icon className={`w-5 h-5 mr-3 transition-colors ${location === href ? "text-primary-500" : "group-hover:text-primary-600 group-active:text-primary-600"}`} />
                  <span>{t(label)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-1 px-4">
        <ThemeToggle />
        {bottomItems.map(({ label, icon: Icon, href }) => (
          <Link key={href} href={href} className="group flex items-center py-2 rounded-lg text-neutral-600 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-dark-bg/40 transition-colors focus-visible:outline-primary-500" aria-label={t(label)}>
            <Icon className="w-5 h-5 mr-3 group-hover:text-primary-600 group-active:text-primary-600 transition-colors" />
              <span>{t(label)}</span>
          </Link>
        ))}
        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-dark-bg/40">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link href={`/profile/${user.username}`} className="flex items-center group">
                  <Avatar className="h-10 w-10 mr-2">
                    <AvatarImage src={user.profileImage} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-primary-500 transition-colors">{user.name}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-300">@{user.username}</span>
                  </div>
              </Link>
              <button
                onClick={logout}
                className="ml-auto text-xs text-primary-500 hover:underline focus-visible:outline-primary-500"
                aria-label="Logout"
              >
                {t("auth.logout")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" className="w-full text-center rounded bg-primary-500 text-white py-2 font-medium hover:bg-primary-600 transition-colors">{t("auth.login")}</Link>
              <Link href="/register" className="w-full text-center rounded border border-primary-500 text-primary-500 py-2 font-medium hover:bg-primary-500 hover:text-white transition-colors">{t("auth.register")}</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default SideNav;