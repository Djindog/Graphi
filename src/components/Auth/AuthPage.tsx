import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#F5F6F8]">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-[340px] shadow-sm">
        <div className="mb-8">
          <h1 className="text-gray-900 text-2xl font-semibold tracking-tight">Graphi</h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-400"
            required
          />
          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-gray-400 text-sm mt-5">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
