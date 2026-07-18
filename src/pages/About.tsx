import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Sidebar } from "../components/Sidebar";
import { useSettings } from "../context/SettingsContext";
import { SOCIAL_PLATFORMS } from "../lib/social-icons";

export function About() {
  const { settings } = useSettings();

  const defaultContent = `
### 你好，世界！

我是一名热衷于创造美观、实用且易于访问的 Web 体验的设计师和开发者。我相信设计不仅仅是外观，更是它是如何工作的。

我的旅程始于对排版和布局的着迷，这自然演变成了学习代码以将这些设计变为现实。我专注于 React、Tailwind CSS 和创建设计系统。

### 我做什么

* UI/UX 设计
* 前端开发 (React, Vue)
* 设计系统架构
* 性能优化

### 联系我

我总是乐于讨论新项目、创意想法或参与您愿景的机会。随时通过我的任何社交渠道与我联系！
`;

  return (
    <div className={`flex flex-col ${settings.sidebar_position === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 justify-center`}>
      <div className="flex-grow max-w-4xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl lg:text-5xl font-display font-black text-on-surface mb-4">
            关于我
          </h1>
          <p className="text-xl text-on-surface-variant">
            关于我是谁以及我做什么的一点介绍。
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
          className="bg-surface-container rounded-[var(--radius-md3)] p-8 lg:p-12 shadow-sm border border-outline-variant/10 flex flex-col md:flex-row gap-8 items-start"
        >
          <div className="w-full md:w-1/3 flex flex-col items-center text-center">
            <img 
              src={settings.author_avatar || "https://picsum.photos/seed/avatar/200/200"} 
              alt={settings.author_name || "Author"} 
              className="w-48 h-48 rounded-full mb-6 ring-8 ring-primary-container object-cover"
            />
            <h2 className="text-2xl font-bold text-on-surface mb-2">{settings.author_name || "Expressive Blogger"}</h2>
            <p className="text-primary font-medium mb-6">{settings.author_title || "UI/UX 设计师 & 开发者"}</p>
            
            <div className="flex flex-col gap-3 w-full">
              {SOCIAL_PLATFORMS.filter(p => settings[`social_${p.id}`]).map(platform => {
                const href = platform.id === 'email' ? `mailto:${settings['social_' + platform.id]}` : settings['social_' + platform.id];
                return (
                  <a 
                    key={platform.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-full bg-surface hover:bg-primary-container text-on-surface hover:text-primary font-bold transition-colors border border-outline-variant/20 flex items-center justify-center gap-2"
                  >
                    <platform.icon className="w-5 h-5" />
                    {platform.name}
                  </a>
                );
              })}
            </div>
          </div>
          
          <div className="w-full md:w-2/3 prose prose-lg dark:prose-invert max-w-none text-on-surface-variant">
            <ReactMarkdown>
              {settings.about_content || defaultContent}
            </ReactMarkdown>
          </div>
        </motion.div>
      </div>
      
      {settings.sidebar_layout !== 'negative' && <Sidebar />}
    </div>
  );
}
