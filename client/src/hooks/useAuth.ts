import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (sessionId: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('sessionId'));
  const queryClient = useQueryClient();

  // Store the authentication token in headers for all requests
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/users/me'],
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const login = (newSessionId: string, userData: User) => {
    setSessionId(newSessionId);
    queryClient.setQueryData(['/api/users/me'], userData);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: sessionId ? { 'Authorization': `Bearer ${sessionId}` } : {},
      });
    } finally {
      setSessionId(null);
      queryClient.setQueryData(['/api/users/me'], null);
      queryClient.invalidateQueries();
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading: isLoading && !!sessionId, 
        login, 
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}