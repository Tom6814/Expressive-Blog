import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { api } from "../../lib/api";
import { useSettings } from "../../context/SettingsContext";

export function AdminLogin() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // When account system is enabled, redirect to unified auth page
  if (settings.account_system !== "disabled") {
    return <Navigate to="/auth" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.login(password);
      if (res.success) {
        localStorage.setItem("admin_token", res.token);
        navigate("/admin");
      } else {
        setError("密码错误");
      }
    } catch {
      setError("登录失败");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 blur-3xl" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-surface-container rounded-[var(--radius-md3)] p-8 shadow-xl border border-outline-variant/20 relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center text-primary">
            <Lock className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-3xl font-display font-black text-center text-on-surface mb-2">管理员登录</h1>
        <p className="text-center text-on-surface-variant mb-8">请输入您的密码以继续。</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full px-6 py-4 rounded-full bg-surface border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-lg tracking-widest"
              required
            />
          </div>
          {error && <p className="text-error text-center text-sm font-medium">{error}</p>}
          <button 
            type="submit"
            className="w-full py-4 bg-primary text-on-primary rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95 transform"
          >
            登录
          </button>
        </form>
      </motion.div>
    </div>
  );
}
