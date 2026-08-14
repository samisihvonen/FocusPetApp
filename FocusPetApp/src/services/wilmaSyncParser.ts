// Lightweight stubs for Wilma/MyClub calendar integration.
// Original, full-featured implementation was archived to /archive/
// These stubs return empty results for the MVP local-only app.

export interface SchoolLesson {
  start: string; // HH:MM
  end: string; // HH:MM
  subject: string;
  room?: string;
  teacher?: string;
  emoji?: string;
}

export interface HobbyEvent {
  start: string; // HH:MM
  end: string; // HH:MM
  title: string;
}

export interface WeekDayData {
  date: Date;
  lessons: SchoolLesson[];
  hobbies: HobbyEvent[];
}

function demoHobbiesForDay(date: Date): HobbyEvent[] {
  const day = date.getDay();

  if (day === 0 || day === 6) {
    return [{ start: '11:00', end: '12:00', title: 'Ulkoilu' }];
  }

  return [
    { start: '17:00', end: '18:00', title: 'Jalkapallo' },
    { start: '18:30', end: '19:30', title: 'Kuvataide' },
  ];
}

export async function fetchHobbyEventsForToday(
  hobbyUrl?: string,
): Promise<HobbyEvent[]> {
  if (!hobbyUrl) {
    return demoHobbiesForDay(new Date());
  }
  return [];
}

export async function fetchHobbyEventsForDay(
  hobbyUrl: string | undefined,
  date: Date,
): Promise<HobbyEvent[]> {
  if (!hobbyUrl) {
    return demoHobbiesForDay(date);
  }
  return [];
}

export async function fetchWilmaScheduleForToday(
  wilmaUrl?: string,
): Promise<{ schoolStart: string; schoolEnd: string } | null> {
  // MVP: If no Wilma URL configured, return a sample school schedule for demo purposes.
  if (!wilmaUrl) {
    return { schoolStart: '08:15', schoolEnd: '14:05' };
  }
  return null;
}

export async function fetchWeekCalendar(
  wilmaUrl?: string,
  hobbyUrl?: string,
): Promise<WeekDayData[]> {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow === 0 ? 7 : dow) - 1));

  const week: WeekDayData[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isWeekday = i < 5;
    return {
      date: d,
      lessons: isWeekday
        ? [
            {
              start: '09:00',
              end: '09:45',
              subject: 'Matematiikka',
              room: 'Luokka 12',
              teacher: 'Leena',
              emoji: '➗',
            },
            {
              start: '10:00',
              end: '10:45',
              subject: 'Äidinkieli',
              room: 'Luokka 9',
              teacher: 'Matti',
              emoji: '📖',
            },
          ]
        : [],
      hobbies: isWeekday
        ? demoHobbiesForDay(d)
        : [{ start: '11:00', end: '12:00', title: 'Ulkoilu' }],
    };
  });

  return week;
}
