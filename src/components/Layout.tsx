import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Customizer } from "./Customizer";
import { SidebarDrawer } from "./SidebarDrawer";
import { CustomCursor } from "./CustomCursor";
import { MusicPlayer } from "./MusicPlayer";
import { useSettings } from "../context/SettingsContext";

export function Layout() {
  const { settings } = useSettings();

  const bgImage = settings.global_bg_image;
  const bgHtml = settings.global_bg_html;
  const bgBlur = settings.global_bg_blur || "0px";
  const bgDim = settings.global_bg_dim || "0";
  const customCss = settings.custom_css;

  // Inject custom CSS
  useEffect(() => {
    let styleEl = document.getElementById('custom-css') as HTMLStyleElement | null;
    if (customCss) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = customCss;
    } else if (styleEl) {
      styleEl.textContent = '';
    }
    return () => {
      if (styleEl) styleEl.textContent = '';
    };
  }, [customCss]);

  const hasImageBg = bgImage && !bgHtml;
  const hasHtmlBg = !!bgHtml;

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background text-on-background transition-colors duration-300 relative">
        {/* Image background */}
        {hasImageBg && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <img
              src={bgImage}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: `blur(${bgBlur}) brightness(${1 - parseFloat(bgDim)})` }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          </div>
        )}

        {/* Custom HTML background */}
        {hasHtmlBg && (
          <div
            className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
            dangerouslySetInnerHTML={{ __html: bgHtml }}
          />
        )}

        <div className="relative z-10 flex flex-col min-h-screen">
          {settings.sidebar_layout === 'negative' && <SidebarDrawer />}
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8 lg:py-12 pt-28 lg:pt-32 max-w-7xl">
            <Outlet />
          </main>
          <Footer />
          <Customizer />
          <CustomCursor />
          <MusicPlayer />
        </div>
      </div>
    </>
  );
}
