import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Monitor, Shield, Star, Wrench } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Professional TV Mounting Done Right
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Expert installation, cable concealment, and perfect positioning for your TV
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/booking">
                <Button size="lg">
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="outline" size="lg">
                  View Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Licensed & Insured</h3>
                <p className="text-gray-600">
                  Fully licensed and insured for your peace of mind
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Monitor className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Expert Installation</h3>
                <p className="text-gray-600">
                  Professional mounting with proper tools and techniques
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Star className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">5-Star Service</h3>
                <p className="text-gray-600">
                  Highly rated service with satisfied customers
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Your TV Mounted?
          </h2>
          <p className="text-xl mb-8">
            Book your installation today and enjoy professional service
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary">
              Contact Us Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}