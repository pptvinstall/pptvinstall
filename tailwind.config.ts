import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  // Add safelist for dynamically generated classes that need to be included
  safelist: [
    // Add critical classes that might be dynamically generated
    'bg-brand-blue-500',
    'bg-brand-red-500',
    'text-brand-blue-500',
    'text-brand-red-500',
  ],
  future: {
    hoverOnlyWhenSupported: true, // Better performance on mobile
  },
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Logo-inspired color palette
        brand: {
          blue: {
            50: "hsl(217, 91%, 95%)",
            100: "hsl(217, 91%, 90%)",
            200: "hsl(217, 91%, 80%)",
            300: "hsl(217, 91%, 70%)",
            400: "hsl(217, 91%, 65%)",
            500: "hsl(217, 91%, 60%)", // Primary blue from logo
            600: "hsl(217, 91%, 50%)",
            700: "hsl(217, 91%, 40%)",
            800: "hsl(217, 91%, 30%)",
            900: "hsl(217, 91%, 20%)",
          },
          red: {
            50: "hsl(0, 84%, 95%)",
            100: "hsl(0, 84%, 90%)",
            200: "hsl(0, 84%, 80%)",
            300: "hsl(0, 84%, 70%)",
            400: "hsl(0, 84%, 65%)",
            500: "hsl(0, 84%, 60%)", // Accent red from logo
            600: "hsl(0, 84%, 50%)",
            700: "hsl(0, 84%, 40%)",
            800: "hsl(0, 84%, 30%)",
            900: "hsl(0, 84%, 20%)",
          }
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in-out",
        "fade-out": "fade-out 0.3s ease-in-out",
        "slide-up": "slide-up 0.3s ease-in-out",
        "slide-down": "slide-down 0.3s ease-in-out",
        "scale-in": "scale-in 0.2s ease-in-out",
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // Utility plugin for responsive layouts
    function ({ addUtilities }) {
      const newUtilities = {
        '.content-auto': {
          'content-visibility': 'auto',
        },
        '.containment-paint': {
          'contain': 'paint',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
      }
      addUtilities(newUtilities)
    },
  ],
} satisfies Config;