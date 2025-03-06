import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-white to-blue-50 border-t border-blue-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="font-bold text-xl mb-4 text-blue-700">Picture Perfect TV Install</h3>
            <p className="text-gray-600">
              Professional TV mounting and smart home installation services in Metro Atlanta and surrounding areas.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-xl mb-4 text-blue-700">Quick Links</h3>
            <div className="flex flex-col gap-3">
              <Link href="/services">
                <a className="text-gray-600 hover:text-blue-600 transition-colors">Services</a>
              </Link>
              <Link href="/booking">
                <a className="text-gray-600 hover:text-blue-600 transition-colors">Book Now</a>
              </Link>
              <Link href="/contact">
                <a className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
              </Link>
              <Link href="/faq">
                <a className="text-gray-600 hover:text-blue-600 transition-colors">FAQ</a>
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-xl mb-4 text-blue-700">Contact Info</h3>
            <div className="flex flex-col gap-2 text-gray-600">
              <p className="flex items-center gap-2">
                <span className="text-blue-600">📞</span>
                404-702-4748
              </p>
              <p className="flex items-center gap-2">
                <span className="text-blue-600">📧</span>
                pptvinstall@gmail.com
              </p>
              <p className="flex items-center gap-2">
                <span className="text-blue-600">🕒</span>
                Mon-Fri: 6:30PM-10:30PM
              </p>
              <p className="ml-6">Sat-Sun: 11AM-7PM</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-blue-100 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
import React from 'react';
import { Link } from 'wouter';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Picture Perfect TV Install</h3>
            <p className="text-muted-foreground">
              Professional TV mounting and smart home installation services.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="hover:underline">Home</Link></li>
              <li><Link href="/services" className="hover:underline">Services</Link></li>
              <li><Link href="/booking" className="hover:underline">Book Now</Link></li>
              <li><Link href="/contact" className="hover:underline">Contact</Link></li>
              <li><Link href="/faq" className="hover:underline">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <p className="text-muted-foreground">
              Atlanta, GA<br />
              Email: info@pictureperfecttv.com<br />
              Phone: (404) 123-4567
            </p>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
