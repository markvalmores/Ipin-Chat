import React, { useState, useRef } from 'react';
import {
  X,
  Hash,
  Users,
  Sparkles,
  Upload,
  Search,
  Check,
  Globe,
  Sliders,
  Copy,
  CheckCheck,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { UserProfile, Conversation } from '../types';
import { useAuth } from '../context/AuthContext';
import { createGroupChat } from '../services/chatService';
import { DEMO_USERS } from '../services/sampleData';
import { compressImageForUpload } from '../utils/mediaStore';

interface CreateGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredUsers: UserProfile[];
  onGroupCreated: (newGroup: Conversation) => void;
}

const CATEGORIES = [
  { id: 'general', name: 'General Lounge', icon: '💬', defaultPrefix: 'general' },
  { id: 'bridge', name: 'Global Bridge', icon: '🌐', defaultPrefix: 'bridge' },
  { id: 'tech', name: 'Tech & Startups', icon: '⚡', defaultPrefix: 'tech' },
  { id: 'culture', name: 'Language & Culture', icon: '🏮', defaultPrefix: 'culture' },
  { id: 'gaming', name: 'Gaming & Hangout', icon: '🎮', defaultPrefix: 'gaming' },
  { id: 'travel', name: 'Travel & Food', icon: '🍜', defaultPrefix: 'food-travel' }
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150', // NY / Bridge
  'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=150', // Great Wall
  'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=150', // Lanterns
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', // AI companion
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', // Cyber Art
  'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=150'  // Panda
];

export const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  isOpen,
  onClose,
  registeredUsers,
  onGroupCreated
}) => {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].name);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [communityTargetCount, setCommunityTargetCount] = useState<number>(50);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pool all available users (demo users + registered users, excluding self)
  const availableUsers: UserProfile[] = [];
  const seenIds = new Set<string>();

  [...registeredUsers, ...DEMO_USERS].forEach((u) => {
    if (u.uid !== profile?.uid && !seenIds.has(u.uid)) {
      seenIds.add(u.uid);
      availableUsers.push(u);
    }
  });

  // Filtered members by search
  const filteredUsers = availableUsers.filter((u) => {
    if (!searchMemberQuery.trim()) return true;
    const q = searchMemberQuery.toLowerCase();
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.location || '').toLowerCase().includes(q)
    );
  });

  if (!isOpen || !profile) return null;

  // Toggle user selection
  const handleToggleUser = (uid: string) => {
    if (selectedUserIds.includes(uid)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== uid));
    } else {
      if (selectedUserIds.length >= 999) return; // max 1,000 including creator
      setSelectedUserIds((prev) => [...prev, uid]);
    }
  };

  // Select all visible users
  const handleSelectAll = () => {
    if (selectedUserIds.length === availableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(availableUsers.map((u) => u.uid));
    }
  };

  // Custom photo upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageForUpload(file);
      setSelectedAvatar(compressed);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Calculate actual total members (creator + selected + simulated community capacity)
  const actualSelectedCount = 1 + selectedUserIds.length;
  const effectiveTotalMembers = Math.min(1000, Math.max(actualSelectedCount, communityTargetCount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const newGroup = await createGroupChat(profile, {
        title: title.trim(),
        topic: topic.trim(),
        category: selectedCategory,
        avatar: selectedAvatar,
        participantIds: selectedUserIds,
        simulatedTotalMembers: effectiveTotalMembers
      });

      onGroupCreated(newGroup);
      onClose();
    } catch (err) {
      console.error('Error creating group chat:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inviteLinkPreview = `ipin.chat/gc/${(title || 'channel').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${inviteLinkPreview}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-emerald-950/20 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Hash size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Create Discord-Style Group Chat
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Community channels supporting <strong>2 up to 1,000 members</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. Category Switcher */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Channel Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    if (!title) {
                      setTitle(`${cat.defaultPrefix}-hub`);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border text-xs font-medium flex items-center gap-2 transition-all ${
                    selectedCategory === cat.name
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Channel Name and Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Channel Name *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                  #
                </span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="e.g. silicon-dragon-devs"
                  className="w-full pl-8 pr-4 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Channel Topic & Purpose
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Cross-border tech discussion and language practice"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* 3. Group Icon / Avatar Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Group Avatar / Icon
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-emerald-500 shadow-md shrink-0">
                <img src={selectedAvatar} alt="Selected Group Icon" className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(url)}
                    className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 transition-transform hover:scale-105 ${
                      selectedAvatar === url ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={url} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-emerald-500 shrink-0"
                  title="Upload custom image"
                >
                  <Upload size={16} />
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* 4. Target Member Capacity Slider (2 to 1,000 members) */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Community Capacity & Size
                </span>
              </div>
              <div className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold font-mono border border-emerald-500/30">
                {effectiveTotalMembers} / 1,000 Members
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] font-mono text-zinc-400 font-bold">2</span>
              <input
                type="range"
                min="2"
                max="1000"
                step="1"
                value={effectiveTotalMembers}
                onChange={(e) => setCommunityTargetCount(Number(e.target.value))}
                className="flex-1 accent-emerald-600 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-emerald-500 font-extrabold">1,000</span>
            </div>

            <div className="flex gap-1.5 pt-1">
              {[2, 10, 50, 100, 250, 500, 1000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCommunityTargetCount(count)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition-colors ${
                    effectiveTotalMembers === count
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                  }`}
                >
                  {count === 1000 ? '1,000 max' : count}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Add Initial Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Add Initial Members ({selectedUserIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                {selectedUserIds.length === availableUsers.length ? 'Deselect All' : 'Select All Friends'}
              </button>
            </div>

            {/* Member search bar */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={searchMemberQuery}
                onChange={(e) => setSearchMemberQuery(e.target.value)}
                placeholder="Search friends to add to group..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Members checkbox list */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-2 bg-zinc-50/50 dark:bg-zinc-900/40">
              {filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.uid);
                return (
                  <div
                    key={user.uid}
                    onClick={() => handleToggleUser(user.uid)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                        <img
                          src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={user.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {user.displayName}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{user.location || user.email}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'border border-zinc-300 dark:border-zinc-600 text-transparent'
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Channel Invite Link Generator */}
          <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate pr-2">
              <Globe size={15} className="text-emerald-500 shrink-0" />
              <span className="font-mono text-zinc-600 dark:text-zinc-300 truncate">
                {inviteLinkPreview}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1 rounded-xl bg-white dark:bg-zinc-700 hover:bg-emerald-50 text-emerald-600 dark:text-emerald-400 font-semibold text-xs shrink-0 flex items-center gap-1 border border-zinc-200 dark:border-zinc-600 transition-colors"
            >
              {copiedLink ? <CheckCheck size={13} /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Hash size={15} />
              <span>{isSubmitting ? 'Creating Group...' : `Create #${title || 'channel'} (${effectiveTotalMembers} members)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
