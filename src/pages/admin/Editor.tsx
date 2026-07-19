import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Image, Tag, Settings, Eye, Edit3, Upload, Pin, Globe, FileEdit, X } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";
import "highlight.js/styles/github-dark.css";

export function AdminEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("published");
  const [sticky, setSticky] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [isPreview, setIsPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getTags()]).then(([c, t]) => {
      setCategories(c);
      setTags(t);
      if (!editId && c.length > 0) setCategoryId(c[0].id);
    });
  }, []);

  // Load existing post by ID
  useEffect(() => {
    if (!editId) return;
    const loadPost = async () => {
      try {
        const post = await api.getPostById(editId);
        setTitle(post.title || "");
        setSlug(post.slug || "");
        setExcerpt(post.excerpt || "");
        setContent(post.content || "");
        setCoverImage(post.coverImage || "");
        setCategoryId(post.categoryId || "");
        setStatus(post.status || "published");
        setSticky(!!post.sticky);
        setSelectedTags((post.tags || []).map((t: any) => t.id));
      } catch {
        toast("加载文章失败", "error");
        navigate("/admin/posts");
      }
    };
    loadPost();
  }, [editId]);

  const handleAutoSlug = () => {
    if (!slug && title) {
      setSlug(title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u4e00-\u9fff-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      setCoverImage(result.url);
      toast("图片上传成功", "success");
    } catch (err: any) {
      toast(err.message || "上传失败", "error");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!title || !slug || !content) {
      toast("标题、Slug 和内容为必填项", "warning");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.updatePost(editId, {
          title, slug, excerpt, content, coverImage, categoryId,
          tagIds: selectedTags, status, sticky: sticky ? 1 : 0,
        });
        toast("文章已更新", "success");
      } else {
        await api.createPost({
          title, slug, excerpt, content, coverImage, categoryId,
          tagIds: selectedTags, status,
        });
        toast(status === "published" ? "文章已发布" : "草稿已保存", "success");
      }
      navigate("/admin/posts");
    } catch (err: any) {
      toast(err.message || "保存失败", "error");
    }
    setSaving(false);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-outline-variant/20 bg-surface/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/admin/posts")}
            className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); handleAutoSlug(); }}
            onBlur={handleAutoSlug}
            placeholder="文章标题..."
            className="text-xl md:text-2xl font-display font-bold bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/50 flex-1 min-w-0"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors text-sm ${isPreview ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-variant text-on-surface'}`}
          >
            {isPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPreview ? "编辑" : "预览"}
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-secondary-container text-on-secondary-container' : 'hover:bg-surface-variant text-on-surface'}`}
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm ml-1 disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : editId ? "更新" : status === "draft" ? "存草稿" : "发布"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 overflow-y-auto p-6 md:p-12 ${isPreview ? 'bg-surface' : 'bg-background'}`}>
          <div className="max-w-4xl mx-auto">
            {isPreview ? (
              <MarkdownRenderer content={content || "*暂无预览内容...*"} />
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="在这里写下你的故事... (支持 Markdown)"
                className="w-full h-full min-h-[600px] bg-transparent border-none outline-none resize-none font-mono text-base md:text-lg leading-relaxed text-on-surface dark:text-on-surface placeholder:text-on-surface-variant/30"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 lg:w-96 border-l border-outline-variant/20 bg-surface-container-lowest p-6 overflow-y-auto shadow-2xl flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> 文章设置
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-surface rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">发布状态</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus("published")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${status === "published" ? 'bg-primary-container text-on-primary-container font-bold' : 'bg-surface border border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant'}`}
                  >
                    <Globe className="w-4 h-4" /> 发布
                  </button>
                  <button
                    onClick={() => setStatus("draft")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${status === "draft" ? 'bg-tertiary-container text-on-tertiary-container font-bold' : 'bg-surface border border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant'}`}
                  >
                    <FileEdit className="w-4 h-4" /> 草稿
                  </button>
                </div>
              </div>

              {/* Sticky */}
              <div>
                <button
                  onClick={() => setSticky(!sticky)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors w-full ${sticky ? 'bg-primary-container/50 text-primary font-bold' : 'bg-surface border border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant'}`}
                >
                  <Pin className={`w-4 h-4 ${sticky ? 'text-primary' : ''}`} />
                  {sticky ? "已置顶" : "设为置顶"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">Slug (URL)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="my-awesome-post"
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">分类</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="">未分类</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">标签</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {tags.map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedTags.includes(t.id) ? 'bg-primary-container text-on-primary-container font-bold' : 'bg-surface border border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
                {tags.length === 0 && <p className="text-xs text-on-surface-variant">暂无标签，请先在分类/标签管理中创建</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">封面图片</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="url"
                    value={coverImage}
                    onChange={e => setCoverImage(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <label className="flex items-center gap-1 px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface-variant text-sm font-medium hover:bg-surface-variant cursor-pointer transition-colors flex-shrink-0">
                    <Upload className="w-4 h-4" />
                    {uploading ? "上传中..." : "上传"}
                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  </label>
                </div>
                {coverImage && (
                  <div className="relative group">
                    <img src={coverImage} alt="Cover Preview" className="w-full h-40 object-cover rounded-xl border border-outline-variant/20" loading="lazy" referrerPolicy="no-referrer" />
                    <button
                      onClick={() => setCoverImage("")}
                      className="absolute top-2 right-2 p-1.5 bg-error text-on-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">摘要</label>
                <textarea
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="文章的简短摘要..."
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none h-32"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
