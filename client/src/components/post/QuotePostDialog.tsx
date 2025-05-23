import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/simpleAuth';
import { Post } from '@/types';
import TranslatedText from '@/components/common/TranslatedText';
import { getLanguageTag } from '@/lib/translation';
import { LuGlobe } from 'react-icons/lu';

interface QuotePostDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuotePostDialog({ post, open, onOpenChange }: QuotePostDialogProps) {
  const [content, setContent] = useState('');
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createQuotePostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/posts/${post.id}/quote`, {
        content,
        language: 'en' // You could add language detection here
      });
    },
    onSuccess: () => {
      toast({
        title: 'Quote posted!',
        description: 'Your quote post has been shared.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      onOpenChange(false);
      setContent('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create quote post: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = () => {
    if (content.trim().length <= 280) {
      createQuotePostMutation.mutate();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days}d`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quote Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current user and compose area */}
          <div className="flex space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={currentUser?.profileImage || '/default-profile.png'} 
                alt={currentUser?.name || currentUser?.username} 
              />
              <AvatarFallback>
                {(currentUser?.name || currentUser?.username || '?').charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add your thoughts..."
                className="min-h-[100px] resize-none border-none shadow-none focus-visible:ring-0 text-lg"
                maxLength={280}
              />
              
              {/* Character count */}
              <div className="text-right text-sm text-gray-500 mt-1">
                {content.length}/280
              </div>
            </div>
          </div>
          
          {/* Quoted post preview */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage 
                  src={post.author.profileImage || '/default-profile.png'} 
                  alt={post.author.name} 
                />
                <AvatarFallback className="text-xs">
                  {post.author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="font-semibold text-sm text-gray-900">{post.author.name}</p>
                  <p className="text-sm text-gray-500">@{post.author.username}</p>
                  <span className="text-gray-400">•</span>
                  <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
                  {post.language && (
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-primary/15 text-primary flex items-center gap-1.5 border border-primary/20">
                      <LuGlobe className="w-3 h-3" />
                      {getLanguageTag(post.language)}
                    </span>
                  )}
                </div>
                
                <TranslatedText
                  text={post.content}
                  as="p"
                  className="text-gray-800 text-sm"
                  showControls={false}
                  originalLanguage={post.language}
                />
                
                {post.media && (
                  <img 
                    src={post.media} 
                    alt="Post media" 
                    className="mt-3 max-w-full h-auto rounded-lg border"
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createQuotePostMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={content.length > 280 || createQuotePostMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {createQuotePostMutation.isPending ? 'Posting...' : 'Quote Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 