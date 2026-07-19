import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { format } from "date-fns";
import { 
  Calendar, Eye, MessageSquare, ArrowLeft, Tag as TagIcon, 
  Share2, Clock, ThumbsUp, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import "highlight.js/styles/github-dark.css";
import { api } from "../lib/api";
import { Comments } from "../components/Comments";
import { Sidebar } from "../components/Sidebar";
import { Loader } from "../components/Loader";
import { TableOfContents } from "../components/TableOfContents";
import { useSettings } from "../context/SettingsContext";

function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1.5 bg-primary origin-left z-50"
      style={{ scaleX }}
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-2 bg-surface-container/80 backdrop-blur-md rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all opacity-0 group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export function Post() {
  const { settings } = useSettings();
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readingTime, setReadingTime] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      api.getPost(slug).then(async (data) => {
        setPost(data);
        // Calculate reading time (approx 200 words per minute)
        const text = data.content || "";
        const words = text.trim().split(/\s+/).length;
        setReadingTime(Math.ceil(words / 200));
        setLikesCount(data.likes || 0);
        setLiked(false); // Reset liked state for new post
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [slug]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleLike = async () => {
    if (liked) return; // Prevent multiple likes for now (simple implementation)
    
    try {
      const updated = await api.likePost(post.id);
      setLikesCount(updated.likes);
      setLiked(true);
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  // SEO meta tags
  useEffect(() => {
    if (!post) return;
    document.title = `${post.title} - ${settings.site_title || 'Expressive Blog'}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.excerpt || post.title);
    else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = post.excerpt || post.title;
      document.head.appendChild(meta);
    }
    // Open Graph
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', property); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('og:title', post.title);
    setMeta('og:description', post.excerpt || '');
    setMeta('og:image', post.coverImage || '');
    setMeta('og:url', window.location.href);
    setMeta('og:type', 'article');
  }, [post]);

  if (loading) {
    return <Loader />;
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <h1 className="text-8xl font-display font-black text-primary/20 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-on-surface mb-4">文章未找到</h2>
        <p className="text-xl text-on-surface-variant mb-8 max-w-md">
          您查找的文章可能已被删除或重命名。
        </p>
        <Link to="/" className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> 返回首页
        </Link>
      </div>
    );
  }

  // Add IDs to headings for TOC
  const addHeadingIds = (markdown: string) => {
    return markdown.replace(/^(#{2,3})\s+(.+)$/gm, (_match, hashes, text) => {
      const id = text.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u4e00-\u9fff-]/g, "");
      return `${hashes} <span id="${id}">${text.trim()}</span>`;
    });
  };

  return (
    <>
      <ReadingProgress />
      <TableOfContents content={post.content} />
      
      <div className={`flex flex-col ${settings.sidebar_position === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 justify-center`}>
        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-grow max-w-4xl w-full bg-surface-container rounded-[var(--radius-md3)] overflow-hidden shadow-sm border border-outline-variant/10"
        >
          {post.coverImage ? (
            <div className="relative h-[400px] md:h-[600px] w-full group overflow-hidden">
              <img 
                src={post.coverImage} 
                alt={post.title} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              
              <Link 
                to="/" 
                className="absolute top-6 left-6 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 border border-white/10"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex flex-wrap items-center gap-3 mb-6 text-sm font-medium text-white/90">
                    <Link to={`/category/${post.category?.id}`} className="bg-primary px-4 py-1.5 rounded-full hover:bg-primary/80 transition-colors shadow-lg border border-white/10">
                      {post.category?.name}
                    </Link>
                    <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(post.date), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                      <Clock className="w-4 h-4" />
                      {readingTime} 分钟阅读
                    </span>
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-display font-black text-white leading-tight mb-6 tracking-tight drop-shadow-xl max-w-3xl">
                    {post.title}
                  </h1>
                  
                  <div className="flex items-center gap-6 text-sm text-white/80 font-medium bg-black/30 backdrop-blur-md w-fit px-6 py-3 rounded-full border border-white/10">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" /> {post.views} 阅读
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/50" />
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> {post.comments} 评论
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="p-6 lg:p-12 pb-0">
              <Link to="/" className="inline-flex items-center gap-2 text-primary font-bold hover:underline mb-8 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 返回首页
              </Link>
              <div className="flex flex-wrap items-center gap-3 mb-6 text-sm font-medium">
                <Link to={`/category/${post.category?.id}`} className="bg-primary-container text-on-primary-container px-4 py-1.5 rounded-full hover:bg-primary hover:text-on-primary transition-colors border border-primary/10">
                  {post.category?.name}
                </Link>
                <span className="flex items-center gap-1.5 text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(post.date), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5 text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  {readingTime} 分钟阅读
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-black text-on-surface leading-tight mb-6 tracking-tight">
                {post.title}
              </h1>
              <div className="h-px w-full bg-gradient-to-r from-outline-variant/50 to-transparent my-8" />
            </div>
          )}

          <div className="p-6 lg:p-12">
            <div className="flex gap-8">
              <MarkdownRenderer content={addHeadingIds(post.content)} className="[&>h1:first-child]:hidden" />
            </div>

            {/* Tags & Share */}
            <div className="mt-16 pt-8 border-t border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <TagIcon className="w-5 h-5 text-primary mr-2" />
                {post.tags?.map((tag: any) => (
                  <Link 
                    key={tag.id}
                    to={`/tag/${tag.id}`}
                    className="px-4 py-2 bg-surface-container-high hover:bg-primary-container text-on-surface hover:text-on-primary-container rounded-full text-sm font-bold transition-all hover:scale-105 border border-outline-variant/10"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleLike}
                  disabled={liked}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all hover:scale-105 shadow-sm ${
                    liked 
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 cursor-default" 
                      : "bg-surface-container-high text-on-surface hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                  }`}
                >
                  <ThumbsUp className={`w-5 h-5 ${liked ? "fill-current" : ""}`} /> 
                  {likesCount}
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-full font-bold hover:bg-primary/90 transition-all hover:scale-105 shadow-md hover:shadow-lg"
                >
                  <Share2 className="w-5 h-5" /> 分享
                </button>
              </div>
            </div>

            {/* Author Bio */}
            {settings.show_author_bio !== 'false' && (
              <div className="mt-12 p-8 bg-surface-container-high rounded-[var(--radius-md3)] border border-outline-variant/10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                <img 
                  src={settings.author_avatar || "https://picsum.photos/seed/avatar/200/200"} 
                  alt={settings.author_name || "Author"} 
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-surface shadow-md"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-on-surface mb-2">{settings.author_name || "Expressive Blogger"}</h3>
                  <p className="text-on-surface-variant mb-4 leading-relaxed whitespace-pre-wrap">
                    {settings.author_bio || "Passionate about Material Design, React, and creating beautiful web experiences.\nExploring the boundaries of modern web development one pixel at a time."}
                  </p>
                  <Link to="/about" className="text-primary font-bold hover:underline">
                    更多关于我 →
                  </Link>
                </div>
              </div>
            )}

            {/* Post Navigation */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              {post.previous ? (
                <Link to={`/post/${post.previous.slug}`} className="group p-6 bg-surface border border-outline-variant/10 rounded-[var(--radius-md3)] hover:border-primary/30 hover:shadow-md transition-all">
                  <span className="text-sm text-on-surface-variant mb-2 flex items-center gap-1 group-hover:text-primary transition-colors">
                    <ChevronLeft className="w-4 h-4" /> 上一篇
                  </span>
                  <h4 className="text-lg font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                    {post.previous.title}
                  </h4>
                </Link>
              ) : (
                <div className="hidden md:block" />
              )}
              
              {post.next ? (
                <Link to={`/post/${post.next.slug}`} className="group p-6 bg-surface border border-outline-variant/10 rounded-[var(--radius-md3)] hover:border-primary/30 hover:shadow-md transition-all text-right">
                  <span className="text-sm text-on-surface-variant mb-2 flex items-center gap-1 justify-end group-hover:text-primary transition-colors">
                    下一篇 <ChevronRight className="w-4 h-4" />
                  </span>
                  <h4 className="text-lg font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                    {post.next.title}
                  </h4>
                </Link>
              ) : (
                <div className="hidden md:block" />
              )}
            </div>

            {/* Related Posts */}
            {post.related && post.related.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-bold text-on-surface mb-6">相关文章</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {post.related.map((related: any) => (
                    <Link
                      key={related.id}
                      to={`/post/${related.slug}`}
                      className="group flex gap-4 p-4 bg-surface border border-outline-variant/10 rounded-[var(--radius-md3)] hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      {related.coverImage && (
                        <img
                          src={related.coverImage}
                          alt=""
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors text-sm">
                          {related.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{related.views}</span>
                          <span>{format(new Date(related.date), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Comments Section */}
          <Comments postId={post.id} />
        </motion.article>
  
        {settings.sidebar_layout !== 'negative' && <Sidebar />}
      </div>
    </>
  );
}
