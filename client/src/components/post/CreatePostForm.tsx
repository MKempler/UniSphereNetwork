import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { detectLanguage } from "@/lib/translation";
import { User } from "@/types";

interface CreatePostFormProps {
  user: User;
}

export default function CreatePostForm({ user }: CreatePostFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    mutationFn: async (newPost: { content: string; language: string }) => {
      return apiRequest("POST", "/api/posts", newPost);
    },
    onSuccess: () => {
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      toast({
        title: "Success",
        description: "Your post has been published",
      });
      // Refresh the feed
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
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
      language: selectedLanguage
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex">
        <Avatar className="w-10 h-10 mr-3">
          <AvatarImage src={user.profileImage} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea 
            ref={textareaRef}
            placeholder={t("post.create")}
            className="w-full border border-neutral-medium rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
            value={content}
            onChange={handleTextareaChange}
            disabled={isSubmitting}
          />
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center space-x-2">
              <button 
                className="text-primary p-2 rounded-full hover:bg-neutral-light transition-colors" 
                title="Add media"
                disabled={isSubmitting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button 
                className="text-primary p-2 rounded-full hover:bg-neutral-light transition-colors" 
                title="Create poll"
                disabled={isSubmitting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              <button 
                className="text-primary p-2 rounded-full hover:bg-neutral-light transition-colors" 
                title="Add emoji"
                disabled={isSubmitting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="relative ml-1">
                <button 
                  className="flex items-center text-primary text-sm px-2 py-1 rounded-full hover:bg-neutral-light transition-colors"
                  disabled={isSubmitting}
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    {selectedLanguage.toUpperCase()}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <button 
              className="bg-primary text-white px-4 py-2 rounded-full font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? "Posting..." : t("post.post")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
