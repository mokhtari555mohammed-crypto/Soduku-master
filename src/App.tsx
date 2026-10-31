import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { LevelSelect } from './components/LevelSelect';
import { OfflineGame } from './components/OfflineGame';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MultiplayerGame } from './components/MultiplayerGame';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { SettingsModal } from './components/SettingsModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { screen, toastMessage } = useGame();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-indigo-500 selection:text-white pb-10">
      <Header />

      <main className="flex-1 flex flex-col">
        {screen === 'home' && <HomeScreen />}
        {screen === 'offline_levels' && <LevelSelect />}
        {screen === 'offline_game' && <OfflineGame />}
        {screen === 'multiplayer_lobby' && <MultiplayerLobby />}
        {screen === 'multiplayer_game' && <MultiplayerGame />}
        {screen === 'leaderboard' && <LeaderboardView />}
        {screen === 'profile' && <ProfileView />}
        {screen === 'settings' && <SettingsModal />}
      </main>

      {/* Floating Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm px-4 py-2.5 rounded-2xl bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 shadow-xl backdrop-blur-md text-xs font-bold flex items-center gap-2 border border-slate-700/50 dark:border-slate-300 animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <MainContent />
    </GameProvider>
  );
}
