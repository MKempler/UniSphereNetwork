import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));
  const queryClient = useQueryClient();
  
  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (sessionId) {
        try {
          const headers = { 'Authorization': `Bearer ${sessionId}` };
          const response = await fetch('/api/users/me', { headers });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            queryClient.setQueryData(['/api/users/me'], userData);
          } else {
            // Invalid session, clear it
            setSessionId(null);
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [sessionId, queryClient]);
  
  // Update localStorage when sessionId changes
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);
  
  const login = (newSessionId, userData) => {
    setSessionId(newSessionId);
    setUser(userData);
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
      setUser(null);
      queryClient.setQueryData(['/api/users/me'], null);
      queryClient.invalidateQueries();
    }
  };
  
  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    sessionId
  };
}