import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { Navbar, NavTab } from './components/Navbar.js';
import { AuthCard } from './components/AuthCard.js';
import { JournalEditor } from './components/JournalEditor.js';
import { HistoryView } from './components/HistoryView.js';
import { MoodRewindView } from './components/MoodRewindView.js';
import { SettingsView } from './components/SettingsView.js';
import { api } from './services/api.js';
import { fetchCurrentAtmosphere } from './services/weather.js';
import {
  subscribeToUserJournals,
  subscribeToUserRewinds,
  persistJournal,
  deleteJournalDoc,
  persistRewind,
} from './services/firestore.js';
import { JournalEntry, MoodRewind, AtmosphericContext } from './types.js';
import { Compass } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, idToken, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('journal');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [rewinds, setRewinds] = useState<MoodRewind[]>([]);
  const [atmosphere, setAtmosphere] = useState<AtmosphericContext | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [historySelectedEntry, setHistorySelectedEntry] = useState<JournalEntry | null>(null);
  const [journalInitialPrompt, setJournalInitialPrompt] = useState<string | null>(null);

  // Fetch current atmosphere
  useEffect(() => {
    let isMounted = true;
    async function loadAtmosphere() {
      try {
        const atmo = await fetchCurrentAtmosphere();
        if (isMounted) setAtmosphere(atmo);
      } catch (e) {
        console.warn('Atmosphere load warning:', e);
      }
    }
    loadAtmosphere();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshAtmosphere = async () => {
    try {
      const atmo = await fetchCurrentAtmosphere(true);
      setAtmosphere(atmo);
    } catch (e) {
      console.warn('Atmosphere refresh warning:', e);
    }
  };

  // Load user's journals and past rewinds upon authentication with real-time Firestore sync
  useEffect(() => {
    let isMounted = true;

    if (!user || !idToken) {
      setJournals([]);
      setRewinds([]);
      return;
    }

    setLoadingData(true);

    let unsubJournals: (() => void) | null = null;
    let unsubRewinds: (() => void) | null = null;

    if (!user.isSimulated) {
      // Connect to Firestore real-time subcollections
      try {
        unsubJournals = subscribeToUserJournals(
          user.uid,
          (liveJournals) => {
            if (isMounted) {
              setJournals(liveJournals);
              setLoadingData(false);
            }
          },
          (err) => {
            console.warn('Firestore journals subscription warning:', err);
          }
        );

        unsubRewinds = subscribeToUserRewinds(
          user.uid,
          (liveRewinds) => {
            if (isMounted) {
              setRewinds(liveRewinds);
            }
          },
          (err) => {
            console.warn('Firestore rewinds subscription warning:', err);
          }
        );
      } catch (err) {
        console.warn('Could not initialize Firestore listeners:', err);
      }
    }

    // Graceful initial API fetch
    Promise.allSettled([
      api.getJournals(idToken),
      api.getMoodRewinds(idToken),
    ]).then(([journalRes, rewindRes]) => {
      if (isMounted) {
        if (journalRes.status === 'fulfilled' && journalRes.value.journals) {
          setJournals((prev) => (prev.length === 0 ? journalRes.value.journals : prev));
        }
        if (rewindRes.status === 'fulfilled' && rewindRes.value.rewinds) {
          setRewinds((prev) => (prev.length === 0 ? rewindRes.value.rewinds : prev));
        }
        setLoadingData(false);
      }
    }).catch((err) => {
      console.warn('Fallback data note:', err);
      if (isMounted) setLoadingData(false);
    });

    return () => {
      isMounted = false;
      if (unsubJournals) unsubJournals();
      if (unsubRewinds) unsubRewinds();
    };
  }, [user, idToken]);

  const handleJournalCreated = (newJournal: JournalEntry) => {
    setJournals((prev) => [newJournal, ...prev.filter((j) => j.id !== newJournal.id)]);
    if (user && !user.isSimulated) {
      persistJournal(user.uid, newJournal).catch((e) =>
        console.warn('Firestore persist journal warning:', e)
      );
    }
  };

  const handleJournalUpdated = (updatedJournal: JournalEntry) => {
    setJournals((prev) =>
      prev.map((j) => (j.id === updatedJournal.id ? updatedJournal : j))
    );
    if (user && !user.isSimulated) {
      persistJournal(user.uid, updatedJournal).catch((e) =>
        console.warn('Firestore persist journal warning:', e)
      );
    }
  };

  const handleEntryDeleted = (id: string) => {
    setJournals((prev) => prev.filter((j) => j.id !== id));
    if (user && !user.isSimulated) {
      deleteJournalDoc(user.uid, id).catch((e) =>
        console.warn('Firestore delete journal warning:', e)
      );
    }
  };

  const handleRewindGenerated = (newRewind: MoodRewind) => {
    setRewinds((prev) => [newRewind, ...prev.filter((r) => r.id !== newRewind.id)]);
    if (user && !user.isSimulated) {
      persistRewind(user.uid, newRewind).catch((e) =>
        console.warn('Firestore persist rewind warning:', e)
      );
    }
  };

  const handleViewEntryInHistory = (entry: JournalEntry) => {
    setHistorySelectedEntry(entry);
    setActiveTab('history');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-xs animate-pulse">
            <Compass className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold tracking-wider text-stone-600 font-meta">
            Opening your journal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900 flex flex-col font-sans selection:bg-stone-200">
      {/* Navbar with brand, tabs, profile, and logout */}
      <Navbar
        activeTab={activeTab}
        atmosphere={atmosphere}
        onTabChange={(tab) => {
          if (tab !== 'history') setHistorySelectedEntry(null);
          setActiveTab(tab);
        }}
      />

      <main className="flex-1 w-full">
        {user ? (
          <>
            {activeTab === 'journal' && (
              <JournalEditor
                journals={journals}
                onJournalCreated={handleJournalCreated}
                onJournalUpdated={handleJournalUpdated}
                onViewEntry={handleViewEntryInHistory}
                onNavigateToRewind={() => setActiveTab('rewind')}
                atmosphere={atmosphere}
                onRefreshAtmosphere={handleRefreshAtmosphere}
                initialPrompt={journalInitialPrompt}
                onClearInitialPrompt={() => setJournalInitialPrompt(null)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                journals={journals}
                onEntryDeleted={handleEntryDeleted}
                onJournalUpdated={handleJournalUpdated}
                selectedEntryFromParent={historySelectedEntry}
                onClearSelectedEntry={() => setHistorySelectedEntry(null)}
              />
            )}

            {activeTab === 'rewind' && (
              <MoodRewindView
                journals={journals}
                rewinds={rewinds}
                onRewindGenerated={handleRewindGenerated}
                onNavigateToJournal={(prompt) => {
                  if (prompt) setJournalInitialPrompt(prompt);
                  setActiveTab('journal');
                }}
                onViewEntry={handleViewEntryInHistory}
              />
            )}

            {activeTab === 'settings' && <SettingsView />}
          </>
        ) : (
          /* Unauthenticated Landing / Google Sign-In View */
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center justify-center">
            <AuthCard />
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
