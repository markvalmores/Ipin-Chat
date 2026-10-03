/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Conversation, Story, UserProfile } from './types';
import {
  subscribeToConversations,
  subscribeToStories,
  getOrCreateDirectConversation,
  subscribeToAllUsers
} from './services/chatService';
import { INITIAL_PUBLIC_CHANNELS, INITIAL_STORIES, DEMO_USERS } from './services/sampleData';

import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { GlobalBridgeBanner } from './components/GlobalBridgeBanner';
import { NoteModal } from './components/NoteModal';
import { CreateStoryModal } from './components/CreateStoryModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { ProfileDrawer } from './components/ProfileDrawer';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { SearchAccountsModal } from './components/SearchAccountsModal';
import { TitleScreen } from './components/TitleScreen';
import { CreateGroupChatModal } from './components/CreateGroupChatModal';

const MessengerInner: React.FC = () => {
  const { profile, isAuthReady } = useAuth();

  const [hasProceeded, setHasProceeded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_PUBLIC_CHANNELS);
  const [activeConversationId, setActiveConversationId] = useState<string>('global-china-lounge');
  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(DEMO_USERS);

  // Modals state
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchAccountsOpen, setIsSearchAccountsOpen] = useState(false);

  // Mobile layout toggle
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Real-time conversations listener
  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToConversations(profile.uid, (list) => {
      setConversations(list);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  // Real-time all users listener
  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToAllUsers(profile.uid, (users) => {
      if (users.length > 0) setAllUsers(users);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  // Real-time stories listener
  useEffect(() => {
    const unsubscribe = subscribeToStories((loadedStories) => {
      setStories(loadedStories);
    });
    return () => unsubscribe();
  }, []);

  // 1. Title Screen: "Welcome to ipin Chat please press O to proceed"
  if (!hasProceeded) {
    return <TitleScreen onProceed={() => setHasProceeded(true)} />;
  }

  // 2. Loading state
  if (!isAuthReady) {
    return (
      <div className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 animate-pulse flex items-center justify-center text-2xl font-bold mb-3 shadow-lg shadow-emerald-500/20">
          🟢
        </div>
        <p className="text-sm font-semibold text-emerald-400">Connecting to ipin Messenger...</p>
      </div>
    );
  }

  // 3. Account creation first requirement: cannot proceed to chat without an account
  if (!profile) {
    return <AuthScreen />;
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setIsMobileChatOpen(true);
  };

  const handleStartDirectChat = async (targetUser: UserProfile) => {
    if (!profile) return;
    const directConv = await getOrCreateDirectConversation(profile, targetUser);
    setConversations((prev) => {
      if (!prev.some((c) => c.id === directConv.id)) {
        return [directConv, ...prev];
      }
      return prev;
    });
    setActiveConversationId(directConv.id);
    setIsMobileChatOpen(true);
    setIsSearchAccountsOpen(false);
  };

  const handleOpenStory = (index: number) => {
    setStoryViewerIndex(index);
    setIsStoryViewerOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Cross-Border Bridge Protocol Indicator */}
      <GlobalBridgeBanner />

      {/* Main Messenger Layout: Sidebar + Active Chat */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={`h-full ${
            isMobileChatOpen ? 'hidden md:flex' : 'flex w-full md:w-auto'
          }`}
        >
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            stories={stories}
            onOpenStory={handleOpenStory}
            onOpenCreateStory={() => setIsCreateStoryOpen(true)}
            onOpenNoteModal={() => setIsNoteModalOpen(true)}
            onOpenProfileDrawer={() => setIsProfileDrawerOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onStartDirectChat={handleStartDirectChat}
            onOpenSearchAccountsModal={() => setIsSearchAccountsOpen(true)}
            onOpenCreateGroupModal={() => setIsCreateGroupOpen(true)}
          />
        </div>

        {/* Chat Area */}
        <div
          className={`h-full flex-1 ${
            !isMobileChatOpen ? 'hidden md:flex' : 'flex w-full'
          }`}
        >
          <ChatArea
            conversation={activeConversation}
            onBackToSidebar={() => setIsMobileChatOpen(false)}
            onSelectUserChat={handleStartDirectChat}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateGroupChatModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        registeredUsers={allUsers}
        onGroupCreated={(newGroup) => {
          setConversations((prev) => [newGroup, ...prev.filter((c) => c.id !== newGroup.id)]);
          setActiveConversationId(newGroup.id);
          setIsMobileChatOpen(true);
        }}
      />

      <SearchAccountsModal
        isOpen={isSearchAccountsOpen}
        onClose={() => setIsSearchAccountsOpen(false)}
        onStartDirectChat={handleStartDirectChat}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
      />

      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
      />

      <StoryViewerModal
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        stories={stories}
        initialIndex={storyViewerIndex}
        onSelectConversation={handleSelectConversation}
      />

      <ProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        onOpenAuthModal={() => {
          setIsProfileDrawerOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MessengerInner />
    </AuthProvider>
  );
}
