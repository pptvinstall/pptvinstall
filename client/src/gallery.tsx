import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";

// Placeholder images - You will eventually replace these src links with your real photos!
const projects = [
  {
    title: "Living Room Cinematic Setup",
    desc: "85\" Samsung mounted on drywall with full wire concealment.",
    location: "Buckhead, GA",
    tags: ["Wire Concealment", "85\" TV", "Soundbar"],
    image: "https://images.unsplash.com/photo-1593784653056-143415668288?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Modern Fireplace Mount",
    desc: "Clean installation above a gas fireplace with heat-safe tilting mount.",
    location: "Decatur, GA",
    tags: ["Fireplace", "Brick Surface", "Tilt Mount"],
    image: "https://images.unsplash.com/photo-1558882224-dda166733046?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Outdoor Patio Entertainment",
    desc: "Weatherproof installation for a covered patio area.",
    location: "Alpharetta, GA",
    tags: ["Outdoor", "Weatherproof", "Swivel Mount"],
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Bedroom Floating Setup",
    desc: "Minimalist setup with LED backlighting and floating shelf.",
    location: "Midtown Atlanta",
    tags: ["Bedroom", "LED Lights", "Floating Shelf"],
    image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Gaming Station",
    desc: "Triple monitor and large TV setup for the ultimate gaming room.",
    location: "Marietta, GA",
    tags: ["Gaming", "Cable Management", "RGB"],
    image: "https://images.unsplash.com/photo-1616593969747-4797dc75033e?q=80&w=1000&auto=format&fit=crop"
  },
  {
    title: "Office Conference Room",
    desc: "Commercial installation for a tech startup meeting room.",
    location: "Atlanta Tech Village",
    tags: ["Commercial", "75\" TV", "Video Conferencing"],
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop"
  }
];

export default function Gallery() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* --- HERO SECTION --- */}
      <section className="relative bg-slate-900 text-white pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
          <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-blue-600 blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto space-y-4"
          >
            <Badge className="bg-blue-600 hover:bg-blue-500 mb-2">Our Work</Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              See the <span className="text-blue-500">Difference</span>
            </h1>
            <p className="text-lg text-slate-300">
              Browse our recent projects across Metro Atlanta. <br/>From basic mounts to complex custom installations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* --- GALLERY GRID --- */}
      <section className="py-20 -mt-10 relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow bg-white h-full flex flex-col">
                  <div className="relative h-64 overflow-hidden group">
                    <img 
                      src={project.image} 
                      alt={`${project.title} - TV Mounting in ${project.location}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /> 5.0
                    </div>
                  </div>
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{project.title}</h3>
                      <p className="text-slate-500 text-sm mb-4">{project.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map(tag => (
                          <span key={tag} className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{project.location}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Inspired by what you see?</h3>
            <Link href="/booking">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-6 rounded-full shadow-lg shadow-blue-200 text-lg">
                Book Your Transformation <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
}