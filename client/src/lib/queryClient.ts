import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const sessionId = localStorage.getItem('sessionId');
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
    console.log(`API Request to ${url} with sessionId: ${sessionId}`);
  } else {
    console.log(`API Request to ${url} without sessionId`);
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Special handling for login success
  if (url.includes('/api/auth/login') && res.ok) {
    const responseClone = res.clone();
    const data = await responseClone.json();
    if (data.sessionId) {
      console.log('Login successful, saving sessionId:', data.sessionId);
      localStorage.setItem('sessionId', data.sessionId);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const sessionId = localStorage.getItem('sessionId');
    const headers: Record<string, string> = {};
    const url = queryKey[0] as string;
    
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
      console.log(`Query to ${url} with sessionId: ${sessionId}`);
    } else {
      console.log(`Query to ${url} without sessionId`);
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    console.log(`Response from ${url}: status ${res.status}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log(`Auth failed for ${url}, clearing sessionId`);
      localStorage.removeItem('sessionId');
      return null;
    }

    try {
      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Data from ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`Error from ${url}:`, error);
      if (res.status === 401) {
        localStorage.removeItem('sessionId');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
