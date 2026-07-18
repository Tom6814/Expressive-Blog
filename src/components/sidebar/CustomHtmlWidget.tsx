import { useSettings } from "../../context/SettingsContext";

export function CustomHtmlWidget() {
  const { settings } = useSettings();
  const html = settings.sidebar_custom_html;

  if (!html?.trim()) return null;

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10 overflow-hidden">
      <div
        className="[&>img]:max-w-full [&>img]:rounded-lg [&>iframe]:max-w-full [&>iframe]:rounded-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
