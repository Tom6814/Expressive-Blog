import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

export function CategoriesWidget() {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    api.getCategories().then(setCategories);
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-primary rounded-full"></span>
        分类
      </h3>
      <ul className="space-y-2">
        {categories.map(category => (
          <li key={category.id}>
            <Link
              to={`/category/${category.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-surface text-on-surface-variant hover:text-primary transition-colors group"
            >
              <span className="font-medium">{category.name}</span>
              <span className="bg-surface group-hover:bg-primary-container px-2 py-0.5 rounded-full text-xs font-bold transition-colors">
                {category.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
