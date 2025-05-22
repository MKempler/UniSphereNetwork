import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "next-themes";
import "./lib/i18n"; // Initialize i18next
import { UserProvider } from '@/lib/UserContext';

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <UserProvider>
      <App />
      </UserProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
