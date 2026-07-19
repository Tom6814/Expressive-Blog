import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Upload, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Loader } from './Loader';
import { format } from 'date-fns';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface CommentsProps {
  postId?: string;
  momentId?: string;
  compact?: boolean;
}

export function Comments({ postId, momentId, compact }: CommentsProps) {
  const { settings } = useSettings();
  const { user } = useAuth();
  const accountSystemEnabled = settings.account_system !== 'disabled';
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorAvatar, setAuthorAvatar] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load saved name/email from localStorage, or use logged-in user info
  useEffect(() => {
    if (user) {
      setAuthorName(user.nickname || user.username);
      setAuthorEmail(user.email);
      setAuthorAvatar(user.avatar || '');
    } else {
      const saved = localStorage.getItem('comment_author');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.name) setAuthorName(data.name);
          if (data.email) setAuthorEmail(data.email);
          if (data.avatar) setAuthorAvatar(data.avatar);
        } catch {}
      }
    }
  }, [user]);

  // Save name/email to localStorage
  const saveAuthorInfo = (name?: string, email?: string, avatar?: string) => {
    const data = {
      name: name || authorName,
      email: email || authorEmail,
      avatar: avatar || authorAvatar,
    };
    try { localStorage.setItem('comment_author', JSON.stringify(data)); } catch {}
  };
  
  const twikooRef = useRef<HTMLDivElement>(null);
  const utterancesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings.comment_system === 'twikoo' && settings.twikoo_env_id) {
      // Load Twikoo
      const scriptId = 'twikoo-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.jsdelivr.net/npm/twikoo@1.6.39/dist/twikoo.all.min.js';
        script.async = true;
        script.onload = () => {
          if (window.twikoo && twikooRef.current) {
            window.twikoo.init({
              envId: settings.twikoo_env_id,
              el: twikooRef.current,
              path: postId ? `/post/${postId}` : `/moment/${momentId}`,
            });
          }
        };
        document.body.appendChild(script);
      } else {
        if (window.twikoo && twikooRef.current) {
          twikooRef.current.innerHTML = '';
          window.twikoo.init({
            envId: settings.twikoo_env_id,
            el: twikooRef.current,
            path: postId ? `/post/${postId}` : `/moment/${momentId}`,
          });
        }
      }
    } else if (settings.comment_system === 'github' && settings.github_repo) {
       // Load Utterances
       if (utterancesRef.current) {
         utterancesRef.current.innerHTML = '';
         const script = document.createElement('script');
         script.src = 'https://utteranc.es/client.js';
         script.async = true;
         script.setAttribute('repo', settings.github_repo);
         script.setAttribute('issue-term', postId ? `post-${postId}` : `moment-${momentId}`);
         script.setAttribute('theme', 'preferred-color-scheme');
         script.setAttribute('crossorigin', 'anonymous');
         utterancesRef.current.appendChild(script);
       }
    } else {
      // Internal comment system
      setIsLoading(true);
      api.getComments({ postId, momentId }).then(({ data }) => {
        setComments(data);
        setIsLoading(false);
      }).catch(err => {
        console.error("Failed to load comments", err);
        setIsLoading(false);
      });
    }
  }, [postId, momentId, settings.comment_system, settings.twikoo_env_id, settings.github_repo]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("头像图片不能超过2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAuthorAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim() || !authorEmail.trim()) return;
    
    setIsSubmitting(true);
    try {
      const added = await api.createComment({
        postId,
        momentId,
        author: authorName.trim(),
        email: authorEmail.trim(),
        content: newComment.trim(),
        avatar: authorAvatar.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName.trim()}`,
        userId: user?.id,
      });
      setComments([added, ...comments]);
      setNewComment("");
      saveAuthorInfo(authorName.trim(), authorEmail.trim(), authorAvatar.trim());
      setShowFullForm(false);
      // optionally clear other fields, or keep them for next comment
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (settings.comment_system === 'twikoo') {
    return (
      <div className={compact ? "pt-4" : "mt-16 pt-12 border-t border-outline-variant/20 px-6 lg:px-12 pb-12"}>
        <div ref={twikooRef} id="twikoo-comments"></div>
      </div>
    );
  }
  
  if (settings.comment_system === 'github') {
    return (
      <div className={compact ? "pt-4" : "mt-16 pt-12 border-t border-outline-variant/20 px-6 lg:px-12 pb-12"}>
        <div ref={utterancesRef}></div>
      </div>
    );
  }

  return (
    <div className={compact ? "pt-3" : "mt-16 pt-12 border-t border-outline-variant/20 px-0 lg:px-0 pb-12"}>
      {/* Header — only in full mode */}
      {!compact && (
        <h3 className="text-lg font-display font-bold text-on-surface mb-5 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          评论 {comments.length > 0 && <span className="text-on-surface-variant/40 font-normal">({comments.length})</span>}
        </h3>
      )}

      {/* Compact input (Moments / social style) */}
      {compact && (
        <div className="mb-4">
          {accountSystemEnabled && !user ? (
            /* Account system enabled, not logged in → login prompt */
            <Link
              to="/auth"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/5 rounded-2xl border border-primary/10 text-primary text-sm font-bold hover:bg-primary/10 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              登录后参与评论
            </Link>
          ) : (
            <>
              {/* Inline input row */}
              <div className="flex items-start gap-2.5">
                <div className="relative flex-1">
                  <textarea
                    placeholder="说点什么…"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      const canSubmit = newComment.trim() && (user || (authorName.trim() && authorEmail.trim()));
                      if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }
                    }}
                    rows={1}
                    className="w-full pl-4 pr-11 py-2.5 text-[13px] bg-surface-container rounded-2xl border border-outline-variant/10 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/30 focus:bg-surface transition-all resize-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!user && (!authorName.trim() || !authorEmail.trim())) { setShowFullForm(true); return; }
                      if (newComment.trim()) handleSubmit(e as any);
                    }}
                    disabled={isSubmitting || !newComment.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all disabled:opacity-30"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expand: name/email fields — hidden when logged in or account system enabled */}
              {!user && accountSystemEnabled === false && (
                <>
                  <AnimatePresence>
                    {showFullForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-2 mt-2 px-1">
                          <input
                            type="text"
                            placeholder="昵称"
                            value={authorName}
                            onChange={(e) => { setAuthorName(e.target.value); saveAuthorInfo(e.target.value); }}
                            className="flex-1 px-3 py-2 text-xs bg-surface-container rounded-xl border border-outline-variant/10 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/30"
                            required
                          />
                          <input
                            type="email"
                            placeholder="邮箱"
                            value={authorEmail}
                            onChange={(e) => { setAuthorEmail(e.target.value); saveAuthorInfo(undefined, e.target.value); }}
                            className="flex-1 px-3 py-2 text-xs bg-surface-container rounded-xl border border-outline-variant/10 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/30"
                            required
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hint: set name/email */}
                  {!authorName && !showFullForm && (
                    <button
                      onClick={() => setShowFullForm(true)}
                      className="text-[11px] text-on-surface-variant/35 hover:text-primary transition-colors mt-1.5 ml-2"
                    >
                      点击设置昵称
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Full form (article pages) */}
      {!compact && (
        <form onSubmit={handleSubmit} className="mb-10 bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
          {accountSystemEnabled && !user ? (
            /* Account system enabled, not logged in → login prompt */
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-on-surface-variant/60">登录后即可参与评论</p>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                去登录
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="昵称 (必填)"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    disabled={!!user}
                    className="w-full px-4 py-2.5 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                  {user && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-full">
                      已登录
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="邮箱 (必填)"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    disabled={!!user}
                    className="w-full px-4 py-2.5 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                  {user && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-full">
                      已登录
                    </span>
                  )}
                </div>
              </div>
              <div className="mb-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="头像链接 (选填)"
                    value={authorAvatar}
                    onChange={(e) => setAuthorAvatar(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-on-surface-variant/50">或</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-surface border border-outline-variant/15 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    上传头像
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                </div>
                {authorAvatar && (
                  <img src={authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-outline-variant/20" />
                )}
              </div>
              <div className="mb-5">
                <textarea
                  placeholder="说点什么…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim() || !authorName.trim() || !authorEmail.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-40 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? '发送中…' : '发布评论'}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Comment list */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader /></div>
      ) : comments.length > 0 ? (
        <div className="space-y-1.5">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 p-2.5 rounded-2xl hover:bg-surface-container-low/50 transition-colors group">
              <img
                src={comment.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author}`}
                alt={comment.author}
                className="w-7 h-7 rounded-xl bg-surface-variant object-cover shrink-0 mt-0.5 ring-1 ring-outline-variant/10"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-bold text-on-surface truncate max-w-[120px]">
                    {comment.userId ? (comment.user_nickname || comment.author) : comment.author}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/40 shrink-0">
                    {comment.userId ? `@${comment.username}` : comment.email}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/35 shrink-0">
                    {format(new Date(comment.date), 'MM-dd HH:mm')}
                  </span>
                </div>
                <p className="text-[13px] text-on-surface-variant/80 leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-[11px] text-on-surface-variant/25">
          {compact ? '' : '暂无评论，来聊点什么吧'}
        </div>
      )}
    </div>
  );
}
