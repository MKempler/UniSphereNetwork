import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Check if we have a session on load
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
          },
          credentials: 'include'
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setError(null);
        } else {
          // Clear any invalid session
          localStorage.removeItem('sessionId');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        localStorage.removeItem('sessionId');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First login attempt
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      if (!loginRes.ok) {
        const errorData = await loginRes.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      const loginData = await loginRes.json();
      localStorage.setItem('sessionId', loginData.sessionId);
      
      // Verify the session is working by making a request to /api/users/me
      // This helps catch cases where the session might not be fully established
      let verifySuccess = false;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (!verifySuccess && retryCount < maxRetries) {
        try {
          // Short delay to give the session time to be fully established in Redis
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const verifyRes = await fetch('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${loginData.sessionId}`
            },
            credentials: 'include'
          });
          
          if (verifyRes.ok) {
            const userData = await verifyRes.json();
            setUser(userData);
            verifySuccess = true;
            console.log('Session verified successfully');
          } else {
            console.log(`Session verification failed (attempt ${retryCount + 1})`);
            retryCount++;
          }
        } catch (err) {
          console.error(`Session verification error (attempt ${retryCount + 1}):`, err);
          retryCount++;
        }
      }
      
      // If we couldn't verify after retries, we'll try one final login
      if (!verifySuccess) {
        console.log('Retrying login after session verification failures');
        const retryLoginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
          credentials: 'include'
        });
        
        if (retryLoginRes.ok) {
          const retryData = await retryLoginRes.json();
          localStorage.setItem('sessionId', retryData.sessionId);
          setUser(retryData.user);
          console.log('Login retry succeeded');
        } else {
          throw new Error('Login retry failed');
        }
      }
      
      queryClient.invalidateQueries();
      return loginData;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      setUser(null);
      localStorage.removeItem('sessionId');
      throw err; // Rethrow to let the login component handle errors
    } finally {
      setIsLoading(false);
    }
  }, [navigate, queryClient]);
  
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionId}`
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('sessionId');
      setUser(null);
      setIsLoading(false);
      queryClient.clear();
      navigate('/login');
    }
  }, [navigate, queryClient]);
  
  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };
}