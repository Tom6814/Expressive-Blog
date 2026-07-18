import React, { createContext, useContext, useState, useEffect } from "react";
import { useSettings } from "./SettingsContext";

export type ColorTheme = "blue" | "green" | "purple" | "orange" | "rose";
export type BorderRadius = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  borderRadius: BorderRadius;
  setBorderRadius: (radius: BorderRadius) => void;
  isCustomizerOpen: boolean;
  setCustomizerOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [isDark, setIsDark] = useState(settings.default_dark_mode === 'dark');
  const [colorTheme, setColorTheme] = useState<ColorTheme>((settings.default_theme_color as ColorTheme) || "purple");
  const [borderRadius, setBorderRadius] = useState<BorderRadius>((settings.default_border_radius as BorderRadius) || "3xl");
  const [isCustomizerOpen, setCustomizerOpen] = useState(false);

  useEffect(() => {
    if (settings.default_dark_mode) {
      setIsDark(settings.default_dark_mode === 'dark');
    }
    if (settings.default_theme_color) {
      setColorTheme(settings.default_theme_color as ColorTheme);
    }
    if (settings.default_border_radius) {
      setBorderRadius(settings.default_border_radius as BorderRadius);
    }
  }, [settings]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.dataset.theme = colorTheme;
  }, [colorTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.dataset.radius = borderRadius;
  }, [borderRadius]);

  const toggleDark = () => {
    if (settings.allow_user_override === 'false') return;
    setIsDark(!isDark);
  };

  const setColorThemeOverride = (theme: ColorTheme) => {
    if (settings.allow_user_override === 'false') return;
    setColorTheme(theme);
  };

  const setBorderRadiusOverride = (radius: BorderRadius) => {
    if (settings.allow_user_override === 'false') return;
    setBorderRadius(radius);
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleDark,
        colorTheme,
        setColorTheme: setColorThemeOverride,
        borderRadius,
        setBorderRadius: setBorderRadiusOverride,
        isCustomizerOpen,
        setCustomizerOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
