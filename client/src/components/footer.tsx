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
                <span className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">Services</span>
              </Link>
              <Link href="/booking">
                <span className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">Book Now</span>
              </Link>
              <Link href="/contact">
                <span className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">Contact</span>
              </Link>
              <Link href="/faq">
                <span className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer">FAQ</span>
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