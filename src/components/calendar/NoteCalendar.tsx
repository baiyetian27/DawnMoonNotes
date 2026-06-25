// ── 纯日期工具函数 ──────────────────────────────

/** 某年某月有多少天 */
export function daysInMonth(year: number, month: number): number {
  // month: 1-12
  return new Date(year, month, 0).getDate()
}

/** 某年某月第一天是星期几（0=周日, 1=周一, ..., 6=周六） */
export function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

/** 今天的 { year, month, day } */
export function todayDate(): { year: number; month: number; day: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// ═══════════════════════════════════════════════════

interface Props {
  year: number
  month: number
  notesByDay: Map<number, number> // day → count
  selectedDay: number | null
  onDayClick: (day: number) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function NoteCalendar({
  year,
  month,
  notesByDay,
  selectedDay,
  onDayClick,
}: Props) {
  const today = todayDate()
  const isCurrentMonth =
    today.year === year && today.month === month

  const totalDays = daysInMonth(year, month)
  const startDow = firstDayOfWeek(year, month)

  // 构建日历格子：前导空白 + 当月日期
  const cells: (number | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  // 补齐到 7 的倍数（最多 6 行）
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  return (
    <div className="select-none">
      {/* 表头 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div
            key={d}
            className="text-center text-[11px] text-text-disabled py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-0.5">
        {rows.flat().map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }

          const noteCount = notesByDay.get(day) ?? 0
          const isToday = isCurrentMonth && day === today.day
          const isSelected = day === selectedDay

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDayClick(day)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg
                text-sm transition-all duration-200 relative
                ${isSelected
                  ? 'bg-primary/20 text-primary-light'
                  : isToday
                    ? 'text-primary-light ring-1 ring-primary/40'
                    : 'text-text-main hover:bg-white/5'
                }`}
            >
              <span className={isToday ? 'font-bold' : ''}>{day}</span>

              {/* 笔记圆点标记 */}
              {noteCount > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(noteCount, 3) }, (_, i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full bg-primary-light"
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
