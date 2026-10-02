import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

export function PromotionBanner() {
  const [isVisible, setIsVisible] = useState(false);

  // Fetch active promotions
  const { data } = useQuery({
    queryKey: ["/api/promotions"],
    queryFn: async () => {
      // Wrap in try-catch to prevent crashes on network error
      try {
        const res = await apiRequest("GET", "/api/promotions");
        const json = await res.json();
        return json.promotions || [];
      } catch (e) {
        return [];
      }
    }
  });

  // Get the first active promotion, or null if none exist
  const promotion = Array.isArray(data) && data.length > 0 ? data[0] : null;

  useEffect(() => {
    // CRASH FIX: Only run logic if a promotion actually exists
    if (promotion) {
      // Check if user already dismissed this specific promo ID
      const dismissedId = sessionStorage.getItem("dismissed_promo");
      if (dismissedId !== String(promotion.id)) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } else {
      setIsVisible(false);
    }
  }, [promotion?.id]); // Optional chaining (?.) prevents the crash reading 'id'

  const handleClose = () => {
    setIsVisible(false);
    if (promotion) {
      sessionStorage.setItem("dismissed_promo", String(promotion.id));
    }
  };

  // If no promo data, render nothing (Don't crash!)
  if (!promotion || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-blue-600 text-white relative overflow-hidden"
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium relative z-10">
          <div className="p-1.5 bg-white/20 rounded-full">
            <Tag className="h-4 w-4 text-yellow-300" />
          </div>
          <span className="text-center">
            <span className="font-bold text-yellow-300 mr-2">{promotion.name}:</span>
            {promotion.description}
          </span>
          <button 
            onClick={handleClose}
            className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-4 -left-4 w-12 h-12 bg-white rounded-full blur-xl" />
          <div className="absolute top-1/2 right-10 w-20 h-20 bg-blue-400 rounded-full blur-2xl" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}