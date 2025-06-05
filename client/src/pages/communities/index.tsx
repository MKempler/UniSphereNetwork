import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/lib/UserContext';
import type { Community } from '@/types';

const CommunitiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: communities = [], isLoading } = useQuery<Community[]>({
    queryKey: ['/api/communities'],
    queryFn: () => apiRequest('GET', '/api/communities'),
  });

  const joinMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/communities/${id}/join`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/communities'] }),
  });

  const leaveMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/communities/${id}/join`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/communities'] }),
  });

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Communities</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4">
            {communities.map((c) => (
              <div key={c.id} className="border rounded p-4 flex justify-between">
                <div>
                  <h2 className="font-semibold">{c.name}</h2>
                  <p className="text-sm text-gray-600">{c.description}</p>
                  <p className="text-xs text-gray-500">{c.memberCount} members</p>
                </div>
                {user && (
                  c.isJoined ? (
                    <Button variant="outline" onClick={() => leaveMutation.mutate(c.id)} disabled={leaveMutation.isPending && leaveMutation.variables === c.id}>
                      Leave
                    </Button>
                  ) : (
                    <Button onClick={() => joinMutation.mutate(c.id)} disabled={joinMutation.isPending && joinMutation.variables === c.id}>
                      Join
                    </Button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
        {user && (
          <div className="mt-6">
            <Button asChild>
              <Link href="/communities/create">Create Community</Link>
            </Button>
          </div>
        )}
      </div>
    </MainShell>
  );
};

export default CommunitiesPage;
