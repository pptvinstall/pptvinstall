import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomerDetailsStepProps {
  formData: any;
  setFormData: (data: any) => void;
  validationErrors: Record<string, string[]>;
}

export const CustomerDetailsStep = React.memo(
  ({ formData, setFormData, validationErrors }: CustomerDetailsStepProps) => {
    const showError = (field: string) => {
      return validationErrors[field] ? (
        <p className="text-xs mt-1 text-destructive">
          {validationErrors[field][0]}
        </p>
      ) : null;
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Your Details</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Please provide your contact and address information
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name*
              </Label>
              <Input
                id="name"
                placeholder="John Smith"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={validationErrors.name ? "border-destructive" : ""}
              />
              {showError("name")}
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address*
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={validationErrors.email ? "border-destructive" : ""}
              />
              {showError("email")}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number*
              </Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className={validationErrors.phone ? "border-destructive" : ""}
              />
              {showError("phone")}
            </div>
          </div>

          <div>
            <Label htmlFor="streetAddress" className="text-sm font-medium">
              Street Address*
            </Label>
            <Input
              id="streetAddress"
              placeholder="123 Main St"
              value={formData.streetAddress}
              onChange={(e) =>
                setFormData({ ...formData, streetAddress: e.target.value })
              }
              className={
                validationErrors.streetAddress ? "border-destructive" : ""
              }
            />
            {showError("streetAddress")}
          </div>

          <div>
            <Label htmlFor="addressLine2" className="text-sm font-medium">
              Address Line 2 (Optional)
            </Label>
            <Input
              id="addressLine2"
              placeholder="Apt 4B, Floor 2, etc."
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData({ ...formData, addressLine2: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city" className="text-sm font-medium">
                City*
              </Label>
              <Input
                id="city"
                placeholder="Atlanta"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className={validationErrors.city ? "border-destructive" : ""}
              />
              {showError("city")}
            </div>
            <div>
              <Label htmlFor="state" className="text-sm font-medium">
                State*
              </Label>
              <Input
                id="state"
                placeholder="GA"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className={validationErrors.state ? "border-destructive" : ""}
              />
              {showError("state")}
            </div>
            <div>
              <Label htmlFor="zipCode" className="text-sm font-medium">
                ZIP Code*
              </Label>
              <Input
                id="zipCode"
                placeholder="30303"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
                className={validationErrors.zipCode ? "border-destructive" : ""}
              />
              {showError("zipCode")}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Special Instructions (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional details about your installation needs..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="consentToContact"
              checked={formData.consentToContact}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  consentToContact: checked === true,
                })
              }
              className={
                validationErrors.consentToContact ? "border-destructive" : ""
              }
            />
            <Label
              htmlFor="consentToContact"
              className={`text-sm ${
                validationErrors.consentToContact ? "text-destructive" : ""
              }`}
            >
              I agree to receive communication regarding my booking
            </Label>
          </div>
          {showError("consentToContact")}
        </div>
      </div>
    );
  }
);