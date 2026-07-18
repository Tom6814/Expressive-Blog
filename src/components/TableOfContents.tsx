import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const headings: TocHeading[] = useMemo(() => {
    const regex = /^(#{2,3})\s+(.+)$/gm;
    const result: TocHeading[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff-]/g, "");
      result.push({ id, text, level: match[1].length });
    }
    return result;
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-60px 0px -70% 0px" }
    );
    headings.forEach(h => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav
      className="fixed left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-0"
      onMouseLeave={() => setHoveredId(null)}
    >
      {/* Vertical connector line */}
      <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-px bg-outline-variant/20" />

      {headings.map((h, i) => {
        const isActive = activeId === h.id;
        const isHovered = hoveredId === h.id;

        return (
          <div key={h.id} className="relative flex items-center py-1.5">
            {/* Tooltip label — appears on hover */}
            <AnimatePresence>
              {isHovered && (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute left-8 whitespace-nowrap pointer-events-none
                    text-xs font-bold text-on-surface bg-surface-container/90 backdrop-blur-md 
                    px-3 py-1.5 rounded-xl border border-outline-variant/10 shadow-sm"
                >
                  {h.text.length > 18 ? h.text.slice(0, 18) + "…" : h.text}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Dot */}
            <motion.a
              href={`#${h.id}`}
              onMouseEnter={() => setHoveredId(h.id)}
              className="relative z-10 block rounded-full transition-colors"
              style={{ padding: "4px" }}
              aria-label={h.text}
            >
              <motion.div
                animate={{
                  width: isActive ? 14 : isHovered ? 10 : h.level === 3 ? 5 : 7,
                  height: isActive ? 14 : isHovered ? 10 : h.level === 3 ? 5 : 7,
                  backgroundColor: isActive
                    ? "var(--md-sys-color-primary)"
                    : isHovered
                      ? "var(--md-sys-color-on-surface-variant)"
                      : "var(--md-sys-color-outline-variant)",
                  scale: isActive ? 1 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="rounded-full"
              >
                {/* Active ring pulse */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 0, scale: 2.2 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-primary/30"
                  />
                )}
              </motion.div>
            </motion.a>
          </div>
        );
      })}
    </nav>
  );
}
