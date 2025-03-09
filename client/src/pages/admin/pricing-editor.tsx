
import React, { useState, useEffect } from 'react';
import { pricingData, PricingData, PricingItem, DiscountItem } from '../../data/pricing-data';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from '../../hooks/use-toast';

// Helper component for editing pricing items
const PricingItemEditor = ({ 
  item, 
  path, 
  onUpdate 
}: { 
  item: PricingItem, 
  path: string, 
  onUpdate: (path: string, value: PricingItem) => void 
}) => {
  const [editedItem, setEditedItem] = useState<PricingItem>({ ...item });

  const handleChange = (field: keyof PricingItem, value: any) => {
    const updatedItem = { ...editedItem, [field]: value };
    setEditedItem(updatedItem);
  };

  const handleSave = () => {
    onUpdate(path, editedItem);
    toast({
      title: "Item updated",
      description: `Updated pricing for ${editedItem.name}`,
    });
  };

  return (
    <div className="space-y-3 p-3 border rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${path}-name`}>Name</Label>
          <Input 
            id={`${path}-name`} 
            value={editedItem.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
          />
        </div>
        <div>
          <Label htmlFor={`${path}-price`}>Price</Label>
          <Input 
            id={`${path}-price`} 
            type="number" 
            value={editedItem.price} 
            onChange={(e) => handleChange('price', parseFloat(e.target.value))} 
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`${path}-description`}>Description</Label>
        <Textarea 
          id={`${path}-description`} 
          value={editedItem.description} 
          onChange={(e) => handleChange('description', e.target.value)} 
        />
      </div>
      {item.hourly !== undefined && (
        <div className="flex gap-4">
          <div>
            <Label htmlFor={`${path}-minimum`}>Minimum</Label>
            <Input 
              id={`${path}-minimum`} 
              type="number" 
              value={editedItem.minimum || 0} 
              onChange={(e) => handleChange('minimum', parseFloat(e.target.value))} 
            />
          </div>
          <div>
            <Label htmlFor={`${path}-halfHourRate`}>Half Hour Rate</Label>
            <Input 
              id={`${path}-halfHourRate`} 
              type="number" 
              value={editedItem.halfHourRate || 0} 
              onChange={(e) => handleChange('halfHourRate', parseFloat(e.target.value))} 
            />
          </div>
        </div>
      )}
      <Button onClick={handleSave} className="mt-2">Save Changes</Button>
    </div>
  );
};

// Helper component for editing discount items
const DiscountItemEditor = ({ 
  item, 
  path, 
  onUpdate 
}: { 
  item: DiscountItem, 
  path: string, 
  onUpdate: (path: string, value: DiscountItem) => void 
}) => {
  const [editedItem, setEditedItem] = useState<DiscountItem>({ ...item });

  const handleChange = (field: keyof DiscountItem, value: any) => {
    const updatedItem = { ...editedItem, [field]: value };
    setEditedItem(updatedItem);
  };

  const handleSave = () => {
    onUpdate(path, editedItem);
    toast({
      title: "Discount updated",
      description: `Updated ${editedItem.name}`,
    });
  };

  return (
    <div className="space-y-3 p-3 border rounded-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${path}-name`}>Name</Label>
          <Input 
            id={`${path}-name`} 
            value={editedItem.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
          />
        </div>
        <div>
          <Label htmlFor={`${path}-amount`}>Amount</Label>
          <Input 
            id={`${path}-amount`} 
            type="number" 
            value={editedItem.amount} 
            onChange={(e) => handleChange('amount', parseFloat(e.target.value))} 
          />
        </div>
      </div>
      <Button onClick={handleSave} className="mt-2">Save Changes</Button>
    </div>
  );
};

// Main pricing editor component
export default function PricingEditor() {
  const [currentPricing, setCurrentPricing] = useState<PricingData>({ ...pricingData });
  const [isLoading, setIsLoading] = useState(false);
  const [exportText, setExportText] = useState('');

  const handleUpdatePricingItem = (path: string, value: PricingItem | DiscountItem) => {
    const pathParts = path.split('.');
    const newPricing = JSON.parse(JSON.stringify(currentPricing));
    
    let current = newPricing;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    current[pathParts[pathParts.length - 1]] = value;
    setCurrentPricing(newPricing);
    
    // In a real application, you would save this to a database or file
    // For now, we'll just update the state and show a success message
    localStorage.setItem('pricingData', JSON.stringify(newPricing));
  };

  const handleExport = () => {
    const exportData = `// Copy this code to pricing-data.ts
export const pricingData = ${JSON.stringify(currentPricing, null, 2)};`;
    setExportText(exportData);
    
    // Copy to clipboard
    navigator.clipboard.writeText(exportData)
      .then(() => {
        toast({
          title: "Pricing data copied",
          description: "The updated pricing data has been copied to your clipboard.",
        });
      })
      .catch(err => {
        toast({
          title: "Copy failed",
          description: "Please use the export box to copy the data manually.",
          variant: "destructive"
        });
      });
  };

  const handleTravelFeeUpdate = (fee: number) => {
    const newPricing = { ...currentPricing };
    newPricing.travel.fee = fee;
    setCurrentPricing(newPricing);
    localStorage.setItem('pricingData', JSON.stringify(newPricing));
    toast({
      title: "Travel fee updated",
      description: `Travel fee set to $${fee}`,
    });
  };

  // Load saved pricing data on component mount
  useEffect(() => {
    const savedPricing = localStorage.getItem('pricingData');
    if (savedPricing) {
      try {
        setCurrentPricing(JSON.parse(savedPricing));
      } catch (e) {
        console.error('Error loading saved pricing data:', e);
      }
    }
  }, []);

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Pricing Editor</CardTitle>
          <CardDescription>
            Easily update your service pricing. Changes are saved automatically to browser storage.
            Use the export function to get the updated code for permanent changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div className="flex gap-4 items-center">
              <Label htmlFor="travel-fee">Travel Fee</Label>
              <Input 
                id="travel-fee" 
                className="w-32" 
                type="number" 
                value={currentPricing.travel.fee} 
                onChange={(e) => handleTravelFeeUpdate(parseFloat(e.target.value))} 
              />
            </div>
            <Button onClick={handleExport}>Export Pricing Data</Button>
          </div>
          
          {exportText && (
            <div className="mb-4">
              <Label htmlFor="export-data">Export Data (Copied to clipboard)</Label>
              <Textarea 
                id="export-data" 
                value={exportText} 
                rows={6} 
                className="font-mono text-sm"
                readOnly
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" className="mb-8">
        <AccordionItem value="tv-mounting">
          <AccordionTrigger>TV Mounting Services</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(currentPricing.tvMounting).map(([key, item]) => (
                <PricingItemEditor 
                  key={key}
                  item={item as PricingItem}
                  path={`tvMounting.${key}`}
                  onUpdate={handleUpdatePricingItem}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tv-mounts">
          <AccordionTrigger>TV Mounts for Sale</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(currentPricing.tvMounts).map(([key, item]) => (
                <PricingItemEditor 
                  key={key}
                  item={item as PricingItem}
                  path={`tvMounts.${key}`}
                  onUpdate={handleUpdatePricingItem}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="wire-concealment">
          <AccordionTrigger>Wire Concealment & Outlet Installation</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(currentPricing.wireConcealment).map(([key, item]) => (
                <PricingItemEditor 
                  key={key}
                  item={item as PricingItem}
                  path={`wireConcealment.${key}`}
                  onUpdate={handleUpdatePricingItem}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="smart-home">
          <AccordionTrigger>Smart Home Installation</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(currentPricing.smartHome).map(([key, item]) => (
                <PricingItemEditor 
                  key={key}
                  item={item as PricingItem}
                  path={`smartHome.${key}`}
                  onUpdate={handleUpdatePricingItem}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="custom-services">
          <AccordionTrigger>Custom Services</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(currentPricing.customServices).map(([key, item]) => (
                <PricingItemEditor 
                  key={key}
                  item={item as PricingItem}
                  path={`customServices.${key}`}
                  onUpdate={handleUpdatePricingItem}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="discounts">
          <AccordionTrigger>Discounts</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(currentPricing.discounts).map(([key, item]) => (
                <DiscountItemEditor 
                  key={key}
                  item={item as DiscountItem}
                  path={`discounts.${key}`}
                  onUpdate={handleUpdatePricingItem}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
