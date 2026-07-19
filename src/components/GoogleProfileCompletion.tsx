import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, User } from 'lucide-react';

interface GoogleProfileCompletionProps {
  onComplete: () => void;
}

export default function GoogleProfileCompletion({ onComplete }: GoogleProfileCompletionProps) {
  const { profile, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !displayName.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    const { error } = await updateProfile({
      username: username.trim(),
      display_name: displayName.trim(),
    });
    setLoading(false);

    if (error) {
      setError(error);
      return;
    }
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-navy-800">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-neon flex items-center justify-center mb-3">
            <User size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Complete seu perfil</h1>
          <p className="text-white/50 text-sm mt-1">Escolha seu @username e nome de exibição</p>
        </div>

        <div className="bg-navy-700 rounded-[2rem] p-8">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-pill w-full"
              maxLength={20}
            />
            <input
              type="text"
              placeholder="Nome de exibição"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-pill w-full"
            />

            {error && (
              <p className="text-red-400 text-sm text-center px-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-pill w-full bg-neon text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Continuar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
