import React from 'react';
import { Users, Calendar, Globe, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CircuitOverviewCardProps {
  // Allow all potential creatorName types
  creatorName?: string | null | undefined;
  // Accept string or number for creatorId
  creatorId: string | number;
  // Creator image can be any of these types
  creatorImage?: string | null | undefined;
  // Subscriber count is a number
  subscriberCount: number;
  // Created at is a string date
  createdAt: string;
  // Optional accent color
  accentColor?: string;
}

const CircuitOverviewCard: React.FC<CircuitOverviewCardProps> = ({
  creatorName,
  creatorId,
  creatorImage,
  subscriberCount = 0,
  createdAt,
  accentColor = 'hsl(215, 70%, 60%)'
}) => {
  
  // Format date for display
  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return "Unknown date";
    }
  };

  return (
    <aside className="mb-8 lg:mb-0">
      <div 
        className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm hover:shadow-md transition p-5 border-l-4"
        style={{ borderLeftColor: `${accentColor}50` }} // 50 = 50% opacity
      >
        <h3 className="text-lg font-semibold mb-4">Circuit Overview</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Created by</h4>
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={creatorImage || undefined} />
                <AvatarFallback className="bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                  {creatorName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{creatorName || `User ID ${creatorId}`}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center py-2 border-t border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-neutral-500" />
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Subscribers</h4>
            </div>
            <span className="text-sm font-medium">{subscriberCount.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-t border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-neutral-500" />
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Created</h4>
            </div>
            <span className="text-sm">
              {formatDate(createdAt)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-t border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center">
              <Globe className="h-4 w-4 mr-2 text-neutral-500" />
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Visibility</h4>
            </div>
            <span className="text-sm">Public</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CircuitOverviewCard; 