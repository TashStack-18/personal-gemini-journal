# PROJECT_SPEC.md
## Personal Gemini Journal — Cohort 3: "Accelerate AI with Cloud Run"

---

## 1. Project Overview

**Project Name:** Personal Gemini Journal

**One-line description:** A secure, AI-powered journaling app where users write and talk through their thoughts with Gemini, and later revisit them through an AI-generated "Mood Rewind" that surfaces patterns in how they've been feeling.

**Problem being solved:** Most people journal inconsistently and rarely re-read old entries, so they miss the patterns in their own thinking — recurring stressors, mood cycles, recurring ideas they never followed up on. A static notebook or plain note-taking app can't reflect anything back. Personal Gemini Journal turns journaling into a two-way conversation and then closes the loop by surfacing insights from that history.

**Target users:** Students and young professionals who want a low-friction way to reflect, brainstorm, or decompress, and who are comfortable trusting an AI assistant with private thoughts as long as their data is demonstrably isolated and secure.

**Main value proposition:** Not "a chatbot with a journal skin," but a private, secure reflection space where Gemini actively helps you think (through conversation) and later helps you *see* yourself (through pattern/mood insights) — with security treated as a first-class feature, not an afterthought.

---

## 2. Core User Experience

```
Landing Page
   │
   ▼
Sign Up / Log In (Firebase Auth)
   │
   ▼
Dashboard (list of past journals/conversations + "New Entry" button)
   │
   ▼
Create Journal Entry (title, optional mood tag, optional date/location)
   │
   ▼
Chat with Gemini (multi-turn reflection/brainstorm conversation)
   │
   ▼
Save Conversation → written to Firestore under the user's own subcollection
   │
   ▼
View History (past entries, searchable/scrollable list)
   │
   ▼
Use Original Feature (e.g., "Mood Rewind" — AI-generated summary across entries)
   │
   ▼
Logout
```

---

## 3. Recommended Original Features
- Primary MVP feature: **Mood Rewind** (Gemini reads user's recent journal entries and mood tags and generates warm structured summary: recurring themes, emotional highs/lows, gentle reflection).
- Data model: stored under `users/{userId}/rewinds/{rewindId}`.

---

## 4. Complete Feature List
### MVP / Must Have
- Firebase Authentication (sign up, log in, log out)
- Multi-turn Gemini journaling conversation (Phase 5)
- Save conversation/entry to Firestore
- View history of past entries
- Per-user data isolation enforced by Firestore Security Rules
- Secrets loaded via Secret Manager, never hardcoded
- Deployed on Cloud Run with a public URL

---

## 5. Technology Stack
- Frontend: React (Vite) + Tailwind CSS
- Backend: Node.js + Express
- AI: Gemini API
- Auth: Firebase Authentication
- Database: Cloud Firestore
- Secrets: Google Cloud Secret Manager
- Hosting: Google Cloud Run
- Container: Docker

---

## 6. System Architecture
Frontend (React) -> Firebase Auth (gets ID token)
Frontend -> Backend (Express with Authorization: Bearer <idToken>)
Backend -> Verify token (Firebase Admin SDK) -> Derive uid
Backend -> Cloud Firestore (`users/{uid}/...` only)
Cloud Firestore Security Rules enforce identity check on path `users/{userId}/...`

---

## 7. Data Model
```
users/{userId}
    displayName: string
    createdAt: timestamp
    lastActiveAt: timestamp

users/{userId}/journals/{journalId}
    title: string
    createdAt: timestamp
    updatedAt: timestamp
    moodScore: number (1-5)
    themes: array<string>
    messages: array<{
        role: "user" | "model",
        text: string,
        timestamp: timestamp
    }>

users/{userId}/rewinds/{rewindId}
    generatedAt: timestamp
    periodStart: timestamp
    periodEnd: timestamp
    summaryText: string
    highlightedThemes: array<string>
```

---

## 8. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, update: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;

      match /journals/{journalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /rewinds/{rewindId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false;
      }
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
