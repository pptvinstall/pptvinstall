import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PhoneCall } from "lucide-react";

export default function Nav() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <a className="text-2xl font-bold text-primary">
            Picture Perfect TV Install
          </a>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link href="/services">
            <a className="hover:text-primary transition-colors">Services</a>
          </Link>
          <Link href="/booking">
            <a className="hover:text-primary transition-colors">Book Now</a>
          </Link>
          <Link href="/contact">
            <a className="hover:text-primary transition-colors">Contact</a>
          </Link>
          <Link href="/faq">
            <a className="hover:text-primary transition-colors">FAQ</a>
          </Link>
          <Button onClick={() => window.location.href = "tel:1234567890"}>
            <PhoneCall className="mr-2 h-4 w-4" />
            Call Now
          </Button>
        </div>
      </div>
    </nav>
  );
}
