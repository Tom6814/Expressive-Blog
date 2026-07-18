import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Sidebar } from "../components/Sidebar";
import { Loader } from "../components/Loader";
import { useSettings } from "../context/SettingsContext";

export function Tags() {
  const { settings } = useSettings();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTags().then(data => {
      setTags(data);
      setLoading(false);
    });
  }, []);

  // Calculate max count for scaling
  const maxCount = Math.max(...tags.map(t => t.count), 1);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className={`flex flex-col ${settings.sidebar_position === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 justify-center`}>
      <div className="flex-grow max-w-4xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl lg:text-5xl font-display font-black text-on-surface mb-4">
            标签
          </h1>
          <p className="text-xl text-on-surface-variant">
            探索 {tags.length} 个不同的话题。
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
          className="bg-surface-container rounded-[var(--radius-md3)] p-8 lg:p-12 shadow-sm border border-outline-variant/10 flex flex-wrap gap-4 items-center justify-center"
        >
          {tags.map((tag, index) => {
            // Calculate size based on count relative to maxCount
            const sizeRatio = tag.count / maxCount;
            const fontSize = Math.max(1, 1 + (sizeRatio * 1.5)); // 1rem to 2.5rem
            const opacity = Math.max(0.6, 0.6 + (sizeRatio * 0.4)); // 0.6 to 1.0

            return (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 15 }}
              >
                <Link 
                  to={`/tag/${tag.id}`}
                  className="inline-block px-4 py-2 rounded-full bg-surface hover:bg-primary hover:text-on-primary text-on-surface transition-all duration-300 shadow-sm hover:shadow-md border border-outline-variant/10 hover:scale-110 active:scale-95"
                  style={{ 
                    fontSize: `${fontSize}rem`,
                    opacity: opacity,
                    fontWeight: sizeRatio > 0.5 ? 700 : 500
                  }}
                >
                  #{tag.name}
                  <span className="ml-2 text-xs font-bold bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-full align-middle opacity-80">
                    {tag.count}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
      
      {settings.sidebar_layout !== 'negative' && <Sidebar />}
    </div>
  );
}
