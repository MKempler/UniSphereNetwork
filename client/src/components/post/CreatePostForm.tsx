import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { detectLanguage } from "@/lib/translation";
import { User } from "@/types";
import { CircuitListItem } from "@/types/circuit";
import { Check, ChevronDown, Image, LucideGlobe, MessageSquarePlus, SmilePlus } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface CreatePostFormProps {
  user: User;
  defaultCircuitId?: number;
}

export default function CreatePostForm({ user, defaultCircuitId }: CreatePostFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [selectedCircuit, setSelectedCircuit] = useState<CircuitListItem | null>(null);
  const [circuitPopoverOpen, setCircuitPopoverOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user's subscribed circuits
  const { data: circuits } = useQuery<CircuitListItem[]>({
    queryKey: ["userSubscribedCircuits"],
    queryFn: async () => {
      // Get all circuits
      const allCircuitsData = await apiRequest("GET", "/api/circuits/popular");
      
      // Filter to only include circuits the user is subscribed to
      if (!Array.isArray(allCircuitsData)) {
        console.error("Expected array from /api/circuits/popular, got:", allCircuitsData);
        return [];
      }
      return allCircuitsData.filter((circuit: CircuitListItem) => circuit.isSubscribed);
    },
    // Only run this query if user is authenticated
    enabled: !!user?.id
  });

  // Set default circuit if provided
  useEffect(() => {
    if (defaultCircuitId && circuits) {
      const circuit = circuits.find(c => c.id === defaultCircuitId);
      if (circuit) {
        setSelectedCircuit(circuit);
      }
    }
  }, [defaultCircuitId, circuits]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setContent(target.value);
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    
    // Detect language if content is long enough
    if (target.value.length > 10) {
      detectLanguage(target.value)
        .then(lang => setSelectedLanguage(lang))
        .catch(() => {/* fallback to default language */});
    }
  };

  const createPostMutation = useMutation({
    mutationFn: async (newPost: { content: string; language: string; circuitId?: number }) => {
      return apiRequest("POST", "/api/posts", newPost);
    },
    onSuccess: async (post) => {
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      toast({
        title: "Success",
        description: selectedCircuit 
          ? `Your post has been published to ${selectedCircuit.name}`
          : "Your post has been published",
      });
      
      // Refresh the feed
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      // If post was made to a circuit, refresh that circuit's posts
      if (selectedCircuit) {
        queryClient.invalidateQueries({ queryKey: ["circuitDetail", selectedCircuit.id.toString()] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to publish post: ${error}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    createPostMutation.mutate({
      content: content.trim(),
      language: selectedLanguage,
      circuitId: selectedCircuit?.id
    });
  };

  return (
    <div className="relative bg-white dark:bg-neutral-50 border border-neutral-200 shadow rounded-2xl p-4 mb-6">
      <div className="flex">
        <Avatar className="w-12 h-12 mr-4">
          <AvatarImage src={user.profileImage} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea 
            ref={textareaRef}
            placeholder={selectedCircuit 
              ? t("post.createInCircuit", { circuit: selectedCircuit.name }) 
              : t("post.create")}
            className="w-full resize-none border-none outline-none bg-transparent focus:ring-2 focus:ring-primary-500 rounded-xl transition p-3 min-h-[64px] text-base"
            rows={3}
            value={content}
            onChange={handleTextareaChange}
            disabled={isSubmitting}
          />
          
          {/* Post actions bar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <button 
              className="text-primary p-2 rounded-full hover:bg-neutral-light transition-colors focus-visible:outline-primary-500" 
                title="Add media"
                disabled={isSubmitting}
              >
                <Image className="h-5 w-5" />
              </button>
              <button 
              className="text-primary p-2 rounded-full hover:bg-neutral-light transition-colors focus-visible:outline-primary-500" 
                title="Create poll"
                disabled={isSubmitting}
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
              <button 
              className="text-primary p-2 rounded-full hover:bg-neutral-light transition-colors focus-visible:outline-primary-500" 
                title="Add emoji"
                disabled={isSubmitting}
              >
                <SmilePlus className="h-5 w-5" />
              </button>
              
              {/* Language selector */}
              <div className="relative ml-1">
                <button 
                className="flex items-center text-primary text-sm px-2 py-1 rounded-full hover:bg-neutral-light transition-colors focus-visible:outline-primary-500"
                  disabled={isSubmitting}
                >
                  <span className="flex items-center">
                    <LucideGlobe className="h-4 w-4 mr-1" />
                    {selectedLanguage.toUpperCase()}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
              </div>
              
              {/* Circuit selector */}
              <Popover open={circuitPopoverOpen} onOpenChange={setCircuitPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="ml-2 flex items-center h-8 text-xs font-normal"
                  >
                    {selectedCircuit ? (
                      <>
                        <span 
                          className="w-3 h-3 rounded-full mr-1"
                          style={{
                            backgroundColor: selectedCircuit?.name 
                              ? `hsl(${selectedCircuit.name.charCodeAt(0) % 360}, 70%, 80%)` 
                              : 'transparent'
                          }}
                        ></span>
                        {selectedCircuit.name}
                      </>
                    ) : (
                      <>Global</>
                    )}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" sideOffset={5}>
                  <Command>
                    <CommandInput placeholder="Search circuits..." />
                    <CommandList>
                      <CommandEmpty>No circuits found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          className="flex items-center gap-2 text-sm"
                          onSelect={() => {
                            setSelectedCircuit(null);
                            setCircuitPopoverOpen(false);
                          }}
                        >
                          <div className={`flex items-center gap-2 ${!selectedCircuit ? 'text-primary-500 font-medium' : ''}`}>
                            <LucideGlobe className="w-4 h-4" />
                            <span>Global Feed</span>
                            {!selectedCircuit && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </div>
                        </CommandItem>
                        
                        {circuits && circuits.length > 0 ? (
                          circuits.map((circuit) => (
                            <CommandItem
                              key={circuit.id}
                              className="flex items-center gap-2 text-sm"
                              onSelect={() => {
                                setSelectedCircuit(circuit);
                                setCircuitPopoverOpen(false);
                              }}
                            >
                              <div className={`flex items-center gap-2 ${selectedCircuit?.id === circuit.id ? 'text-primary-500 font-medium' : ''}`}>
                                <span 
                                  className="w-4 h-4 rounded-full"
                                  style={{
                                    backgroundColor: circuit.name 
                                      ? `hsl(${circuit.name.charCodeAt(0) % 360}, 70%, 80%)` 
                                      : 'transparent'
                                  }}
                                ></span>
                                <span>{circuit.name}</span>
                                {selectedCircuit?.id === circuit.id && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
                              </div>
                            </CommandItem>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-center text-neutral-600 border-t">
                            <p>You haven't subscribed to any circuits yet.</p>
                            <a href="/circuits" className="text-primary-500 hover:underline font-medium block mt-1">
                              Visit the Social Circuits tab to discover and join communities!
                            </a>
                          </div>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Post button */}
            <Button 
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
              size="sm"
              className="rounded-full px-4"
            >
              {isSubmitting ? "Posting..." : t("post.post")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
