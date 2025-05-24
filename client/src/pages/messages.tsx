import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { useAuth } from '@/hooks/simpleAuth';
import { apiRequest } from '@/lib/queryClient';
import { Search, MessageCircle, Send, Plus, Paperclip, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NewConversationModal from '@/components/messaging/NewConversationModal';
import MessageItem from '@/components/messaging/MessageItem';
import FileUploadModal from '@/components/messaging/FileUploadModal';
import EmojiPicker from '@/components/messaging/EmojiPicker';

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

interface Conversation {
  id: number;
  type: string;
  title?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await apiRequest('GET', '/api/conversations');
      setConversations(response);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setIsLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId: number) => {
    try {
      const response = await apiRequest('GET', `/api/conversations/${conversationId}/messages`);
      setMessages(response);
      
      // Mark as read
      await apiRequest('PATCH', `/api/conversations/${conversationId}/read`);
      
      // Update conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Send a message
  const sendMessage = async (fileData?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }) => {
    const hasContent = newMessage.trim() || fileData;
    if (!hasContent || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const messageData: any = {
        content: newMessage || (fileData ? `Shared ${fileData.name}` : ''),
        messageType: fileData ? (fileData.type.startsWith('image/') ? 'image' : 'file') : 'text'
      };

      // Add reply reference if replying
      if (replyingTo) {
        messageData.replyToMessageId = replyingTo.id;
      }

      // Add file data if present
      if (fileData) {
        messageData.fileUrl = fileData.url;
        messageData.fileName = fileData.name;
        messageData.fileType = fileData.type;
        messageData.fileSize = fileData.size;
      }

      const response = await apiRequest('POST', `/api/conversations/${selectedConversation.id}/messages`, messageData);

      setMessages(prev => [...prev, response]);
      setNewMessage('');
      setReplyingTo(null);
      
      // Update conversation's last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: response, updatedAt: response.createdAt }
            : conv
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle message reactions
  const handleMessageReaction = async (messageId: number, emoji: string) => {
    try {
      await apiRequest('POST', `/api/messages/${messageId}/react`, { emoji });
      // Reload messages to get updated reactions
      if (selectedConversation) {
        loadMessages(selectedConversation.id);
      }
    } catch (error) {
      console.error('Failed to react to message:', error);
    }
  };

  // Handle message replies
  const handleMessageReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Handle file upload completion
  const handleFileUploaded = (fileData: { url: string; name: string; type: string; size: number }) => {
    sendMessage(fileData);
    setShowFileUpload(false);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  // Handle conversation selection
  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  // Handle new conversation creation
  const handleConversationCreated = async (conversationId: number) => {
    // Reload conversations to include the new one
    await loadConversations();
    
    // Find and select the new conversation
    const newConversation = conversations.find(conv => conv.id === conversationId);
    if (newConversation) {
      selectConversation(newConversation);
    } else {
      // If not found immediately, reload conversations again and select
      setTimeout(async () => {
        await loadConversations();
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) selectConversation(conv);
      }, 1000);
    }
  };

  // Get conversation display name
  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === 'group' && conversation.title) {
      // Exclude current user from group chat name
      const otherNames = conversation.participants
        .filter(p => p.id !== user?.id)
        .map(p => p.name);
      return otherNames.join(', ');
    }
    if (conversation.participants.length === 1) {
      return conversation.participants[0].name;
    }
    return conversation.participants.map(p => p.name).join(', ');
  };

  // Get conversation avatar
  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.participants.length === 1) {
      return conversation.participants[0].profileImage;
    }
    
    // For group chats, use the first participant's avatar for now
    return conversation.participants[0]?.profileImage || '/default-profile.png';
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conversation =>
    getConversationName(conversation).toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  if (authLoading || isLoading) {
    return (
      <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainShell>
    );
  }

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="min-h-screen bg-neutral-light">
        <div className="max-w-6xl mx-auto">
          <div className="flex h-screen bg-white rounded-lg shadow-sm overflow-hidden">
            
            {/* Conversations Sidebar */}
            <div className="w-1/3 border-r border-neutral-light flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-neutral-light">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-neutral-dark">Messages</h2>
                  <NewConversationModal onConversationCreated={handleConversationCreated} />
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-neutral-gray">
                    <MessageCircle className="w-8 h-8 mb-2" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a conversation with someone!</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => selectConversation(conversation)}
                      className={`p-4 border-b border-neutral-light cursor-pointer hover:bg-neutral-light transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-primary/5 border-r-2 border-r-primary' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {conversation.type === 'group' && conversation.participants.filter((p) => p.id !== user?.id).length > 1 ? (
                            <span className="flex -space-x-2">
                              {conversation.participants
                                .filter((p) => p.id !== user?.id)
                                .slice(0, 5)
                                .map((p) => (
                                  <Avatar key={p.id} className="w-7 h-7 border-2 border-white shadow-sm">
                                    <AvatarImage src={p.profileImage} />
                                    <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                ))}
                              {conversation.participants.filter((p) => p.id !== user?.id).length > 5 && (
                                <span className="w-7 h-7 flex items-center justify-center bg-gray-200 text-xs rounded-full border-2 border-white">+{conversation.participants.filter((p) => p.id !== user?.id).length - 5}</span>
                              )}
                            </span>
                          ) : (
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={getConversationAvatar(conversation)} />
                              <AvatarFallback>
                                {getConversationName(conversation).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          {conversation.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-neutral-dark truncate">
                              {getConversationName(conversation)}
                            </h3>
                            {conversation.lastMessage && (
                              <span className="text-xs text-neutral-gray">
                                {conversation.lastMessage.timeAgo}
                              </span>
                            )}
                          </div>
                          
                          {conversation.lastMessage && (
                            <p className="text-sm text-neutral-gray truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-neutral-light bg-white">
                    <div className="flex items-center space-x-3">
                      {selectedConversation.type === 'group' && selectedConversation.participants.filter((p) => p.id !== user?.id).length > 1 ? (
                        <span className="flex -space-x-2">
                          {selectedConversation.participants
                            .filter((p) => p.id !== user?.id)
                            .slice(0, 5)
                            .map((p) => (
                              <Avatar key={p.id} className="w-10 h-10 border-2 border-white shadow-sm">
                                <AvatarImage src={p.profileImage} />
                                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ))}
                          {selectedConversation.participants.filter((p) => p.id !== user?.id).length > 5 && (
                            <span className="w-10 h-10 flex items-center justify-center bg-gray-200 text-xs rounded-full border-2 border-white">+{selectedConversation.participants.filter((p) => p.id !== user?.id).length - 5}</span>
                          )}
                        </span>
                      ) : (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getConversationAvatar(selectedConversation)} />
                          <AvatarFallback>
                            {getConversationName(selectedConversation).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <h3 className="font-medium text-neutral-dark flex items-center space-x-2">
                          <span>{getConversationName(selectedConversation)}</span>
                        </h3>
                        <p className="text-sm text-neutral-gray">
                          {selectedConversation.participants.length === 1 ? 'Active' : `${selectedConversation.participants.length} members`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        onReply={handleMessageReply}
                        onReaction={handleMessageReaction}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-neutral-light bg-white">
                    {/* Reply Preview */}
                    {replyingTo && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              Replying to {replyingTo.sender.name}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {replyingTo.content}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(null)}
                            className="ml-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFileUpload(true)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      
                      <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                      
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1"
                        disabled={isSending}
                      />
                      <Button 
                        onClick={() => sendMessage()} 
                        size="sm"
                        disabled={(!newMessage.trim() && !replyingTo) || isSending}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* No conversation selected */
                <div className="flex-1 flex items-center justify-center text-neutral-gray">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-neutral-light" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p>Choose a conversation from the sidebar to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onFileUploaded={handleFileUploaded}
      />
    </MainShell>
  );
} 