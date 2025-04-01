import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash, Edit, Eye, CalendarIcon, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { PromotionBanner, type Promotion } from '@/components/ui/promotion-banner';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export function PromotionsManager() {
  const { toast } = useToast();
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('adminPassword') || '');
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Promotion>>({
    title: '',
    description: '',
    linkText: '',
    linkUrl: '',
    backgroundColor: '#3b82f6', // Default blue
    textColor: '#ffffff',      // Default white
    startDate: '',
    endDate: '',
    priority: 0,
    isActive: true
  });

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Query to fetch promotions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/promotions'],
    queryFn: async () => {
      const response = await fetch('/api/promotions');
      if (!response.ok) {
        throw new Error('Failed to fetch promotions');
      }
      return response.json();
    }
  });

  // Create promotion mutation
  const createMutation = useMutation({
    mutationFn: async (promotionData: any) => {
      const response = await apiRequest('POST', '/api/admin/promotions', {
        password: adminPassword,
        promotion: promotionData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create promotion');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Promotion created successfully',
      });
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create promotion',
        variant: 'destructive'
      });
    }
  });

  // Update promotion mutation
  const updateMutation = useMutation({
    mutationFn: async (promotionData: any) => {
      const response = await apiRequest('PUT', `/api/admin/promotions/${promotionData.id}`, {
        password: adminPassword,
        promotion: promotionData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update promotion');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Promotion updated successfully',
      });
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update promotion',
        variant: 'destructive'
      });
    }
  });

  // Delete promotion mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/promotions/${id}?password=${encodeURIComponent(adminPassword)}`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete promotion');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Promotion deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/promotions'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete promotion',
        variant: 'destructive'
      });
    }
  });

  // Check if promotions array exists and is not empty
  const promotions = data?.promotions || [];

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update dates from the date pickers if they are set
    const formattedData = { 
      ...formData,
      // Format dates to YYYY-MM-DD if they exist
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : formData.startDate,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : formData.endDate,
    };

    if (isEditMode && selectedPromotion) {
      updateMutation.mutate({ ...formattedData, id: selectedPromotion.id });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      linkText: '',
      linkUrl: '',
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      startDate: '',
      endDate: '',
      priority: 0,
      isActive: true
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedPromotion(null);
    setIsEditMode(false);
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle number inputs (like priority)
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  // Handle toggle switches
  const handleToggleChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // Open edit dialog
  const handleEdit = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsEditMode(true);
    
    // Parse dates from string format if they exist
    const startDateObj = promotion.startDate ? new Date(promotion.startDate) : undefined;
    const endDateObj = promotion.endDate ? new Date(promotion.endDate) : undefined;
    
    setStartDate(startDateObj);
    setEndDate(endDateObj);
    
    setFormData({
      ...promotion,
      // Convert string ID to number for API compatibility
      id: promotion.id,
    });
    
    setIsDialogOpen(true);
  };

  // Open preview dialog
  const handlePreview = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsPreviewDialogOpen(true);
  };

  // Date formatting helper
  const formatDateString = (dateString?: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Promotions</h2>
          <p className="text-muted-foreground">
            Manage seasonal offers and marketing banners
          </p>
        </div>
        
        <Button onClick={() => {
          resetForm();
          setIsDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Promotion
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Error Loading Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the promotions data. Please try again later.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          {promotions.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Promotions Found</CardTitle>
                <CardDescription>Create your first promotion to display on your website</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Promotions appear as banners at the top of your website to highlight special offers and events.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Promotion
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="grid gap-4">
              {promotions.map((promotion: Promotion) => (
                <Card key={promotion.id} className="relative overflow-hidden">
                  {promotion.isActive && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl-md">
                      Active
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {promotion.title}
                      <div className="flex ml-auto space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(promotion)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(promotion)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this promotion? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(promotion.id!)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardTitle>
                    {promotion.description && (
                      <CardDescription>{promotion.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="font-semibold">Priority:</div>
                          <div>{promotion.priority}</div>
                        </div>
                        {(promotion.startDate || promotion.endDate) && (
                          <div className="flex items-center space-x-2 text-sm mt-2">
                            <CalendarIcon className="h-4 w-4" />
                            <div>
                              {promotion.startDate && promotion.endDate ? (
                                <span>
                                  {formatDateString(promotion.startDate)} - {formatDateString(promotion.endDate)}
                                </span>
                              ) : promotion.startDate ? (
                                <span>From {formatDateString(promotion.startDate)}</span>
                              ) : (
                                <span>Until {formatDateString(promotion.endDate)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        {promotion.linkUrl && (
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="font-semibold">Link:</div>
                            <div>{promotion.linkText || promotion.linkUrl}</div>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 text-sm mt-2">
                          <div className="font-semibold">Colors:</div>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="h-4 w-4 rounded-full border"
                              style={{ backgroundColor: promotion.backgroundColor || '#3b82f6' }}
                            />
                            <div 
                              className="h-4 w-4 rounded-full border"
                              style={{ backgroundColor: promotion.textColor || '#ffffff' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Promotion' : 'Create New Promotion'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update the details of this promotion banner' 
                : 'Add a new promotion banner to display on your website'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Spring Special: 15% Off All TV Mounts"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder="Valid through April 30, 2025"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="linkText">Button Text</Label>
                  <Input
                    id="linkText"
                    name="linkText"
                    value={formData.linkText || ''}
                    onChange={handleChange}
                    placeholder="Book Now"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="linkUrl">Button URL</Label>
                  <Input
                    id="linkUrl"
                    name="linkUrl"
                    value={formData.linkUrl || ''}
                    onChange={handleChange}
                    placeholder="/booking"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="backgroundColor"
                      name="backgroundColor"
                      type="color"
                      value={formData.backgroundColor || '#3b82f6'}
                      onChange={handleChange}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      value={formData.backgroundColor || '#3b82f6'}
                      onChange={handleChange}
                      name="backgroundColor"
                      className="flex-1"
                      maxLength={7}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="textColor"
                      name="textColor"
                      type="color"
                      value={formData.textColor || '#ffffff'}
                      onChange={handleChange}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      value={formData.textColor || '#ffffff'}
                      onChange={handleChange}
                      name="textColor"
                      className="flex-1"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="grid gap-2">
                  <Label>End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    name="priority"
                    type="number"
                    value={formData.priority || 0}
                    onChange={handleNumberChange}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher priority promotions display first.
                  </p>
                </div>
                
                <div className="grid gap-2">
                  <Label className="mb-2">Active Status</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isActive ?? true}
                      onCheckedChange={(checked) => handleToggleChange('isActive', checked)}
                    />
                    <Label>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only active promotions are shown to users.
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <div className="flex items-center">
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  isEditMode ? 'Update Promotion' : 'Create Promotion'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Promotion</DialogTitle>
            <DialogDescription>
              Here's how your promotion banner will appear on your website
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedPromotion && (
              <div className="border rounded-md overflow-hidden">
                <PromotionBanner 
                  promotion={selectedPromotion}
                  onClose={() => {}}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsPreviewDialogOpen(false);
              if (selectedPromotion) {
                handleEdit(selectedPromotion);
              }
            }}>
              Edit This Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PromotionsManager;