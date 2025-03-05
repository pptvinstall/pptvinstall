import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Monitor, Shield, Star, Wrench, ArrowRight, Phone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-brand-blue-500 to-brand-blue-700 bg-clip-text text-transparent">
            Professional TV Mounting Done Right
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Expert installation, cable concealment, and perfect positioning for your TV in Metro Atlanta
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/booking">
              <Button size="lg" className="bg-brand-blue-600 hover:bg-brand-blue-700">
                Book Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-brand-blue-600 text-brand-blue-600">
                Contact Us <Phone className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <Monitor className="h-10 w-10 text-brand-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Expert Installation</h3>
              <p className="text-gray-600">Professional mounting services with guaranteed level positioning</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <Wrench className="h-10 w-10 text-brand-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Clean Setup</h3>
              <p className="text-gray-600">Neat cable management and concealment for a clean look</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <Shield className="h-10 w-10 text-brand-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Guaranteed Work</h3>
              <p className="text-gray-600">100% satisfaction guarantee on all installations</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <Star className="h-10 w-10 text-brand-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">5-Star Service</h3>
              <p className="text-gray-600">Highly rated professional service in Metro Atlanta</p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}