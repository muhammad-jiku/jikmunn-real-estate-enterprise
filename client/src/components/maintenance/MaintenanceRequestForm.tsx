/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import {
  MaintenanceRequest,
  useCreateMaintenanceRequestMutation,
  useGetAuthUserQuery,
  useGetTenantMaintenanceRequestsQuery,
} from '@/state/api';
import { AlertTriangle, CheckCircle, Clock, Plus, Wrench, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface MaintenanceRequestFormProps {
  propertyId: number;
  propertyName?: string;
}

const statusIcons = {
  Pending: <Clock className="w-4 h-4" />,
  InProgress: <Wrench className="w-4 h-4" />,
  Completed: <CheckCircle className="w-4 h-4" />,
  Cancelled: <XCircle className="w-4 h-4" />,
};

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-800',
  InProgress: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-gray-100 text-gray-800',
};

const priorityColors = {
  Low: 'bg-gray-100 text-gray-800',
  Medium: 'bg-blue-100 text-blue-800',
  High: 'bg-orange-100 text-orange-800',
  Urgent: 'bg-red-100 text-red-800',
};

export function MaintenanceRequestForm({ propertyId, propertyName }: MaintenanceRequestFormProps) {
  const { data: authUser } = useGetAuthUserQuery();
  const [createRequest, { isLoading }] = useCreateMaintenanceRequestMutation();
  const { data: requests } = useGetTenantMaintenanceRequestsQuery(
    authUser?.cognitoInfo?.userId || '',
    { skip: !authUser?.cognitoInfo?.userId }
  );

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');

  const propertyRequests = requests?.filter((r) => r.propertyId === propertyId) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.cognitoInfo?.userId) return;

    try {
      await createRequest({
        title,
        description,
        priority,
        propertyId,
        tenantCognitoId: authUser.cognitoInfo.userId,
      }).unwrap();

      setTitle('');
      setDescription('');
      setPriority('Medium');
      setIsOpen(false);
      toast.success('Maintenance request submitted');
    } catch (error) {
      toast.error('Failed to submit maintenance request');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Maintenance Requests</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Maintenance Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {propertyName && <p className="text-sm text-gray-600">Property: {propertyName}</p>}
              <div>
                <Label htmlFor="title">Issue Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Leaky faucet in bathroom"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  rows={4}
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low - Not urgent</SelectItem>
                    <SelectItem value="Medium">Medium - Should fix soon</SelectItem>
                    <SelectItem value="High">High - Causing inconvenience</SelectItem>
                    <SelectItem value="Urgent">Urgent - Emergency/Safety issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {propertyRequests.length > 0 ? (
          propertyRequests.map((request: MaintenanceRequest) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-gray-500" />
                  <h4 className="font-medium">{request.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={priorityColors[request.priority as keyof typeof priorityColors]}
                  >
                    {request.priority === 'Urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {request.priority}
                  </Badge>
                  <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                    {statusIcons[request.status as keyof typeof statusIcons]}
                    <span className="ml-1">{request.status}</span>
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">{request.description}</p>
              <div className="text-xs text-gray-400">
                Submitted: {new Date(request.createdAt).toLocaleDateString()}
              </div>
              {request.resolution && (
                <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                  <span className="font-medium">Resolution:</span> {request.resolution}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No maintenance requests for this property</p>
          </div>
        )}
      </div>
    </div>
  );
}
