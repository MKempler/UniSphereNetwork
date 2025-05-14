// A simple authentication hook for debugging purposes
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log("Checking auth with sessionId:", sessionId);
      if (sessionId) {
        try {
          setIsLoading(true);
          const headers = { 'Authorization': `Bearer ${sessionId}` };
          console.log("Sending auth request with headers:", headers);
          const response = await fetch('/api/users/me', { headers });
          
          if (response.ok) {
            const userData = await response.json();
            console.log("Successfully retrieved user data:", userData);
            setUser(userData);
          } else {
            console.error("Auth check failed:", await response.text());
            // Invalid session, clear it
            localStorage.removeItem('sessionId');
            setSessionId(null);
          }
        } catch (error) {
          console.error("Auth check error:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    checkAuth();
  }, [sessionId]);
  
  const login = (newSessionId, userData) => {
    console.log("Login called with sessionId:", newSessionId, "and user:", userData);
    localStorage.setItem('sessionId', newSessionId);
    setSessionId(newSessionId);
    setUser(userData);
  };
  
  const logout = async () => {
    console.log("Logout called");
    try {
      if (sessionId) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionId}` },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem('sessionId');
      setSessionId(null);
      setUser(null);
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