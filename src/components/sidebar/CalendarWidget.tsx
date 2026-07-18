import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CalendarWidget() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: (number | null)[][] = [];

    let currentWeek: (number | null)[] = [];
    // Fill leading empty cells
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }
    return weeks;
  }, [year, month]);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const weekHeaders = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="bg-surface-container rounded-[var(--radius-md3)] p-6 shadow-sm border border-outline-variant/10">
      <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-secondary rounded-full"></span>
        日历
      </h3>

      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-on-surface">
          {year}年{month + 1}月
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-surface text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <table className="w-full text-center">
        <thead>
          <tr>
            {weekHeaders.map((h, i) => (
              <th key={i} className="text-xs font-bold text-on-surface-variant py-1.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarDays.map((week, wi) => (
            <tr key={wi}>
              {week.map((d, di) => (
                <td key={di} className="py-1">
                  {d !== null ? (
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                        isToday(d)
                          ? "bg-primary text-on-primary font-bold"
                          : "text-on-surface hover:bg-surface"
                      }`}
                    >
                      {d}
                    </span>
                  ) : (
                    <span className="w-7 h-7" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
