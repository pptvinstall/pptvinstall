import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DownloadIcon, SearchIcon, EyeIcon, CalendarIcon, ClockIcon, PhoneIcon, MailIcon, MapPinIcon, InfoIcon } from 'lucide-react';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/pricing';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type BookingArchive = {
  id: number;
  originalId: number | null;
  originalCreatedAt: string | null;
  archivedAt: string | null;
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  notes: string | null;
  serviceType: string;
  preferredDate: string;
  appointmentTime: string;
  status: string | null;
  pricingTotal: string | null;
  archiveReason: string | null;
  archiveNote: string | null;
};

// Helper functions to format dates
function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MM/dd/yyyy');
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString;
  }
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MM/dd/yyyy h:mm a');
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString;
  }
}

type BookingArchiveDetailProps = {
  archive: BookingArchive;
  open: boolean;
  onClose: () => void;
};

const BookingArchiveDetail = ({ archive, open, onClose }: BookingArchiveDetailProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Archived Booking Details</DialogTitle>
          <DialogDescription>
            This booking was archived on {formatDateTime(archive.archivedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex-1 min-w-[300px]">
              <h3 className="text-lg font-medium mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Full Name</div>
                  <div className="font-medium">{archive.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium flex items-center">
                    <MailIcon className="h-4 w-4 mr-1" />
                    <a href={`mailto:${archive.email}`} className="text-primary hover:underline">
                      {archive.email}
                    </a>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    <a href={`tel:${archive.phone}`} className="text-primary hover:underline">
                      {archive.phone}
                    </a>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="font-medium flex items-start">
                    <MapPinIcon className="h-4 w-4 mr-1 mt-1" />
                    <div>
                      {archive.streetAddress}
                      {archive.addressLine2 && <div>{archive.addressLine2}</div>}
                      <div>{archive.city}, {archive.state} {archive.zipCode}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-[300px]">
              <h3 className="text-lg font-medium mb-4">Appointment Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Service Type</div>
                  <div className="font-medium">
                    {archive.serviceType}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Appointment Date</div>
                  <div className="font-medium flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {formatDate(archive.preferredDate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Time</div>
                  <div className="font-medium flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {archive.appointmentTime}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status (Before Archive)</div>
                  <div className="font-medium">
                    <Badge variant={archive.status === 'active' ? 'default' : 'secondary'}>
                      {archive.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="font-medium">
                    {archive.pricingTotal ? formatPrice(Number(archive.pricingTotal)) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-2">
            <h3 className="text-lg font-medium mb-2">Archive Information</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Original Booking ID</div>
                <div className="font-medium">{archive.originalId || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Originally Created</div>
                <div className="font-medium">{formatDateTime(archive.originalCreatedAt)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Archived On</div>
                <div className="font-medium">{formatDateTime(archive.archivedAt)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Archive Reason</div>
                <div className="font-medium">
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 hover:bg-amber-50">
                    {archive.archiveReason || 'N/A'}
                  </Badge>
                </div>
              </div>
              {archive.archiveNote && (
                <div>
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="font-medium p-2 bg-muted rounded">
                    {archive.archiveNote}
                  </div>
                </div>
              )}
              {archive.notes && (
                <div>
                  <div className="text-sm text-muted-foreground">Original Booking Notes</div>
                  <div className="font-medium p-2 bg-muted rounded">
                    {archive.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function BookingArchives({ adminPassword }: { adminPassword: string }) {
  const [archives, setArchives] = useState<BookingArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArchive, setSelectedArchive] = useState<BookingArchive | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchArchives() {
      setIsLoading(true);
      try {
        const response = await apiRequest(
          'GET', 
          `/api/booking-archives?adminPassword=${encodeURIComponent(adminPassword)}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch archives');
        }
        
        const data = await response.json();
        setArchives(data.archives || []);
      } catch (error) {
        console.error('Error fetching archives:', error);
        toast({
          title: 'Error',
          description: 'Failed to load booking archives. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (adminPassword) {
      fetchArchives();
    }
  }, [adminPassword, toast]);

  // Filter archives based on search term
  const filteredArchives = archives.filter((archive: BookingArchive) => {
    if (!searchTerm) return true;
    
    const lowerSearch = searchTerm.toLowerCase();
    return (
      archive.name.toLowerCase().includes(lowerSearch) ||
      archive.email.toLowerCase().includes(lowerSearch) ||
      archive.phone.includes(searchTerm) ||
      archive.serviceType.toLowerCase().includes(lowerSearch) ||
      (archive.archiveReason && archive.archiveReason.toLowerCase().includes(lowerSearch)) ||
      (archive.archiveNote && archive.archiveNote.toLowerCase().includes(lowerSearch))
    );
  });

  const handleViewDetail = (archive: BookingArchive) => {
    setSelectedArchive(archive);
  };

  const exportArchives = () => {
    const csvContent = [
      ["Archive ID", "Original ID", "Name", "Email", "Phone", "Service", "Original Date", "Archived Date", "Reason"],
      ...filteredArchives.map((archive: BookingArchive) => [
        archive.id,
        archive.originalId || 'N/A',
        archive.name,
        archive.email,
        archive.phone,
        archive.serviceType,
        formatDate(archive.originalCreatedAt),
        formatDate(archive.archivedAt),
        archive.archiveReason || 'N/A'
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `booking-archives-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-5">
        <div>
          <CardTitle>Booking Archives</CardTitle>
          <CardDescription>View history of deleted or cancelled bookings</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportArchives} disabled={isLoading || archives.length === 0}>
          <DownloadIcon className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, service, or reason..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner />
          </div>
        ) : filteredArchives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <InfoIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No Archives Found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "No booking archives match your search criteria." 
                : "There are no archived bookings in the system."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Original Date</TableHead>
                  <TableHead>Archived On</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArchives.map((archive: BookingArchive) => (
                  <TableRow key={archive.id}>
                    <TableCell>
                      <div className="font-medium">{archive.name}</div>
                      <div className="text-sm text-muted-foreground">{archive.email}</div>
                    </TableCell>
                    <TableCell>{archive.serviceType}</TableCell>
                    <TableCell>
                      {formatDate(archive.originalCreatedAt)}
                      <div className="text-xs text-muted-foreground">
                        {archive.preferredDate ? formatDate(archive.preferredDate) : 'N/A'} at {archive.appointmentTime || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(archive.archivedAt)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          archive.archiveReason === 'cancelled' 
                            ? 'bg-orange-50 text-orange-800 hover:bg-orange-50'
                            : archive.archiveReason === 'completed'
                              ? 'bg-green-50 text-green-800 hover:bg-green-50'
                              : 'bg-blue-50 text-blue-800 hover:bg-blue-50'
                        }
                      >
                        {archive.archiveReason || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewDetail(archive)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {selectedArchive && (
        <BookingArchiveDetail
          archive={selectedArchive}
          open={!!selectedArchive}
          onClose={() => setSelectedArchive(null)}
        />
      )}
    </Card>
  );
}