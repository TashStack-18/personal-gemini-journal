import React, { useState } from 'react';
import { JournalEntry } from '../types.js';
import { useAuth } from '../contexts/AuthContext.js';
import { api } from '../services/api.js';
import {
  Trash2,
  ChevronLeft,
  Send,
  Search,
  Sun,
  MapPin,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Bookmark,
  Calendar,
  Feather,
  Check,
} from 'lucide-react';

interface HistoryViewProps {
  journals: JournalEntry[];
  onEntryDeleted: (id: string) => void;
  onJournalUpdated: (journal: JournalEntry) => void;
  selectedEntryFromParent?: JournalEntry | null;
  onClearSelectedEntry?: () => void;
}

const SPECTRUM_MAP: Record<number, { name: string; color: string; bg: string }> = {
  1: { name: 'Overwhelmed', color: '#64748b', bg: 'bg-slate-100 text-slate-800 border border-slate-300' },
  2: { name: 'Uncertain', color: '#71717a', bg: 'bg-zinc-100 text-zinc-800 border border-zinc-300' },
  3: { name: 'Still', color: '#78716c', bg: 'bg-stone-100 text-stone-800 border border-stone-300' },
  4: { name: 'Grounded', color: '#b45309', bg: 'bg-amber-50 text-amber-900 border border-amber-300' },
  5: { name: 'Radiant', color: '#d97706', bg: 'bg-amber-100 text-amber-950 border border-amber-400' },
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  journals,
  onEntryDeleted,
  onJournalUpdated,
  selectedEntryFromParent,
  onClearSelectedEntry,
}) => {
  const { idToken } = useAuth();
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(
    selectedEntryFromParent || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  React.useEffect(() => {
    if (selectedEntryFromParent) {
      setSelectedEntry(selectedEntryFromParent);
    }
  }, [selectedEntryFromParent]);

  const handleBackToList = () => {
    setSelectedEntry(null);
    if (onClearSelectedEntry) onClearSelectedEntry();
  };

  const handleDelete = async (id: string) => {
    if (!idToken || isDeleting) return;
    const confirm = window.confirm('Are you sure you want to remove this memory from your archive?');
    if (!confirm) return;

    setIsDeleting(true);
    try {
      await api.deleteJournal(idToken, id);
      onEntryDeleted(id);
      setSelectedEntry(null);
      if (onClearSelectedEntry) onClearSelectedEntry();
    } catch (err: any) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !selectedEntry || !replyInput.trim() || isReplying) return;

    const reply = replyInput.trim();
    setReplyInput('');
    setIsReplying(true);

    try {
      const res = await api.chatReflection(idToken, selectedEntry.id, reply);
      if (res && res.allMessages) {
        const updated = { ...selectedEntry, messages: res.allMessages };
        setSelectedEntry(updated);
        onJournalUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to send companion reply:', err);
    } finally {
      setIsReplying(false);
    }
  };

  const filteredJournals = journals.filter((j) => {
    const matchesMood = filterMood === null || j.moodScore === filterMood;
    if (!searchQuery.trim()) return matchesMood;

    const q = searchQuery.toLowerCase().trim();
    const matchesTitle = j.title?.toLowerCase().includes(q);
    const matchesBody = j.messages?.some((m) => m.text.toLowerCase().includes(q));
    const matchesThemes = j.themes?.some((t) => t.toLowerCase().includes(q));
    const matchesLocation = j.atmospheric?.locationName.toLowerCase().includes(q);

    return matchesMood && (matchesTitle || matchesBody || matchesThemes || matchesLocation);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8 pb-28 sm:pb-16">
      {/* If an entry is selected: The Reading Folio */}
      {selectedEntry ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Back Action & Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 cursor-pointer font-meta"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-amber-700" />
              <span>Return to Memory Stream</span>
            </button>

            <button
              type="button"
              onClick={() => handleDelete(selectedEntry.id)}
              disabled={isDeleting}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-meta disabled:opacity-50"
              title="Delete memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Memory</span>
            </button>
          </div>

          {/* Reading Canvas */}
          <div className="journal-canvas-surface rounded-2xl sm:rounded-3xl p-6 sm:p-12 space-y-8">
            {/* Metadata Header */}
            <div className="space-y-3 pb-6 border-b border-stone-200/80">
              <div className="flex flex-wrap items-center gap-3 text-xs font-meta text-stone-600">
                <span className="font-semibold text-stone-800">
                  {new Date(selectedEntry.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {selectedEntry.atmospheric && (
                  <>
                    <span className="text-stone-300">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-700" />
                      <span>{selectedEntry.atmospheric.locationName}</span>
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span>{selectedEntry.atmospheric.temperature}°C ({selectedEntry.atmospheric.condition})</span>
                    </span>
                  </>
                )}
                <span className="text-stone-300">·</span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                    SPECTRUM_MAP[selectedEntry.moodScore]?.bg || 'bg-stone-100'
                  }`}
                >
                  {SPECTRUM_MAP[selectedEntry.moodScore]?.name || 'Still'} ({selectedEntry.moodScore}/5)
                </span>
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
                {selectedEntry.title}
              </h1>
            </div>

            {/* Reflection Body */}
            <div className="font-editorial text-base sm:text-lg lg:text-xl leading-[2.3rem] text-stone-900 space-y-4">
              <p className="whitespace-pre-line italic text-stone-800 font-normal">
                "{selectedEntry.messages?.find((m) => m.role === 'user')?.text || ''}"
              </p>
            </div>

            {/* Gemini Companion Layer Thread */}
            {selectedEntry.messages && selectedEntry.messages.length > 1 && (
              <div className="pt-8 border-t border-stone-200/80 space-y-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-editorial text-base sm:text-lg font-semibold text-stone-900">
                      Gemini Companion Dialogue
                    </h3>
                    <p className="text-[11px] font-meta text-stone-600">
                      Recorded conversational insights and reframings
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedEntry.messages
                    .filter((m) => m.role === 'assistant')
                    .map((msg, idx) => (
                      <div
                        key={idx}
                        className="bg-[#faf8f5] rounded-2xl p-5 sm:p-6 border border-stone-200/80 space-y-2 shadow-2xs"
                      >
                        <p className="font-editorial text-sm sm:text-base text-stone-900 italic leading-relaxed whitespace-pre-line">
                          "{msg.text}"
                        </p>
                        <span className="text-[10px] font-meta text-stone-600 block pt-1">
                          Reflected on {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Follow up form */}
                <form onSubmit={handleSendReply} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Continue your conversation with Gemini about this moment..."
                    disabled={isReplying}
                    className="flex-1 px-4 py-3 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800 font-sans shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!replyInput.trim() || isReplying}
                    className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vertical Chronological Memory Stream */
        <div className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-stone-200/90">
            <div>
              <span className="text-[11px] font-meta uppercase tracking-widest text-amber-900 font-bold block">
                Archive Folio
              </span>
              <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight mt-1">
                Memory Stream
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 font-editorial italic mt-1">
                Your chronological archive of personal reflections, moods, and companion dialogues.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-meta text-stone-700 bg-white px-3.5 py-1.5 rounded-full border border-stone-200 shadow-2xs">
                {journals.length} {journals.length === 1 ? 'memory preserved' : 'memories preserved'}
              </span>
            </div>
          </div>

          {/* Search & Valence Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archive by thought, title, location, or theme..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800 shadow-2xs font-sans"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto font-meta text-xs">
              <button
                type="button"
                onClick={() => setFilterMood(null)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filterMood === null
                    ? 'bg-stone-900 text-white font-bold shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                }`}
              >
                All ({journals.length})
              </button>
              {Object.entries(SPECTRUM_MAP).map(([scoreStr, m]) => {
                const score = parseInt(scoreStr, 10);
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setFilterMood(filterMood === score ? null : score)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      filterMood === score
                        ? 'bg-stone-900 text-white font-bold shadow-2xs'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                    title={m.name}
                  >
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stream of memories */}
          {filteredJournals.length === 0 ? (
            <div className="p-12 text-center journal-canvas-surface rounded-2xl sm:rounded-3xl space-y-2.5">
              <p className="font-editorial text-stone-800 text-lg">
                {journals.length === 0
                  ? 'Your archive is waiting for its first entry.'
                  : 'No reflections match this filter.'}
              </p>
              <p className="text-xs text-stone-600 font-editorial italic">
                {journals.length === 0
                  ? 'Switch to the Journal tab to capture your thoughts.'
                  : 'Try clearing your search query or selecting another emotional spectrum.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJournals.map((journal) => {
                const mood = SPECTRUM_MAP[journal.moodScore] || SPECTRUM_MAP[3];
                const entryDate = new Date(journal.createdAt);
                const userThought =
                  journal.messages?.find((m) => m.role === 'user')?.text || '';

                return (
                  <div
                    key={journal.id}
                    onClick={() => setSelectedEntry(journal)}
                    className="journal-canvas-surface hover:border-amber-400/80 p-5 sm:p-7 rounded-2xl sm:rounded-3xl transition-all cursor-pointer space-y-3 group shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md font-meta ${mood.bg}`}>
                          {mood.name}
                        </span>
                        <h3 className="font-editorial text-lg sm:text-xl font-semibold text-stone-900 group-hover:text-amber-900 transition-colors">
                          {journal.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-stone-600 font-meta">
                        {journal.atmospheric && (
                          <span className="hidden sm:flex items-center gap-1 text-stone-700">
                            <MapPin className="w-3 h-3 text-amber-700" />
                            <span>{journal.atmospheric.locationName.split(',')[0]}</span>
                          </span>
                        )}
                        <span>
                          {entryDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="font-editorial text-sm text-stone-700 italic line-clamp-2 leading-relaxed">
                      "{userThought}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-stone-600 pt-3 border-t border-stone-100 font-meta">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-stone-600" />
                        <span>{journal.messages?.length || 1} thoughts preserved</span>
                      </span>
                      <span className="font-semibold text-stone-900 group-hover:text-amber-900 flex items-center gap-1 transition-colors">
                        <span>Read full folio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
