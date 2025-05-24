import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/simpleAuth';

interface User {
  id: number;
  username: string;
  name: string;
  profileImage: string;
  isVerified: boolean;
}

interface NewConversationModalProps {
  onConversationCreated: (conversationId: number) => void;
}

export default function NewConversationModal({ onConversationCreated }: NewConversationModalProps) {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest('GET', `/api/search/global?q=${encodeURIComponent(query)}&type=users&limit=10`);
      // Filter out current user and already selected users
      const filteredUsers = response.users.filter((user: User) => 
        user.id !== currentUser?.id && !selectedUsers.some(selected => selected.id === user.id)
      );
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Failed to search users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const timeoutId = setTimeout(() => searchUsers(value), 300);
    return () => clearTimeout(timeoutId);
  };

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(selected => selected.id === user.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const response = await apiRequest('POST', '/api/conversations', {
        type: selectedUsers.length === 1 ? 'direct' : 'group',
        title: selectedUsers.length > 1 ? `${currentUser?.name}, ${selectedUsers.map(u => u.name).join(', ')}` : undefined,
        participantIds: selectedUsers.map(user => user.id)
      });

      onConversationCreated(response.conversationId);
      
      // Reset modal state
      setIsOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="p-2">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search for people..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Selected:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 bg-blue-50 rounded-full px-3 py-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.profileImage} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="max-h-60 overflow-y-auto">
            {isSearching ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUserSelection(user)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.profileImage} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                    </div>
                    {selectedUsers.some(selected => selected.id === user.id) && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() && !isSearching ? (
              <div className="text-center py-4 text-gray-500">
                No users found
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createConversation}
              disabled={selectedUsers.length === 0 || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 