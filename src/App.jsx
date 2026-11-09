import { useEffect, useRef } from 'react'
import { QuickSwitcher, ScreenTabs, useScreenNavigation } from './components/ScreenNav.jsx'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar, { MobileNav } from './components/Sidebar.jsx'
import { QuickLogProvider } from './components/QuickLog.jsx'
import { Celebration, GlobalToast } from './components/Feedback.jsx'
import Onboarding from './components/Onboarding.jsx'
import { HealthProvider, useHealth } from './store/Health.jsx'
import useReminders from './hooks/useReminders.js'
import Today from './pages/Today.jsx'
import Activity from './pages/Activity.jsx'
import ActivityDetail from './pages/ActivityDetail.jsx'
import LiveWorkout from './pages/LiveWorkout.jsx'
import Sleep from './pages/Sleep.jsx'
import Recovery from './pages/Recovery.jsx'
import Nutrition from './pages/Nutrition.jsx'
import Body from './pages/Body.jsx'
import Trends from './pages/Trends.jsx'
import Goals from './pages/Goals.jsx'
import Rewards from './pages/Rewards.jsx'
import Habits from './pages/Habits.jsx'
import Mindfulness from './pages/Mindfulness.jsx'
import Devices from './pages/Devices.jsx'
import Settings from './pages/Settings.jsx'
import Journal from './pages/Journal.jsx'
import Coach, { CoachLauncher } from './pages/Coach.jsx'
import Reports from './pages/Reports.jsx'

function Shell() {
  const { profile } = useHealth()
  const location = useLocation()
  const appRef = useRef(null)
  const screenNav = useScreenNavigation(appRef)
  useReminders()

  useEffect(() => {
    document.documentElement.dataset.theme = profile.theme
  }, [profile.theme])

  useEffect(() => window.scrollTo(0, 0), [location.pathname])

  return (
    <QuickLogProvider>
      <div className="app" ref={appRef}>
        <a href="#main" className="skip-link">Skip to content</a>
        <Sidebar onSearch={screenNav.openSwitcher} />
        <div className="main-col">
        <ScreenTabs onSearch={screenNav.openSwitcher} />
        <main className="content" id="main" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/activity/live" element={<LiveWorkout />} />
            <Route path="/activity/:id" element={<ActivityDetail />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/body" element={<Body />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/todos" element={<Navigate to="/habits" replace />} />
            <Route path="/mindful" element={<Mindfulness />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </main>
        </div>
        <MobileNav />
        <CoachLauncher />
      </div>
      {!profile.onboarded && <Onboarding />}
      <QuickSwitcher open={screenNav.switcherOpen} onClose={screenNav.closeSwitcher} />
      <GlobalToast />
      <Celebration />
    </QuickLogProvider>
  )
}

export default function App() {
  return (
    <HealthProvider>
      <Shell />
    </HealthProvider>
  )
}
