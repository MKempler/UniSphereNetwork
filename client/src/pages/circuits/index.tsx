import React from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, MessageSquare, CheckCircle, Circle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CircuitListItem } from '@/types/circuit'; // Assuming types are defined here
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/lib/UserContext';
import CircuitCard from '@/components/circuits/CircuitCard';
import CircuitSkeleton from '@/components/circuits/CircuitSkeleton';
import clsx from 'clsx';
import { useState, useMemo } from 'react';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';

const fetchPopularCircuits = async (): Promise<CircuitListItem[]> => {
  const response = await apiRequest('GET', '/api/circuits/popular');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'subscribed', label: 'Your subs' },
  { key: 'new', label: 'New' },
];

const CircuitsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');

  const { data: circuits, isLoading, error } = useQuery<CircuitListItem[], Error, CircuitListItem[], QueryKey>({
    queryKey: ['popularCircuits'],
    queryFn: fetchPopularCircuits,
  });

  const subscribeMutation = useMutation<unknown, Error, number>({
    mutationFn: (circuitId: number) => apiRequest('POST', `/api/circuits/${circuitId}/subscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popularCircuits'] });
      queryClient.invalidateQueries({ queryKey: ['circuitDetail'] });
      toast({ title: 'Subscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Subscription failed', description: err.message, variant: 'destructive' });
    },
  });

  const unsubscribeMutation = useMutation<unknown, Error, number>({
    mutationFn: (circuitId: number) => apiRequest('DELETE', `/api/circuits/${circuitId}/subscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popularCircuits'] });
      queryClient.invalidateQueries({ queryKey: ['circuitDetail'] });
      toast({ title: 'Unsubscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Unsubscription failed', description: err.message, variant: 'destructive' });
    },
  });

  // Debounce search input
  useMemo(() => {
    const handler = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Filtered circuits
  const filteredCircuits = useMemo(() => {
    if (!circuits) return [];
    let filtered = circuits;
    if (search) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (activeFilter === 'trending') {
      // TODO: implement trending logic if available
      return filtered;
      }
    if (activeFilter === 'subscribed') {
      return filtered.filter(c => c.isSubscribed);
    }
    if (activeFilter === 'new') {
      return [...filtered].sort((a, b) => b.id - a.id);
    }
    return filtered;
  }, [circuits, search, activeFilter]);

  if (isLoading) return <div className="text-center p-10">Loading circuits...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error loading circuits: {error.message}</div>;

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-[680px] w-full mx-auto flex flex-col gap-6">
        {/* Sticky header toolbar */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-50/95 backdrop-blur border-b border-neutral-100 mb-4 pt-2 pb-2">
          <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-2">
            <h1 className="text-2xl font-bold whitespace-nowrap flex-shrink-0">Social Circuits</h1>
            <div className="flex overflow-auto no-scrollbar gap-2 max-w-full px-1 order-2 md:order-none">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={clsx(
                    'px-3 py-1 rounded-full border border-neutral-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    activeFilter === f.key
                      ? 'bg-primary-500 text-white shadow'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100',
                    'sm:text-xs md:text-sm'
                  )}
                  onClick={() => setActiveFilter(f.key)}
                  aria-label={`Filter: ${f.label}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-xs order-last md:order-none sm:max-w-[180px] flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 rounded-full border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="Search circuits..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                aria-label="Search circuits"
              />
            </div>
            <Button
              className="ml-auto mt-2 md:mt-0 flex-shrink-0 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full px-4 py-2 font-semibold shadow hover:from-primary-600 hover:to-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500"
              onClick={() => navigate('/circuits/create')}
              aria-label="Create Circuit"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Create Circuit</span>
            </Button>
          </div>
        </div>

        {/* Circuits grid */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <CircuitSkeleton key={i} />)
          ) : filteredCircuits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 col-span-full">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nothing here yet — create the first Circuit</h2>
              <Button onClick={() => navigate('/circuits/create')} className="mt-2 bg-primary-500 text-white rounded-full px-4 py-2 font-semibold shadow">+ Create Circuit</Button>
            </div>
      ) : (
            [
              ...filteredCircuits.map(circuit => (
                <CircuitCard
                  key={circuit.id}
                  circuit={circuit}
                  onSubscribe={() => subscribeMutation.mutate(circuit.id)}
                  onUnsubscribe={() => unsubscribeMutation.mutate(circuit.id)}
                  isSubscribing={subscribeMutation.isPending && subscribeMutation.variables === circuit.id}
                  isUnsubscribing={unsubscribeMutation.isPending && unsubscribeMutation.variables === circuit.id}
                  user={user}
                  role="listitem"
                />
              )),
              ...(filteredCircuits.length < 3 ? Array.from({ length: 3 - filteredCircuits.length }).map((_, i) => <CircuitSkeleton key={`skeleton-${i}`} />) : [])
            ]
      )}
    </div>
      </div>
    </MainShell>
  );
};

export default CircuitsPage; 