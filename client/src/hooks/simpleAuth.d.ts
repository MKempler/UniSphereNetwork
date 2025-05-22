declare module '@/hooks/simpleAuth' {
  // Define a basic User type, can be expanded later
  interface AuthUser {
    id: number;
    username: string;
    name?: string;
    email?: string;
    did?: string | null;
    // Add other user properties as needed by the app
  }

  interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    login: (credentials: { username: string; password: string }) => Promise<{ user: AuthUser; sessionId: string; [key: string]: any }>;
    logout: () => Promise<void>;
    setAuthState: (userData: AuthUser, sessionId: string) => void;
    isAuthenticated: boolean;
  }

  export function useAuth(): AuthContextType;
} 