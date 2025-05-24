import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Reply, Heart, ThumbsUp, Smile, Download, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/simpleAuth';

interface User {
  id: number;
  username: string;
  name: string;
  profileImage: string;
  isVerified: boolean;
}

interface MessageReaction {
  id: number;
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: string;
  replyToMessageId?: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  timeAgo: string;
  sender: User;
  reactions?: MessageReaction[];
  replyToMessage?: {
    id: number;
    content: string;
    sender: User;
  };
}

interface MessageItemProps {
  message: Message;
  onReply: (message: Message) => void;
  onReaction: (messageId: number, emoji: string) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function MessageItem({ message, onReply, onReaction }: MessageItemProps) {
  const { user: currentUser } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const reactionPanelRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  
  const isOwnMessage = message.senderId === currentUser?.id;

  // Close reaction panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showReactions &&
        reactionPanelRef.current &&
        emojiButtonRef.current &&
        !reactionPanelRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowReactions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactions]);

  const handleReaction = async (emoji: string) => {
    try {
      await onReaction(message.id, emoji);
      setShowReactions(false);
    } catch (error) {
      console.error('Failed to react to message:', error);
    }
  };

  const downloadFile = () => {
    if (message.fileUrl) {
      const link = document.createElement('a');
      link.href = message.fileUrl;
      link.download = message.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderFileAttachment = () => {
    if (!message.fileUrl) {
      return null;
    }

    const isImage = message.fileType?.startsWith('image/');
    
    if (isImage) {
      return (
        <div className="mt-2 max-w-xs">
          <img
            src={message.fileUrl}
            alt={message.fileName || 'Image'}
            className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowFullImage(true)}
            style={{ maxHeight: '200px', objectFit: 'cover' }}
          />
          {showFullImage && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
              onClick={() => setShowFullImage(false)}
            >
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Image'}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      );
    }

    // Non-image file
    return (
      <div className="mt-2 p-3 border rounded-lg bg-gray-50 flex items-center space-x-3 max-w-xs">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {message.fileName}
          </p>
          <p className="text-xs text-gray-500">
            {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'File'}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={downloadFile}
          className="flex-shrink-0"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const renderReplyPreview = () => {
    if (!message.replyToMessage) return null;

    return (
      <div className="mb-2 p-2 border-l-2 border-gray-300 bg-gray-50 rounded text-sm">
        <p className="text-gray-600 truncate">
          {message.replyToMessage.content}
        </p>
      </div>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {message.reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            onClick={() => handleReaction(reaction.emoji)}
            className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 transition-colors ${
              reaction.hasReacted
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {!isOwnMessage && (
          <Avatar className="w-6 h-6">
            <AvatarImage src={message.sender?.profileImage} />
            <AvatarFallback>
              {message.sender?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex flex-col">
          <div
            className={`px-3 py-2 rounded-lg relative ${
              isOwnMessage
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-gray-200 text-gray-900 rounded-bl-sm'
            }`}
          >
            {renderReplyPreview()}
            
            {/* Only show content text if it's not a default "Shared filename" message */}
            {message.content && !message.content.startsWith('Shared ') && (
              <p className="text-sm">{message.content}</p>
            )}
            
            {renderFileAttachment()}
            
            <p className={`text-xs mt-1 ${
              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {message.timeAgo}
            </p>

            {/* Hover actions */}
            <div className={`absolute top-0 ${isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} 
              opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-white border rounded-lg shadow-lg p-1`}>
              
              <Button
                ref={emojiButtonRef}
                size="sm"
                variant="ghost"
                onClick={() => setShowReactions(!showReactions)}
                className="w-6 h-6 p-0 hover:bg-gray-100 text-gray-600 hover:text-gray-800 relative"
              >
                <Smile className="w-3 h-3" />
                
                {/* Quick reaction panel - positioned relative to this button */}
                {showReactions && (
                  <div 
                    ref={reactionPanelRef}
                    className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} top-full mt-1 bg-white rounded-lg shadow-lg border p-2 flex space-x-1 z-50 whitespace-nowrap`}
                  >
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className="hover:bg-gray-100 rounded p-1 text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReply(message)}
                className="w-6 h-6 p-0 hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              >
                <Reply className="w-3 h-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="w-6 h-6 p-0 hover:bg-gray-100 text-gray-600 hover:text-gray-800"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>


          </div>

          {renderReactions()}
        </div>
      </div>
    </div>
  );
} 