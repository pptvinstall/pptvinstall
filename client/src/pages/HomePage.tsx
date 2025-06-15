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
      <header className="bg-white/98 backdrop-blur-lg shadow-2xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Logo size="lg" variant="color" showText={true} />
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-700 hover:text-[#dc2626] font-semibold transition-colors duration-200 text-sm uppercase tracking-wide">Services</a>
              <a href="#about" className="text-gray-700 hover:text-[#dc2626] font-semibold transition-colors duration-200 text-sm uppercase tracking-wide">About</a>
              <a href="#contact" className="text-gray-700 hover:text-[#dc2626] font-semibold transition-colors duration-200 text-sm uppercase tracking-wide">Contact</a>
              <Link href="/booking">
                <button className="bg-gradient-to-r from-[#1e293b] to-[#dc2626] text-white px-8 py-3 rounded-xl font-bold hover:from-[#0f172a] hover:to-[#b91c1c] transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 text-sm uppercase tracking-wide">
                  Book Now
                </button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#7f1d1d] text-white py-32 overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Premium geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #dc2626 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1e293b 0%, transparent 50%), radial-gradient(circle at 40% 80%, #dc2626 0%, transparent 50%)`
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-12">
              <div className="flex justify-center mb-6">
                <div className="text-8xl md:text-9xl font-black tracking-tighter">
                  <span className="text-white">PP</span><span className="text-[#dc2626]">TV</span>
                </div>
              </div>
              <div className="text-sm uppercase tracking-[0.2em] text-gray-300 font-semibold">
                Picture Perfect TV Install
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[0.9] tracking-tight">
              <span className="block text-white">PREMIUM</span>
              <span className="block bg-gradient-to-r from-white via-gray-200 to-[#dc2626] bg-clip-text text-transparent">
                TV MOUNTING
              </span>
              <span className="block text-white">ATLANTA</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 text-gray-200 max-w-4xl mx-auto leading-relaxed font-light">
              Elite TV mounting and smart home installation service. 
              <span className="text-[#dc2626] font-semibold">Same-day service</span>, lifetime warranty, premium results.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/booking" className="group bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white px-10 py-5 rounded-2xl font-black text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 uppercase tracking-wide">
                <PlayCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <span>Book Premium Service</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="tel:+14047024748" className="group border-2 border-white/40 backdrop-blur-md text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-white hover:text-[#1e293b] transition-all duration-300 flex items-center justify-center space-x-3 uppercase tracking-wide">
                <Phone className="h-6 w-6" />
                <span>(404) 702-4748</span>
              </a>
            </div>
            
            {/* Premium trust indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-gray-200">
              <div className="flex flex-col items-center space-y-2 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Shield className="h-8 w-8 text-[#dc2626]" />
                <span className="font-bold text-sm uppercase tracking-wide">Lifetime Warranty</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Clock className="h-8 w-8 text-[#dc2626]" />
                <span className="font-bold text-sm uppercase tracking-wide">Same-Day Service</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Star className="h-8 w-8 text-[#dc2626]" />
                <span className="font-bold text-sm uppercase tracking-wide">Premium Quality</span>
              </div>
              <div className="flex flex-col items-center space-y-2 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <MapPin className="h-8 w-8 text-[#dc2626]" />
                <span className="font-bold text-sm uppercase tracking-wide">Metro Atlanta</span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Services Section */}
      <section id="services" className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="mb-6">
              <span className="text-[#dc2626] font-black text-lg uppercase tracking-[0.3em]">Our Services</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-[#1e293b] mb-8 tracking-tight">
              PREMIUM<br/>
              <span className="text-[#dc2626]">INSTALLATIONS</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Elite TV mounting and smart home automation solutions. 
              <span className="text-[#1e293b] font-semibold">Professional grade equipment</span>, precision installation, lifetime warranty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* TV Mounting */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 border-2 border-gray-100 group">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1e293b] to-[#dc2626] rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Monitor className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-[#1e293b] mb-6 tracking-tight">TV WALL MOUNTING</h3>
              <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                Premium TV mounting with precision installation. Professional-grade mounts, 
                seamless wire concealment, and lifetime satisfaction guarantee.
              </p>
              <ul className="space-y-3 text-gray-700 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">All TV sizes (32" to 85"+)</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Complete wire concealment</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Precision leveling guarantee</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Lifetime warranty</span>
                </li>
              </ul>
              <div className="text-4xl font-black text-[#dc2626] mb-6">Starting at $149</div>
              <Link href="/booking">
                <button className="w-full bg-gradient-to-r from-[#1e293b] to-[#dc2626] text-white py-4 px-8 rounded-2xl font-bold hover:from-[#0f172a] hover:to-[#b91c1c] transition-all duration-300 transform hover:scale-105 shadow-xl text-lg uppercase tracking-wide">
                  Book Premium Service
                </button>
              </Link>
            </div>

            {/* Smart Home */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 border-2 border-gray-100 group">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1e293b] to-[#dc2626] rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Home className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-[#1e293b] mb-6 tracking-tight">SMART HOME SETUP</h3>
              <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                Complete smart home automation with premium security cameras, video doorbells, 
                and intelligent lighting systems. Professional installation guaranteed.
              </p>
              <ul className="space-y-3 text-gray-700 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">4K security cameras</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Smart video doorbells</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Automated lighting</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Complete integration</span>
                </li>
              </ul>
              <div className="text-4xl font-black text-[#dc2626] mb-6">Starting at $199</div>
              <Link href="/booking">
                <button className="w-full bg-gradient-to-r from-[#1e293b] to-[#dc2626] text-white py-4 px-8 rounded-2xl font-bold hover:from-[#0f172a] hover:to-[#b91c1c] transition-all duration-300 transform hover:scale-105 shadow-xl text-lg uppercase tracking-wide">
                  Book Smart Home
                </button>
              </Link>
            </div>

            {/* Wire Management */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-10 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-3 border-2 border-gray-100 group">
              <div className="w-20 h-20 bg-gradient-to-br from-[#1e293b] to-[#dc2626] rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-[#1e293b] mb-6 tracking-tight">WIRE MANAGEMENT</h3>
              <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                Premium wire concealment and cable management. Invisible wiring solutions 
                that maintain your home's clean aesthetic with professional-grade results.
              </p>
              <ul className="space-y-3 text-gray-700 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">In-wall concealment</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Premium cable systems</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Custom outlet installation</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#dc2626] mr-3" />
                  <span className="font-semibold">Seamless finish work</span>
                </li>
              </ul>
              <div className="text-4xl font-black text-[#dc2626] mb-6">Starting at $99</div>
              <Link href="/booking">
                <button className="w-full bg-gradient-to-r from-[#1e293b] to-[#dc2626] text-white py-4 px-8 rounded-2xl font-bold hover:from-[#0f172a] hover:to-[#b91c1c] transition-all duration-300 transform hover:scale-105 shadow-xl text-lg uppercase tracking-wide">
                  Book Wire Service
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
      <section id="contact" className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#7f1d1d]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="space-y-12">
            <div>
              <span className="text-[#dc2626] font-black text-xl uppercase tracking-[0.3em] mb-6 block">Get Started</span>
              <h2 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tight">
                READY FOR<br/>
                <span className="text-[#dc2626]">PREMIUM?</span>
              </h2>
              <p className="text-2xl text-gray-200 max-w-4xl mx-auto leading-relaxed">
                Book your premium installation service or call for immediate consultation. 
                <span className="text-[#dc2626] font-bold">Same-day service</span> available throughout Metro Atlanta.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <Link href="/booking">
                <button className="bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white px-12 py-6 rounded-2xl text-xl font-black hover:from-[#b91c1c] hover:to-[#991b1b] transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 uppercase tracking-wide">
                  Book Premium Service
                </button>
              </Link>
              
              <a 
                href="tel:404-702-4748" 
                className="flex items-center space-x-3 text-white hover:text-[#dc2626] font-bold text-xl border-2 border-white/30 px-12 py-6 rounded-2xl transition-all duration-300 hover:border-[#dc2626] uppercase tracking-wide"
              >
                <Phone className="h-6 w-6" />
                <span>(404) 702-4748</span>
              </a>
            </div>

            <div className="border-t border-white/20 pt-12 mt-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-gray-200">
                <div className="flex flex-col items-center space-y-3 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <Phone className="h-8 w-8 text-[#dc2626]" />
                  <span className="font-bold text-lg uppercase tracking-wide">(404) 702-4748</span>
                </div>
                <div className="flex flex-col items-center space-y-3 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <MapPin className="h-8 w-8 text-[#dc2626]" />
                  <span className="font-bold text-lg uppercase tracking-wide">Metro Atlanta</span>
                </div>
                <div className="flex flex-col items-center space-y-3 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <Clock className="h-8 w-8 text-[#dc2626]" />
                  <span className="font-bold text-lg uppercase tracking-wide">Same-Day Service</span>
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