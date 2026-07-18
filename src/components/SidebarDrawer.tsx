import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function SidebarDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-surface-container rounded-full shadow-md"
      >
        <Menu className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="fixed top-0 left-0 h-full w-80 bg-surface-container z-50 p-6 overflow-y-auto"
            >
              <button onClick={() => setIsOpen(false)} className="mb-6">
                <X className="w-6 h-6" />
              </button>
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
