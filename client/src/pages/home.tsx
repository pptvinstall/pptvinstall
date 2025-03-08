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

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  const servicesInView = useInView(servicesRef, { once: true, amount: 0.2 });
  const testimonialsInView = useInView(testimonialsRef, { once: true, amount: 0.2 });

  // Using a ref with a container that has position: relative
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  // Add a scroll progress tracker for the showcase section
  const { scrollYProgress: showcaseScrollProgress } = useScroll({
    target: showcaseRef,
    offset: ["start start", "end start"]
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
    <div className="scroll-container overflow-x-hidden relative">
      {/* Hero Section with position: relative for useScroll */}
      <section
        ref={heroRef}
        className="min-h-screen flex items-center bg-white pt-16 pb-8"
        style={{ position: 'relative' }}
      >
        <div className="absolute inset-0 z-0 opacity-5">
          <div className="h-full w-full bg-[url('/assets/pattern-bg.svg')] bg-repeat opacity-20" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="inline-flex items-center justify-center gap-1 px-4 py-1.5 mb-6 rounded-full bg-white border border-blue-100">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm text-blue-600">Available Now in Metro Atlanta</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-blue-600">
                Professional TV<br />Mounting & Smart<br />Home Installation
              </h1>

              <p className="text-lg text-blue-600 mb-8">
                Expert installation services with flawless<br />results in Metro Atlanta
              </p>

              <div className="flex flex-col gap-4 items-center">
                <Link href="/booking" className="w-full max-w-xs">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 w-full h-12 flex items-center justify-center gap-2"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/services" className="w-full max-w-xs">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full bg-white hover:bg-gray-50 border-blue-200 text-blue-600 h-12"
                  >
                    Our Services
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm">
                  <Clock className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm">Same-Day Available</span>
                </div>
                <div className="flex items-center px-4 py-2 bg-white rounded-full shadow-sm">
                  <Shield className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm">License & Insured</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Showcase section */}
      <section
        ref={showcaseRef}
        className="py-16 bg-white"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <p className="text-lg text-blue-600">
              We provide professional TV mounting and smart home installation services throughout Metro Atlanta
            </p>
          </div>

          <div className="mx-auto max-w-xl bg-gray-100 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-1 relative">
              <div className="bg-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-800">250+</div>
                <div className="text-sm md:text-base text-gray-700">Happy Customers</div>
              </div>
              <div className="bg-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-800">500+</div>
                <div className="text-sm md:text-base text-gray-700">TVs Mounted</div>
              </div>
              <div className="bg-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-800">5<span className="text-yellow-500">★</span></div>
                <div className="text-sm md:text-base text-gray-700">Average Rating</div>
              </div>
              <div className="bg-gray-200 rounded-lg p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-800">100%</div>
                <div className="text-sm md:text-base text-gray-700">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section
        ref={servicesRef}
        className="relative py-16 lg:py-24 bg-gradient-to-b from-white to-blue-50/30"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
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
        className="relative py-20 bg-white"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
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
        className="relative py-16 bg-blue-600 text-white"
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
                <Button size="lg" className="bg-white text-blue-700 hover:bg-gray-100">
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
        className="relative py-20 bg-gray-50"
        style={{ position: 'relative' }}
      >
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
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