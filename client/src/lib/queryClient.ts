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
      console.log(`Auth failed for ${url}`);
      if (url.includes("/api/users/me")) {
        console.log("Clearing sessionId due to 401 on /api/users/me");
        localStorage.removeItem('sessionId');
      }
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
        if (url.includes("/api/users/me")) {
          console.log("Clearing sessionId due to 401 on /api/users/me in catch block");
          localStorage.removeItem('sessionId');
        }
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

// --- Social Circuits API ---
export async function createCircuit(data: { name: string; description?: string }) {
  const res = await apiRequest("POST", "/api/circuits", data);
  return res.json();
}

export async function listCircuits(page = 1, limit = 10) {
  const res = await apiRequest("GET", `/api/circuits?page=${page}&limit=${limit}`);
  return res.json();
}

export async function getCircuitDetails(id: number, page = 1, limit = 10) {
  const res = await apiRequest("GET", `/api/circuits/${id}?page=${page}&limit=${limit}`);
  return res.json();
}

export async function subscribeToCircuit(id: number) {
  const res = await apiRequest("POST", `/api/circuits/${id}/subscribe`);
  return res.json();
}

export async function unsubscribeFromCircuit(id: number) {
  const res = await apiRequest("DELETE", `/api/circuits/${id}/subscribe`);
  return res;
}

export async function addPostToCircuit(circuitId: number, postId: number) {
  const res = await apiRequest("POST", `/api/circuits/${circuitId}/posts`, { postId });
  return res.json();
}

export async function removePostFromCircuit(circuitId: number, postId: number) {
  const res = await apiRequest("DELETE", `/api/circuits/${circuitId}/posts/${postId}`);
  return res;
}
