import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Phone, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function MobileFAB() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointer);
    }

    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  const actions = [
    { label: "Quote", href: "/quote", icon: Sparkles, type: "link" as const },
    { label: "Call", href: "tel:4047024748", icon: Phone, type: "anchor" as const },
    { label: "Text", href: "sms:4047024748", icon: MessageSquare, type: "anchor" as const },
  ];

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 md:hidden">
      <AnimatePresence>
        {open ? (
          <motion.div initial="hidden" animate="show" exit="hidden" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } } }} className="mb-3 flex flex-col items-end gap-3">
            {actions.map((action) => {
              const content = (
                <motion.div
                  key={action.label}
                  variants={{ hidden: { opacity: 0, y: 8, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }}
                  className="flex items-center gap-3"
                >
                  <span className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-lg">{action.label}</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg">
                    <action.icon className="h-5 w-5" />
                  </div>
                </motion.div>
              );

              if (action.type === "link") {
                return (
                  <Link key={action.label} href={action.href}>
                    <button type="button" onClick={() => setOpen(false)}>{content}</button>
                  </Link>
                );
              }

              return (
                <a key={action.label} href={action.href} onClick={() => setOpen(false)}>
                  {content}
                </a>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button type="button" size="icon" onClick={() => setOpen((current) => !current)} className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-500">
        <Phone className="h-6 w-6" />
      </Button>
    </div>
  );
}
