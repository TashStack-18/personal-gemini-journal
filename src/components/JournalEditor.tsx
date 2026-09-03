import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { api } from '../services/api.js';
import { fetchCurrentAtmosphere } from '../services/weather.js';
import { JournalEntry, AtmosphericContext } from '../types.js';
import {
  Sparkles,
  Send,
  Check,
  RefreshCw,
  MapPin,
  Sun,
  Search,
  PenLine,
  Compass,
  Heart,
  Lightbulb,
  ArrowRight,
  ChevronRight,
  Bookmark,
  MessageSquare,
  Sliders,
  Maximize2,
  X,
  Clock,
  Volume2,
  BookOpen,
  Feather,
  Sparkle,
  Calendar,
  Layers,
} from 'lucide-react';
import { SignatureMoodScale } from './SignatureMoodScale.js';
import { CompanionMarginalia } from './CompanionMarginalia.js';
import { HeroJournalReader } from './HeroJournalReader.js';

interface JournalEditorProps {
  journals: JournalEntry[];
  onJournalCreated: (journal: JournalEntry) => void;
  onJournalUpdated: (journal: JournalEntry) => void;
  onViewEntry: (entry: JournalEntry) => void;
  onNavigateToRewind: () => void;
  atmosphere?: AtmosphericContext | null;
  onRefreshAtmosphere?: () => Promise<void>;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  initialEntry?: JournalEntry | null;
  initialMode?: 'edit' | 'read';
  autoReflect?: boolean;
  onClearInitialEntry?: () => void;
}

const INSPIRATION_SPARKS = [
  'What has been quietly occupying your mind today?',
  'What moment brought an unexpected sense of pause or stillness?',
  'What thought or feeling are you carrying into tomorrow?',
  'What is a truth you have not spoken aloud yet?',
  'If today were a chapter in your personal story, what would it be titled?',
  'What boundary or kindness did you offer yourself today?',
  'What felt deeply meaningful or surprisingly difficult today?',
  'Where did you notice beauty in the ordinary today?',
  'What would feeling completely at ease look like right now?',
];

// Poetic mindful mantras tailored to time of day
const MINDFUL_MANTRAS = {
  morning: [
    'Take a breath. You do not need to have everything figured out today.',
    'Begin with stillness. The world can wait for your first thought.',
    'A fresh page. Notice what is present before the day gathers speed.',
  ],
  afternoon: [
    'Pause mid-stream. Check in with how you are actually carrying yourself.',
    'Clear the mental cache. Return to your center for five minutes.',
    'Honor whatever progress or pause this day has offered so far.',
  ],
  evening: [
    'Release the day. What is done is done, and what remains can rest.',
    'Unload your mind before sleep. Let these words hold the weight.',
    'Notice the quiet victories and unspoken moments of grace tonight.',
  ],
};

// Reimagined Emotional Spectrum with rich poetic resonances & color tones
export const EMOTIONAL_SPECTRUM = [
  {
    score: 1,
    name: 'Overwhelmed',
    tagline: 'Heavy turbulence, seeking gentleness',
    desc: 'Carrying heavy weight. Give yourself permission to pause and rest.',
    color: '#64748b',
    glowClass: 'mood-glow-overwhelmed',
    chipClass: 'bg-slate-100 text-slate-800 border-slate-300',
    dotClass: 'bg-slate-500',
    activeBar: 'bg-slate-700 text-white',
  },
  {
    score: 2,
    name: 'Uncertain',
    tagline: 'Turbulent currents, seeking clarity',
    desc: 'Feeling foggy or indecisive. Looking for steady ground.',
    color: '#71717a',
    glowClass: 'mood-glow-uncertain',
    chipClass: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    dotClass: 'bg-zinc-500',
    activeBar: 'bg-zinc-700 text-white',
  },
  {
    score: 3,
    name: 'Still',
    tagline: 'Quiet center, neutral observer',
    desc: 'Balanced, quiet, neither high nor low. Simply present.',
    color: '#78716c',
    glowClass: 'mood-glow-still',
    chipClass: 'bg-stone-100 text-stone-800 border-stone-300',
    dotClass: 'bg-stone-500',
    activeBar: 'bg-stone-800 text-white',
  },
  {
    score: 4,
    name: 'Grounded',
    tagline: 'Steady, aligned, quietly content',
    desc: 'Deep roots, clear focus, gratitude flowing with ease.',
    color: '#b45309',
    glowClass: 'mood-glow-grounded',
    chipClass: 'bg-amber-50 text-amber-900 border-amber-300',
    dotClass: 'bg-amber-600',
    activeBar: 'bg-amber-600 text-white',
  },
  {
    score: 5,
    name: 'Radiant',
    tagline: 'Deep vitality, joy, and expansion',
    desc: 'Expansive lightness, vibrant optimism, creative clarity.',
    color: '#d97706',
    glowClass: 'mood-glow-radiant',
    chipClass: 'bg-amber-100 text-amber-950 border-amber-400',
    dotClass: 'bg-amber-500',
    activeBar: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white',
  },
];

const COMPANION_LENSES = [
  {
    id: 'mindful',
    label: 'Mindful',
    desc: 'Gentle, compassionate reframing',
    subtitle: 'Nurture self-kindness and acceptance',
    icon: Heart,
    accent: 'text-rose-600',
  },
  {
    id: 'curious',
    label: 'Inquisitive',
    desc: 'Deep inquiry into root beliefs',
    subtitle: 'Ask deeper reflective questions',
    icon: Lightbulb,
    accent: 'text-amber-600',
  },
  {
    id: 'grounded',
    label: 'Grounded',
    desc: 'Practical clarity & next steps',
    subtitle: 'Turn thoughts into actionable peace',
    icon: Compass,
    accent: 'text-emerald-700',
  },
] as const;

const SEARCH_PROMPTS = [
  'When did I feel most peaceful?',
  'When was I stressed about deadlines?',
  'Moments of gratitude & clarity',
  'Thoughts on purpose and future',
  'Quiet mornings and walks',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  journals,
  onJournalCreated,
  onJournalUpdated,
  onViewEntry,
  onNavigateToRewind,
  atmosphere: parentAtmosphere,
  onRefreshAtmosphere: parentRefreshAtmosphere,
  initialPrompt,
  onClearInitialPrompt,
  initialEntry,
  initialMode = 'edit',
  autoReflect = false,
  onClearInitialEntry,
}) => {
  const { user, idToken } = useAuth();

  // Atmosphere state
  const [localAtmosphere, setLocalAtmosphere] = useState<AtmosphericContext | null>(
    parentAtmosphere || null
  );
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);

  // Journal core inputs
  const [moodScore, setMoodScore] = useState<number>(4);
  const [selectedLens, setSelectedLens] = useState<'mindful' | 'curious' | 'grounded'>('mindful');
  const [title, setTitle] = useState('');
  const [reflectionText, setReflectionText] = useState('');

  // Active session
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [editorMode, setEditorMode] = useState<'edit' | 'read'>('edit');
  const [isReflecting, setIsReflecting] = useState(false);
  const [isSavingOnly, setIsSavingOnly] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // View modes
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [isReflectionMode, setIsReflectionMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'marginalia'>('canvas');

  // Sparks
  const [sparkIndex, setSparkIndex] = useState(0);
  const [showPromptBanner, setShowPromptBanner] = useState(true);

  // Companion continuation dialogue
  const [dialogueInput, setDialogueInput] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [selectedFilterMood, setSelectedFilterMood] = useState<number | null>(null);

  // On This Day Modal
  const [isOnThisDayModalOpen, setIsOnThisDayModalOpen] = useState(false);

  // Handle incoming initialEntry (e.g. from history or deep link)
  useEffect(() => {
    if (initialEntry) {
      setActiveEntry(initialEntry);
      setTitle(initialEntry.title || '');
      setReflectionText(
        initialEntry.messages?.find((m) => m.role === 'user')?.text || ''
      );
      setMoodScore(initialEntry.moodScore || 4);
      setEditorMode(initialMode || 'read');
      if (autoReflect) {
        setIsReflectionMode(true);
        setMobileTab('marginalia');
      }
      if (onClearInitialEntry) onClearInitialEntry();
    }
  }, [initialEntry, initialMode, autoReflect, onClearInitialEntry]);

  // Handle initialPrompt from Mood Rewind or external bridge
  useEffect(() => {
    if (initialPrompt) {
      setReflectionText((prev) =>
        prev ? `${prev}\n\n"${initialPrompt}"\n\n` : `"${initialPrompt}"\n\n`
      );
      setEditorMode('edit');
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  // Sync atmosphere
  useEffect(() => {
    if (parentAtmosphere) {
      setLocalAtmosphere(parentAtmosphere);
    } else if (!localAtmosphere) {
      loadWeather();
    }
  }, [parentAtmosphere]);

  const loadWeather = async () => {
    setIsRefreshingWeather(true);
    try {
      if (parentRefreshAtmosphere) {
        await parentRefreshAtmosphere();
      } else {
        const data = await fetchCurrentAtmosphere();
        setLocalAtmosphere(data);
      }
    } catch (err) {
      console.warn('Weather refresh failed:', err);
    } finally {
      setIsRefreshingWeather(false);
    }
  };

  const activeAtmosphere = parentAtmosphere || localAtmosphere;

  // Personal greeting computation (stabilized to session mount to prevent keystroke recalculation)
  const userName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend';
  const [sessionStartTime] = useState(() => new Date());
  const currentHour = sessionStartTime.getHours();
  const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';
  const greeting =
    timeOfDay === 'morning'
      ? 'Good morning'
      : timeOfDay === 'afternoon'
      ? 'Good afternoon'
      : 'Good evening';

  // Mindful mantra for the session
  const mindfulMantra = useMemo(() => {
    const list = MINDFUL_MANTRAS[timeOfDay];
    const dayIndex = sessionStartTime.getDate() % list.length;
    return list[dayIndex];
  }, [timeOfDay, sessionStartTime]);

  // Date metadata
  const formattedDay = sessionStartTime.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = sessionStartTime.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Writing metrics
  const wordCount = useMemo(() => {
    return reflectionText.trim() ? reflectionText.trim().split(/\s+/).length : 0;
  }, [reflectionText]);
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 180));

  // Current mood object
  const currentMoodObj = useMemo(() => {
    return EMOTIONAL_SPECTRUM.find((m) => m.score === moodScore) || EMOTIONAL_SPECTRUM[3];
  }, [moodScore]);

  // Current prompt spark
  const currentSpark = INSPIRATION_SPARKS[sparkIndex];
  const handleNextSpark = () => {
    setSparkIndex((prev) => (prev + 1) % INSPIRATION_SPARKS.length);
  };
  const handleInsertSpark = () => {
    if (!reflectionText.trim()) {
      setReflectionText(`"${currentSpark}"\n\n`);
    } else {
      setReflectionText((prev) => `${prev.trim()}\n\n"${currentSpark}"\n\n`);
    }
  };

  // "On This Day" keepsake discovery (stabilized with sessionStartTime)
  const onThisDayKeepsake = useMemo(() => {
    if (journals.length === 0) return null;
    const todayMonth = sessionStartTime.getMonth();
    const todayDate = sessionStartTime.getDate();

    // Look for past entries on matching calendar day (older than 12 hours)
    const anniversary = journals.find((j) => {
      const entryDate = new Date(j.createdAt);
      return (
        entryDate.getMonth() === todayMonth &&
        entryDate.getDate() === todayDate &&
        sessionStartTime.getTime() - entryDate.getTime() > 1000 * 60 * 60 * 12
      );
    });

    if (anniversary) {
      return {
        entry: anniversary,
        tag: 'Anniversary Memory',
        timeframe: 'From this calendar day in your journey',
        snippet: anniversary.messages?.find((m) => m.role === 'user')?.text.slice(0, 160) || '',
      };
    }

    if (journals.length >= 2) {
      const earlier = journals[journals.length - 1];
      const diffDays = Math.floor(
        (sessionStartTime.getTime() - new Date(earlier.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 1) {
        return {
          entry: earlier,
          tag: 'Discovered Moment',
          timeframe:
            diffDays === 1 ? 'From yesterday' : `From ${diffDays} days ago in your journey`,
          snippet: earlier.messages?.find((m) => m.role === 'user')?.text.slice(0, 160) || '',
        };
      }
    }
    return null;
  }, [journals, sessionStartTime]);

  // Save entry manually
  const handleSaveEntry = async () => {
    if (!idToken || !reflectionText.trim() || isSavingOnly) return;
    setIsSavingOnly(true);
    setErrorMessage(null);

    const generatedTitle =
      title.trim() ||
      reflectionText.trim().slice(0, 42).split('\n')[0] ||
      `Reflection on ${formattedDate}`;

    try {
      if (activeEntry) {
        // Update active entry
        const updatedMessages = [
          {
            role: 'user' as const,
            text: reflectionText.trim(),
            timestamp: new Date().toISOString(),
          },
          ...(activeEntry.messages?.filter((m) => m.role === 'assistant') || []),
        ];

        const updated = {
          ...activeEntry,
          title: generatedTitle,
          moodScore,
          atmospheric: activeAtmosphere || activeEntry.atmospheric,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        };

        await api.updateJournal(idToken, activeEntry.id, updated);
        setActiveEntry(updated);
        onJournalUpdated(updated);
      } else {
        // Create new journal entry
        const newJournal: JournalEntry = {
          id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: user?.uid || 'anonymous',
          title: generatedTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          moodScore,
          atmospheric: activeAtmosphere || {
            locationName: 'Local Sanctuary',
            temperature: 22,
            condition: 'Clear',
            latitude: 12.9716,
            longitude: 77.5946,
            isDay: true,
          },
          messages: [
            {
              role: 'user',
              text: reflectionText.trim(),
              timestamp: new Date().toISOString(),
            },
          ],
          themes: ['reflection', 'journal'],
        };

        const res = await api.createJournal(idToken, newJournal);
        const created = res.journal || newJournal;
        setActiveEntry(created);
        onJournalCreated(created);
      }

      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3000);
    } catch (err: any) {
      console.error('Failed to save journal:', err);
      setErrorMessage(err.message || 'Failed to save entry.');
    } finally {
      setIsSavingOnly(false);
    }
  };

  // Reflect with Gemini Companion — TRANSITION TO REFLECTION SANCTUARY
  const handleReflectWithGemini = async () => {
    if (!idToken || !reflectionText.trim() || isReflecting) return;
    setIsReflecting(true);
    setErrorMessage(null);

    const generatedTitle =
      title.trim() ||
      reflectionText.trim().slice(0, 42).split('\n')[0] ||
      `Reflection on ${formattedDate}`;

    try {
      const companionTone = (localStorage.getItem('companion_tone') as any) || selectedLens;

      const res = await api.reflectJournal(idToken, {
        text: reflectionText.trim(),
        title: generatedTitle,
        moodScore,
        journalId: activeEntry?.id,
        atmospheric: activeAtmosphere || undefined,
        tone: companionTone,
      });

      if (res && res.journal) {
        setActiveEntry(res.journal);
        if (activeEntry) {
          onJournalUpdated(res.journal);
        } else {
          onJournalCreated(res.journal);
        }
        setIsReflectionMode(true);
        setMobileTab('marginalia');
      }
    } catch (err: any) {
      console.error('Gemini companion reflection failed:', err);
      setErrorMessage(
        err.message || 'Gemini could not reflect on this moment. Please check your connection.'
      );
    } finally {
      setIsReflecting(false);
    }
  };

  // Multi-turn continuation dialogue for Companion Marginalia
  const handleSendDialogueReply = async (replyText: string) => {
    if (!idToken || !activeEntry || !replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    setErrorMessage(null);

    try {
      const res = await api.chatReflection(idToken, activeEntry.id, replyText.trim());
      if (res && res.allMessages) {
        const updated = { ...activeEntry, messages: res.allMessages };
        setActiveEntry(updated);
        onJournalUpdated(updated);
      }
    } catch (err: any) {
      console.error('Dialogue continuation error:', err);
      setErrorMessage(err.message || 'Could not send thought to companion.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStartFresh = () => {
    setActiveEntry(null);
    setTitle('');
    setReflectionText('');
    setMoodScore(4);
    setIsReflectionMode(false);
    setEditorMode('edit');
    setMobileTab('canvas');
    setErrorMessage(null);
  };

  // Filtered search memories for Smart Search Modal (only calculated when modal is open)
  const filteredMemories = useMemo(() => {
    if (!isSearchOpen || !journals || journals.length === 0) return [];
    return journals.filter((entry) => {
      const matchesMood =
        selectedFilterMood === null || entry.moodScore === selectedFilterMood;
      if (!memorySearchQuery.trim()) return matchesMood;

      const q = memorySearchQuery.toLowerCase().trim();

      if (q.includes('happiest') || q.includes('joy') || q.includes('peace')) {
        const matchesWords =
          entry.messages?.some((m) =>
            m.text.toLowerCase().includes('happy') ||
            m.text.toLowerCase().includes('grateful') ||
            m.text.toLowerCase().includes('peace')
          );
        if (matchesWords || entry.moodScore >= 4) return true;
      }

      if (q.includes('stress') || q.includes('exam') || q.includes('sad') || q.includes('hard')) {
        const matchesWords =
          entry.messages?.some((m) =>
            m.text.toLowerCase().includes('exam') ||
            m.text.toLowerCase().includes('stress') ||
            m.text.toLowerCase().includes('worried')
          );
        if (matchesWords || entry.moodScore <= 2) return true;
      }

      const matchesTitle = entry.title?.toLowerCase().includes(q);
      const matchesBody = entry.messages?.some((m) => m.text.toLowerCase().includes(q));
      const matchesThemes = entry.themes?.some((t) => t.toLowerCase().includes(q));
      const matchesLocation = entry.atmospheric?.locationName?.toLowerCase().includes(q);

      return matchesMood && (matchesTitle || matchesBody || matchesThemes || matchesLocation);
    });
  }, [isSearchOpen, journals, memorySearchQuery, selectedFilterMood]);

  // Extract Gemini's companion messages
  const companionMessages = useMemo(() => {
    if (!activeEntry || !activeEntry.messages) return [];
    return activeEntry.messages.filter((m) => m.role === 'assistant');
  }, [activeEntry]);

  // Atmosphere feels-like estimate
  const feelsLikeTemp = activeAtmosphere
    ? Math.round(activeAtmosphere.temperature + (activeAtmosphere.isDay ? 1 : -1))
    : 22;

  return (
    <div
      className={`w-full min-h-[calc(100vh-3.75rem)] flex flex-col justify-between ${
        isReflectionMode ? 'max-w-7xl' : 'max-w-5xl'
      } mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-24 sm:pb-12 transition-all duration-300 ${
        currentMoodObj.glowClass
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. HERO / REIMAGINED JOURNAL INVITATION HEADER                            */}
      {/* ========================================================================= */}
      <div
        className={`transition-opacity duration-300 ${
          isCanvasFocused && !isFocusMode ? 'opacity-70' : 'opacity-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4">
          <div>
            {/* Date Tagline with deliberate typography */}
            <div className="flex items-center gap-2 text-[11px] font-meta text-stone-600 uppercase tracking-widest">
              <span className="font-semibold text-stone-900">{formattedDay}</span>
              <span className="text-stone-300">/</span>
              <span>{formattedDate}</span>
            </div>

            {/* Expressive Greeting */}
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-stone-900 tracking-tight mt-1.5 leading-none">
              {greeting}, <span className="italic font-medium text-amber-900">{userName}</span>
            </h1>

            {/* Mindful Personal Reassurance */}
            <p className="font-editorial text-sm sm:text-base text-stone-600 italic mt-2 max-w-xl leading-relaxed">
              "{mindfulMantra}"
            </p>
          </div>

          {/* Environmental Metadata Rail & Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Location & Weather capsule */}
            {activeAtmosphere ? (
              <div
                className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-stone-200/90 text-xs font-meta text-stone-700 shadow-2xs"
                title={`${activeAtmosphere.locationName} · ${activeAtmosphere.condition} · Feels like ${feelsLikeTemp}°C`}
              >
                <div className="flex items-center gap-1 text-stone-800 font-medium">
                  <MapPin className="w-3 h-3 text-amber-700 shrink-0" />
                  <span>{activeAtmosphere.locationName.split(',')[0]}</span>
                </div>
                <span className="text-stone-300">·</span>
                <div className="flex items-center gap-1 text-stone-700">
                  <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{activeAtmosphere.temperature}°C</span>
                  <span className="text-stone-600 hidden md:inline">({activeAtmosphere.condition})</span>
                </div>
                <button
                  type="button"
                  onClick={loadWeather}
                  disabled={isRefreshingWeather}
                  className="p-0.5 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer ml-0.5"
                  title="Update atmosphere"
                >
                  <RefreshCw
                    className={`w-2.5 h-2.5 ${isRefreshingWeather ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            ) : (
              <div className="text-xs text-stone-600 font-meta bg-white/80 px-3 py-1.5 rounded-full border border-stone-200/80">
                Observing atmosphere...
              </div>
            )}

            {/* Search Quick Launcher */}
            <button
              type="button"
              id="btn-quick-search-memories"
              onClick={() => setIsSearchOpen(true)}
              className="px-3 py-1.5 bg-white/90 hover:bg-white border border-stone-200/90 rounded-full text-xs font-meta text-stone-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
              title="Search your memories"
            >
              <Search className="w-3 h-3 text-stone-600 group-hover:text-amber-600 transition-colors" />
              <span className="hidden sm:inline">Memories</span>
            </button>

            {/* On This Day Indicator */}
            {onThisDayKeepsake && (
              <button
                type="button"
                id="btn-on-this-day-chip"
                onClick={() => setIsOnThisDayModalOpen(true)}
                className="px-3 py-1.5 bg-amber-100/70 hover:bg-amber-100 border border-amber-300/80 rounded-full text-xs font-meta text-amber-950 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="On This Day discovered keepsake"
              >
                <Bookmark className="w-3 h-3 text-amber-700" />
                <span>On This Day</span>
              </button>
            )}

            {activeEntry && (
              <button
                type="button"
                onClick={handleStartFresh}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-800 bg-white hover:bg-stone-50 border border-stone-300/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <PenLine className="w-3 h-3 text-stone-600" />
                <span>New Entry</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SIGNATURE MOOD SCALE (Fluid Tactile Continuum)                         */}
        {/* ========================================================================= */}
        <SignatureMoodScale
          moodScore={moodScore}
          onChange={setMoodScore}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. AI WRITING PROMPT (Subtle & Intelligent "Thought Spark")               */}
      {/* ========================================================================= */}
      {showPromptBanner && !isReflectionMode && (
        <div className="mt-3.5 bg-gradient-to-r from-stone-100/90 via-stone-50/80 to-amber-50/40 border border-stone-200/90 rounded-2xl p-3 sm:p-4 flex items-start sm:items-center justify-between gap-3 shadow-2xs transition-all animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-meta tracking-wider text-amber-900 font-bold">
                  ✦ A thought to begin with
                </span>
              </div>
              <p className="font-editorial text-xs sm:text-sm text-stone-800 italic line-clamp-2 mt-0.5 font-normal">
                "{currentSpark}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleNextSpark}
              className="p-1.5 text-stone-600 hover:text-stone-950 hover:bg-white rounded-lg transition-colors cursor-pointer text-xs"
              title="Shuffle another prompt spark"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleInsertSpark}
              className="px-3 py-1 text-xs font-semibold text-stone-900 bg-white hover:bg-amber-50/60 border border-stone-200/90 rounded-lg transition-all cursor-pointer shadow-2xs font-meta"
            >
              Use Prompt
            </button>
            <button
              type="button"
              onClick={() => setShowPromptBanner(false)}
              className="p-1 text-stone-600 hover:text-stone-800 transition-colors cursor-pointer"
              title="Dismiss prompt spark"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SIGNATURE IMMERSIVE JOURNAL CANVAS                                     */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 4. INTEGRATED EDITORIAL REFLECTION & LIVING WRITING SANCTUARY             */}
      {/* ========================================================================= */}
      {isReflectionMode && (
        <div className="flex items-center justify-center p-1 bg-stone-200/80 rounded-xl mt-3 mb-1 w-fit mx-auto lg:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('canvas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-meta font-semibold transition-all cursor-pointer ${
              mobileTab === 'canvas' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
            }`}
          >
            Live Writing Canvas
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('marginalia')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-meta font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              mobileTab === 'marginalia' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Gemini Margin ({companionMessages.length})</span>
          </button>
        </div>
      )}

      <div
        className={`mt-4 grid grid-cols-1 ${
          isReflectionMode ? 'lg:grid-cols-12 gap-6 items-start' : ''
        } transition-all duration-300`}
      >
        {/* Left Column: Living, Interactive, Editable Journal Canvas */}
        <div
          className={`${
            isReflectionMode ? 'lg:col-span-7 xl:col-span-7' : 'w-full'
          } ${
            isReflectionMode && mobileTab === 'marginalia' ? 'hidden lg:flex' : 'flex'
          } flex-col journal-canvas-surface rounded-2xl sm:rounded-3xl relative overflow-hidden transition-all duration-300`}
        >
          {/* Active Marginalia Presence Strip (When Reflection is Active) */}
          {isReflectionMode && (
            <div className="px-5 sm:px-8 py-2.5 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-950 font-meta">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Side-by-side reflection active · Your canvas remains editable</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReflectionMode(false)}
                className="text-[11px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                title="Collapse marginalia back to single canvas"
              >
                Collapse Margin
              </button>
            </div>
          )}

          {/* Canvas Top Toolbar */}
          <div className="px-5 sm:px-8 py-3 bg-[#faf8f5]/60 border-b border-stone-200/70 flex items-center justify-between text-xs text-stone-600 font-meta">
            <div className="flex items-center gap-3">
              {saveSuccessNotice ? (
                <span className="text-emerald-700 flex items-center gap-1.5 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Preserved in cloud sanctuary</span>
                </span>
              ) : activeEntry ? (
                <span className="text-stone-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Synced #{activeEntry.id.slice(-5)}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-stone-600">
                  <Feather className="w-3 h-3 text-stone-600" />
                  <span>Writing Sanctuary</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span>{wordCount} words</span>
              <span className="text-stone-300">·</span>
              <span>~{estimatedReadTime} min read</span>
              <button
                type="button"
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="text-stone-600 hover:text-stone-900 transition-colors cursor-pointer flex items-center gap-1 ml-1"
                title="Toggle expansive focus mode"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">{isFocusMode ? 'Normal' : 'Focus'}</span>
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="px-5 sm:px-10 pt-6 sm:pt-8">
            <input
              type="text"
              id="journal-title-input"
              value={title}
              onFocus={() => setIsCanvasFocused(true)}
              onBlur={() => setIsCanvasFocused(false)}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title your moment..."
              className="w-full font-editorial text-2xl sm:text-3xl lg:text-4xl text-stone-900 placeholder:text-stone-300 font-normal border-0 border-b border-stone-200/80 pb-3 focus:outline-none focus:border-amber-800 bg-transparent transition-colors tracking-tight"
            />
          </div>

          {/* Writing Surface */}
          <div className="flex-1 px-5 sm:px-10 py-5 sm:py-6 flex flex-col">
            <textarea
              id="journal-content-textarea"
              value={reflectionText}
              onFocus={() => setIsCanvasFocused(true)}
              onBlur={() => setIsCanvasFocused(false)}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="What is honestly happening within you right now? Write freely, without editing or restraint..."
              className={`w-full flex-1 font-editorial text-base sm:text-lg lg:text-xl leading-[2.3rem] text-stone-900 placeholder:text-stone-300 placeholder:italic bg-transparent border-0 focus:outline-none resize-none transition-all ${
                isFocusMode
                  ? 'min-h-[520px]'
                  : isReflectionMode
                  ? 'min-h-[380px]'
                  : 'min-h-[300px] sm:min-h-[360px]'
              }`}
            />
          </div>

          {/* Error message alert */}
          {errorMessage && (
            <div className="mx-5 sm:mx-10 mb-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between shadow-2xs">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Canvas Bottom Action Dock */}
          <div className="px-5 sm:px-10 py-4 bg-[#faf8f5]/80 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
            {/* Companion Lens Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-meta text-stone-600 uppercase tracking-wider hidden sm:inline font-bold">
                Lens:
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
                {COMPANION_LENSES.map((lens) => {
                  const isSelected = selectedLens === lens.id;
                  const Icon = lens.icon;
                  return (
                    <button
                      key={lens.id}
                      type="button"
                      onClick={() => setSelectedLens(lens.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-stone-900 text-white font-medium shadow-2xs'
                          : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
                      }`}
                      title={`${lens.desc} — ${lens.subtitle}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : lens.accent}`} />
                      <span className="font-medium">{lens.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                id="btn-save-journal"
                onClick={handleSaveEntry}
                disabled={isSavingOnly || !reflectionText.trim()}
                className="px-4 py-2.5 rounded-xl border border-stone-300 hover:border-stone-400 bg-white text-stone-800 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 shadow-2xs hover:shadow-xs"
              >
                {isSavingOnly ? 'Preserving...' : activeEntry ? 'Save Changes' : 'Save Draft'}
              </button>

              <button
                type="button"
                id="btn-reflect-gemini"
                onClick={handleReflectWithGemini}
                disabled={isReflecting || !reflectionText.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 hover:from-stone-800 hover:to-amber-900 active:scale-98 text-white text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 shadow-xs ring-1 ring-amber-500/20"
              >
                <Sparkles
                  className={`w-4 h-4 text-amber-400 ${isReflecting ? 'animate-spin' : ''}`}
                />
                <span className="tracking-tight">
                  {isReflecting
                    ? 'Gemini is reflecting...'
                    : activeEntry?.messages?.some((m) => m.role === 'assistant')
                    ? 'Update with Gemini'
                    : 'Reflect with Gemini'}
                </span>
              </button>

              {companionMessages.length > 0 && !isReflectionMode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsReflectionMode(true);
                    setMobileTab('marginalia');
                  }}
                  className="px-3 py-2.5 bg-amber-50 text-amber-950 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                  title="Open companion reflection side-by-side"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">View Reflection ({companionMessages.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Integrated Gemini Companion Marginalia */}
        {isReflectionMode && (
          <div
            className={`lg:col-span-5 xl:col-span-5 ${
              mobileTab === 'canvas' ? 'hidden lg:flex' : 'flex'
            } flex-col h-full min-h-[580px] transition-all duration-300`}
          >
            <CompanionMarginalia
              activeEntry={activeEntry}
              selectedLens={selectedLens}
              onSelectLens={setSelectedLens}
              onSendReply={handleSendDialogueReply}
              isSendingReply={isSendingReply}
              onClose={() => setIsReflectionMode(false)}
              onReReflect={handleReflectWithGemini}
              isReflecting={isReflecting}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. ON THIS DAY DISCOVERED MEMORY MODAL                                    */}
      {/* ========================================================================= */}
      {isOnThisDayModalOpen && onThisDayKeepsake && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-meta uppercase tracking-wider text-amber-900 font-bold block">
                    {onThisDayKeepsake.tag}
                  </span>
                  <span className="text-xs text-stone-600 font-editorial italic">
                    {onThisDayKeepsake.timeframe}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOnThisDayModalOpen(false)}
                className="p-1.5 text-stone-600 hover:text-stone-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between text-xs font-meta text-stone-600">
                <span className="font-semibold text-stone-900 font-editorial text-lg">
                  "{onThisDayKeepsake.entry.title}"
                </span>
                <span>
                  {new Date(onThisDayKeepsake.entry.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="font-editorial text-sm sm:text-base text-stone-800 italic leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                "{onThisDayKeepsake.entry.messages?.find((m) => m.role === 'user')?.text || ''}"
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOnThisDayModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOnThisDayModalOpen(false);
                  onViewEntry(onThisDayKeepsake.entry);
                }}
                className="px-4.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Read Full Memory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SMART JOURNAL SEARCH OVERLAY MODAL                                     */}
      {/* ========================================================================= */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#faf8f5] rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[85vh] overflow-hidden animate-scaleUp">
            {/* Search Header */}
            <div className="p-5 border-b border-stone-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-xl font-semibold text-stone-900">
                  Search Your Memories
                </h3>
                <p className="text-xs text-stone-600 font-editorial italic mt-0.5">
                  Explore by conversational question, emotional resonance, or location context.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 text-stone-600 hover:text-stone-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Inputs & Resonance Filter */}
            <div className="p-5 space-y-3.5 bg-white border-b border-stone-200">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memorySearchQuery}
                  onChange={(e) => setMemorySearchQuery(e.target.value)}
                  placeholder="Ask a question: 'When did I feel most peaceful?' or search keywords..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800"
                />
              </div>

              {/* Conversational Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-stone-600 font-meta text-[11px]">Prompt sparks:</span>
                {SEARCH_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMemorySearchQuery(prompt)}
                    className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-amber-50 hover:border-amber-200 border border-stone-200/80 text-stone-700 font-editorial italic cursor-pointer transition-colors text-xs"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>

              {/* Mood Spectrum Filter */}
              <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedFilterMood(null)}
                  className={`px-3 py-1 rounded-lg text-xs font-meta cursor-pointer transition-all ${
                    selectedFilterMood === null
                      ? 'bg-stone-900 text-white font-bold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  All ({journals.length})
                </button>
                {EMOTIONAL_SPECTRUM.map((m) => (
                  <button
                    key={m.score}
                    type="button"
                    onClick={() =>
                      setSelectedFilterMood(selectedFilterMood === m.score ? null : m.score)
                    }
                    className={`px-3 py-1 rounded-lg text-xs font-meta cursor-pointer transition-all ${
                      selectedFilterMood === m.score
                        ? 'bg-stone-900 text-white font-bold'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {filteredMemories.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-stone-600 font-editorial italic text-sm">
                  <p>Your memories are waiting to be explored.</p>
                  <p className="font-sans text-xs text-stone-600">
                    Try searching for a different phrase or clearing the mood filter.
                  </p>
                </div>
              ) : (
                filteredMemories.map((entry) => {
                  const entryDate = new Date(entry.createdAt);
                  const moodObj =
                    EMOTIONAL_SPECTRUM.find((m) => m.score === entry.moodScore) ||
                    EMOTIONAL_SPECTRUM[3];
                  const userThought =
                    entry.messages?.find((m) => m.role === 'user')?.text || '';

                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        onViewEntry(entry);
                      }}
                      className="p-4 bg-white rounded-2xl border border-stone-200 hover:border-amber-400/80 transition-all cursor-pointer space-y-2 group shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs font-meta text-stone-600">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${moodObj.chipClass}`}>
                            {moodObj.name}
                          </span>
                          <span className="font-semibold text-stone-900 font-editorial text-base group-hover:text-amber-900 transition-colors">
                            {entry.title}
                          </span>
                        </div>
                        <span>
                          {entryDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="font-editorial text-xs sm:text-sm text-stone-700 italic line-clamp-2">
                        "{userThought}"
                      </p>
                      {entry.atmospheric && (
                        <div className="text-[10px] font-meta text-stone-600">
                          📍 {entry.atmospheric.locationName.split(',')[0]} · {entry.atmospheric.temperature}°C
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
