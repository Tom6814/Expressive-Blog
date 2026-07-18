import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Trash2, MessageSquare, RefreshCw, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api } from "../../lib/api";
import { format } from "date-fns";
import { Loader } from "../../components/Loader";
import { useToast } from "../../components/Toast";

export function AdminComments() {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const limit = 20;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getComments({ page, limit, ...(search ? { /* search not supported on this endpoint yet */ } : {}) });
      setComments(res.data || []);
      setTotal(res.total || 0);
    } catch {
      toast("加载评论失败", "error");
    }
    setLoading(false);
  }, [page, toast]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条评论吗？")) return;
    try {
      await api.deleteComment(id);
      toast("评论已删除", "success");
      fetchComments();
    } catch {
      toast("删除失败", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 条评论吗？`)) return;
    try {
      await api.bulkDeleteComments([...selected]);
      toast(`已删除 ${selected.size} 条评论`, "success");
      setSelected(new Set());
      fetchComments();
    } catch {
      toast("批量删除失败", "error");
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === comments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(comments.map(c => c.id)));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-black text-on-surface">评论管理</h1>
          <p className="text-on-surface-variant mt-1">共 {total} 条评论</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-5 py-2.5 bg-error text-on-error rounded-full font-bold hover:bg-error/90 transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              删除选中 ({selected.size})
            </button>
          )}
          <button
            onClick={fetchComments}
            className="p-2.5 hover:bg-surface rounded-full transition-colors text-on-surface-variant"
            title="刷新"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

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
                        checked={selected.size === comments.length && comments.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded accent-primary"
                      />
                    </th>
                    <th className="p-4 font-bold">作者</th>
                    <th className="p-4 font-bold">内容</th>
                    <th className="p-4 font-bold">所属</th>
                    <th className="p-4 font-bold">时间</th>
                    <th className="p-4 font-bold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {comments.map((comment) => (
                    <tr key={comment.id} className="hover:bg-surface/50 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selected.has(comment.id)}
                          onChange={() => toggleSelect(comment.id)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {comment.avatar && (
                            <img src={comment.avatar} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                          )}
                          <div>
                            <p className="font-medium text-on-surface text-sm">{comment.author}</p>
                            <p className="text-xs text-on-surface-variant">{comment.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-on-surface max-w-xs truncate">{comment.content}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-on-surface-variant bg-surface px-2 py-1 rounded-full">
                          {comment.postTitle ? `文章: ${comment.postTitle}` : comment.momentContent ? '动态' : '-'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-on-surface-variant whitespace-nowrap">
                        {format(new Date(comment.date), "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-2 text-error hover:bg-error-container rounded-full transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {comments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-on-surface-variant">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>暂无评论</p>
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
    </div>
  );
}
