import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { cn } from "@/lib/utils";

export default function SeasonalBanner() {
  const theme = useMemo(() => getSeasonalTheme(), []);
  const storageKey = `seasonal-banner-dismissed:${theme.season}`;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (theme.promoDiscount === null) {
      setIsVisible(false);
      return;
    }

    const wasDismissed = sessionStorage.getItem(storageKey) === "true";
    setIsVisible(!wasDismissed);
  }, [storageKey, theme.promoDiscount]);

  if (theme.promoDiscount === null || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0, height: 0 }}
        animate={{ y: 0, opacity: 1, height: "auto" }}
        exit={{ y: -20, opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className={cn("relative overflow-hidden", theme.bannerBg, theme.bannerText)}
      >
        <div className="container mx-auto flex items-center justify-center gap-3 px-4 py-3 text-sm font-semibold">
          <span className="shrink-0">{theme.emoji}</span>
          <p className="truncate text-center">
            {theme.promoHeadline}
            {theme.promoCode ? ` — Use code ${theme.promoCode} at booking` : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              sessionStorage.setItem(storageKey, "true");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-black/10"
            aria-label="Dismiss seasonal banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
