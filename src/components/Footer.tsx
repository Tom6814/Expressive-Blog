import { useSettings } from "../context/SettingsContext";

export function Footer() {
  const { settings } = useSettings();

  const currentYear = new Date().getFullYear().toString();
  const siteTitle = settings.site_title || "Expressive Theme";

  const defaultFooterText = `由 <svg class="w-4 h-4 text-error fill-error inline-block mx-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> 驱动，使用 React & Tailwind 构建`;

  const footerText = settings.footer_text || defaultFooterText;
  const footerCopyright = (settings.footer_copyright || `&copy; {year} {site_title}. 保留所有权利。`)
    .replace('{year}', currentYear)
    .replace('{site_title}', siteTitle);

  return (
    <footer className="mt-24 py-10 bg-surface-container-highest/80 border-t border-outline-variant/10 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div
            className="text-sm text-on-surface-variant/80 font-medium flex items-center gap-1.5"
            dangerouslySetInnerHTML={{ __html: footerText }}
          />
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-outline-variant hidden md:block" />
            <div
              className="text-xs text-on-surface-variant/50"
              dangerouslySetInnerHTML={{ __html: footerCopyright }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
