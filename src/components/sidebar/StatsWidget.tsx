import { useState, useEffect } from "react";
import { FileText, MessageSquare, Eye, Heart, FolderOpen, Tag } from "lucide-react";
import { api } from "../../lib/api";

export function StatsWidget() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.getStats().then(setStats);
  }, []);

  if (!stats) return null;

  const items = [
    { icon: FileText, label: "文章", value: stats.posts, color: "text-primary" },
    { icon: FolderOpen, label: "分类", value: stats.categories, color: "text-secondary" },
    { icon: Tag, label: "标签", value: stats.tags, color: "text-tertiary" },
    { icon: MessageSquare, label: "评论", value: stats.comments, color: "text-blue-500" },
    { icon: Eye, label: "浏览", value: stats.views, color: "text-green-500" },
    { icon: Heart, label: "点赞", value: stats.likes, color: "text-red-500" },
  ];

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-tertiary rounded-full"></span>
        站点统计
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-surface hover:bg-surface-container-high transition-colors"
            >
              <Icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
              <div className="min-w-0">
                <div className="text-xs text-on-surface-variant">{item.label}</div>
                <div className="text-sm font-bold text-on-surface">{item.value?.toLocaleString() ?? 0}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
