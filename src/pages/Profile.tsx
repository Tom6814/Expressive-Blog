import { useState } from "react";
import { motion } from "motion/react";
import { User, Camera, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { Sidebar } from "../components/Sidebar";

export function Profile() {
  const { user, updateProfile } = useAuth();
  const { settings } = useSettings();
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!user) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <p className="text-xl text-on-surface-variant font-bold">请先登录</p>
      </div>
    );
  }

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateProfile({ nickname, avatar: avatar || undefined, email: email || undefined });
      setMessage("保存成功");
    } catch (err: any) {
      setMessage(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex flex-col ${settings.sidebar_position === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 justify-center`}>
      <div className="flex-grow max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl lg:text-5xl font-display font-black text-on-surface mb-4">
            个人中心
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
          className="bg-surface-container rounded-[var(--radius-md3)] p-8 lg:p-12 shadow-sm border border-outline-variant/10"
        >
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-container"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center ring-4 ring-primary-container">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
              </label>
            </div>
            {avatar && (
              <button
                onClick={() => setAvatar("")}
                className="mt-2 text-xs text-error hover:underline"
              >
                移除头像
              </button>
            )}
          </div>

          {/* Form */}
          <div className="space-y-5 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">用户名</label>
              <input
                type="text"
                value={user.username}
                readOnly
                className="w-full px-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface/50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="输入邮箱"
                className="w-full px-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="输入昵称"
                className="w-full px-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {message && (
              <p className={`text-sm font-bold text-center ${message === "保存成功" ? "text-primary" : "text-error"}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </motion.div>
      </div>

      {settings.sidebar_layout !== 'negative' && <Sidebar />}
    </div>
  );
}
