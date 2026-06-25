import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'
import NoteCalendar, {
  todayDate,
} from '../components/calendar/NoteCalendar'
import { getNotesByMonth, getNotesByDay } from '../services/notes'
import type { Note } from '../lib/db'

export default function CalendarPage() {
  const navigate = useNavigate()
  const today = todayDate()

  const [year, setYear] = useState(today.year)
  const [month, setMonth] = useState(today.month)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [notesByDay, setNotesByDay] = useState<Map<number, number>>(new Map())
  const [dayNotes, setDayNotes] = useState<Note[]>([])
  const [loadingMonth, setLoadingMonth] = useState(false)
  const [loadingDay, setLoadingDay] = useState(false)

  // ── 加载当月笔记统计 ─────────────────────

  useEffect(() => {
    let cancelled = false
    setLoadingMonth(true)
    setSelectedDay(null)
    setDayNotes([])

    getNotesByMonth(year, month).then(notes => {
      if (cancelled) return
      const map = new Map<number, number>()
      for (const n of notes) {
        const d = new Date(n.updatedAt).getDate()
        map.set(d, (map.get(d) ?? 0) + 1)
      }
      setNotesByDay(map)
      setLoadingMonth(false)
    })

    return () => { cancelled = true }
  }, [year, month])

  // ── 点击日期 → 加载当天笔记 ──────────────

  const handleDayClick = useCallback((day: number) => {
    setSelectedDay(day)
    setLoadingDay(true)
    getNotesByDay(year, month, day).then(notes => {
      setDayNotes(notes)
      setLoadingDay(false)
    })
  }, [year, month])

  // ── 月份导航 ────────────────────────────

  const goPrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1)
      setMonth(12)
    } else {
      setMonth(m => m - 1)
    }
  }

  const goNextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1)
      setMonth(1)
    } else {
      setMonth(m => m + 1)
    }
  }

  const goToday = () => {
    setYear(today.year)
    setMonth(today.month)
    setSelectedDay(today.day)
    handleDayClick(today.day)
  }

  // ── 格式化笔记摘要 ──────────────────────

  const totalNotesThisMonth = useMemo(() => {
    let count = 0
    for (const c of notesByDay.values()) count += c
    return count
  }, [notesByDay])

  // ═══════════════════════════════════════════════
  //  渲染
  // ═══════════════════════════════════════════════

  return (
    <div className="page-enter flex flex-col h-full">
      {/* 月份导航 */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevMonth}
          className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-main transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-text-main">
            {year} 年 {month} 月
          </h1>
          <button
            type="button"
            onClick={goToday}
            className="text-xs text-primary-light hover:underline"
          >
            今天
          </button>
        </div>

        <button
          type="button"
          onClick={goNextMonth}
          className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-main transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 月历 */}
      <div className="shrink-0 px-4">
        {loadingMonth ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-primary-light animate-spin" />
          </div>
        ) : (
          <NoteCalendar
            year={year}
            month={month}
            notesByDay={notesByDay}
            selectedDay={selectedDay}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* 当月统计 */}
      {!loadingMonth && (
        <div className="shrink-0 px-4 py-2 text-center">
          <span className="text-xs text-text-disabled">
            {totalNotesThisMonth > 0
              ? `本月共 ${totalNotesThisMonth} 篇笔记`
              : '本月暂无笔记'}
          </span>
        </div>
      )}

      {/* 分割线 */}
      <div className="mx-4 border-t border-white/6" />

      {/* 当天笔记列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {selectedDay === null ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={32} className="text-text-disabled mb-2" />
            <p className="text-text-disabled text-sm">点击日期查看当天笔记</p>
          </div>
        ) : loadingDay ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-primary-light animate-spin" />
          </div>
        ) : dayNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-text-disabled text-sm">
              {month} 月 {selectedDay} 日没有笔记
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-text-disabled mb-2">
              {month} 月 {selectedDay} 日 · {dayNotes.length} 篇笔记
            </p>
            <div className="flex flex-col gap-2">
              {dayNotes.map(note => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => navigate(`/note/${note.id}`)}
                  className="text-left glass rounded-xl p-3 hover:bg-white/5 transition-colors"
                >
                  <p className="text-sm text-text-main font-medium truncate">
                    {note.title || '无标题'}
                  </p>
                  {note.subtitle && (
                    <p className="text-xs text-text-disabled truncate mt-0.5">
                      {note.subtitle}
                    </p>
                  )}
                  <p className="text-[10px] text-text-disabled mt-1">
                    {new Date(note.updatedAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
