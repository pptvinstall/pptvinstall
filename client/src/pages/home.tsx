import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Monitor, Shield, Star, Wrench, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Professional TV Mounting
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Expert installation services in Metro Atlanta
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/booking">
            <Button size="lg">Book Now</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}