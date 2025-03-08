import React from 'react';
import { Link } from 'wouter';
import { ResponsiveImage } from '@/components/ui/responsive-image';

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Picture Perfect TV Install</h3>
            <p className="text-muted-foreground">
              Professional TV mounting and smart home installation services in Metro Atlanta and surrounding areas.
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
            <div className="flex items-center mb-4">
              <div className="w-16 h-16 mr-4 rounded-full overflow-hidden">
                <ResponsiveImage
                  src="/assets/logo-pptv-circle.png"
                  alt="Picture Perfect TV Install"
                  className="w-full h-full object-cover"
                  width={64}
                  height={64}
                />
              </div>
              <p className="text-muted-foreground">
                Atlanta, GA<br />
                Email: pptvinstall@gmail.com<br />
                Phone: (678) 263-2859
              </p>
            </div>
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