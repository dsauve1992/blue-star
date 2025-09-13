import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router";
import type { ReactNode } from "react";

interface AnimatedLayoutProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.3,
};

export function AnimatedLayout({ children }: AnimatedLayoutProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen"
        style={{ 
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden'
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
