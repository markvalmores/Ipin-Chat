import React, { useState } from 'react';
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
  Film
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

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, resetPassword, switchDemoUser, loginError, clearError } = useAuth();

  const [tab, setTab] = useState<'signup' | 'signin' | 'reset'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('Beijing / Global Bridge 🇨🇳 🌏');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (tab === 'signup') {
        await signUp(
          email.trim(),
          password,
          displayName.trim() || 'ipin User',
          location.trim(),
          selectedAvatar
        );
      } else if (tab === 'signin') {
        await signIn(email.trim(), password);
      } else if (tab === 'reset') {
        await resetPassword(email.trim());
        setSuccessMessage(`Password reset link sent to ${email.trim()}! Please check your inbox.`);
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
      <div className="relative z-10 w-full max-w-xl bg-zinc-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Banner Header */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white text-center relative border-b border-emerald-500/20">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center text-3xl font-black shadow-lg mb-3 ring-2 ring-white/30">
            🟢
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            ipin <span className="text-emerald-300">Messenger</span>
          </h1>
          <p className="text-xs md:text-sm text-emerald-100 mt-1 max-w-md mx-auto">
            Cross-border social interactions between China and the world. English interface with unrestricted real-time chat, photos, and videos.
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-emerald-300 text-xs font-semibold">
            <ShieldCheck size={14} />
            Account Required to Access Chat
          </div>

          {/* Tab selector */}
          <div className="flex bg-black/30 p-1.5 rounded-2xl mt-6 max-w-md mx-auto gap-1 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                tab === 'signup'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              1. Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signin');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                tab === 'signin'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              2. Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('reset');
                clearError();
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                tab === 'reset'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Forgot Password
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 md:p-8 space-y-4">
          {/* Error & Success Messages */}
          {loginError && (
            <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Your Name / Account Handle
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
                        className={`w-11 h-11 md:w-12 md:h-12 rounded-full object-cover cursor-pointer transition-all ring-3 ring-emerald-400 scale-110 shadow-lg`}
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
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
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl bg-zinc-800/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-zinc-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                'Connecting to Firebase...'
              ) : tab === 'signup' ? (
                <>
                  <span>Create Account & Proceed to Chat</span>
                  <ArrowRight size={16} />
                </>
              ) : tab === 'signin' ? (
                <>
                  <span>Sign In & Open ipin Messenger</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                'Send Password Reset Link'
              )}
            </button>
          </form>

          {/* Quick Demo Personas Alternative */}
          <div className="pt-4 border-t border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-400 mb-2.5">
              Want to test chatting between 2 accounts instantly? Choose a test persona:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.slice(0, 2).map((demo) => (
                <button
                  key={demo.uid}
                  type="button"
                  onClick={() => switchDemoUser(demo)}
                  className="p-2.5 rounded-2xl border border-zinc-700 bg-zinc-800/60 hover:border-emerald-500 flex items-center gap-2.5 text-left transition-all hover:bg-zinc-800"
                >
                  <img
                    src={demo.photoURL}
                    alt={demo.displayName}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
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
          <span>Photos (PNG/GIF/JPG/BMP/APNG)</span>
          <span>•</span>
          <span>Videos (MP4/AVI/FLV/SWF)</span>
        </div>
      </div>
    </div>
  );
};
