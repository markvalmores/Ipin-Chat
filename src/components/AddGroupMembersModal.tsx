import React, { useState } from 'react';
import {
  X,
  Search,
  UserPlus,
  Check,
  Users,
  ShieldCheck,
  Globe,
  Sparkles
} from 'lucide-react';
import { Conversation, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../services/sampleData';
import { addMembersToGroupChat } from '../services/chatService';

interface AddGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  registeredUsers: UserProfile[];
  onMembersAdded?: (addedUsers: UserProfile[]) => void;
}

export const AddGroupMembersModal: React.FC<AddGroupMembersModalProps> = ({
  isOpen,
  onClose,
  conversation,
  registeredUsers,
  onMembersAdded
}) => {
  const { profile, activePresences } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Pool all available users (demo users + registered users)
  const allUsersMap = new Map<string, UserProfile>();
  DEMO_USERS.forEach((u) => allUsersMap.set(u.uid, u));
  registeredUsers.forEach((u) => allUsersMap.set(u.uid, u));

  // Current participant UIDs in this conversation
  const existingParticipantIds = new Set(conversation.participantIds || []);

  // Filter out the current user, get a unique list of candidates
  const candidateUsers: UserProfile[] = [];
  allUsersMap.forEach((u) => {
    if (u.uid !== profile?.uid) {
      candidateUsers.push(u);
    }
  });

  // Filter candidate users by search query
  const filteredUsers = candidateUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      (u.location && u.location.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const selectedUsers = candidateUsers.filter((u) => selectedUserIds.includes(u.uid));

  const handleToggleUser = (uid: string) => {
    if (existingParticipantIds.has(uid)) return; // Already in group
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleRemoveSelected = (uid: string) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== uid));
  };

  // Add selected members to the group chat
  const handleAddSelected = async () => {
    if (selectedUsers.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addMembersToGroupChat(conversation.id, selectedUsers, profile);
      onMembersAdded?.(selectedUsers);
      setSuccessToast(`Added ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''} to group!`);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to add members to group chat:', err);
      setIsSubmitting(false);
    }
  };

  // One-click direct add for a single user
  const handleDirectAddSingle = async (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (existingParticipantIds.has(user.uid) || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addMembersToGroupChat(conversation.id, [user], profile);
      onMembersAdded?.([user]);
      setSuccessToast(`Added ${user.displayName} to group!`);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to add member:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <UserPlus size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Add People to Group
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {conversation.title || 'Group Chat'} • {existingParticipantIds.size} current members
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="p-2.5 px-4 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
            <Check size={16} className="stroke-[3]" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Search input */}
        <div className="p-3 sm:px-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people by name, email, or location..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-850 focus:outline-none transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Selected chips row */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mr-1 shrink-0">
                Selected ({selectedUsers.length}):
              </span>
              {selectedUsers.map((u) => (
                <div
                  key={u.uid}
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs shrink-0 animate-in zoom-in-95 duration-100"
                >
                  <img
                    src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`}
                    alt={u.displayName}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span className="text-[11px] font-semibold truncate max-w-[100px]">{u.displayName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSelected(u.uid)}
                    className="hover:text-emerald-900 dark:hover:text-white p-0.5 rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Member Candidates List */}
        <div className="flex-1 overflow-y-auto p-3 sm:px-5 space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <Users size={32} className="mx-auto mb-2 opacity-40 text-emerald-500" />
              <p className="text-xs font-semibold">No contacts found</p>
              <p className="text-[11px] opacity-75 mt-0.5">Try searching for a different name or location</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const alreadyInGroup = existingParticipantIds.has(user.uid);
              const isSelected = selectedUserIds.includes(user.uid);
              const isOnline = activePresences.some((p) => p.uid === user.uid && p.isOnline);

              return (
                <div
                  key={user.uid}
                  onClick={() => !alreadyInGroup && handleToggleUser(user.uid)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                    alreadyInGroup
                      ? 'opacity-60 cursor-default bg-zinc-50/50 dark:bg-zinc-850/30'
                      : isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/40 cursor-pointer shadow-xs'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 cursor-pointer border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                        alt={user.displayName}
                        className="w-full h-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {user.displayName}
                        </span>
                        {user.uid.startsWith('demo_user') && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                            Global
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {user.location || user.email || 'ipin Member'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {alreadyInGroup ? (
                      <span className="text-[11px] font-semibold text-zinc-400 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                        In Group
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleDirectAddSingle(user, e)}
                          disabled={isSubmitting}
                          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
                          title={`Add ${user.displayName} directly`}
                        >
                          <UserPlus size={13} />
                          <span>Add</span>
                        </button>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all border ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                          }`}
                        >
                          {isSelected && <Check size={12} className="stroke-[3]" />}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 px-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40 gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {selectedUserIds.length === 0
              ? 'Select people to add'
              : `${selectedUserIds.length} person selected`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <UserPlus size={15} />
              <span>
                {isSubmitting
                  ? 'Adding...'
                  : selectedUserIds.length > 0
                  ? `Add ${selectedUserIds.length} to Group`
                  : 'Add to Group'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
