import React, { useEffect, useState } from 'react';
import { Globe, Sparkles, Shield, ArrowRight, LogIn, UserPlus, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TitleScreenProps {
  onProceed: (tab?: 'signin' | 'signup') => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onProceed }) => {
  const { signInWithGoogle, signInWithGoogleQuick } = useAuth();
  const [isPressing, setIsPressing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [lastEmail, setLastEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ipin_last_login_email');
      if (saved) setLastEmail(saved);
    } catch (e) {}

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'o' || event.key === 'O') {
        event.preventDefault();
        triggerProceed('signin');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerProceed = (targetTab: 'signin' | 'signup' = 'signin') => {
    if (isTransitioning) return;
    setIsPressing(true);
    setIsTransitioning(true);
    setTimeout(() => {
      onProceed(targetTab);
    }, 350);
  };

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      setIsTransitioning(true);
      setTimeout(() => {
        onProceed('signin');
      }, 350);
    } catch (err) {
      triggerProceed('signin');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      onClick={() => triggerProceed('signin')}
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

        {/* Title Headline */}
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-emerald-200 drop-shadow-md">
          Welcome to ipin Chat
        </h1>

        <p className="text-sm sm:text-base text-emerald-300/80 font-medium mt-3 max-w-md leading-relaxed">
          Cross-border social messenger bridging China & the world with real-time conversations, rich media, and zero restrictions.
        </p>

        {/* Interactive "Press O to proceed" Key & Prompt */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3">
          {/* Keycap Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerProceed('signin');
            }}
            className={`group relative flex items-center justify-center w-18 h-18 sm:w-22 sm:h-22 rounded-3xl transition-all duration-200 transform ${
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
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-sm sm:text-base font-bold tracking-wide text-emerald-400 animate-pulse uppercase">
              please press O to proceed
            </p>
            <p className="text-xs text-zinc-500">
              (Press <span className="text-emerald-400 font-mono font-bold">O</span> on your keyboard or tap button to enter)
            </p>
          </div>
        </div>

        {/* Dedicated Login Option if anyone got logged out */}
        <div className="mt-7 w-full max-w-sm flex flex-col gap-2.5">
          {/* Prominent Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-100 active:scale-95 text-zinc-900 font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-zinc-200"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google Login'}</span>
          </button>

          {/* Direct Log In Option in case anyone got logged out */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerProceed('signin');
              }}
              className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-400/30"
            >
              <LogIn size={15} />
              <span>Log In to Account</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerProceed('signup');
              }}
              className="py-2.5 px-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 text-zinc-300 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700/80"
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
          </div>

          {lastEmail && (
            <p className="text-[11px] text-zinc-400">
              Previously logged in as: <span className="text-emerald-400 font-semibold">{lastEmail}</span>
            </p>
          )}
        </div>

        {/* Cross-border badges */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-zinc-400 font-mono">
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
