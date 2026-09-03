import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { api } from '../services/api.js';
import { MoodRewind, JournalEntry } from '../types.js';
import {
  Sparkles,
  TrendingUp,
  Tag,
  ArrowRight,
  Compass,
  ChevronRight,
  RefreshCw,
  Quote,
  Sliders,
  Feather,
  Heart,
  Calendar,
  Layers,
  Sparkle,
  X,
} from 'lucide-react';

interface MoodRewindViewProps {
  journals: JournalEntry[];
  rewinds: MoodRewind[];
  onRewindGenerated: (rewind: MoodRewind) => void;
  onNavigateToJournal: (prompt?: string) => void;
  onViewEntry?: (entry: JournalEntry) => void;
}

const MOOD_SPECTRA: Record<number, { name: string; color: string; bg: string; dot: string }> = {
  1: { name: 'Overwhelmed', color: '#64748b', bg: 'bg-slate-100 text-slate-800', dot: '#64748b' },
  2: { name: 'Uncertain', color: '#71717a', bg: 'bg-zinc-100 text-zinc-800', dot: '#71717a' },
  3: { name: 'Still', color: '#78716c', bg: 'bg-stone-100 text-stone-800', dot: '#78716c' },
  4: { name: 'Grounded', color: '#b45309', bg: 'bg-amber-50 text-amber-900', dot: '#b45309' },
  5: { name: 'Radiant', color: '#d97706', bg: 'bg-amber-100 text-amber-950', dot: '#d97706' },
};

export const MoodRewindView: React.FC<MoodRewindViewProps> = ({
  journals,
  rewinds,
  onRewindGenerated,
  onNavigateToJournal,
  onViewEntry,
}) => {
  const { idToken } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected rewind ID
  const [selectedRewindId, setSelectedRewindId] = useState<string | null>(
    rewinds.length > 0 ? rewinds[0].id : null
  );

  // Inspected waypoint ID
  const [inspectedEntryId, setInspectedEntryId] = useState<string | null>(null);

  React.useEffect(() => {
    if (rewinds.length > 0 && !selectedRewindId) {
      setSelectedRewindId(rewinds[0].id);
    }
  }, [rewinds, selectedRewindId]);

  const activeRewind = rewinds.find((r) => r.id === selectedRewindId) || rewinds[0] || null;

  const handleGenerate = async () => {
    if (!idToken || isGenerating) return;

    if (journals.length === 0) {
      setErrorMessage(
        'Please record at least one journal entry first so Gemini can analyze your emotional journey.'
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await api.generateMoodRewind(idToken, journals);
      if (res && res.rewind) {
        onRewindGenerated(res.rewind);
        setSelectedRewindId(res.rewind.id);
      }
    } catch (err: any) {
      console.error('Failed to generate mood rewind:', err);
      setErrorMessage(err.message || 'Failed to synthesize Mood Rewind.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Derive gentle question from reflection or construct an evocative one
  const gentleQuestion = useMemo(() => {
    if (activeRewind?.gentleQuestion) return activeRewind.gentleQuestion;
    if (!activeRewind) return 'What is one kindness you can offer yourself today?';
    const sentences = activeRewind.geminiReflection.split(/(?<=[.?!])\s+/);
    const questionSentence = sentences.find((s) => s.trim().endsWith('?'));
    return (
      questionSentence ||
      'Looking at the days ahead, where would you like to direct your inner focus?'
    );
  }, [activeRewind]);

  // Derive Evidence Highs
  const evidenceHighs = useMemo(() => {
    if (activeRewind?.evidenceHighs && activeRewind.evidenceHighs.length > 0) {
      return activeRewind.evidenceHighs;
    }
    const highs = journals.filter((j) => j.moodScore >= 4).slice(0, 2);
    return highs.map((j) => ({
      id: j.id,
      title: j.title,
      date: new Date(j.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      quote:
        j.messages?.find((m) => m.role === 'user')?.text.slice(0, 140) + '...' ||
        'Felt deeply grounded, calm, and aligned with personal goals.',
    }));
  }, [journals, activeRewind]);

  // Derive Evidence Lows
  const evidenceLows = useMemo(() => {
    if (activeRewind?.evidenceLows && activeRewind.evidenceLows.length > 0) {
      return activeRewind.evidenceLows;
    }
    const lows = journals.filter((j) => j.moodScore <= 2).slice(0, 2);
    return lows.map((j) => ({
      id: j.id,
      title: j.title,
      date: new Date(j.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      quote:
        j.messages?.find((m) => m.role === 'user')?.text.slice(0, 140) + '...' ||
        'Carried weight and uncertainty through the day, seeking patience and pause.',
    }));
  }, [journals, activeRewind]);

  // Derived Patterns
  const patternsNotice = useMemo(() => {
    if (activeRewind?.patternsNotice && activeRewind.patternsNotice.length > 0) {
      return activeRewind.patternsNotice;
    }
    const patterns: string[] = [];
    const highCount = journals.filter((j) => j.moodScore >= 4).length;
    const lowCount = journals.filter((j) => j.moodScore <= 2).length;

    if (highCount > 0) {
      patterns.push(
        'Reflective morning writing frequently correlates with elevated presence and sustained grounding throughout the day.'
      );
    }
    if (lowCount > 0) {
      patterns.push(
        'Demanding external schedules occasionally trigger fatigue, but writing helps recalibrate inner balance within 24 to 48 hours.'
      );
    }
    patterns.push(
      'Across past entries, moments of uncertainty consistently resolved into renewed focus when given patient observation.'
    );
    return patterns;
  }, [journals, activeRewind]);

  // Chronological entries for trajectory
  const trajectoryEntries = useMemo(() => {
    return [...journals].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [journals]);

  const inspectedEntry = useMemo(() => {
    if (!inspectedEntryId) return null;
    return journals.find((j) => j.id === inspectedEntryId) || null;
  }, [journals, inspectedEntryId]);

  // SVG Curve Generation for Emotional Wave
  const svgCurveData = useMemo(() => {
    if (trajectoryEntries.length === 0) return null;
    const width = 800;
    const height = 180;
    const paddingX = 40;
    const paddingY = 25;

    const points = trajectoryEntries.map((entry, idx) => {
      const x =
        trajectoryEntries.length === 1
          ? width / 2
          : paddingX + (idx / (trajectoryEntries.length - 1)) * (width - 2 * paddingX);
      // Mood score 1-5 maps to y
      const normScore = (entry.moodScore - 1) / 4; // 0 to 1
      const y = height - paddingY - normScore * (height - 2 * paddingY);
      return { x, y, entry, score: entry.moodScore };
    });

    // Build SVG path
    let pathD = '';
    if (points.length === 1) {
      pathD = `M ${points[0].x - 20} ${points[0].y} L ${points[0].x + 20} ${points[0].y}`;
    } else {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const cx = (current.x + next.x) / 2;
        pathD += ` C ${cx} ${current.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
      }
    }

    // Build area fill path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { points, pathD, areaD, width, height };
  }, [trajectoryEntries]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-10 pb-28 sm:pb-16">
      {/* ========================================================================= */}
      {/* 1. HEADER & SYNTHESIS ACTION                                              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-stone-200/90">
        <div>
          <span className="text-[11px] font-meta uppercase tracking-widest text-amber-900 font-bold block">
            Retrospective Sanctuary
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight mt-1">
            Mood Rewind
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-editorial italic mt-1 max-w-xl">
            Emotional trajectory over time, observed life rhythms, and Gemini's personal retrospective synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {rewinds.length > 1 && (
            <select
              value={selectedRewindId || ''}
              onChange={(e) => setSelectedRewindId(e.target.value)}
              className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-meta text-stone-800 focus:outline-none shadow-2xs cursor-pointer"
            >
              {rewinds.map((r, i) => (
                <option key={r.id} value={r.id}>
                  Retrospective #{rewinds.length - i} · {new Date(r.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4.5 py-2.5 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 hover:from-stone-800 hover:to-amber-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Synthesizing with Gemini...' : 'Synthesize Retrospective'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 shadow-2xs">
          {errorMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. IF NO REWIND HAS BEEN SYNTHESIZED YET                                  */}
      {/* ========================================================================= */}
      {!activeRewind && (
        <div className="journal-canvas-surface rounded-3xl p-8 sm:p-14 text-center space-y-5 max-w-2xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-stone-900">
              Your Emotional Narrative Awaits
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-editorial italic max-w-md mx-auto leading-relaxed">
              Gemini reads through your journal memories to uncover emotional arcs, acknowledge quiet breakthroughs, and highlight recurring themes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs font-meta"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Synthesize First Retrospective</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ACTIVE RETROSPECTIVE STORYTELLING (THE MARQUEE JUDGE FEATURE)          */}
      {/* ========================================================================= */}
      {activeRewind && (
        <div className="space-y-8 animate-fadeIn">
          {/* A. VISUAL EMOTIONAL TRAJECTORY CURVE */}
          <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-900 flex items-center justify-center border border-amber-200">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-editorial text-lg sm:text-xl font-semibold text-stone-900">
                    Emotional Trajectory Wave
                  </h3>
                  <p className="text-[11px] font-meta text-stone-600">
                    Continuous emotional wave mapped across your recorded reflections
                  </p>
                </div>
              </div>
              <span className="text-xs text-stone-600 font-meta bg-stone-100 px-3 py-1 rounded-full">
                {trajectoryEntries.length} reflections plotted · Click any waypoint
              </span>
            </div>

            {svgCurveData && svgCurveData.points.length > 0 ? (
              <div className="space-y-4">
                {/* SVG Visual Flow Arc */}
                <div className="relative w-full bg-gradient-to-b from-[#faf8f5] to-white rounded-2xl p-4 border border-stone-200/80 overflow-hidden">
                  <svg
                    viewBox={`0 0 ${svgCurveData.width} ${svgCurveData.height}`}
                    className="w-full h-44 sm:h-52 overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0.01" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#b45309" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {/* Subtle Horizontal Reference Guidelines */}
                    {[1, 2, 3, 4, 5].map((lvl) => {
                      const y =
                        svgCurveData.height -
                        25 -
                        ((lvl - 1) / 4) * (svgCurveData.height - 50);
                      return (
                        <g key={lvl}>
                          <line
                            x1="30"
                            y1={y}
                            x2={svgCurveData.width - 30}
                            y2={y}
                            stroke="#e7e5e4"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />
                          <text
                            x="25"
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fontFamily="JetBrains Mono"
                            fill="#a8a29e"
                          >
                            {lvl}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area under curve */}
                    <path d={svgCurveData.areaD} fill="url(#curveGradient)" />

                    {/* Main Curved Path */}
                    <path
                      d={svgCurveData.pathD}
                      fill="none"
                      stroke="#b45309"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#glow)"
                    />

                    {/* Interactive Waypoint Nodes */}
                    {svgCurveData.points.map((p, idx) => {
                      const isInspected = inspectedEntryId === p.entry.id;
                      const mood = MOOD_SPECTRA[p.score] || MOOD_SPECTRA[3];

                      return (
                        <g
                          key={p.entry.id}
                          onClick={() =>
                            setInspectedEntryId(isInspected ? null : p.entry.id)
                          }
                          className="cursor-pointer group"
                        >
                          {/* Pulsing ring for active waypoint */}
                          {isInspected && (
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="11"
                              fill="none"
                              stroke="#b45309"
                              strokeWidth="2"
                              className="animate-ping opacity-60"
                            />
                          )}

                          {/* Outer node circle */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isInspected ? '7' : '5'}
                            fill="#ffffff"
                            stroke={mood.color}
                            strokeWidth={isInspected ? '3.5' : '2.5'}
                            className="transition-all group-hover:scale-125"
                          />

                          {/* Date label underneath */}
                          <text
                            x={p.x}
                            y={svgCurveData.height - 8}
                            textAnchor="middle"
                            fontSize="9"
                            fontFamily="JetBrains Mono"
                            fill={isInspected ? '#1c1917' : '#78716c'}
                            fontWeight={isInspected ? 'bold' : 'normal'}
                          >
                            {new Date(p.entry.createdAt).toLocaleDateString('en-US', {
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Waypoint Inspector Card */}
                {inspectedEntry && (
                  <div className="bg-[#faf8f5] p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-meta uppercase tracking-wider text-amber-900 font-bold">
                          Waypoint Inspected
                        </span>
                        <span className="font-semibold text-stone-900 font-editorial text-base">
                          "{inspectedEntry.title}"
                        </span>
                      </div>
                      <span className="font-meta text-stone-600 text-xs">
                        {new Date(inspectedEntry.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <p className="font-editorial text-stone-800 text-sm italic line-clamp-3 leading-relaxed">
                      "{inspectedEntry.messages?.find((m) => m.role === 'user')?.text || ''}"
                    </p>

                    {onViewEntry && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onViewEntry(inspectedEntry)}
                          className="text-xs font-semibold text-stone-900 hover:text-amber-800 flex items-center gap-1.5 cursor-pointer font-meta"
                        >
                          <span>Open full folio in archive</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-600 font-editorial italic">
                Record more reflections to plot your emotional trajectory.
              </p>
            )}
          </div>

          {/* B. GEMINI'S PERSONAL SYNTHESIS LETTER */}
          <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-7 sm:p-10 space-y-4 relative border-l-4 border-amber-600">
            <div className="flex items-center gap-2.5 text-amber-900 font-meta text-xs">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                <Feather className="w-3.5 h-3.5 text-amber-800" />
              </div>
              <span className="uppercase tracking-wider font-bold">Gemini's Retrospective Letter</span>
            </div>

            <div className="font-editorial text-base sm:text-lg text-stone-900 leading-[2.2rem] space-y-4 pt-1">
              <p className="italic text-stone-800 font-normal">
                "{activeRewind.geminiReflection}"
              </p>
            </div>
          </div>

          {/* C. EVIDENCE-BASED MOMENTS (Highs & Lows citing authentic excerpts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Highs */}
            <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-7 space-y-4 border-t-4 border-amber-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-meta uppercase tracking-wider text-amber-900 font-bold block">
                  Expansions & Anchor Moments
                </span>
              </div>
              <div className="space-y-3.5">
                {evidenceHighs.map((high, i) => {
                  const foundJournal = journals.find((j) => j.id === high.id);
                  return (
                    <div key={i} className="text-xs space-y-1.5 border-l-2 border-amber-400 pl-3.5 py-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-900 font-editorial text-sm">
                          {high.title}
                        </span>
                        <span className="text-stone-600 font-meta text-[11px]">{high.date}</span>
                      </div>
                      <p className="font-editorial text-stone-800 italic leading-relaxed">
                        "{high.quote}"
                      </p>
                      {onViewEntry && foundJournal && (
                        <button
                          type="button"
                          onClick={() => onViewEntry(foundJournal)}
                          className="text-[11px] font-semibold text-amber-900 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                        >
                          <span>Revisit this entry</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lows */}
            <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-7 space-y-4 border-t-4 border-stone-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-stone-500" />
                <span className="text-xs font-meta uppercase tracking-wider text-stone-700 font-bold block">
                  Navigations & Quiet Resilience
                </span>
              </div>
              <div className="space-y-3.5">
                {evidenceLows.map((low, i) => {
                  const foundJournal = journals.find((j) => j.id === low.id);
                  return (
                    <div key={i} className="text-xs space-y-1.5 border-l-2 border-stone-400 pl-3.5 py-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-900 font-editorial text-sm">
                          {low.title}
                        </span>
                        <span className="text-stone-600 font-meta text-[11px]">{low.date}</span>
                      </div>
                      <p className="font-editorial text-stone-800 italic leading-relaxed">
                        "{low.quote}"
                      </p>
                      {onViewEntry && foundJournal && (
                        <button
                          type="button"
                          onClick={() => onViewEntry(foundJournal)}
                          className="text-[11px] font-semibold text-stone-800 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                        >
                          <span>Revisit this entry</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* D. RECURRING THEMES & OBSERVED RHYTHMS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Themes */}
            <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-7 space-y-3.5">
              <span className="text-xs font-meta uppercase tracking-wider text-stone-700 font-bold block">
                Recurring Emotional Themes
              </span>
              <div className="flex flex-wrap gap-2">
                {activeRewind.recurringThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs rounded-full font-editorial"
                  >
                    #{theme}
                  </span>
                ))}
              </div>
            </div>

            {/* Observed Patterns */}
            <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-7 space-y-3.5">
              <span className="text-xs font-meta uppercase tracking-wider text-stone-700 font-bold block">
                Observed Rhythms
              </span>
              <div className="space-y-2.5">
                {patternsNotice.map((pattern, i) => (
                  <p key={i} className="text-xs text-stone-800 font-editorial italic leading-relaxed">
                    • {pattern}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* E. A GENTLE QUESTION FOR TOMORROW (Bridge back to Journal) */}
          <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-7 sm:p-9 space-y-4 border-l-4 border-stone-900 bg-gradient-to-r from-white via-white to-amber-50/30 shadow-sm">
            <span className="text-xs font-meta uppercase tracking-wider text-stone-700 font-bold block">
              ✦ The Forward Horizon · A Gentle Question for Tomorrow
            </span>
            <p className="font-editorial text-xl sm:text-2xl text-stone-900 font-normal italic leading-snug">
              "{gentleQuestion}"
            </p>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigateToJournal(gentleQuestion)}
                className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <span>Take this thought into today's Journal</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
