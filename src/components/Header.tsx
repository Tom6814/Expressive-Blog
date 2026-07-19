import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, Palette, X, ArrowRight, User, LogOut, Settings, Shield, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { api } from "../lib/api";

export function Header() {
  const { setCustomizerOpen, isDark, toggleDark } = useTheme();
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState<{label: string, path?: string, children?: {label: string, path: string}[]}[]>([]);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const isScrolled = latest > 50;
    if (isScrolled !== scrolled) {
      setScrolled(isScrolled);
    }
  });

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      if (settings.custom_menu) {
        setMenu(JSON.parse(settings.custom_menu));
      } else {
        setMenu([
          { label: "Home", path: "/" },
          { label: "Archive", path: "/archive" },
          { label: "Moments", path: "/moments" },
          { label: "Friends", path: "/friends" },
          { label: "About", path: "/about" }
        ]);
      }
    } catch (e) {
      console.error("Failed to parse custom menu", e);
    }
  }, [settings.custom_menu]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      api.getPosts().then(({ data: posts }) => {
        const results = posts.filter(p => 
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(results);
      });
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const siteTitle = settings.site_title || "Expressive.";
  const siteIcon = settings.site_icon;

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <motion.header 
          layout
          className={`pointer-events-auto flex items-center justify-between rounded-full border border-outline-variant/10 backdrop-blur-2xl transition-colors duration-500 ${
            scrolled 
              ? "bg-surface-container/80 shadow-sm py-2 px-4 w-full max-w-2xl" 
              : "bg-surface-container-lowest/80 shadow-md py-3 px-6 w-full max-w-5xl"
          }`}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <motion.div layout className="relative">
              {siteIcon && (
                <img 
                  src={siteIcon} 
                  alt="Site Icon" 
                  className="w-9 h-9 rounded-full object-cover shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3" 
                  referrerPolicy="no-referrer" 
                />
              )}
              {!siteIcon && <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">E</div>}
            </motion.div>
            <motion.span 
              layout
              className="text-xl font-display font-black text-on-surface tracking-tight group-hover:text-primary transition-colors hidden sm:block"
            >
              {siteTitle}
            </motion.span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 mx-4">
            {menu.map((item, index) => {
              const hasChildren = !!item.children;
              const isActive = !hasChildren && (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path!)));
              
              let label = item.label;
              if (label === "Home") label = "首页";
              if (label === "Archive") label = "归档";
              if (label === "Moments") label = "动态";
              if (label === "Friends") label = "友链";
              if (label === "About") label = "关于";

              if (hasChildren) {
                return (
                  <div key={index} className="relative group" onMouseEnter={() => setOpenSubmenu(item.label)} onMouseLeave={() => setOpenSubmenu(null)}>
                    <button className={`px-4 py-2 rounded-full text-sm font-bold transition-colors text-on-surface-variant hover:text-on-surface flex items-center gap-1`}>
                      {label}
                    </button>
                    <div className={`absolute top-full left-0 mt-2 w-48 bg-surface-container rounded-2xl shadow-lg border border-outline-variant/10 p-2 z-50 transition-all duration-300 ${openSubmenu === item.label ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                      {item.children!.map((child, childIndex) => (
                        <Link key={childIndex} to={child.path} className="block px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-colors">
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link 
                  key={index} 
                  to={item.path!} 
                  className={`relative px-4 py-2 rounded-full text-sm font-bold transition-colors ${isActive ? 'text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary-container rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 rounded-full hover:bg-surface-variant/50 text-on-surface-variant hover:text-primary transition-all duration-300 group"
              aria-label="Search"
            >
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            {/* User Button */}
            {settings.account_system !== 'disabled' ? (
              <>
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2.5 rounded-full hover:bg-surface-variant/50 text-on-surface-variant hover:text-primary transition-all duration-300 flex items-center gap-1"
                      aria-label="User menu"
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </button>
                    <AnimatePresence>
                      {showMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-surface-container rounded-2xl border border-outline-variant/10 shadow-xl z-50 overflow-hidden"
                          >
                            <div className="px-4 py-3 border-b border-outline-variant/10">
                              <p className="text-sm font-bold text-on-surface">{user.nickname || user.username}</p>
                              <p className="text-xs text-on-surface-variant/60">@{user.username}</p>
                            </div>
                            <div className="p-2">
                              {user.role === 'admin' && (
                                <Link
                                  to="/admin"
                                  onClick={() => setShowMenu(false)}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface hover:text-on-surface transition-colors"
                                >
                                  <Shield className="w-4 h-4" />
                                  管理后台
                                </Link>
                              )}
                              <Link
                                to="/profile"
                                onClick={() => setShowMenu(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface hover:text-on-surface transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                                个人中心
                              </Link>
                              <button
                                onClick={() => { logout(); setShowMenu(false); }}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-error hover:bg-error/10 transition-colors w-full text-left"
                              >
                                <LogOut className="w-4 h-4" />
                                退出登录
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/auth')}
                    className="p-2.5 rounded-full hover:bg-surface-variant/50 text-on-surface-variant hover:text-primary transition-all duration-300"
                    aria-label="Login"
                  >
                    <User className="w-5 h-5" />
                  </button>
                )}
              </>
            ) : (
              /* Account system disabled: show theme toggle */
              <button
                onClick={toggleDark}
                className="p-2.5 rounded-full hover:bg-surface-variant/50 text-on-surface-variant hover:text-primary transition-all duration-300"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
            {settings.allow_user_override !== 'false' && (
              <button 
                onClick={() => setCustomizerOpen(true)}
                className="p-2.5 rounded-full hover:bg-surface-variant/50 text-on-surface-variant hover:text-primary transition-all duration-300 group"
                aria-label="Customize Theme"
              >
                <Palette className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </button>
            )}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 rounded-full hover:bg-surface-variant/50 text-on-surface-variant hover:text-primary transition-all duration-300 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </motion.header>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-surface shadow-2xl z-50 overflow-y-auto border-l border-outline-variant/10 lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-outline-variant/10">
                <span className="text-xl font-display font-bold text-on-surface tracking-tight">菜单</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-surface-variant text-on-surface transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="p-6 flex flex-col gap-2 flex-grow">
                {menu.map((item, index) => {
                  const hasChildren = !!item.children;
                  const isActive = !hasChildren && (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path!)));
                  let label = item.label;
                  if (label === "Home") label = "首页";
                  if (label === "Archive") label = "归档";
                  if (label === "Moments") label = "动态";
                  if (label === "Friends") label = "友链";
                  if (label === "About") label = "关于";

                  if (hasChildren) {
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex flex-col gap-1"
                      >
                        <div className="px-5 py-4 text-lg font-bold text-on-surface">{label}</div>
                        <div className="pl-8 flex flex-col gap-1">
                          {item.children!.map((child, childIndex) => (
                            <Link
                              key={childIndex}
                              to={child.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="px-5 py-3 rounded-2xl font-medium text-base text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link 
                        to={item.path!} 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-lg transition-all ${isActive ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}
                      >
                        {label}
                        {isActive && <ArrowRight className="w-5 h-5" />}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-low">
                <p className="text-sm text-on-surface-variant text-center font-medium">
                  © {new Date().getFullYear()} {siteTitle}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-xl flex flex-col items-center pt-32 px-4"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div 
              initial={{ y: -20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-3xl"
            >
              <div className="relative mb-12">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="w-full bg-surface-container-high rounded-full pl-20 pr-16 py-6 text-2xl md:text-3xl font-display font-bold text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-4 focus:ring-primary/20 shadow-lg transition-shadow"
                  autoFocus
                />
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-error transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {searchResults.length > 0 ? (
                  <div className="grid gap-4">
                    {searchResults.map((post, i) => (
                      <motion.button
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(`/post/${post.slug}`);
                        }}
                        className="w-full text-left p-6 bg-surface-container hover:bg-surface-container-high rounded-[var(--radius-md3)] transition-all group border border-transparent hover:border-primary/10 hover:shadow-md"
                      >
                        <h4 className="text-xl font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">{post.title}</h4>
                        <p className="text-base text-on-surface-variant line-clamp-2">{post.excerpt}</p>
                      </motion.button>
                    ))}
                  </div>
                ) : searchQuery.trim().length > 1 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                    <Search className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-xl font-medium">未找到 "{searchQuery}" 的结果</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/50">
                    <p className="text-xl font-medium">输入以开始搜索</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
