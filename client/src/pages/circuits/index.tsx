import React from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronRight, Sparkles, TrendingUp, Music4, Lightbulb, Tv, MessageCircle, ShieldCheck, Bone, Newspaper, Gamepad2, Palette, Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CircuitListItem } from '@/types/circuit';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/lib/UserContext';
import CircuitSkeleton from '@/components/circuits/CircuitSkeleton';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import DynamicCircuitCard from '@/components/circuits/DynamicCircuitCard';
import Masonry from 'react-masonry-css';

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

// Predefined sections (suggested and trending are special)
const PREDEFINED_SECTIONS = [
  { name: 'Suggested for you', circuitsKey: 'suggested', description: 'Circuits we think you\'ll like.', icon: Sparkles },
  { name: 'Trending Circuits', circuitsKey: 'trending', description: 'Popular and buzzing right now.', icon: TrendingUp },
];

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

  // Limit to 4 circuits per section for the main page
  return circuitsData.slice(0, 4);
};

// RE-INTRODUCED and MODIFIED CircuitCategorySection
const CircuitCategorySection: React.FC<{ categoryName: string; circuitsKey: string; description?: string; icon?: React.ElementType }> = ({ categoryName, circuitsKey, description, icon: CategoryIcon }) => {
  const { data: circuits, isLoading, error } = useQuery<CircuitListItem[], Error>({
    queryKey: ['circuits', circuitsKey], // Unique queryKey per category
    queryFn: () => fetchCircuitsByCategory(circuitsKey),
  });
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const subscribeMutation = useMutation<unknown, Error, { circuitId: number, queryKeyToInvalidate: QueryKey }>({
    mutationFn: ({ circuitId }) => apiRequest('POST', `/api/circuits/${circuitId}/subscribe`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: variables.queryKeyToInvalidate });
      queryClient.invalidateQueries({ queryKey: ['circuitDetail', variables.circuitId] });
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
      queryClient.invalidateQueries({ queryKey: ['circuitDetail', variables.circuitId] });
      toast({ title: 'Unsubscribed successfully!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Unsubscription failed', description: err.message, variant: 'destructive' });
    },
  });

  // Masonry breakpoint columns for use within sections if we choose Masonry
   const breakpointColumnsObj = {
    default: 4, // Max 4 cards in a row for sections on large screens
    1100: 3,
    768: 2,
    640: 1 // On small screens, 1 card per row (full width)
  };


  if (error) return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-neutral-800 mb-1 px-4 md:px-0">{categoryName}</h2>
      {description && <p className="text-sm text-neutral-500 mb-4 px-4 md:px-0">{description}</p>}
      <div className="text-red-500 py-4 px-4 md:px-0">Error loading {categoryName.toLowerCase()}: {error.message}</div>
    </section>
  );

  // Decide on layout: Simple flex-wrap grid for now, or Masonry.
  // For main page sections, a simpler responsive grid might be better than full Masonry.
  // Masonry might be for "See All" pages.
  // Let's use a flex-wrap grid for now to match mockup's row appearance.

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-2 px-4 md:px-0">
        <div>
          <h2 className="text-3xl font-bold text-neutral-800">{categoryName}</h2>
          {description && <p className="text-md text-neutral-500 mt-1">{description}</p>}
        </div>
        { (circuits && circuits.length > 3) && // Show "See all" if more than 3-4 items potentially available
          <Link href={`/circuits/category/${circuitsKey}`} className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
            See all <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        }
      </div>
      
      {isLoading ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
          {Array.from({ length: 4 }).map((_, i) => <CircuitSkeleton key={i} />)}
        </div>
      ) : circuits && circuits.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
          {/* Display up to 4 cards for preview, or all if less than 4 */}
          {circuits.slice(0, 4).map(circuit => (
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
        <p className="text-neutral-500 py-4 px-4 md:px-0">No circuits in this category yet.</p>
      )}
    </section>
  );
};


const CircuitsPage: React.FC = () => {
  const [, navigate] = useLocation();

  // Fetch real categories from API
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('GET', '/api/categories'),
  });

  // Combine predefined sections with real categories
  const allSections = React.useMemo(() => {
    const categorySections = categories.map((category: any) => ({
      name: category.name,
      circuitsKey: category.slug,
      description: category.description,
      icon: ICON_MAP[category.icon] || ICON_MAP['HelpCircle'],
    }));
    
    return [...PREDEFINED_SECTIONS, ...categorySections];
  }, [categories]);

  if (categoriesLoading) {
    return (
      <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center p-10">Loading categories...</div>
        </div>
      </MainShell>
    );
  }

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-16 text-center md:text-left relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-800 mb-3">
              Jump into a circuit.
            </h1>
            <p className="text-lg text-neutral-600 mb-8">
              Discover conversations and communities that matter to you.
            </p>
            </div>
            <Button
            className="absolute top-0 right-0 mt-0 md:mt-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={() => navigate('/circuits/create')}
              aria-label="Create Circuit"
            >
            <PlusCircle className="mr-2 h-5 w-5 sm:mr-1" />
              <span className="hidden sm:inline">Create Circuit</span>
            </Button>
        </div>

        {allSections.map(section => (
          <CircuitCategorySection
            key={section.circuitsKey}
            categoryName={section.name}
            circuitsKey={section.circuitsKey}
            description={section.description}
            icon={section.icon}
          />
        ))}
      </div>
    </MainShell>
  );
};

export default CircuitsPage; 