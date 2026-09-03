import { JournalEntry, MoodRewind, JournalMessage, AtmosphericContext } from '../types.js';

export interface AuthMeResponse {
  authenticated: boolean;
  user: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
  };
  firebaseConfigured: boolean;
  message: string;
}

export interface VerifyIsolationResponse {
  success: boolean;
  message?: string;
  scopedPath?: string;
  error?: string;
  details?: {
    attemptedAccessTo: string;
    verifiedTokenUid: string;
    enforcement: string;
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = { error: 'Unable to process server response. Please try again.' };
    }
  } else {
    // If the server returned an HTML error page or fallback
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      throw new Error(`Unable to complete this request right now (Status ${res.status}). Please try again.`);
    }
    throw new Error('Unexpected response format received from the server.');
  }

  if (!res.ok) {
    const errorMsg = data?.error || data?.message;
    // Strip technical token errors if present
    if (typeof errorMsg === 'string' && errorMsg.includes('<')) {
      throw new Error('The server encountered a momentary issue. Please try again.');
    }
    throw new Error(errorMsg || `Unable to complete request (${res.status}).`);
  }
  return data;
}

export const api = {
  /**
   * Validates the active user's ID token against the backend.
   */
  async getMe(idToken: string): Promise<AuthMeResponse> {
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return handleResponse<AuthMeResponse>(res);
  },

  /**
   * Fetches journal entries belonging to the authenticated user.
   */
  async getJournals(idToken: string): Promise<{ journals: JournalEntry[]; source: string }> {
    const res = await fetch('/api/journals', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return handleResponse<{ journals: JournalEntry[]; source: string }>(res);
  },

  /**
   * Creates a journal entry scoped strictly to the token-derived UID.
   */
  async createJournal(
    idToken: string,
    payload: {
      title: string;
      moodScore: number;
      messages?: any[];
      atmospheric?: AtmosphericContext;
      companionTone?: string;
    }
  ): Promise<{ journal: JournalEntry; source: string }> {
    const res = await fetch('/api/journals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ journal: JournalEntry; source: string }>(res);
  },

  /**
   * Updates an existing journal entry.
   */
  async updateJournal(
    idToken: string,
    journalId: string,
    payload: {
      title?: string;
      moodScore?: number;
      messages?: JournalMessage[];
      atmospheric?: AtmosphericContext;
      companionTone?: string;
    }
  ): Promise<{ success: boolean; journal: JournalEntry }> {
    const res = await fetch(`/api/journals/${journalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; journal: JournalEntry }>(res);
  },

  /**
   * Dedicated Reflect with Gemini action.
   */
  async reflectJournal(
    idToken: string,
    payload: {
      title?: string;
      text: string;
      moodScore?: number;
      journalId?: string;
      atmospheric?: AtmosphericContext;
      tone?: string;
    }
  ): Promise<{
    success: boolean;
    journal: JournalEntry;
    userMessage: JournalMessage;
    modelMessage: JournalMessage;
    allMessages: JournalMessage[];
  }> {
    const res = await fetch('/api/journals/reflect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  /**
   * Deletes a journal entry belonging to the user.
   */
  async deleteJournal(idToken: string, journalId: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/journals/${journalId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return handleResponse<{ success: boolean; id: string }>(res);
  },

  /**
   * Sends reflection to Gemini companion in multi-turn conversation.
   */
  async chatReflection(
    idToken: string,
    journalId: string,
    message: string
  ): Promise<{
    success: boolean;
    userMessage: JournalMessage;
    modelMessage: JournalMessage;
    allMessages: JournalMessage[];
  }> {
    const res = await fetch(`/api/journals/${journalId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ message }),
    });
    return handleResponse(res);
  },

  /**
   * Generates a Mood Rewind analysis across user's reflections using Gemini.
   */
  async generateMoodRewind(idToken: string, entries?: JournalEntry[]): Promise<{ rewind: MoodRewind }> {
    const res = await fetch('/api/journals/rewinds/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ entries: entries || [] }),
    });
    return handleResponse<{ rewind: MoodRewind }>(res);
  },

  /**
   * Fetches the user's saved Mood Rewinds.
   */
  async getMoodRewinds(idToken: string): Promise<{ rewinds: MoodRewind[] }> {
    const res = await fetch('/api/journals/rewinds', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    return handleResponse<{ rewinds: MoodRewind[] }>(res);
  },

  /**
   * Security Verification:
   * Proves that the server rejects any attempt to specify a different targetUserId.
   */
  async testCrossUserIsolation(
    idToken: string,
    targetUserId: string
  ): Promise<VerifyIsolationResponse> {
    const res = await fetch('/api/auth/verify-isolation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ targetUserId }),
    });
    return handleResponse<VerifyIsolationResponse>(res);
  },
};

