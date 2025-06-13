import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  ArrowRight,
  Monitor,
  Shield,
  Star,
  Wrench,
  CheckCircle,
  Check,
  Tv,
  Camera,
  Home,
  Clock,
  Trophy,
  PhoneCall
} from "lucide-react";
import { ResponsiveImage } from "@/components/ui/responsive-image";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InstallationSlideshow } from "@/components/ui/installation-gallery";
import { PWAInstallBanner } from "@/components/ui/pwa-install-banner";
import { trackViewContent, trackLead } from "@/lib/fbPixel";
import { MetaTags, META_CONFIGS } from "@/components/ui/meta-tags";

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  // Track page view with Meta Pixel ViewContent event
  useEffect(() => {
    trackViewContent({ content_name: 'Home Page', content_category: 'page_view' });
  }, []);

  const servicesInView = useInView(servicesRef, { once: true, amount: 0.2 });
  const testimonialsInView = useInView(testimonialsRef, { once: true, amount: 0.2 });

  // Using a ref with a container that has position: relative - with layoutEffect fix
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
    layoutEffect: false
  });

  // Add a scroll progress tracker for the showcase section
  const { scrollYProgress: showcaseScrollProgress } = useScroll({
    target: showcaseRef,
    offset: ["start start", "end start"],
    layoutEffect: false
  });

  const showcaseOpacity = useTransform(heroScrollProgress, [0, 0.5], [1, 0.7]);
  const showcaseScale = useTransform(heroScrollProgress, [0, 0.5], [1, 1.05]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const services = [
    {
      title: "TV Mounting",
      icon: Tv,
      color: "text-blue-600",
      description: "Expert TV mounting for all sizes and surfaces",
      link: "/services#tv-mounting",
      features: ["Concealed wiring", "Precise leveling", "Secure installation"]
    },
    {
      title: "Smart Home",
      icon: Camera,
      color: "text-blue-500",
      description: "Complete setup of smart home devices and systems",
      link: "/services#smart-home",
      features: ["Security cameras", "Video doorbells", "System integration"]
    },
    {
      title: "Commercial",
      icon: Monitor,
      color: "text-green-500",
      description: "Professional installation for businesses and offices",
      link: "/services#commercial",
      features: ["Digital signage", "Conference rooms", "Entertainment systems"]
    }
  ];

  const testimonials = [
    {
      text: "Excellent service! They mounted my TV above the fireplace and concealed all the wires. Very professional and clean work.",
      name: "Sarah M.",
      location: "Atlanta, GA",
      rating: 5
    },
    {
      text: "Fast, efficient, and very knowledgeable. They helped me choose the perfect spot for my TV and even set up my smart home devices.",
      name: "John D.",
      location: "Marietta, GA",
      rating: 5
    },
    {
      text: "Best TV mounting service I've used. The installers were professional, on time, and did an amazing job hiding all the wires in the wall.",
      name: "Michael T.",
      location: "Alpharetta, GA",
      rating: 5
    }
  ];

  const benefits = [
    { icon: Trophy, title: "Experience", text: "Years of professional installation expertise" },
    { icon: Shield, title: "Guaranteed", text: "Satisfaction guaranteed on every job" },
    { icon: Wrench, title: "Professional", text: "Clean, precise work with attention to detail" },
    { icon: Clock, title: "Punctual", text: "On-time service with respect for your schedule" }
  ];

  return (
    <div className="scroll-container overflow-x-hidden relative" style={{ position: 'relative' }}>
      {/* PWA Install Banner - only visible on mobile */}
      <PWAInstallBanner />

      {/* Hero Section - Removed empty content causing blank space */}

      {/* Featured Service Section - Enhanced spacing and responsiveness */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-white to-blue-50" style={{ position: 'relative' }}>
        <div className="container-narrow">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium mb-4">Most Popular Service</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-2 mb-4">Basic TV Mounting</h2>
            <p className="text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto">Professional mounting with your own TV mount</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-5 bg-white overflow-hidden rounded-xl shadow-md border border-blue-100">
              <div className="md:col-span-2 relative bg-blue-600 p-6 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/assets/pattern-bg.svg')] bg-repeat"></div>
                <div className="text-center relative z-10">
                  <Monitor className="h-16 w-16 text-white mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">$100</div>
                  <div className="text-blue-100 mt-1">Flat Rate</div>
                  <Link href="/booking" className="mt-6 block">
                    <Button 
                      className="btn-primary-enhanced bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" 
                      onClick={() => trackLead({ source: 'featured_service' })}
                    >
                      Book Now
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="md:col-span-3 p-6">
                <h3 className="text-xl font-semibold mb-3">What's Included:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Customer-provided mount</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Level installation</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>All TV sizes supported</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Stud finding & secure mounting</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Basic cable management</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Professional installation</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-600">
                    Add-ons available: Outlet installation ($100), Non-drywall surface mounting ($50)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Recent Installations Gallery - Enhanced layout and spacing */}
      <section
        className="section-padding bg-gradient-to-b from-white to-blue-50"
        style={{ position: 'relative' }}
      >
        <div className="container-custom">
          <div className="text-center max-w-4xl mx-auto mb-12 lg:mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mb-6">
              Our Work
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">Recent TV Installations</h2>
            <p className="text-lg sm:text-xl text-blue-600 max-w-3xl mx-auto leading-relaxed">
              Browse our gallery of recent TV mounting and installation projects in Metro Atlanta
            </p>
          </div>

          <InstallationSlideshow />

          <div className="mt-8 text-center">
            <p className="text-sm text-blue-500 mb-4">Swipe or use arrows to view more installations</p>

            <Link href="/booking">
              <Button 
                size="lg" 
                className="btn-primary-enhanced bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-10 py-4 text-xl rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                onClick={() => trackLead({ source: 'gallery_section' })}
              >
                Book Your Professional Installation
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Showcase section */}
      <section
        ref={showcaseRef}
        className="py-8 bg-white"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <p className="text-lg text-blue-600">
              We provide professional TV mounting and smart home installation services throughout Metro Atlanta
            </p>
          </div>

          <div className="mx-auto max-w-4xl bg-gray-100 rounded-xl overflow-hidden shadow-md">
            <div className="grid grid-cols-2 gap-px relative">
              <div className="bg-blue-50 p-6 text-center flex flex-col items-center justify-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600">250+</div>
                <div className="text-sm md:text-base text-blue-600 font-medium mt-2">Happy Customers</div>
              </div>
              <div className="bg-blue-50 p-6 text-center flex flex-col items-center justify-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600">500+</div>
                <div className="text-sm md:text-base text-blue-600 font-medium mt-2">TVs Mounted</div>
              </div>
              <div className="bg-blue-50 p-6 text-center flex flex-col items-center justify-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600">5<span className="text-yellow-500">★</span></div>
                <div className="text-sm md:text-base text-blue-600 font-medium mt-2">Average Rating</div>
              </div>
              <div className="bg-blue-50 p-6 text-center flex flex-col items-center justify-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600">100%</div>
                <div className="text-sm md:text-base text-blue-600 font-medium mt-2">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section
        ref={servicesRef}
        className="relative py-12 lg:py-16 bg-gradient-to-b from-white to-blue-50/30"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="section-title text-3xl lg:text-4xl font-bold">Our Premium Services</h2>
            <p className="text-blue-600 text-lg">
              Professional TV mounting and smart home installation services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={servicesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-500 border-2 border-blue-100 hover:border-blue-200 overflow-hidden group bg-white">
                  <CardContent className="pt-8 pb-6 px-6">
                    <div className="mb-6 flex justify-center">
                      <div className="p-4 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110">
                        <service.icon className={`h-8 w-8 ${service.color} group-hover:text-blue-600 transition-colors duration-300`} />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-center mb-4 text-blue-700 group-hover:text-blue-600 transition-colors duration-300">{service.title}</h3>
                    <p className="text-center text-gray-600 mb-6">{service.description}</p>

                    <ul className="space-y-3 mb-8">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          </div>
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="text-center mt-auto">
                      <Link href={service.link}>
                        <Button
                          variant="outline"
                          className="border-blue-200 hover:bg-blue-50 group-hover:border-blue-300 transition-all duration-300"
                        >
                          Learn More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        ref={testimonialsRef}
        className="relative py-12 bg-white"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <motion.span
              className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4 }}
            >
              Testimonials
            </motion.span>
            <motion.h2
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              What Our Customers Say
            </motion.h2>
            <motion.p
              className="text-lg text-blue-600"
              initial={{ opacity: 0, y: 20 }}
              animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Don't just take our word for it - hear from our satisfied customers
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={testimonialsInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <Card className="h-full border-2 border-gray-100 hover:border-blue-100 transition-all duration-300">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Star className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex text-blue-600">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                    </div>

                    <p className="text-blue-600 mb-6 flex-grow">
                      "{testimonial.text}"
                    </p>

                    <div className="mt-auto">
                      <p className="font-semibold text-blue-600">{testimonial.name}</p>
                      <p className="text-sm text-blue-600">{testimonial.location}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative py-10 bg-blue-600 text-white"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready for Picture Perfect Installation?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Book your TV mounting service today and enjoy a hassle-free experience
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/booking">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-700 hover:bg-gray-100"
                  onClick={() => trackLead({ source: 'cta_section' })}
                >
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section
        className="relative py-12 bg-gray-50"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <motion.h2
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Why Choose Us
            </motion.h2>
            <motion.p
              className="text-lg text-blue-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              We're committed to providing the highest quality service with attention to every detail
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              >
                <Card className="text-center border-2 border-gray-100 hover:border-blue-100 transition-all duration-300 h-full">
                  <CardContent className="p-6 h-full">
                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <benefit.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-blue-600">{benefit.title}</h3>
                    <p className="text-blue-600">{benefit.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/services">
              <Button variant="outline" className="border-blue-200 hover:bg-blue-50">
                View All Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}