import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { GameId } from '@shared/types';
import { GameRunner, type DailyInfo } from '@/components/game/GameRunner';
import { getGameModule } from '@/games/registry';
import { useAppStore } from '@/store/useAppStore';
import { dayKey } from '@/utils/date';
import NotFound from './NotFound';

export default function GamePlay() {
  const { gameId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const plan = useAppStore((s) => s.daily[dayKey()]);
  const gameModule = getGameModule(gameId);
  const wantsDaily = params.get('daily') === '1';

  const daily = useMemo<DailyInfo | null>(() => {
    if (!gameModule || !wantsDaily || !plan || !plan.games.includes(gameModule.meta.id)) return null;
    const id = gameModule.meta.id;
    return {
      index: plan.games.indexOf(id),
      total: plan.games.length,
      next: plan.games.find((g) => g !== id && plan.completedGames[g] === undefined) ?? null,
    };
  }, [gameModule, wantsDaily, plan]);

  if (!gameModule) return <NotFound />;

  const exit = () => navigate(daily ? '/daily-training' : '/games');

  return (
    <>
      <a href="#content" className="skip-link visually-hidden">
        Oyuna geç
      </a>
      <GameRunner
        key={gameModule.meta.id}
        gameModule={gameModule}
        daily={daily}
        onExit={exit}
        onNextDaily={(next: GameId) => navigate(`/games/${next}?daily=1`)}
        onFinishDaily={() => navigate('/daily-training')}
      />
    </>
  );
}
