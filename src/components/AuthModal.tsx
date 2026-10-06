import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, MapPin, Sparkles, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../services/sampleData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup' | 'reset';
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'signin' }) => {
  const { signIn, signUp, signInWithGoogle, signInWithGoogleQuick, resetPassword, switchDemoUser, loginError, clearError } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup' | 'reset'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('Beijing / Global Bridge 🌏');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      try {
        const saved = localStorage.getItem('ipin_last_login_email');
        if (saved && !email) setEmail(saved);
      } catch (e) {}
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (tab === 'signin') {
        await signIn(email.trim(), password.trim() || 'default_pass');
        try {
          localStorage.setItem('ipin_last_login_email', email.trim());
        } catch (e) {}
        onClose();
      } else if (tab === 'signup') {
        await signUp(
          email.trim(),
          password.trim() || 'default_pass',
          displayName.trim() || 'ipin User',
          location.trim(),
          selectedAvatar
        );
        try {
          localStorage.setItem('ipin_last_login_email', email.trim());
        } catch (e) {}
        onClose();
      } else if (tab === 'reset') {
        await resetPassword(email.trim());
        setSuccessMessage(`Password reset link sent to ${email.trim()}! Please check your inbox.`);
      }
    } catch (err: any) {
      // loginError handled in context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-emerald-950/20 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Emerald Gradient */}
        <div className="p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
              🟢
            </span>
            <h3 className="text-xl font-bold">ipin Messenger</h3>
          </div>
          <p className="text-xs text-emerald-100">
            {tab === 'signin' && 'Sign in to access your cross-border chats and stories'}
            {tab === 'signup' && 'Create your Firebase account with email & password'}
            {tab === 'reset' && 'Reset your password via Firebase email verification'}
          </p>

          {/* Navigation tabs */}
          <div className="flex gap-2 mt-4 bg-black/20 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === 'signin' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === 'signup' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('reset');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === 'reset' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white'
              }`}
            >
              Reset Pass
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* One-Click Google Sign In */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={async () => {
                clearError();
                setIsLoading(true);
                try {
                  await signInWithGoogle('mdv4244@gmail.com');
                  onClose();
                } catch (e) {} finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full py-2.5 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-900 dark:text-zinc-100 font-bold text-xs shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                clearError();
                setIsLoading(true);
                try {
                  await signInWithGoogleQuick('mdv4244@gmail.com', 'mdv4244');
                  onClose();
                } catch (e) {} finally {
                  setIsLoading(false);
                }
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/20"
            >
              <Sparkles size={12} className="text-emerald-500" />
              <span>Instant 1-Click as mdv4244@gmail.com</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span>or email / username</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* Error & Success Feedback */}
          {loginError && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Display Name
                  </label>
                  <div className="relative flex items-center">
                    <User size={15} className="absolute left-3 text-zinc-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Mei Ling or Alex Carter"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Location
                  </label>
                  <div className="relative flex items-center">
                    <MapPin size={15} className="absolute left-3 text-zinc-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Shanghai 🇨🇳, New York 🇺🇸, London 🇬🇧"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Choose Profile Picture (JPG / PNG / GIF)
                  </label>
                  <div className="flex gap-2 justify-between">
                    {AVATAR_PRESETS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt="Avatar choice"
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-11 h-11 rounded-full object-cover cursor-pointer transition-all ${
                          selectedAvatar === av
                            ? 'ring-3 ring-emerald-500 scale-105 shadow-md'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Email Address or Username
              </label>
              <div className="relative flex items-center">
                <Mail size={15} className="absolute left-3 text-zinc-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. mdv4244@gmail.com, alex, or your email"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {tab !== 'reset' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setTab('reset')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock size={15} className="absolute left-3 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'signin' ? 'Enter any password (all credentials work)' : '••••••••'}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required={tab === 'signup'}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                'Processing...'
              ) : tab === 'signin' ? (
                'Sign In to ipin Messenger'
              ) : tab === 'signup' ? (
                'Create Account & Start Chatting'
              ) : (
                'Send Reset Password Email'
              )}
            </button>
          </form>

          {/* Quick Demo Personas Alternative */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] text-center text-zinc-400 mb-2 font-medium">
              ⚡️ Fast 1-Click Test Login (All credentials work):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await signInWithGoogleQuick('mdv4244@gmail.com', 'mdv4244');
                  onClose();
                }}
                className="p-2 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 hover:border-emerald-500 flex items-center gap-2 text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 ring-1 ring-emerald-400">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                    mdv4244 (Google)
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">Google User</p>
                </div>
              </button>
              {DEMO_USERS.slice(0, 3).map((demo) => (
                <button
                  key={demo.uid}
                  type="button"
                  onClick={() => {
                    switchDemoUser(demo);
                    onClose();
                  }}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:border-emerald-500 flex items-center gap-2 text-left cursor-pointer"
                >
                  <img
                    src={demo.photoURL}
                    alt={demo.displayName}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {demo.displayName}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">{demo.location}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
