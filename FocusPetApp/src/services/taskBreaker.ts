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
  'http://localhost:11434/v1/chat/completions', // Local development (Windows/Mac/Linux)
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
const SYSTEM_PROMPT = `Olet FocusPet-sovelluksen hauska ja kannustava kaveri lapsille (7-12-vuotiaille). 🦉
Sinulla on iloinen, lämmin äänensävy — kuin paras kaveri, joka auttaa ilman tuomitsemista.
Pilko tehtävä 3–5 pieneen askeleeseen niin, että se tuntuu helpolta ja kivalta!

SÄÄNNÖT:
• Jokainen askel alkaa mukavalla toimintaverbillä (Kerää, Laita, Petaa, Pese, Valitse...).
• Maksimissaan 8 sanaa per askel — lyhyt, selkeä ja positiivinen!
• Jokainen askel alkaa yhdellä hauskalla emojilla.
• Puhu kuin kaveri: "Nappaa", "Laita", "Hommaa" — ei käskyttävästi.
• Lisää kannustavia sanoja: "rauhassa", "helposti", "siististi", "kivasti".
• ÄLÄ käytä vaikeita sanoja, kieltolauseita tai pitkiä lauseita.
• Askelet etenevät loogisessa, luontevassa järjestyksessä.

VASTAA AINOASTAAN validissa JSON-muodossa, ilman muuta tekstiä:
{
  "steps": [
    { "emoji": "🗑️", "description": "Kerää roskat lattialta rauhassa" },
    { "emoji": "🧸", "description": "Laita lelut kivasti omaan paikkaan" }
  ]
}`;

const ROUTINE_PROMPT = `Olet FocusPet-sovelluksen päivärytmiavustaja lapselle.
Luo päivän tehtävälista suunnilleen kellonaikojen mukaan.

SÄÄNNÖT:
• Käytä arkisia tehtäviä: aamupala, hampaiden pesu, lääkkeiden ottaminen, vaatteiden pukeminen, koulurepun pakkaaminen, syöminen, läksyt, ulkoilu, iltapala, hampaiden pesu.
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
  aamupala: [
    { emoji: '🥣', description: 'Valitse mitä syöt aamupalaksi' },
    { emoji: '🍞', description: 'Valmista tai kaada aamupala' },
    { emoji: '🪑', description: 'Istu rauhassa ja syö' },
    { emoji: '🚿', description: 'Vie astiat tiskipöydälle' },
  ],
  hampaat: [
    { emoji: '🪥', description: 'Ota hammasharja ja tahna esille' },
    { emoji: '💧', description: 'Laita sopiva määrä tahnaa harjalle' },
    { emoji: '🦷', description: 'Harja hampaat kaksi minuuttia' },
    { emoji: '💦', description: 'Huuhtele suu ja laita tavarat pois' },
  ],
  vaatteet: [
    { emoji: '👚', description: 'Valitse tänään sopivat vaatteet' },
    { emoji: '👕', description: 'Pue paita tai pusero päälle' },
    { emoji: '👖', description: 'Pue housut ja sukat jalkaan' },
    { emoji: '🪞', description: 'Tarkista että näytät hyvältä' },
  ],
  reppu: [
    { emoji: '📅', description: 'Tarkista mitä aineita on tänään' },
    { emoji: '📚', description: 'Laita kirjat ja vihkot reppuun' },
    { emoji: '✏️', description: 'Muista penaalikotelo mukaan' },
    { emoji: '🎒', description: 'Sulje reppu ja laita ovelle' },
  ],
  välipala: [
    { emoji: '🍎', description: 'Valitse mieluisa välipala' },
    { emoji: '🍽️', description: 'Valmista välipala tai kaada juoma' },
    { emoji: '🪑', description: 'Istu alas ja syö rauhassa' },
    { emoji: '🧼', description: 'Laita astiat pois syötyäsi' },
  ],
  ulkoilu: [
    { emoji: '👟', description: 'Pue kengät ja takki päälle' },
    { emoji: '🔑', description: 'Ota avaimet mukaan' },
    { emoji: '🚪', description: 'Mene ulos ja sulje ovi' },
    { emoji: '🌳', description: 'Nauti ulkoilusta ja liiku' },
  ],
  päivällinen: [
    { emoji: '🧼', description: 'Pese kädet ennen ruokailua' },
    { emoji: '🪑', description: 'Istu pöytään rauhassa' },
    { emoji: '🍽️', description: 'Syö ruoka hitaasti nauttien' },
    { emoji: '🫙', description: 'Vie lautanen tiskipöydälle' },
  ],
  iltapala: [
    { emoji: '🥛', description: 'Valitse iltapala ja kaada juoma' },
    { emoji: '🪑', description: 'Istu rauhassa ja syö' },
    { emoji: '🧼', description: 'Laita astiat tiskipöydälle' },
    { emoji: '😴', description: 'Valmistaudu rauhoittumaan illaksi' },
  ],
  laakkeet: [
    { emoji: '💊', description: 'Ota oikeat lääkkeet esille' },
    { emoji: '💧', description: 'Kaada lasi vettä' },
    { emoji: '✅', description: 'Ota lääkkeet vesilasillisen kera' },
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
