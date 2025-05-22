import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useUser } from '@/lib/UserContext';
import MainShell from '@/components/MainShell';
import SideNav from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { CircuitDetail } from '@/types/circuit';
import type { Circuit } from '../../../../shared/schema';

interface UpdateCircuitPayload extends Partial<Pick<Circuit, 'name' | 'description' | 'isPublic'>> {}

const fetchCircuitForEdit = async (id: string): Promise<CircuitDetail> => {
  const circuit = await apiRequest<CircuitDetail>('GET', `/api/circuits/${id}`);
  if (!circuit) {
    throw new Error('Circuit not found or failed to fetch for editing.');
  }
  return circuit;
};

const updateCircuitApiCall = (circuitId: string, payload: UpdateCircuitPayload) => {
  return apiRequest<Circuit>('PUT', `/api/circuits/${circuitId}`, payload);
}

const EditCircuitPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [, params] = useRoute("/circuits/:id/edit");
  const circuitId = params?.id;
  const [, navigate] = useLocation();
  const { user } = useUser();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const { data: circuitData, isLoading: isLoadingCircuit, error: circuitError, refetch } = useQuery({
    queryKey: ['circuitDetailForEdit', circuitId],
    queryFn: () => {
      if (!circuitId) throw new Error('Circuit ID is required to fetch details for editing.');
      return fetchCircuitForEdit(circuitId);
    },
    enabled: !!circuitId,
    onSuccess: (data: CircuitDetail) => {
      if (data) {
        setName(data.name || '');
        setDescription(data.description || '');
        setIsPublic(data.isPublic === undefined ? true : data.isPublic);
        if (user?.id !== data.creatorId) {
          toast({ title: 'Unauthorized', description: 'You are not the creator of this circuit.', variant: 'destructive' });
          navigate(circuitId ? `/circuits/${circuitId}` : '/circuits');
        }
      }
    },
    onError: (err: Error) => {
        toast({ title: 'Error Loading Circuit', description: err.message || 'Failed to load circuit details.', variant: 'destructive' });
        navigate(circuitId ? `/circuits/${circuitId}` : '/circuits');
    }
  });

  const updateCircuitMutation = useMutation<Circuit, Error, UpdateCircuitPayload>({
    mutationFn: (payload: UpdateCircuitPayload) => {
        if (!circuitId) throw new Error("Circuit ID is missing for update.");
        return updateCircuitApiCall(circuitId, payload);
    },
    onSuccess: (updatedCircuit: Circuit) => {
      toast({ title: 'Circuit updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['circuitDetail', circuitId] });
      queryClient.invalidateQueries({ queryKey: ['popularCircuits'] });
      queryClient.setQueryData(['circuitDetailForEdit', circuitId], updatedCircuit);
      if (circuitId) navigate(`/circuits/${circuitId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating circuit',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!circuitId || !circuitData) {
        toast({ title: 'Error', description: 'Circuit data not loaded or ID missing. Cannot submit.', variant: 'destructive' });
        return;
    }
    if (!user || user.id !== circuitData.creatorId) {
      toast({ title: 'Error', description: 'You are not authorized to edit this circuit.', variant: 'destructive' });
      return;
    }
    if (!name.trim()) {
        toast({ title: 'Error', description: 'Circuit name cannot be empty.', variant: 'destructive' });
        return;
    }

    const payload: UpdateCircuitPayload = {};
    const trimmedName = name.trim();
    const currentDescription = description;

    if (trimmedName !== circuitData.name) payload.name = trimmedName;
    if (currentDescription !== (circuitData.description || '')) payload.description = currentDescription;
    if (isPublic !== circuitData.isPublic) payload.isPublic = isPublic;

    if (Object.keys(payload).length === 0) {
      toast({ title: 'No changes', description: 'No changes were made to the circuit details.' });
      if (circuitId) navigate(`/circuits/${circuitId}`);
      return;
    }
    updateCircuitMutation.mutate(payload);
  };

  if (isLoadingCircuit) {
    return (
      <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
        <div className="flex justify-center items-center min-h-[calc(100vh-150px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="ml-3 text-lg">Loading circuit details...</p>
        </div>
      </MainShell>
    );
  }

  if (circuitError || !circuitData) {
    return (
      <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
         <div className="max-w-2xl mx-auto py-10 px-4 text-center">
            <p className="text-red-500 mb-4 text-lg">
                {circuitError?.message || 'Failed to load circuit. It might not exist or you may not have permission.'}
            </p>
            <Button onClick={() => circuitId ? refetch() : navigate('/circuits')} className="mr-2">
                {circuitId ? 'Try Again' : 'Go to Circuits'}
            </Button>
            {circuitId && <Button variant="outline" onClick={() => navigate(`/circuits/${circuitId}`)}>View Original Circuit</Button>}
        </div>
      </MainShell>
    );
  }
  
  if (user?.id !== circuitData.creatorId) {
     return (
        <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
            <div className="max-w-2xl mx-auto py-10 px-4 text-center">
                <p className="text-red-500 mb-4 text-lg">You are not authorized to edit this circuit.</p>
                <Button onClick={() => navigate(circuitId ? `/circuits/${circuitId}` : '/circuits')}>
                    {circuitId ? 'View Circuit' : 'Go to Circuits'}
                </Button>
            </div>
        </MainShell>
     );
  }

  return (
    <MainShell leftNav={<SideNav />} rightAside={<RightSidebar />}>
      <div className="max-w-2xl mx-auto py-10 px-4">
        <Button variant="ghost" onClick={() => {if(circuitId) navigate(`/circuits/${circuitId}`)}} className="mb-6 text-sm inline-flex items-center" disabled={!circuitId}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Circuit Details
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Edit Social Circuit</CardTitle>
            <CardDescription>
              Update the details for "{circuitData.name}".
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Circuit Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Quantum Entanglement Enthusiasts"
                  required
                  maxLength={255}
                  disabled={updateCircuitMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief overview of what this circuit is about."
                  rows={4}
                  disabled={updateCircuitMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <RadioGroup
                  value={isPublic ? "public" : "private"}
                  onValueChange={(value) => setIsPublic(value === "public")}
                  className="flex space-x-4"
                  disabled={updateCircuitMutation.isPending}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public-edit" />
                    <Label htmlFor="public-edit" className="font-normal">Public</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private-edit" />
                    <Label htmlFor="private-edit" className="font-normal">Private</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => {if(circuitId) navigate(`/circuits/${circuitId}`)}} type="button" disabled={updateCircuitMutation.isPending || !circuitId}>
                    Cancel
                </Button>
              <Button type="submit" disabled={updateCircuitMutation.isPending || isLoadingCircuit} className="sm:w-auto">
                {updateCircuitMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                    'Save Changes'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </MainShell>
  );
};

export default EditCircuitPage; 