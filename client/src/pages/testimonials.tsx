
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, User, CheckCircle2, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Testimonial {
  id: number;
  name: string;
  date: string;
  rating: number;
  service: string;
  content: string;
  verified: boolean;
  photoUrl?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "David M.",
    date: "2023-11-15",
    rating: 5,
    service: "TV Mounting",
    content: "Excellent service! The technician was very professional and did a perfect job mounting my 65\" TV. He even helped me hide all the cables. Highly recommend!",
    verified: true,
  },
  {
    id: 2,
    name: "Sarah K.",
    date: "2023-10-22",
    rating: 5,
    service: "Smart Home Installation",
    content: "Picture Perfect helped me set up my entire smart home system. They installed smart locks, doorbell, and several cameras. Everything works flawlessly. Great service!",
    verified: true,
    photoUrl: "/images/testimonials/smart-home-1.jpg"
  },
  {
    id: 3,
    name: "Michael L.",
    date: "2023-12-05",
    rating: 4,
    service: "TV Mounting",
    content: "Good job overall. They mounted two TVs in my home, one in the living room and one in the bedroom. Everything looks clean and professional.",
    verified: true,
  },
  {
    id: 4,
    name: "Jennifer R.",
    date: "2024-01-10",
    rating: 5,
    service: "Smart Doorbell Installation",
    content: "The technician was on time and very knowledgeable. Had my Ring doorbell installed and working in no time. Even took the time to show me how to use the app!",
    verified: true,
    photoUrl: "/images/testimonials/doorbell-1.jpg"
  },
  {
    id: 5,
    name: "Robert T.",
    date: "2024-02-18",
    rating: 5,
    service: "Multi-TV Installation",
    content: "Had three TVs mounted throughout my house. The team was efficient, clean, and did a fantastic job. All TVs are perfectly level and the wiring is hidden.",
    verified: true,
  },
  {
    id: 6,
    name: "Lisa M.",
    date: "2024-01-25",
    rating: 4,
    service: "Smart Camera Installation",
    content: "Very happy with my security camera installation. The technician was helpful in suggesting the best locations for optimal coverage.",
    verified: true,
    photoUrl: "/images/testimonials/camera-1.jpg"
  },
  {
    id: 7,
    name: "James W.",
    date: "2023-11-30",
    rating: 5,
    service: "TV & Soundbar Mounting",
    content: "Great experience! They mounted my TV and soundbar and everything looks and sounds amazing. Very professional service.",
    verified: true,
  },
  {
    id: 8,
    name: "Elizabeth C.",
    date: "2024-02-05",
    rating: 5,
    service: "Smart Home Bundle",
    content: "Picture Perfect installed my complete smart home package - doorbell, three cameras, and smart locks. Everything is working perfectly and they were very patient in explaining how to use everything.",
    verified: true,
    photoUrl: "/images/testimonials/smart-home-2.jpg"
  },
  {
    id: 9,
    name: "Thomas B.",
    date: "2023-12-15",
    rating: 4,
    service: "TV Mounting",
    content: "Professional installation of my 75\" TV. The technician was careful with my walls and made sure everything was perfect before leaving.",
    verified: true,
  },
  {
    id: 10,
    name: "Patricia D.",
    date: "2024-01-18",
    rating: 5,
    service: "Floodlight Camera Installation",
    content: "Had two floodlight cameras installed. The technician did an excellent job and made sure they were positioned correctly for maximum coverage.",
    verified: true,
    photoUrl: "/images/testimonials/floodlight-1.jpg"
  }
];

export default function TestimonialsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Filter testimonials
  const filteredTestimonials = testimonials.filter(testimonial => {
    if (filter === "all") return true;
    return testimonial.service.toLowerCase().includes(filter.toLowerCase());
  });

  // Sort testimonials
  const sortedTestimonials = [...filteredTestimonials].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === "highest") {
      return b.rating - a.rating;
    } else {
      return a.rating - b.rating;
    }
  });

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-center mb-2">Customer Testimonials</h1>
      <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
        See what our customers are saying about our TV mounting and smart home installation services.
      </p>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All Services</TabsTrigger>
            <TabsTrigger value="TV">TV Mounting</TabsTrigger>
            <TabsTrigger value="Smart">Smart Home</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-full sm:w-auto">
          <Select defaultValue="newest" onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTestimonials.map((testimonial) => (
          <Card key={testimonial.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex text-yellow-400 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < testimonial.rating ? "fill-current" : "stroke-current fill-transparent"}`} 
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{testimonial.name}</p>
                    {testimonial.verified && (
                      <span className="flex items-center text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(testimonial.date)}
                </div>
              </div>

              <div className="mb-4">
                <span className="inline-block bg-brand-blue-100 text-brand-blue-800 text-xs px-2 py-1 rounded">
                  {testimonial.service}
                </span>
              </div>

              <p className="text-gray-700 mb-4">{testimonial.content}</p>

              {testimonial.photoUrl && (
                <div className="mt-4">
                  <img 
                    src={testimonial.photoUrl} 
                    alt={`${testimonial.name}'s installation`} 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600 mb-4">Satisfied with our service? We'd love to hear from you!</p>
        <Button onClick={() => window.location.href = "/submit-review"}>
          Submit Your Review
        </Button>
      </div>
    </div>
  );
}
