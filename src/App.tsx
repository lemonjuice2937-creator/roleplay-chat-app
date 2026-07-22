import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import EditProfileModal from './components/EditProfileModal';
import BastidoresView from './components/BastidoresView';
import GoogleProfileCompletion from './components/GoogleProfileCompletion';
import type { Usuario } from './types/database';
import { Loader2 } from 'lucide-react';

function needsProfileCompletion(username: string): boolean {
  return /_(gmail|hotmail|outlook|yahoo|live|icloud)\.[a-z]{2,}$/.test(username);
}

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [activeChat, setActiveChat] = useState<{ chatId: string; partner: Usuario } | null>(null);
  const [viewProfile, setViewProfile] = useState<Usuario | null>(null);
  const [viewBastidoresOf, setViewBastidoresOf] = useState<{ userId: string; userName: string } | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-800">
        <Loader2 size={32} className="animate-spin text-neon" />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-800">
        <Loader2 size={32} className="animate-spin text-neon" />
      </div>
    );
  }

  if (!profileCompleted && needsProfileCompletion(profile.username)) {
    return <GoogleProfileCompletion onComplete={() => setProfileCompleted(true)} />;
  }

  if (viewBastidoresOf) {
    return (
      <BastidoresView
        onBack={() => setViewBastidoresOf(null)}
        onImported={() => setViewBastidoresOf(null)}
        viewUserId={viewBastidoresOf.userId}
        viewUserName={viewBastidoresOf.userName}
      />
    );
  }

  if (viewProfile) {
    return (
      <UserProfileScreen
        user={viewProfile}
        onBack={() => setViewProfile(null)}
        onOpenChat={(chatId, partner) => {
          setViewProfile(null);
          setActiveChat({ chatId, partner });
        }}
        onOpenBastidores={(userId, userName) => {
          setViewProfile(null);
          setViewBastidoresOf({ userId, userName });
        }}
      />
    );
  }

  if (editingProfile) {
    return (
      <EditProfileModal
        onClose={() => setEditingProfile(false)}
        onSaved={() => setEditingProfile(false)}
      />
    );
  }

  if (activeChat) {
    return (
      <ChatScreen
        chatId={activeChat.chatId}
        partner={activeChat.partner}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return (
    <HomeScreen
      onOpenChat={(chatId, partner) => setActiveChat({ chatId, partner })}
      onViewProfile={(user) => setViewProfile(user)}
      onViewBastidores={(userId, userName) => setViewBastidoresOf({ userId, userName })}
      onEditProfile={() => setEditingProfile(true)}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
