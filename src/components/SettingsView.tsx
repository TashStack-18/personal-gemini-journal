import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { User, Sparkles, LogOut, Check, Lock, Sliders, ShieldCheck, Heart, Compass, Lightbulb } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, logOut } = useAuth();

  const [companionTone, setCompanionTone] = useState<'mindful' | 'deep' | 'practical'>(
    (localStorage.getItem('companion_tone') as any) || 'mindful'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const handleToneChange = (tone: 'mindful' | 'deep' | 'practical') => {
    setCompanionTone(tone);
    localStorage.setItem('companion_tone', tone);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8 pb-28 sm:pb-16">
      <div className="pb-4 border-b border-stone-200/90">
        <span className="text-[11px] font-meta uppercase tracking-widest text-amber-900 font-bold block">
          Preferences & Identity
        </span>
        <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight mt-1">
          Journal Settings
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 font-editorial italic mt-1">
          Customize your Gemini companion's reflective lens, manage authenticated session, and review data security.
        </p>
      </div>

      <div className="space-y-6">
        {/* Companion Tone Preferences */}
        <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-stone-900">
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-wider font-meta text-stone-900">
                Companion Reflection Lens
              </h2>
            </div>
            {savedNotice && (
              <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold font-meta">
                <Check className="w-3.5 h-3.5" /> Preference Saved
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-stone-600 font-editorial italic leading-relaxed">
            Customize how Gemini reflects alongside your writing. Your companion will adapt its warmth, curiosity, and inquiry depth to your chosen lens.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {[
              {
                id: 'mindful',
                title: 'Mindful & Gentle',
                desc: 'Warm, compassionate reframing centered on presence, breath, and unconditional self-kindness.',
                icon: Heart,
                accent: 'text-rose-600',
              },
              {
                id: 'deep',
                title: 'Inquisitive & Deep',
                desc: 'Thoughtful exploration of underlying root beliefs, patterns, and unspoken tensions.',
                icon: Lightbulb,
                accent: 'text-amber-600',
              },
              {
                id: 'practical',
                title: 'Grounded & Practical',
                desc: 'Emphasis on clarity, immediate actionable grounding, and gentle forward momentum.',
                icon: Compass,
                accent: 'text-emerald-700',
              },
            ].map((option) => {
              const isSelected = companionTone === option.id;
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  onClick={() => handleToneChange(option.id as any)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer space-y-2 group ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-[#faf8f5] hover:bg-white border-stone-200/90 text-stone-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : option.accent}`} />
                      <h3 className="text-xs font-semibold">{option.title}</h3>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p
                    className={`text-xs font-editorial italic leading-relaxed ${
                      isSelected ? 'text-stone-300' : 'text-stone-600'
                    }`}
                  >
                    {option.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Authenticated Account Profile */}
        <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-stone-900">
            <div className="w-7 h-7 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200">
              <User className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-wider font-meta">
              Authenticated Identity
            </h2>
          </div>

          <div className="flex items-center gap-4 pt-1">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-13 h-13 rounded-full border border-stone-300 object-cover shadow-2xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-13 h-13 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-stone-900 truncate">
                {user?.displayName || 'Journal Author'}
              </h3>
              <p className="text-xs text-stone-600 font-meta truncate">{user?.email}</p>
              <p className="text-[10px] text-stone-600 font-meta">
                Firebase ID: {user?.uid.slice(0, 16)}...
              </p>
            </div>
          </div>
        </div>

        {/* Privacy & Data Isolation Security */}
        <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 border-l-4 border-emerald-600">
          <div className="flex items-center gap-2 text-stone-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-semibold uppercase tracking-wider font-meta text-emerald-950">
              Firestore User Isolation & Verification
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-editorial italic">
            Your private thoughts are strictly guarded. Every read, write, and retrospective request requires a valid Firebase ID token cryptographically verified server-side. Cloud Firestore security rules ensure strict per-user isolation.
          </p>
        </div>

        {/* Sign out */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => logOut()}
            className="px-5 py-2.5 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 font-meta shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out of Personal Gemini Journal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
