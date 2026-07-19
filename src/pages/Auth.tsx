import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, Mail, Lock, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { CustomCursor } from '../components/CustomCursor';

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b} = ?`, answer: a + b };
}

export function Auth() {
  const { login, register, user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const resetForm = useCallback(() => {
    setUsername(''); setNickname(''); setEmail(''); setPassword('');
    setAvatar(''); setCaptchaInput(''); setError(''); setCaptcha(generateCaptcha());
  }, []);

  const switchMode = () => {
    resetForm();
    setMode(m => m === 'login' ? 'register' : 'login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (parseInt(captchaInput) !== captcha.answer) {
      setError('验证码错误');
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register({ username, nickname: nickname || undefined, email, password, avatar: avatar || undefined });
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message);
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
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

  const siteTitle = settings.site_title || 'Expressive.';
  const siteIcon = settings.site_icon;

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md z-10"
      >
        {/* Back to home */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        {/* Branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center justify-center mb-4"
          >
            {siteIcon ? (
              <img
                src={siteIcon}
                alt={siteTitle}
                className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-display font-black text-2xl">E</span>
              </div>
            )}
          </motion.div>
          <h1 className="text-2xl font-display font-black text-on-surface">{siteTitle}</h1>
          <p className="text-sm text-on-surface-variant/60 mt-2">
            {mode === 'login' ? '欢迎回来' : '创建你的账号'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-surface-container rounded-2xl border border-outline-variant/10 shadow-2xl p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              transition={{ duration: 0.2 }}
            >
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
                    placeholder="用户名"
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
                    placeholder="密码"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-surface rounded-xl border border-outline-variant/15 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Captcha */}
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
                  <button type="button" onClick={() => setCaptcha(generateCaptcha())} className="text-xs text-primary hover:underline shrink-0">换一个</button>
                </div>

                {error && <p className="text-sm text-error font-bold text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          <p className="text-center text-sm text-on-surface-variant/60 mt-6">
            {mode === 'login' ? '没有账号？' : '已有账号？'}
            <button onClick={switchMode} className="text-primary font-bold hover:underline ml-1">
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </p>
        </div>
      </motion.div>
      <CustomCursor />
    </div>
  );
}
