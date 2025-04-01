import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Star, RefreshCw, Mail, Phone, Send, MoreHorizontal, Edit, FileText, Calendar, Heart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CustomerManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['/api/admin/customers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      const data = await response.json();
      return data.customers || [];
    },
  });

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await apiRequest('POST', '/api/admin/customers', customerData);
      if (!response.ok) {
        throw new Error('Failed to add customer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      setShowAddDialog(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      });
      toast({
        title: 'Customer added',
        description: 'The customer has been successfully added.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to add customer',
        description: 'There was an error adding the customer.',
        variant: 'destructive',
      });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/admin/customers/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update customer');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      setSelectedCustomer(null);
      toast({
        title: 'Customer updated',
        description: 'The customer has been successfully updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update customer',
        description: 'There was an error updating the customer.',
        variant: 'destructive',
      });
    },
  });

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer: any) => {
      return (
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      );
    });
  }, [customers, searchTerm]);

  // Customer statistics
  const customerStats = useMemo(() => {
    return {
      totalCustomers: customers.length,
      verifiedCustomers: customers.filter((c: any) => c.isVerified).length,
      loyaltyTotal: customers.reduce((sum: number, c: any) => sum + (c.loyaltyPoints || 0), 0),
      averageLoyalty: customers.length
        ? Math.round(
            customers.reduce((sum: number, c: any) => sum + (c.loyaltyPoints || 0), 0) / customers.length
          )
        : 0,
    };
  }, [customers]);

  const handleAddCustomer = () => {
    addCustomerMutation.mutate(newCustomer);
  };

  const handleUpdateCustomer = () => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({
        id: selectedCustomer.id,
        data: selectedCustomer,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Data</h1>
        <p className="text-muted-foreground">View and manage customer information</p>
      </div>

      {/* Customer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <h3 className="text-2xl font-bold">{customerStats.totalCustomers}</h3>
              </div>
              <User className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified Accounts</p>
                <h3 className="text-2xl font-bold">{customerStats.verifiedCustomers}</h3>
              </div>
              <Mail className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Loyalty Points</p>
                <h3 className="text-2xl font-bold">{customerStats.loyaltyTotal}</h3>
              </div>
              <Star className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Points per Customer</p>
                <h3 className="text-2xl font-bold">{customerStats.averageLoyalty}</h3>
              </div>
              <Heart className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Customer List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-[260px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search customers..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Loading customers...</p>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <ScrollArea className="w-full" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Loyalty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer: any) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {customer.address || 'No address on file'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                            {customer.email}
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                            {customer.phone || 'No phone'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-amber-500 mr-1" />
                          {customer.loyaltyPoints || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.isVerified ? 'default' : 'outline'}>
                          {customer.isVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                              <Edit className="h-4 w-4 mr-2" /> View/Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" /> View Bookings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" /> Send Message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <User className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No customers found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Add a new customer to your database.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                className="col-span-3"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                className="col-span-3"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                className="col-span-3"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                className="col-span-3"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Input
                id="notes"
                className="col-span-3"
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddCustomer} disabled={!newCustomer.name || !newCustomer.email}>
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        {selectedCustomer && (
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
              <DialogDescription>View and edit customer information.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={selectedCustomer.name}
                      onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={selectedCustomer.email}
                      onChange={(e) => setSelectedCustomer({ ...selectedCustomer, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={selectedCustomer.phone}
                      onChange={(e) => setSelectedCustomer({ ...selectedCustomer, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={selectedCustomer.address || ''}
                      onChange={(e) => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={selectedCustomer.notes || ''}
                    onChange={(e) => setSelectedCustomer({ ...selectedCustomer, notes: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="edit-verified">Verified Status</Label>
                  <Select
                    value={selectedCustomer.isVerified ? 'true' : 'false'}
                    onValueChange={(value) => 
                      setSelectedCustomer({ ...selectedCustomer, isVerified: value === 'true' })
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Verification Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Verified</SelectItem>
                      <SelectItem value="false">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              <TabsContent value="bookings" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-6">
                      <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">Booking history will be displayed here.</p>
                      <p className="text-sm text-muted-foreground">
                        This customer has no booking history yet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="loyalty" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center py-6">
                      <div className="bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center">
                        <Star className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mt-4">
                        {selectedCustomer.loyaltyPoints || 0} Points
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Customer earns 10 points per completed booking
                      </p>
                      
                      <div className="flex items-center gap-2 mt-6">
                        <Label htmlFor="edit-loyalty">Adjust Points</Label>
                        <Input
                          id="edit-loyalty"
                          type="number"
                          className="w-24"
                          value={selectedCustomer.loyaltyPoints || 0}
                          onChange={(e) => 
                            setSelectedCustomer({ 
                              ...selectedCustomer, 
                              loyaltyPoints: parseInt(e.target.value) || 0 
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCustomer}>Update Customer</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}