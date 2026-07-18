import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Folder, Tag, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { Loader } from "../../components/Loader";

export function AdminTaxonomy() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [c, t] = await Promise.all([api.getCategories(), api.getTags()]);
    setCategories(c);
    setTags(t);
    setLoading(false);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.createCategory(newCategory);
    setNewCategory("");
    fetchData();
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    await api.createTag(newTag);
    setNewTag("");
    fetchData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await api.deleteCategory(id);
      fetchData();
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (confirm("Are you sure you want to delete this tag?")) {
      await api.deleteTag(id);
      fetchData();
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 className="text-4xl font-display font-black text-on-surface mb-8">Taxonomy</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Categories */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container rounded-[var(--radius-md3)] p-8 shadow-sm border border-outline-variant/10"
        >
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <Folder className="w-6 h-6 text-primary" /> Categories
          </h2>
          
          <form onSubmit={handleCreateCategory} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newCategory} 
              onChange={e => setNewCategory(e.target.value)}
              placeholder="New Category Name"
              className="flex-grow px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button type="submit" className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors">
              Add
            </button>
          </form>

          <ul className="space-y-2">
            {categories.map(c => (
              <li key={c.id} className="group flex items-center justify-between p-3 rounded-lg bg-surface border border-outline-variant/10 hover:border-primary/30 transition-colors">
                <span className="font-medium text-on-surface">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded-full text-xs font-bold">
                    {c.count} posts
                  </span>
                  <button 
                    onClick={() => handleDeleteCategory(c.id)}
                    className="p-1.5 text-error hover:bg-error-container rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Tags */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container rounded-[var(--radius-md3)] p-8 shadow-sm border border-outline-variant/10"
        >
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <Tag className="w-6 h-6 text-tertiary" /> Tags
          </h2>
          
          <form onSubmit={handleCreateTag} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newTag} 
              onChange={e => setNewTag(e.target.value)}
              placeholder="New Tag Name"
              className="flex-grow px-4 py-3 rounded-xl bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary focus:border-transparent transition-all"
            />
            <button type="submit" className="px-6 py-3 bg-tertiary text-on-tertiary rounded-xl font-bold hover:bg-tertiary/90 transition-colors">
              Add
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <div key={t.id} className="group flex items-center gap-2 px-3 py-1.5 bg-surface border border-outline-variant/10 hover:border-tertiary/30 rounded-full transition-colors">
                <span className="text-sm font-medium text-on-surface">#{t.name}</span>
                <span className="bg-tertiary-container text-on-tertiary-container px-1.5 py-0.5 rounded-full text-xs font-bold">
                  {t.count}
                </span>
                <button 
                  onClick={() => handleDeleteTag(t.id)}
                  className="p-1 text-error hover:bg-error-container rounded-full opacity-0 group-hover:opacity-100 transition-all ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
