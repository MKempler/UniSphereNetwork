import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { LuCopy, LuPartyPopper, LuCheck } from 'react-icons/lu';

interface PostRegistrationDidModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDid: string | null | undefined;
  username: string | null | undefined;
}

const PostRegistrationDidModal: React.FC<PostRegistrationDidModalProps> = ({ isOpen, onClose, userDid, username }) => {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (!userDid || !username) return null; // Don't render if essential info is missing

  const handleCopyDid = () => {
    navigator.clipboard.writeText(userDid)
      .then(() => toast({ title: "DID Copied!", description: "Your DID has been copied to the clipboard." }))
      .catch(() => toast({ title: "Copy Failed", description: "Could not copy DID to clipboard.", variant: "destructive" }));
  };

  const handleContinue = () => {
    onClose();
    navigate('/'); // Navigate to home page
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LuPartyPopper className="h-6 w-6 text-primary" />
            Welcome to UniSphere, {username}!
          </DialogTitle>
          <DialogDescription className="mt-2">
            Your account has been successfully created. Here is your unique Decentralized Identifier (DID):
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-md">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">Your Decentralized ID (DID)</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-mono break-all text-neutral-800 dark:text-neutral-200" title={userDid}>
              {userDid}
            </p>
            <Button variant="ghost" size="icon" onClick={handleCopyDid} className="h-8 w-8 flex-shrink-0">
              <LuCopy className="h-4 w-4" />
              <span className="sr-only">Copy DID</span>
            </Button>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          You can use this DID to log in securely without a password. It is also displayed on your profile page for future reference.
        </p>

        <DialogFooter className="mt-6">
          <Button onClick={handleContinue} className="w-full sm:w-auto">
            Continue to UniSphere
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostRegistrationDidModal; 