import { motion } from "motion/react";

export function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  const containerClasses = fullScreen 
    ? "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface text-on-surface overflow-hidden"
    : "flex flex-col items-center justify-center py-20 w-full h-full min-h-[50vh]";

  return (
    <motion.div
      className={containerClasses}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className="relative flex flex-col items-center">
        {/* Orbiting Elements */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-primary/30 rounded-full z-0"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity, repeatType: "reverse" } }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
        </motion.div>
        
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-tertiary/20 rounded-full z-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-tertiary rounded-full shadow-[0_0_10px_rgba(var(--tertiary),0.5)]" />
        </motion.div>

        {/* Center Pulse */}
        <motion.div 
          className="w-12 h-12 bg-secondary rounded-full z-10 shadow-lg"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.h2
        className="mt-12 text-lg font-display font-bold text-primary tracking-widest uppercase"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        加载中...
      </motion.h2>
    </motion.div>
  );
}
