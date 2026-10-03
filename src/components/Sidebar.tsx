import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquarePlus,
  Users,
  Globe,
  Settings,
  Sparkles,
  UserCheck,
  ChevronDown,
  Circle,
  UserPlus
} from 'lucide-react';
import { Conversation, Story, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { StoryBar } from './StoryBar';
import { DEMO_USERS } from '../services/sampleData';
import { subscribeToAllUsers } from '../services/chatService';
import { getConversationDisplay } from '../utils/conversationHelper';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  stories: Story[];
  onOpenStory: (index: number) => void;
  onOpenCreateStory: () => void;
  onOpenNoteModal: () => void;
  onOpenProfileDrawer: () => void;
  onOpenAuthModal: () => void;
  onStartDirectChat: (user: UserProfile) => void;
  onOpenSearchAccountsModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  stories,
  onOpenStory,
  onOpenCreateStory,
  onOpenNoteModal,
  onOpenProfileDrawer,
  onOpenAuthModal,
  onStartDirectChat,
  onOpenSearchAccountsModal
}) => {
  const { profile, user, activeCount, activePresences } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'bridges' | 'direct'>('all');
  const [showNewChatDropdown, setShowNewChatDropdown] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToAllUsers(profile.uid, (users) => {
      setRegisteredUsers(users);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    // Filter by tab
    if (filterTab === 'bridges' && c.type !== 'group') return false;
    if (filterTab === 'direct' && c.type !== 'direct') return false;

    // Filter by search
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = (c.title || '').toLowerCase().includes(query);
    const lastMsgMatch = (c.lastMessageText || '').toLowerCase().includes(query);
    return titleMatch || lastMsgMatch;
  });

  // Filter registered users matching search
  const matchingAccounts = searchQuery.trim()
    ? registeredUsers.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
          (u.displayName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.location || '').toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      {/* 1. Header with Logo, Active Counter, and Profile Avatar */}
      <div className="p-3.5 px-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <span className="text-base font-black tracking-tighter">ip</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
                ipin <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Messenger</span>
              </h1>
            </div>

            {/* Real-time active status counter (requested: "show who is active like 1 active 2 active 3 active etc all real time") */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {activeCount} active now
              </span>
            </div>
          </div>
        </div>

        {/* User avatar & New Chat Actions */}
        <div className="flex items-center gap-1.5 relative">
          {/* Find Friends / Search Account Name Button */}
          <button
            type="button"
            onClick={onOpenSearchAccountsModal}
            className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors"
            title="Search real friends by account name"
          >
            <UserPlus size={19} />
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => setShowNewChatDropdown(!showNewChatDropdown)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="Start direct conversation"
          >
            <MessageSquarePlus size={19} />
          </button>

          {/* New Chat Dropdown */}
          {showNewChatDropdown && (
            <div className="absolute top-12 right-0 z-40 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-2 animate-in zoom-in-95 duration-150">
              <p className="text-[11px] font-bold text-zinc-400 px-3 py-1.5 uppercase tracking-wider">
                Direct Message Active User
              </p>
              <div className="space-y-1">
                {DEMO_USERS.filter((u) => u.uid !== profile?.uid).map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => {
                      onStartDirectChat(user);
                      setShowNewChatDropdown(false);
                    }}
                    className="w-full p-2 rounded-xl flex items-center gap-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
                  >
                    <div className="relative">
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">{user.location}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User Avatar with Profile trigger */}
          <button
            type="button"
            onClick={onOpenProfileDrawer}
            className="relative cursor-pointer group"
            title="View & Edit Profile"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-500/40 group-hover:ring-emerald-500 transition-all">
              <img
                src={profile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={profile?.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
          </button>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="px-3.5 py-2.5">
        <div className="relative flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl px-3 py-2 text-zinc-400 focus-within:text-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all">
          <Search size={16} className="shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels or messages..."
            className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Stories & Notes Strip */}
      <StoryBar
        stories={stories}
        onOpenStory={onOpenStory}
        onOpenCreateStory={onOpenCreateStory}
        onOpenNoteModal={onOpenNoteModal}
        onSelectUserDirectChat={onStartDirectChat}
      />

      {/* 4. Filter Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-3.5 pt-2 gap-1 text-xs">
        <button
          onClick={() => setFilterTab('all')}
          className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors ${
            filterTab === 'all'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterTab('bridges')}
          className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1 ${
            filterTab === 'bridges'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Globe size={13} />
          Global Bridges
        </button>
        <button
          onClick={() => setFilterTab('direct')}
          className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors flex items-center gap-1 ${
            filterTab === 'direct'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Users size={13} />
          Direct DMs
        </button>
      </div>

      {/* 5. Conversations & Search Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-900">
        {/* If searching, show matching registered Firebase accounts */}
        {searchQuery.trim() && (
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Accounts Matching "{searchQuery}" ({matchingAccounts.length})
              </span>
              <button
                type="button"
                onClick={onOpenSearchAccountsModal}
                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Advanced Search
              </button>
            </div>

            {matchingAccounts.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-1">
                No accounts found. Click "Advanced Search" to search all Firebase users.
              </p>
            ) : (
              <div className="space-y-1.5">
                {matchingAccounts.slice(0, 4).map((account) => {
                  const isOnline = activePresences.some((p) => p.uid === account.uid && p.isOnline);
                  return (
                    <div
                      key={account.uid}
                      className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={account.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${account.uid}`}
                            alt={account.displayName}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white dark:ring-zinc-900 ${
                              isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {account.displayName}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">{account.location || account.email}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onStartDirectChat(account);
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold shrink-0"
                      >
                        Chat
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {filteredConversations.length === 0 && !searchQuery.trim() ? (
          <div className="p-8 text-center text-zinc-400 text-xs">
            No chats found. Use the Search or Find Friends icon above to connect!
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isGroup = conv.type === 'group';
            const displayInfo = getConversationDisplay(conv, profile?.uid, registeredUsers);
            const isOtherOnline = displayInfo.otherUser
              ? activePresences.some((p) => p.uid === displayInfo.otherUser!.uid && p.isOnline)
              : true;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex items-center gap-3 p-3 px-3.5 cursor-pointer transition-colors relative ${
                  isActive
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                }`}
              >
                {/* Active Indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full" />
                )}

                {/* Avatar with online badge */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-xs">
                    <img
                      src={displayInfo.avatar}
                      alt={displayInfo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Status dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-zinc-950 ${
                      isOtherOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                    }`}
                  />
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3
                      className={`text-xs font-bold truncate ${
                        isActive
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {displayInfo.title}
                    </h3>
                    {conv.lastMessageTime && (
                      <span className="text-[10px] text-zinc-400 shrink-0 ml-1">
                        {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {conv.lastMessageSender && (
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 mr-1">
                        {conv.lastMessageSender.split(' ')[0]}:
                      </span>
                    )}
                    {conv.lastMessageText || 'No messages yet'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
