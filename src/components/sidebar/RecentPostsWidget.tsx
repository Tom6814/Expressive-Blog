import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { api } from "../../lib/api";

export function RecentPostsWidget() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    api.getPosts({ limit: 5 }).then(({ data }) => setPosts(data));
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-secondary rounded-full"></span>
        最新文章
      </h3>
      <ul className="space-y-3">
        {posts.map(post => (
          <li key={post.id}>
            <Link
              to={`/post/${post.slug}`}
              className="flex gap-3 group p-1 -mx-1 rounded-lg hover:bg-surface transition-colors"
            >
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h4>
                <span className="flex items-center gap-1 text-xs text-on-surface-variant mt-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(post.date), "MMM d, yyyy")}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
