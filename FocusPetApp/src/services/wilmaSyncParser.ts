import axios from 'axios';

// Wilma ICS-kalenteri → tämän päivän kouluajat
// Käytetään RRULE:FREQ=WEEKLY + EXDATE-logiikkaa

export type WilmaScheduleResult = {
  schoolStart: string; // 'HH:MM'
  schoolEnd: string; // 'HH:MM'
} | null;

interface IcsEvent {
  dtstart: string; // '20260309T090000'
  dtend: string; // '20260309T094500'
  rrule: string; // 'FREQ=WEEKLY;UNTIL=...'
  exdates: string[]; // ['20260406T090000', ...]
}

function parseIcsDateTime(str: string): Date {
  // '20260309T090000' or '20260309' → Date (local time)
  const s = str.replace(/Z$/, '');
  const date = s.substring(0, 8);
  const time = s.length > 8 ? s.substring(9) : '000000';
  const y = parseInt(date.substring(0, 4), 10);
  const mo = parseInt(date.substring(4, 6), 10) - 1;
  const d = parseInt(date.substring(6, 8), 10);
  const h = parseInt(time.substring(0, 2), 10);
  const m = parseInt(time.substring(2, 4), 10);
  return new Date(y, mo, d, h, m);
}

function toHHMM(str: string): string {
  // '20260309T090000' → '09:00'
  const t = str.split('T')[1] ?? '000000';
  return `${t.substring(0, 2)}:${t.substring(2, 4)}`;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseEvents(ics: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  const blocks = ics.split('BEGIN:VEVENT').slice(1);

  for (const block of blocks) {
    const dtstart =
      block.match(/DTSTART[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const dtend = block.match(/DTEND[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const rrule = block.match(/RRULE:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const exdateRaw =
      block.match(/EXDATE[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const exdates = exdateRaw ? exdateRaw.split(',').map(s => s.trim()) : [];

    if (dtstart && dtend) {
      events.push({ dtstart, dtend, rrule, exdates });
    }
  }
  return events;
}

function occursToday(event: IcsEvent, today: Date): boolean {
  const startDate = parseIcsDateTime(event.dtstart);

  // Non-recurring: exact day match
  if (!event.rrule.includes('FREQ=WEEKLY')) {
    return sameLocalDay(startDate, today);
  }

  // Must be same weekday
  if (startDate.getDay() !== today.getDay()) {
    return false;
  }

  // Must not be before the first occurrence
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startMidnight = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  if (todayMidnight < startMidnight) {
    return false;
  }

  // Must not be after UNTIL
  const untilMatch = event.rrule.match(/UNTIL=([^;]+)/);
  if (untilMatch) {
    const until = parseIcsDateTime(untilMatch[1].trim());
    if (todayMidnight > until) {
      return false;
    }
  }

  // Must not be in EXDATE
  const excluded = event.exdates.some(ex =>
    sameLocalDay(parseIcsDateTime(ex), today),
  );
  if (excluded) {
    return false;
  }

  return true;
}

/**
 * Fetches a Wilma ICS calendar URL and returns today's school start and end times.
 * Returns null if today is a non-school day (weekend, holiday, summer).
 */
export async function fetchWilmaScheduleForToday(
  url: string,
): Promise<WilmaScheduleResult> {
  const response = await axios.get<string>(url, {
    timeout: 15000,
    responseType: 'text',
  });
  const ics: string = response.data;

  const events = parseEvents(ics);
  const today = new Date();
  const todayEvents = events.filter(e => occursToday(e, today));

  if (todayEvents.length === 0) {
    return null; // no school today
  }

  const starts = todayEvents.map(e => toHHMM(e.dtstart)).sort();
  const ends = todayEvents.map(e => toHHMM(e.dtend)).sort();

  return {
    schoolStart: starts[0],
    schoolEnd: ends[ends.length - 1],
  };
}

export type HobbyEvent = {
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'
  title: string; // cleaned event title
};

export type SchoolLesson = {
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'
  code: string; // e.g. 'MA'
  subject: string; // e.g. 'Matematiikka'
  emoji: string; // e.g. '🔢'
  room: string; // e.g. '217'
  teacher: string; // e.g. 'ElinaH'
};

export type WeekDayData = {
  date: Date;
  school: WilmaScheduleResult;
  lessons: SchoolLesson[];
  hobbies: HobbyEvent[];
};

function parseIcsSummary(block: string): string {
  // SUMMARY may be folded across lines (leading whitespace = continuation)
  const raw =
    block
      .replace(/\r\n[ \t]/g, '') // unfold
      .replace(/\r/g, '')
      .match(/^SUMMARY:(.+)$/m)?.[1]
      ?.trim() ?? '';
  // Strip leading team prefix like "K-E Blues 17 25-26: "
  return raw.replace(/^[^:]+:\s*/, '').replace(/\\/g, '') || raw;
}

/**
 * Fetches a MyClub (or any hobby) ICS URL and returns all of today's events.
 * webcal:// URLs should be passed as https://.
 */
export async function fetchHobbyEventsForToday(
  url: string,
): Promise<HobbyEvent[]> {
  // Accept webcal:// by converting to https://
  const httpsUrl = url.replace(/^webcal:\/\//i, 'https://');
  const response = await axios.get<string>(httpsUrl, {
    timeout: 15000,
    responseType: 'text',
  });
  const ics: string = response.data;

  const blocks = ics.split('BEGIN:VEVENT').slice(1);
  const today = new Date();
  const results: HobbyEvent[] = [];

  for (const block of blocks) {
    const dtstart =
      block.match(/DTSTART[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const dtend = block.match(/DTEND[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const rrule = block.match(/RRULE:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const exdateRaw =
      block.match(/EXDATE[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const exdates = exdateRaw ? exdateRaw.split(',').map(s => s.trim()) : [];

    if (!dtstart || !dtend) {
      continue;
    }

    const event: IcsEvent = { dtstart, dtend, rrule, exdates };
    if (!occursToday(event, today)) {
      continue;
    }

    results.push({
      start: toHHMM(dtstart),
      end: toHHMM(dtend),
      title: parseIcsSummary(block),
    });
  }

  return (
    results
      .sort((a, b) => a.start.localeCompare(b.start))
      // Deduplicate: ICS sometimes has both a one-time and a recurring entry for the same slot
      .filter(
        (ev, i, arr) =>
          arr.findIndex(x => x.start === ev.start && x.title === ev.title) ===
          i,
      )
  );
}

// ─── Week calendar helpers ─────────────────────────────────────────────────

const SUBJECT_MAP: Record<string, { name: string; emoji: string }> = {
  SU: { name: 'Suomi', emoji: '📖' },
  AI: { name: 'Äidinkieli', emoji: '📖' },
  MA: { name: 'Matematiikka', emoji: '🔢' },
  ENA: { name: 'Englanti', emoji: '🇬🇧' },
  ENA1: { name: 'Englanti', emoji: '🇬🇧' },
  RU: { name: 'Ruotsi', emoji: '🇸🇪' },
  YM: { name: 'Ympäristöoppi', emoji: '🌿' },
  BI: { name: 'Biologia', emoji: '🌿' },
  GE: { name: 'Maantieto', emoji: '🌍' },
  FY: { name: 'Fysiikka', emoji: '⚡' },
  KE: { name: 'Kemia', emoji: '🧪' },
  HI: { name: 'Historia', emoji: '🏛️' },
  YH: { name: 'Yhteiskuntaoppi', emoji: '🏛️' },
  US: { name: 'Uskonto', emoji: '✝️' },
  ET: { name: 'Elämänkatsomus', emoji: '💭' },
  LI: { name: 'Liikunta', emoji: '⚽' },
  MU: { name: 'Musiikki', emoji: '🎵' },
  KU: { name: 'Kuvataide', emoji: '🎨' },
  KA: { name: 'Käsityö', emoji: '✂️' },
  KAT: { name: 'Käsityö (tekstiili)', emoji: '✂️' },
  KAT1: { name: 'Käsityö', emoji: '✂️' },
  TE: { name: 'Terveystieto', emoji: '❤️' },
  OP: { name: 'Opinto-ohjaus', emoji: '🗓️' },
  ATK: { name: 'Tietotekniikka', emoji: '💻' },
  DR: { name: 'Draama', emoji: '🎭' },
};

function subjectFromCode(code: string): { name: string; emoji: string } {
  // Strip trailing digits from code like ENA1 → try ENA first
  const upper = code.toUpperCase();
  if (SUBJECT_MAP[upper]) return SUBJECT_MAP[upper];
  const stripped = upper.replace(/\d+$/, '');
  return SUBJECT_MAP[stripped] ?? { name: code, emoji: '📚' };
}

/** Parse "SU (ElinaH) (217)" → { code, teacher, room } */
function parseWilmaSummary(summary: string): {
  code: string;
  teacher: string;
  room: string;
} {
  const m = summary.match(/^([\w]+)\s*(?:\(([^)]+)\))?\s*(?:\(([^)]+)\))?/);
  return {
    code: m?.[1] ?? summary,
    teacher: m?.[2] ?? '',
    room: m?.[3] ?? '',
  };
}

function parseWilmaForDay(events: IcsEvent[], date: Date): WilmaScheduleResult {
  const dayEvents = events.filter(e => occursToday(e, date));
  if (dayEvents.length === 0) {
    return null;
  }
  const starts = dayEvents.map(e => toHHMM(e.dtstart)).sort();
  const ends = dayEvents.map(e => toHHMM(e.dtend)).sort();
  return { schoolStart: starts[0], schoolEnd: ends[ends.length - 1] };
}

function parseLessonsForDay(ics: string, date: Date): SchoolLesson[] {
  const blocks = ics.split('BEGIN:VEVENT').slice(1);
  const results: SchoolLesson[] = [];
  for (const block of blocks) {
    const unfolded = block.replace(/\r\n[ \t]/g, '').replace(/\r/g, '');
    const dtstart =
      unfolded.match(/^DTSTART[^:\r\n]*:([^\r\n]+)/m)?.[1]?.trim() ?? '';
    const dtend =
      unfolded.match(/^DTEND[^:\r\n]*:([^\r\n]+)/m)?.[1]?.trim() ?? '';
    const rrule = unfolded.match(/^RRULE:([^\r\n]+)/m)?.[1]?.trim() ?? '';
    const exdateRaw =
      unfolded.match(/^EXDATE[^:\r\n]*:([^\r\n]+)/m)?.[1]?.trim() ?? '';
    const exdates = exdateRaw ? exdateRaw.split(',').map(s => s.trim()) : [];
    const summary = unfolded.match(/^SUMMARY:(.+)$/m)?.[1]?.trim() ?? '';
    if (!dtstart || !dtend || !summary) continue;
    const event: IcsEvent = { dtstart, dtend, rrule, exdates };
    if (!occursToday(event, date)) continue;
    const { code, teacher, room } = parseWilmaSummary(summary);
    const { name: subject, emoji } = subjectFromCode(code);
    results.push({
      start: toHHMM(dtstart),
      end: toHHMM(dtend),
      code,
      subject,
      emoji,
      room,
      teacher,
    });
  }
  return results.sort((a, b) => a.start.localeCompare(b.start));
}

function parseHobbyForDay(ics: string, date: Date): HobbyEvent[] {
  const blocks = ics.split('BEGIN:VEVENT').slice(1);
  const results: HobbyEvent[] = [];
  for (const block of blocks) {
    const dtstart =
      block.match(/DTSTART[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const dtend = block.match(/DTEND[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const rrule = block.match(/RRULE:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const exdateRaw =
      block.match(/EXDATE[^:\r\n]*:([^\r\n]+)/)?.[1]?.trim() ?? '';
    const exdates = exdateRaw ? exdateRaw.split(',').map(s => s.trim()) : [];
    if (!dtstart || !dtend) {
      continue;
    }
    const event: IcsEvent = { dtstart, dtend, rrule, exdates };
    if (!occursToday(event, date)) {
      continue;
    }
    results.push({
      start: toHHMM(dtstart),
      end: toHHMM(dtend),
      title: parseIcsSummary(block),
    });
  }
  return results
    .sort((a, b) => a.start.localeCompare(b.start))
    .filter(
      (ev, i, arr) =>
        arr.findIndex(x => x.start === ev.start && x.title === ev.title) === i,
    );
}

/**
 * Fetches a hobby ICS URL and returns events for the given date (any day, not just today).
 */
export async function fetchHobbyEventsForDay(
  url: string,
  date: Date,
): Promise<HobbyEvent[]> {
  const httpsUrl = url.replace(/^webcal:\/\//i, 'https://');
  const response = await axios.get<string>(httpsUrl, {
    timeout: 15000,
    responseType: 'text',
  });
  return parseHobbyForDay(response.data, date);
}

/**
 * Fetches Wilma + hobby ICS once and returns data for every day of the current week (Mon–Sun).
 */
export async function fetchWeekCalendar(
  wilmaUrl: string,
  hobbyUrl: string,
): Promise<WeekDayData[]> {
  const httpsHobbyUrl = hobbyUrl.replace(/^webcal:\/\//i, 'https://');

  const [wilmaIcs, hobbyIcs] = await Promise.all([
    wilmaUrl
      ? axios
          .get<string>(wilmaUrl, { timeout: 15000, responseType: 'text' })
          .then(r => r.data)
      : Promise.resolve(''),
    hobbyUrl
      ? axios
          .get<string>(httpsHobbyUrl, { timeout: 15000, responseType: 'text' })
          .then(r => r.data)
      : Promise.resolve(''),
  ]);

  const wilmaEvents = wilmaUrl ? parseEvents(wilmaIcs) : [];

  // Monday of current week
  const today = new Date();
  const dow = today.getDay(); // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      date,
      school: parseWilmaForDay(wilmaEvents, date),
      lessons: wilmaUrl ? parseLessonsForDay(wilmaIcs, date) : [],
      hobbies: hobbyUrl ? parseHobbyForDay(hobbyIcs, date) : [],
    };
  });
}
