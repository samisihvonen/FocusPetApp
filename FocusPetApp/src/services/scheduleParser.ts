import axios from 'axios';
import { HomeArrivalRule, WeekdayKey } from '../types';

// Google Gemini 2.0 Flash — ilmainen tier, 1500 pyyntöä/päivä
// Avain: https://aistudio.google.com → "Get API key"
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export type ParsedScheduleDay = {
  day: string; // 'ma' | 'ti' | 'ke' | 'to' | 'pe'
  schoolStart: string; // 'HH:MM'
  schoolEnd: string; // 'HH:MM'
};

export type GeneratedRoutineItem = {
  time: string; // 'HH:MM'
  title: string;
  blockUntil?: string; // 'HH:MM' — blocks the time window [time, blockUntil)
};

const VISION_PROMPT = `Sinulle näytetään kuva koulun lukujärjestyksestä tai viikko-ohjelmasta.

Tehtäväsi:
1. Lue koulupäivien aloitus- ja lopetusajat viikonpäivittäin (ma–pe).
2. Jos tarkkoja aikoja ei näy, arvioi tyypillisen suomalaisen alakoulun mukaan: aloitus 08:00, lopetus 13:00–14:00.

Palauta VAIN tämä JSON-rakenne, ei muuta tekstiä:
{
  "schedule": [
    { "day": "ma", "schoolStart": "08:00", "schoolEnd": "13:00" },
    { "day": "ti", "schoolStart": "08:00", "schoolEnd": "14:00" },
    { "day": "ke", "schoolStart": "09:00", "schoolEnd": "12:00" },
    { "day": "to", "schoolStart": "08:00", "schoolEnd": "13:00" },
    { "day": "pe", "schoolStart": "08:00", "schoolEnd": "13:00" }
  ]
}`;

/**
 * Sends a base64-encoded image to Google Gemini Vision and returns parsed school schedule.
 * Uses Gemini 2.0 Flash — free tier, no credit card required.
 * Get API key at: https://aistudio.google.com
 */
export async function parseScheduleFromImage(
  base64Image: string,
  apiKey: string,
): Promise<ParsedScheduleDay[]> {
  const response = await axios.post(
    `${GEMINI_URL}?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            { text: VISION_PROMPT },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.1,
      },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    },
  );

  const content: string =
    response.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  // Strip markdown code fences if present
  const jsonText = content
    .replace(/```json?\n?/g, '')
    .replace(/```/g, '')
    .trim();
  const parsed = JSON.parse(jsonText);
  return parsed.schedule as ParsedScheduleDay[];
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(totalMinutes: number): string {
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function resolveHomeArrivalRoutine(
  day: WeekdayKey,
  schoolEnd: string,
  homeArrivalRules?: HomeArrivalRule[],
): GeneratedRoutineItem {
  const configured = homeArrivalRules?.find(rule => rule.day === day);
  if (!configured) {
    return {
      time: addMinutes(schoolEnd, 30),
      title: 'Kotiin tuleminen ja valipala',
    };
  }
  const start = toMinutes(configured.arrivalStart);
  const end = toMinutes(configured.arrivalEnd);
  const midpoint = Math.floor((start + end) / 2);
  return {
    time: fromMinutes(midpoint),
    title: `Kotiintulo (${configured.sourceLabel}) ${configured.arrivalStart}-${configured.arrivalEnd}`,
  };
}

const DAY_LABELS: Record<string, string> = {
  ma: 'Maanantai',
  ti: 'Tiistai',
  ke: 'Keskiviikko',
  to: 'Torstai',
  pe: 'Perjantai',
};

/**
 * Converts parsed school schedule days into a list of home routine task times+titles.
 * Only generates routines for the current weekday.
 */
export function buildTodayRoutines(
  schedule: ParsedScheduleDay[],
  homeArrivalRules?: HomeArrivalRule[],
): GeneratedRoutineItem[] {
  const dayNames = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
  const todayKey = dayNames[new Date().getDay()];
  const today = schedule.find(d => d.day === todayKey);

  if (!today) {
    // Weekend or not found — return only evening defaults
    return [
      { time: '18:00', title: 'Päivällinen' },
      { time: '19:30', title: 'Iltarutiini' },
      { time: '20:30', title: 'Nukkumaan meneminen' },
    ];
  }

  const { schoolStart, schoolEnd } = today;
  const dayLabel = DAY_LABELS[today.day] ?? today.day;

  return [
    { time: addMinutes(schoolStart, -90), title: 'Aamun valmistautuminen' },
    {
      time: addMinutes(schoolStart, -30),
      title: `Kouluun lähtö – ${dayLabel}`,
    },
    resolveHomeArrivalRoutine(
      today.day as WeekdayKey,
      schoolEnd,
      homeArrivalRules,
    ),
    { time: addMinutes(schoolEnd, 60), title: 'Läksyt' },
    { time: '18:00', title: 'Päivällinen' },
    { time: '19:30', title: 'Iltarutiini' },
    { time: '20:30', title: 'Nukkumaan meneminen' },
  ];
}

// ─── Task builder (shared) ─────────────────────────────────────────────────────
import { Task } from '../types';

export function buildGeneratedTask(item: GeneratedRoutineItem): Task {
  const id = `routine-${item.time}-${Math.random().toString(36).slice(2, 8)}`;
  const step = {
    id: `${id}-step-1`,
    order: 1,
    emoji: '✅',
    description: item.title,
    isDone: false,
    xpReward: 15,
    coinReward: 4,
  };
  return {
    id,
    title: `${item.time} - ${item.title}`,
    status: 'idle',
    steps: [step],
    totalXP: 15,
    totalCoins: 4,
    createdAt: new Date().toISOString(),
    ...(item.blockUntil ? { blockUntil: item.blockUntil } : {}),
  };
}
