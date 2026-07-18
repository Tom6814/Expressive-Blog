import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { api } from "../../lib/api";

export function TrendingPostsWidget() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    api.getStats().then((stats) => {
      if (stats.topPosts) setPosts(stats.topPosts.slice(0, 5));
    });
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-primary rounded-full"></span>
        热门文章
      </h3>
      <ul className="space-y-3">
        {posts.map((post, index) => (
          <li key={post.id}>
            <Link
              to={`/post/${post.slug}`}
              className="flex items-center gap-3 group p-1 -mx-1 rounded-lg hover:bg-surface transition-colors"
            >
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-primary text-on-primary' :
                index === 1 ? 'bg-primary-container text-on-primary-container' :
                index === 2 ? 'bg-secondary-container text-on-secondary-container' :
                'bg-surface text-on-surface-variant'
              }`}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                  {post.title}
                </h4>
                <span className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                  <Eye className="w-3 h-3" />
                  {post.views} 阅读
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
