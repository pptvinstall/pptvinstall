import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PhoneCall } from "lucide-react";

export default function Nav() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <span className="text-2xl font-bold text-primary cursor-pointer">
            Picture Perfect TV Install
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/services">
            <span className="hover:text-primary transition-colors cursor-pointer">Services</span>
          </Link>
          <Link href="/booking">
            <span className="hover:text-primary transition-colors cursor-pointer">Book Now</span>
          </Link>
          <Link href="/contact">
            <span className="hover:text-primary transition-colors cursor-pointer">Contact</span>
          </Link>
          <Link href="/faq">
            <span className="hover:text-primary transition-colors cursor-pointer">FAQ</span>
          </Link>
          <Button onClick={() => window.location.href = "tel:404-702-4748"}>
            <PhoneCall className="mr-2 h-4 w-4" />
            Call Now
          </Button>
        </div>
      </div>
    </nav>
  );
}