
import React from "react";
import { Button, ButtonProps } from "./button";
import { cn } from "../../lib/utils";

interface EnhancedButtonProps extends ButtonProps {
  withAnimation?: boolean;
  withShadow?: boolean;
  withGradient?: boolean;
  iconPosition?: "left" | "right";
  icon?: React.ReactNode;
}

export function EnhancedButton({
  withAnimation = true,
  withShadow = false,
  withGradient = false,
  iconPosition = "left",
  icon,
  className,
  children,
  ...props
}: EnhancedButtonProps) {
  return (
    <Button
      className={cn(
        withAnimation && "btn-hover-effect",
        withShadow && "shadow-button hover:shadow-md",
        withGradient && "bg-gradient-to-r from-brand-blue-600 to-brand-blue-500 hover:from-brand-blue-500 hover:to-brand-blue-400",
        "relative overflow-hidden",
        className
      )}
      {...props}
    >
      {icon && iconPosition === "left" && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {icon && iconPosition === "right" && (
        <span className="ml-2">{icon}</span>
      )}
    </Button>
  );
}

export function CTAButton({
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <EnhancedButton
      withAnimation
      withShadow
      withGradient
      className={cn(
        "font-medium px-6 py-2.5 rounded-lg text-white",
        className
      )}
      {...props}
    >
      {children}
    </EnhancedButton>
  );
}
