import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { Link, useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import type { CircuitDetail, CircuitPost } from '@/types/circuit';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/lib/UserContext';
import { MessageSquare, ChevronLeft, ChevronRight, ArrowLeft, Settings } from 'lucide-react';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightRail from '@/components/layout/RightSidebar';
import CircuitHero from '@/components/CircuitHero';
import CircuitOverviewCard from '@/components/CircuitOverviewCard';

const fetchCircuitDetail = async (id: string): Promise<CircuitDetail> => {
  const responseData = await apiRequest('GET', `/api/circuits/${id}`);
  
  if (typeof responseData !== 'object' || responseData === null || !responseData.circuit) {
    console.error(`Expected object with a 'circuit' property from /api/circuits/${id}, got:`, responseData);
    throw new Error('Invalid data format received for circuit details.');
  }

  // Destructure and map to the CircuitDetail type structure
  const { circuit, posts, isSubscribed, totalPages, page } = responseData;

  return {
    id: circuit.id,
    name: circuit.name,
    description: circuit.description,
    creatorId: circuit.creatorId,
    creatorName: circuit.creatorName, // This was added to the API response
    creatorProfileImage: circuit.creatorProfileImage, // This was added to the API response
    isPublic: circuit.isPublic,
    createdAt: circuit.createdAt,
    curationType: circuit.curationType, // Assuming it might exist on circuit object
    posts: posts,
    isSubscribed: isSubscribed,
    totalPages: totalPages,
    currentPage: page,
    subscriberCount: circuit.subscriberCount || 0, // Defaulting as it's not in current API response for this endpoint
  };
};

const PostCard: React.FC<{ post: CircuitPost, isCreator: boolean, onRemovePost?: (postId: number) => void }> = ({ post, isCreator, onRemovePost }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const mediaArray = Array.isArray(post.media) ? post.media : (post.media ? [post.media] : []);
  const hasMultipleImages = mediaArray.length > 1;
  
  const navigateImage = (direction: 'prev' | 'next') => {
    if (!hasMultipleImages) return;
    
    if (direction === 'prev') {
      setCurrentImageIndex((prev) => (prev === 0 ? mediaArray.length - 1 : prev - 1));
    } else {
      setCurrentImageIndex((prev) => (prev === mediaArray.length - 1 ? 0 : prev + 1));
    }
  };
  
  return (
    <Card className="mb-6 overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center space-x-3 pb-3">
        <Avatar className="h-10 w-10 border-2 border-primary-100">
            <AvatarImage src={post.author.profileImage || undefined} alt={post.author.username} />
          <AvatarFallback className="bg-primary-50 text-primary-700">
            {post.author.username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-base font-medium">
            {post.author.name || post.author.username}
          </CardTitle>
          <CardDescription className="text-xs">
            @{post.author.username} · {post.createdAt}
          </CardDescription>
        </div>
    </CardHeader>
    <CardContent>
        <p className="whitespace-pre-wrap mb-3 text-neutral-800">{post.content}</p>
        
        {mediaArray.length > 0 && (
          <div className="relative rounded-lg overflow-hidden bg-neutral-100">
            <img 
              src={mediaArray[currentImageIndex]} 
              alt="Post media" 
              className="w-full object-cover max-h-[400px]" 
            />
            
            {hasMultipleImages && (
              <div className="absolute bottom-0 inset-x-0 flex justify-between p-3">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="rounded-full bg-white/80 hover:bg-white shadow-md"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                  {currentImageIndex + 1}/{mediaArray.length}
                </div>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="rounded-full bg-white/80 hover:bg-white shadow-md"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        )}
    </CardContent>
    {isCreator && onRemovePost && (
        <CardFooter className="border-t pt-3 flex justify-end">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onRemovePost(post.id)}
            className="text-xs"
          >
            Remove from Circuit
          </Button>
        </CardFooter>
    )}
  </Card>
);
};

const getAccentColorFromName = (name: string = 'Circuit'): string => {
  const hue = name.charCodeAt(0) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

const CircuitDetailPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [, params] = useRoute("/circuits/:id");
  const circuitId = params?.id;
  const [, navigate] = useLocation();

  const { data: circuit, isLoading, error, refetch: refetchCircuitDetails } = useQuery<CircuitDetail, Error, CircuitDetail, QueryKey>({
    queryKey: ['circuitDetail', circuitId],
    queryFn: () => fetchCircuitDetail(circuitId!),
    enabled: !!circuitId,
  });

  const subscribeMutation = useMutation<unknown, Error, string>({
    mutationFn: (id: string) => apiRequest('POST', `/api/circuits/${id}/subscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuitDetail', circuitId] });
      queryClient.invalidateQueries({ queryKey: ['popularCircuits'] });
      toast({ title: 'Subscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Subscription failed', description: err.message, variant: 'destructive' });
    },
  });

  const unsubscribeMutation = useMutation<unknown, Error, string>({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/circuits/${id}/subscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuitDetail', circuitId] });
      queryClient.invalidateQueries({ queryKey: ['popularCircuits'] });
      toast({ title: 'Unsubscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Unsubscription failed', description: err.message, variant: 'destructive' });
    },
  });
  
  if (!circuitId) return <div className="text-center p-10">Circuit ID not found.</div>;
  if (isLoading) return <div className="text-center p-10">Loading circuit details...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error loading circuit: {error.message}</div>;
  if (!circuit) return <div className="text-center p-10">Circuit not found.</div>;

  const isCreator = user?.id === circuit.creatorId;
  const accentColor = getAccentColorFromName(circuit.name);
  
  console.log('[CircuitDetailPage] circuit.isSubscribed before passing to CircuitHero:', circuit.isSubscribed, 'Circuit ID:', circuitId);

  const handleToggleSubscription = () => {
    if (circuit.isSubscribed) {
      unsubscribeMutation.mutate(circuitId);
    } else {
      subscribeMutation.mutate(circuitId);
    }
  };

  const defaultDate = new Date().toISOString();

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightRail />}>
      <main role="main" className="w-full">
        <CircuitHero 
          name={circuit.name || 'Circuit'} 
          description={circuit.description || undefined}
          subscribed={!!circuit.isSubscribed} 
          onToggle={handleToggleSubscription} 
        />
        
        <div className="px-6 pt-6">
          <div className="max-w-screen-xl mx-auto">
            <Link href="/circuits" className="text-sm text-primary-500 hover:underline flex items-center mb-4">
              <ArrowLeft className="h-3 w-3 mr-1" /> Back to Social Circuits
            </Link>
            
          <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold">{circuit.name}</h1>
                <p className="text-neutral-500 mt-1">
                  {circuit.description || `A circuit for all things ${(circuit.name || 'this circuit').toLowerCase()}`}
                </p>
            </div>
              {isCreator && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/circuits/${circuitId}/edit`)}
                  className="ml-4 flex-shrink-0"
                  aria-label="Edit Circuit"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Circuit
                </Button>
            )}
          </div>
          </div>
        </div>
        
        <div className="px-6 pb-16">
          <div className="max-w-screen-xl mx-auto md:grid md:grid-cols-[260px_1fr] gap-8 mt-8">
            <CircuitOverviewCard 
              creatorName={circuit.creatorName} 
              creatorId={circuit.creatorId}
              creatorImage={circuit.creatorProfileImage || undefined}
              subscriberCount={circuit.subscriberCount || 0}
              createdAt={circuit.createdAt || defaultDate}
              accentColor={accentColor}
              isPublic={circuit.isPublic}
            />
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">Recent Posts</h2>
              
      {circuit.posts && circuit.posts.length > 0 ? (
                <div className="space-y-4">
          {circuit.posts.map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      isCreator={isCreator}
                      onRemovePost={(postId) => alert(`Remove post ${postId} - TBD: Call API to remove from circuit`)} 
                    />
          ))}
        </div>
      ) : (
                <Card className="text-center p-10 border">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold">No one's posted yet — be the first to spark the conversation!</h3>
                  <p className="text-muted-foreground mt-2 mb-6">Start a discussion or share something interesting with the circuit.</p>
                  <Button className="bg-primary-500 hover:bg-primary-600" onClick={() => alert("TBD: Create post in circuit")}>
                    Post to Circuit
                  </Button>
                </Card>
              )}
            </section>
          </div>
        </div>
      </main>
    </MainShell>
  );
};

export default CircuitDetailPage; 