import React from 'react';
import { Link } from 'wouter';
import type { CircuitListItem } from '@/types/circuit';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Flame, Check, Plus, HelpCircle, Hash, Bot } from 'lucide-react'; // Added Bot for placeholder
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface DynamicCircuitCardProps {
  circuit: CircuitListItem;
  user?: User | null;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  isSubscribing: boolean;
  isUnsubscribing: boolean;
  categoryIcon?: React.ElementType;
  categoryKey?: string; // For category-specific styling
}

const DEFAULT_BANNER_ICON_SIZE = "w-10 h-10 md:w-12 md:h-12"; // Larger icon for banner

// Helper to generate category-based gradient
const getBannerStyle = (circuitName: string, categoryKey?: string) => {
  let seed = circuitName;
  if (categoryKey) {
    seed += categoryKey; // Use categoryKey to vary the seed for color generation
  }
  const hash = seed.split('').reduce((acc: number, char: string) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const h = hash % 360;
  const s = 55 + (hash % 20); // Saturation 55-75%
  const l1 = 70 + (hash % 10); // Lightness 70-80%
  const l2 = 50 + (hash % 10); // Lightness 50-60%
  return {
    background: `linear-gradient(135deg, hsl(${h}, ${s}%, ${l1}%), hsl(${(h + 40) % 360}, ${s}%, ${l2}%))`, 
  };
};

// Fallback for category icon if not provided
const getFallbackCategoryIcon = (circuitName: string): React.ElementType => {
  if (circuitName.toLowerCase().includes('tech')) return Hash;
  if (circuitName.toLowerCase().includes('learn')) return Flame;
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
  const bannerStyle = getBannerStyle(circuit.name, categoryKey);
  const CategoryIconToRender = CategoryIconProp || getFallbackCategoryIcon(circuit.name);
  const { toast } = useToast(); // Added useToast

  // Avatar logic: Aim for 2-3 avatars
  let memberAvatars: string[] = [];
  if (circuit.creatorProfileImage) memberAvatars.push(circuit.creatorProfileImage);
  if (user && user.profileImage && user.id !== circuit.creatorId && memberAvatars.length < 3) {
    memberAvatars.push(user.profileImage);
  }
  // Fill with placeholders if needed, ensuring no duplicates if creator/user is a placeholder itself
  let placeholderIndex = 0;
  while(memberAvatars.length < 3 && placeholderIndex < PLACEHOLDER_AVATARS.length) {
    const placeholder = PLACEHOLDER_AVATARS[placeholderIndex];
    if (!memberAvatars.includes(placeholder)) {
        memberAvatars.push(placeholder);
    }
    placeholderIndex++;
  }
  // If still less than 2 and we have some subscribers, show a generic one to indicate presence
  if (memberAvatars.length < 2 && (circuit.subscriberCount || 0) > 0) {
    const botAvatar = '/generic-avatar.png'; // You'd need this asset
    if (!memberAvatars.includes(botAvatar) && memberAvatars.length < 3) {
        memberAvatars.push(botAvatar);
    }
  }
  memberAvatars = memberAvatars.slice(0,3); // Ensure max 3


  const newPostsToday = Math.floor(Math.random() * 5) + (circuit.name.toLowerCase().includes("trending") ? 5: 0);
  const descriptionText = circuit.description || "Explore this circuit and connect with others.";

  const handleSubscription = () => {
    if (!user) {
      // If user is not logged in and tries to subscribe (button would say "Join")
      if (!circuit.isSubscribed) {
        toast({
          title: "Login Required",
          description: "Please log in to join this circuit.",
          variant: "default", 
        });
      }
      console.log("User not logged in, subscription attempt blocked for non-subscribed circuit or action ignored for subscribed.");
      return;
    }
    if (circuit.isSubscribed) {
      onUnsubscribe();
    } else {
      onSubscribe();
    }
  };

  const isProcessingSubscription = isSubscribing || isUnsubscribing;

  console.log(`Card: ${circuit.name} (ID: ${circuit.id})`);
  console.log(`  isSubscribed: ${circuit.isSubscribed}`);
  console.log(`  isSubscribing: ${isSubscribing}`);
  console.log(`  isUnsubscribing: ${isUnsubscribing}`);
  console.log(`  isProcessingSubscription: ${isProcessingSubscription}`);
  console.log(`  User present: ${!!user}`);

  return (
    <Link href={`/circuits/${circuit.id}`} className="block h-full">
      <div className="bg-white rounded-xl shadow-soft-sm hover:shadow-soft-md transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer flex flex-col h-full overflow-hidden">
        {/* Banner with prominent centered Category Icon */}
        <div 
          className="h-28 md:h-32 bg-cover bg-center relative flex items-center justify-center"
          style={bannerStyle}
        >
          <CategoryIconToRender className={`${DEFAULT_BANNER_ICON_SIZE} text-white opacity-70`} />
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-grow">
          <h3 className="text-md font-semibold text-neutral-800 leading-tight truncate mb-1.5" title={circuit.name}>
            {circuit.name}
          </h3>
          
          <p className="text-xs text-neutral-600 mb-2.5 leading-snug flex-grow min-h-[30px]">
            {descriptionText}
          </p>

          {/* Member Avatars */}
          {memberAvatars.length > 0 && (
            <div className="flex items-center mb-2.5 -space-x-1.5">
              {memberAvatars.map((avatarUrl, index) => (
                <Avatar key={index} className="h-6 w-6 border-2 border-white shadow-sm">
                  <AvatarImage src={avatarUrl} alt={`Member ${index + 1}`} />
                  <AvatarFallback className="text-xs"><Bot className="h-3 w-3"/></AvatarFallback> {/* Generic fallback icon */}
                </Avatar>
              ))}
              {(circuit.subscriberCount || 0) > memberAvatars.length && memberAvatars.length > 0 && (
                <span className="text-xs text-neutral-400 pl-2.5">
                  +{(circuit.subscriberCount || 0) - memberAvatars.length} more
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex flex-col text-xs text-neutral-500 mb-2.5 space-y-1">
            <span className="flex items-center">
              <Flame className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
              {newPostsToday} new {newPostsToday === 1 ? 'post' : 'posts'} today
            </span>
            <span className="flex items-center">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {circuit.subscriberCount || 0} {circuit.subscriberCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          {/* Action Button */}
          <div className="mt-auto pt-2 border-t border-neutral-100">
            <Button 
              variant={circuit.isSubscribed ? 'outline' : 'default'}
              size="sm"
              className="w-full transition-colors duration-200 ease-in-out group py-1.5"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation();
                handleSubscription(); 
              }}
              disabled={isProcessingSubscription} // Simplified disabled logic
              title={!user && !circuit.isSubscribed ? "Login to join" : (circuit.isSubscribed ? "Leave circuit" : "Join circuit")}
            >
              {circuit.isSubscribed ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-green-500 transition-transform duration-200 ease-in-out group-hover:scale-110" /> Joined
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5 transition-transform duration-200 ease-in-out group-hover:scale-110" /> Join
                </>
              )}
              {isProcessingSubscription && '...'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DynamicCircuitCard; 