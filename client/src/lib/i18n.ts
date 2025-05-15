import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Resources are loaded on-demand from the server
// This is just the initialization with English as fallback

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: {
          // Common
          "app.name": "UniSphere",
          "app.tagline": "A globally unified social network",
          
          // Navigation
          "nav.home": "Home",
          "nav.explore": "Explore",
          "nav.circuits": "Social Circuits",
          "nav.notifications": "Notifications",
          "nav.profile": "Profile",
          "nav.settings": "Settings",
          "nav.messages": "Messages",
          "nav.saved": "Saved",
          "nav.search": "Search UniSphere",
          "nav.main": "Main",
          "nav.discover": "Discover",
          "nav.theme": "Theme",
          "nav.communities": "Communities",
          "nav.trending": "Trending",
          
          // Auth
          "auth.login": "Login",
          "auth.register": "Register",
          "auth.logout": "Sign out",
          "auth.username": "Username",
          "auth.password": "Password",
          "auth.email": "Email",
          "auth.fullname": "Full Name",
          
          // Post
          "post.create": "What's happening in your world?",
          "post.post": "Post",
          "post.reply": "Reply",
          "post.repost": "Repost",
          "post.like": "Like",
          "post.share": "Share",
          "post.save": "Save",
          "post.translate": "Translated from",
          "post.show_original": "Show original",
          "post.show_translation": "Show translation",
          
          // Feed
          "feed.for_you": "For You",
          "feed.following": "Following",
          "feed.circuits": "Circuits",
          "feed.global": "Global Feed",
          "feed.global_description": "Popular posts from around the world",
          "feed.load_more": "Load more posts",
          "feed.empty.title": "No posts yet",
          "feed.empty.default": "There are no posts to display.",
          
          // Sidebar
          "sidebar.communities": "Your Community Nodes",
          "sidebar.browse_communities": "Browse more communities",
          "sidebar.popular_circuits": "Popular Circuits",
          "sidebar.see_all": "See all",
          "sidebar.create_circuit": "Create your own circuit",
          "sidebar.trending": "Trending Topics",
          "sidebar.who_to_follow": "Who to follow",
          "sidebar.show_more": "Show more",
          
          // Footer
          "footer.about": "About",
          "footer.help": "Help Center",
          "footer.terms": "Terms of Service",
          "footer.privacy": "Privacy Policy",
          "footer.cookies": "Cookie Policy",
          "footer.accessibility": "Accessibility",
          "footer.copyright": "© 2023 UniSphere",
          
          // Trending
          "trending.title": "Trending Topics",
          "trending.empty": "No trending topics right now.",
          "trending.showMore": "Show more trends",
          
          // Suggested
          "suggested.title": "Suggested Users",
          "suggested.empty": "No suggestions available.",
          "suggested.showMore": "Show more suggestions"
        }
      }
    }
  });

export default i18n;
