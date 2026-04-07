import axios from 'axios';
import { Step } from '../types';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TASK BREAKER: AI-POWERED TASK DECOMPOSITION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PRIMARY SOLUTION: Ollama (Free, Local, Private)
 * ├─ 🚀 Model: Llama 3.1 8B (5 GB, ~500-2000 ms per request)
 * ├─ 📍 Endpoints: http://10.0.2.2:11434 (Android) or http://localhost:11434 (Dev)
 * └─ ⚙️ Setup: ollama serve (in separate terminal)
 *
 * FALLBACK CHAIN:
 * 1. Ollama (Emulator URL)     → 2. Ollama (Localhost)
 * 3. OpenAI (optional, legacy) → 4. Offline FALLBACK_STEPS (no network)
 *
 * NO API KEYS REQUIRED for Ollama — All processing is local and private!
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const OLLAMA_MODEL = 'llama3.1:8b';
const OLLAMA_URLS = [
  'http://10.0.2.2:11434/v1/chat/completions', // Android Emulator (VirtualBox/Hyper-V)
  'http://localhost:11434/v1/chat/completions',  // Local development (Windows/Mac/Linux)
];

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Optional: OpenAI API key (only used if Ollama fails and key is set)
 * NEVER hardcode this in production.
 * For local dev: use .env file or react-native-config
 * For prod: proxy through a secure backend service
 */
const getApiKey = (): string => {
  // TODO: replace with react-native-config or backend proxy
  return '';
};

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type RoutineTask = {
  time: string;
  title: string;
};

// ─── System prompt — the "soul" of the Task Breaker ──────────────────────────
const SYSTEM_PROMPT = `Olet FocusPet-sovelluksen tehtäväavustaja lapsille (7-12-vuotiaille).
Tehtäväsi on pilkkoa arjen tehtävä 3–5 pieneen, hauskaan askeleeseen.

SÄÄNNÖT:
• Jokainen askel alkaa toimintaverbillä (Kerää, Laita, Petaa, Pese, Siirrä...).
• Maksimissaan 8 sanaa per askel. Lyhyt ja selkeä!
• Jokainen askel sisältää yhden emojin alussa.
• Käytä yksinkertaista, rohkaisevaa kieltä — kuin kaveri puhuisi.
• ÄLÄ käytä vaikeita sanoja tai pitkiä lauseita.
• Askelet etenevät loogisessa järjestyksessä.

VASTAA AINOASTAAN validissa JSON-muodossa, ilman muuta tekstiä:
{
  "steps": [
    { "emoji": "🗑️", "description": "Kerää roskat lattialta" },
    { "emoji": "🧸", "description": "Laita lelut omaan laatikkoon" }
  ]
}`;

const ROUTINE_PROMPT = `Olet FocusPet-sovelluksen päivärytmiavustaja lapselle.
Luo päivän tehtävälista suunnilleen kellonaikojen mukaan.

SÄÄNNÖT:
• Käytä arkisia tehtäviä: aamupala, hampaidenpesu, laakkeiden ottaminen, vaatteiden pukeminen, koulurepun pakkaaminen, syominen, laksyt, ulkoilu, iltapala, hampaiden pesu.
• Palauta 8-10 tehtävää.
• Järjestä ne aikajärjestykseen aamusta iltaan.
• Aika formaatti aina HH:MM (24h).
• Otsikko lyhyt, max 4 sanaa.

VASTAA VAIN JSONINA:
{
  "tasks": [
    { "time": "07:00", "title": "Aamupala" }
  ]
}`;

const FALLBACK_ROUTINE: RoutineTask[] = [
  { time: '07:00', title: 'Aamupala' },
  { time: '07:10', title: 'Ota laakkeet' },
  { time: '07:20', title: 'Pese hampaat' },
  { time: '07:35', title: 'Pue vaatteet' },
  { time: '07:50', title: 'Pakkaa koulureppu' },
  { time: '14:30', title: 'Välipala' },
  { time: '15:00', title: 'Tee läksyt' },
  { time: '16:30', title: 'Ulkoilu' },
  { time: '18:00', title: 'Päivällinen' },
  { time: '20:00', title: 'Iltapala' },
  { time: '20:15', title: 'Ota laakkeet' },
  { time: '20:30', title: 'Pese hampaat' },
];

async function callOllama(messages: ChatMessage[]): Promise<string> {
  let lastError: unknown = null;

  for (const url of OLLAMA_URLS) {
    try {
      const response = await axios.post(
        url,
        {
          model: OLLAMA_MODEL,
          messages,
          response_format: { type: 'json_object' },
          max_tokens: 450,
          temperature: 0.6,
        },
        { timeout: 15_000 },
      );

      return response.data.choices[0].message.content as string;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Ollama request failed');
}

function extractJson(content: string): string {
  const cleaned = content.replace(/```json|```/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return cleaned;
  }

  return cleaned.slice(start, end + 1);
}

async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  /**
   * ⚠️ FALLBACK ONLY — This is optional and only used if:
   * 1. Ollama is unavailable
   * 2. OPENAI_API_KEY environment variable is set
   *
   * For production apps, this adds cost ($0.03/1M tokens for gpt-4o-mini).
   * We recommend keeping Ollama as the primary solution.
   */
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI key missing');
  }

  const response = await axios.post(
    OPENAI_URL,
    {
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 450,
      temperature: 0.6,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    },
  );

  return response.data.choices[0].message.content as string;
}

// ─── Main AI call — Fallback chain: Ollama → OpenAI (optional) → Offline ───────
export async function breakTaskWithAI(taskTitle: string): Promise<Step[]> {
  /**
   * Fallback Chain:
   * 1. Ollama (primary, free, no API key needed)
   *    ├─ http://10.0.2.2:11434 (Android Emulator)
   *    └─ http://localhost:11434 (Local dev)
   * 2. OpenAI (optional, costs money, fallback only)
   * 3. Offline FALLBACK_STEPS (always works, no network needed)
   */
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Pilko tämä tehtävä lapselle sopiviin askeleisiin: "${taskTitle}"`,
    },
  ];

  // 🚀 PRIMARY: Try Ollama (free, local, private)
  try {
    const content = await callOllama(messages);
    const parsed = JSON.parse(extractJson(content)) as {
      steps: Array<{ emoji: string; description: string }>;
    };

    if (!parsed.steps?.length) {
      throw new Error('No steps from Ollama');
    }

    return parsed.steps.map((s, i) => buildStep(s.emoji, s.description, i));
  } catch (ollamaError) {
    // 🔄 SECONDARY: Fall back to OpenAI (optional, if key is set)
    try {
      const content = await callOpenAI(messages);
      const parsed = JSON.parse(extractJson(content)) as {
        steps: Array<{ emoji: string; description: string }>;
      };

      if (!parsed.steps?.length) {
        throw new Error('No steps from OpenAI');
      }

      return parsed.steps.map((s, i) => buildStep(s.emoji, s.description, i));
    } catch {
      // 📚 TERTIARY: Use offline fallback (always available, no network)
      return generateFallbackSteps(taskTitle);
    }
  }
}

export async function generateDailyRoutineWithAI(): Promise<RoutineTask[]> {
  /**
   * Generate daily routine using Ollama (or fallback to predefined schedule)
   * Priority: Ollama → FALLBACK_ROUTINE (no network)
   */
  const messages: ChatMessage[] = [
    { role: 'system', content: ROUTINE_PROMPT },
    {
      role: 'user',
      content: 'Luo tämän päivän tehtävät aikajärjestyksessä.',
    },
  ];

  try {
    // 🚀 Try Ollama (primary)
    const content = await callOllama(messages);
    const parsed = JSON.parse(extractJson(content)) as { tasks: RoutineTask[] };

    if (!parsed.tasks?.length) {
      throw new Error('No routine tasks from Ollama');
    }

    return [...parsed.tasks]
      .filter(t => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.time) && !!t.title)
      .sort((a, b) => a.time.localeCompare(b.time));
  } catch {
    // 📚 Fall back to predefined routine (always available)
    return FALLBACK_ROUTINE;
  }
}

// ─── Offline / demo fallback ──────────────────────────────────────────────────
const FALLBACK_STEPS: Record<
  string,
  Array<{ emoji: string; description: string }>
> = {
  siivoa: [
    { emoji: '🗑️', description: 'Kerää roskat ja laita ne roskikseen' },
    { emoji: '🧸', description: 'Laita lelut omaan paikkaan' },
    { emoji: '🛏️', description: 'Petaa sänky siistiksi' },
    { emoji: '✨', description: 'Pyyhi pölyt tasopinnoilta' },
  ],
  läksyt: [
    { emoji: '🎒', description: 'Ota koulukirja ja vihko esille' },
    { emoji: '✏️', description: 'Lue tehtävä rauhassa ensin' },
    { emoji: '📝', description: 'Tee tehtävät yksi kerrallaan' },
    { emoji: '✅', description: 'Tarkista vastaukset lopuksi' },
  ],
  default: [
    { emoji: '🎯', description: 'Kerää tarvittavat tavarat valmiiksi' },
    { emoji: '💪', description: 'Tee tärkein osa ensin' },
    { emoji: '🔄', description: 'Jatka rauhallisesti loppuun' },
    { emoji: '✅', description: 'Tarkista että kaikki on valmista' },
  ],
};

export function generateFallbackSteps(taskTitle: string): Step[] {
  const key = Object.keys(FALLBACK_STEPS).find(
    k => k !== 'default' && taskTitle.toLowerCase().includes(k),
  );
  const template = FALLBACK_STEPS[key ?? 'default'];
  return template.map((s, i) => buildStep(s.emoji, s.description, i));
}

function buildStep(emoji: string, description: string, index: number): Step {
  return {
    id: `step-${Date.now()}-${index}`,
    order: index + 1,
    emoji,
    description,
    isDone: false,
    xpReward: 20,
    coinReward: 10,
  };
}
