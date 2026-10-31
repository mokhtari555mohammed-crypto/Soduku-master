import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Languages,
  Check,
  Shield,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const SettingsModal: React.FC = () => {
  const {
    lang,
    setLang,
    theme,
    toggleTheme,
    isMuted,
    toggleSound,
    highlightDuplicates,
    setHighlightDuplicates,
    highlightSameNumbers,
    setHighlightSameNumbers,
    setScreen,
    t,
  } = useGame();

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setScreen('home');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.home}</span>
        </button>

        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          <span>{t.settingsTitle}</span>
        </h2>

        <div className="w-16" />
      </div>

      {/* Options List */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-5">
        {/* Language option */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Languages className="w-4 h-4" />
            </div>
            <div className="text-start">
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {t.language}
              </div>
              <div className="text-[11px] text-slate-500">العربية / English</div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setLang('ar');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                lang === 'ar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setLang('en');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                lang === 'en'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Theme option */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div className="text-start">
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {t.theme}
              </div>
              <div className="text-[11px] text-slate-500">
                {theme === 'dark' ? t.themeDark : t.themeLight}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? t.themeLight : t.themeDark}
          </button>
        </div>

        {/* Sound option */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </div>
            <div className="text-start">
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                {t.soundEffects}
              </div>
              <div className="text-[11px] text-slate-500">
                {isMuted ? t.soundOff : t.soundOn}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              !isMuted
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isMuted ? t.soundOff : t.soundOn}
          </button>
        </div>

        {/* Toggle: Highlight Conflicts */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="text-start">
            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {t.highlightDuplicates}
            </div>
            <div className="text-[11px] text-slate-500">
              {lang === 'ar'
                ? 'إظهار تعارض الأرقام المتكررة في نفس الصف أو العمود أو المربع 3×3'
                : 'Show red highlight on repeating numbers in row, col, or 3x3 box'}
            </div>
          </div>

          <input
            type="checkbox"
            checked={highlightDuplicates}
            onChange={(e) => setHighlightDuplicates(e.target.checked)}
            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
          />
        </div>

        {/* Toggle: Highlight Matching Numbers */}
        <div className="flex items-center justify-between py-2">
          <div className="text-start">
            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {t.highlightSameNumbers}
            </div>
            <div className="text-[11px] text-slate-500">
              {lang === 'ar'
                ? 'تمييز جميع الخانات التي تحمل نفس الرقم المختار في الشبكة'
                : 'Highlight all cells that contain the currently selected number'}
            </div>
          </div>

          <input
            type="checkbox"
            checked={highlightSameNumbers}
            onChange={(e) => setHighlightSameNumbers(e.target.checked)}
            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Rules & Guide Section */}
      <div className="p-6 rounded-3xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4 text-start">
        <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <span>{lang === 'ar' ? 'دليل وقواعد اللعب الكاملة' : 'Complete Game Guide & Rules'}</span>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">
              {lang === 'ar' ? 'الوضع الفردي (Offline Mode - 100 مستوى):' : 'Offline Mode (100 Levels):'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'يتكون من 100 مستوى متدرج الصعوبة، يبدأ من المستوى 1 شديد السهولة حتى المستوى 100 التعجيزي. كل لغز تم إنشاؤه خوارزمياً مع ضمان الحل الوحيد الصحيح. يتم حفظ تقدمك تلقائياً ويمكنك إعادة أي مستوى في أي وقت.'
                : 'Features 100 progressive levels from very easy to fiendish. Every puzzle is algorithmically verified for a single unique solution. Auto-saved so you can resume anytime.'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">
              {lang === 'ar' ? 'الوضع التنافسي الجماعي (Online Multiplayer):' : 'Online Multiplayer Rules:'}
            </h4>
            <p>
              {lang === 'ar'
                ? 'يختلف عن السودوكو التقليدية! يتنافس اللاعبان بالتناوب على شبكة واحدة. يتم إخفاء الحل كاملاً على السيرفر لمنع الغش. في دورك تختار خانة فارغة أو خاطئة وتدخل رقماً. إذا كان صحيحاً: تتحول للأخضر وتكسب نقطة وتُقفل. إذا كان خاطئاً: تظهر بالأحمر وينتقل الدور دون نقاط. اللاعب صاحب أكبر عدد من الإجابات يفوز!'
                : 'Turn-based duel on a single shared grid with server-authoritative validation. Guess correctly to lock the cell in green and get +1 point. Incorrect answers flash red and pass the turn. Player with the highest score when all cells are filled wins!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
