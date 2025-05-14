import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/simpleAuth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function Debug() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('test');
  const [password, setPassword] = useState('password');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');

  // Check for session ID in localStorage on component mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    setSessionId(storedSessionId);
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      setApiResponse('Logging in...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));

      if (response.ok && data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('sessionId', data.sessionId);
        toast({
          title: 'Login successful',
          description: `SessionId: ${data.sessionId.substring(0, 10)}...`,
        });
      }
    } catch (error) {
      setApiResponse(`Error: ${error.message}`);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRegister = async () => {
    try {
      setApiResponse('Registering...');
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          email: `${username}@example.com`,
          name: username,
          profileImage: '/default-profile.png',
          bio: 'Test user',
          language: 'en',
        }),
      });

      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));

      if (response.ok) {
        toast({
          title: 'Registration successful',
          description: 'User registered successfully',
        });
      }
    } catch (error) {
      setApiResponse(`Error: ${error.message}`);
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleVerifyAuth = async () => {
    try {
      setTestResult('Testing authentication...');
      const stored = localStorage.getItem('sessionId');
      
      if (!stored) {
        setTestResult('No session ID in localStorage');
        return;
      }
      
      const response = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${stored}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(JSON.stringify(data, null, 2));
        toast({
          title: 'Authentication successful',
          description: `Logged in as ${data.username}`,
        });
      } else {
        const text = await response.text();
        setTestResult(`Authentication failed: ${response.status} - ${text}`);
        toast({
          title: 'Authentication failed',
          description: `Status: ${response.status}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      setTestResult(`Error: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      const stored = localStorage.getItem('sessionId');
      setApiResponse('Logging out...');
      
      if (!stored) {
        setApiResponse('No session ID in localStorage to logout');
        return;
      }
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stored}`,
        },
      });

      const data = await response.text();
      setApiResponse(data);
      
      // Clear local state
      localStorage.removeItem('sessionId');
      setSessionId(null);
      
      // Call the auth hook logout
      logout();
      
      toast({
        title: 'Logout successful',
        description: 'Session cleared',
      });
    } catch (error) {
      setApiResponse(`Error: ${error.message}`);
    }
  };

  const handleClearSession = () => {
    localStorage.removeItem('sessionId');
    setSessionId(null);
    setApiResponse('Session cleared from localStorage');
    toast({
      title: 'Session cleared',
      description: 'Session ID removed from localStorage',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Current State</h3>
              <p>
                <strong>isAuthenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}<br />
                <strong>SessionId in localStorage:</strong> {sessionId ? `${sessionId.substring(0, 10)}...` : 'None'}<br />
                <strong>Current User:</strong> {user ? user.username : 'None'}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Test Credentials</h3>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                  />
                  <Input 
                    placeholder="Password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleLogin}>Test Direct Login</Button>
                <Button onClick={handleRegister} variant="outline">Register User</Button>
                <Button onClick={handleVerifyAuth} variant="secondary">Verify Auth</Button>
                <Button onClick={handleLogout} variant="destructive">Logout</Button>
                <Button onClick={handleClearSession} variant="ghost">Clear Session</Button>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium mb-2">API Response</h3>
              <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60">
                <pre>{apiResponse || 'No API response yet'}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Auth Test Result</h3>
              <div className="bg-gray-100 p-3 rounded-md overflow-auto max-h-60">
                <pre>{testResult || 'No test run yet'}</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}