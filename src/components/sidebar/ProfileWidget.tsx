import { SOCIAL_PLATFORMS } from "../../lib/social-icons";
import { getProfileIcon } from "../../lib/profile-icons";
import { useSettings } from "../../context/SettingsContext";

export function ProfileWidget() {
  const { settings } = useSettings();

  let profileDetails: { id: string; icon: string; text: string }[] = [];
  try {
    if (settings.profile_details) {
      profileDetails = JSON.parse(settings.profile_details);
    }
  } catch { /* use default empty */ }
  if (profileDetails.length === 0) {
    profileDetails = [
      { id: "1", icon: "mappin", text: "旧金山, 加利福尼亚" },
      { id: "2", icon: "briefcase", text: "UI/UX 设计师 & 开发者" },
    ];
  }

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <div className="flex flex-col items-center text-center">
        <img
          src={settings.author_avatar || "https://picsum.photos/seed/avatar/200/200"}
          alt={settings.author_name || "Author"}
          className="w-24 h-24 rounded-full mb-4 ring-4 ring-primary-container object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <h2 className="text-xl font-bold text-on-surface mb-2">{settings.author_name || "Expressive Blogger"}</h2>
        <p className="text-sm text-on-surface-variant mb-4">{settings.author_bio || "Exploring the boundaries of Material Design 3 Expressive."}</p>

        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          {SOCIAL_PLATFORMS.filter(p => settings[`social_${p.id}`]).map(platform => {
            const Icon = platform.icon;
            const href = platform.id === 'email' ? `mailto:${settings['social_' + platform.id]}` : settings['social_' + platform.id];
            return (
              <a
                key={platform.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-surface hover:bg-primary-container text-on-surface hover:text-primary transition-colors"
                title={platform.name}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>

        <div className="w-full space-y-2 text-sm text-on-surface-variant">
          {profileDetails.map(detail => {
            const Icon = getProfileIcon(detail.icon);
            return (
              <div key={detail.id} className="flex items-center gap-2 justify-center">
                <Icon className="w-4 h-4" />
                <span>{detail.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
