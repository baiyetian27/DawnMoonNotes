import { NavLink, useLocation } from 'react-router-dom'
import {
  FileText,
  LayoutDashboard,
  GitGraph,
  Calendar,
  Shuffle,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: FileText, label: '笔记' },
  { to: '/dashboard', icon: LayoutDashboard, label: '曦筑' },
  { to: '/graph', icon: GitGraph, label: '图谱' },
  { to: '/calendar', icon: Calendar, label: '日历' },
  { to: '/random', icon: Shuffle, label: '随机' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-primary-light/10">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'text-primary-light'
                  : 'text-text-disabled hover:text-text-secondary'
                }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]' : ''}
              />
              <span className="text-[10px] leading-none">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
