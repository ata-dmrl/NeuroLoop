import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApplyPreferences } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import Dashboard from '@/pages/Dashboard';
import DailyTraining from '@/pages/DailyTraining';
import GamePlay from '@/pages/GamePlay';
import Games from '@/pages/Games';
import NotFound from '@/pages/NotFound';
import Profile from '@/pages/Profile';
import Progress from '@/pages/Progress';
import Settings from '@/pages/Settings';

export default function App() {
  useApplyPreferences();
  const reduced = useAppStore((s) => s.settings.reducedMotion);

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/games" element={<Games />} />
            <Route path="/daily-training" element={<DailyTraining />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Oyun ekranı: dikkat dağıtıcı gezinme olmadan tam odak */}
          <Route path="/games/:gameId" element={<GamePlay />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
