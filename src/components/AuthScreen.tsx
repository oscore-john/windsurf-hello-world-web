'use client';

import { useState, FormEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthScreenProps {
  onAuthenticated: (user: User) => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseClient();

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('signin-email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('signin-password') as HTMLInputElement).value;

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (data.user) {
      onAuthenticated(data.user);
    }
  }

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem('signup-email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('signup-password') as HTMLInputElement).value;

    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    if (data.user) {
      onAuthenticated(data.user);
    }
  }

  return (
    <div className="auth-screen" id="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Click the Button!</h1>
        <p className="auth-subtitle">Sign in to save your high score</p>

        <form
          id="signin-form"
          className="auth-form"
          style={{ display: mode === 'signin' ? undefined : 'none' }}
          onSubmit={handleSignIn}
        >
          <input type="email" id="signin-email" name="signin-email" placeholder="Email" required autoComplete="email" />
          <input type="password" id="signin-password" name="signin-password" placeholder="Password" required autoComplete="current-password" />
          <button type="submit" className="auth-btn" disabled={loading}>Sign In</button>
          <p className="auth-toggle">
            No account?{' '}
            <a href="#" id="show-signup" onClick={(e) => { e.preventDefault(); setError(''); setMode('signup'); }}>
              Sign up
            </a>
          </p>
        </form>

        <form
          id="signup-form"
          className="auth-form"
          style={{ display: mode === 'signup' ? undefined : 'none' }}
          onSubmit={handleSignUp}
        >
          <input type="email" id="signup-email" name="signup-email" placeholder="Email" required autoComplete="email" />
          <input type="password" id="signup-password" name="signup-password" placeholder="Password (min 6 chars)" required minLength={6} autoComplete="new-password" />
          <button type="submit" className="auth-btn" disabled={loading}>Sign Up</button>
          <p className="auth-toggle">
            Have an account?{' '}
            <a href="#" id="show-signin" onClick={(e) => { e.preventDefault(); setError(''); setMode('signin'); }}>
              Sign in
            </a>
          </p>
        </form>

        <p id="auth-error" className="auth-error">{error}</p>
      </div>
    </div>
  );
}
