import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PricingConfig } from "@shared/schema";

export function PricingManager() {
  const { toast } = useToast();
  const [editingPrice, setEditingPrice] = useState<PricingConfig | null>(null);

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['/api/admin/pricing'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/pricing");
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }
      const data = await response.json();
      console.log("Fetched prices:", data);
      return data as PricingConfig[];
    }
  });

  const updatePriceMutation = useMutation({
    mutationFn: async (price: PricingConfig) => {
      console.log("Sending price update:", price);
      const response = await apiRequest("PUT", `/api/admin/pricing/${price.id}`, {
        basePrice: price.basePrice,
        updatedBy: 'admin'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update price');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing'] });
      toast({
        title: "Price updated",
        description: "The service price has been successfully updated.",
      });
      setEditingPrice(null);
    },
    onError: (error) => {
      console.error("Price update error:", error);
      toast({
        title: "Failed to update price",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  });

  const handlePriceEdit = (price: PricingConfig) => {
    console.log("Starting to edit price:", price);
    setEditingPrice({ ...price });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingPrice) {
      const newPrice = parseFloat(e.target.value) || 0;
      console.log("New price value:", newPrice);
      setEditingPrice({
        ...editingPrice,
        basePrice: newPrice.toString()
      });
    }
  };

  const handlePriceSave = () => {
    if (editingPrice) {
      console.log("Saving price:", editingPrice);
      updatePriceMutation.mutate(editingPrice);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Service Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Additional Fees</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{price.serviceType}</TableCell>
                  <TableCell>
                    {editingPrice?.id === price.id ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrice.basePrice}
                        onChange={handlePriceChange}
                        className="w-32"
                      />
                    ) : (
                      `$${parseFloat(price.basePrice).toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell>
                    {price.additionalFees && Object.entries(price.additionalFees).map(([fee, amount]) => (
                      <div key={fee}>{fee}: ${amount}</div>
                    ))}
                  </TableCell>
                  <TableCell>{price.serviceNotes}</TableCell>
                  <TableCell className="text-right">
                    <div className="space-x-2">
                      {editingPrice?.id === price.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPrice(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handlePriceSave}
                            disabled={updatePriceMutation.isPending}
                          >
                            {updatePriceMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePriceEdit(price)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}