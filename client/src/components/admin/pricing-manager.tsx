import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PricingConfig, PricingRule } from "@shared/schema";

export function PricingManager() {
  const { toast } = useToast();
  const [editingPrice, setEditingPrice] = useState<PricingConfig | null>(null);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // Fetch current pricing configuration
  const { data: prices = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['/api/admin/pricing'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/pricing");
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }
      const data = await response.json();
      return data as PricingConfig[];
    }
  });

  // Fetch pricing rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/admin/pricing/rules'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/pricing/rules");
      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }
      const data = await response.json();
      return data as PricingRule[];
    }
  });

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async (data: Partial<PricingConfig>) => {
      console.log("Updating price with data:", data);
      const response = await apiRequest("PUT", `/api/admin/pricing/${data.id}`, {
        ...data,
        basePrice: data.basePrice?.toString()
      });
      if (!response.ok) {
        throw new Error('Failed to update price');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing'] });
      toast({
        title: "Price updated",
        description: "The service price has been updated successfully.",
      });
      setEditingPrice(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update price",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  });

  const handlePriceEdit = (price: PricingConfig) => {
    console.log("Editing price:", price);
    setEditingPrice({
      ...price,
      basePrice: parseFloat(price.basePrice.toString())
    });
  };

  const handlePriceChange = (value: string) => {
    if (editingPrice) {
      const numericValue = parseFloat(value) || 0;
      console.log("Changing price to:", numericValue);
      setEditingPrice({
        ...editingPrice,
        basePrice: numericValue
      });
    }
  };

  const handlePriceSave = () => {
    if (editingPrice) {
      console.log("Saving price:", editingPrice);
      updatePriceMutation.mutate(editingPrice);
    }
  };

  if (pricesLoading || rulesLoading) {
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
              {prices?.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{price.serviceType}</TableCell>
                  <TableCell>
                    {editingPrice?.id === price.id ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrice.basePrice}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      `$${parseFloat(price.basePrice.toString()).toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell>
                    {price.additionalFees && Object.entries(price.additionalFees).map(([fee, amount]) => (
                      <div key={fee}>{fee}: ${amount}</div>
                    ))}
                  </TableCell>
                  <TableCell>{price.serviceNotes}</TableCell>
                  <TableCell className="text-right">
                    {editingPrice?.id === price.id ? (
                      <div className="space-x-2">
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
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePriceEdit(price)}
                      >
                        Edit
                      </Button>
                    )}
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