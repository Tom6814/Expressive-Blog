import { useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import { Link } from "react-router-dom";

const AVATAR_FRAME_PRESETS: Record<string, string> = {
  gradient: "bg-gradient-to-tr from-primary via-tertiary to-secondary",
  solid: "bg-primary",
  dual: "bg-gradient-to-r from-primary to-secondary",
  rainbow: "bg-gradient-to-tr from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400",
  glow: "bg-primary shadow-[0_0_30px_var(--md-sys-color-primary)]",
  ring: "bg-surface border-4 border-primary",
};

const AVATAR_BORDER_PRESETS: Record<string, string> = {
  gradient: "border-4 border-surface",
  solid: "border-4 border-primary-container",
  dual: "border-4 border-surface",
  rainbow: "border-4 border-surface",
  glow: "border-4 border-primary-container",
  ring: "border-0",
};

export function Hero() {
  const { settings } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x * 16);
    mouseY.set(y * 16);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const authorName = settings.author_name || "Expressive Blogger";
  const authorBio = settings.author_bio || "I write about design, development, and the intersection of both.";
  const authorAvatar = settings.author_avatar || "https://picsum.photos/seed/avatar/200/200";
  const siteSubtitle = settings.site_subtitle || "Welcome to my space.";
  const isRowLayout = settings.hero_layout === 'row';
  const heroCustomHtml = settings.hero_custom_html;
  const avatarFrameStyle = settings.avatar_frame_style || "gradient";
  const frameClass = AVATAR_FRAME_PRESETS[avatarFrameStyle] || AVATAR_FRAME_PRESETS.gradient;
  const borderClass = AVATAR_BORDER_PRESETS[avatarFrameStyle] || AVATAR_BORDER_PRESETS.gradient;
  const avatarScale = parseFloat(settings.hero_avatar_scale || "1.0");
  const heroBgOpacity = parseFloat(settings.hero_bg_opacity || "1.0");

  // Custom HTML hero overrides everything
  if (heroCustomHtml?.trim()) {
    return (
      <div className="relative mb-12 rounded-[var(--radius-md3)] overflow-hidden">
        <div dangerouslySetInnerHTML={{ __html: heroCustomHtml }} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-[var(--radius-md3)] p-8 lg:p-16 mb-12 shadow-sm border border-outline-variant/10 flex flex-col ${isRowLayout ? 'md:flex-row md:text-left' : 'items-center text-center'} justify-center gap-8 lg:gap-16`}
    >
      <div className="absolute inset-0 bg-primary-container" style={{ opacity: heroBgOpacity }} />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-tertiary/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        style={{ x: springX, y: springY }}
        className="relative z-10 shrink-0"
      >
        <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full p-2 ${frameClass} shadow-xl ${isRowLayout ? 'mx-auto md:mx-0' : 'mx-auto'}`} style={{ transform: `scale(${avatarScale})` }}>
          <img
            src={authorAvatar}
            alt={authorName}
            className={`w-full h-full rounded-full object-cover ${borderClass}`}
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>

      <div className={`relative z-10 max-w-3xl ${isRowLayout ? 'mx-auto md:mx-0' : 'mx-auto'}`}>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl lg:text-7xl font-display font-black text-on-primary-container leading-tight mb-6 tracking-tight"
        >
          Hello, I'm <span className="text-primary">{authorName.split(' ')[0]}</span>.
          <br />
          <span className="text-2xl md:text-3xl lg:text-5xl opacity-80 mt-2 block">{siteSubtitle}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`text-lg lg:text-xl text-on-primary-container/80 font-medium leading-relaxed mb-8 max-w-2xl ${isRowLayout ? 'mx-auto md:mx-0' : 'mx-auto'}`}
        >
          {authorBio}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`flex flex-wrap gap-4 ${isRowLayout ? 'justify-center md:justify-start' : 'justify-center'}`}
        >
          <Link to="/about" className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95 transform">
            关于我
          </Link>
          <Link to="/moments" className="px-8 py-4 bg-surface text-primary rounded-full font-bold hover:bg-surface-variant transition-all shadow-sm hover:shadow-md active:scale-95 transform border border-outline-variant/20">
            查看动态
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
