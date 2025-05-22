import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { CircuitListItem } from '@/types/circuit';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightRail from '@/components/layout/RightSidebar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import stringToHslColor from '@/utils/stringToHslColor';

interface CreateCircuitPayload {
  name: string;
  description?: string;
  isPublic: boolean;
  categoryId?: number;
}

const createCircuit = async (payload: CreateCircuitPayload): Promise<CircuitListItem> => {
  const responseData = await apiRequest('POST', '/api/circuits', payload);
  return responseData;
};

const CreateCircuitPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Form state
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  // Fetch categories for dropdown
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest('GET', '/api/categories'),
  });

  const mutation = useMutation<CircuitListItem, Error, CreateCircuitPayload>({
    mutationFn: createCircuit,
    onSuccess: (data) => {
      // Invalidate multiple circuit-related queries
      queryClient.invalidateQueries({ queryKey: ['popularCircuits'] });
      queryClient.invalidateQueries({ queryKey: ['circuits'] }); // This covers all circuit queries including category-specific ones
      queryClient.invalidateQueries({ queryKey: ['categories'] }); // In case category stats change
      toast({ title: 'Circuit created successfully!', description: `Circuit "${data.name}" has been created.` });
      navigate('/circuits');
    },
    onError: (error) => {
      toast({ title: 'Error creating circuit', description: error.message, variant: 'destructive' });
    },
  });

  const moveToNextStep = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const moveToPreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Validation Error', description: 'Circuit name is required.', variant: 'destructive' });
      return;
    }
    mutation.mutate({ name, description, isPublic, categoryId });
  };

  const isNextDisabled = () => {
    if (step === 1) {
      return !name.trim();
    }
    return false;
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
  return (
          <div className="flex flex-col gap-4">
        <div>
                <Label htmlFor="name" className="font-semibold">Circuit Name</Label>
                <Input
                  id="name"
            value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Awesome Tech News, Daily Photography"
                  className="mt-1"
            required
          />
        </div>
        <div>
                <Label htmlFor="description" className="font-semibold">Description <span className="font-normal text-neutral-500">(Optional)</span></Label>
                <Textarea
                  id="description"
            value={description}
                  onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this circuit about?"
                  rows={3}
                  className="mt-1"
          />
        </div>
        <div>
          <Label className="font-semibold mb-2 block">Category <span className="font-normal text-neutral-500">(Optional)</span></Label>
          <Select 
            value={categoryId?.toString() || ""} 
            onValueChange={(value) => setCategoryId(value ? parseInt(value) : undefined)}
            disabled={categoriesLoading}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select a category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No category</SelectItem>
              {categories.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Help others discover your circuit by choosing a relevant category.
          </p>
        </div>
            <div>
              <Label className="font-semibold mb-2 block">Visibility</Label>
              <RadioGroup 
                value={isPublic ? "public" : "private"}
                onValueChange={(value) => setIsPublic(value === "public")}
                className="flex space-x-4 mt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="font-normal">Public</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="font-normal">Private</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-1">
                Public circuits are visible to everyone. Private circuits may have restricted visibility (full functionality TBD).
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
              <h3 className="font-semibold mb-4">Circuit Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-neutral-500">Name</p>
                  <p className="font-medium">{name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-neutral-500">Description</p>
                  <p className="font-medium">{description || 'No description provided.'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Category</p>
                  <p className="font-medium">
                    {categoryId 
                      ? categories.find((cat: any) => cat.id === categoryId)?.name || 'Unknown Category'
                      : 'No category selected'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Visibility</p>
                  <p className="font-medium">{isPublic ? 'Public' : 'Private'}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-neutral-500 text-sm">
              Please review your circuit details above before creating.
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightRail />}>
      <div className="flex flex-col min-h-screen bg-[#FFF9F3]">
        <div className="max-w-2xl mx-auto w-full pt-10 pb-6">
          <h1 className="text-3xl font-bold mb-1">Create a New Social Circuit</h1>
          <p className="text-neutral-600 mb-6">Define a new thematic feed for yourself or others to follow.</p>
          {/* Stepper */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`font-medium ${step >= 1 ? 'text-primary-700' : 'text-neutral-400'}`}>Details</span>
            </div>
            <div className={`h-0.5 w-8 rounded ${step >= 2 ? 'bg-primary-500' : 'bg-neutral-200'}`} />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                2
              </div>
              <span className={`font-medium ${step >= 2 ? 'text-primary-700' : 'text-neutral-400'}`}>Confirmation</span>
            </div>
          </div>
          {/* Card with form and preview */}
          <div className="flex flex-col md:flex-row gap-6">
            <form className="flex-1 bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col gap-4">
              {renderStepContent()}
              <div className="flex justify-between mt-6">
                {step > 1 ? (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex items-center gap-1"
                    onClick={moveToPreviousStep}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                ) : <div />}
                
                {step < 2 ? (
                  <Button 
                    type="button"
                    className="flex items-center gap-1 ml-auto"
                    onClick={moveToNextStep}
                    disabled={isNextDisabled()}
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    className="flex items-center gap-1 ml-auto"
                    disabled={mutation.isPending}
                    onClick={handleSubmit}
                  >
                {mutation.isPending ? 'Creating Circuit...' : 'Create Circuit'}
              </Button>
                )}
              </div>
            </form>
            {/* Live Preview */}
            <div className="flex-1 bg-primary-50/40 rounded-2xl border border-primary-100 p-6 shadow-sm flex flex-col gap-4 min-w-[260px] max-w-xs mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7V6a2 2 0 012-2h12a2 2 0 012 2v1M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M4 7h16" /></svg>
                <span className="font-semibold text-primary-700">Live Preview</span>
              </div>
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div 
                  className="h-6 w-full" 
                  style={{ backgroundColor: stringToHslColor(name || 'Circuit Name') }}
                />
                <div className="p-4 flex flex-col gap-3">
                <div className="font-semibold text-lg truncate">{name || 'Circuit Name'}</div>
                <div className="text-neutral-500 text-sm min-h-[2em]">{description || 'No description provided.'}</div>
                  <div className="text-xs text-neutral-400 flex items-center mt-1">
                  </div>
                <Button className="mt-2 w-full" variant="default" type="button" tabIndex={-1} disabled>Subscribe</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
    </MainShell>
  );
};

export default CreateCircuitPage; 