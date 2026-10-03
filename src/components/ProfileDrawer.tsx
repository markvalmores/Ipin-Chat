import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Video,
  Upload,
  Globe,
  MapPin,
  Mail,
  Shield,
  LogOut,
  Sparkles,
  KeyRound,
  Check,
  Film,
  Play,
  Tv,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../services/sampleData';
import { BannerMedia } from './BannerMedia';
import { isYouTubeUrl, extractYouTubeId } from '../utils/youtube';
import { storeMediaBlob, compressImageForUpload } from '../utils/mediaStore';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal
}) => {
  const {
    profile,
    user,
    isDemoMode,
    updateProfileData,
    signOutUser,
    resetPassword,
    switchDemoUser
  } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [bannerURL, setBannerURL] = useState(profile?.bannerURL || '');
  const [bannerType, setBannerType] = useState<'image' | 'video' | 'youtube'>(
    profile?.bannerType || (isYouTubeUrl(profile?.bannerURL) ? 'youtube' : 'image')
  );
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [status, setStatus] = useState<'online' | 'away' | 'offline'>(profile?.status || 'online');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !profile) return null;

  // Handle avatar upload (JPG, PNG, GIF)
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoURL(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle banner upload (PNG, JPG, GIF, MP4 from user device!)
  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isVideoFile = ext === 'mp4' || file.type.startsWith('video/');

    if (isVideoFile) {
      // Real MP4 video file uploaded from user device!
      const objectUrl = URL.createObjectURL(file);
      await storeMediaBlob(`user_banner_video_${profile.uid}`, file);
      setBannerURL(objectUrl);
      setBannerType('video');
      setFeedback('Device MP4 video loaded! Click "Save Profile" to apply your motion banner.');
      setTimeout(() => setFeedback(null), 4000);
    } else {
      // Image banner
      const compressedDataUrl = await compressImageForUpload(file);
      setBannerURL(compressedDataUrl);
      setBannerType('image');
      setFeedback('Image banner loaded! Click "Save Profile" to apply.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalBannerURL = bannerURL.trim();
      const finalBannerType = isYouTubeUrl(finalBannerURL)
        ? 'youtube'
        : bannerType;

      // If user uploaded a local device MP4 file, reference it safely
      if (finalBannerType === 'video' && finalBannerURL.startsWith('blob:')) {
        finalBannerURL = `local_mp4:user_banner_video_${profile.uid}`;
      }

      await updateProfileData({
        displayName: displayName.trim() || profile.displayName,
        location: location.trim(),
        bio: bio.trim(),
        bannerURL: finalBannerURL,
        bannerType: finalBannerType,
        photoURL: photoURL.trim(),
        status
      });
      setIsEditing(false);
      setFeedback('Profile & MP4 Motion Banner updated successfully!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback(`Error: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile.email) return;
    try {
      await resetPassword(profile.email);
      setFeedback(`Password reset email sent to ${profile.email}`);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const isCurrentBannerYouTube = Boolean(extractYouTubeId(profile.bannerURL) || profile.bannerType === 'youtube');
  const isCurrentBannerMp4 = profile.bannerType === 'video' || profile.bannerURL?.endsWith('.mp4');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
        {/* Banner Cover with YouTube Links as MP4 video, Direct MP4 Video, or Image Support */}
        <div className="relative w-full h-48 bg-zinc-950 overflow-hidden">
          <BannerMedia
            bannerURL={profile.bannerURL}
            bannerType={profile.bannerType}
            className="w-full h-full"
          />

          {/* Banner format badge */}
          {isCurrentBannerYouTube && (
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
              <Tv size={12} className="text-white" />
              <span>YouTube Video Banner • Auto-Looping</span>
            </div>
          )}

          {!isCurrentBannerYouTube && isCurrentBannerMp4 && (
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
              <Film size={12} className="text-emerald-400" />
              <span>MP4 Motion Banner • Auto-Looping</span>
            </div>
          )}

          {/* Top Back to Chat Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md text-xs font-bold shadow-lg transition-all active:scale-95"
            title="Back to Chat"
          >
            <ChevronLeft size={16} />
            <span>Back to Chat</span>
          </button>

          {/* Top right action buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            {isEditing && (
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                title="Upload Banner File (PNG, JPG, GIF, MP4)"
              >
                <Camera size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
              title="Close Profile"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hidden inputs for uploads */}
        <input
          type="file"
          ref={avatarInputRef}
          onChange={handleAvatarFile}
          accept="image/png,image/gif,image/jpeg,image/bmp,image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={bannerInputRef}
          onChange={handleBannerFile}
          accept="image/png,image/gif,image/jpeg,image/bmp,image/*,video/mp4,video/*,.mp4,.png,.jpg,.gif"
          className="hidden"
        />

        {/* Profile Card Header */}
        <div className="relative px-6 pb-4">
          <div className="flex justify-between items-end -mt-14 mb-3">
            {/* Avatar (JPG, PNG, GIF) */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-xl bg-zinc-200">
                <img
                  src={isEditing ? photoURL : (profile.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Upload avatar (JPG, PNG, GIF)"
                >
                  <Camera size={20} />
                </button>
              )}

              {/* Status Indicator */}
              <div
                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                  profile.status === 'online'
                    ? 'bg-emerald-500'
                    : profile.status === 'away'
                    ? 'bg-amber-500'
                    : 'bg-zinc-400'
                }`}
              />
            </div>

            {/* Edit / Save Toggle */}
            <button
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setDisplayName(profile.displayName);
                  setLocation(profile.location || '');
                  setBio(profile.bio || '');
                  setBannerURL(profile.bannerURL || '');
                  setBannerType(profile.bannerType || 'image');
                  setPhotoURL(profile.photoURL || '');
                  setStatus(profile.status || 'online');
                  setIsEditing(true);
                }
              }}
              className="px-4 py-1.5 rounded-full border border-emerald-600 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* User Details */}
          {!isEditing ? (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {profile.displayName}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  ipin Verified
                </span>
              </div>

              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                <Mail size={12} />
                <span>{profile.email}</span>
              </p>

              {profile.location && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-emerald-500" />
                  <span>{profile.location}</span>
                </p>
              )}

              {/* Bio */}
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-3 leading-relaxed">
                {profile.bio || 'Exploring the world through ipin Messenger.'}
              </p>

              {/* Current Note */}
              {profile.note && (
                <div className="mt-4 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-emerald-500/20 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-lg">
                    {profile.noteEmoji || '💭'}
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                      Current Note
                    </span>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      "{profile.note}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Editing form */
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Location (e.g. Shanghai, Beijing, New York)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Profile Banner Cover (YouTube Link, MP4 Video or Image)
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Auto-Loops Forever
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bannerURL}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBannerURL(val);
                      if (isYouTubeUrl(val)) {
                        setBannerType('youtube');
                      } else if (val.endsWith('.mp4') || val.includes('.mp4?')) {
                        setBannerType('video');
                      }
                    }}
                    placeholder="Paste YouTube link (https://youtube.com/watch?v=...) or MP4 video URL"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500"
                  />
                  <select
                    value={bannerType}
                    onChange={(e) => setBannerType(e.target.value as any)}
                    className="px-2 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="youtube">YouTube Video</option>
                    <option value="video">MP4 Video</option>
                    <option value="image">Image</option>
                  </select>
                </div>

                {/* YouTube Link preset helpers for easy testing */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400 font-medium">Try YouTube Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerURL('https://www.youtube.com/watch?v=jfKfPfyJRdk');
                      setBannerType('youtube');
                    }}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
                  >
                    🇨🇳 Lofi Beats
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerURL('https://www.youtube.com/watch?v=1ZyhQj47R60');
                      setBannerType('youtube');
                    }}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
                  >
                    🌿 Emerald Nature
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerURL('https://www.youtube.com/watch?v=V-_O7nl0Ii0');
                      setBannerType('youtube');
                    }}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
                  >
                    ⚡️ Night City
                  </button>
                </div>

                {/* Live Banner Preview inside Edit Form */}
                {bannerURL && (
                  <div className="mt-2 rounded-xl overflow-hidden h-24 border border-zinc-200 dark:border-zinc-700 relative">
                    <BannerMedia
                      bannerURL={bannerURL}
                      bannerType={bannerType}
                      className="w-full h-full"
                    />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-mono">
                      {isYouTubeUrl(bannerURL) ? 'YOUTUBE AUTO-LOOP' : bannerType.toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Direct Upload Buttons */}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-500/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Film size={14} className="text-emerald-500" />
                    <span>Upload MP4 Video from Device</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Camera size={14} />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="online">🟢 Active / Online</option>
                  <option value="away">🟡 Away</option>
                  <option value="offline">⚫️ Offline</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className="mx-6 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
            <Check size={14} className="text-emerald-500" />
            <span>{feedback}</span>
          </div>
        )}

        <hr className="my-4 border-zinc-100 dark:border-zinc-800 mx-6" />

        {/* Account and Security Section */}
        <div className="px-6 space-y-4 flex-1">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Account & Security
          </h4>

          {/* Reset Password Button */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                <KeyRound size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Password Security
                </p>
                <p className="text-[11px] text-zinc-500">Firebase Email Password Reset</p>
              </div>
            </div>
            <button
              onClick={handlePasswordReset}
              className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 font-medium"
            >
              Send Reset
            </button>
          </div>

          {/* Test Persona Quick Switcher */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                🔄 Fast Demo Persona Switch
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Test 2-way real-time chat
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.uid}
                  type="button"
                  onClick={() => switchDemoUser(demo)}
                  className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all ${
                    profile.uid === demo.uid
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500'
                  }`}
                >
                  <img
                    src={demo.photoURL}
                    alt={demo.displayName}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                  <span className="text-[11px] font-medium truncate">{demo.displayName.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sign Out / Switch to Firebase Auth */}
          <div className="pt-2 flex flex-col gap-2">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-md hover:from-emerald-700 hover:to-teal-700 flex items-center justify-center gap-2"
              >
                <Shield size={14} />
                Create Account or Sign In with Email
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signOutUser()}
                className="w-full py-2.5 rounded-2xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            )}
            {/* Back to Chat Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <ChevronLeft size={16} />
              <span>Back to Chat</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-6 text-center text-[11px] text-zinc-400">
          ipin Messenger • Cross-Border Social Bridge
        </div>
      </div>
    </div>
  );
};
