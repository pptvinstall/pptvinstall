import { Link } from "wouter";
import { 
  Monitor, 
  Shield, 
  Clock, 
  Star, 
  CheckCircle, 
  Phone, 
  Mail, 
  MapPin,
  Camera,
  Home,
  Lightbulb,
  Volume2,
  Award,
  Users,
  Wrench,
  Zap,
  ArrowRight,
  PlayCircle
} from "lucide-react";
import Logo from "../components/brand/Logo";
import SEOHead from "../components/seo/SEOHead";

export default function HomePage() {
  const services = [
    {
      id: 'tv-mounting',
      title: 'TV Wall Mounting',
      price: 'Starting at $100',
      description: 'Professional TV mounting on all wall types including brick and stone',
      features: [
        'Standard mounting (customer mount): $100',
        'Brick/masonry walls: +$50',
        'High-rise/steel stud: +$25',
        'TV mounts available: $50-$120',
        'Multiple TV discount: $10 off each additional'
      ],
      icon: Monitor
    },
    {
      id: 'fireplace-tv',
      title: 'Fireplace TV Installation',
      price: 'Starting at $200',
      description: 'Complex fireplace TV mounting with proper heat management',
      features: [
        'Over fireplace mounting: $200',
        'Heat-resistant installations',
        'Custom cable routing assessment',
        'Mantle clearance optimization',
        'Stone and brick fireplace specialty'
      ],
      icon: Home
    },
    {
      id: 'wire-concealment',
      title: 'Wire Concealment & Outlets',
      price: 'Starting at $100',
      description: 'Professional cable management and electrical outlet installation',
      features: [
        'New outlet behind TV: $100',
        'Additional outlets: $90 each',
        'Multiple outlet discount: $10 off each',
        'Clean cable concealment',
        'Professional electrical work'
      ],
      icon: Camera
    },
    {
      id: 'smart-home',
      title: 'Smart Home Installation',
      price: 'Starting at $75',
      description: 'Complete smart home device setup and integration',
      features: [
        'Security cameras: $75 each',
        'Smart doorbells: $85 each',
        'Smart floodlights: $125 each',
        'Professional device setup',
        'All devices connected to your phone'
      ],
      icon: Lightbulb
    }
  ];

  const testimonials = [
    {
      name: "Michael R.",
      location: "Buckhead",
      rating: 5,
      text: "Fast, professional, and perfect results! They mounted my 75\" TV on a brick wall flawlessly. Clean work, no mess.",
      service: "TV Wall Mounting"
    },
    {
      name: "Sarah L.",
      location: "Sandy Springs",
      rating: 5,
      text: "Outstanding service! They installed our outdoor TV and set up the whole smart home system in one visit.",
      service: "Smart Home Setup"
    },
    {
      name: "David K.",
      location: "Alpharetta",
      rating: 5,
      text: "Best TV installation service in Atlanta. They handled our complex fireplace mount perfectly.",
      service: "Fireplace Installation"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <SEOHead />
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-xl border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="lg" variant="color" showText={true} />
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-700 hover:text-blue-600 font-medium">Services</a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 font-medium">About</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 font-medium">Contact</a>
              <Link href="/booking">
                <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  Book Service
                </button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-purple-600/20"></div>
        
        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-400/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 mb-6">
                <Award className="h-5 w-5 text-yellow-300" />
                <span className="text-sm font-medium">Licensed & Insured • 500+ Happy Customers</span>
              </div>
            </div>
            
            <div className="mb-8">
              <Logo size="xl" variant="color" showText={true} className="justify-center" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
              Metro Atlanta's Premier
              <span className="block bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                TV Mounting Experts
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-4xl mx-auto leading-relaxed">
              Metro Atlanta's premier TV mounting and smart home installation service. 
              Professional results, same-day availability, lifetime satisfaction guarantee.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/booking" className="group bg-gradient-to-r from-white to-blue-50 text-blue-900 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2">
                <PlayCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Book Now - Free Quote</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="tel:+14047024748" className="group border-2 border-white/30 backdrop-blur-md text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-blue-900 transition-all duration-300 flex items-center justify-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>(404) 702-4748</span>
              </a>
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-blue-200 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Fully Insured</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Same Day Service</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>500+ Installs</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-300" />
                <span>5 Star Rated</span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Services Section */}
      <section id="services" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2 mb-4">
              <Wrench className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Our Services</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Professional Installation
              <span className="block text-blue-600">Services</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From basic TV mounting to complete smart home automation, we deliver 
              exceptional results every time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="group bg-white rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <service.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{service.title}</h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                  {service.price}
                </div>
                <ul className="space-y-3">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-gray-600">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Link href="/booking" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center space-x-2 group">
                    <span>Book This Service</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Why Choose Picture Perfect?</h2>
              <div className="space-y-4 text-lg text-gray-600">
                <p>
                  We're Metro Atlanta's premier TV mounting and smart home installation service, serving customers across Atlanta, 
                  Decatur, Marietta, Alpharetta, Sandy Springs, Roswell, Dunwoody, Buckhead, and surrounding areas.
                </p>
                <p>
                  Our expert technicians specialize in challenging installations including brick and stone walls, 
                  high-ceiling mounts up to 15 feet, and complex fireplace installations. Every project comes with 
                  our 100% satisfaction guarantee.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">1000+</div>
                  <div className="text-gray-600">Installations</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">5★</div>
                  <div className="text-gray-600">Average Rating</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Service Areas</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>• Atlanta</div>
                  <div>• Decatur</div>
                  <div>• Marietta</div>
                  <div>• Alpharetta</div>
                  <div>• Sandy Springs</div>
                  <div>• Roswell</div>
                  <div>• Dunwoody</div>
                  <div>• Buckhead</div>
                  <div>• Stone Mountain</div>
                  <div>• Tucker</div>
                  <div>• Norcross</div>
                  <div>• Peachtree City</div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Business Hours</h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Monday-Friday:</span>
                    <span>5:30 PM - 10:30 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday-Sunday:</span>
                    <span>12:00 PM - 8:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Real reviews from satisfied customers across Metro Atlanta</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                  <span className="ml-2 text-gray-600 text-sm">{testimonial.service}</span>
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                <div className="border-t pt-4">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-gray-600 text-sm">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto text-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">Ready to Get Started?</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Book your installation online or call us for immediate assistance. 
              Same-day service available throughout Metro Atlanta.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/booking">
                <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105">
                  Book Online Now
                </button>
              </Link>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="tel:404-702-4748" 
                  className="flex items-center space-x-2 text-white hover:text-blue-200 font-semibold text-lg"
                >
                  <Phone className="h-5 w-5" />
                  <span>(404) 702-4748</span>
                </a>
              </div>
            </div>

            <div className="border-t border-blue-500 pt-8 mt-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-blue-100">
                <div className="flex items-center justify-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>(404) 702-4748</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Serving Metro Atlanta</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Same-Day Service Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Logo size="md" variant="dark" showText={true} />
              <p className="text-gray-400 max-w-sm">
                Metro Atlanta's premier TV mounting and smart home installation service. Licensed, insured, and committed to perfect results every time.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li>TV Wall Mounting</li>
                <li>Fireplace TV Installation</li>
                <li>Outdoor TV Setup</li>
                <li>Smart Home Installation</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Service Areas</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Atlanta & Buckhead</li>
                <li>Sandy Springs & Roswell</li>
                <li>Alpharetta & Dunwoody</li>
                <li>Marietta & Decatur</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>(404) 702-4748</li>
                <li>Same-Day Service</li>
                <li>Licensed & Insured</li>
                <li>100% Satisfaction Guarantee</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Picture Perfect TV Install. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}