import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, MessageCircle, Tag, Folder, Eye, Heart, MessageSquare, TrendingUp, FileEdit, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Loader } from "../../components/Loader";

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getStats().then(data => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!stats) return <div className="text-center py-12 text-on-surface-variant">加载失败，请刷新重试</div>;

  const statCards = [
    { label: "已发布文章", value: stats.posts, icon: FileText, color: "bg-primary-container text-on-primary-container", path: "/admin/posts" },
    { label: "草稿", value: stats.drafts, icon: FileEdit, color: "bg-tertiary-container text-on-tertiary-container", path: "/admin/posts?status=draft" },
    { label: "动态", value: stats.moments, icon: MessageCircle, color: "bg-secondary-container text-on-secondary-container", path: "/admin/moments" },
    { label: "分类", value: stats.categories, icon: Folder, color: "bg-error-container text-on-error-container", path: "/admin/taxonomy" },
    { label: "标签", value: stats.tags, icon: Tag, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300", path: "/admin/taxonomy" },
    { label: "总阅读量", value: stats.views.toLocaleString(), icon: Eye, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    { label: "总点赞", value: stats.likes.toLocaleString(), icon: Heart, color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    { label: "总评论", value: stats.comments, icon: MessageSquare, color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", path: "/admin/comments" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-black text-on-surface">仪表盘</h1>
          <p className="text-on-surface-variant mt-1">欢迎回来，这是你的站点概览</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => stat.path && navigate(stat.path)}
              className={`p-5 rounded-[var(--radius-md3)] shadow-sm border border-outline-variant/10 ${stat.color} ${stat.path ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm opacity-80">{stat.label}</h3>
                <Icon className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-3xl font-display font-black">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10"
        >
          <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            热门文章
          </h2>
          <div className="space-y-3">
            {stats.topPosts?.map((post: any, i: number) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface transition-colors cursor-pointer"
                onClick={() => navigate(`/post/${post.slug}`)}
              >
                <span className="text-2xl font-display font-black text-on-surface-variant/40 w-8 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface truncate">{post.title}</p>
                  <div className="flex gap-4 text-xs text-on-surface-variant mt-1">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comments}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!stats.topPosts || stats.topPosts.length === 0) && (
              <p className="text-on-surface-variant text-sm py-4 text-center">暂无数据</p>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10"
        >
          <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            最近发布
          </h2>
          <div className="space-y-3">
            {stats.recentPosts?.map((post: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-on-surface truncate text-sm">{post.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {new Date(post.date).toLocaleDateString('zh-CN')} · {post.views} 阅读
                  </p>
                </div>
              </div>
            ))}
            {(!stats.recentPosts || stats.recentPosts.length === 0) && (
              <p className="text-on-surface-variant text-sm py-4 text-center">暂无数据</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
