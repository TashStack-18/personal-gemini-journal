import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { getAdminDb, isFirebaseConfigured } from '../firebaseAdmin.js';
import { generateJournalCompanionReply, generateMoodRewindAnalysis } from '../gemini.js';

export const journalsRouter = Router();

// In-memory isolated store fallback for local development before cloud Firestore is connected.
// Partitioned strictly by userId: inMemoryUserJournals.get(userId) -> journals array
interface JournalMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface AtmosphericData {
  locationName?: string;
  temperature?: number;
  feelsLike?: number;
  condition?: string;
  humidity?: number;
  windSpeed?: number;
  weatherCode?: number;
}

interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  moodScore: number;
  themes?: string[];
  atmospheric?: AtmosphericData;
  companionTone?: string;
  messages: JournalMessage[];
}

interface MoodRewindRecord {
  id: string;
  userId: string;
  generatedAt: string;
  summaryText: string;
  emotionalHighs: string[];
  emotionalLows?: string[];
  recurringThemes: string[];
  patternsNotice?: string[];
  emotionalTrend: string;
  averageMood: number;
  geminiReflection: string;
  gentleQuestion?: string;
  entriesAnalyzedCount: number;
}

const inMemoryUserJournals = new Map<string, JournalEntry[]>();
const inMemoryUserRewinds = new Map<string, MoodRewindRecord[]>();

/**
 * All routes in this router require a verified Firebase ID token.
 */
journalsRouter.use(requireAuth);

/**
 * GET /api/journals
 * Returns all journals belonging to the authenticated user.
 */
journalsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;

  try {
    const adminDb = getAdminDb();

    if (adminDb && isFirebaseConfigured()) {
      try {
        const snapshot = await adminDb
          .collection('users')
          .doc(userId)
          .collection('journals')
          .orderBy('createdAt', 'desc')
          .get();

        const journals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        res.json({ journals, source: 'firestore' });
        return;
      } catch (cloudErr) {
        console.warn('[Journals GET] Firestore query fallback to memory:', cloudErr instanceof Error ? cloudErr.message : String(cloudErr));
      }
    }

    // Local dev in-memory fallback (strictly isolated by userId)
    const userEntries = inMemoryUserJournals.get(userId) || [];
    res.json({
      journals: userEntries,
      source: 'local-memory',
      note: 'Using isolated in-memory storage.',
    });
  } catch (error) {
    console.error('[Journals GET Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve journal entries.' });
  }
});

/**
 * POST /api/journals
 * Creates a new journal entry scoped to users/{userId}/journals/{journalId}.
 */
journalsRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { title, moodScore, messages, atmospheric, companionTone } = req.body;

  // Input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'Validation Error: Title is required and must be non-empty.' });
    return;
  }

  if (title.length > 200) {
    res.status(400).json({ error: 'Validation Error: Title cannot exceed 200 characters.' });
    return;
  }

  const sanitizedMoodScore =
    typeof moodScore === 'number' && moodScore >= 1 && moodScore <= 5 ? moodScore : 3;

  const validMessages: JournalMessage[] = Array.isArray(messages)
    ? messages.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        text: typeof m.text === 'string' ? m.text.slice(0, 5000) : '',
        timestamp: new Date().toISOString(),
      }))
    : [];

  const now = new Date().toISOString();
  const entryId = `journal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const newEntry: JournalEntry = {
    id: entryId,
    userId,
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
    moodScore: sanitizedMoodScore,
    themes: [],
    atmospheric: atmospheric || undefined,
    companionTone: companionTone || 'mindful',
    messages: validMessages,
  };

  try {
    const adminDb = getAdminDb();

    if (adminDb && isFirebaseConfigured()) {
      try {
        await adminDb
          .collection('users')
          .doc(userId)
          .collection('journals')
          .doc(entryId)
          .set(newEntry);

        res.status(201).json({ journal: newEntry, source: 'firestore' });
        return;
      } catch (cloudErr) {
        console.warn('[Journals POST] Firestore write fallback to memory:', cloudErr instanceof Error ? cloudErr.message : String(cloudErr));
      }
    }

    // Local dev in-memory fallback
    const userEntries = inMemoryUserJournals.get(userId) || [];
    userEntries.unshift(newEntry);
    inMemoryUserJournals.set(userId, userEntries);

    res.status(201).json({ journal: newEntry, source: 'local-memory' });
  } catch (error) {
    console.error('[Journals POST Error]:', error);
    res.status(500).json({ error: 'Failed to create journal entry.' });
  }
});

/**
 * PUT /api/journals/:id
 * Updates an existing journal entry (title, moodScore, or messages).
 */
journalsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id;
  const { title, moodScore, messages, atmospheric, companionTone } = req.body;

  try {
    const adminDb = getAdminDb();
    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };

    if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
    if (typeof moodScore === 'number') updateData.moodScore = Math.max(1, Math.min(5, moodScore));
    if (Array.isArray(messages)) updateData.messages = messages;
    if (atmospheric) updateData.atmospheric = atmospheric;
    if (companionTone) updateData.companionTone = companionTone;

    if (adminDb && isFirebaseConfigured()) {
      try {
        const docRef = adminDb.collection('users').doc(userId).collection('journals').doc(entryId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          await docRef.update(updateData);
          const updated = { ...docSnap.data(), ...updateData, id: entryId };
          res.json({ success: true, journal: updated });
          return;
        }
      } catch (cloudErr) {
        console.warn('[Journals PUT] Firestore update fallback:', cloudErr);
      }
    }

    const userEntries = inMemoryUserJournals.get(userId) || [];
    const idx = userEntries.findIndex((e) => e.id === entryId);
    if (idx !== -1) {
      userEntries[idx] = { ...userEntries[idx], ...updateData };
      inMemoryUserJournals.set(userId, userEntries);
      res.json({ success: true, journal: userEntries[idx] });
      return;
    }

    res.status(404).json({ error: 'Journal entry not found.' });
  } catch (error) {
    console.error('[Journals PUT Error]:', error);
    res.status(500).json({ error: 'Failed to update journal entry.' });
  }
});

/**
 * POST /api/journals/reflect
 * Instant Reflect with Gemini endpoint.
 * Takes the current reflection text, mood, title, and returns both the persisted journal and Gemini's thoughtful reply.
 */
journalsRouter.post('/reflect', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const { title, text, moodScore, journalId, atmospheric, tone } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'Reflection text is required.' });
    return;
  }

  const sanitizedTitle = (title && typeof title === 'string' && title.trim())
    ? title.trim().slice(0, 150)
    : new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const sanitizedMood = typeof moodScore === 'number' && moodScore >= 1 && moodScore <= 5 ? moodScore : 4;
  const userText = text.trim();

  try {
    const adminDb = getAdminDb();
    let currentEntry: JournalEntry | null = null;
    let targetEntryId = journalId;

    if (targetEntryId) {
      if (adminDb && isFirebaseConfigured()) {
        try {
          const docSnap = await adminDb.collection('users').doc(userId).collection('journals').doc(targetEntryId).get();
          if (docSnap.exists) {
            currentEntry = { id: docSnap.id, ...(docSnap.data() as any) };
          }
        } catch (err) {
          console.warn('[Reflect] Firestore fetch fallback:', err);
        }
      }
      if (!currentEntry) {
        const userEntries = inMemoryUserJournals.get(userId) || [];
        const found = userEntries.find((e) => e.id === targetEntryId);
        if (found) currentEntry = found;
      }
    }

    const now = new Date().toISOString();
    const userMsg: JournalMessage = {
      role: 'user',
      text: userText,
      timestamp: now,
    };

    const priorMessages = currentEntry?.messages || [];
    const historyForGemini = priorMessages.map((m) => ({ role: m.role, text: m.text }));

    const activeAtmospheric = atmospheric || currentEntry?.atmospheric;
    const activeTone = tone || currentEntry?.companionTone || 'mindful';

    // Generate Gemini reflection reply with atmospheric grounding & tone
    const companionReplyText = await generateJournalCompanionReply(
      sanitizedTitle,
      sanitizedMood,
      historyForGemini,
      userText,
      activeAtmospheric,
      activeTone
    );

    const modelMsg: JournalMessage = {
      role: 'model',
      text: companionReplyText,
      timestamp: new Date().toISOString(),
    };

    const allUpdatedMessages = [...priorMessages, userMsg, modelMsg];

    if (currentEntry) {
      currentEntry.messages = allUpdatedMessages;
      currentEntry.updatedAt = now;
      currentEntry.moodScore = sanitizedMood;
      if (sanitizedTitle) currentEntry.title = sanitizedTitle;
      if (activeAtmospheric) currentEntry.atmospheric = activeAtmospheric;
      if (activeTone) currentEntry.companionTone = activeTone;

      if (adminDb && isFirebaseConfigured()) {
        try {
          await adminDb.collection('users').doc(userId).collection('journals').doc(targetEntryId).update({
            title: sanitizedTitle,
            moodScore: sanitizedMood,
            atmospheric: activeAtmospheric || null,
            companionTone: activeTone,
            messages: allUpdatedMessages,
            updatedAt: now,
          });
        } catch (err) {
          console.warn('[Reflect] Firestore update fallback:', err);
        }
      }

      const userEntries = inMemoryUserJournals.get(userId) || [];
      const idx = userEntries.findIndex((e) => e.id === targetEntryId);
      if (idx !== -1) {
        userEntries[idx] = currentEntry;
        inMemoryUserJournals.set(userId, userEntries);
      }

      res.json({
        success: true,
        journal: currentEntry,
        userMessage: userMsg,
        modelMessage: modelMsg,
        allMessages: allUpdatedMessages,
      });
      return;
    } else {
      // Create new journal entry
      const newEntryId = `journal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const newEntry: JournalEntry = {
        id: newEntryId,
        userId,
        title: sanitizedTitle,
        createdAt: now,
        updatedAt: now,
        moodScore: sanitizedMood,
        themes: [],
        atmospheric: activeAtmospheric || undefined,
        companionTone: activeTone,
        messages: allUpdatedMessages,
      };

      if (adminDb && isFirebaseConfigured()) {
        try {
          await adminDb.collection('users').doc(userId).collection('journals').doc(newEntryId).set(newEntry);
        } catch (err) {
          console.warn('[Reflect] Firestore write fallback:', err);
        }
      }

      const userEntries = inMemoryUserJournals.get(userId) || [];
      userEntries.unshift(newEntry);
      inMemoryUserJournals.set(userId, userEntries);

      res.status(201).json({
        success: true,
        journal: newEntry,
        userMessage: userMsg,
        modelMessage: modelMsg,
        allMessages: allUpdatedMessages,
      });
      return;
    }
  } catch (error) {
    console.error('[Journals Reflect Error]:', error);
    res.status(500).json({ error: 'Failed to reflect with Gemini.' });
  }
});

/**
 * DELETE /api/journals/:id
 * Deletes a journal entry belonging to the authenticated user.
 */
journalsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id;

  try {
    const adminDb = getAdminDb();

    if (adminDb && isFirebaseConfigured()) {
      try {
        const docRef = adminDb.collection('users').doc(userId).collection('journals').doc(entryId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          await docRef.delete();
          res.json({ success: true, id: entryId });
          return;
        }
      } catch (cloudErr) {
        console.warn('[Journals DELETE] Firestore delete fallback to memory:', cloudErr instanceof Error ? cloudErr.message : String(cloudErr));
      }
    }

    // Local dev in-memory fallback
    const userEntries = inMemoryUserJournals.get(userId) || [];
    const index = userEntries.findIndex((e) => e.id === entryId);

    if (index === -1) {
      res.status(404).json({ error: 'Journal entry not found or access denied.' });
      return;
    }

    userEntries.splice(index, 1);
    inMemoryUserJournals.set(userId, userEntries);
    res.json({ success: true, id: entryId });
  } catch (error) {
    console.error('[Journals DELETE Error]:', error);
    res.status(500).json({ error: 'Failed to delete journal entry.' });
  }
});

/**
 * POST /api/journals/:id/chat
 * Multi-turn Gemini reflection conversation within a journal entry.
 * Evaluates the entry's mood, existing thoughts, and returns an empathetic companion response.
 */
journalsRouter.post('/:id/chat', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;
  const entryId = req.params.id;
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Message is required.' });
    return;
  }

  try {
    const adminDb = getAdminDb();
    let currentEntry: JournalEntry | null = null;

    if (adminDb && isFirebaseConfigured()) {
      try {
        const docRef = adminDb.collection('users').doc(userId).collection('journals').doc(entryId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          currentEntry = { id: docSnap.id, ...(docSnap.data() as any) };
        }
      } catch (cloudErr) {
        console.warn('[Journals Chat] Firestore query fallback to memory:', cloudErr);
      }
    }

    if (!currentEntry) {
      const userEntries = inMemoryUserJournals.get(userId) || [];
      const found = userEntries.find((e) => e.id === entryId);
      if (found) currentEntry = found;
    }

    if (!currentEntry) {
      res.status(404).json({ error: 'Journal entry not found.' });
      return;
    }

    const userMsg: JournalMessage = {
      role: 'user',
      text: message.trim().slice(0, 4000),
      timestamp: new Date().toISOString(),
    };

    // Generate Gemini companion response using server-side SDK
    const companionReplyText = await generateJournalCompanionReply(
      currentEntry.title,
      currentEntry.moodScore,
      currentEntry.messages.map((m) => ({ role: m.role, text: m.text })),
      userMsg.text,
      currentEntry.atmospheric,
      currentEntry.companionTone
    );

    const modelMsg: JournalMessage = {
      role: 'model',
      text: companionReplyText,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(currentEntry.messages || []), userMsg, modelMsg];
    const now = new Date().toISOString();

    // Persist updated conversation
    if (adminDb && isFirebaseConfigured()) {
      try {
        await adminDb
          .collection('users')
          .doc(userId)
          .collection('journals')
          .doc(entryId)
          .update({
            messages: updatedMessages,
            updatedAt: now,
          });
      } catch (cloudErr) {
        console.warn('[Journals Chat] Firestore update fallback:', cloudErr);
      }
    }

    // Update in-memory
    const userEntries = inMemoryUserJournals.get(userId) || [];
    const idx = userEntries.findIndex((e) => e.id === entryId);
    if (idx !== -1) {
      userEntries[idx].messages = updatedMessages;
      userEntries[idx].updatedAt = now;
      inMemoryUserJournals.set(userId, userEntries);
    }

    res.json({
      success: true,
      userMessage: userMsg,
      modelMessage: modelMsg,
      allMessages: updatedMessages,
    });
  } catch (error) {
    console.error('[Journals Chat Error]:', error);
    res.status(500).json({ error: 'Failed to generate companion reflection.' });
  }
});

/**
 * POST /api/journals/rewinds
 * Primary Original Feature: Mood Rewind
 * Gemini reads user's recent journal entries and mood scores and generates a structured summary:
 * emotional highs/lows, recurring themes, mood trajectory, and warm reflection.
 * Stored under users/{userId}/rewinds/{rewindId}.
 */
journalsRouter.post('/rewinds/generate', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;

  try {
    const clientEntries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const entries: JournalEntry[] =
      clientEntries.length > 0 ? clientEntries : inMemoryUserJournals.get(userId) || [];

    // Call Gemini intelligence engine to analyze entries
    const analysis = await generateMoodRewindAnalysis(entries, req.user?.email?.split('@')[0]);

    const rewindId = `rewind_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const rewindRecord: MoodRewindRecord = {
      id: rewindId,
      userId,
      generatedAt: now,
      summaryText: analysis.summaryText,
      emotionalHighs: analysis.emotionalHighs,
      emotionalLows: analysis.emotionalLows,
      recurringThemes: analysis.recurringThemes,
      patternsNotice: analysis.patternsNotice,
      emotionalTrend: analysis.emotionalTrend,
      averageMood: analysis.averageMood,
      geminiReflection: analysis.geminiReflection,
      gentleQuestion: analysis.gentleQuestion,
      entriesAnalyzedCount: analysis.entriesAnalyzedCount,
    };

    // Save in-memory cache
    const userRewinds = inMemoryUserRewinds.get(userId) || [];
    userRewinds.unshift(rewindRecord);
    inMemoryUserRewinds.set(userId, userRewinds);

    res.status(201).json({ rewind: rewindRecord });
  } catch (error) {
    console.error('[Mood Rewind Generate Error]:', error);
    res.status(500).json({ error: 'Failed to generate Mood Rewind.' });
  }
});

/**
 * GET /api/journals/rewinds
 * Returns past Mood Rewind snapshots for the authenticated user.
 */
journalsRouter.get('/rewinds', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.uid;

  try {
    const userRewinds = inMemoryUserRewinds.get(userId) || [];
    res.json({ rewinds: userRewinds });
  } catch (error) {
    console.error('[Mood Rewind GET Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve Mood Rewinds.' });
  }
});

