import { motion, AnimatePresence } from "motion/react";
import { X, Moon, Sun, Check } from "lucide-react";
import { useTheme, ColorTheme, BorderRadius } from "../context/ThemeContext";

const colors: { id: ColorTheme; name: string; hex: string }[] = [
  { id: "purple", name: "Purple", hex: "#6750A4" },
  { id: "blue", name: "Blue", hex: "#0061A4" },
  { id: "green", name: "Green", hex: "#006D40" },
  { id: "orange", name: "Orange", hex: "#984800" },
  { id: "rose", name: "Rose", hex: "#9C4146" },
];

const radii: { id: BorderRadius; name: string }[] = [
  { id: "sm", name: "Small" },
  { id: "md", name: "Medium" },
  { id: "lg", name: "Large" },
  { id: "xl", name: "Extra Large" },
  { id: "2xl", name: "2XL" },
  { id: "3xl", name: "3XL" },
  { id: "full", name: "Pill" },
];

export function Customizer() {
  const { 
    isCustomizerOpen, 
    setCustomizerOpen, 
    isDark, 
    toggleDark, 
    colorTheme, 
    setColorTheme,
    borderRadius,
    setBorderRadius
  } = useTheme();

  return (
    <AnimatePresence>
      {isCustomizerOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCustomizerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-surface border-l border-outline-variant/20 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 flex items-center justify-between border-b border-outline-variant/20 sticky top-0 bg-surface/90 backdrop-blur-md">
              <h2 className="text-xl font-bold font-display text-on-surface">Theme Customizer</h2>
              <button 
                onClick={() => setCustomizerOpen(false)}
                className="p-2 rounded-full hover:bg-surface-variant text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Dark Mode */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Appearance</h3>
                <div className="flex bg-surface-container-highest rounded-full p-1 border border-outline-variant/10">
                  <button 
                    onClick={() => isDark && toggleDark()}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-medium transition-all ${!isDark ? 'bg-surface shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                  <button 
                    onClick={() => !isDark && toggleDark()}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full font-medium transition-all ${isDark ? 'bg-surface shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                </div>
              </section>

              {/* Color Theme */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Color Palette</h3>
                <div className="grid grid-cols-5 gap-3">
                  {colors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setColorTheme(color.id)}
                      className={`w-full aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${colorTheme === color.id ? 'ring-2 ring-offset-2 ring-offset-surface ring-primary' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {colorTheme === color.id && <Check className="w-5 h-5 text-white" />}
                    </button>
                  ))}
                </div>
              </section>

              {/* Border Radius */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">Border Radius</h3>
                <div className="grid grid-cols-3 gap-3">
                  {radii.map(radius => (
                    <button
                      key={radius.id}
                      onClick={() => setBorderRadius(radius.id)}
                      className={`py-3 px-4 text-sm font-medium border transition-all ${
                        borderRadius === radius.id 
                          ? 'bg-primary-container border-primary text-on-primary-container' 
                          : 'bg-surface border-outline-variant/30 text-on-surface hover:bg-surface-variant'
                      }`}
                      style={{ borderRadius: radius.id === 'full' ? '9999px' : `var(--radius-${radius.id}, 0.5rem)` }}
                    >
                      {radius.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant mt-3 text-center">
                  MD3 Expressive favors larger radii (2XL, 3XL).
                </p>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
