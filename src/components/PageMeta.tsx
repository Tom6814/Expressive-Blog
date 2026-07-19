import { useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import { useLocation } from "react-router-dom";

/**
 * Dynamically sets the HTML <title> and <link rel="icon"> based on settings.
 * Post pages override the title with the post title.
 */
export function PageMeta() {
  const { settings } = useSettings();
  const location = useLocation();

  const pageTitle = settings.page_title || settings.site_title || "Expressive Blog";

  useEffect(() => {
    // Only set title on non-post pages (Post.tsx sets its own title)
    if (!location.pathname.startsWith("/post/")) {
      document.title = pageTitle;
    }
  }, [pageTitle, location.pathname]);

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
