import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/simpleAuth";
import MainShell from "@/components/MainShell";
import { Heart, MessageCircle, UserPlus, Zap, Check, Bell } from "lucide-react";
import { Link } from "wouter";

interface NotificationActor {
  id: number;
  username: string;
  name: string;
  profileImage: string;
  isVerified: boolean;
}

interface NotificationPost {
  id: number;
  content: string;
  createdAt: string;
}

interface Notification {
  id: number;
  type: string;
  isRead: boolean;
  actorId: number;
  recipientId: number;
  postId?: number;
  data?: any;
  createdAt: string;
  timeAgo: string;
  actor: NotificationActor;
  post?: NotificationPost;
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'like':
      return <Heart className="h-5 w-5 text-red-500" fill="currentColor" />;
    case 'comment':
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'follow':
      return <UserPlus className="h-5 w-5 text-green-500" />;
    case 'repost':
      return <Zap className="h-5 w-5 text-purple-500" />;
    case 'circuit_join':
      return <Bell className="h-5 w-5 text-primary-500" />;
    default:
      return <Bell className="h-5 w-5 text-neutral-500" />;
  }
};

const getNotificationText = (notification: Notification) => {
  const { type, actor, post, data } = notification;
  
  switch (type) {
    case 'like':
      return `${actor.name} liked your post`;
    case 'comment':
      return `${actor.name} commented on your post`;
    case 'follow':
      return `${actor.name} started following you`;
    case 'repost':
      return `${actor.name} reposted your post`;
    case 'circuit_join':
      return `${actor.name} joined your circuit "${data?.circuitName}"`;
    default:
      return `${actor.name} interacted with your content`;
  }
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/notifications/${notification.id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to mark notification as read: ${error}`,
        variant: "destructive",
      });
    }
  });

  const handleClick = () => {
    if (!notification.isRead) {
      markAsReadMutation.mutate();
    }
  };

  const getClickableContent = () => {
    const baseContent = (
      <div className="flex items-start space-x-3 p-4 hover:bg-neutral-50 transition-colors">
        <div className="flex-shrink-0">
          <NotificationIcon type={notification.type} />
        </div>
        
        <div className="flex-shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={notification.actor.profileImage} alt={notification.actor.name} />
            <AvatarFallback>{notification.actor.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${notification.isRead ? 'text-neutral-600' : 'text-neutral-900 font-medium'}`}>
                {getNotificationText(notification)}
              </span>
              {notification.actor.isVerified && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-neutral-500">{notification.timeAgo}</span>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              )}
            </div>
          </div>
          
          {notification.post && (
            <div className="mt-2 p-2 bg-neutral-100 rounded-lg">
              <p className="text-sm text-neutral-700 line-clamp-2">
                {notification.post.content}
              </p>
            </div>
          )}
        </div>
      </div>
    );

    // Make it clickable based on the notification type
    if (notification.type === 'follow') {
      return (
        <Link href={`/profile/${notification.actor.username}`}>
          <a onClick={handleClick}>
            {baseContent}
          </a>
        </Link>
      );
    } else if (notification.post) {
      return (
        <Link href={`/post/${notification.post.id}`}>
          <a onClick={handleClick}>
            {baseContent}
          </a>
        </Link>
      );
    } else if (notification.type === 'circuit_join' && notification.data?.circuitId) {
      return (
        <Link href={`/circuits/${notification.data.circuitId}`}>
          <a onClick={handleClick}>
            {baseContent}
          </a>
        </Link>
      );
    }

    return (
      <div onClick={handleClick} className="cursor-pointer">
        {baseContent}
      </div>
    );
  };

  return (
    <div className={`border-b border-neutral-200 ${!notification.isRead ? 'bg-blue-50/30' : ''}`}>
      {getClickableContent()}
    </div>
  );
};

export default function Notifications() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications");
      return response as Notification[];
    },
    enabled: !!currentUser,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to mark all notifications as read: ${error}`,
        variant: "destructive",
      });
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!currentUser) {
    return (
      <MainShell>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-neutral-800 mb-4">Notifications</h1>
          <p className="text-neutral-600">Please log in to view your notifications.</p>
        </div>
      </MainShell>
    );
  }

  if (isLoading) {
    return (
      <MainShell>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-800">Notifications</h1>
                <div className="animate-pulse">
                  <div className="h-8 w-24 bg-neutral-200 rounded"></div>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-neutral-200 rounded"></div>
                    <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                      <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MainShell>
    );
  }

  if (error) {
    return (
      <MainShell>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-neutral-800 mb-4">Notifications</h1>
          <p className="text-red-600">Failed to load notifications</p>
        </div>
      </MainShell>
    );
  }

  return (
    <MainShell>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-neutral-800">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-neutral-600 mt-1">
                    {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Mark all read</span>
                </Button>
              )}
            </div>
          </div>

          <div className="divide-y divide-neutral-200">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            ) : (
              <div className="text-center py-12">
                <Bell className="mx-auto h-12 w-12 text-neutral-300 mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-2">No notifications yet</h3>
                <p className="text-neutral-600">
                  When someone likes your posts, follows you, or comments, you'll see it here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainShell>
  );
} 