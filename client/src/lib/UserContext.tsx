import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@/types";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("GET", "/api/users/me");
      const data = await res.json();
      setUser(data);
    } catch (err: any) {
      setUser(null);
      setError(err.message || "Failed to fetch user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
} 