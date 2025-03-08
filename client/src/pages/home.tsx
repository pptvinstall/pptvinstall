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
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const showcaseOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.7]);
  const showcaseScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.05]);
  
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
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative min-h-[85vh] flex items-center bg-gradient-to-b from-gray-50 to-white py-16 lg:py-24"
      >
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-blue-400/20" />
          <div className="h-full w-full bg-[url('/assets/pattern-bg.svg')] bg-repeat opacity-20" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-center lg:text-left"
            >
              <Badge 
                variant="outline" 
                className="mb-4 px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border-blue-200 text-blue-600 rounded-full inline-flex items-center gap-1"
              >
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span> Available Now in Metro Atlanta
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                <span className="block">Professional</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                  TV Installation
                </span>
                <span className="block">Done Right</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
                Expert mounting, cable concealment, and perfect positioning for TVs of all sizes. Servicing the entire Metro Atlanta area.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link href="/booking">
                  <Button size="lg" className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white transition-all">
                    Book Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/services">
                  <Button variant="outline" size="lg" className="border-blue-200 hover:bg-blue-50 transition-all">
                    View Services
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="flex items-center gap-2"
                  onClick={() => window.location.href = "tel:+16782632859"}
                >
                  <PhoneCall className="h-4 w-4 text-blue-600" />
                  <span>(678) 263-2859</span>
                </Button>
              </div>
              
              <div className="mt-10 flex items-center justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-gray-200">
                      <ResponsiveImage 
                        src={`/assets/logo.svg`} 
                        alt={`Happy Customer ${i}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="ml-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">Trusted by 250+ customers</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="relative mx-auto lg:mx-0 max-w-md"
            >
              <div className="absolute inset-0 bg-gradient-radial from-transparent via-gray-50/80 to-white/90 rounded-3xl"></div>
              <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-gray-100">
                <ResponsiveImage
                  src="/assets/showcase.jpeg"
                  alt="TV Installation Showcase"
                  className="w-full aspect-[4/3] object-cover"
                  fallbackSrc="/assets/IMG_1878.jpeg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                  <div className="flex items-start gap-2">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Picture Perfect Results</h3>
                      <p className="text-xs text-gray-600">Professional TV mounting with flawless wire concealment</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <motion.div 
                className="absolute -top-4 -right-4 bg-white rounded-full shadow-lg px-3 py-1.5 flex items-center gap-1.5"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Licensed & Insured</span>
              </motion.div>
              
              <motion.div 
                className="absolute -bottom-4 -left-4 bg-white rounded-full shadow-lg px-3 py-1.5 flex items-center gap-1.5"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Same-Day Available</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Showcase Image */}
      <motion.section 
        ref={showcaseRef}
        className="relative py-20 bg-gradient-to-b from-white to-gray-50"
        style={{ opacity: showcaseOpacity }}
      >
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Expert TV Installation Services
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600" 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              We provide professional TV mounting and smart home installation services throughout Metro Atlanta
            </motion.p>
          </div>
          
          <motion.div 
            className="relative mx-auto rounded-xl overflow-hidden shadow-2xl"
            style={{ scale: showcaseScale }}
          >
            <ResponsiveImage
              src="/assets/showcase.jpeg"
              alt="TV Installation Showcase"
              className="w-full object-cover h-[60vh]"
              fallbackSrc="/assets/IMG_1878.jpeg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            
            {/* Stats overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black/80 to-transparent">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
                <div>
                  <div className="text-3xl md:text-4xl font-bold">250+</div>
                  <div className="text-sm md:text-base opacity-80">Happy Customers</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold">500+</div>
                  <div className="text-sm md:text-base opacity-80">TVs Mounted</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold">5★</div>
                  <div className="text-sm md:text-base opacity-80">Average Rating</div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold">100%</div>
                  <div className="text-sm md:text-base opacity-80">Satisfaction</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Services */}
      <section ref={servicesRef} className="relative py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span 
              className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-sm font-medium mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={servicesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4 }}
            >
              Our Services
            </motion.span>
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={servicesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Professional Installation Services
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600"
              initial={{ opacity: 0, y: 20 }}
              animate={servicesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              From basic TV mounting to complete smart home solutions, we have you covered
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                animate={servicesInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              >
                <Card className="h-full border-2 hover:border-blue-200 transition-all duration-300 group overflow-hidden relative">
                  <CardContent className="pt-6 pb-4 h-full flex flex-col">
                    <div className={cn("w-12 h-12 flex items-center justify-center rounded-lg mb-4", 
                      service.color === "text-blue-600" ? "bg-blue-100" : 
                      service.color === "text-blue-500" ? "bg-blue-100" : "bg-green-100"
                    )}>
                      <service.icon className={cn("h-6 w-6", service.color)} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-gray-600 mb-4">
                      {service.description}
                    </p>
                    
                    <ul className="mb-6 space-y-2 mt-auto">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link href={service.link} className="mt-auto">
                      <Button 
                        variant="ghost" 
                        className="group-hover:translate-x-1 transition-transform p-0 h-auto flex items-center text-blue-600"
                      >
                        Learn more
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef} className="relative py-20 bg-white">
        <div className="container mx-auto px-4">
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
              className="text-lg text-gray-600"
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
                        <Star className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex text-blue-400">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 flex-grow">
                      "{testimonial.text}"
                    </p>
                    
                    <div className="mt-auto">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.location}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Ready for Picture Perfect Installation?
            </motion.h2>
            <motion.p 
              className="text-xl mb-8 opacity-90"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Book your TV mounting service today and enjoy a hassle-free experience
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Link href="/booking">
                <Button size="lg" variant="secondary" className="bg-white text-blue-700 hover:bg-gray-100">
                  Book Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Contact Us
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="relative py-20 bg-gray-50">
        <div className="container mx-auto px-4">
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
              className="text-lg text-gray-600"
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
                    <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.text}</p>
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