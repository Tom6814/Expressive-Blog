import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Save, Plus, Trash2, X, Download, Upload, ChevronDown } from "lucide-react";
import { api } from "../../lib/api";
import { SOCIAL_PLATFORMS } from "../../lib/social-icons";
import { PROFILE_ICONS } from "../../lib/profile-icons";
import { Loader } from "../../components/Loader";
import { useSettings } from "../../context/SettingsContext";
import { WIDGET_REGISTRY, DEFAULT_WIDGETS } from "../../components/Sidebar";

const TABS = [
  { id: "site", label: "站点" },
  { id: "profile", label: "个人" },
  { id: "content", label: "内容" },
  { id: "sidebar", label: "侧栏" },
  { id: "appearance", label: "外观" },
  { id: "features", label: "功能" },
  { id: "music", label: "音乐" },
  { id: "webhook", label: "Webhook" },
  { id: "other", label: "其他" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminSettings() {
  const { settings: globalSettings, refreshSettings } = useSettings();
  const [settings, setSettings] = useState<Record<string, string>>(globalSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("site");
  const [menuItems, setMenuItems] = useState<{ label: string; path: string }[]>([]);
  const [profileDetails, setProfileDetails] = useState<{ id: string; icon: string; text: string }[]>([]);
  const [visibleSocials, setVisibleSocials] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [passwords, setPasswords] = useState({ old: "", new: "" });
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [sidebarWidgets, setSidebarWidgets] = useState<string[]>(DEFAULT_WIDGETS);
  const [musicList, setMusicList] = useState<any[]>([]);
  const [uploadingMusic, setUploadingMusic] = useState(false);

  // Webhook state
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<Record<string, any[]>>({});
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any | null>(null);
  const [webhookForm, setWebhookForm] = useState({ name: "", url: "", events: [] as string[], secret: "" });

  const WEBHOOK_EVENTS = [
    { value: "post_created", label: "文章发布" },
    { value: "post_updated", label: "文章更新" },
    { value: "post_deleted", label: "文章删除" },
    { value: "moment_created", label: "动态发布" },
    { value: "moment_deleted", label: "动态删除" },
  ];

  const fetchMusicList = async () => {
    try {
      const list = await api.getMusicList();
      setMusicList(list);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchMusicList(); }, []);
  useEffect(() => { if (activeTab === "webhook") fetchWebhooks(); }, [activeTab]);

  const fetchWebhooks = async () => {
    try {
      const list = await api.getWebhooks();
      setWebhooks(Array.isArray(list) ? list : []);
    } catch { setWebhooks([]); }
  };

  const handleUploadMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMusic(true);
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));
    formData.append("artist", "Unknown");
    try {
      await api.uploadMusic(formData);
      await fetchMusicList();
    } catch (err: any) {
      alert("上传失败：" + err.message);
    }
    setUploadingMusic(false);
    e.target.value = "";
  };

  const handleUpdateMusic = async (id: string, data: any) => {
    await api.updateMusic(id, data);
    await fetchMusicList();
  };

  const handleDeleteMusic = async (id: string) => {
    if (!confirm("确定删除这首音乐？")) return;
    await api.deleteMusic(id);
    await fetchMusicList();
  };

  const handleUploadCover = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("cover", file);
    try {
      await api.uploadMusicCover(id, formData);
      await fetchMusicList();
    } catch (err: any) {
      alert("封面上传失败：" + err.message);
    }
    e.target.value = "";
  };

  const handleChangePassword = async () => {
    try {
      const res = await api.changePassword(passwords.old, passwords.new);
      if (res.success) {
        setPasswordMessage({ text: "密码更新成功", type: "success" });
        setPasswords({ old: "", new: "" });
      } else {
        setPasswordMessage({ text: res.error || "更新失败", type: "error" });
      }
    } catch (e: any) {
      setPasswordMessage({ text: e.message || "更新失败", type: "error" });
    }
  };

  useEffect(() => {
    setSettings(globalSettings);
    try {
      if (globalSettings.custom_menu) setMenuItems(JSON.parse(globalSettings.custom_menu));
      if (globalSettings.profile_details) {
        setProfileDetails(JSON.parse(globalSettings.profile_details));
      } else {
        setProfileDetails([
          { id: "1", icon: "mappin", text: "旧金山, 加利福尼亚" },
          { id: "2", icon: "briefcase", text: "UI/UX 设计师 & 开发者" },
        ]);
      }
    } catch { /* ignore */ }

    setVisibleSocials(SOCIAL_PLATFORMS.filter(p => globalSettings[`social_${p.id}`]).map(p => p.id));

    if (globalSettings.sidebar_widgets) {
      const widgets = globalSettings.sidebar_widgets.split(",").map(s => s.trim()).filter(id => WIDGET_REGISTRY[id]);
      if (widgets.length > 0) setSidebarWidgets(widgets);
    }
  }, [globalSettings]);

  const handleChange = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleMenuChange = (index: number, field: "label" | "path", value: string) => {
    const newMenu = [...menuItems];
    newMenu[index][field] = value;
    setMenuItems(newMenu);
    handleChange("custom_menu", JSON.stringify(newMenu));
  };

  const addMenuItem = () => {
    const newMenu = [...menuItems, { label: "New Item", path: "/" }];
    setMenuItems(newMenu);
    handleChange("custom_menu", JSON.stringify(newMenu));
  };

  const removeMenuItem = (index: number) => {
    const newMenu = menuItems.filter((_, i) => i !== index);
    setMenuItems(newMenu);
    handleChange("custom_menu", JSON.stringify(newMenu));
  };

  const handleProfileDetailChange = (index: number, field: "icon" | "text", value: string) => {
    const newDetails = [...profileDetails];
    newDetails[index][field] = value;
    setProfileDetails(newDetails);
    handleChange("profile_details", JSON.stringify(newDetails));
  };

  const addProfileDetail = () => {
    const newDetails = [...profileDetails, { id: Date.now().toString(), icon: "star", text: "新信息" }];
    setProfileDetails(newDetails);
    handleChange("profile_details", JSON.stringify(newDetails));
  };

  const removeProfileDetail = (index: number) => {
    const newDetails = profileDetails.filter((_, i) => i !== index);
    setProfileDetails(newDetails);
    handleChange("profile_details", JSON.stringify(newDetails));
  };

  const addSocial = () => {
    if (selectedPlatform && !visibleSocials.includes(selectedPlatform)) {
      setVisibleSocials([...visibleSocials, selectedPlatform]);
      setSelectedPlatform("");
    }
  };

  const removeSocial = (id: string) => {
    setVisibleSocials(visibleSocials.filter(s => s !== id));
    handleChange(`social_${id}`, "");
  };

  const toggleWidget = (id: string) => {
    const newWidgets = sidebarWidgets.includes(id) ? sidebarWidgets.filter(w => w !== id) : [...sidebarWidgets, id];
    setSidebarWidgets(newWidgets);
    handleChange("sidebar_widgets", newWidgets.join(","));
  };

  const moveWidgetUp = (index: number) => {
    if (index === 0) return;
    const newWidgets = [...sidebarWidgets];
    [newWidgets[index - 1], newWidgets[index]] = [newWidgets[index], newWidgets[index - 1]];
    setSidebarWidgets(newWidgets);
    handleChange("sidebar_widgets", newWidgets.join(","));
  };

  const moveWidgetDown = (index: number) => {
    if (index === sidebarWidgets.length - 1) return;
    const newWidgets = [...sidebarWidgets];
    [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
    setSidebarWidgets(newWidgets);
    handleChange("sidebar_widgets", newWidgets.join(","));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api.updateSettings(settings);
    await refreshSettings();
    setSaving(false);
    alert("设置保存成功！");
  };

  // Webhook handlers
  const handleSaveWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0) return;
    try {
      if (editingWebhook) {
        await api.updateWebhook(editingWebhook.id, webhookForm);
      } else {
        await api.createWebhook(webhookForm);
      }
      setShowWebhookForm(false);
      setEditingWebhook(null);
      setWebhookForm({ name: "", url: "", events: [], secret: "" });
      fetchWebhooks();
    } catch {}
  };

  const handleToggleWebhook = async (wh: any) => {
    await api.updateWebhook(wh.id, { ...wh, enabled: wh.enabled ? 0 : 1, events: JSON.parse(wh.events || '[]') });
    fetchWebhooks();
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("确定删除此 webhook？")) return;
    await api.deleteWebhook(id);
    fetchWebhooks();
  };

  const handleViewLogs = async (id: string) => {
    try {
      const logs = await api.getWebhookLogs(id);
      setWebhookLogs(prev => ({ ...prev, [id]: Array.isArray(logs) ? logs : [] }));
    } catch { setWebhookLogs(prev => ({ ...prev, [id]: [] })); }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", "tori_settings.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setSettings(imported);
        if (imported.custom_menu) setMenuItems(JSON.parse(imported.custom_menu));
        if (imported.profile_details) setProfileDetails(JSON.parse(imported.profile_details));
        setVisibleSocials(SOCIAL_PLATFORMS.filter(p => imported[`social_${p.id}`]).map(p => p.id));
        alert("配置导入成功，请点击底部保存按钮生效！");
      } catch {
        alert("导入失败：无效的 JSON 文件");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (loading) return <Loader />;

  const availablePlatforms = SOCIAL_PLATFORMS.filter(p => !visibleSocials.includes(p.id));

  // ---------------- Shared form fields ----------------

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
      <span className="w-2 h-6 bg-primary rounded-full shrink-0" />
      {children}
    </h2>
  );

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
  const textareaClass = "w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y font-mono text-sm";
  const selectClass = "w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl md:text-4xl font-display font-black text-on-surface">设置</h1>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-xl text-sm font-bold transition-colors border border-outline-variant/30">
            <Download className="w-4 h-4" /> 导出
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-xl text-sm font-bold transition-colors cursor-pointer border border-outline-variant/30">
            <Upload className="w-4 h-4" /> 导入
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-container-highest p-1 rounded-2xl border border-outline-variant/10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-surface text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.form
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onSubmit={handleSubmit}
        className="bg-surface-container rounded-[var(--radius-md3)] p-4 md:p-8 shadow-sm border border-outline-variant/10 space-y-8"
      >
        {/* ==================== 站点 ==================== */}
        {activeTab === "site" && (
          <>
            <section>
              <SectionTitle>站点信息</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">站点标题</label>
                  <input type="text" value={settings.site_title || ""} onChange={e => handleChange("site_title", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">站点副标题</label>
                  <input type="text" value={settings.site_subtitle || ""} onChange={e => handleChange("site_subtitle", e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">站点图标 URL</label>
                  <input type="url" value={settings.site_icon || ""} onChange={e => handleChange("site_icon", e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">本站网址</label>
                  <input type="url" value={settings.site_url || ""} onChange={e => handleChange("site_url", e.target.value)} placeholder="https://example.com" className={inputClass} />
                  <p className="text-xs text-on-surface-variant/50 mt-1">用于 Webhook、分享链接等场景的根网址</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">侧边栏位置</label>
                  <select value={settings.sidebar_position || "right"} onChange={e => handleChange("sidebar_position", e.target.value)} className={selectClass}>
                    <option value="right">右侧 (默认)</option>
                    <option value="left">左侧</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">信息栏位置</label>
                  <select value={settings.sidebar_layout || "default"} onChange={e => handleChange("sidebar_layout", e.target.value)} className={selectClass}>
                    <option value="default">默认</option>
                    <option value="negative">负一屏 (抽屉)</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle>外观设置</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">默认主题色</label>
                  <select value={settings.default_theme_color || "purple"} onChange={e => handleChange("default_theme_color", e.target.value)} className={selectClass}>
                    <option value="blue">蓝色</option>
                    <option value="green">绿色</option>
                    <option value="purple">紫色</option>
                    <option value="orange">橙色</option>
                    <option value="rose">玫瑰色</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">默认暗色模式</label>
                  <select value={settings.default_dark_mode || "light"} onChange={e => handleChange("default_dark_mode", e.target.value)} className={selectClass}>
                    <option value="light">亮色</option>
                    <option value="dark">暗色</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">默认圆角</label>
                  <select value={settings.default_border_radius || "3xl"} onChange={e => handleChange("default_border_radius", e.target.value)} className={selectClass}>
                    <option value="sm">小</option><option value="md">中</option><option value="lg">大</option>
                    <option value="xl">特大</option><option value="2xl">2xl</option>
                    <option value="3xl">3xl</option><option value="full">全圆</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">允许用户更改</label>
                  <select value={settings.allow_user_override || "true"} onChange={e => handleChange("allow_user_override", e.target.value)} className={selectClass}>
                    <option value="true">是</option><option value="false">否</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">首页卡片布局</label>
                  <select value={settings.home_card_layout || "default"} onChange={e => handleChange("home_card_layout", e.target.value)} className={selectClass}>
                    <option value="default">默认</option>
                    <option value="avatar-left">头像在左侧</option>
                  </select>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ==================== 个人 ==================== */}
        {activeTab === "profile" && (
          <>
            <section>
              <SectionTitle>个人资料</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">作者姓名</label><input type="text" value={settings.author_name || ""} onChange={e => handleChange("author_name", e.target.value)} className={inputClass} /></div>
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">头像 URL</label><input type="url" value={settings.author_avatar || ""} onChange={e => handleChange("author_avatar", e.target.value)} className={inputClass} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-on-surface-variant mb-2">头衔</label><input type="text" value={settings.author_title || ""} onChange={e => handleChange("author_title", e.target.value)} className={inputClass} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-on-surface-variant mb-2">简介</label><textarea value={settings.author_bio || ""} onChange={e => handleChange("author_bio", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none h-24" /></div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-bold text-on-surface mb-4">详细个人信息 (侧边栏)</h3>
                <div className="space-y-3">
                  {profileDetails.map((detail, index) => (
                    <div key={detail.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-surface p-4 rounded-xl border border-outline-variant/10">
                      <select value={detail.icon} onChange={e => handleProfileDetailChange(index, "icon", e.target.value)} className="w-full md:w-48 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none">
                        {PROFILE_ICONS.map(icon => (<option key={icon.id} value={icon.id}>{icon.name}</option>))}
                      </select>
                      <input type="text" value={detail.text} onChange={e => handleProfileDetailChange(index, "text", e.target.value)} className="flex-1 w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                      <button type="button" onClick={() => removeProfileDetail(index)} className="p-3 text-error hover:bg-error-container rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={addProfileDetail} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary hover:text-on-secondary transition-colors"><Plus className="w-5 h-5" /> 添加个人信息</button>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle>社交链接</SectionTitle>
              <div className="space-y-3 mb-4">
                {visibleSocials.map(id => {
                  const platform = SOCIAL_PLATFORMS.find(p => p.id === id);
                  if (!platform) return null;
                  const Icon = platform.icon;
                  return (
                    <div key={id} className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-outline-variant/10">
                      <div className="p-2 rounded-full bg-surface-container-high text-on-surface"><Icon className="w-6 h-6" style={{ color: platform.color }} /></div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-on-surface-variant mb-1">{platform.name}</label>
                        <input type="url" value={settings[`social_${id}`] || ""} onChange={e => handleChange(`social_${id}`, e.target.value)} className="w-full px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                      </div>
                      <button type="button" onClick={() => removeSocial(id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none">
                  <option value="">选择平台...</option>
                  {availablePlatforms.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
                <button type="button" onClick={addSocial} disabled={!selectedPlatform} className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary hover:text-on-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-5 h-5" /> 添加</button>
              </div>
            </section>
          </>
        )}

        {/* ==================== 内容 ==================== */}
        {activeTab === "content" && (
          <>
            <section>
              <SectionTitle>Hero 专区</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">Hero 布局</label>
                  <select value={settings.hero_layout || "default"} onChange={e => handleChange("hero_layout", e.target.value)} className={selectClass}>
                    <option value="default">居中 (默认)</option>
                    <option value="row">横向排列</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">头像框样式</label>
                  <select value={settings.avatar_frame_style || "gradient"} onChange={e => handleChange("avatar_frame_style", e.target.value)} className={selectClass}>
                    <option value="gradient">渐变边框</option>
                    <option value="solid">纯色边框</option>
                    <option value="dual">双色渐变</option>
                    <option value="rainbow">彩虹渐变</option>
                    <option value="glow">发光光圈</option>
                    <option value="ring">线性环圈</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">头像缩放 ({settings.hero_avatar_scale || "1.0"}x)</label>
                  <input type="range" min="0.8" max="1.5" step="0.05" value={settings.hero_avatar_scale || "1.0"} onChange={e => handleChange("hero_avatar_scale", e.target.value)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">Hero 背景透明度 ({Math.round(parseFloat(settings.hero_bg_opacity || "1") * 100)}%)</label>
                  <input type="range" min="0.2" max="1" step="0.05" value={settings.hero_bg_opacity || "1"} onChange={e => handleChange("hero_bg_opacity", e.target.value)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">自定义 Hero HTML (覆盖默认)</label>
                <textarea value={settings.hero_custom_html || ""} onChange={e => handleChange("hero_custom_html", e.target.value)} placeholder="留空使用默认 Hero。" className={`${textareaClass} h-32`} />
              </div>
            </section>

            <section>
              <SectionTitle>文章设置</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">显示作者信息卡片</label>
                  <select value={settings.show_author_bio || "true"} onChange={e => handleChange("show_author_bio", e.target.value)} className={selectClass}>
                    <option value="true">显示</option><option value="false">隐藏</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">显示相关文章</label>
                  <select value={settings.show_related_posts || "true"} onChange={e => handleChange("show_related_posts", e.target.value)} className={selectClass}>
                    <option value="true">显示</option><option value="false">隐藏</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">文章卡片悬停样式</label>
                  <select value={settings.post_card_style || "default"} onChange={e => handleChange("post_card_style", e.target.value)} className={selectClass}>
                    <option value="default">默认阴影</option>
                    <option value="glow">YouTube 扩散发光</option>
                    <option value="modern">Modern 大封面</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">扩散范围 ({settings.post_card_glow_range || "120"}px)</label>
                  <input type="range" min="8" max="400" step="4" value={settings.post_card_glow_range || "120"} onChange={e => handleChange("post_card_glow_range", e.target.value)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">扩散透明度 ({settings.post_card_glow_opacity || "40"}%)</label>
                  <input type="range" min="5" max="80" step="5" value={settings.post_card_glow_opacity || "40"} onChange={e => handleChange("post_card_glow_opacity", e.target.value)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
              </div>
            </section>
          </>
        )}

        {/* ==================== 侧栏 ==================== */}
        {activeTab === "sidebar" && (
          <>
            <section>
              <SectionTitle>侧栏组件管理</SectionTitle>
              <p className="text-sm text-on-surface-variant mb-4">拖拽排序，勾选启用。上方组件在侧栏中显示更靠前。</p>
              <div className="space-y-3 mb-6">
                {sidebarWidgets.map((id, index) => {
                  const widget = WIDGET_REGISTRY[id];
                  if (!widget) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-outline-variant/10">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold">{index + 1}</span>
                      <div className="flex-1 min-w-0"><div className="font-bold text-on-surface text-sm">{widget.label}</div><div className="text-xs text-on-surface-variant">{widget.description}</div></div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveWidgetUp(index)} disabled={index === 0} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="上移">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button type="button" onClick={() => moveWidgetDown(index)} disabled={index === sidebarWidgets.length - 1} className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="下移">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button type="button" onClick={() => toggleWidget(id)} className="p-2 rounded-lg hover:bg-error-container text-error hover:text-on-error-container transition-colors ml-1" title="移除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {Object.entries(WIDGET_REGISTRY).some(([id]) => !sidebarWidgets.includes(id)) && (
                <div>
                  <h3 className="text-sm font-bold text-on-surface-variant mb-3">可添加</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(WIDGET_REGISTRY).map(([id, widget]) => sidebarWidgets.includes(id) ? null : (
                      <button key={id} type="button" onClick={() => toggleWidget(id)} className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-secondary-container text-on-surface hover:text-on-secondary-container rounded-full text-sm font-medium transition-colors border border-outline-variant/10"><Plus className="w-4 h-4" />{widget.label}</button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section>
              <SectionTitle>侧栏自定义 HTML</SectionTitle>
              <p className="text-sm text-on-surface-variant mb-4">广告位、嵌入式内容等。需先在上方启用「自定义HTML」组件。</p>
              <textarea value={settings.sidebar_custom_html || ""} onChange={e => handleChange("sidebar_custom_html", e.target.value)} placeholder='<script async src="..."></script>' className={`${textareaClass} h-48`} />
            </section>
          </>
        )}

        {/* ==================== 外观 ==================== */}
        {activeTab === "appearance" && (
          <>
            <section>
              <SectionTitle>全局背景</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">背景类型</label>
                  <select value={settings.global_bg_type || "image"} onChange={e => handleChange("global_bg_type", e.target.value)} className={selectClass}>
                    <option value="image">背景图片</option>
                    <option value="html">自定义 HTML</option>
                  </select>
                </div>
              </div>
              {settings.global_bg_type !== "html" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-3"><label className="block text-sm font-bold text-on-surface-variant mb-2">背景图片 URL</label><input type="url" value={settings.global_bg_image || ""} onChange={e => handleChange("global_bg_image", e.target.value)} placeholder="留空使用纯色背景" className={inputClass} /></div>
                  <div><label className="block text-sm font-bold text-on-surface-variant mb-2">模糊 ({settings.global_bg_blur || "0px"})</label><input type="range" min="0" max="50" step="1" value={(settings.global_bg_blur || "0").replace("px", "")} onChange={e => handleChange("global_bg_blur", `${e.target.value}px`)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" /></div>
                  <div><label className="block text-sm font-bold text-on-surface-variant mb-2">变暗 ({settings.global_bg_dim || "0"})</label><input type="range" step="0.05" min="0" max="1" value={settings.global_bg_dim || "0"} onChange={e => handleChange("global_bg_dim", e.target.value)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" /></div>
                </div>
              )}
              {settings.global_bg_type === "html" && (
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">自定义背景 HTML</label>
                  <p className="text-xs text-on-surface-variant/70 mb-3">支持 CSS 动画、Canvas、SVG 等。</p>
                  <textarea value={settings.global_bg_html || ""} onChange={e => handleChange("global_bg_html", e.target.value)} placeholder="<canvas id='bg'></canvas>" className={`${textareaClass} h-48`} />
                </div>
              )}
            </section>

            <section>
              <SectionTitle>光标设置</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">自定义颜文字光标</label><select value={settings.enable_custom_cursor || "false"} onChange={e => handleChange("enable_custom_cursor", e.target.value)} className={selectClass}><option value="true">启用</option><option value="false">停用</option></select></div>
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">光标样式</label><select value={settings.cursor_style || "dot"} onChange={e => handleChange("cursor_style", e.target.value)} className={selectClass}><option value="dot">圆点 + 颜文字</option><option value="emoji">纯颜文字居中</option></select></div>
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">大小 ({settings.cursor_size || "100"}%)</label><input type="range" min="50" max="200" step="5" value={settings.cursor_size || "100"} onChange={e => handleChange("cursor_size", e.target.value)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" /></div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">缓动 ({settings.cursor_spring || "50"}%)</label>
                  <div className="flex justify-between text-xs text-on-surface-variant mb-1"><span>跟手</span><span>弹性</span></div>
                  <input type="range" min="0" max="100" step="1" value={settings.cursor_spring || "50"} onChange={e => handleChange("cursor_spring", e.target.value)} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">默认颜文字</label><input type="text" value={settings.cursor_text || "(❁´◡`❁)"} onChange={e => handleChange("cursor_text", e.target.value)} className={inputClass} /></div>
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">悬停颜文字</label><input type="text" value={settings.cursor_hover_text || "(✧◡✧)"} onChange={e => handleChange("cursor_hover_text", e.target.value)} className={inputClass} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-bold text-on-surface-variant mb-2">点击颜文字</label><input type="text" value={settings.cursor_click_text || "(≧∇≦)ﾉ"} onChange={e => handleChange("cursor_click_text", e.target.value)} className={inputClass} /></div>
              </div>
            </section>

            <section>
              <SectionTitle>自定义 CSS</SectionTitle>
              <p className="text-sm text-on-surface-variant mb-4">注入到每个页面的 &lt;style&gt; 标签中。</p>
              <textarea value={settings.custom_css || ""} onChange={e => handleChange("custom_css", e.target.value)} placeholder="body { font-family: 'Inter'; }" className={`${textareaClass} h-48`} />
            </section>

            <section>
              <SectionTitle>底栏设置</SectionTitle>
              <div className="grid grid-cols-1 gap-6">
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">底栏文字 (支持 HTML)</label><textarea value={settings.footer_text || ""} onChange={e => handleChange("footer_text", e.target.value)} className={`${textareaClass} h-24`} /></div>
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">版权信息 (支持 HTML)</label><textarea value={settings.footer_copyright || ""} onChange={e => handleChange("footer_copyright", e.target.value)} placeholder="&copy; {year} {site_title}" className={`${textareaClass} h-24`} /></div>
              </div>
            </section>
          </>
        )}

        {/* ==================== 音乐 ==================== */}
        {activeTab === "music" && (
          <>
            <section>
              <SectionTitle>音乐播放器</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">启用音乐播放器</label>
                  <select value={settings.music_player_enabled || "false"} onChange={e => handleChange("music_player_enabled", e.target.value)} className={selectClass}>
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">音乐来源</label>
                  <select value={settings.music_player_source || "local"} onChange={e => handleChange("music_player_source", e.target.value)} className={selectClass}>
                    <option value="local">内置（上传音频）</option>
                    <option value="netease">网易云歌单</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">卡片透明度 ({Math.round(parseFloat(settings.music_player_opacity || "1") * 100)}%)</label>
                  <input type="range" min="20" max="100" step="5" value={String(Math.round(parseFloat(settings.music_player_opacity || "1") * 100))} onChange={e => handleChange("music_player_opacity", String(parseInt(e.target.value) / 100))} className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary mt-2" />
                </div>
                {settings.music_player_source === "netease" && (
                  <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-on-surface-variant mb-2">网易云歌单 ID</label>
                    <input type="text" value={settings.music_player_netease_id || ""} onChange={e => handleChange("music_player_netease_id", e.target.value)} placeholder="例如: 123456789 (从歌单URL中获取)" className={inputClass} />
                    <p className="text-xs text-on-surface-variant/70 mt-2">打开网易云歌单，复制 URL 中的 playlist?id= 后面的数字。</p>
                  </div>
                )}
              </div>
            </section>

            {settings.music_player_source !== "netease" && (
              <section>
                <SectionTitle>管理音乐列表</SectionTitle>
                <p className="text-sm text-on-surface-variant mb-4">上传本地音频文件并配置歌曲信息。</p>

                {/* Upload */}
                <label className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors cursor-pointer mb-6 ${uploadingMusic ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadingMusic ? "上传中..." : <><Plus className="w-5 h-5" /> 上传音乐</>}
                  <input type="file" accept="audio/*" onChange={handleUploadMusic} className="hidden" disabled={uploadingMusic} />
                </label>

                {/* Music list */}
                <div className="space-y-3">
                  {musicList.length === 0 && <p className="text-center text-sm text-on-surface-variant py-8">暂无音乐，点击上方按钮上传。</p>}
                  {musicList.map((song, index) => (
                    <div key={song.id} className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-outline-variant/10">
                      {/* Cover */}
                      <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant/10 overflow-hidden flex-shrink-0 relative group">
                        {song.cover ? (
                          <img src={song.cover} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">?</div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                          <span className="text-white text-xs font-bold">换封面</span>
                          <input type="file" accept="image/*" onChange={e => handleUploadCover(song.id, e)} className="hidden" />
                        </label>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2">
                        <input
                          type="text"
                          value={song.title}
                          onChange={e => handleUpdateMusic(song.id, { title: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          placeholder="歌曲名"
                        />
                        <input
                          type="text"
                          value={song.artist}
                          onChange={e => handleUpdateMusic(song.id, { artist: e.target.value })}
                          className="w-full md:w-40 px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          placeholder="艺术家"
                        />
                      </div>

                      {/* Sort */}
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleUpdateMusic(song.id, { sortOrder: (musicList[index - 1]?.sortOrder ?? 0) - 1 })} disabled={index === 0} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 transition-colors" title="上移">
                          <ChevronDown className="w-4 h-4 rotate-180" />
                        </button>
                        <button type="button" onClick={() => handleDeleteMusic(song.id)} className="p-1.5 rounded-lg hover:bg-error-container text-error transition-colors ml-1" title="删除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ==================== 功能 ==================== */}
        {activeTab === "features" && (
          <>
            <section>
              <SectionTitle>评论系统</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-2">选择评论系统</label>
                  <select value={settings.comment_system || "internal"} onChange={e => handleChange("comment_system", e.target.value)} className={selectClass}>
                    <option value="internal">内置评论</option>
                    <option value="twikoo">Twikoo</option>
                    <option value="github">GitHub (Utterances)</option>
                  </select>
                </div>
                {settings.comment_system === "twikoo" && <div><label className="block text-sm font-bold text-on-surface-variant mb-2">Twikoo envId</label><input type="text" value={settings.twikoo_env_id || ""} onChange={e => handleChange("twikoo_env_id", e.target.value)} className={inputClass} /></div>}
                {settings.comment_system === "github" && <div><label className="block text-sm font-bold text-on-surface-variant mb-2">GitHub 仓库</label><input type="text" value={settings.github_repo || ""} onChange={e => handleChange("github_repo", e.target.value)} placeholder="username/repo" className={inputClass} /></div>}
              </div>
            </section>

            <section>
              <SectionTitle>账号系统</SectionTitle>
              <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-outline-variant/10">
                <div>
                  <span className="text-sm font-bold text-on-surface">启用账号系统</span>
                  <p className="text-xs text-on-surface-variant/50 mt-1">关闭后评论将使用昵称+邮箱模式，并隐藏顶栏用户按钮</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.account_system !== "disabled"} onChange={e => handleChange("account_system", e.target.checked ? "enabled" : "disabled")} className="sr-only peer" />
                  <div className="w-11 h-6 bg-surface-variant rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </section>

            <section>
              <SectionTitle>导航菜单</SectionTitle>
              <div className="space-y-3">
                {menuItems.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-surface p-4 rounded-xl border border-outline-variant/10">
                    <input type="text" value={item.label} onChange={e => handleMenuChange(index, "label", e.target.value)} placeholder="标签" className="flex-1 w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                    <input type="text" value={item.path} onChange={e => handleMenuChange(index, "path", e.target.value)} placeholder="路径 (如 /about)" className="flex-1 w-full px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                    <button type="button" onClick={() => removeMenuItem(index)} className="p-3 text-error hover:bg-error-container rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
                <button type="button" onClick={addMenuItem} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary hover:text-on-secondary transition-colors"><Plus className="w-5 h-5" /> 添加菜单项</button>
              </div>
            </section>
          </>
        )}

        {/* ==================== 其他 ==================== */}
        {activeTab === "other" && (
          <>
            {/* Export / Import */}
            <section>
              <SectionTitle>数据备份与恢复</SectionTitle>
              <p className="text-sm text-on-surface-variant/60 mb-4">
                导出站点全量数据（设置、文章、动态、分类、标签、评论等），支持 ZIP 格式导入恢复。
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('admin_token');
                      const res = await fetch('/api/export', {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({ error: '导出失败' }));
                        alert(err.error || '导出失败');
                        return;
                      }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `expressive-backup-${new Date().toISOString().slice(0, 10)}.zip`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err: any) {
                      alert('导出失败: ' + err.message);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  导出全量数据
                </button>
                <label className="flex items-center gap-2 px-5 py-3 bg-surface-container border border-outline-variant/20 text-on-surface rounded-xl font-bold hover:bg-surface-variant transition-colors cursor-pointer">
                  <Upload className="w-5 h-5" />
                  导入 ZIP 恢复
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!confirm('导入将替换当前所有数据（设置、文章、动态、分类、标签、评论），不可撤销。确定继续？')) return;
                      try {
                        const token = localStorage.getItem('auth_token');
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await fetch('/api/import', {
                          method: 'POST',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                          body: formData,
                        });
                        const data = await res.json();
                        if (res.ok) {
                          alert('导入成功！页面将刷新以应用更改。');
                          window.location.reload();
                        } else {
                          alert('导入失败: ' + (data.error || '未知错误'));
                        }
                      } catch (err: any) {
                        alert('导入失败: ' + err.message);
                      }
                    }}
                  />
                </label>
              </div>
            </section>

            <section>
              <SectionTitle>关于页面内容</SectionTitle>
              <label className="block text-sm font-bold text-on-surface-variant mb-2">内容 (支持 Markdown)</label>
              <textarea value={settings.about_content || ""} onChange={e => handleChange("about_content", e.target.value)} placeholder="# 你好，世界！" className={`${textareaClass} h-96`} />
            </section>

            <section>
              <SectionTitle>安全设置</SectionTitle>
              <div className="space-y-4 max-w-md">
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">原密码</label><input type="password" value={passwords.old} onChange={e => setPasswords({ ...passwords, old: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm font-bold text-on-surface-variant mb-2">新密码</label><input type="password" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} className={inputClass} /></div>
                {passwordMessage.text && (<p className={`text-sm font-bold ${passwordMessage.type === "error" ? "text-error" : "text-primary"}`}>{passwordMessage.text}</p>)}
                <button type="button" onClick={handleChangePassword} disabled={!passwords.old || !passwords.new} className="px-6 py-3 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:bg-secondary hover:text-on-secondary transition-colors disabled:opacity-50">更新密码</button>
              </div>
            </section>
          </>
        )}

        {activeTab === "webhook" && (
          <>
            <section>
              <div className="flex items-center justify-between mb-6">
                <SectionTitle>Webhook 管理</SectionTitle>
                <button type="button" onClick={() => { setEditingWebhook(null); setWebhookForm({ name: "", url: "", events: [], secret: "" }); setShowWebhookForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> 添加 Webhook
                </button>
              </div>

              {/* Memos Integration */}
              <div className="mb-6 p-5 bg-tertiary-container/30 rounded-2xl border border-tertiary/20">
                <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="text-2xl">📝</span> Memos 同步
                </h3>
                <p className="text-sm text-on-surface-variant/70 mb-4">
                  接收 Memos 的 webhook，自动将 Memo 同步为网站动态。
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-on-surface">启用 Memos 同步</span>
                      <p className="text-xs text-on-surface-variant/50">开启后接收 Memos 发来的 webhook 并自动创建动态</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.memos_webhook_enabled === "1"} onChange={e => handleChange("memos_webhook_enabled", e.target.checked ? "1" : "0")} className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface-variant rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                  {settings.memos_webhook_enabled === "1" && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-on-surface-variant mb-1">Webhook 端点 (填入 Memos 设置)</label>
                        <code className="text-xs bg-surface p-2 rounded-lg text-primary block break-all select-all">
                          {settings.site_url || (typeof window !== 'undefined' ? window.location.origin : '')}/api/webhooks/memos
                        </code>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-on-surface-variant mb-1">限定 Memos 用户 ID</label>
                        <input type="text" value={settings.memos_user_filter || ""} onChange={e => handleChange("memos_user_filter", e.target.value)} placeholder="可选，逗号分隔多个 ID，例如: 1,2,3" className={inputClass} />
                        <p className="text-xs text-on-surface-variant/40 mt-1">留空则接收所有用户的 Memo。可在 Memos 用户设置中找到 creatorId。</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mb-6 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <p className="text-sm font-bold text-on-surface mb-2">接收 Webhook 端点</p>
                <code className="text-xs bg-surface p-2 rounded-lg text-primary block break-all">POST /api/webhooks/incoming?event=create_post</code>
                <p className="text-xs text-on-surface-variant/50 mt-2">支持: create_post、create_moment。外部系统可发送 POST 到此端点创建文章或动态。</p>
              </div>
              {showWebhookForm && (
                <div className="mb-6 p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                  <h3 className="text-lg font-bold text-on-surface mb-4">{editingWebhook ? "编辑 Webhook" : "新建 Webhook"}</h3>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-on-surface-variant mb-1">名称</label><input type="text" value={webhookForm.name} onChange={e => setWebhookForm(f => ({ ...f, name: e.target.value }))} placeholder="例如: 通知到 Telegram" className={inputClass} /></div>
                    <div><label className="block text-sm font-bold text-on-surface-variant mb-1">URL</label><input type="url" value={webhookForm.url} onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com/webhook" className={inputClass} /></div>
                    <div><label className="block text-sm font-bold text-on-surface-variant mb-1">密钥 (可选)</label><input type="text" value={webhookForm.secret} onChange={e => setWebhookForm(f => ({ ...f, secret: e.target.value }))} placeholder="用于验证请求来源" className={inputClass} /></div>
                    <div>
                      <label className="block text-sm font-bold text-on-surface-variant mb-2">触发事件</label>
                      <div className="flex flex-wrap gap-2">
                        {WEBHOOK_EVENTS.map(ev => (
                          <button key={ev.value} type="button" onClick={() => setWebhookForm(f => ({ ...f, events: f.events.includes(ev.value) ? f.events.filter(e => e !== ev.value) : [...f.events, ev.value] }))} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${webhookForm.events.includes(ev.value) ? "bg-primary text-on-primary" : "bg-surface text-on-surface-variant hover:bg-surface-variant"}`}>
                            {ev.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={handleSaveWebhook} className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors">{editingWebhook ? "更新" : "创建"}</button>
                      <button onClick={() => { setShowWebhookForm(false); setEditingWebhook(null); }} className="px-6 py-2.5 bg-surface text-on-surface rounded-xl font-bold hover:bg-surface-variant transition-colors">取消</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {webhooks.length === 0 ? (
                  <div className="text-center py-12 text-sm text-on-surface-variant/50">暂无 webhook，点击上方按钮创建</div>
                ) : (
                  webhooks.map((wh: any) => {
                    const evts = (() => { try { return JSON.parse(wh.events || '[]'); } catch { return []; } })();
                    return (
                      <div key={wh.id} className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-on-surface">{wh.name}</h4>
                            <span className={`w-2 h-2 rounded-full ${wh.enabled ? (wh.lastStatus === 'failed' ? 'bg-yellow-400' : 'bg-green-400') : 'bg-outline-variant'}`} />
                            <span className="text-xs text-on-surface-variant/50">{wh.enabled ? (wh.lastStatus === 'failed' ? '最近失败' : '运行中') : '已停用'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleWebhook(wh)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${wh.enabled ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}> {wh.enabled ? "停用" : "启用"} </button>
                            <button onClick={() => { setEditingWebhook(wh); setWebhookForm({ name: wh.name, url: wh.url, events: evts, secret: wh.secret || "" }); setShowWebhookForm(true); }} className="px-3 py-1.5 text-xs font-bold bg-primary-container text-on-primary-container rounded-lg hover:bg-primary hover:text-on-primary transition-colors">编辑</button>
                            <button onClick={() => handleDeleteWebhook(wh.id)} className="px-3 py-1.5 text-xs font-bold bg-error-container text-on-error-container rounded-lg hover:bg-error hover:text-on-error transition-colors">删除</button>
                          </div>
                        </div>
                        <p className="text-xs text-on-surface-variant/60 truncate mb-3">{wh.url}</p>
                        <div className="flex items-center gap-2 mb-3">
                          {evts.map((ev: string) => (<span key={ev} className="px-2 py-0.5 text-[10px] font-bold bg-surface text-on-surface-variant/60 rounded-full">{WEBHOOK_EVENTS.find(e => e.value === ev)?.label || ev}</span>))}
                        </div>
                        <button onClick={() => handleViewLogs(wh.id)} className="text-xs text-primary font-bold hover:underline">查看日志 {wh.logCount > 0 ? `(${wh.logCount})` : ''}</button>
                        {(webhookLogs[wh.id] || []).length > 0 && (
                          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto bg-surface rounded-xl p-3">
                            {(webhookLogs[wh.id] || []).map((log: any) => (
                              <div key={log.id} className="flex items-center gap-2 text-[11px]">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                                <span className="text-on-surface-variant/50 shrink-0">{new Date(log.date).toLocaleString()}</span>
                                <span className="font-bold text-on-surface-variant/60 shrink-0">{log.event}</span>
                                <span className="truncate text-on-surface-variant/40">{log.response}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t border-outline-variant/20">
          <button type="submit" disabled={saving} className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
            <Save className="w-5 h-5" />
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
