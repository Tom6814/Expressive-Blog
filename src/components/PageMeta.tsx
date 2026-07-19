import { useEffect } from "react";
import { useSettings } from "../context/SettingsContext";

/**
 * Dynamically sets the HTML <title> and <link rel="icon"> based on settings.
 * Post pages override the title with the post title (set by Post.tsx).
 */
export function PageMeta() {
  const { settings } = useSettings();

  const pageTitle = settings.page_title || settings.site_title || "Expressive Blog";

  useEffect(() => {
    if (!window.location.pathname.startsWith("/post/")) {
      document.title = pageTitle;
    }
  }, [pageTitle]);

  useEffect(() => {
    const favicon = settings.page_favicon;
    if (!favicon) return;

    // Remove existing favicon links
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove());

    const link = document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    document.head.appendChild(link);
  }, [settings.page_favicon]);

  return null;
}
