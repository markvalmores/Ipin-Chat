import React, { useState } from 'react';
import {
  X,
  Users,
  Crown,
  Shield,
  UserPlus,
  Copy,
  Check,
  CheckCheck,
  MessageSquare,
  Globe,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Conversation, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../services/sampleData';
import { addMembersToGroupChat } from '../services/chatService';

interface ChannelMembersDrawerProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
  onSelectUserChat: (user: UserProfile) => void;
  onInspectUser: (user: UserProfile) => void;
  registeredUsers: UserProfile[];
}

export const ChannelMembersDrawer: React.FC<ChannelMembersDrawerProps> = ({
  conversation,
  isOpen,
  onClose,
  onSelectUserChat,
  onInspectUser,
  registeredUsers
}) => {
  const { profile, activePresences } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  // Pool all users
  const allUsersMap = new Map<string, UserProfile>();
  DEMO_USERS.forEach((u) => allUsersMap.set(u.uid, u));
  registeredUsers.forEach((u) => allUsersMap.set(u.uid, u));
  if (profile) allUsersMap.set(profile.uid, profile);

  // Group members into roles
  const creatorId = conversation.creatorId || conversation.participantIds[0];
  const participantIds = conversation.participantIds || [];

  const members: (UserProfile & { isCreator: boolean; isOnline: boolean })[] = [];

  participantIds.forEach((uid) => {
    const user = allUsersMap.get(uid);
    if (user) {
      const isOnline = activePresences.some((p) => p.uid === uid && p.isOnline);
      members.push({
        ...user,
        isCreator: uid === creatorId,
        isOnline: isOnline || uid === profile?.uid
      });
    }
  });

  // If list is small or this is a large community channel, add simulated active participants
  const totalDisplayCount = conversation.memberCount || Math.max(members.length, 2);

  const creators = members.filter((m) => m.isCreator);
  const onlineMembers = members.filter((m) => !m.isCreator && m.isOnline);
  const offlineMembers = members.filter((m) => !m.isCreator && !m.isOnline);

  const inviteLink = `https://${conversation.inviteCode || `ipin.chat/gc/${conversation.id}`}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleQuickAddMembers = async (count: number) => {
    setIsAdding(true);
    try {
      await addMembersToGroupChat(conversation.id, [], count);
    } finally {
      setIsAdding(false);
      setShowAddMemberModal(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 sm:w-88 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 px-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
        <div>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[190px]">
              {conversation.title}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
            👥 {totalDisplayCount} / 1,000 members
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
        >
          <X size={18} />
        </button>
      </div>

      {/* Invite Link Card */}
      <div className="p-3 mx-4 my-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <Globe size={13} />
            Channel Invite Link
          </span>
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
          >
            {copiedLink ? <CheckCheck size={12} /> : <Copy size={12} />}
            <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <p className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 truncate bg-white/70 dark:bg-zinc-900/60 px-2 py-1 rounded-lg border border-emerald-500/10">
          {inviteLink}
        </p>
      </div>

      {/* Member Lists (Discord Style) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {/* Creator / Server Owner */}
        {creators.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1">
              <Crown size={12} />
              Owner & Admins — {creators.length}
            </p>
            <div className="space-y-1">
              {creators.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors group cursor-pointer"
                  onClick={() => onInspectUser(u)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-500/50 shrink-0">
                      <img
                        src={u.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.displayName}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {u.displayName}
                        </span>
                        <Crown size={11} className="text-amber-500 shrink-0" />
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate block">{u.location || 'Member'}</span>
                    </div>
                  </div>

                  {u.uid !== profile?.uid && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUserChat(u);
                        onClose();
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-opacity"
                      title="Direct Message"
                    >
                      <MessageSquare size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Members */}
        {onlineMembers.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
              Online — {onlineMembers.length}
            </p>
            <div className="space-y-1">
              {onlineMembers.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors group cursor-pointer"
                  onClick={() => onInspectUser(u)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                      <img
                        src={u.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.displayName}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                        {u.displayName}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate block">{u.location || 'Active'}</span>
                    </div>
                  </div>

                  {u.uid !== profile?.uid && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUserChat(u);
                        onClose();
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-opacity"
                      title="Direct Message"
                    >
                      <MessageSquare size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Offline — {offlineMembers.length}
            </p>
            <div className="space-y-1">
              {offlineMembers.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors group cursor-pointer opacity-75 hover:opacity-100"
                  onClick={() => onInspectUser(u)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden grayscale shrink-0">
                      <img
                        src={u.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate block">
                        {u.displayName}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate block">{u.location || 'Offline'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Invite & Boost Capacity Bar */}
      <div className="p-3 px-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
        <button
          onClick={() => setShowAddMemberModal(!showAddMemberModal)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <UserPlus size={14} />
          <span>Invite & Grow Channel</span>
        </button>

        {showAddMemberModal && (
          <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-1.5 animate-in zoom-in-95 duration-100 text-xs">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-[11px]">
              Boost Channel Size (Up to 1,000 members):
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 50, 100, 250, 500].map((num) => (
                <button
                  key={num}
                  disabled={isAdding}
                  onClick={() => handleQuickAddMembers(num)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-emerald-500 hover:text-white font-mono text-[10px] font-bold transition-colors"
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
