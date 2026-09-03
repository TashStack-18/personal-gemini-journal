import React, { useRef, useState, useCallback } from 'react';

export interface MoodAnchor {
  score: number;
  name: string;
  tagline: string;
  desc: string;
  color: string;
  activeBar: string;
  chipClass: string;
  dotClass: string;
  glowClass: string;
}

export const MOOD_ANCHORS: MoodAnchor[] = [
  {
    score: 1,
    name: 'Overwhelmed',
    tagline: 'Heavy turbulence, seeking gentleness',
    desc: 'Carrying heavy weight. Give yourself permission to pause, breathe, and rest.',
    color: '#64748b',
    activeBar: 'bg-slate-700 text-white',
    chipClass: 'bg-slate-100 text-slate-800 border-slate-300',
    dotClass: 'bg-slate-500',
    glowClass: 'mood-glow-overwhelmed',
  },
  {
    score: 2,
    name: 'Uncertain',
    tagline: 'Turbulent currents, seeking clarity',
    desc: 'Feeling foggy or indecisive. Looking for steady ground and self-compassion.',
    color: '#71717a',
    activeBar: 'bg-zinc-700 text-white',
    chipClass: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    dotClass: 'bg-zinc-500',
    glowClass: 'mood-glow-uncertain',
  },
  {
    score: 3,
    name: 'Still',
    tagline: 'Quiet center, neutral observer',
    desc: 'Balanced, quiet, neither high nor low. Simply present in this moment.',
    color: '#78716c',
    activeBar: 'bg-stone-800 text-white',
    chipClass: 'bg-stone-100 text-stone-800 border-stone-300',
    dotClass: 'bg-stone-500',
    glowClass: 'mood-glow-still',
  },
  {
    score: 4,
    name: 'Grounded',
    tagline: 'Steady, aligned, quietly content',
    desc: 'Deep roots, clear focus, gratitude flowing with ease and quiet confidence.',
    color: '#b45309',
    activeBar: 'bg-amber-700 text-white',
    chipClass: 'bg-amber-50 text-amber-900 border-amber-300',
    dotClass: 'bg-amber-600',
    glowClass: 'mood-glow-grounded',
  },
  {
    score: 5,
    name: 'Radiant',
    tagline: 'Deep vitality, joy, and expansion',
    desc: 'Expansive lightness, vibrant optimism, open-hearted creative clarity.',
    color: '#d97706',
    activeBar: 'bg-amber-600 text-white',
    chipClass: 'bg-amber-100 text-amber-950 border-amber-400',
    dotClass: 'bg-amber-500',
    glowClass: 'mood-glow-radiant',
  },
];

interface SignatureMoodScaleProps {
  moodScore: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}

export const SignatureMoodScale: React.FC<SignatureMoodScaleProps> = React.memo(({
  moodScore,
  onChange,
  disabled = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [justSnapped, setJustSnapped] = useState(false);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);

  // Active anchor
  const activeAnchor =
    MOOD_ANCHORS.find((a) => a.score === moodScore) || MOOD_ANCHORS[3];
  const displayedAnchor =
    hoveredScore !== null
      ? MOOD_ANCHORS.find((a) => a.score === hoveredScore) || activeAnchor
      : activeAnchor;

  const calculateScoreFromX = useCallback((clientX: number): number => {
    if (!trackRef.current) return moodScore;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedX = Math.max(rect.left, Math.min(clientX, rect.right));
    const fraction = (clampedX - rect.left) / rect.width;
    const nearestScore = Math.round(fraction * 4) + 1;
    return Math.max(1, Math.min(5, nearestScore));
  }, [moodScore]);

  const handleSelectScore = useCallback(
    (score: number) => {
      if (disabled) return;
      if (score !== moodScore) {
        onChange(score);
        setJustSnapped(true);
        setTimeout(() => setJustSnapped(false), 260);
      }
    },
    [disabled, moodScore, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    const newScore = calculateScoreFromX(e.clientX);
    handleSelectScore(newScore);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    const newScore = calculateScoreFromX(e.clientX);
    if (newScore !== moodScore) {
      handleSelectScore(newScore);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      handleSelectScore(Math.min(5, moodScore + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleSelectScore(Math.max(1, moodScore - 1));
    }
  };

  // Percentage on track: 1 -> 0%, 2 -> 25%, 3 -> 50%, 4 -> 75%, 5 -> 100%
  const thumbPercent = (moodScore - 1) * 25;

  return (
    <div
      className="py-3 px-4 sm:px-5 bg-white/90 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3 transition-colors focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={moodScore}
      aria-valuetext={activeAnchor.name}
      aria-label="Emotional Resonance Continuum"
    >
      {/* 1. Header: Semantic Title, Badge & Smooth Tagline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-meta uppercase tracking-widest text-stone-500 font-bold">
            Resonance:
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full transition-colors duration-200"
              style={{ backgroundColor: displayedAnchor.color }}
            />
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md border font-meta transition-all duration-200 ${displayedAnchor.chipClass}`}
            >
              {displayedAnchor.score} · {displayedAnchor.name}
            </span>
          </div>
          <span className="text-xs text-stone-600 font-editorial italic hidden md:inline transition-opacity duration-200">
            — "{displayedAnchor.tagline}"
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-meta text-stone-500">
          <span className="text-stone-400 font-normal hidden sm:inline">Tactile Scale</span>
          <span className="text-stone-300 hidden sm:inline">·</span>
          <span className="italic font-editorial text-stone-600 line-clamp-1 max-w-[260px]">
            {displayedAnchor.desc}
          </span>
        </div>
      </div>

      {/* 2. Fluid Tactile Continuum Slider Track */}
      <div className="pt-2 pb-1 px-2.5 select-none">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative h-2 rounded-full cursor-pointer touch-none group bg-stone-200/90 shadow-inner"
        >
          {/* Subtle multi-stop spectrum track fill */}
          <div
            className="absolute inset-0 rounded-full opacity-70 transition-opacity"
            style={{
              background:
                'linear-gradient(to right, #64748b 0%, #71717a 25%, #78716c 50%, #b45309 75%, #d97706 100%)',
            }}
          />

          {/* 5 Distinct Anchor Pips / Nodes */}
          {MOOD_ANCHORS.map((anchor) => {
            const anchorPercent = (anchor.score - 1) * 25;
            const isCurrent = moodScore === anchor.score;
            const isHovered = hoveredScore === anchor.score;

            return (
              <div
                key={anchor.score}
                style={{ left: `${anchorPercent}%` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
              >
                {/* Visual Tick Ring */}
                <div
                  className={`w-3 h-3 rounded-full border transition-all duration-200 ${
                    isCurrent
                      ? 'scale-110 bg-white border-stone-800 shadow-2xs'
                      : isHovered
                      ? 'scale-110 bg-white/90 border-stone-600'
                      : 'bg-white/80 border-stone-300'
                  }`}
                />
              </div>
            );
          })}

          {/* Tactile Snapping Thumb */}
          <div
            style={{
              left: `${thumbPercent}%`,
              transition: isDragging
                ? 'none'
                : 'left 240ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 180ms ease',
            }}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none ${
              justSnapped ? 'scale-110' : 'scale-100'
            }`}
          >
            {/* Pebble thumb with crisp border and center dot */}
            <div
              className="w-5 h-5 rounded-full bg-white shadow-sm border-2 transition-colors duration-200 flex items-center justify-center"
              style={{ borderColor: activeAnchor.color }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full transition-colors duration-200"
                style={{ backgroundColor: activeAnchor.color }}
              />
            </div>
          </div>
        </div>

        {/* 3. 5 Anchor Buttons with Prominent Selected State */}
        <div className="relative w-full flex justify-between pt-3">
          {MOOD_ANCHORS.map((anchor) => {
            const isCurrent = moodScore === anchor.score;
            return (
              <button
                key={anchor.score}
                type="button"
                id={`mood-anchor-${anchor.score}`}
                onMouseEnter={() => setHoveredScore(anchor.score)}
                onMouseLeave={() => setHoveredScore(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectScore(anchor.score);
                }}
                className={`flex flex-col items-center transition-all cursor-pointer group focus:outline-none ${
                  isCurrent ? 'scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-meta font-bold transition-all mb-1 ${
                    isCurrent
                      ? `${anchor.activeBar} shadow-2xs ring-2 ring-stone-900/10`
                      : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
                  }`}
                >
                  {anchor.score}
                </span>
                <span
                  className={`text-[11px] font-sans whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'font-bold text-stone-900'
                      : 'text-stone-600 font-medium'
                  }`}
                >
                  {anchor.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

SignatureMoodScale.displayName = 'SignatureMoodScale';
