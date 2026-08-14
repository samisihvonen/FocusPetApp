# FocusPet — Simplified Architecture

This file describes a simpler, lighter version of the application — aiming to reduce maintenance and development overhead and speed up release readiness.

Core Goal
- Make breaking down tasks fun and rewarding for children.
- Maintain the smallest possible technical footprint (local state, minimum number of dependencies).

Key Components (only what is needed for MVP)
- UI (React Native + TypeScript): home view, task view, step cards, pet display (3 states).
- Task Breaker: AI calls or local heuristics for task decomposition.
- Local Storage: `AsyncStorage` (Tasks, User, Pet, Coins/Xp).
- Minimal State Management: local Zustand/Context or plain component state.

Minimum Functionality (MVP)
- Adding and breaking down a task (AI or a simple rule system).
- Step completion and simple rewarding: animation + sound effect + coins + XP.
- Pet Display: three states (happy, neutral, sad) — no persistence or complex logic.
- Local Settings: user profile exists only on the device.

Accessibility / Simple Mode
- Provide the option for the user to enable `Simple Mode` in settings.
- Features: larger fonts, high-contrast color scheme, simplified text, action confirmations (confirm before delete), reduced options.

Why Simplify
- Faster development cycle and lower maintenance cost.
- Reduces the need for backend work — release as a local experience first.
- Facilitates testing and gathering user feedback.

Growth Path (simplified)
1. Release local MVP: all data stored in `AsyncStorage`.
2. If user traction and demand grow, add opt-in sync (e.g., Supabase or a lightweight REST API).
3. Add parent approval and push notifications only after a backend is established.

Technical Stack
- React Native + TypeScript
- Local Storage: `@react-native-async-storage/async-storage`
- Optional: Zustand (lightweight state management)

Keep the feature list to a minimum: avoid complex mechanics such as multi-device sync, complex analytics, or an extensive backend architecture in V1.

Next Steps
- Trim down the README to reflect this simpler approach.
- List modules to be removed/archived in the code (request an automatic search if desired).