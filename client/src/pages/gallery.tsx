import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Instagram, Video, ExternalLink, Star } from "lucide-react";

// REAL INSTALLATION VIDEOS — sourced from client/public/images/my-work/
// NOTE: These files are used ONLY here in gallery.tsx (duplicate prevention)
const myWorkVideos = [
  { src: "/images/my-work/01084837c9fcd4d23fb4f9e637303a59aad5a2dd01.mp4", title: "Fireplace TV Mount" },
  { src: "/images/my-work/015a18e4546bdc693e1f15817180e267379d08eb05.mp4", title: "Wire Concealment" },
  { src: "/images/my-work/0189370cd70614bd15ca787fed8728895cf3c5d8b9.mp4", title: "Full Motion Mount" },
  { src: "/images/my-work/0189ce9b19ce2b7c50f033ac4044d3b8688d42200f.mp4", title: "Living Room Setup" },
  { src: "/images/my-work/01e02640c912c5bbb32b1da8f4f50c4f6fdf520543.mp4", title: "Bedroom Install" },
  { src: "/images/my-work/01e67cbd984dcac84209cbdee398fab01163b06861.mp4", title: "Same-Day Service" },
  { src: "/images/my-work/01ea6e0c15e254ff9f933658155bf812acd816499c.mp4", title: "Drywall Mount" },
  { src: "/images/my-work/01ea7ace5a6a1bbbab72da78289fbfd19d755aed6c.mp4", title: "Smart TV Setup" },
];

// GALLERY GRID PHOTOS — sourced from client/public/images/my-work/
// NOTE: These 6 files are used ONLY here in gallery.tsx (duplicate prevention)
// Homepage "Our Work" uses a different set of 8 photos; services.tsx uses 2 others.
const galleryPhotos = [
  { src: "/images/my-work/0114f3f2b8712cf1c47bcd107a54d2dac2d8f842b1.jpg", alt: "Tight-space TV mount in hallway with smart thermostat and clean drywall installation" },
  { src: "/images/my-work/0118e78888c72c849a9c8660a8b7df74af8d1cbbd4.jpg", alt: "TV mounted above a fireplace in a formal room with classic dark wood wainscot paneling" },
  { src: "/images/my-work/012c6de9f469e9284c70d5f1e53da3ae028beef697.jpg", alt: "Samsung smart TV mounted on clean white drywall with device setup complete" },
  { src: "/images/my-work/01cec680c2043765652aa72010b029f1ddb8ec0bfd.jpg", alt: "Large TV mounted in a commercial event space with hardwood floors" },
  { src: "/images/my-work/01e2b6c32c7332df6f62634cb8efd67b2a39a385b7.jpg", alt: "Oversized TV freshly mounted in a living room with Amazon Fire TV set up and ready to go" },
  { src: "/images/my-work/01f7bc4b85c5cf3bad683fa4b34740c5c280218cfa.jpg", alt: "Brand new Roku TV mounted on a sage green bedroom wall — fresh out of the box and mounted same day" },
];

export default function Gallery() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* --- HERO --- */}
      <section className="relative bg-slate-900 text-white pt-28 pb-16 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black opacity-80" />
        
        <div className="container relative z-10 mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 border-none text-white px-3 py-1 text-sm shadow-lg">
              <Instagram className="w-3 h-3 mr-1" /> As Seen On Social
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Real Installs.<br/><span className="text-blue-500">Real Results.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-sm mx-auto">
              No stock photos here. Just clean work from around Atlanta.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- WATCH US WORK — local mp4 videos from /images/my-work/ --- */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="p-3 rounded-full bg-black text-white shadow-lg">
              <Video className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Watch Us Work</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {myWorkVideos.map((video, idx) => (
              <div key={idx} className="bg-slate-900 rounded-xl overflow-hidden shadow-lg">
                <video
                  src={video.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full aspect-[9/16] object-cover"
                  aria-label={video.title}
                />
                <div className="px-3 py-2">
                  <p className="text-white text-xs font-semibold truncate">{video.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="https://www.tiktok.com/@pptvinstall" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="rounded-full border-2 border-black text-black hover:bg-black hover:text-white font-bold px-8 gap-2">
                <ExternalLink className="h-4 w-4" /> Follow @pptvinstall on TikTok
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* --- INSTAGRAM GRID --- */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold text-slate-700">Recent Atlanta Projects</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">The Highlight Reel</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 auto-rows-fr">
            {galleryPhotos.map((img, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden bg-white rounded-xl shadow-sm border border-slate-100 cursor-zoom-in">
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-white text-xs font-medium line-clamp-2">{img.alt}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <div className="bg-blue-600 rounded-2xl p-8 md:p-12 shadow-2xl shadow-blue-200 max-w-4xl mx-auto relative overflow-hidden">
               {/* Background patterns */}
               <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
               <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
               
               <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 relative z-10">Want your setup to look this good?</h3>
               <p className="text-blue-100 mb-8 max-w-lg mx-auto relative z-10">
                 Book online in less than 60 seconds. No hidden fees. Pay after we finish.
               </p>
               <Link href="/quote">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-10 py-6 rounded-full shadow-lg text-lg relative z-10">
                  Get Instant Quote
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
