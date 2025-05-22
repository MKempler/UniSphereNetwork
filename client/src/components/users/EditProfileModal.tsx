import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    bio?: string;
    profileImage?: string;
    coverImage?: string;
  };
}

export default function EditProfileModal({ open, onOpenChange, user }: EditProfileModalProps) {
  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(user.bio || "");
  const [profileImage, setProfileImage] = useState(user.profileImage || "");
  const [coverImage, setCoverImage] = useState(user.coverImage || "");
  const [newProfileFile, setNewProfileFile] = useState<File | null>(null);
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Requirements
  const PROFILE_MAX_SIZE_MB = 5;
  const COVER_MAX_SIZE_MB = 10;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; bio?: string; profileImage?: string; coverImage?: string }) => {
      return apiRequest("PATCH", "/api/users/me", payload);
    },
    onSuccess: (data: any) => {
      // Add cache busting parameter to image URLs if they exist
      if (data?.profileImage || data?.coverImage) {
        const userData = queryClient.getQueryData<any>(["/api/users/me"]);
        if (userData) {
          queryClient.setQueryData(["/api/users/me"], {
            ...userData,
            profileImage: data?.profileImage ? `${data.profileImage}?t=${Date.now()}` : userData.profileImage,
            coverImage: data?.coverImage ? `${data.coverImage}?t=${Date.now()}` : userData.coverImage
          });
        }
      }
      
      // More aggressive query invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      
      // Force refetch of user data
      queryClient.refetchQueries({ queryKey: ["/api/users/me"] });
      
      toast({ title: "Profile updated" });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Could not update profile: ${error}`,
        variant: "destructive"
      });
    }
  });

  const handleProfileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a jpg, png, or gif image.",
        variant: "destructive"
      });
      return;
    }
    if (file.size > PROFILE_MAX_SIZE_MB * 1024 * 1024) {
      toast({
        title: "Image too big",
        description: `Max size is ${PROFILE_MAX_SIZE_MB}MB. Please choose a smaller image.`,
        variant: "destructive"
      });
      return;
    }
    setIsUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "user_avatars");
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dqupzubco/image/upload",
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (data.secure_url) {
        setProfileImage(data.secure_url);
        setNewProfileFile(file);
      } else if (data.error && data.error.message) {
        toast({
          title: "Upload failed",
          description: data.error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a jpg, png, or gif image.",
        variant: "destructive"
      });
      return;
    }
    if (file.size > COVER_MAX_SIZE_MB * 1024 * 1024) {
      toast({
        title: "Image too big",
        description: `Max size is ${COVER_MAX_SIZE_MB}MB. Please choose a smaller image.`,
        variant: "destructive"
      });
      return;
    }
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "user_banners");
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dqupzubco/image/upload",
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (data.secure_url) {
        setCoverImage(data.secure_url);
        setNewCoverFile(file);
      } else if (data.error && data.error.message) {
        toast({
          title: "Upload failed",
          description: data.error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload banner. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    updateProfileMutation.mutate({ 
      name, 
      bio, 
      profileImage,
      coverImage
    });
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Customize your profile information and appearance
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          {/* Banner Image Upload */}
          <div className="relative">
            <div className="h-32 bg-primary-500/10 rounded-md overflow-hidden mb-2">
              {coverImage ? (
                <img 
                  src={coverImage} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  <span>No banner image</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="absolute bottom-4 right-2"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploadingCover}
            >
              {isUploadingCover ? "Uploading..." : "Change Banner"}
            </Button>
            <input
              type="file"
              ref={coverInputRef}
              className="hidden"
              onChange={handleCoverChange}
              accept="image/jpeg,image/png,image/gif"
              disabled={isUploadingCover}
            />
            <div className="text-xs text-neutral-500 mt-1">
              Recommended banner size: 1500×500 pixels. Max size: {COVER_MAX_SIZE_MB}MB.
            </div>
          </div>

          {/* Profile Image Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-primary-100">
                <AvatarImage src={profileImage} alt={name} />
                <AvatarFallback className="text-xl">{name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-0 right-0"
                onClick={() => profileInputRef.current?.click()}
                disabled={isUploadingProfile}
              >
                {isUploadingProfile ? "Uploading..." : "Change"}
              </Button>
              <input
                type="file"
                ref={profileInputRef}
                className="hidden"
                onChange={handleProfileChange}
                accept="image/jpeg,image/png,image/gif"
                disabled={isUploadingProfile}
              />
            </div>
            <div className="text-xs text-neutral-500 text-center">
              Allowed: JPG, PNG, GIF. Max size: {PROFILE_MAX_SIZE_MB}MB.
            </div>
          </div>

          {/* User Info Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium mb-1 block">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                maxLength={32}
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="bio" className="text-sm font-medium mb-1 block">
                Bio
              </label>
              <Textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell others about yourself"
                maxLength={160}
                rows={3}
                disabled={isSaving}
              />
              <div className="text-xs text-neutral-500 mt-1 text-right">
                {bio?.length || 0}/160
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isUploadingProfile || isUploadingCover}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 