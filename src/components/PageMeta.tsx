import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

/**
 * Sets HTML <title> and <link rel="icon"> based on settings.
 * Post pages override title via Post.tsx — this respects those overrides
 * by only resetting the title when leaving a post page.
 */
export function PageMeta() {
  const { settings } = useSettings();
  const location = useLocation();

  const pageTitle = settings.page_title || settings.site_title || "Expressive Blog";
  const isPostPage = location.pathname.startsWith("/post/");

  useEffect(() => {
    if (!isPostPage) {
      document.title = pageTitle;
    }
  }, [pageTitle, isPostPage]);

  useEffect(() => {
    const favicon = settings.page_favicon;
    if (!favicon) return;
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    document.head.appendChild(link);
  }, [settings.page_favicon]);

  return null;
}
