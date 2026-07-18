import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const mockFriends = [
  {
    name: "Fuwari Theme",
    desc: "A beautiful, fast, and modern static blog theme.",
    url: "https://fuwari.vercel.app",
    avatar: "https://picsum.photos/seed/fuwari/100/100"
  },
  {
    name: "Material Design",
    desc: "Build beautiful, usable products faster.",
    url: "https://m3.material.io",
    avatar: "https://picsum.photos/seed/md3/100/100"
  },
  {
    name: "React Router",
    desc: "Declarative routing for React.",
    url: "https://reactrouter.com",
    avatar: "https://picsum.photos/seed/router/100/100"
  }
];

export function Friends() {
  const [friends, setFriends] = useState(mockFriends);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <h1 className="text-5xl lg:text-7xl font-display font-black text-on-surface mb-6 tracking-tight">
          Friends & <span className="text-primary">Links</span>
        </h1>
        <p className="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Awesome people and projects that inspire me. 
          Feel free to reach out if you want to be added here.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {friends.map((friend, index) => (
          <motion.a
            key={index}
            href={friend.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="group block p-6 bg-surface-container rounded-[var(--radius-md3)] border border-outline-variant/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <img 
                src={friend.avatar} 
                alt={friend.name} 
                className="w-16 h-16 rounded-full object-cover border-2 border-surface shadow-sm group-hover:scale-110 transition-transform duration-300"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
                  {friend.name}
                </h3>
                <span className="text-xs font-medium text-on-surface-variant flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                  Visit Site <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
            
            <p className="text-sm text-on-surface-variant leading-relaxed relative z-10">
              {friend.desc}
            </p>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
