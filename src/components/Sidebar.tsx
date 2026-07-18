import { motion } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { ProfileWidget } from "./sidebar/ProfileWidget";
import { CategoriesWidget } from "./sidebar/CategoriesWidget";
import { TagsWidget } from "./sidebar/TagsWidget";
import { RecentPostsWidget } from "./sidebar/RecentPostsWidget";
import { TrendingPostsWidget } from "./sidebar/TrendingPostsWidget";
import { StatsWidget } from "./sidebar/StatsWidget";
import { SearchWidget } from "./sidebar/SearchWidget";
import { ClockWidget } from "./sidebar/ClockWidget";
import { CalendarWidget } from "./sidebar/CalendarWidget";
import { CustomHtmlWidget } from "./sidebar/CustomHtmlWidget";

// Widget registry: maps widget IDs to their components and metadata
const WIDGET_REGISTRY: Record<string, {
  component: React.ComponentType;
  label: string;
  description: string;
}> = {
  profile:    { component: ProfileWidget,       label: "个人资料",     description: "显示头像、简介、社交链接和个人信息" },
  search:     { component: SearchWidget,        label: "搜索框",       description: "提供文章搜索功能" },
  clock:      { component: ClockWidget,         label: "时钟",         description: "实时显示当前时间和日期" },
  calendar:   { component: CalendarWidget,      label: "日历",         description: "月历视图，可切换月份" },
  categories: { component: CategoriesWidget,    label: "分类列表",     description: "显示所有文章分类及文章数量" },
  tags:       { component: TagsWidget,          label: "标签云",       description: "以标签云形式展示所有标签" },
  recent:     { component: RecentPostsWidget,   label: "最新文章",     description: "显示最近发布的文章列表" },
  trending:   { component: TrendingPostsWidget, label: "热门文章",     description: "按浏览量排序的热门文章" },
  stats:      { component: StatsWidget,         label: "站点统计",     description: "展示文章数、评论数、浏览量等统计" },
  custom_html:{ component: CustomHtmlWidget,    label: "自定义HTML",   description: "插入自定义HTML、广告代码、嵌入内容等" },
};

// Default widget order if nothing configured
const DEFAULT_WIDGETS = ["profile", "search", "categories", "tags", "recent", "trending", "stats"];

export function Sidebar() {
  const { settings } = useSettings();

  // Parse sidebar_widgets setting: comma-separated widget IDs
  let activeWidgets: string[] = DEFAULT_WIDGETS;
  if (settings.sidebar_widgets) {
    activeWidgets = settings.sidebar_widgets
      .split(",")
      .map(s => s.trim())
      .filter(id => WIDGET_REGISTRY[id]);
  }

  // Filter to only registered widgets and build delay index
  const widgets = activeWidgets.filter(id => WIDGET_REGISTRY[id]);

  if (widgets.length === 0) return null;

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
      {widgets.map((id, index) => {
        const Widget = WIDGET_REGISTRY[id].component;
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Widget />
          </motion.div>
        );
      })}
    </aside>
  );
}

// Export registry for admin settings use
export { WIDGET_REGISTRY, DEFAULT_WIDGETS };
