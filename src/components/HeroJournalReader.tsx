import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry } from '../types.js';
import {
  PenLine,
  Sparkles,
  ChevronLeft,
  Sun,
  MapPin,
  Clock,
  BookOpen,
  Calendar,
  Share2,
  Trash2,
  ArrowRight,
  MessageSquare,
  Check,
} from 'lucide-react';

interface HeroJournalReaderProps {
  entry: JournalEntry;
  onEdit: () => void;
  onReflectWithGemini: () => void;
  onBackToList?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  allJournals?: JournalEntry[];
  onSelectRelatedEntry?: (entry: JournalEntry) => void;
  backButtonLabel?: string;
}

const MOOD_DESCRIPTIONS: Record<
  number,
  { name: string; tagline: string; color: string; bg: string; dot: string }
> = {
  1: {
    name: 'Overwhelmed',
    tagline: 'Heavy turbulence, seeking gentleness',
    color: '#64748b',
    bg: 'bg-slate-100/90 text-slate-800 border-slate-300',
    dot: 'bg-slate-500',
  },
  2: {
    name: 'Uncertain',
    tagline: 'Turbulent currents, seeking clarity',
    color: '#71717a',
    bg: 'bg-zinc-100/90 text-zinc-800 border-zinc-300',
    dot: 'bg-zinc-500',
  },
  3: {
    name: 'Still',
    tagline: 'Quiet center, neutral observer',
    color: '#78716c',
    bg: 'bg-stone-100/90 text-stone-800 border-stone-300',
    dot: 'bg-stone-500',
  },
  4: {
    name: 'Grounded',
    tagline: 'Steady, aligned, quietly content',
    color: '#b45309',
    bg: 'bg-amber-50/90 text-amber-900 border-amber-300',
    dot: 'bg-amber-600',
  },
  5: {
    name: 'Radiant',
    tagline: 'Deep vitality, joy, and expansion',
    color: '#d97706',
    bg: 'bg-amber-100/90 text-amber-950 border-amber-400',
    dot: 'bg-amber-500',
  },
};

export const HeroJournalReader: React.FC<HeroJournalReaderProps> = React.memo(({
  entry,
  onEdit,
  onReflectWithGemini,
  onBackToList,
  onDelete,
  isDeleting = false,
  allJournals = [],
  onSelectRelatedEntry,
  backButtonLabel = 'Return to Stream',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Extract user text and companion thoughts
  const userText = entry.messages?.find((m) => m.role === 'user')?.text || '';
  const companionMessages = entry.messages?.filter((m) => m.role === 'assistant') || [];

  // Metrics
  const words = userText.trim() ? userText.trim().split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.ceil(words / 190));

  // Date styling
  const createdDate = new Date(entry.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const moodInfo = MOOD_DESCRIPTIONS[entry.moodScore] || MOOD_DESCRIPTIONS[3];

  // Scroll progress listener
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      if (totalHeight <= 0) {
        setScrollProgress(100);
        return;
      }
      const current = -rect.top;
      const pct = Math.min(100, Math.max(0, (current / totalHeight) * 100));
      setScrollProgress(pct);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyText = () => {
    const fullText = `${entry.title}\n${formattedDate} · ${formattedTime}\n\n${userText}`;
    navigator.clipboard?.writeText(fullText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Find 1-2 related entries (e.g. matching mood or nearby dates)
  const relatedEntries = allJournals
    .filter((j) => j.id !== entry.id)
    .slice(0, 2);

  // Split user text into comfortable paragraphs
  const paragraphs = userText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div ref={containerRef} className="relative w-full pb-28 sm:pb-32 transition-all">
      {/* 1. Subtle Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-stone-200/50 z-50 pointer-events-none">
        <div
          className="h-full bg-amber-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Top Secondary Control Bar (Kept Secondary to Writing) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-6 flex items-center justify-between gap-3 border-b border-stone-200/70">
        <div>
          {onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer font-meta"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-amber-700" />
              <span>{backButtonLabel}</span>
            </button>
          ) : (
            <span className="text-[11px] font-meta uppercase tracking-widest text-stone-600 font-bold">
              Archival Folio · Read Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="h-8 px-2.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-meta transition-all cursor-pointer flex items-center gap-1.5"
            title="Copy entry text"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Edit Entry Action */}
          <button
            type="button"
            onClick={onEdit}
            className="h-8 px-3.5 rounded-xl border border-stone-300 hover:border-stone-400 bg-white text-stone-800 hover:text-stone-950 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs font-meta"
          >
            <PenLine className="w-3.5 h-3.5 text-stone-600" />
            <span>Edit Entry</span>
          </button>

          {/* Reflect with Gemini Action */}
          <button
            type="button"
            onClick={onReflectWithGemini}
            className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-stone-900 to-amber-950 hover:from-black hover:to-amber-900 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs font-meta"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Reflect with Gemini</span>
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Delete memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. The Hero Reader Canvas */}
      <article className="max-w-3xl mx-auto px-5 sm:px-8 pt-8 sm:pt-14 space-y-10">
        {/* Editorial Header Section */}
        <header className="space-y-6 pb-8 border-b border-stone-200/80">
          {/* Subtle Metadata Capsule */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-meta text-stone-500">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>{formattedDate}</span>
            </span>
            <span className="text-stone-300">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              <span>{formattedTime}</span>
            </span>
            <span className="text-stone-300">·</span>
            <span className="flex items-center gap-1 text-stone-600">
              <BookOpen className="w-3 h-3 text-stone-400" />
              <span>{readMinutes} min read ({words} words)</span>
            </span>

            {/* Atmosphere details */}
            {entry.atmospheric && (
              <>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1 text-stone-600">
                  <MapPin className="w-3 h-3 text-amber-700" />
                  <span>{entry.atmospheric.locationName.split(',')[0]}</span>
                </span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1 text-stone-600">
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>{entry.atmospheric.temperature}°C ({entry.atmospheric.condition})</span>
                </span>
              </>
            )}
          </div>

          {/* Large Hero Title */}
          <h1 className="font-editorial text-3xl sm:text-5xl lg:text-[3.25rem] font-normal text-stone-900 tracking-tight leading-[1.15]">
            {entry.title || 'Untitled Moment'}
          </h1>

          {/* Tasteful Mood Marker & Themes */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${moodInfo.dot}`} />
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border font-meta ${moodInfo.bg}`}
                >
                  {entry.moodScore} · {moodInfo.name}
                </span>
              </div>
              <span className="text-xs text-stone-600 font-editorial italic hidden sm:inline">
                — "{moodInfo.tagline}"
              </span>
            </div>

            {/* Discovered Theme Chips */}
            {entry.themes && entry.themes.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {entry.themes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-stone-100 text-stone-700 border border-stone-200/80 rounded-md text-[11px] font-meta"
                  >
                    #{theme}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* The Reading Body: Comfortable Reading Width & Beautiful Paragraph Rhythm */}
        <div className="space-y-6 sm:space-y-8 font-editorial text-lg sm:text-xl lg:text-[1.28rem] leading-[2.4rem] sm:leading-[2.6rem] text-stone-900 font-normal selection:bg-amber-100">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, idx) => (
              <p
                key={idx}
                className={`text-stone-800 whitespace-pre-line ${
                  idx === 0 ? 'first-letter:text-3xl first-letter:font-semibold first-letter:mr-0.5' : ''
                }`}
              >
                {p}
              </p>
            ))
          ) : (
            <p className="text-stone-400 italic">No written reflection recorded for this entry.</p>
          )}
        </div>

        {/* Elegant Reader End-Mark */}
        <div className="py-6 flex items-center justify-center gap-2 text-stone-300 select-none">
          <span className="text-base">·</span>
          <span className="text-xl font-editorial text-amber-700">❦</span>
          <span className="text-base">·</span>
        </div>

        {/* 4. Gemini Companion Reflection Section (YOUR WORDS + GEMINI'S REFLECTION) */}
        {companionMessages.length > 0 ? (
          <section className="mt-12 pt-8 border-t border-amber-200/80 space-y-6 bg-amber-50/40 -mx-4 sm:-mx-8 px-4 sm:px-8 py-8 rounded-3xl border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-medium text-stone-900">
                    Gemini Companion Reflections
                  </h3>
                  <p className="text-xs text-stone-600 font-meta">
                    Empathetic observations, reframings, and inquiry
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onReflectWithGemini}
                className="px-3 py-1.5 rounded-xl border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 font-meta shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                <span>Continue Thought</span>
              </button>
            </div>

            <div className="space-y-4">
              {companionMessages.map((msg, i) => (
                <div
                  key={i}
                  className="p-5 sm:p-6 bg-white rounded-2xl border border-amber-200/60 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-meta text-stone-500">
                    <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Companion Note #{i + 1}</span>
                    </span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="font-editorial text-base sm:text-lg text-stone-900 italic leading-[2rem]">
                    "{msg.text}"
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-8 p-6 bg-stone-100/80 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-editorial text-base font-semibold text-stone-900">
                  Deepen this moment with Gemini
                </h4>
                <p className="text-xs text-stone-600 font-meta">
                  Receive thoughtful questions and compassionate reframing on your entry.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onReflectWithGemini}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs font-meta"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Reflect with Gemini</span>
            </button>
          </section>
        )}

        {/* 5. Contextual Echoes & Related Keepsakes */}
        {relatedEntries.length > 0 && onSelectRelatedEntry && (
          <section className="pt-10 border-t border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between text-xs font-meta text-stone-500">
              <span className="uppercase tracking-wider font-semibold text-stone-700">
                Echoes from other moments in your journey
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {relatedEntries.map((rel) => {
                const relMood = MOOD_DESCRIPTIONS[rel.moodScore] || MOOD_DESCRIPTIONS[3];
                const relSnippet =
                  rel.messages?.find((m) => m.role === 'user')?.text.slice(0, 100) || '';

                return (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectRelatedEntry(rel)}
                    className="p-4 bg-white hover:bg-stone-50/90 rounded-2xl border border-stone-200/90 shadow-2xs text-left transition-all group cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-meta text-stone-500">
                      <span>{new Date(rel.createdAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${relMood.bg}`}>
                        {relMood.name}
                      </span>
                    </div>
                    <h5 className="font-editorial text-base font-medium text-stone-900 group-hover:text-amber-900 transition-colors line-clamp-1">
                      {rel.title || 'Untitled Moment'}
                    </h5>
                    <p className="text-xs text-stone-600 line-clamp-2 italic font-editorial leading-relaxed">
                      "{relSnippet}..."
                    </p>
                    <div className="pt-1 flex items-center gap-1 text-[11px] font-meta text-amber-800 font-semibold group-hover:translate-x-0.5 transition-transform">
                      <span>Read this memory</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Subtle Bottom Actions */}
        <div className="pt-6 flex items-center justify-between text-xs font-meta text-stone-500 border-t border-stone-200/60">
          <button
            type="button"
            onClick={onEdit}
            className="hover:text-stone-900 font-medium underline underline-offset-4 cursor-pointer"
          >
            Switch to Edit Mode to expand or revise this entry
          </button>
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="text-amber-900 hover:text-amber-950 font-bold cursor-pointer"
            >
              {backButtonLabel}
            </button>
          )}
        </div>
      </article>
    </div>
  );
});

HeroJournalReader.displayName = 'HeroJournalReader';
