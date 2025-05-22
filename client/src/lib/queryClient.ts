import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  payload?: unknown | undefined,
): Promise<T> {
  const sessionId = localStorage.getItem('sessionId');
  const headers: Record<string, string> = {};
  
  if (payload) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (sessionId) {
    headers['Authorization'] = `Bearer ${sessionId}`;
    // console.log(`API Request to ${url} with sessionId: ${sessionId.substring(0,8)}...`); // Keep console logs minimal for production
  } else {
    // console.log(`API Request to ${url} without sessionId`);
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
    credentials: "include",
  });

  // Special handling for login success to store sessionId
  if ((url.includes('/api/auth/login') || url.includes('/api/auth/did/login') || url.includes('/api/auth/register')) && res.ok) {
    const responseClone = res.clone(); // Clone before reading body
    try {
      const responseData = await responseClone.json(); // Attempt to parse JSON
      if (responseData && responseData.sessionId) {
        console.log('Auth successful, saving sessionId:', responseData.sessionId);
        localStorage.setItem('sessionId', responseData.sessionId);
      }
    } catch (e) {
      // If .json() fails, it might not be a JSON response, or an empty one. Silently ignore.
      console.warn(`Could not parse JSON from auth response for ${url}, or sessionId missing.`, e);
    }
  }

  await throwIfResNotOk(res);
  
  // Check if the response has content before trying to parse JSON
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  // For non-JSON responses (e.g., 204 No Content), return as is (or handle as needed)
  // Casting to T might be problematic here if T expects a JSON object and gets null/undefined for 204.
  // For now, this assumes callers handle non-JSON or empty responses appropriately if T is specific.
  return res as unknown as Promise<T>; // Or return undefined / null explicitly for non-json
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
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
      mutationFn: async (variables: any) => {
        return apiRequest<any>('POST', variables.url, variables.payload);
      },
    },
  },
});

// --- Social Circuits API ---
export async function createCircuit(data: { name: string; description?: string }) {
  return apiRequest<any>("POST", "/api/circuits", data);
}

export async function listCircuits(page = 1, limit = 10) {
  return apiRequest<any>("GET", `/api/circuits?page=${page}&limit=${limit}`);
}

export async function getCircuitDetails(id: number, page = 1, limit = 10) {
  return apiRequest<any>("GET", `/api/circuits/${id}?page=${page}&limit=${limit}`);
}

export async function subscribeToCircuit(id: number) {
  return apiRequest<any>("POST", `/api/circuits/${id}/subscribe`);
}

export async function unsubscribeFromCircuit(id: number) {
  return apiRequest<void>("DELETE", `/api/circuits/${id}/subscribe`);
}

export async function addPostToCircuit(circuitId: number, postId: number) {
  return apiRequest<any>("POST", `/api/circuits/${circuitId}/posts`, { postId });
}

export async function removePostFromCircuit(circuitId: number, postId: number) {
  return apiRequest<void>("DELETE", `/api/circuits/${circuitId}/posts/${postId}`);
}
