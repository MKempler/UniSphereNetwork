import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

const CreateCommunityPage: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const mutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/communities', { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities'] });
      toast({ title: 'Community created' });
      navigate('/communities');
    },
    onError: (err: Error) => {
      toast({ title: 'Error creating community', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  };

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Create Community</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Community name" required />
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating...' : 'Create'}</Button>
        </form>
      </div>
    </MainShell>
  );
};

export default CreateCommunityPage;
