import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useSettings } from "../context/SettingsContext";

export function CustomCursor() {
  const { settings } = useSettings();
  const enabled = settings.enable_custom_cursor === "true";
  const cursorStyle = settings.cursor_style || "dot";

  const defaultText = settings.cursor_text || "(❁´◡`❁)";
  const hoverText = settings.cursor_hover_text || "(✧◡✧)";
  const clickText = settings.cursor_click_text || "(≧∇≦)ﾉ";

  // 大小：dot 模式下控制颜文字字号，emoji 模式下控制整体缩放
  const sizePercent = parseFloat(settings.cursor_size || "100") / 100;
  // 缓动：值越小越跟手（更快），值越大越有弹性（更慢）
  const springFactor = parseFloat(settings.cursor_spring || "50") / 100;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 动态 spring 配置
  const springConfig = useMemo(
    () => ({
      damping: 10 + 40 * springFactor,  // 10~50
      stiffness: 300 - 180 * springFactor, // 120~300
      mass: 0.3 + 0.7 * springFactor,  // 0.3~1.0
    }),
    [springFactor]
  );

  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    mouseX.jump(0);
    mouseY.jump(0);
  }, [mouseX, mouseY]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    },
    [mouseX, mouseY]
  );

  const handleMouseOver = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    setIsHovering(
      !!target.closest("a, button, input, select, textarea, [role='button']")
    );
  }, []);

  const handleMouseDown = useCallback(() => setIsClicking(true), []);
  const handleMouseUp = useCallback(() => setIsClicking(false), []);

  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove("hide-default-cursor");
      return;
    }

    document.body.classList.add("hide-default-cursor");

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      document.body.classList.remove("hide-default-cursor");
    };
  }, [enabled, handleMouseMove, handleMouseOver]);

  if (!enabled) return null;

  const displayText = isClicking ? clickText : isHovering ? hoverText : defaultText;
  const isEmojiOnly = cursorStyle === "emoji";

  const stateColor = isClicking
    ? "text-tertiary"
    : isHovering
    ? "text-secondary"
    : "text-primary";

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[99999]"
      style={{ x: cursorX, y: cursorY }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* 样式一：dot — 小圆点 + 右下角颜文字 */}
      {!isEmojiOnly && (
        <>
          <div
            className="absolute top-0 left-0 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_var(--md-sys-color-primary)]"
            style={{ width: `${1.5 * sizePercent}px`, height: `${1.5 * sizePercent}px` }}
          />
          <motion.div
            className={`absolute top-2 left-3 font-display font-bold whitespace-nowrap drop-shadow-md transition-colors duration-300 ${stateColor}`}
            style={{ fontSize: `${1 * sizePercent}rem` }}
            animate={{ scale: isClicking ? 0.85 : isHovering ? 1.1 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            {displayText}
          </motion.div>
        </>
      )}

      {/* 样式二：emoji — 纯颜文字居中，颜文字本身即为光标点 */}
      {isEmojiOnly && (
        <motion.div
          className={`absolute -translate-x-1/2 -translate-y-1/2 font-display font-bold whitespace-nowrap drop-shadow-md transition-colors duration-300 ${stateColor}`}
          style={{ fontSize: `${1.2 * sizePercent}rem` }}
          animate={{
            scale: isClicking ? 0.85 : isHovering ? 1.15 : 1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {displayText}
        </motion.div>
      )}
    </motion.div>
  );
}
