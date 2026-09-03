import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface JournalConversationMessage {
  role: 'user' | 'model';
  text: string;
}

export interface CompanionAtmospheric {
  locationName?: string;
  temperature?: number;
  feelsLike?: number;
  condition?: string;
}

/**
 * Generates an empathetic, reflective multi-turn response to a user's journal entry or reflection.
 */
export async function generateJournalCompanionReply(
  entryTitle: string,
  moodScore: number,
  history: JournalConversationMessage[],
  latestUserText: string,
  atmospheric?: CompanionAtmospheric,
  tone?: string
): Promise<string> {
  const ai = getGemini();

  const moodDescriptions: Record<number, string> = {
    1: 'Struggling / Overwhelmed',
    2: 'Low / Heavy / Stressed',
    3: 'Neutral / Centered / Steady',
    4: 'Good / Balanced / Hopeful',
    5: 'Energized / Joyful / Thriving',
  };

  const currentMood = moodDescriptions[moodScore] || 'Balanced';
  const selectedTone = tone || 'mindful';

  let toneGuidance = 'Be gentle, deeply attentive, and encouraging with present-moment awareness.';
  if (selectedTone === 'curious') {
    toneGuidance = 'Be intellectually thoughtful and psychologically curious, asking gently probing questions to help uncover deeper truths.';
  } else if (selectedTone === 'grounded') {
    toneGuidance = 'Be rooted, calming, and practical, helping the user find stable footing and tangible clarity.';
  }

  const atmosphereDetail = atmospheric
    ? `Atmospheric Context: The user is writing from ${atmospheric.locationName || 'their sanctuary'}, where the weather is ${atmospheric.temperature ?? 22}°C (${atmospheric.condition || 'Partly cloudy'}). If fitting, you may subtly ground your opening or reflection in this tangible environment.`
    : '';

  const systemInstruction = `You are an empathetic, compassionate, and insightful AI journaling companion inside "Personal Gemini Journal".
The user has titled this reflection: "${entryTitle}" and tagged their mood as: "${currentMood}" (Score: ${moodScore}/5).
Companion Tone: ${selectedTone} (${toneGuidance}).
${atmosphereDetail}

Guidelines:
- Help the user unpack their thoughts, feelings, and experiences with genuine curiosity and warmth.
- Validate what they are going through without being robotic or overly formal.
- Keep responses concise, reflective, and conversational (2 short, focused paragraphs).
- Offer an observational reframe or perspective on what they shared.
- Conclude with exactly ONE gentle, open-ended question that encourages them to reflect deeper or look inward.
- Never sound generic or clinical; speak warmly, like a trusted, attentive friend.
- Avoid clichés like "I understand how you feel" or "Here are three tips". Speak to the heart of what they wrote.`;

  // Format the conversation for generateContent
  const conversationContext = history.map((msg) => `${msg.role === 'user' ? 'User' : 'Gemini'}: ${msg.text}`).join('\n\n');
  const prompt = `${conversationContext ? `Prior conversation:\n${conversationContext}\n\n` : ''}User's reflection:\n"${latestUserText}"\n\nPlease provide your empathetic companion reflection and one gentle follow-up question.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Thank you for sharing this thought. How has writing it down made you feel?";
  } catch (err: any) {
    console.error('[Gemini Companion Error]:', err);
    return "I hear how meaningful this is for you. As you sit with these thoughts, what is one kind thing you can offer yourself today?";
  }
}

export interface MoodRewindOutput {
  summaryText: string;
  emotionalHighs: string[];
  emotionalLows: string[];
  recurringThemes: string[];
  patternsNotice: string[];
  emotionalTrend: string;
  averageMood: number;
  geminiReflection: string;
  gentleQuestion: string;
  entriesAnalyzedCount: number;
}

/**
 * Mood Rewind: The primary original feature.
 * Analyzes the user's journal entries and mood scores to surface patterns, recurring themes,
 * emotional highs/lows, and a gentle personalized reflection.
 */
export async function generateMoodRewindAnalysis(
  entries: {
    id: string;
    title: string;
    createdAt: string;
    moodScore: number;
    messages: { role: string; text: string }[];
  }[],
  userDisplayName?: string
): Promise<MoodRewindOutput> {
  const ai = getGemini();

  if (!entries || entries.length === 0) {
    return {
      summaryText: "You haven't written any journal entries yet. Start by writing your first reflection!",
      emotionalHighs: ["Ready to begin your journaling journey"],
      emotionalLows: ["Awaiting first entries"],
      recurringThemes: ["New beginnings", "Self-discovery"],
      patternsNotice: ["A fresh, unwritten space awaits your daily reflections"],
      emotionalTrend: "Clean slate",
      averageMood: 3,
      geminiReflection: "Every journey begins with a single honest thought. Whenever you're ready, write down whatever is on your mind.",
      gentleQuestion: "What is one truth you want to give a voice to today?",
      entriesAnalyzedCount: 0,
    };
  }

  // Calculate average mood
  const totalScore = entries.reduce((acc, e) => acc + (e.moodScore || 3), 0);
  const avgMood = Number((totalScore / entries.length).toFixed(1));

  // Synthesize entry digests for the prompt
  const entriesDigest = entries.slice(0, 15).map((e, idx) => {
    const excerpts = e.messages.map((m) => m.text).slice(0, 3).join(' ');
    const shortExcerpt = excerpts.length > 250 ? excerpts.slice(0, 250) + '...' : excerpts;
    return `[Entry ${idx + 1}] Date: ${e.createdAt.slice(0, 10)} | Title: "${e.title}" | Mood: ${e.moodScore}/5 | Thoughts: "${shortExcerpt}"`;
  }).join('\n');

  const prompt = `Analyze these ${entries.length} journal reflections for ${userDisplayName || 'the user'}:

${entriesDigest}

Generate a structured Mood Rewind analysis. Return a JSON object with this exact schema:
{
  "summaryText": "A warm, narrative 2-3 paragraph reflection summarizing how the user has been feeling over this period, acknowledging both challenges and celebrations.",
  "emotionalHighs": ["List of 2 to 3 moments or themes of clarity, optimism, gratitude, or growth observed with subtle citations from their entries"],
  "emotionalLows": ["List of 2 to 3 heavier moments or vulnerabilities navigated with compassion"],
  "recurringThemes": ["List of 3 to 5 recurring themes or recurring topics"],
  "patternsNotice": ["List of 2 to 3 patterns noticed (e.g., how timing, activities, or solitude correlate with shifts in mood)"],
  "emotionalTrend": "A short descriptive label of their emotional trajectory (e.g., 'Resilient & Climbing', 'Reflective & Centered', 'Navigating Stress with Clarity')",
  "geminiReflection": "A personalized, poetic, and encouraging note directly to the user reminding them of their strengths.",
  "gentleQuestion": "A thoughtful, gentle reflective question for tomorrow."
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are the Mood Rewind intelligence engine inside Personal Gemini Journal. Your role is to look across multiple reflections, identify hidden emotional patterns and strengths, and present them with warmth, empathy, and psychological safety. Always return strictly valid JSON.",
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    return {
      summaryText: parsed.summaryText || `You have recorded ${entries.length} reflections with an average mood of ${avgMood}/5. You have shown continuous dedication to processing your feelings.`,
      emotionalHighs: Array.isArray(parsed.emotionalHighs) && parsed.emotionalHighs.length > 0
        ? parsed.emotionalHighs
        : ["Moments of honest reflection and self-honoring"],
      emotionalLows: Array.isArray(parsed.emotionalLows) && parsed.emotionalLows.length > 0
        ? parsed.emotionalLows
        : ["Navigating moments of fatigue and quiet doubt with patience"],
      recurringThemes: Array.isArray(parsed.recurringThemes) && parsed.recurringThemes.length > 0
        ? parsed.recurringThemes
        : ["Personal growth", "Mindfulness", "Daily navigation"],
      patternsNotice: Array.isArray(parsed.patternsNotice) && parsed.patternsNotice.length > 0
        ? parsed.patternsNotice
        : ["Consistent writing creates emotional decompression", "Clarity emerges when naming feelings openly"],
      emotionalTrend: parsed.emotionalTrend || (avgMood >= 3.8 ? "Positive & Expanding" : avgMood >= 2.8 ? "Steady & Grounded" : "Processing & Gentle Recovery"),
      averageMood: avgMood,
      geminiReflection: parsed.geminiReflection || "Taking the time to write your feelings down is a profound act of self-care. Keep listening to what your reflections tell you.",
      gentleQuestion: parsed.gentleQuestion || "What is one kindness you can extend to yourself as you step into tomorrow?",
      entriesAnalyzedCount: entries.length,
    };
  } catch (err) {
    console.error('[Mood Rewind Generation Error]:', err);
    return {
      summaryText: `Across your ${entries.length} reflections, you have logged meaningful moments with an average mood score of ${avgMood}/5. Your reflections highlight steady resilience and growing self-awareness.`,
      emotionalHighs: ["Dedication to consistent mindfulness and honest thought processing"],
      emotionalLows: ["Bearing moments of uncertainty while staying present"],
      recurringThemes: ["Self-reflection", "Navigating daily balance", "Emotional clarity"],
      patternsNotice: ["Reflections tend to bring calmer perspective after writing"],
      emotionalTrend: avgMood >= 3.5 ? "Uptrend & Hopeful" : "Grounded & Reflective",
      averageMood: avgMood,
      geminiReflection: "Growth isn't always linear. Each reflection is a signpost marking how far you've traveled.",
      gentleQuestion: "When you look back on these days, what truth feels most worth keeping?",
      entriesAnalyzedCount: entries.length,
    };
  }
}
