import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Post, User, Circuit } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Hash, User as UserIcon, CircleIcon } from "lucide-react";

interface SearchResults {
  posts: Post[];
  users: User[];
  circuits: Circuit[];
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'posts' | 'users' | 'circuits'>('all');
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: results } = useQuery<SearchResults>({
    queryKey: ['/api/search/global', query, selectedType === 'all' ? undefined : selectedType],
    queryFn: async () => {
      if (!query.trim()) return { posts: [], users: [], circuits: [] };
      
      const params = new URLSearchParams({
        q: query.trim(),
        limit: '5'
      });
      
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      
      return await apiRequest('GET', `/api/search/global?${params}`);
    },
    enabled: query.trim().length > 1,
    placeholderData: { posts: [], users: [], circuits: [] },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasResults = results && (results.posts.length > 0 || results.users.length > 0 || results.circuits.length > 0);

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        <Input
          type="text"
          placeholder="Search UniSphere..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-4 py-2 w-full border border-neutral-300 dark:border-neutral-600 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {isOpen && query.trim().length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Filter tabs */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-700 p-3">
            {(['all', 'posts', 'users', 'circuits'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors mr-2 ${
                  selectedType === type
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {hasResults ? (
            <div className="p-3 space-y-4">
              {/* Users */}
              {results.users.length > 0 && (selectedType === 'all' || selectedType === 'users') && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    <UserIcon className="h-4 w-4" />
                    People
                  </div>
                  <div className="space-y-2">
                    {results.users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.username}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImage} alt={user.name} />
                          <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{user.name || 'Unknown User'}</div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">@{user.username || 'unknown'}</div>
                        </div>
                        {user.isVerified && (
                          <Badge variant="secondary" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Circuits */}
              {results.circuits.length > 0 && (selectedType === 'all' || selectedType === 'circuits') && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    <CircleIcon className="h-4 w-4" />
                    Circuits
                  </div>
                  <div className="space-y-2">
                    {results.circuits.map((circuit) => (
                      <Link
                        key={circuit.id}
                        href={`/circuits/${circuit.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                          <CircleIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{circuit.name}</div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{circuit.description}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Circuit
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {results.posts.length > 0 && (selectedType === 'all' || selectedType === 'posts') && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    <Hash className="h-4 w-4" />
                    Posts
                  </div>
                  <div className="space-y-2">
                    {results.posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        onClick={() => setIsOpen(false)}
                        className="block p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-6 w-6 mt-1">
                            <AvatarImage src={post.author?.profileImage} alt={post.author?.name} />
                            <AvatarFallback className="text-xs">{post.author?.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                              {post.author?.name || 'Unknown'} @{post.author?.username || 'unknown'}
                            </div>
                            <div className="text-neutral-900 dark:text-neutral-100 text-sm line-clamp-2">
                              {post.content}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : query.trim().length > 1 ? (
            <div className="p-6 text-center text-neutral-500 dark:text-neutral-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No results found for "{query}"</div>
              <div className="text-xs mt-1">Try searching for users, posts, or circuits</div>
            </div>
          ) : null}

          {/* View all results link */}
          {hasResults && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 p-3">
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => setIsOpen(false)}
                className="block text-center text-primary-500 hover:text-primary-600 text-sm font-medium"
              >
                View all results for "{query}"
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 