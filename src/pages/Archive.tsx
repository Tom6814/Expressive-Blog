import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArchiveIcon } from "lucide-react";
import { api } from "../lib/api";
import { Sidebar } from "../components/Sidebar";
import { Loader } from "../components/Loader";
import { useSettings } from "../context/SettingsContext";

export function Archive() {
  const { settings } = useSettings();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPosts().then(({ data }) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  const groupedPosts = useMemo(() => {
    return posts.reduce((acc, post) => {
      const date = new Date(post.date);
      const year = format(date, "yyyy");
      const month = format(date, "MM");

      if (!acc[year]) acc[year] = { months: {}, count: 0 };
      if (!acc[year].months[month]) acc[year].months[month] = [];
      acc[year].months[month].push(post);
      acc[year].count++;
      return acc;
    }, {} as Record<string, { months: Record<string, any[]>; count: number }>);
  }, [posts]);

  const sortedYears = Object.keys(groupedPosts).sort((a, b) => Number(b) - Number(a));
  const totalPosts = posts.length;

  if (loading) {
    return <Loader />;
  }

  return (
    <div className={`flex flex-col ${settings.sidebar_position === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 justify-center`}>
      <div className="flex-grow max-w-3xl w-full mx-auto">
        {/* Header — matches Moments page style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 relative flex flex-col items-center text-center"
        >
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
          <h1 className="text-4xl lg:text-5xl font-display font-black text-on-surface mb-3 tracking-tight flex items-center gap-4">
            归档 <ArchiveIcon className="w-8 h-8 text-primary" />
          </h1>
          <p className="text-sm font-medium text-on-surface-variant/50">
            共 {totalPosts} 篇文章，{sortedYears.length} 个年份
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative pl-10 md:pl-12">
          {/* Vertical line */}
          <div className="absolute left-[15px] md:left-[19px] top-2 bottom-0 w-px bg-gradient-to-b from-primary/30 via-outline-variant/20 to-transparent" />

          {sortedYears.map((year, yearIndex) => {
            const yearData = groupedPosts[year];
            const months = yearData.months;
            const sortedMonths = Object.keys(months).sort((a, b) => Number(b) - Number(a));

            return (
              <motion.div
                key={year}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: yearIndex * 0.12, duration: 0.5, ease: "easeOut" }}
                className="mb-14"
              >
                {/* Year header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary shadow-md shadow-primary/20 shrink-0 -ml-[35px] md:-ml-[39px]">
                    <div className="w-2.5 h-2.5 bg-on-primary rounded-full" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-display font-black text-on-surface">
                    {year}
                  </h2>
                  <span className="text-sm font-bold text-on-surface-variant/50 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/10">
                    {yearData.count} 篇
                  </span>
                </div>

                {/* Months */}
                <div className="space-y-10">
                  {sortedMonths.map((month, monthIndex) => {
                    const monthPosts = months[month];
                    const monthName = format(new Date(2024, Number(month) - 1), "MMMM");

                    return (
                      <div key={month}>
                        {/* Month label */}
                        <motion.div
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: yearIndex * 0.12 + monthIndex * 0.06 }}
                          className="flex items-center gap-3 mb-4"
                        >
                          <div className="w-3 h-3 rounded-full bg-outline-variant/40 shrink-0 -ml-[30px] md:-ml-[34px] ring-4 ring-background" />
                          <h3 className="text-lg font-bold text-on-surface-variant/80">
                            {monthName}
                          </h3>
                          <span className="text-xs font-medium text-on-surface-variant/40">
                            {monthPosts.length} 篇
                          </span>
                        </motion.div>

                        {/* Post list */}
                        <div className="space-y-4">
                          {monthPosts.map((post, postIndex) => (
                            <motion.div
                              key={post.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: yearIndex * 0.12 + monthIndex * 0.06 + postIndex * 0.04 }}
                            >
                              <Link
                                to={`/post/${post.slug}`}
                                className="group block p-4 lg:p-5 rounded-2xl bg-surface-container/60 hover:bg-surface-container border border-outline-variant/10 hover:border-primary/20 transition-all duration-300"
                              >
                                <div className="flex items-start gap-4">
                                  {/* Date badge */}
                                  <div className="shrink-0 flex flex-col items-center min-w-[52px] px-3 py-2 rounded-xl bg-surface text-center">
                                    <span className="text-xs font-bold text-primary">
                                      {format(new Date(post.date), "MMM")}
                                    </span>
                                    <span className="text-lg font-black text-on-surface leading-none">
                                      {format(new Date(post.date), "d")}
                                    </span>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-base lg:text-lg font-bold text-on-surface group-hover:text-primary transition-colors duration-200 line-clamp-1 mb-1">
                                      {post.title}
                                    </h4>
                                    {post.excerpt && (
                                      <p className="text-sm text-on-surface-variant/60 leading-relaxed line-clamp-2">
                                        {post.excerpt}
                                      </p>
                                    )}
                                  </div>

                                  {/* Category tag — visible on md+ */}
                                  {post.category && (
                                    <span className="hidden md:inline-block shrink-0 px-3 py-1 text-xs font-bold rounded-full bg-primary-container/60 text-on-primary-container mt-0.5">
                                      {post.category.name}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {settings.sidebar_layout !== 'negative' && <Sidebar />}
    </div>
  );
}
