import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Lock, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  mode?: 'login' | 'register';
}

interface Captcha {
  captchaId: string;
  question: string;
}

async function fetchCaptcha(): Promise<Captcha> {
  const res = await fetch('/api/captcha');
  return res.json();
}

export default function AuthModal({ open, onClose, mode: initialMode = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refreshCaptcha = useCallback(async () => {
    try {
      const c = await fetchCaptcha();
      setCaptcha(c);
    } catch {
      // fallback to local captcha
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      setCaptcha({ captchaId: '', question: `${a} + ${b} = ?` });
    }
  }, []);

  useEffect(() => {
    if (open) refreshCaptcha();
  }, [open, refreshCaptcha]);

  const resetForm = useCallback(() => {
    setUsername(''); setNickname(''); setEmail(''); setPassword('');
    setAvatar(''); setCaptchaInput(''); setError('');
  }, []);

  const switchMode = () => {
    resetForm();
    setMode(m => m === 'login' ? 'register' : 'login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Only validate captcha for registration
    if (mode === 'register' && captcha) {
      if (!captchaInput) {
        setError('请输入验证码');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register({
          username,
          nickname: nickname || undefined,
          email,
          password,
          avatar: avatar || undefined,
          captchaId: captcha?.captchaId,
          captchaAnswer: captchaInput,
        });
      }
      onClose();
      resetForm();
      setMode('login');
    } catch (err: any) {
      setError(err.message);
      setCaptchaInput('');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/10 shadow-2xl p-8 z-10"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-surface rounded-full transition-colors">
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>

            <h2 className="text-xl font-display font-bold text-on-surface mb-6 text-center">
              {mode === 'login' ? '登录' : '注册'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="用户名 (小写字母、数字、下划线)"
                  required
                  minLength={3}
                  maxLength={20}
                  className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {mode === 'register' && (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                    <input
                      type="text"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      placeholder="昵称 (选填，默认使用用户名)"
                      className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="邮箱"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface-variant hover:text-primary transition-colors">
                      <Image className="w-4 h-4" />
                      {avatar ? '已选择头像' : '上传头像 (选填, base64)'}
                      <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                    </label>
                    {avatar && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <button type="button" onClick={() => setAvatar('')} className="text-xs text-error">移除</button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="密码 (至少6位)"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Captcha — only for registration */}
              {mode === 'register' && captcha && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-on-surface-variant/50 shrink-0">验证码:</span>
                  <span className="px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg font-mono font-bold text-sm select-none">
                    {captcha.question}
                  </span>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={e => setCaptchaInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="答案"
                    required
                    className="w-20 px-3 py-2 bg-surface rounded-xl border border-outline-variant/15 text-on-surface text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button type="button" onClick={refreshCaptcha} className="text-xs text-primary hover:underline shrink-0">换一个</button>
                </div>
              )}

              {error && <p className="text-sm text-error font-bold text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
              </button>
            </form>

            <p className="text-center text-sm text-on-surface-variant/60 mt-4">
              {mode === 'login' ? '没有账号？' : '已有账号？'}
              <button onClick={switchMode} className="text-primary font-bold hover:underline ml-1">
                {mode === 'login' ? '立即注册' : '去登录'}
              </button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
