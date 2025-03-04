import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Monitor, Shield, Star, Wrench, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-8 transform transition-all duration-700 hover:scale-105">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-radial from-transparent via-gray-50/80 to-white/90 rounded-3xl"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white/50 rounded-3xl backdrop-blur-[1px]"></div>
                <img
                  src="/images/logo.jpeg"
                  alt="Picture Perfect TV Install Logo"
                  className="mx-auto w-40 h-auto object-contain relative z-10 drop-shadow-sm"
                  style={{
                    maskImage: 'radial-gradient(circle at center, black 60%, transparent 80%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 60%, transparent 80%)'
                  }}
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Professional TV Mounting Done Right
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Expert installation, cable concealment, and perfect positioning for your TV
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/booking">
                <Button size="lg" className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="outline" size="lg" className="border-blue-200 hover:bg-blue-50">
                  View Services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Image */}
      <section className="relative">
        <div className="w-full">
          <img
            src="/images/showcase.jpeg"
            alt="TV Installation Showcase"
            className="w-full"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-2">Licensed & Insured</h3>
                <p className="text-gray-600">
                  Fully licensed and insured for your peace of mind
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
              <CardContent className="pt-6">
                <Monitor className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-2">Expert Installation</h3>
                <p className="text-gray-600">
                  Professional mounting with proper tools and techniques
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
              <CardContent className="pt-6">
                <Star className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-2">5-Star Service</h3>
                <p className="text-gray-600">
                  Highly rated service with satisfied customers
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Customer Testimonials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex text-yellow-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4">
                      "Excellent service! They mounted my TV above the fireplace and concealed all the wires. Very professional and clean work."
                    </p>
                    <p className="font-semibold">- Sarah M.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex text-yellow-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4">
                      "Fast, efficient, and very knowledgeable. They helped me choose the perfect spot for my TV and even set up my smart home devices."
                    </p>
                    <p className="font-semibold">- John D.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Your TV Mounted?
          </h2>
          <p className="text-xl mb-8">
            Book your installation today and enjoy professional service
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              Contact Us Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center border-2 border-blue-100">
              <CardContent className="p-6">
                <CheckCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Experience</h3>
                <p className="text-gray-600">Years of professional installation experience</p>
              </CardContent>
            </Card>
            <Card className="text-center border-2 border-blue-100">
              <CardContent className="p-6">
                <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Guaranteed</h3>
                <p className="text-gray-600">Satisfaction guaranteed on every installation</p>
              </CardContent>
            </Card>
            <Card className="text-center border-2 border-blue-100">
              <CardContent className="p-6">
                <Wrench className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Professional</h3>
                <p className="text-gray-600">Clean, precise, and professional work</p>
              </CardContent>
            </Card>
            <Card className="text-center border-2 border-blue-100">
              <CardContent className="p-6">
                <Monitor className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Full Service</h3>
                <p className="text-gray-600">Complete TV and smart home solutions</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}