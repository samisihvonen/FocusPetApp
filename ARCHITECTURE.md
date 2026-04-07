# FocusPet — MVP Strategy & Roadmap

## 📊 MVP-vaiheet

### **MVP #1: AI Task Breaker + Dopamiini-palaute** (2–3 viikkoa)
**Core Loop**: Tehtävä → AI pilkkoo → Askeleet → Swipe completa → Dopamine hit 🎉

**Features:**
- ✅ OpenAI gpt-4o-mini tehtävien pilkkominen
- ✅ Askelkorttien karsinta (swipe/drag-to-dismiss)
- ✅ Haptic feedback (tärinä) + "pling"-ääni askeleen valmistumiselle
- ✅ Tähti-animaatio ruudulla
- ✅ XP + Coins-keruu
- ⚠️ Paikallinen storage (AsyncStorage) — ei vielä backendaroa

**Target**: Adrenaline-addicted engagement — välitön palkitseminen pitää lapsen motivoituneena.

---

### **MVP #2: Virtuaalilemmikki (Minimiversio)** (1–2 viikkoa)
**Core Loop**: Tehtävät → Pet happiness ↗ → Lapsi haluaa tehdä tehtäviä lemmikkinsa puolesta 💕

**Features:**
- ✅ Rive-animaatio (3 mieliala-tilaa: ecstatic, happy, sad)
- ✅ Happiness-arvo (0–100) kodin näytöllä
- ✅ Kolikoilla ruokkiminen (painike: "Ruoki Pöllöä" = –20 kolikkoa, +30 happiness)
- ⚠️ Paikallinen state — ei persistenssiä vielä

**Target**: Emotionaalinen koukku — lapsi ei halua "tappaa" lemmikkiään unohtamalla tehtävät.

---

### **MVP #3: Vanhempien yksittäinen hyväksyntä (Kevyt)** (1 viikko)
**Core Loop**: Vanhempi näkee notifikaation → hyväksyy/hylkää → lapsi saa palkinon

**Features:**
- ✅ Push-notifikaatio (ilman full backend, vain lokaali JSON)
- ✅ Hyväksy/Hylkää näppäimet
- ✅ "Oikean maailman palkinto" -asetukset: esim. 500 kolikkoa = 30 min peliaikaa
- ⚠️ Mockattu backend (ei oikeaa datakannaa MVP1:ssä)

**Target**: Parent buy-in — vanhemmat näkevät lapsensa edistymisen.

---

## 📋 Post-MVP (V2+)

- **Focus Mode + LockTask API** — Android varjelu tehtävän aikana
- **Streak-järjestelmä** — peräkkäisten päivien bonus
- **In-app Shop** — asusteita ja "oikean maailman palkintoja"
- **Backend + Database** — SQLite/PostgreSQL + Spring Boot
- **Parental Dashboard** — todellinen vanhempien hallintapaneeli
- **Analytics & Insights** — mitkä tehtävät lapsi tekee hyvin, mihin hän jää jumiin
- **Offline-first + Sync** — paikallinen → cloud

---

## 🎯 MVP Prioriteetti

| # | Feature | MVP | Why | Week |
|---|---|---|---|---|
| 1 | Task Breaker (AI) | ✅ | Core value prop — tehtävän pilkkominen | W1 |
| 2 | Step completion + dopamine (haptic + animation) | ✅ | Engagement loop — välitön palaute | W1–W2 |
| 3 | Pet display (3 tilaa) | ✅ | Retention hook — emotionaalinen | W2 |
| 4 | XP/Coins display | ✅ | Gamification — näkyvä progress | W1 |
| 5 | Parent approval (mockup) | ✅ | Parent engagement | W3 |
| 6 | Backend API | ⚠️ | V2 priorisointi | Later |
| 7 | Focus Mode / LockTask | ❌ | V2 (complex Android) | Later |
| 8 | Real Parental Dashboard | ❌ | V2 | Later |
| 9 | Streak system | ❌ | V2 | Later |

---

## 💾 Data Persistence Strategy

### **MVP (Weeks 1–3)**
- **AsyncStorage** (React Native paikallinen tila)
- Kaikki data: Tasks, User, Pet local JSONissa
- Ei backend-yhteyttä

### **V2 (After MVP validation)**
- **Spring Boot + PostgreSQL** backend
- REST API: `/api/tasks`, `/api/users`, `/api/pet`
- Firebase/Supabase parental push notifications
- SQLite → PostgreSQL migration path

---

## 🚀 Success Metrics

| Metric | Target | How Measure |
|---|---|---|
| **Time-to-engage** | < 30 sec | Aling tehtävä → first step complete |
| **Daily return rate** | 60%+ | Lapsi käyttää 3+ päivää pois 7:stä |
| **Task completion** | 40%+ | Tehdyt askeleet / kaikki askeleet |
| **Pet retention** | 80%+ | Lemmikki edelleen pelissä D7 |

---

## 📦 Tech Stack Finalized

**Frontend:** React Native 0.84.1 + TypeScript + Zustand  
**Backend (V2):** Spring Boot 3.2 + PostgreSQL + JPA  
**AI:** Ollama OpenClaw
**Notifications (V2):** Firebase Cloud Messaging  
**Animations:** Built-in RN + Reanimated potential (V2)

