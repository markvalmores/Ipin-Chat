import React, { useEffect, useState } from 'react';
import { Globe, Sparkles, Shield, ArrowRight } from 'lucide-react';

interface TitleScreenProps {
  onProceed: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onProceed }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'o' || event.key === 'O') {
        event.preventDefault();
        triggerProceed();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerProceed = () => {
    if (isTransitioning) return;
    setIsPressing(true);
    setIsTransitioning(true);
    setTimeout(() => {
      onProceed();
    }, 400);
  };

  return (
    <div
      onClick={triggerProceed}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white cursor-pointer select-none overflow-hidden transition-all duration-500 ${
        isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative subtle grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* Central Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 animate-pulse transition duration-1000" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 flex items-center justify-center text-4xl shadow-2xl ring-2 ring-emerald-400/50">
            <span>🟢</span>
          </div>
        </div>

        {/* Title Headline (Requested: "Welcome to ipin Chat") */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-emerald-200 drop-shadow-md">
          Welcome to ipin Chat
        </h1>

        <p className="text-sm sm:text-base text-emerald-300/80 font-medium mt-3 max-w-md leading-relaxed">
          Cross-border social messenger bridging China & the world with real-time conversations, rich media, and zero restrictions.
        </p>

        {/* Interactive "Press O to proceed" Key & Prompt */}
        <div className="mt-12 flex flex-col items-center gap-4">
          {/* Keycap Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerProceed();
            }}
            className={`group relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl transition-all duration-200 transform ${
              isPressing
                ? 'scale-90 bg-emerald-400 shadow-emerald-400/50'
                : 'hover:scale-105 active:scale-95 shadow-xl hover:shadow-emerald-500/30'
            } bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-emerald-500/50 hover:border-emerald-400 shadow-2xl`}
          >
            {/* Subtle inner highlight */}
            <div className="absolute top-1 inset-x-2 h-1/3 bg-white/10 rounded-t-2xl pointer-events-none" />

            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-300 group-hover:text-emerald-300">
              O
            </span>

            {/* Ripple ping indicator */}
            <span className="absolute -inset-1 rounded-3xl border border-emerald-400/40 animate-ping pointer-events-none opacity-50" />
          </button>

          {/* Requested prompt: "please press O to proceed" */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-base sm:text-lg font-bold tracking-wide text-emerald-400 animate-pulse uppercase">
              please press O to proceed
            </p>
            <p className="text-xs text-zinc-500">
              (Press <span className="text-emerald-400 font-mono font-bold">O</span> on your keyboard or tap above to enter)
            </p>
          </div>
        </div>

        {/* Cross-border badges */}
        <div className="mt-14 flex items-center justify-center gap-4 text-xs text-zinc-400 font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <Globe size={13} />
            Global-China Route
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Shield size={13} />
            Firebase Real-Time
          </span>
        </div>
      </div>
    </div>
  );
};
