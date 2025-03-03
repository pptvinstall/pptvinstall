import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Picture Perfect TV Install</h3>
            <p className="text-gray-600">
              Professional TV mounting services for your home or business.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link href="/services">
                <a className="text-gray-600 hover:text-primary">Services</a>
              </Link>
              <Link href="/booking">
                <a className="text-gray-600 hover:text-primary">Book Now</a>
              </Link>
              <Link href="/contact">
                <a className="text-gray-600 hover:text-primary">Contact</a>
              </Link>
              <Link href="/faq">
                <a className="text-gray-600 hover:text-primary">FAQ</a>
              </Link>
            </div>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-4">Contact Info</h3>
            <div className="flex flex-col gap-2 text-gray-600">
              <p>Phone: (123) 456-7890</p>
              <p>Email: info@perfecttvinstall.com</p>
              <p>Hours: Mon-Sat 9am-6pm</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-gray-600">
          <p>© {new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
