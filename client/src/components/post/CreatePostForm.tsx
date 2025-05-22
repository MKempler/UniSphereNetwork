import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { detectLanguage } from "@/lib/translation";
import { User } from "@/types";
import { CircuitListItem } from "@/types/circuit";
import { Check, ChevronDown, Image, LucideGlobe, MessageSquarePlus, SmilePlus, X, Upload } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import EmojiPicker from 'emoji-picker-react';

interface CreatePostFormProps {
  user: User;
  defaultCircuitId?: number;
}

interface AttachedImage {
  file: File;
  preview: string;
  id: string;
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 4;
  const MAX_CHARACTERS = 280;

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

  // Handle file processing (shared between file input and drag & drop)
  const processFiles = (files: File[]) => {
    files.forEach(file => {
      if (attachedImages.length >= MAX_IMAGES) {
        toast({
          title: "Too many images",
          description: `You can only attach up to ${MAX_IMAGES} images per post.`,
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Images must be smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newImage: AttachedImage = {
          file,
          preview: reader.result as string,
          id: Math.random().toString(36).substr(2, 9)
        };
        setAttachedImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);

    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  // Remove attached image
  const removeImage = (imageId: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Handle emoji selection
  const handleEmojiSelect = (emojiData: any) => {
    const emoji = emojiData.emoji;
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      
      // Reset cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
          textareaRef.current.focus();
        }
      }, 0);
    }
    setEmojiPickerOpen(false);
  };

  // Upload images to server
  const uploadImages = async (images: AttachedImage[]): Promise<string[]> => {
    const uploadPromises = images.map(async (image) => {
      const formData = new FormData();
      formData.append('image', image.file);
      
      try {
        const response = await fetch('http://localhost:5000/api/upload/image', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return `http://localhost:5000${data.url}`;
      } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  const createPostMutation = useMutation({
    mutationFn: async (newPost: { content: string; language: string; circuitId?: number; media?: string[] }) => {
      return apiRequest("POST", "/api/posts", newPost);
    },
    onSuccess: async (post) => {
      setContent("");
      setAttachedImages([]);
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
    if (!content.trim() && attachedImages.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      let mediaUrls: string[] = [];
      
      if (attachedImages.length > 0) {
        mediaUrls = await uploadImages(attachedImages);
      }
      
    createPostMutation.mutate({
      content: content.trim(),
      language: selectedLanguage,
        circuitId: selectedCircuit?.id,
        media: mediaUrls.length > 0 ? mediaUrls : undefined
      });
    } catch (error) {
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
    });
    }
  };

  const remainingChars = MAX_CHARACTERS - content.length;
  const isOverLimit = remainingChars < 0;
  const canPost = (content.trim() || attachedImages.length > 0) && !isOverLimit && !isSubmitting;

  return (
    <div 
      className={`relative bg-white dark:bg-neutral-50 border border-neutral-200 shadow rounded-2xl p-4 mb-6 transition-colors ${
        isDragOver ? 'border-primary-500 bg-primary-50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-primary-100/80 border-2 border-dashed border-primary-500 rounded-2xl flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-primary-600 mb-2" />
            <p className="text-primary-700 font-medium">Drop images here to upload</p>
          </div>
        </div>
      )}
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
            maxLength={MAX_CHARACTERS + 100} // Allow typing beyond limit for warning
          />
          
          {/* Character counter */}
          {content.length > 0 && (
            <div className="px-3 pb-2 text-right">
              <span className={`text-xs ${isOverLimit ? 'text-red-500 font-semibold' : remainingChars <= 20 ? 'text-yellow-600' : 'text-neutral-400'}`}>
                {remainingChars}
              </span>
            </div>
          )}
          
          {/* Image previews */}
          {attachedImages.length > 0 && (
            <div className="mx-3 mb-3">
              <div className={`grid gap-2 ${attachedImages.length === 1 ? 'grid-cols-1' : attachedImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {attachedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img 
                      src={image.preview} 
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border border-neutral-200"
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Post actions bar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-primary p-2 rounded-full hover:bg-neutral-100 transition-colors focus-visible:outline-primary-500" 
                title="Add images"
                disabled={isSubmitting || attachedImages.length >= MAX_IMAGES}
              >
                <Image className="h-5 w-5" />
              </button>
              
              {/* Emoji picker */}
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <button 
                    className="text-primary p-2 rounded-full hover:bg-neutral-100 transition-colors focus-visible:outline-primary-500" 
                    title="Add emoji"
                    disabled={isSubmitting}
                  >
                    <SmilePlus className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    width={320}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </PopoverContent>
              </Popover>
              
              <button 
              className="text-primary p-2 rounded-full hover:bg-neutral-100 transition-colors focus-visible:outline-primary-500" 
                title="Create poll"
                disabled={isSubmitting}
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
              
              {/* Language selector */}
              <div className="relative ml-1">
                <button 
                className="flex items-center text-primary text-sm px-2 py-1 rounded-full hover:bg-neutral-100 transition-colors focus-visible:outline-primary-500"
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
              disabled={!canPost}
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
