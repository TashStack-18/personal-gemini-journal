import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Compass, Lock, ArrowRight, Sparkles, Feather } from 'lucide-react';

export const AuthCard: React.FC = () => {
  const { signInWithGoogle, error, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    clearError();
    try {
      await signInWithGoogle();
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn">
      <div className="journal-canvas-surface rounded-3xl p-8 sm:p-12 space-y-8 border border-stone-200/90 shadow-lg">
        {/* Brand mark */}
        <div className="space-y-3.5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-stone-100 flex items-center justify-center mx-auto shadow-md border border-stone-800 group">
            <Compass className="w-7 h-7 text-amber-400 group-hover:rotate-45 transition-transform duration-500" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-meta uppercase tracking-widest text-amber-900 font-bold block">
              Personal Sanctuary
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
              Personal Gemini Journal
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 font-editorial italic leading-relaxed max-w-xs mx-auto">
            A quiet, intimate space to write candidly, reflect with Gemini, and discover your emotional rhythms.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-1 shadow-2xs">
            <p className="font-semibold font-meta">Notice</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Continue with Google */}
        <div className="space-y-4">
          <button
            type="button"
            id="btn-continue-with-google"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full py-4 px-5 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 border border-stone-300 hover:border-stone-400 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-3 shadow-2xs cursor-pointer disabled:opacity-50 group"
          >
            {/* Google SVG G Logo */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>

            <span>{isSigningIn ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
            {!isSigningIn && (
              <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform ml-auto" />
            )}
          </button>

          <p className="text-[11px] text-center text-stone-500 font-sans">
            Sign in securely with Google to open your isolated personal journal.
          </p>
        </div>

        {/* Security & Privacy Callout */}
        <div className="pt-4 border-t border-stone-200/80 space-y-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-800 font-meta">
            <Lock className="w-3 h-3 text-emerald-700" />
            <span>Private & Encrypted in Cloud Firestore</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-relaxed font-editorial italic">
            Your reflections are strictly isolated under your user ID and protected with token authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
