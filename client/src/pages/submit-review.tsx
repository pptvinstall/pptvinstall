
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Star, Upload, Camera, CheckCircle } from "lucide-react";

export default function SubmitReviewPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [service, setService] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [isRecentCustomer, setIsRecentCustomer] = useState("yes");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleMouseEnter = (hoveredRating: number) => {
    setHoverRating(hoveredRating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      // Limit to 3 photos
      if (photos.length + newPhotos.length > 3) {
        toast({
          title: "Too many photos",
          description: "You can upload a maximum of 3 photos",
          variant: "destructive",
        });
        return;
      }
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating for your review",
        variant: "destructive",
      });
      return;
    }
    
    if (!reviewText) {
      toast({
        title: "Review text required",
        description: "Please write a review about your experience",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionSuccess(true);
      
      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
    }, 1500);
  };

  // Render success state after submission
  if (submissionSuccess) {
    return (
      <div className="container mx-auto py-16 px-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-12 pb-8 px-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Thank You for Your Review!</h2>
            <p className="text-gray-600 mb-8">
              Your feedback helps us improve and lets others know about our services.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
              >
                Back to Home
              </Button>
              <Button
                onClick={() => navigate("/testimonials")}
              >
                See All Reviews
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-2">Share Your Experience</h1>
      <p className="text-center text-gray-600 mb-8">
        We value your feedback and would love to hear about your experience with our services.
      </p>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Submit Your Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="yes" onValueChange={(value) => setIsRecentCustomer(value)}>
            <TabsList className="mb-6">
              <TabsTrigger value="yes">I'm a recent customer</TabsTrigger>
              <TabsTrigger value="no">I used the service before</TabsTrigger>
            </TabsList>

            <TabsContent value="yes">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Your Name</Label>
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Your name" 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="Your email address" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bookingId">Booking Reference ID (if available)</Label>
                    <Input 
                      id="bookingId" 
                      value={bookingId} 
                      onChange={(e) => setBookingId(e.target.value)} 
                      placeholder="e.g., 1234" 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can find this in your booking confirmation email
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="service">What service did you use?</Label>
                    <Input 
                      id="service" 
                      value={service} 
                      onChange={(e) => setService(e.target.value)} 
                      placeholder="e.g., TV Mounting, Smart Doorbell Installation" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <Label>Your Rating</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-8 w-8 cursor-pointer ${
                            star <= (hoverRating || rating)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                          onClick={() => handleRatingClick(star)}
                          onMouseEnter={() => handleMouseEnter(star)}
                          onMouseLeave={handleMouseLeave}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="review">Your Review</Label>
                    <Textarea 
                      id="review" 
                      value={reviewText} 
                      onChange={(e) => setReviewText(e.target.value)} 
                      placeholder="Tell us about your experience..." 
                      className="h-32" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <Label>Add Photos (Optional)</Label>
                    <div className="mt-2 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Uploaded ${index}`}
                              className="h-24 w-full object-cover rounded-md"
                            />
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              onClick={() => removePhoto(index)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {photos.length < 3 && (
                          <label className="h-24 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                            <Camera className="h-6 w-6 text-gray-400" />
                            <span className="text-sm text-gray-500 mt-2">Add Photo</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                            />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        You can upload up to 3 photos of your installation (optional)
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="no">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name-past">Your Name</Label>
                      <Input 
                        id="name-past" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Your name" 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-past">Email Address</Label>
                      <Input 
                        id="email-past" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="Your email address" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="service-past">What service did you use?</Label>
                    <Input 
                      id="service-past" 
                      value={service} 
                      onChange={(e) => setService(e.target.value)} 
                      placeholder="e.g., TV Mounting, Smart Doorbell Installation" 
                      required 
                    />
                  </div>

                  <div>
                    <Label>When did you use our service?</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Input 
                          type="month" 
                          className="w-full" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Your Rating</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-8 w-8 cursor-pointer ${
                            star <= (hoverRating || rating)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                          onClick={() => handleRatingClick(star)}
                          onMouseEnter={() => handleMouseEnter(star)}
                          onMouseLeave={handleMouseLeave}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="review-past">Your Review</Label>
                    <Textarea 
                      id="review-past" 
                      value={reviewText} 
                      onChange={(e) => setReviewText(e.target.value)} 
                      placeholder="Tell us about your experience..." 
                      className="h-32" 
                      required 
                    />
                  </div>
                </div>
                
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
