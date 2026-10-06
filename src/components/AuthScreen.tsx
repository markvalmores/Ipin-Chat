import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  MapPin,
  Sparkles,
  ShieldCheck,
  Globe,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Camera,
  LogIn,
  UserPlus,
  KeyRound,
  Check,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../services/sampleData';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
];

interface AuthScreenProps {
  initialTab?: 'signin' | 'signup' | 'reset';
  onBackToTitle?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialTab = 'signin', onBackToTitle }) => {
  const { signIn, signUp, signInWithGoogle, signInWithGoogleQuick, resetPassword, switchDemoUser, loginError, clearError } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup' | 'reset'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('Beijing / Global Bridge 🇨🇳 🌏');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('ipin_last_login_email');
      if (savedEmail && !email) {
        setEmail(savedEmail);
      }
    } catch (e) {}
  }, []);

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomAvatar(dataUrl);
      setSelectedAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleLogin = async (targetEmail = 'mdv4244@gmail.com') => {
    clearError();
    setSuccessMessage(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle(targetEmail);
    } catch (err) {
      // Fallback already performed in AuthContext
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (tab === 'signin') {
        await signIn(email.trim(), password.trim() || 'default_pass');
      } else if (tab === 'signup') {
        await signUp(
          email.trim(),
          password.trim() || 'default_pass',
          displayName.trim() || email.trim().split('@')[0] || 'ipin User',
          location.trim(),
          selectedAvatar
        );
      } else if (tab === 'reset') {
        await resetPassword(email.trim());
        setSuccessMessage(`Password reset email sent to ${email.trim()}! Please check your inbox.`);
      }
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 text-white flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-xl bg-zinc-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden my-4 animate-in fade-in duration-300">
        {/* Banner Header */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white text-center relative border-b border-emerald-500/20">
          {onBackToTitle && (
            <button
              type="button"
              onClick={onBackToTitle}
              className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md text-xs font-bold transition-all active:scale-95 cursor-pointer border border-white/10"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}

          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center text-3xl font-black shadow-lg mb-3 ring-2 ring-white/30">
            🟢
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            ipin <span className="text-emerald-300">Messenger</span>
          </h1>
          <p className="text-xs md:text-sm text-emerald-100 mt-1 max-w-md mx-auto">
            Cross-border social interactions bridging China and the world. Log in to continue your encrypted conversations and shared stories.
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-semibold">
            <ShieldCheck size={14} />
            <span>Encrypted Login & Session Sync</span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-black/30 p-1.5 rounded-2xl mt-6 max-w-md mx-auto gap-1 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'signin'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <LogIn size={15} />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'signup'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('reset');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'reset'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <KeyRound size={15} />
              <span>Reset Pass</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 md:p-8 space-y-4">
          {/* Prominent Google Sign-In Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleGoogleLogin('mdv4244@gmail.com')}
              disabled={isGoogleLoading || isLoading}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-100 active:scale-98 text-zinc-900 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 border border-zinc-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>{isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google Account'}</span>
            </button>

            <button
              type="button"
              onClick={() => signInWithGoogleQuick('mdv4244@gmail.com', 'mdv4244')}
              className="w-full py-1.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 text-[11px] text-emerald-300 hover:text-emerald-200 font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>Instant 1-Click Google Log In as <strong className="font-bold underline">mdv4244@gmail.com</strong></span>
            </button>
          </div>

          <div className="flex items-center gap-3 my-2 text-zinc-500 text-xs">
            <div className="flex-1 h-px bg-zinc-800" />
            <span>or sign in with email & password</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Error & Success Messages */}
          {loginError && (
            <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Your Name / Display Name
                  </label>
                  <div className="relative flex items-center">
                    <User size={16} className="absolute left-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Mei Ling, Alex Vance, or John Doe"
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Location
                  </label>
                  <div className="relative flex items-center">
                    <MapPin size={16} className="absolute left-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Shanghai 🇨🇳, New York 🇺🇸, London 🇬🇧"
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500"
                    />
                  </div>
                </div>

                {/* Avatar selection & upload */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Profile Picture (JPG, PNG, GIF)
                    </label>
                    <label className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1">
                      <Camera size={12} />
                      <span>Upload Custom Photo</span>
                      <input
                        type="file"
                        onChange={handleCustomAvatarUpload}
                        accept="image/png,image/gif,image/jpeg,image/*"
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2 justify-between items-center">
                    {AVATAR_PRESETS.map((av, idx) => (
                      <img
                        key={idx}
                        src={av}
                        alt="Avatar choice"
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-11 h-11 md:w-12 md:h-12 rounded-full object-cover cursor-pointer transition-all ${
                          selectedAvatar === av
                            ? 'ring-3 ring-emerald-400 scale-110 shadow-lg'
                            : 'opacity-60 hover:opacity-100 ring-1 ring-zinc-700'
                        }`}
                      />
                    ))}
                    {customAvatar && (
                      <img
                        src={customAvatar}
                        alt="Custom avatar"
                        onClick={() => setSelectedAvatar(customAvatar)}
                        className="w-11 h-11 md:w-12 md:h-12 rounded-full object-cover cursor-pointer transition-all ring-3 ring-emerald-400 scale-110 shadow-lg"
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Email Address or Username
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. mdv4244@gmail.com, alex, meiling, or your email"
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500"
                  required
                />
              </div>
            </div>

            {tab !== 'reset' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-zinc-300">
                    Password
                  </label>
                  {tab === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setTab('reset')}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3.5 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'signin' ? 'Enter any password (all credentials work)' : '••••••••'}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500"
                    required={tab === 'signup'}
                  />
                </div>
              </div>
            )}

            {tab === 'signin' && (
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                'Signing In...'
              ) : tab === 'signin' ? (
                <>
                  <LogIn size={16} />
                  <span>Log In to ipin Messenger</span>
                  <ArrowRight size={16} />
                </>
              ) : tab === 'signup' ? (
                <>
                  <UserPlus size={16} />
                  <span>Create Account & Start Chatting</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                'Send Password Reset Link'
              )}
            </button>
          </form>

          {/* Switch tab prompt */}
          <div className="text-center text-xs text-zinc-400 pt-1">
            {tab === 'signin' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup');
                    clearError();
                  }}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Create an account here
                </button>
              </p>
            ) : tab === 'signup' ? (
              <p>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    clearError();
                  }}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Log in to your account
                </button>
              </p>
            ) : (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    clearError();
                  }}
                  className="text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  Back to Log In
                </button>
              </p>
            )}
          </div>

          {/* Quick Test Personas Alternative */}
          <div className="pt-4 border-t border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-400 mb-2.5 font-medium">
              ⚡️ Fast 1-Click Test Login (All credentials guaranteed to work):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => signInWithGoogleQuick('mdv4244@gmail.com', 'mdv4244')}
                className="p-2.5 rounded-2xl border border-emerald-500/50 bg-emerald-950/30 hover:border-emerald-400 flex items-center gap-2.5 text-left transition-all hover:bg-emerald-900/40 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 ring-1 ring-emerald-400">
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
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    mdv4244 (Google)
                  </p>
                  <p className="text-[10px] text-emerald-300 truncate">Google Account</p>
                </div>
              </button>
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.uid}
                  type="button"
                  onClick={() => switchDemoUser(demo)}
                  className="p-2.5 rounded-2xl border border-zinc-700 bg-zinc-800/60 hover:border-emerald-500 flex items-center gap-2.5 text-left transition-all hover:bg-zinc-800 cursor-pointer"
                >
                  <img
                    src={demo.photoURL}
                    alt={demo.displayName}
                    className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-zinc-600"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {demo.displayName}
                    </p>
                    <p className="text-[10px] text-emerald-400 truncate">{demo.location}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer features */}
        <div className="p-4 px-6 bg-zinc-950/60 border-t border-zinc-800/80 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <Globe size={12} className="text-emerald-400" />
            China ⇄ World Bridge
          </span>
          <span>•</span>
          <span>Google & Universal Auth</span>
          <span>•</span>
          <span>Cross-Tab Sync</span>
        </div>
      </div>
    </div>
  );
};
