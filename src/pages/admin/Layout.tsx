import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, MessageCircle, MessageSquare, Settings, LogOut, FolderTree, ChevronLeft } from "lucide-react";
import { api } from "../../lib/api";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "仪表盘", exact: true },
    { path: "/admin/posts", icon: FileText, label: "文章" },
    { path: "/admin/editor", icon: FileText, label: "写文章", highlight: true },
    { path: "/admin/moments", icon: MessageCircle, label: "动态" },
    { path: "/admin/comments", icon: MessageSquare, label: "评论" },
    { path: "/admin/taxonomy", icon: FolderTree, label: "分类/标签" },
    { path: "/admin/settings", icon: Settings, label: "设置" },
  ];

  const handleLogout = () => {
    api.logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-surface-container border-r border-outline-variant/20 flex-shrink-0 fixed h-full z-30">
        <div className="p-6 border-b border-outline-variant/20">
          <h1 className="text-xl font-display font-bold text-primary">管理后台</h1>
          <p className="text-xs text-on-surface-variant mt-1">Expressive Blog</p>
        </div>
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  item.highlight && !isActive
                    ? "border border-primary/30 text-primary hover:bg-primary-container/30"
                    : isActive
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-outline-variant/20 space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-error hover:bg-error-container/30 transition-colors w-full font-medium"
          >
            <LogOut className="w-4.5 h-4.5" />
            退出后台
          </button>
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-surface hover:text-on-surface transition-colors"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
            返回前台
          </Link>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant/20 z-30 flex items-center justify-around px-2 py-2 safe-bottom">
        {navItems.slice(0, 5).map((item) => {
          const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${
                isActive ? "text-primary font-bold" : "text-on-surface-variant"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="flex-grow p-6 lg:p-10 overflow-y-auto pb-24 md:pb-12 md:ml-64">
        <Outlet />
      </main>
    </div>
  );
}
