import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for existing session on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = localStorage.getItem('sessionId');
      console.log("Checking auth with sessionId:", sessionId);
      
      if (sessionId) {
        try {
          const response = await fetch('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${sessionId}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log("User data loaded:", userData);
            setUser(userData);
          } else {
            console.log("Auth check failed, clearing session");
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error("Auth check error:", error);
          localStorage.removeItem('sessionId');
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // Login function
  const login = useCallback(async (credentials) => {
    try {
      console.log("Attempting login with:", credentials);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Login failed:", errorText);
        throw new Error(errorText);
      }
      
      const data = await response.json();
      console.log("Login success, data:", data);
      
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
        console.log("Session ID saved to localStorage");
        
        if (data.user) {
          setUser(data.user);
          console.log("User data updated in state");
        } else {
          console.warn("No user data in response");
        }
        
        return data;
      } else {
        console.error("No sessionId in response");
        throw new Error("No session ID received");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);
  
  // Logout function
  const logout = useCallback(async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionId}`
          }
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    
    localStorage.removeItem('sessionId');
    setUser(null);
    console.log("Logged out, session cleared");
  }, []);
  
  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  };
}