import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export function TagsWidget() {
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    api.getTags().then(setTags);
  }, []);

  if (tags.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-tertiary rounded-full"></span>
        标签
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Link
            key={tag.id}
            to={`/tag/${tag.id}`}
            className="px-3 py-1.5 bg-surface hover:bg-tertiary-container text-on-surface hover:text-on-tertiary-container rounded-full text-sm font-medium transition-colors"
          >
            #{tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
