import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import type { Usuario } from './types/database';
import LoadingSpinner from './components/LoadingSpinner';

function AppContent() {
  const { session, loading } = useAuth();
  const [activeChat, setActiveChat] = useState<{ chatId: string; partner: Usuario } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-800">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (activeChat) {
    return (
      <ChatScreen
        chatId={activeChat.chatId}
        partner={activeChat.partner}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return <HomeScreen onOpenChat={(chatId, partner) => setActiveChat({ chatId, partner })} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
