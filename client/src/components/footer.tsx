import { Link } from "wouter";
import { Facebook, Instagram, Mail, MessageSquare, Phone } from "lucide-react";

import { Logo } from "@/components/logo";

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.35h-3.2v12.39a2.89 2.89 0 1 1-2-2.75V8.73a6.08 6.08 0 1 0 5.2 6v-6.3a8 8 0 0 0 4.77 1.57V6.69Z" />
    </svg>
  );
}

function YelpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="m12.94 2.5 1.2 5.32-2.63 1.08-1.42-5.08a1.62 1.62 0 0 1 2.85-1.32Zm-6.47 5.43 4.6 3.05-1.6 2.35-4.74-2.83a1.62 1.62 0 0 1 1.74-2.57Zm11.93-.08a1.62 1.62 0 0 1 .94 2.92l-4.8 2.72-1.54-2.39 4.73-2.95a1.62 1.62 0 0 1 .67-.3Zm-6.1 6.33 5.32 1.18a1.62 1.62 0 0 1-1.29 3l-5.1-1.37ZM9.5 15.5l1.07 2.62-5.06 1.44a1.62 1.62 0 1 1-.86-3.12Zm4.28 3.63 2.33 1.62-2.9 4.68a1.62 1.62 0 1 1-2.72-1.74Z" />
    </svg>
  );
}

const socialLinks = [
  { label: "TikTok", href: "https://www.tiktok.com/@pptvinstall", icon: TikTokIcon },
  { label: "Instagram", href: "https://www.instagram.com/pptvinstall", icon: Instagram },
  { label: "Facebook", href: "https://www.facebook.com/pptvinstall", icon: Facebook },
  { label: "Yelp", href: "https://www.yelp.com/biz/picture-perfect-tv-install-atlanta", icon: YelpIcon },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900 py-12 text-slate-300">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-4">
            <Logo variant="light" />
            <p className="text-sm text-slate-400">
              TV mounting in Atlanta, wire concealment, fireplace installs, and smart home setup across Midtown, Buckhead, Decatur, Marietta, Alpharetta, Roswell, Lawrenceville, and nearby Metro Atlanta areas.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/services" className="hover:text-blue-400">Services</Link></li>
              <li><Link href="/quote" className="hover:text-blue-400">Get a Quote</Link></li>
              <li><Link href="/gallery" className="hover:text-blue-400">Our Work</Link></li>
              <li><Link href="/faq" className="hover:text-blue-400">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-blue-400">Contact</Link></li>
            </ul>
          </div>

          <div className="space-y-5">
            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white">Contact</h4>
              <div className="flex flex-col items-start gap-3 text-sm">
                <a href="tel:4047024748" className="flex items-center gap-3 text-slate-300 transition-colors hover:text-white">
                  <Phone className="h-5 w-5 text-blue-400" />
                  404-702-4748
                </a>
                <a href="sms:4047024748" className="flex items-center gap-3 text-slate-300 transition-colors hover:text-white">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  Text us
                </a>
                <a href="mailto:pptvinstall@gmail.com" className="flex items-center gap-3 text-slate-300 transition-colors hover:text-white">
                  <Mail className="h-5 w-5 text-blue-400" />
                  pptvinstall@gmail.com
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white">Follow Us</h4>
              <div className="flex flex-wrap gap-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-slate-200 transition-all hover:scale-105 hover:bg-blue-600 hover:text-white"
                    >
                      <Icon />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
