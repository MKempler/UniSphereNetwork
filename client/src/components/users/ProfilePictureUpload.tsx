import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfilePictureUploadProps {
  user: {
    profileImage?: string;
    name: string;
  };
}

export default function ProfilePictureUpload({ user }: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      return apiRequest("PATCH", "/api/users/me", { profileImage: imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Profile picture updated" });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Could not update profile: ${error}`,
        variant: "destructive"
      });
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "user_avatars"); // Set this up in Cloudinary
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dqupzubco/image/upload",
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (data.secure_url) {
        updateProfileMutation.mutate(data.secure_url);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="w-24 h-24 border-2 border-primary-100">
        <AvatarImage src={user.profileImage} alt={user.name} />
        <AvatarFallback className="text-xl">{user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="relative">
        <input
          type="file"
          id="avatar-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept="image/*"
          disabled={isUploading}
        />
        <Button
          variant="outline"
          size="sm"
          className="relative"
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : "Change Picture"}
        </Button>
      </div>
    </div>
  );
} 