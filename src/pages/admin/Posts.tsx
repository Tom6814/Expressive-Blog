import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, RefreshCw, Pin, PinOff, Eye, EyeOff, Download, Upload, FileText, X } from "lucide-react";
import { api } from "../../lib/api";
import { format } from "date-fns";
import { Loader } from "../../components/Loader";
import { useToast } from "../../components/Toast";

export function AdminPosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 15;

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) setStatusFilter(statusParam);
  }, [searchParams]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPosts({ page, limit, search, status: statusFilter !== "all" ? statusFilter : "all" });
      setPosts(res.data || []);
      setTotal(res.total || 0);
    } catch {
      toast("加载文章失败", "error");
    }
    setLoading(false);
  }, [page, search, statusFilter, toast]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这篇文章吗？此操作不可恢复。")) return;
    try {
      await api.deletePost(id);
      toast("文章已删除", "success");
      fetchPosts();
    } catch {
      toast("删除失败", "error");
    }
  };

  const handleExport = async (id: string) => {
    try {
      const res = await api.exportPost(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `post-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("文章已导出", "success");
    } catch {
      toast("导出失败", "error");
    }
  };

  const handleImport = async () => {
    try {
      const data = JSON.parse(importJson);
      const posts = Array.isArray(data) ? data : [data];
      setImporting(true);
      const res = await api.importPosts(posts);
      toast(`成功导入 ${res.imported} 篇文章`, "success");
      setShowImport(false);
      setImportJson("");
      fetchPosts();
    } catch (e: any) {
      toast("导入失败: " + (e.message || "JSON 格式错误"), "error");
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 篇文章吗？此操作不可恢复。`)) return;
    try {
      await api.bulkPosts([...selected], "delete");
      toast(`已删除 ${selected.size} 篇文章`, "success");
      setSelected(new Set());
      fetchPosts();
    } catch {
      toast("批量删除失败", "error");
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selected.size === 0) return;
    try {
      await api.bulkPosts([...selected], "status", status);
      toast(`已将 ${selected.size} 篇文章设为${status === 'published' ? '已发布' : '草稿'}`, "success");
      setSelected(new Set());
      fetchPosts();
    } catch {
      toast("操作失败", "error");
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === posts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(posts.map(p => p.id)));
    }
  };

  const totalPages = Math.ceil(total / limit);

  const statusBadge = (status: string) => {
    return status === 'published'
      ? <span className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-bold">已发布</span>
      : <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-bold">草稿</span>;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-4xl font-display font-black text-on-surface">文章管理</h1>
          <p className="text-on-surface-variant mt-1">共 {total} 篇文章</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full font-bold transition-colors"
          >
            <Upload className="w-5 h-5" />
            导入
          </button>
          <button
            onClick={() => navigate("/admin/editor")}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            新建文章
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索文章标题、摘要..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        >
          <option value="all">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>
        <button
          onClick={fetchPosts}
          className="p-3 hover:bg-surface-container rounded-xl transition-colors text-on-surface-variant"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 p-3 bg-primary-container/30 rounded-xl"
        >
          <span className="text-sm font-medium text-on-surface-variant">已选 {selected.size} 篇</span>
          <button onClick={() => handleBulkStatus('published')} className="px-3 py-1.5 text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full hover:opacity-80 transition-opacity">
            设为已发布
          </button>
          <button onClick={() => handleBulkStatus('draft')} className="px-3 py-1.5 text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-full hover:opacity-80 transition-opacity">
            设为草稿
          </button>
          <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-bold bg-error-container text-on-error-container rounded-full hover:opacity-80 transition-opacity">
            删除
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-on-surface-variant hover:text-on-surface">
            取消选择
          </button>
        </motion.div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="bg-surface-container rounded-[var(--radius-md3)] shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-variant/50 text-on-surface-variant text-xs uppercase tracking-wider">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === posts.length && posts.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded accent-primary"
                      />
                    </th>
                    <th className="p-4 font-bold">标题</th>
                    <th className="p-4 font-bold">状态</th>
                    <th className="p-4 font-bold">分类</th>
                    <th className="p-4 font-bold hidden md:table-cell">阅读</th>
                    <th className="p-4 font-bold hidden md:table-cell">评论</th>
                    <th className="p-4 font-bold hidden lg:table-cell">日期</th>
                    <th className="p-4 font-bold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-surface/50 transition-colors group">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selected.has(post.id)}
                          onChange={() => toggleSelect(post.id)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {post.coverImage && (
                            <img src={post.coverImage} alt="" className="w-10 h-10 rounded-lg object-cover hidden sm:block" referrerPolicy="no-referrer" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-on-surface truncate max-w-[200px] md:max-w-[300px]">
                              {post.sticky ? <Pin className="w-3 h-3 inline text-primary mr-1" /> : null}
                              {post.title}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate mt-0.5 max-w-[200px] md:max-w-[300px]">
                              {post.excerpt || '无摘要'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{statusBadge(post.status)}</td>
                      <td className="p-4">
                        <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                          {post.category?.name || '未分类'}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell text-sm text-on-surface-variant">{post.views}</td>
                      <td className="p-4 hidden md:table-cell text-sm text-on-surface-variant">{post.comments}</td>
                      <td className="p-4 hidden lg:table-cell text-xs text-on-surface-variant whitespace-nowrap">
                        {format(new Date(post.date), "yyyy-MM-dd")}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/admin/editor?id=${post.id}`)}
                            className="p-2 text-primary hover:bg-primary-container rounded-full transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExport(post.id)}
                            className="p-2 text-on-surface-variant hover:bg-surface hover:text-primary rounded-full transition-colors"
                            title="导出"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <a
                            href={`/post/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-on-surface-variant hover:bg-surface rounded-full transition-colors"
                            title="预览"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 text-error hover:bg-error-container rounded-full transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-on-surface-variant">
                        <p className="text-lg mb-2">暂无文章</p>
                        <button
                          onClick={() => navigate("/admin/editor")}
                          className="text-primary font-medium hover:underline"
                        >
                          创建第一篇
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-full hover:bg-surface disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-on-surface-variant">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-full hover:bg-surface disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImport(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-surface-container rounded-2xl border border-outline-variant/10 shadow-2xl p-6 z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-on-surface flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                导入文章
              </h3>
              <button onClick={() => setShowImport(false)} className="p-1 hover:bg-surface rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            <p className="text-sm text-on-surface-variant/70 mb-4">
              支持从导出的 JSON 文件导入。可导入单篇或多篇文章，保留标题、内容、标签等信息。
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-outline-variant/30 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-colors mb-4"
            >
              <Upload className="w-5 h-5" />
              选择 JSON 文件
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json,application/json" className="hidden" />
            <textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder='或粘贴 JSON 内容到此处…'
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant/20 text-on-surface text-sm placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40 resize-y font-mono"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowImport(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importJson.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                {importing ? '导入中…' : '导入'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
