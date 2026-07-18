import { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon } from "lucide-react";

export function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const year = time.getFullYear();
  const month = time.getMonth() + 1;
  const day = time.getDate();
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const weekday = weekdays[time.getDay()];

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-primary rounded-full"></span>
        当前时间
      </h3>
      <div className="text-center">
        <div className="font-mono text-4xl font-black text-on-surface tracking-wider mb-2">
          {hours}<span className="animate-pulse text-primary">:</span>{minutes}<span className="text-on-surface-variant/40">:{seconds}</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
          <CalendarIcon className="w-4 h-4" />
          <span>{year}年{month}月{day}日</span>
          <span className="text-primary font-bold">{weekday}</span>
        </div>
      </div>
    </div>
  );
}
