Tässä on täysin päivitetty, yhtenäinen Master Prompt / Specification englanniksi, johon on integroitu saumattomasti aiemmat peda/ADHD-periaatteet, offline-arkkitehtuuri sekä uudet visuaaliset ajastimet (munakello, tiimalasi ja Beat the Clock -mekaniikka).

Voit kopioida tämän suoraan koodausapuriisi (Cursor, Claude Code, GitHub Copilot).

FocusPet — Executive Functioning & Visual Task Assistant (Master Specification)
This document serves as the master specification for AI coding assistants (Cursor, Claude, Copilot) to build and maintain the FocusPet application — a lightweight, visual, and neurodivergent-friendly (ADHD/ASD) task manager for children and their parents.

1. Project Context & Core Domain Principles
Objective
Provide a low-friction, visual assistant that turns overwhelming routines into structured micro-steps. The priority is minimizing cognitive load, eliminating time blindness, providing predictable structures, and offering immediate positive reinforcement without anxiety-inducing penalties.

Key Pedagogy & ADHD/ASD UX Principles
"NOW vs. NEXT" & "First – Then" Architecture:

Never display a full daily or weekly schedule in the active child view.

Display a maximum of 1 active task card (NOW) and 1 upcoming preview (NEXT).

Completing a task immediately animates it out of sight to signify clear progression.

Positive Framing & Micro-Step Decomposition:

Action-Oriented Microcopy: Always state what to do rather than what not to do (e.g., "Walk smoothly" instead of "Don't run").

Micro-Step Engine: Complex routines (e.g., "Get Dressed") are decomposed into granular steps (e.g., 1. Socks, 2. Pants, 3. Jacket).

Each completed subtask triggers immediate positive reinforcement (subtle haptic feedback, sound effect, micro-animation, or XP/coins).

Visual Time Perception & Gamified Timers:

Avoid digital clock displays (14:15) in the child view.

Visual Timer Modes:

time_timer_ring: Standard shrinking color ring.

egg_timer: Rotating mechanical dial with a shrinking color wedge (ideal for quick micro-tasks).

hourglass: Animated liquid/sand flow (calming and low-stress for time-anxious children).

progress_bar: Clean linear visual depletion.

"Beat the Clock" Challenge: Optional playful sprint mode offering bonus stars/coins if tasks are completed before the timer expires.

Gentle Transitions: Provide soft, non-startling audio/haptic warnings before completion (e.g., at 5 min and 2 min marks).

Multi-Age Complexity Profiles (Preschool to Teen):

Preschool Profile (Ages 3–6): Textless UI, large custom real photos or high-clarity pictograms, voice readouts, simple tap/swipe interactions, max 1–3 choices per screen.

School-Age Profile (Ages 7–10): Pictograms + text labels, standard Time Timer visual ring, checklist micro-steps, FocusPet gamification.

Teen Profile (Ages 11+): Discrete modern icons, subtle gamification (optional pet widget), Pomodoro-style visual timer, high autonomy for self-breaking tasks.

Weather-Adaptive Dressing Support:

Dynamically adjusts dressing task substeps based on current weather/temperature and age profile.

Preschool: Suggests rain pants (kurahousut), rubber boots, and rain mittens.

School-Age / Teen: Replaces "childish" rain gear with shell pants (kuorihousut), waterproof sneakers, or Gore-Tex jackets to prevent social stigma while ensuring weather protection.

Parent View Isolation & PIN Guard:

All complex settings, routine creation, weather thresholds, custom photo uploads, and PIN lock (4 digits) reside in the Parent Dashboard.

2. Technical Stack & Offline-First Architecture
Framework: React Native + Expo (TypeScript)

State Management: Zustand (lightweight, predictable local state)

Offline-First Persistence: @react-native-async-storage/async-storage + Expo FileSystem (expo-file-system).

Zero-Latency Asset Loading: All user-uploaded photos and custom audio readouts are stored locally on the device disk (file://...) to guarantee 100% offline usability.

Robust Time Keeping: Timers are calculated using absolute system timestamps (Date.now()) rather than relying purely on volatile background setInterval timers.

Icons & Visual Assets: Lucide React / Tabler Icons (rounded edges) + device camera/gallery image support.

Accessibility (a11y): Full screen reader support, high-contrast toggles, text-to-speech audio readouts, 48–64px minimum touch targets.

3. Data Schema Models (TypeScript)
TypeScript
// Visual Complexity Level & Age Profiles
export type ComplexityLevel = 'preschool' | 'schoolage' | 'teen';

// Visual Timer Styles
export type TimerStyle = 'time_timer_ring' | 'egg_timer' | 'hourglass' | 'progress_bar';

// Child Profile & Accessibility Settings
export interface ChildProfileSettings {
  childId: string;
  complexityLevel: ComplexityLevel;
  showTextLabels: boolean;
  useVoiceReadout: boolean;
  useCustomPhotosOnly: boolean;
  showDigitalClock: boolean;
  enableFocusPetWidget: boolean;
  preferRainwearOverShellwear: boolean; // true = kurahousut, false = kuorihousut
  preferredTimerStyle: TimerStyle;
  enableBeatTheClockBonus: boolean;
  gentleTransitionAlerts: boolean; // 5 min & 2 min haptic/audio hints
}

// Visual Asset (Pictogram, Icon, or Custom Photo)
export interface VisualAsset {
  id: string;
  type: 'pictogram' | 'photo_upload' | 'icon';
  uri: string;
  altText: string;
}

// Weather Condition Mapping
export type WeatherCondition = 'rain' | 'snow' | 'cold' | 'mild' | 'warm';

export interface WeatherData {
  temperatureC: number;
  condition: WeatherCondition;
  isRaining: boolean;
}

// Clothing Suggestion Item
export interface ClothingSuggestion {
  id: string;
  category: 'head' | 'upper_body' | 'lower_body' | 'footwear' | 'hands';
  title: string;
  iconName: string;
  imageUrl?: string;
  allowedComplexityLevels: ComplexityLevel[];
}

// Sub-task / Micro-step
export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  visualAsset?: VisualAsset;
  audioReadoutUri?: string;
}

// Main Task Model
export interface Task {
  id: string;
  childId: string;
  title: string;
  coverAsset: VisualAsset;
  durationMinutes: number;
  timerStyleOverride?: TimerStyle;
  isCompleted: boolean;
  subTasks: SubTask[];
  category: 'routine' | 'school' | 'hygiene' | 'chores' | 'dressing' | 'play';
  rewardPoints: number;
  bonusPointsForSpeed?: number;
  weatherExtension?: {
    useWeatherRules: boolean;
    suggestedItems: ClothingSuggestion[];
  };
}

// FocusPet State Model
export interface PetState {
  name: string;
  mood: 'happy' | 'neutral' | 'sad';
  xp: number;
  coins: number;
}
4. Step-by-Step Implementation Roadmap
Step 1: Core NOW / NEXT View & Visual Timers
Build the main task view showing 1 active task card (NOW) and 1 upcoming preview card (NEXT).

Implement the VisualTimer component with dynamic style rendering (time_timer_ring, egg_timer, hourglass, progress_bar).

Add timer state persistence based on absolute timestamps (Date.now()).

Implement gentle 5-minute and 2-minute haptic/audio warnings.

Step 2: Micro-step Checklist & Multi-Age Rendering
Render subtasks inside the active focal card.

Adapt UI elements based on ChildProfileSettings.complexityLevel (e.g., hide text in Preschool Mode, show icons only).

Trigger immediate micro-rewards (confetti, sounds, coins) upon checking off subtasks.

Include a 2-second simple reflection prompt ("How did it go?") upon task completion.

Step 3: Weather-Adaptive Dressing Engine
Build rule evaluator mapping WeatherData to clothing suggestions.

Dynamically inject micro-steps into dressing tasks (Rain + Preschool = Kurahousut; Rain + School-Age/Teen = Kuorihousut).

Step 4: Parent Dashboard, PIN Lock & Offline Asset Storage
Protect parent settings with a 4-digit PIN.

Build task and routine management interfaces.

Implement local photo picker and camera capture saving assets directly to expo-file-system.

Step 5: Gamification & FocusPet Widget
Implement the FocusPet status display (Happy / Neutral / Sad states).

Build the coin/XP accumulation engine and a simple reward redemption drawer.

Add optional "Beat the Clock" bonus rewards when completing tasks before timer expiration.

5. Coding Standards & Guidelines
Hook Separation: Keep presentation components strictly decoupled from business logic (e.g., useTaskTimer, useWeatherDressing, usePetStore).

UI Styling: Use soft pastel palettes, generous padding, heavy corner rounding (rounded-2xl / rounded-3xl), and high contrast without pure #000000 text on #FFFFFF backgrounds.

Offline Reliability: All application state and media assets must persist locally via AsyncStorage and FileSystem to guarantee instant responsiveness without server dependencies.

# FocusPet — Executive Functioning & Visual Task Assistant

This document serves as the master specification for AI coding assistants (Cursor, Claude, Copilot) to build and maintain the **FocusPet** application — a lightweight, visual, and neurodivergent-friendly (ADHD/ASD) task manager for children and their parents.

---

## 1. Project Context & Core Domain Principles

### Objective
Provide a low-friction, visual assistant that turns overwhelming routines into structured micro-steps. The priority is **minimizing cognitive load**, eliminating time blindness, and providing immediate positive reinforcement without anxiety-inducing penalties.

### Key ADHD UX/UI Principles
1. **"NOW vs. NEXT" Model:**
   - Never display a full daily or weekly schedule to the child.
   - Show maximum **1 active task card (NOW)** and **1 upcoming preview (NEXT)**.
   - Completing a task immediately animates it out of sight to signify clear progress.

2. **Visual Time Perception (Time Timer Concept):**
   - Avoid digital clock times (`14:15`) in the child view.
   - Represent time as a **shrinking circle, progress bar, or depleting visual ring**.
   - Provide gentle, non-startling transition warnings (e.g., at 5 min and 2 min before task completion).

3. **Task Decomposition (Micro-steps):**
   - Complex activities (e.g., *"Get Dressed"*) are broken down into granular steps (e.g., *1. Socks*, *2. Pants*, *3. Jacket*).
   - Each completed subtask triggers a micro-reward (sound effect, animation, XP/coins).

4. **Multi-Age Complexity Levels (Preschool to Teen):**
   - **Preschool Mode (Ages 3–6):** No text required, large custom real photos / high-clarity pictograms, voice readouts, shrinking color bucket timers, simple tap/swipe interactions.
   - **School-Age Mode (Ages 7–10):** Pictograms + text labels, standard Time Timer visual ring, checklist steps, FocusPet gamification.
   - **Teen Mode (Ages 11+):** Discrete modern icons, subtle gamification (optional pet display), Pomodoro-style visual timer, higher autonomy for self-breaking tasks.

5. **Weather-Adaptive Dressing Support:**
   - Dynamically adjusts dressing task substeps based on current weather/temperature and age profile.
   - **Preschool:** Suggests rain pants (kurahousut), rubber boots, and rain mittens.
   - **School-Age / Teen:** Replaces "childish" rain gear with shell pants (kuorihousut), waterproof sneakers, or Gore-Tex jackets to avoid social stigma while ensuring weather protection.

6. **Parent View Isolation & PIN Guard:**
   - All complex settings, task creation, weather thresholds, custom photo uploads, and PIN lock (4 digits) reside in the **Parent Dashboard**.

---

## 2. Technical Stack & Architecture

- **Framework:** React Native + Expo (TypeScript)
- **State Management:** Zustand (lightweight, predictable local state)
- **Local Storage:** `@react-native-async-storage/async-storage` (*Offline-first MVP architecture*)
- **Icons & Visual Assets:** Lucide React / Tabler Icons (rounded edges) + device camera/gallery image support.
- **Accessibility (a11y):** Full screen reader support, high-contrast toggles, text-to-speech audio readouts, 48–64px minimum touch targets.

---

## 3. Data Schema Models (TypeScript)

```typescript
// Visual Complexity Level & Age Profiles
export type ComplexityLevel = 'preschool' | 'schoolage' | 'teen';

// Child Profile & Accessibility Settings
export interface ChildProfileSettings {
  childId: string;
  complexityLevel: ComplexityLevel;
  showTextLabels: boolean;
  useVoiceReadout: boolean;
  useCustomPhotosOnly: boolean;
  showDigitalClock: boolean;
  enableFocusPetWidget: boolean;
  preferRainwearOverShellwear: boolean; // e.g., true = kurahousut, false = kuorihousut
}

// Visual Asset (Pictogram, Icon, or Custom Photo)
export interface VisualAsset {
  id: string;
  type: 'pictogram' | 'photo_upload' | 'icon';
  uri: string;
  altText: string;
}

// Weather Condition Mapping
export type WeatherCondition = 'rain' | 'snow' | 'cold' | 'mild' | 'warm';

export interface WeatherData {
  temperatureC: number;
  condition: WeatherCondition;
  isRaining: boolean;
}

// Clothing Suggestion Item
export interface ClothingSuggestion {
  id: string;
  category: 'head' | 'upper_body' | 'lower_body' | 'footwear' | 'hands';
  title: string;
  iconName: string;
  imageUrl?: string;
  allowedComplexityLevels: ComplexityLevel[]; // Filters 'kurahousut' out for teens
}

// Sub-task / Micro-step
export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  visualAsset?: VisualAsset;
  audioReadoutUri?: string;
}

// Main Task Model
export interface Task {
  id: string;
  childId: string;
  title: string;
  coverAsset: VisualAsset;
  durationMinutes: number;
  isCompleted: boolean;
  subTasks: SubTask[];
  category: 'routine' | 'school' | 'hygiene' | 'chores' | 'dressing' | 'play';
  rewardPoints: number;
  weatherExtension?: {
    useWeatherRules: boolean;
    suggestedItems: ClothingSuggestion[];
  };
}

// FocusPet State Model
export interface PetState {
  name: string;
  mood: 'happy' | 'neutral' | 'sad';
  xp: number;
  coins: number;
}
4. Step-by-Step Implementation Roadmap
Execute development in the following modular order:

Step 1: Core NOW / NEXT View & Visual Timer
Implement the focal task card displaying current step image/icon and NEXT task preview.

Build the VisualTimer component (shrinking colored ring/bar with 5 min and 2 min haptic/sound warnings).

Implement a large DONE button with animated haptic feedback.

Step 2: Micro-step Checklist & Multi-Age Rendering
Render subtasks inside the focal card.

Add logic to show/hide text based on ChildProfileSettings.complexityLevel.

Trigger immediate micro-rewards (confetti, coins, XP) upon checking off each subtask.

Step 3: Weather-Adaptive Dressing Engine
Build rule evaluator that maps weather conditions (WeatherData) to clothing suggestions.

Automatically inject appropriate micro-steps into dressing tasks (e.g., Rain + Preschool = Kurahousut; Rain + School-Age = Kuorihousut).

Step 4: Parent Dashboard & PIN Lock
Protect parent settings with a 4-digit PIN.

Provide task creation form, picture/photo upload picker, and weather dressing rule toggles.

Step 5: Gamification & FocusPet Widget
Implement pet display widget with 3 basic mood states (happy, neutral, sad).

Add coin/XP accumulation and simple reward redemption drawer.

5. Coding Standards & Guidelines
Hook Separation: Keep presentation components strictly decoupled from logic (useTaskTimer, useWeatherDressing, usePetStore).

UI Styling: Use soft pastel palettes, generous padding, and heavy corner rounding (rounded-2xl / rounded-3xl). Avoid pure #000000 text on #FFFFFF backgrounds.

Offline Reliability: All data must persist locally via AsyncStorage to ensure instant app responsiveness without requiring server connectivity.