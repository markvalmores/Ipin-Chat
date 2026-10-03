import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  MapPin,
  Mail,
  Calendar,
  Sparkles,
  Shield,
  Film,
  Tv,
  Globe,
  Radio,
  ChevronLeft,
  Phone,
  Video,
  UserMinus
} from 'lucide-react';
import { UserProfile } from '../types';
import { BannerMedia } from './BannerMedia';
import { isYouTubeUrl } from '../utils/youtube';
import { CallModal, CallType } from './CallModal';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  isOnline: boolean;
  onClose: () => void;
  onStartChat: (user: UserProfile) => void;
  onRemoveFromGroup?: (user: UserProfile) => void;
  groupTitle?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  isOnline,
  onClose,
  onStartChat,
  onRemoveFromGroup,
  groupTitle
}) => {
  const [activeCallType, setActiveCallType] = useState<CallType | null>(null);

  if (!isOpen || !user) return null;

  const isYouTubeBanner = isYouTubeUrl(user.bannerURL) || user.bannerType === 'youtube';
  const isMp4Banner = user.bannerType === 'video' || user.bannerURL?.endsWith('.mp4');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Cover with Auto-Looping YouTube, MP4 or Image */}
        <div className="relative w-full h-48 bg-zinc-950 overflow-hidden shrink-0">
          <BannerMedia
            bannerURL={user.bannerURL}
            bannerType={user.bannerType}
            className="w-full h-full"
          />

          {/* Top Left: Back to Chat Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md text-xs font-bold shadow-lg transition-all active:scale-95"
            title="Back to Chat"
          >
            <ChevronLeft size={15} />
            <span>Back to Chat</span>
          </button>

          {/* Close button top right */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body with negative margin avatar */}
        <div className="p-6 pt-0 relative flex-1 overflow-y-auto">
          {/* Avatar and Online/Offline Status Indicator */}
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-xl bg-zinc-200 dark:bg-zinc-800">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full ring-3 ring-white dark:ring-zinc-900 flex items-center justify-center ${
                  isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
                title={isOnline ? 'Online now' : 'Offline'}
              >
                {isOnline && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </span>
            </div>

            {/* Online / Offline Status Badge */}
            <div className="mb-2">
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Online / Active Now</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold border border-zinc-200 dark:border-zinc-700">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  <span>Offline {user.lastSeen ? `• ${user.lastSeen}` : ''}</span>
                </span>
              )}
            </div>
          </div>

          {/* User Name & Bio */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {user.displayName}
              </h2>
              {user.uid.startsWith('ipin_ai') && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 text-[10px] font-bold">
                  AI FRIEND
                </span>
              )}
            </div>

            {user.email && (
              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Mail size={13} className="text-zinc-400" />
                <span>{user.email}</span>
              </p>
            )}
          </div>

          {/* Status Note Bubble if set */}
          {user.note && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 flex items-start gap-2.5">
              <span className="text-xl shrink-0">{user.noteEmoji || '💬'}</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Current Status Note
                </p>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 mt-0.5 font-medium">
                  "{user.note}"
                </p>
              </div>
            </div>
          )}

          {/* Bio & Details */}
          <div className="mt-4 space-y-3">
            {user.bio && (
              <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <p className="font-semibold text-zinc-400 text-[10px] uppercase mb-1">About</p>
                <p>{user.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              {user.location && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                  <MapPin size={15} className="text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-400">Location</p>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user.location}</p>
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                <Globe size={15} className="text-teal-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-400">Network</p>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">Global Bridge</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Voice / Video Call Action Row */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveCallType('voice')}
              className="py-2.5 px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone size={14} />
              <span>Voice Call (Enhanced)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCallType('video')}
              className="py-2.5 px-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-semibold text-xs border border-teal-500/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Video size={14} />
              <span>Video Call (Filters)</span>
            </button>
          </div>

          {/* Action Buttons: Back to Chat & Send Message */}
          <div className="mt-3 pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <ChevronLeft size={16} />
              <span>Back to Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onStartChat(user);
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <MessageSquare size={16} />
              <span>Send Message to {user.displayName.split(' ')[0]}</span>
            </button>
          </div>

          {/* Remove from Group Option */}
          {onRemoveFromGroup && (
            <button
              type="button"
              onClick={() => {
                onRemoveFromGroup(user);
                onClose();
              }}
              className="w-full mt-2 py-2 px-3 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserMinus size={14} />
              <span>Remove from {groupTitle || 'Group'}</span>
            </button>
          )}
        </div>
      </div>

      {/* In-Profile Voice & Video Call Modal */}
      {activeCallType && (
        <CallModal
          isOpen={true}
          callType={activeCallType}
          recipient={user}
          onEndCall={() => setActiveCallType(null)}
        />
      )}
    </div>
  );
};
