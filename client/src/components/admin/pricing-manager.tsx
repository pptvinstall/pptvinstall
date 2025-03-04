import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import type { PricingConfig, PricingRule } from "@shared/schema";

export function PricingManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPrice, setEditingPrice] = useState<PricingConfig | null>(null);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // Fetch current pricing configuration
  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['/api/admin/pricing'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/pricing");
      return response.json();
    }
  });

  // Fetch pricing rules
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/admin/pricing/rules'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/pricing/rules");
      return response.json();
    }
  });

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async (data: Partial<PricingConfig>) => {
      const response = await apiRequest("PUT", `/api/admin/pricing/${data.id}`, data);
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

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async (data: Partial<PricingRule>) => {
      const response = await apiRequest("PUT", `/api/admin/pricing/rules/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing/rules'] });
      toast({
        title: "Rule updated",
        description: "The pricing rule has been updated successfully.",
      });
      setEditingRule(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update rule",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  });

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
              {prices?.map((price: PricingConfig) => (
                <TableRow key={price.id}>
                  <TableCell>{price.serviceType}</TableCell>
                  <TableCell>
                    {editingPrice?.id === price.id ? (
                      <Input
                        type="number"
                        value={editingPrice.basePrice}
                        onChange={(e) => setEditingPrice({
                          ...editingPrice,
                          basePrice: parseFloat(e.target.value)
                        })}
                      />
                    ) : (
                      `$${price.basePrice}`
                    )}
                  </TableCell>
                  <TableCell>
                    {Object.entries(price.additionalFees || {}).map(([fee, amount]) => (
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
                          onClick={() => updatePriceMutation.mutate(editingPrice)}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPrice(price)}
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

      <Card>
        <CardHeader>
          <CardTitle>Pricing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule: PricingRule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.ruleName}</TableCell>
                  <TableCell>{rule.ruleType}</TableCell>
                  <TableCell>
                    {editingRule?.id === rule.id ? (
                      <Input
                        type="number"
                        value={editingRule.ruleValue}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          ruleValue: parseFloat(e.target.value)
                        })}
                      />
                    ) : (
                      `$${rule.ruleValue}`
                    )}
                  </TableCell>
                  <TableCell>
                    {rule.isActive ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingRule?.id === rule.id ? (
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingRule(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateRuleMutation.mutate(editingRule)}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRule(rule)}
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
