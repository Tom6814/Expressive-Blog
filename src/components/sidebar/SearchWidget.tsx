import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export function SearchWidget() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-primary rounded-full"></span>
        搜索
      </h3>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索文章..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
      </div>
    </form>
  );
}
