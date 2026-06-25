import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import AppLayout from './components/layout/AppLayout'

// 懒加载页面组件
const HomePage = lazy(() => import('./pages/HomePage'))
const NoteEditPage = lazy(() => import('./pages/NoteEditPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const GraphPage = lazy(() => import('./pages/GraphPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const RandomPage = lazy(() => import('./pages/RandomPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const TagsPage = lazy(() => import('./pages/TagsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// 页面加载占位
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/note/:noteId?" element={<NoteEditPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/random" element={<RandomPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
