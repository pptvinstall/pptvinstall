import React, { useState } from 'react';
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
import { User, Home, Mail, Phone, Info, UserPlus, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { FieldValidation, validationRules } from "@/components/ui/field-validation";

interface CustomerDetailsStepProps {
  formData: any;
  setFormData: (data: any) => void;
  validationErrors: Record<string, string[]>;
}

export const CustomerDetailsStep = React.memo(
  ({ formData, setFormData, validationErrors }: CustomerDetailsStepProps) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData({ ...formData, [name]: value });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData({ ...formData, [name]: checked });
    };
    
    // Toggle create account option
    const handleCreateAccountToggle = (checked: boolean) => {
      setFormData({ 
        ...formData, 
        createAccount: checked 
      });
      setPasswordVisible(checked);
    };

    return (
      <Card className="w-full mt-4 relative">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-xl sm:text-2xl">Customer Information</CardTitle>
          <CardDescription>
            Please provide your contact and address details
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-5">
          <form className="space-y-5">
            {/* Personal Information */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-medium flex items-center">
                <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
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
                    className={`${validationErrors.name ? "border-destructive" : ""} h-10`}
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
                  <div className="flex items-center relative">
                    <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleInputChange}
                      placeholder="john.doe@example.com"
                      className={`${validationErrors.email ? "border-destructive" : ""} pl-10 h-10`}
                    />
                  </div>
                  <FieldValidation 
                    value={formData.email || ""} 
                    rules={[validationRules.email]} 
                  />
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
                  <div className="flex items-center relative">
                    <Phone className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone || ""}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                      className={`${validationErrors.phone ? "border-destructive" : ""} pl-10 h-10`}
                    />
                  </div>
                  <FieldValidation 
                    value={formData.phone || ""} 
                    rules={[validationRules.phone]} 
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-destructive">
                      {validationErrors.phone[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-3 pt-1">
              <h3 className="text-base sm:text-lg font-medium flex items-center">
                <Home className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
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
                    className={`${validationErrors.streetAddress ? "border-destructive" : ""} h-10`}
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
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
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
                    className={`${validationErrors.city ? "border-destructive" : ""} h-10`}
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
                    className={`${validationErrors.state ? "border-destructive" : ""} h-10`}
                  />
                  {validationErrors.state && (
                    <p className="text-sm text-destructive">
                      {validationErrors.state[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label htmlFor="zipCode" className="text-sm font-medium">
                    ZIP Code
                  </label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode || ""}
                    onChange={handleInputChange}
                    placeholder="30303"
                    className={`${validationErrors.zipCode ? "border-destructive" : ""} h-10`}
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
            <div className="space-y-3 pt-1">
              <h3 className="text-base sm:text-lg font-medium flex items-center">
                <Info className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
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
                  className="min-h-[80px]"
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
                  className={validationErrors.consentToContact ? "border-destructive mt-1" : "mt-1"}
                />
                <div className="space-y-1 leading-tight">
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
              
              {/* Create an account section */}
              <div className="pt-4 mt-2 border-t border-border">
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox
                    id="createAccount"
                    name="createAccount"
                    checked={formData.createAccount || false}
                    onCheckedChange={(checked) => handleCreateAccountToggle(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1 leading-tight">
                    <label
                      htmlFor="createAccount"
                      className="text-sm font-medium cursor-pointer flex items-center"
                    >
                      <UserPlus className="mr-1.5 h-4 w-4" />
                      Create an account for faster bookings
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Save your information for future bookings, track your appointments and access exclusive offers.
                    </p>
                  </div>
                </div>
                
                {passwordVisible && (
                  <div className="mt-4 space-y-2 animate-in fade-in duration-300">
                    <label htmlFor="password" className="text-sm font-medium flex items-center">
                      <Lock className="mr-1.5 h-4 w-4" />
                      Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password || ""}
                      onChange={handleInputChange}
                      placeholder="Choose a secure password"
                      className={`${validationErrors.password ? "border-destructive" : ""} h-10`}
                    />
                    {validationErrors.password && (
                      <p className="text-sm text-destructive">
                        {validationErrors.password[0]}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long.
                    </p>
                    
                    <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center mt-4">
                      <Lock className="mr-1.5 h-4 w-4" />
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword || ""}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className={`${validationErrors.confirmPassword ? "border-destructive" : ""} h-10`}
                    />
                    {validationErrors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {validationErrors.confirmPassword[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }
);