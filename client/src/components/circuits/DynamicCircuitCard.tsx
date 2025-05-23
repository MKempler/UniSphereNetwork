import React from 'react';
import { Link } from 'wouter';
import type { CircuitListItem } from '@/types/circuit';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Flame, Check, Plus, HelpCircle, Hash, Bot, Star, Zap, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DynamicCircuitCardProps {
  circuit: CircuitListItem;
  user?: User | null;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  isSubscribing: boolean;
  isUnsubscribing: boolean;
  categoryIcon?: React.ElementType;
  categoryKey?: string;
}

const DEFAULT_BANNER_ICON_SIZE = "w-12 h-12";

// Enhanced gradient themes
const BANNER_THEMES = [
  { gradient: 'from-purple-500 via-pink-500 to-rose-500', iconBg: 'bg-white/20' },
  { gradient: 'from-blue-500 via-cyan-500 to-teal-500', iconBg: 'bg-white/20' },
  { gradient: 'from-green-500 via-emerald-500 to-cyan-500', iconBg: 'bg-white/20' },
  { gradient: 'from-orange-500 via-red-500 to-pink-500', iconBg: 'bg-white/20' },
  { gradient: 'from-indigo-500 via-purple-500 to-pink-500', iconBg: 'bg-white/20' },
  { gradient: 'from-yellow-400 via-orange-500 to-red-500', iconBg: 'bg-white/20' },
  { gradient: 'from-violet-500 via-indigo-500 to-blue-500', iconBg: 'bg-white/20' },
  { gradient: 'from-emerald-500 via-green-500 to-teal-500', iconBg: 'bg-white/20' },
];

// Enhanced banner style with better gradients
const getBannerTheme = (circuitName: string, categoryKey?: string) => {
  let seed = circuitName;
  if (categoryKey) {
    seed += categoryKey;
  }
  const hash = seed.split('').reduce((acc: number, char: string) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const themeIndex = Math.abs(hash) % BANNER_THEMES.length;
  return BANNER_THEMES[themeIndex];
};

// Fallback for category icon if not provided
const getFallbackCategoryIcon = (circuitName: string): React.ElementType => {
  if (circuitName.toLowerCase().includes('tech')) return Hash;
  if (circuitName.toLowerCase().includes('learn')) return Flame;
  if (circuitName.toLowerCase().includes('trending')) return TrendingUp;
  return HelpCircle;
};

// Consistent placeholder avatars
const PLACEHOLDER_AVATARS = [
  '/placeholder-avatar1.png', 
  '/placeholder-avatar2.png', 
  '/placeholder-avatar3.png' 
];

const DynamicCircuitCard: React.FC<DynamicCircuitCardProps> = ({
  circuit,
  user,
  onSubscribe,
  onUnsubscribe,
  isSubscribing,
  isUnsubscribing,
  categoryIcon: CategoryIconProp,
  categoryKey,
}) => {
  const bannerTheme = getBannerTheme(circuit.name, categoryKey);
  const CategoryIconToRender = CategoryIconProp || getFallbackCategoryIcon(circuit.name);
  const { toast } = useToast();

  // Enhanced avatar logic
  let memberAvatars: string[] = [];
  if (circuit.creatorProfileImage) memberAvatars.push(circuit.creatorProfileImage);
  if (user && user.profileImage && user.id !== circuit.creatorId && memberAvatars.length < 3) {
    memberAvatars.push(user.profileImage);
  }
  
  let placeholderIndex = 0;
  while(memberAvatars.length < 3 && placeholderIndex < PLACEHOLDER_AVATARS.length) {
    const placeholder = PLACEHOLDER_AVATARS[placeholderIndex];
    if (!memberAvatars.includes(placeholder)) {
        memberAvatars.push(placeholder);
    }
    placeholderIndex++;
  }

  if (memberAvatars.length < 2 && (circuit.subscriberCount || 0) > 0) {
    const botAvatar = '/generic-avatar.png';
    if (!memberAvatars.includes(botAvatar) && memberAvatars.length < 3) {
        memberAvatars.push(botAvatar);
    }
  }
  memberAvatars = memberAvatars.slice(0, 3);

  const newPostsToday = Math.floor(Math.random() * 5) + (circuit.name.toLowerCase().includes("trending") ? 5: 0);
  const descriptionText = circuit.description || "Explore this circuit and connect with others.";

  const handleSubscription = () => {
    if (!user) {
      if (!circuit.isSubscribed) {
        toast({
          title: "Login Required",
          description: "Please log in to join this circuit.",
          variant: "default", 
        });
      }
      return;
    }
    if (circuit.isSubscribed) {
      onUnsubscribe();
    } else {
      onSubscribe();
    }
  };

  const isProcessingSubscription = isSubscribing || isUnsubscribing;

  return (
    <Link href={`/circuits/${circuit.id}`} className="block h-full group">
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-2 cursor-pointer flex flex-col h-full overflow-hidden border border-gray-100 group-hover:border-gray-200">
        {/* Enhanced Banner with floating elements */}
        <div className={`h-32 bg-gradient-to-br ${bannerTheme.gradient} relative overflow-hidden`}>
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-6 translate-x-6"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-4 -translate-x-4"></div>
          
          {/* Main icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`${bannerTheme.iconBg} backdrop-blur-sm rounded-2xl p-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xl`}>
              <CategoryIconToRender className={`${DEFAULT_BANNER_ICON_SIZE} text-white drop-shadow-lg`} />
            </div>
          </div>

          {/* Status badge */}
          {circuit.isSubscribed && (
            <div className="absolute top-3 right-3">
              <div className="bg-emerald-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Star className="h-3 w-3" />
                Joined
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Content */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors duration-300" title={circuit.name}>
              {circuit.name}
            </h3>
            
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {descriptionText}
            </p>
          </div>

          {/* Enhanced Member Avatars */}
          {memberAvatars.length > 0 && (
            <div className="flex items-center mb-4">
              <div className="flex -space-x-2">
                {memberAvatars.map((avatarUrl, index) => (
                  <Avatar key={index} className="h-8 w-8 border-2 border-white shadow-md ring-2 ring-gray-100 transition-transform duration-300 hover:scale-110">
                    <AvatarImage src={avatarUrl} alt={`Member ${index + 1}`} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                      <Bot className="h-4 w-4"/>
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {(circuit.subscriberCount || 0) > memberAvatars.length && memberAvatars.length > 0 && (
                <span className="text-xs text-gray-500 ml-3 font-medium">
                  +{(circuit.subscriberCount || 0) - memberAvatars.length} more
                </span>
              )}
            </div>
          )}

          {/* Enhanced Stats */}
          <div className="flex justify-between items-center mb-4 text-xs">
            <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              <Flame className="w-3 h-3" />
              <span className="font-medium">{newPostsToday} new today</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <Users className="w-3 h-3" />
              <span className="font-medium">{circuit.subscriberCount || 0}</span>
            </div>
          </div>

          {/* Enhanced Action Button */}
          <div className="mt-auto">
            <Button 
              variant={circuit.isSubscribed ? 'outline' : 'default'}
              size="sm"
              className={`w-full transition-all duration-300 ease-out group/btn font-semibold ${
                circuit.isSubscribed 
                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              }`}
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation();
                handleSubscription(); 
              }}
              disabled={isProcessingSubscription}
              title={!user && !circuit.isSubscribed ? "Login to join" : (circuit.isSubscribed ? "Leave circuit" : "Join circuit")}
            >
              {isProcessingSubscription ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : circuit.isSubscribed ? (
                <>
                  <Check className="w-4 h-4 mr-2 transition-transform duration-300 group-hover/btn:scale-110" />
                  Joined
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2 transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-90" />
                  Join Circuit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DynamicCircuitCard; 