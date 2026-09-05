import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, JournalMessage } from '../types.js';
import {
  Sparkles,
  Send,
  X,
  Heart,
  Lightbulb,
  Compass,
  Feather,
  Quote,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface CompanionMarginaliaProps {
  activeEntry: JournalEntry | null;
  selectedLens: 'mindful' | 'curious' | 'grounded';
  onSelectLens: (lens: 'mindful' | 'curious' | 'grounded') => void;
  onSendReply: (replyText: string) => Promise<void>;
  isSendingReply: boolean;
  onClose: () => void;
  onReReflect?: () => void;
  isReflecting?: boolean;
}

const LENS_OPTIONS = [
  {
    id: 'mindful',
    label: 'Mindful',
    desc: 'Compassionate & gentle',
    icon: Heart,
    color: 'text-rose-600',
  },
  {
    id: 'curious',
    label: 'Inquisitive',
    desc: 'Deep roots & inquiry',
    icon: Lightbulb,
    color: 'text-amber-600',
  },
  {
    id: 'grounded',
    label: 'Grounded',
    desc: 'Clarity & next steps',
    icon: Compass,
    color: 'text-emerald-700',
  },
] as const;

const QUICK_INQUIRIES: Record<string, string[]> = {
  mindful: [
    'What would gentleness look like in this situation?',
    'Where in my body can I feel this emotion resting?',
    'What am I holding onto that I can softly release?',
  ],
  curious: [
    'What unspoken assumption might be underneath this?',
    'How does this moment connect to older patterns in my life?',
    'If fear were completely absent, what would I choose?',
  ],
  grounded: [
    'What is one small, tangible step I can take today?',
    'How can I protect my peace throughout this week?',
    'What boundary would serve me best right now?',
  ],
};

export const CompanionMarginalia: React.FC<CompanionMarginaliaProps> = React.memo(({
  activeEntry,
  selectedLens,
  onSelectLens,
  onSendReply,
  isSendingReply,
  onClose,
  onReReflect,
  isReflecting,
}) => {
  const [inputVal, setInputVal] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeEntry?.messages?.length, isSendingReply]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSendingReply) return;
    const text = inputVal.trim();
    setInputVal('');
    await onSendReply(text);
  };

  const handleSelectQuickInquiry = async (q: string) => {
    if (isSendingReply) return;
    await onSendReply(q);
  };

  const assistantMessages = activeEntry?.messages?.filter((m) => m.role === 'assistant') || [];
  const followUpExchanges = activeEntry?.messages?.slice(1) || []; // Messages after initial journal entry

  const inquiries = QUICK_INQUIRIES[selectedLens] || QUICK_INQUIRIES.mindful;

  return (
    <aside
      aria-label="Gemini Companion Marginalia"
      className="flex flex-col h-full bg-[#fdfcfb] rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden animate-fadeIn"
    >
      {/* 1. Marginalia Header */}
      <div className="px-5 py-3.5 bg-[#faf8f5] border-b border-stone-200/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-2xs">
            <Feather className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider font-meta text-stone-900">
                Companion Marginalia
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-subtle" />
            </div>
            <p className="text-[11px] text-stone-600 font-editorial italic">
              Reflective side commentary on your active writing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onReReflect && (
            <button
              type="button"
              onClick={onReReflect}
              disabled={isReflecting}
              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer text-xs disabled:opacity-40"
              title="Re-reflect with Gemini"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReflecting ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer text-xs"
            title="Collapse marginalia back to full canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Companion Lens Strip */}
      <div className="px-4 py-2 bg-white/70 border-b border-stone-100 flex items-center justify-between gap-2 text-xs shrink-0 overflow-x-auto">
        <span className="text-[10px] font-meta uppercase tracking-wider text-stone-600 font-bold shrink-0">
          Lens:
        </span>
        <div className="flex items-center gap-1">
          {LENS_OPTIONS.map((lens) => {
            const isCurrent = selectedLens === lens.id;
            const Icon = lens.icon;
            return (
              <button
                key={lens.id}
                type="button"
                onClick={() => onSelectLens(lens.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-meta transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-stone-900 text-white font-semibold shadow-2xs'
                    : 'bg-stone-100/70 hover:bg-stone-200/70 text-stone-600'
                }`}
                title={lens.desc}
              >
                <Icon className={`w-3 h-3 ${isCurrent ? 'text-amber-400' : lens.color}`} />
                <span>{lens.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Observed Themes Chips */}
      {activeEntry?.themes && activeEntry.themes.length > 0 && (
        <div className="px-4 py-2 bg-amber-50/40 border-b border-amber-100/60 flex items-center gap-1.5 flex-wrap shrink-0">
          <span className="text-[10px] font-meta uppercase tracking-wider text-amber-900 font-bold">
            Themes:
          </span>
          {activeEntry.themes.map((theme, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-white border border-amber-200/80 rounded-md text-[10px] font-meta text-amber-950 font-medium"
            >
              #{theme}
            </span>
          ))}
        </div>
      )}

      {/* 4. Editorial Marginalia Stream */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto"
      >
        {assistantMessages.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <Sparkles className="w-5 h-5 text-amber-500 mx-auto animate-spin" />
            <p className="font-editorial text-sm text-stone-700 italic">
              Gemini is listening to your words and crafting its reflection...
            </p>
          </div>
        ) : (
          followUpExchanges.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant';
            const isFirstReflection = isAssistant && idx === 0;

            if (isAssistant) {
              return (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 rounded-2xl transition-all space-y-2.5 ${
                    isFirstReflection
                      ? 'bg-white border-l-4 border-amber-600 border-t border-r border-b border-stone-200/90 shadow-2xs'
                      : 'bg-stone-50/90 border border-stone-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-meta text-stone-600">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isFirstReflection ? 'Reflection' : 'Margin Note'}</span>
                    </div>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="font-editorial text-sm sm:text-base text-stone-900 leading-[1.95rem] italic font-normal whitespace-pre-line">
                    "{msg.text}"
                  </p>
                </div>
              );
            }

            // User follow-up query
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs space-y-1 ml-4 shadow-2xs"
              >
                <div className="flex items-center justify-between text-[10px] font-meta text-amber-900 font-semibold">
                  <span>Author's Footnote / Inquiry</span>
                  <span className="font-normal text-amber-700">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="font-editorial text-stone-900 text-sm italic">
                  "{msg.text}"
                </p>
              </div>
            );
          })
        )}

        {isSendingReply && (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center gap-2 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span className="font-editorial italic">Gemini is penning a reflection...</span>
          </div>
        )}
      </div>

      {/* 5. Inquisitive Prompt Sparks (Gentle Follow-Up Questions) */}
      <div className="px-4 py-2.5 bg-stone-50/80 border-t border-stone-200/70 space-y-1.5 shrink-0">
        <span className="text-[10px] font-meta uppercase tracking-wider text-stone-600 font-bold block">
          ✦ Deepen this reflection:
        </span>
        <div className="flex flex-col gap-1">
          {inquiries.slice(0, 2).map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectQuickInquiry(q)}
              disabled={isSendingReply}
              className="text-left px-2.5 py-1.5 bg-white hover:bg-amber-50/70 border border-stone-200/80 rounded-lg text-xs font-editorial text-stone-800 italic transition-all cursor-pointer flex items-center justify-between gap-1 disabled:opacity-40 group shadow-2xs"
            >
              <span className="truncate">"{q}"</span>
              <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 6. Multi-Turn Marginalia Response Form */}
      <div className="p-3.5 bg-white border-t border-stone-200/90 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Pen a follow-up inquiry or thought..."
            disabled={isSendingReply}
            className="flex-1 px-3.5 py-2.5 bg-[#faf8f5] border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-800 focus:bg-white font-sans shadow-2xs"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isSendingReply}
            className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </aside>
  );
});

CompanionMarginalia.displayName = 'CompanionMarginalia';
