// This file is now deprecated.
// All routing logic has been moved to main.tsx
// This file is kept as a placeholder to prevent import errors
// but will be removed in future updates.

import { useLocation } from "wouter";
import { useEffect } from "react";

export default function App() {
  const [_, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/");
  }, [setLocation]);

  return null;
}