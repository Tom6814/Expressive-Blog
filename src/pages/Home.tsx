import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Hero } from "../components/Hero";
import { Sidebar } from "../components/Sidebar";
import { PostCard } from "../components/PostCard";
import { Loader } from "../components/Loader";
import { api } from "../lib/api";
import { useSettings } from "../context/SettingsContext";

export function Home() {
  const { settings } = useSettings();
  const { id } = useParams(); // 'id' can be categoryId or tagId depending on route
  const isCategory = window.location.pathname.startsWith('/category/');
  const isTag = window.location.pathname.startsWith('/tag/');

  // Read search param from URL
  const searchParams = new URLSearchParams(window.location.search);
  const searchQuery = searchParams.get('search') || '';

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState("");

  useEffect(() => {
    setLoading(true);
    const filter: any = {};
    if (isCategory && id) filter.categoryId = id;
    if (isTag && id) filter.tagId = id;
    if (searchQuery) filter.search = searchQuery;

    api.getPosts(filter).then(async ({ data }) => {
      setPosts(data);
      setLoading(false);
      
      // Fetch category/tag name for display
      if (isCategory && id) {
        api.getCategories().then(cats => {
          const cat = cats.find(c => c.id === id);
          if (cat) setFilterName(cat.name);
        });
      } else if (isTag && id) {
        api.getTags().then(tags => {
          const tag = tags.find(t => t.id === id);
          if (tag) setFilterName(tag.name);
        });
      } else {
        setFilterName(searchQuery ? `搜索: ${searchQuery}` : "");
      }
    });
  }, [id, isCategory, isTag, searchQuery]);

  return (
    <div className={`flex flex-col ${settings.sidebar_position === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 justify-center`}>
      <div className="flex-grow max-w-4xl w-full">
        {!isCategory && !isTag && <Hero />}
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-on-surface flex items-center gap-3">
            <span className="w-3 h-8 bg-primary rounded-full inline-block"></span>
            {filterName ? `${isCategory ? '分类' : '标签'}: ${filterName}` : '最新文章'}
          </h2>
          <div className="text-sm font-medium text-on-surface-variant">
            {posts.length} 篇文章
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : (
          posts.length > 0 ? (
            <div className="columns-1 md:columns-2 gap-6 lg:gap-8 space-y-6 lg:space-y-8">
              {posts.map((post, index) => (
                <div key={post.id} className="break-inside-avoid">
                  <PostCard post={post} index={index} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-on-surface-variant">
              暂无文章。
            </div>
          )
        )}
        
        {posts.length > 0 && (
          <div className="mt-12 flex justify-center">
            <button className="px-8 py-3 bg-surface-container-highest hover:bg-surface-variant text-on-surface font-bold rounded-full transition-colors shadow-sm">
              加载更多
            </button>
          </div>
        )}
      </div>
      
      {settings.sidebar_layout !== 'negative' && <Sidebar />}
    </div>
  );
}
