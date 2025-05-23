import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Sparkles, TrendingUp, Music4, Lightbulb, Tv, MessageCircle, ShieldCheck, Bone, Newspaper, Gamepad2, Palette, Dumbbell, Heart, Users, Search, Star, Zap, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CircuitListItem } from '@/types/circuit';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/lib/UserContext';
import CircuitSkeleton from '@/components/circuits/CircuitSkeleton';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import DynamicCircuitCard from '@/components/circuits/DynamicCircuitCard';

// Icon mapping for categories
const ICON_MAP: Record<string, React.ElementType> = {
  'Sparkles': Sparkles,
  'TrendingUp': TrendingUp,
  'Music4': Music4,
  'Lightbulb': Lightbulb,
  'Tv': Tv,
  'Bone': Bone,
  'Dumbbell': Dumbbell,
  'Newspaper': Newspaper,
  'Gamepad2': Gamepad2,
  'Palette': Palette,
  'MessageCircle': MessageCircle,
  'HelpCircle': MessageCircle, // fallback
};

// Color schemes for different circuit types
const CIRCUIT_THEMES = [
  { bg: 'from-purple-500 to-pink-500', accent: 'purple' },
  { bg: 'from-blue-500 to-cyan-500', accent: 'blue' },
  { bg: 'from-green-500 to-emerald-500', accent: 'green' },
  { bg: 'from-orange-500 to-red-500', accent: 'orange' },
  { bg: 'from-indigo-500 to-purple-500', accent: 'indigo' },
  { bg: 'from-pink-500 to-rose-500', accent: 'pink' },
];

// Predefined discovery sections
const DISCOVERY_SECTIONS = [
  { name: 'Suggested for you', circuitsKey: 'suggested', description: 'Circuits we think you\'ll like.', icon: Sparkles },
  { name: 'Trending Circuits', circuitsKey: 'trending', description: 'Popular and buzzing right now.', icon: TrendingUp },
];

type TabType = 'my-circuits' | 'discover';

// Fetch circuits by category using real API
const fetchCircuitsByCategory = async (categoryKey: string): Promise<CircuitListItem[]> => {
  let endpoint: string;
  
  // Handle special sections
  switch (categoryKey) {
    case 'suggested':
      endpoint = '/api/circuits/suggested';
      break;
    case 'trending':
      endpoint = '/api/circuits/trending';
      break;
    default:
      // For real categories, use the category slug endpoint
      endpoint = `/api/categories/${categoryKey}/circuits`;
      break;
  }

  const circuitsData = await apiRequest('GET', endpoint);
  if (!Array.isArray(circuitsData)) {
    console.error(`Expected array from ${endpoint}, got:`, circuitsData);
    throw new Error(`Invalid data format received for ${categoryKey} circuits.`);
  }

  return circuitsData;
};

// Enhanced Circuit Card Component
const EnhancedCircuitCard: React.FC<{
  circuit: CircuitListItem;
  onLeave: () => void;
  isLeaving: boolean;
  index: number;
}> = ({ circuit, onLeave, isLeaving, index }) => {
  const theme = CIRCUIT_THEMES[index % CIRCUIT_THEMES.length];
  
  return (
    <Card className="group relative overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      {/* Gradient Header */}
      <div className={`h-24 bg-gradient-to-r ${theme.bg} relative`}>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-3 right-3">
          <Badge className="bg-emerald-500/90 text-white border-0 shadow-lg">
            <Star className="h-3 w-3 mr-1" />
            Joined
          </Badge>
        </div>
        <div className="absolute bottom-3 left-4">
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="p-6 pt-4">
        <div className="mb-4">
          <Link href={`/circuits/${circuit.id}`}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
              {circuit.name}
            </h3>
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
            {circuit.description}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-${theme.accent}-500`}></div>
            <span className="text-xs font-medium text-gray-500">
              {circuit.subscriberCount} members
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onLeave}
            disabled={isLeaving}
            className="group/btn hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200"
          >
            {isLeaving ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
            ) : (
              "Leave"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// My Circuits Tab Component
const MyCircuitsTab: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Get user's subscribed circuits
  const { data: myCircuits, isLoading: isLoadingMyCircuits } = useQuery<CircuitListItem[]>({
    queryKey: ['/api/circuits/my-subscriptions'],
    queryFn: () => apiRequest('GET', '/api/circuits/my-subscriptions'),
    enabled: !!user,
  });

  const unsubscribeMutation = useMutation<unknown, Error, { circuitId: number }>({
    mutationFn: ({ circuitId }) => apiRequest('DELETE', `/api/circuits/${circuitId}/subscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/circuits/my-subscriptions'] });
      toast({ title: 'Unsubscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Unsubscription failed', description: err.message, variant: 'destructive' });
    },
  });

  if (!user) {
    return (
      <div className="text-center py-20">
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Heart className="h-12 w-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-yellow-800" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Sign in to see your circuits
        </h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
          Create an account to join circuits and track your communities.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" className="border-gray-200 hover:bg-gray-50">
            <Link href="/register">Sign Up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingMyCircuits) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <CircuitSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!myCircuits || myCircuits.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <Heart className="h-12 w-12 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
            <Zap className="h-4 w-4 text-green-800" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          You haven't joined any circuits yet
        </h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
          Circuits are communities centered around topics you care about. Join your first circuit to start connecting with like-minded people!
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={() => navigate('/circuits?tab=discover')}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0 shadow-lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Discover Circuits
          </Button>
          <Button asChild variant="outline" className="border-gray-200 hover:bg-gray-50">
            <Link href="/circuits/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Circuit
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Overview */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Star className="h-5 w-5" />
                </div>
                Your Circuit Activity
              </h3>
              <p className="text-white/90 text-lg">
                You're an active member of {myCircuits.length} amazing circuit{myCircuits.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-1">{myCircuits.length}</div>
              <div className="text-white/80 text-sm uppercase tracking-wide">Circuits Joined</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced My Circuits Grid */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Your Circuits
            </h2>
            <p className="text-gray-600 mt-1">Manage and explore your joined communities</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-lg">
            <Link href="/circuits/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCircuits.map((circuit, index) => (
            <EnhancedCircuitCard
              key={circuit.id}
              circuit={circuit}
              onLeave={() => unsubscribeMutation.mutate({ circuitId: circuit.id })}
              isLeaving={unsubscribeMutation.isPending && unsubscribeMutation.variables?.circuitId === circuit.id}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Discovery Tab Component
const DiscoveryTab: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real categories from API
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('GET', '/api/categories'),
  });

  const subscribeMutation = useMutation<unknown, Error, { circuitId: number, queryKeyToInvalidate: QueryKey }>({
    mutationFn: ({ circuitId }) => apiRequest('POST', `/api/circuits/${circuitId}/subscribe`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: variables.queryKeyToInvalidate });
      queryClient.invalidateQueries({ queryKey: ['/api/circuits/my-subscriptions'] });
      toast({ title: 'Subscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Subscription failed', description: err.message, variant: 'destructive' });
    },
  });

  const unsubscribeMutation = useMutation<unknown, Error, { circuitId: number, queryKeyToInvalidate: QueryKey }>({
    mutationFn: ({ circuitId }) => apiRequest('DELETE', `/api/circuits/${circuitId}/subscribe`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: variables.queryKeyToInvalidate });
      queryClient.invalidateQueries({ queryKey: ['/api/circuits/my-subscriptions'] });
      toast({ title: 'Unsubscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Unsubscription failed', description: err.message, variant: 'destructive' });
    },
  });

  // Enhanced CircuitCategorySection for discovery
  const CircuitCategorySection: React.FC<{ 
    categoryName: string; 
    circuitsKey: string; 
    description?: string; 
    icon?: React.ElementType;
    showLimit?: number;
    index: number;
  }> = ({ categoryName, circuitsKey, description, icon: CategoryIcon, showLimit = 4, index }) => {
    const { data: circuits, isLoading, error } = useQuery<CircuitListItem[], Error>({
      queryKey: ['circuits', circuitsKey],
      queryFn: () => fetchCircuitsByCategory(circuitsKey),
    });

    const sectionTheme = CIRCUIT_THEMES[index % CIRCUIT_THEMES.length];

    // Filter circuits based on search query
    const filteredCircuits = React.useMemo(() => {
      if (!circuits) return [];
      if (!searchQuery.trim()) return circuits;
      
      const query = searchQuery.toLowerCase().trim();
      return circuits.filter(circuit => 
        circuit.name.toLowerCase().includes(query) ||
        (circuit.description && circuit.description.toLowerCase().includes(query))
      );
    }, [circuits, searchQuery]);

    // If search is active and no results in this category, don't show the section
    if (searchQuery.trim() && filteredCircuits.length === 0) {
      return null;
    }

    if (error) return (
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{categoryName}</h2>
        {description && <p className="text-gray-500 mb-6">{description}</p>}
        <div className="text-red-500 py-8 text-center bg-red-50 rounded-xl border border-red-200">
          <div className="text-red-400 mb-2">⚠️</div>
          Error loading {categoryName.toLowerCase()}: {error.message}
        </div>
      </section>
    );

    return (
      <section className="mb-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className={`text-3xl font-bold bg-gradient-to-r ${sectionTheme.bg} bg-clip-text text-transparent flex items-center gap-3 mb-2`}>
              {CategoryIcon && (
                <div className={`w-10 h-10 bg-gradient-to-r ${sectionTheme.bg} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                  <CategoryIcon className="h-5 w-5" />
                </div>
              )}
              {categoryName}
              {searchQuery.trim() && (
                <span className="text-sm font-normal text-gray-500">
                  ({filteredCircuits.length} result{filteredCircuits.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            {description && <p className="text-gray-600 text-lg">{description}</p>}
          </div>
          {filteredCircuits && filteredCircuits.length > showLimit && !searchQuery.trim() && (
            <Link href={`/circuits/category/${circuitsKey}`} className={`text-${sectionTheme.accent}-600 hover:text-${sectionTheme.accent}-700 flex items-center gap-2 font-medium transition-colors group`}>
              See all 
              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          )}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: showLimit }).map((_, i) => <CircuitSkeleton key={i} />)}
          </div>
        ) : filteredCircuits && filteredCircuits.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCircuits.slice(0, searchQuery.trim() ? filteredCircuits.length : showLimit).map(circuit => (
              <DynamicCircuitCard
                key={circuit.id}
                circuit={circuit}
                categoryIcon={CategoryIcon}
                categoryKey={circuitsKey}
                onSubscribe={() => subscribeMutation.mutate({ circuitId: circuit.id, queryKeyToInvalidate: ['circuits', circuitsKey] })}
                onUnsubscribe={() => unsubscribeMutation.mutate({ circuitId: circuit.id, queryKeyToInvalidate: ['circuits', circuitsKey] })}
                isSubscribing={subscribeMutation.isPending && subscribeMutation.variables?.circuitId === circuit.id}
                isUnsubscribing={unsubscribeMutation.isPending && unsubscribeMutation.variables?.circuitId === circuit.id}
                user={user}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-gray-400 mb-4">🔍</div>
            <p className="text-gray-500 font-medium">
              {searchQuery.trim() 
                ? `No circuits found matching "${searchQuery}" in ${categoryName.toLowerCase()}`
                : "No circuits in this category yet."
              }
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery.trim() 
                ? "Try a different search term or browse other categories."
                : "Be the first to create one!"
              }
            </p>
          </div>
        )}
      </section>
    );
  };

  // Combine discovery sections with real categories
  const allSections = React.useMemo(() => {
    const categorySections = categories.map((category: any) => ({
      name: category.name,
      circuitsKey: category.slug,
      description: category.description,
      icon: ICON_MAP[category.icon] || ICON_MAP['HelpCircle'],
    }));
    
    return [...DISCOVERY_SECTIONS, ...categorySections];
  }, [categories]);

  if (categoriesLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <CircuitSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Enhanced Search */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <CardContent className="p-8">
          <div className="max-w-2xl mx-auto text-center mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Discover Amazing Circuits
            </h3>
            <p className="text-gray-600">Find communities that match your interests and passions</p>
            {searchQuery.trim() && (
              <div className="mt-3 text-sm text-gray-500">
                Searching for "<span className="font-medium text-gray-700">{searchQuery}</span>"
              </div>
            )}
          </div>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search circuits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg border-0 shadow-lg bg-white/80 backdrop-blur-sm"
            />
            {searchQuery.trim() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 hover:bg-gray-100 rounded-full"
                title="Clear search"
              >
                <span className="text-gray-400 hover:text-gray-600 text-lg">×</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discovery Sections */}
      {allSections.map((section, index) => (
        <CircuitCategorySection
          key={section.circuitsKey}
          categoryName={section.name}
          circuitsKey={section.circuitsKey}
          description={section.description}
          icon={section.icon}
          index={index}
        />
      ))}
    </div>
  );
};

const CircuitsPage: React.FC = () => {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('my-circuits');
  const { user } = useUser();

  // Check URL params for tab
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'discover') {
      setActiveTab('discover');
    }
  }, []);

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 text-white p-8 mb-8">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-16 -translate-y-16"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold mb-4 leading-tight">
                  Social Circuits
                </h1>
                <p className="text-xl text-white/90 leading-relaxed">
                  {activeTab === 'my-circuits' 
                    ? "Manage your joined circuits and track your community engagement"
                    : "Discover vibrant communities and connect with like-minded people around the world"
                  }
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <Button
                  onClick={() => navigate('/circuits/create')}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/20 text-white text-lg px-8 py-4 h-auto transition-all duration-300 hover:scale-105"
                  size="lg"
                >
                  <PlusCircle className="mr-3 h-6 w-6" />
                  Create Circuit
                </Button>
                <div className="text-center text-white/70 text-sm">
                  Join the conversation
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="mb-12">
          <div className="flex bg-white shadow-xl rounded-2xl p-2 max-w-md mx-auto border border-gray-100">
            <Button
              variant={activeTab === 'my-circuits' ? 'default' : 'ghost'}
              size="lg"
              className={`flex-1 rounded-xl transition-all duration-300 ${
                activeTab === 'my-circuits' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
              onClick={() => setActiveTab('my-circuits')}
            >
              <Heart className="h-5 w-5 mr-2" />
              My Circuits
            </Button>
            <Button
              variant={activeTab === 'discover' ? 'default' : 'ghost'}
              size="lg"
              className={`flex-1 rounded-xl transition-all duration-300 ${
                activeTab === 'discover' 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
              onClick={() => setActiveTab('discover')}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Discover
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in-50 duration-300">
          {activeTab === 'my-circuits' ? <MyCircuitsTab /> : <DiscoveryTab />}
        </div>
      </div>
    </MainShell>
  );
};

export default CircuitsPage;