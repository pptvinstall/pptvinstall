import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { User, Home, Mail, Phone, Info } from "lucide-react";

interface CustomerDetailsStepProps {
  formData: any;
  setFormData: (data: any) => void;
  validationErrors: Record<string, string[]>;
}

export const CustomerDetailsStep = React.memo(
  ({ formData, setFormData, validationErrors }: CustomerDetailsStepProps) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData({ ...formData, [name]: value });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData({ ...formData, [name]: checked });
    };

    return (
      <Card className="w-full mt-4">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>
            Please provide your contact and address details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <User className="mr-2 h-5 w-5" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className={validationErrors.name ? "border-destructive" : ""}
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive">
                      {validationErrors.name[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleInputChange}
                      placeholder="john.doe@example.com"
                      className={validationErrors.email ? "border-destructive" : ""}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-sm text-destructive">
                      {validationErrors.email[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone || ""}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                      className={validationErrors.phone ? "border-destructive" : ""}
                    />
                  </div>
                  {validationErrors.phone && (
                    <p className="text-sm text-destructive">
                      {validationErrors.phone[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Home className="mr-2 h-5 w-5" />
                Service Address
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="streetAddress" className="text-sm font-medium">
                    Street Address
                  </label>
                  <Input
                    id="streetAddress"
                    name="streetAddress"
                    value={formData.streetAddress || ""}
                    onChange={handleInputChange}
                    placeholder="123 Main St"
                    className={validationErrors.streetAddress ? "border-destructive" : ""}
                  />
                  {validationErrors.streetAddress && (
                    <p className="text-sm text-destructive">
                      {validationErrors.streetAddress[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="addressLine2" className="text-sm font-medium">
                    Apartment, Suite, Unit, etc. (optional)
                  </label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2 || ""}
                    onChange={handleInputChange}
                    placeholder="Apt 4B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium">
                    City
                  </label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city || ""}
                    onChange={handleInputChange}
                    placeholder="Atlanta"
                    className={validationErrors.city ? "border-destructive" : ""}
                  />
                  {validationErrors.city && (
                    <p className="text-sm text-destructive">
                      {validationErrors.city[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="state" className="text-sm font-medium">
                    State
                  </label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state || ""}
                    onChange={handleInputChange}
                    placeholder="GA"
                    className={validationErrors.state ? "border-destructive" : ""}
                  />
                  {validationErrors.state && (
                    <p className="text-sm text-destructive">
                      {validationErrors.state[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="zipCode" className="text-sm font-medium">
                    ZIP Code
                  </label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode || ""}
                    onChange={handleInputChange}
                    placeholder="30303"
                    className={validationErrors.zipCode ? "border-destructive" : ""}
                  />
                  {validationErrors.zipCode && (
                    <p className="text-sm text-destructive">
                      {validationErrors.zipCode[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <Info className="mr-2 h-5 w-5" />
                Additional Information
              </h3>
              
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Special Instructions or Notes (optional)
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ""}
                  onChange={handleInputChange}
                  placeholder="Any specific details about your installation needs..."
                  rows={3}
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="consentToContact"
                  name="consentToContact"
                  checked={formData.consentToContact || false}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      consentToContact: checked === true 
                    })
                  }
                  className={validationErrors.consentToContact ? "border-destructive" : ""}
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="consentToContact"
                    className="text-sm font-medium cursor-pointer"
                  >
                    I agree to be contacted about my appointment
                  </label>
                  <p className="text-xs text-muted-foreground">
                    We may contact you via email or phone regarding your booking.
                  </p>
                  {validationErrors.consentToContact && (
                    <p className="text-sm text-destructive">
                      {validationErrors.consentToContact[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }
);