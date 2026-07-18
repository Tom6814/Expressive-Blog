import { Link } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "motion/react";
import { Calendar, Eye, MessageSquare, ArrowRight } from "lucide-react";
import type { Post } from "../data/mock";
import { useSettings } from "../context/SettingsContext";

export function PostCard({ post, index }: { post: Post; index: number }) {
  const { settings } = useSettings();
  const isHorizontal = settings.home_card_layout === 'avatar-left';
  const isGlow = settings.post_card_style === 'glow';
  const isModern = settings.post_card_style === 'modern';
  const glowRange = parseInt(settings.post_card_glow_range || "120", 10);
  const glowOpacity = (parseInt(settings.post_card_glow_opacity || "40", 10) / 100);

  // --- Modern 样式: 大封面 + 毛玻璃标签 + 28px 圆角 ---
  if (isModern) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`group relative flex ${
          isHorizontal ? 'flex-row' : 'flex-col'
        } bg-surface-container-low rounded-[28px] border border-outline-variant/10 transition-all duration-500 ease-out overflow-hidden
          hover:bg-surface-container hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1
        `}
      >
        {/* Cover */}
        <Link
          to={`/post/${post.slug}`}
          className={`relative block overflow-hidden shrink-0 ${
            isHorizontal ? 'w-2/5 max-w-[360px]' : 'w-full aspect-[16/10]'
          }`}
        >
          {post.coverImage ? (
            <>
              <motion.img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </>
          ) : (
            <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
              <div className="text-6xl font-black font-display text-on-surface-variant/10 select-none group-hover:text-primary/10 transition-colors duration-500">
                {post.title.charAt(0)}
              </div>
            </div>
          )}
          {post.category && (
            <Link
              to={`/category/${post.category.id}`}
              onClick={e => e.stopPropagation()}
              className="absolute top-4 left-4 z-10"
            >
              <span className="inline-block px-3.5 py-1.5 text-xs font-bold rounded-full bg-surface/80 backdrop-blur-md text-primary border border-primary/20
                hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300 shadow-sm"
              >
                {post.category.name}
              </span>
            </Link>
          )}
        </Link>

        {/* Content */}
        <div className={`flex flex-col flex-1 p-6 lg:p-7 gap-4 ${isHorizontal ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant/70">
            <Calendar className="w-3.5 h-3.5" />
            <span>{format(new Date(post.date), "yyyy 年 M 月 d 日")}</span>
          </div>
          <Link to={`/post/${post.slug}`} className="block">
            <h2 className="text-xl lg:text-2xl font-bold font-display text-on-surface leading-snug tracking-tight
              group-hover:text-primary transition-colors duration-300 line-clamp-2"
            >
              {post.title}
            </h2>
          </Link>
          {post.excerpt && (
            <p className="text-sm lg:text-base text-on-surface-variant/70 leading-relaxed line-clamp-3 flex-1">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between pt-3 mt-auto border-t border-outline-variant/10">
            <div className="flex items-center gap-5 text-xs font-medium text-on-surface-variant/60">
              <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{post.views}</span>
              <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />{post.comments}</span>
            </div>
            <Link to={`/post/${post.slug}`} className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-on-primary-container transition-colors group/arrow">
              阅读 <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/arrow:translate-x-1" />
            </Link>
          </div>
        </div>
      </motion.article>
    );
  }

  // --- Original 样式 (default + glow) ---
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, type: "spring" }}
      className={`group relative flex ${isHorizontal ? 'flex-row' : 'flex-col'} bg-surface-container rounded-[var(--radius-md3)] shadow-sm hover:shadow-md transition-shadow duration-300 border border-outline-variant/10 ${
        isGlow
          ? 'hover:border-primary/40'
          : 'overflow-hidden'
      }`}
    >
      {isGlow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileHover={{
              opacity: glowOpacity,
              scale: [0.98, 1.06, 0.98],
            }}
            transition={{
              opacity: { duration: 0.3 },
              scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute bg-primary pointer-events-none"
            style={{
              inset: `-${glowRange}px`,
              borderRadius: glowRange > 200 ? '9999px' : `calc(var(--radius-md3) + ${glowRange * 0.25}px)`,
              filter: `blur(${Math.max(glowRange * 0.08, 4)}px)`,
            }}
          />
        )}

      {isHorizontal && post.coverImage && (
        <Link to={`/post/${post.slug}`} className={`block relative overflow-hidden w-1/3 ${isGlow ? 'rounded-l-[var(--radius-md3)]' : ''}`}>
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </Link>
      )}
      {!isHorizontal && post.coverImage && (
        <Link to={`/post/${post.slug}`} className={`block relative overflow-hidden ${isGlow ? 'rounded-t-[var(--radius-md3)]' : ''}`}>
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
      )}

      <div className={`p-6 flex flex-col flex-grow ${isHorizontal ? 'w-2/3' : ''}`}>
        <div className="flex items-center gap-3 mb-4 text-sm font-medium text-primary">
          <Link to={`/category/${post.category.id}`} className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full hover:bg-primary hover:text-on-primary transition-colors">
            {post.category.name}
          </Link>
          <span className="flex items-center gap-1 text-on-surface-variant">
            <Calendar className="w-4 h-4" />
            {format(new Date(post.date), "MMM d, yyyy")}
          </span>
        </div>
        <Link to={`/post/${post.slug}`} className="block group-hover:text-primary transition-colors">
          <h2 className="text-2xl font-bold font-display text-on-surface mb-3 line-clamp-2 leading-tight">
            {post.title}
          </h2>
        </Link>
        <p className="text-on-surface-variant mb-6 line-clamp-3 leading-relaxed flex-grow">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/20">
          <div className="flex items-center gap-4 text-sm text-on-surface-variant font-medium">
            <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {post.views}</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> {post.comments}</span>
          </div>
          <Link to={`/post/${post.slug}`} className="flex items-center gap-2 text-primary font-bold hover:text-on-primary-container transition-colors">
            阅读更多 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
