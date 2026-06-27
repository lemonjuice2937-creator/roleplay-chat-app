import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Theater } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (!username.trim() || !displayName.trim()) {
        setError('Preencha todos os campos');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, username, displayName);
      if (error) setError(error);
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-navy-800">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-neon flex items-center justify-center mb-4 shadow-lg shadow-neon/30">
            <Theater size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Encenação</h1>
          <p className="text-white/50 text-sm mt-1">Chat de Roleplay</p>
        </div>

        <div className="bg-navy-700 rounded-[2rem] p-8">
          <div className="flex gap-2 mb-6 bg-navy-900 rounded-full p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${mode === 'login' ? 'bg-neon text-white' : 'text-white/50'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${mode === 'signup' ? 'bg-neon text-white' : 'text-white/50'}`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <input
                  type="text"
                  placeholder="@username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-pill w-full"
                />
                <input
                  type="text"
                  placeholder="Nome de exibição"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-pill w-full"
                />
              </>
            )}
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-pill w-full"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading && <LoadingSpinner size={18} className="text-white" />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
