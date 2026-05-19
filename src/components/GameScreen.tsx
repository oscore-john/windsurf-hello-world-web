'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Game } from '@/lib/game-engine';
import type { User } from '@supabase/supabase-js';

interface GameScreenProps {
  user: User;
  onSignOut: () => void;
}

export default function GameScreen({ user, onSignOut }: GameScreenProps) {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const gameAreaRef = useRef<HTMLElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);
  const supabase = getSupabaseClient();

  const saveScore = useCallback((s: number, b: number) => {
    supabase
      .from('scores')
      .upsert(
        { user_id: user.id, score: s, best: b },
        { onConflict: 'user_id' },
      )
      .then(() => {});
  }, [user.id, supabase]);

  const scheduleSave = useCallback((s: number, b: number) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveScore(s, b);
    }, 2000);
  }, [saveScore]);

  const onScoreChange = useCallback((newScore: number) => {
    scoreRef.current = newScore;
    setScore(newScore);
    if (newScore > bestScoreRef.current) {
      bestScoreRef.current = newScore;
      setBestScore(newScore);
    }
    scheduleSave(newScore, Math.max(newScore, bestScoreRef.current));
  }, [scheduleSave]);

  useEffect(() => {
    const area = gameAreaRef.current;
    if (!area) return;

    supabase
      .from('scores')
      .select('score, best')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const currentScore = data?.score || 0;
        const best = data?.best || 0;
        scoreRef.current = currentScore;
        bestScoreRef.current = best;
        setScore(currentScore);
        setBestScore(best);
        Game.start(area, currentScore, onScoreChange);
      });

    return () => {
      Game.stop();
    };
  }, [user.id, supabase, onScoreChange]);

  useEffect(() => {
    function handleBeforeUnload() {
      saveScore(scoreRef.current, bestScoreRef.current);
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveScore]);

  async function handleSignOut() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveScore(Game.getScore(), bestScoreRef.current);
    await supabase.auth.signOut();
    Game.stop();
    onSignOut();
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return;

    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || 'Failed to delete account');
      }

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      await supabase.auth.signOut();
      Game.stop();
      onSignOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert('Account deletion failed: ' + message);
    }
  }

  return (
    <div id="game-screen">
      <header className="game-header" id="game-header">
        <div className="header-scores">
          <span className="header-stat">
            Score: <strong id="display-score">{score}</strong>
          </span>
          <span className="header-stat">
            Best: <strong id="display-best">{bestScore}</strong>
          </span>
        </div>
        <div className="header-user">
          <span id="display-email">{user.email}</span>
          <button id="delete-account-btn" className="delete-account-btn" onClick={handleDeleteAccount}>
            Delete Account
          </button>
          <button id="sign-out-btn" className="sign-out-btn" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="game-area" id="game-area" ref={gameAreaRef}></main>
    </div>
  );
}
