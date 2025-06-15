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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <SEOHead />
      
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Logo size="md" variant="color" showText={true} />
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-blue-900 hover:text-red-600 font-semibold transition-colors duration-200">Services</a>
              <a href="#about" className="text-blue-900 hover:text-red-600 font-semibold transition-colors duration-200">About</a>
              <a href="#contact" className="text-blue-900 hover:text-red-600 font-semibold transition-colors duration-200">Contact</a>
              <Link href="/booking">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl">
                  Book Service
                </button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-blue-800/20"></div>
        
        {/* Trust-building background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 0%, transparent 50%), radial-gradient(circle at 75% 75%, white 0%, transparent 50%)`
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 mb-6">
                <Shield className="h-5 w-5 text-white" />
                <span className="text-sm font-semibold">Licensed • Insured • Trusted</span>
              </div>
            </div>
            
            <div className="mb-8">
              <Logo size="xl" variant="light" showText={false} className="justify-center" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
              Metro Atlanta's Most
              <span className="block text-red-400 font-black">
                Trusted TV Mounting
              </span>
              <span className="block">Professionals</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-4xl mx-auto leading-relaxed">
              Professional TV mounting and smart home installation service you can trust. 
              Same-day availability, lifetime warranty, 100% satisfaction guaranteed.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/booking" className="group bg-white text-blue-900 px-8 py-4 rounded-lg font-bold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2">
                <PlayCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Book Now - Free Quote</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="tel:+14047024748" className="group border-2 border-white/30 backdrop-blur-md text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-900 transition-all duration-300 flex items-center justify-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>(404) 702-4748</span>
              </a>
            </div>
            
            {/* Trust indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-blue-100">
              <div className="flex flex-col items-center space-y-2 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Shield className="h-6 w-6 text-white" />
                <span className="font-semibold text-sm text-center">Lifetime Warranty</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Clock className="h-6 w-6 text-white" />
                <span className="font-semibold text-sm text-center">Same-Day Service</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Star className="h-6 w-6 text-white" />
                <span className="font-semibold text-sm text-center">5-Star Rated</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <MapPin className="h-6 w-6 text-white" />
                <span className="font-semibold text-sm text-center">Metro Atlanta</span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Services Section */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2 mb-4">
              <Wrench className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">Our Services</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
              Professional Installation Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From basic TV mounting to complete smart home automation, we deliver 
              exceptional results with the professionalism and reliability you can trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* TV Mounting */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Monitor className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-blue-900 mb-4">TV Wall Mounting</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Professional TV mounting service for all sizes and wall types. Includes wire concealment, 
                perfect positioning, and lifetime warranty on installation.
              </p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  All TV sizes (32" to 85"+)
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Wire concealment included
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Perfect level guarantee
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Lifetime warranty
                </li>
              </ul>
              <div className="text-3xl font-bold text-blue-600 mb-4">Starting at $99</div>
              <Link href="/booking">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200">
                  Book TV Mounting
                </button>
              </Link>
            </div>

            {/* Smart Home */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Home className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Smart Home Setup</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Complete smart home installation including security cameras, video doorbells, 
                smart lighting, and home automation systems.
              </p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Security camera installation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Video doorbell setup
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Smart lighting systems
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Home automation
                </li>
              </ul>
              <div className="text-3xl font-bold text-blue-600 mb-4">Starting at $149</div>
              <Link href="/booking">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200">
                  Book Smart Home
                </button>
              </Link>
            </div>

            {/* Wire Management */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Wire Management</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Professional wire concealment and cable management solutions. Clean, organized 
                installation that enhances your room's aesthetic appeal.
              </p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  In-wall wire concealment
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Cable management systems
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Outlet installation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Clean finish work
                </li>
              </ul>
              <div className="text-3xl font-bold text-blue-600 mb-4">Starting at $79</div>
              <Link href="/booking">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200">
                  Book Wire Management
                </button>
              </Link>
            </div>
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
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-900">
        <div className="max-w-7xl mx-auto text-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">Ready to Get Started?</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Book your installation online or call us for immediate assistance. 
              Same-day service available throughout Metro Atlanta.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/booking">
                <button className="bg-white text-blue-900 px-8 py-4 rounded-lg text-lg font-bold hover:bg-gray-50 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105">
                  Book Online Now
                </button>
              </Link>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="tel:404-702-4748" 
                  className="flex items-center space-x-2 text-white hover:text-red-400 font-semibold text-lg"
                >
                  <Phone className="h-5 w-5" />
                  <span>(404) 702-4748</span>
                </a>
              </div>
            </div>

            <div className="border-t border-blue-700 pt-8 mt-12">
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