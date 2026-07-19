import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { MessageCircle, Heart, Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { Comments } from "../components/Comments";
import { Sidebar } from "../components/Sidebar";
import { Loader } from "../components/Loader";
import { useSettings } from "../context/SettingsContext";

const PAGE_SIZE = 10;

export function Moments() {
  const { settings } = useSettings();
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const isPaginated = (settings.moments_pagination || 'load-more') === 'pagination';
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const loadMoments = useCallback(async (pageNum: number, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const { data, total: t } = await api.getMoments(pageNum, PAGE_SIZE);
      setMoments(prev => append ? [...prev, ...data] : data);
      setTotal(t);
      // Only scroll for pagination mode (not load-more), use instant to avoid jank
      if (!append) window.scrollTo({ top: 0, behavior: 'instant' as any });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadMoments(1);
  }, []);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    loadMoments(p);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMoments(nextPage, true);
  };

  const handleLike = async (id: string) => {
    try {
      const updated = await api.likeMoment(id);
      setMoments(prev => prev.map(m => m.id === id ? { ...m, likes: updated.likes } : m));
    } catch (error) {
      console.error("Failed to like moment", error);
    }
  };

  const toggleComments = (id: string) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    // Show max 7 page buttons
    const pages: number[] = [];
    let start = Math.max(1, page - 3);
    let end = Math.min(totalPages, page + 3);
    if (end - start < 6) {
      if (start === 1) end = Math.min(totalPages, start + 6);
      else start = Math.max(1, end - 6);
    }
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex items-center justify-center gap-1 mt-8">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {start > 1 && (
          <>
            <button onClick={() => goToPage(1)} className="w-10 h-10 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">1</button>
            {start > 2 && <span className="px-1 text-on-surface-variant/40">...</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => goToPage(p)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              p === page ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-on-surface-variant/40">...</span>}
            <button onClick={() => goToPage(totalPages)} className="w-10 h-10 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${settings.sidebar_position === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 justify-center`}>
      <div className="flex-grow max-w-3xl w-full mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 relative flex flex-col items-center text-center"
        >
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
          <h1 className="text-4xl lg:text-5xl font-display font-black text-on-surface mb-4 tracking-tight flex items-center gap-4">
            动态 <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </h1>
        </motion.div>

        {loading ? (
          <Loader />
        ) : (
          <>
            <div className="space-y-0 divide-y divide-outline-variant/10 bg-surface-container rounded-[var(--radius-md3)] shadow-sm border border-outline-variant/10 p-4 md:p-8">
              {moments.map((moment, index) => {
                const images = (moment.images || []).filter((img: string) => img);
                let gridClass = "grid-cols-1";
                if (images.length === 4) gridClass = "grid-cols-2 w-2/3";
                else if (images.length > 1) gridClass = "grid-cols-3";
                
                return (
                  <motion.div
                    key={moment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index % PAGE_SIZE) * 0.03 }}
                    className="flex gap-4 pt-6 pb-6 first:pt-0 last:pb-0"
                  >
                    <div className="shrink-0">
                      <img 
                        src={settings.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Author`} 
                        alt="Avatar"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>

                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-primary mb-1 text-[17px]">
                        {settings.author_name || "Expressive"}
                      </h3>
                      
                      <p className="text-[16px] text-on-surface leading-normal mb-3 whitespace-pre-wrap">
                        {moment.content}
                      </p>

                      {images.length > 0 && (
                        <div className={`grid gap-1 mb-3 ${gridClass}`}>
                          {images.map((img: string, i: number) => (
                            <div key={i} className={`relative overflow-hidden ${images.length === 1 ? 'max-w-[75%] rounded-lg' : 'aspect-square rounded-sm'}`}>
                              <img 
                                src={img} 
                                alt="Moment attachment" 
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] text-on-surface-variant/70">
                          {formatDistanceToNow(new Date(moment.date), { addSuffix: true, locale: zhCN })}
                        </span>
                        
                        <div className="flex items-center gap-4 bg-surface-container-high rounded-full px-3 py-1">
                          <button 
                            onClick={() => handleLike(moment.id)}
                            className="flex items-center gap-1.5 hover:text-primary transition-colors text-on-surface-variant text-sm"
                          >
                            <Heart className={`w-4 h-4 ${moment.likes > 0 ? 'fill-primary text-primary' : ''}`} />
                            {moment.likes > 0 && <span>{moment.likes}</span>}
                          </button>
                          <div className="w-px h-3 bg-outline-variant/30"></div>
                          <button 
                            onClick={() => toggleComments(moment.id)}
                            className={`flex items-center gap-1.5 transition-colors text-sm ${expandedComments[moment.id] ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                            {moment.commentCount > 0 && <span>{moment.commentCount}</span>}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedComments[moment.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-surface-container-high rounded-lg mt-3"
                          >
                            <Comments momentId={moment.id} compact={true} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {!isPaginated && !loading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-surface-container text-on-surface font-medium rounded-full hover:bg-surface-container-high transition-colors border border-outline-variant/20 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</>
                  ) : (
                    `加载更多 (${moments.length}/${total})`
                  )}
                </button>
              </div>
            )}

            {isPaginated && renderPagination()}
          </>
        )}
      </div>
      
      {settings.sidebar_layout !== 'negative' && <Sidebar />}
    </div>
  );
}
