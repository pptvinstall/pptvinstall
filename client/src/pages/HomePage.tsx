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
  Volume2
} from "lucide-react";

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
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Picture Perfect TV Install</span>
            </div>
            
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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
                Metro Atlanta's
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Premier TV Install
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                Professional TV mounting and smart home installation service. Licensed, insured technicians with same-day availability.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/booking">
                <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105">
                  Book Installation Now
                </button>
              </Link>
              <a 
                href="tel:404-702-4748" 
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 font-semibold text-lg"
              >
                <Phone className="h-5 w-5" />
                <span>(404) 702-4748</span>
              </a>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="flex flex-col items-center space-y-3 p-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Licensed & Insured</h3>
                <p className="text-gray-600 text-center">Professional technicians with full licensing and insurance coverage</p>
              </div>
              
              <div className="flex flex-col items-center space-y-3 p-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Same-Day Service</h3>
                <p className="text-gray-600 text-center">Fast scheduling with same-day installation availability</p>
              </div>
              
              <div className="flex flex-col items-center space-y-3 p-6 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">100% Satisfaction</h3>
                <p className="text-gray-600 text-center">Guaranteed quality work with complete customer satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Our Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From standard TV mounting to complex smart home installations, we handle every project with precision and care.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((service) => {
              const IconComponent = service.icon;
              return (
                <div key={service.id} className="group bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{service.title}</h3>
                          <p className="text-lg font-semibold text-blue-600">{service.price}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-6 text-lg">{service.description}</p>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Includes:</h4>
                      <ul className="space-y-2">
                        {service.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link href="/booking">
                      <button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl group-hover:scale-105 transform">
                        Book This Service
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">P</span>
                </div>
                <span className="text-lg font-bold">Picture Perfect TV Install</span>
              </div>
              <p className="text-gray-400">
                Metro Atlanta's premier TV mounting and smart home installation service.
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