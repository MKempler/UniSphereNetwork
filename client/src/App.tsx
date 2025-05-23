import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Profile from "@/pages/profile";
import Followers from "@/pages/followers";
import Following from "@/pages/following";
import Debug from "@/pages/debug";
import CircuitsIndexPage from "@/pages/circuits/index";
import CircuitDetailPage from "@/pages/circuits/[id]";
import CircuitCreatePage from "@/pages/circuits/create";
import PostDetailPage from "@/pages/post/[id]";
import Notifications from "@/pages/notifications";
import Trending from "@/pages/trending";
import HashtagPosts from "@/pages/hashtag-posts";
import { useEffect, useState } from "react";
import { TranslationProvider } from "@/contexts/TranslationContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/profile/:username?" component={Profile} />
      <Route path="/followers/:username" component={Followers} />
      <Route path="/following/:username" component={Following} />
      <Route path="/circuits" component={CircuitsIndexPage} />
      <Route path="/circuits/create" component={CircuitCreatePage} />
      <Route path="/circuits/:id" component={CircuitDetailPage} />
      <Route path="/post/:id" component={PostDetailPage} />
      <Route path="/posts/hashtag/:hashtag" component={HashtagPosts} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/trending" component={Trending} />
      <Route path="/debug" component={Debug} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Avoid hydration mismatch by rendering nothing until client-side
  }

  return (
    <TooltipProvider>
      <TranslationProvider>
        <div className="min-h-screen bg-background text-foreground dark:bg-dark-bg">
          <Toaster />
          <Router />
        </div>
      </TranslationProvider>
    </TooltipProvider>
  );
}

export default App;
