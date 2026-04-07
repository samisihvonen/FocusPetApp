# FocusPet — Tekninen Yhteenveto & Rakenne

Tämä dokumentaatio kokoaa koko FocusPet-sovelluksen arkkitehtuurin, MVP-strategian ja toteutuksen.

---

## 📂 Projektirakennus

```
FocusPetApp/
├── 📱 FocusPetApp/                  # React Native frontend
│   ├── src/
│   │   ├── types/index.ts           # Domain types (Task, Step, Pet, User)
│   │   ├── constants/theme.ts       # Colors, fonts, radius design system
│   │   ├── store/
│   │   │   ├── useUserStore.ts      # User state (Zustand)
│   │   │   ├── useTaskStore.ts      # Tasks state
│   │   │   └── usePetStore.ts       # Pet state
│   │   ├── services/
│   │   │   ├── taskBreaker.ts       # OpenAI + offline fallback
│   │   │   └── api.ts               # Backend REST calls
│   │   ├── hooks/
│   │   │   ├── useHaptics.ts        # Vibration patterns
│   │   │   └── useDopamineFeedback.ts # Stars + haptic combo
│   │   ├── components/
│   │   │   ├── Pet/PetDisplay.tsx
│   │   │   ├── StepItem/StepItem.tsx
│   │   │   ├── TaskCardBig/TaskCardBig.tsx
│   │   │   ├── XPBar/XPBar.tsx
│   │   │   ├── CoinCounter/CoinCounter.tsx
│   │   │   └── StarBurst/StarBurst.tsx
│   │   ├── screens/
│   │   │   ├── HomeScreen/
│   │   │   ├── TaskBreakerScreen/
│   │   │   └── FocusModeScreen/
│   │   └── navigation/
│   │       ├── MainNavigator.tsx
│   │       └── types.ts
│   ├── package.json                 # zustand, axios
│   ├── tsconfig.json
│   └── android/ / ios/              # Native configs
│
├── 🔙 backend/                      # Spring Boot REST API
│   ├── src/main/java/com/focuspet/
│   │   ├── entity/
│   │   │   ├── User.java
│   │   │   ├── Task.java
│   │   │   ├── Step.java
│   │   │   ├── Pet.java
│   │   │   └── ShopItem.java
│   │   ├── repository/
│   │   │   ├── UserRepository.java
│   │   │   ├── TaskRepository.java
│   │   │   ├── StepRepository.java
│   │   │   ├── PetRepository.java
│   │   │   └── ShopItemRepository.java
│   │   ├── controller/
│   │   │   ├── UserController.java
│   │   │   ├── TaskController.java
│   │   │   └── PetController.java
│   │   ├── dto/
│   │   │   ├── UserDTO.java
│   │   │   ├── TaskDTO.java
│   │   │   ├── StepDTO.java
│   │   │   └── PetDTO.java
│   │   └── FocusPetApplication.java
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── application-postgres.properties
│   ├── build.gradle                 # Gradle config
│   ├── docker-compose.yml           # PostgreSQL + backend
│   ├── Dockerfile
│   └── README.md
│
├── 📄 ARCHITECTURE.md               # MVP-strategia & roadmap
├── 📄 OPENAI_PROMPT_GUIDE.md        # AI Task Breaker -opas
├── 📄 DEPLOYMENT.md                 # Deployment ja scaling
├── 📄 README.md                     # Tämä dokumentaatio
└── .gitignore
```

---

## 🎯 MVP-strategia (Kuvan mukaan)

| Vaihe | Ominaisuus | Kesto | Priorisointi | Status |
|-------|-----------|-------|--------------|--------|
| **#1** | AI Task Breaker + Dopamine UI | 2–3 vk | 🥇 Core | ✅ Done |
| **#1** | Haptic + "pling" + tähti-animaatio | 2–3 vk | 🥇 Core | ✅ Done |
| **#2** | Virtual Pet (3 mood tilaa) | 1–2 vk | 🥈 Retention | ⚠️ WIP |
| **#3** | Parental approval (mockup) | 1 vk | 🥉 Engagement | ⚠️ WIP |
| **#3** | Real-world reward setting | 1 vk | 🥉 Engagement | ⚠️ WIP |
| — | Backend API + Database | **Nyt** | 📦 Infra | ✅ Done |
| — | Focus Mode / LockTask | V2 | ❌ Later | — |
| — | Streak system | V2 | ❌ Later | — |
| — | In-app Shop | V2 | ❌ Later | — |

---

## 🔌 API Endpoints

### Users
```
GET  /api/users/{id}             → UserDTO
POST /api/users                  → Create user
PUT  /api/users/{id}             → Update stats
GET  /api/users/{id}/stats       → { coins, xp, level, streak }
```

### Tasks
```
GET  /api/tasks/user/{userId}    → List<TaskDTO>
GET  /api/tasks/{id}             → TaskDTO with steps
POST /api/tasks?userId=1         → Create
PUT  /api/tasks/{id}/complete    → Mark complete
DELETE /api/tasks/{id}           → Remove
```

### Pet
```
GET /api/pets/user/{userId}                → PetDTO
PUT /api/pets/{petId}/happiness?delta=20  → Update mood
```

---

## 💾 Data Model (JPA Entities)

```
User
├── id: Long (PK)
├── username: String (unique)
├── email: String
├── coins: int (default 0)
├── xp: int (default 0)
├── level: int (calculated from XP)
├── streakDays: int
├── lastActiveDate: LocalDateTime
├── createdAt: LocalDateTime
├── pet: One-to-One → Pet
└── tasks: One-to-Many → Task[]

Task
├── id: Long (PK)
├── title: String
├── status: IDLE | ACTIVE | COMPLETED
├── totalXP: int (sum of steps XP)
├── totalCoins: int (sum of steps coins)
├── createdAt: LocalDateTime
├── completedAt: LocalDateTime
├── user: Many-to-One → User
└── steps: One-to-Many → Step[]

Step
├── id: Long (PK)
├── stepOrder: int (1..5)
├── emoji: String ("🗑️")
├── description: String (max 8 words)
├── isDone: boolean
├── xpReward: int (default 20)
├── coinReward: int (default 10)
└── task: Many-to-One → Task

Pet
├── id: Long (PK)
├── name: String ("Pöllö")
├── mood: ECSTATIC | HAPPY | NEUTRAL | SAD
├── happiness: int (0–100)
├── accessories: JSON string
└── user: One-to-One → User

ShopItem
├── id: Long (PK)
├── name: String
├── emoji: String
├── cost: int (coins)
├── globalTemplate: boolean
└── user: Many-to-One → User
```

---

## 🚀 Getting Started

### 1. Start Backend

```bash
cd backend
docker-compose up

# Verify: http://localhost:8080/api/users/1 → 404 (expected)
```

### 2. Start Frontend

```bash
cd FocusPetApp
npm start

# iOS
npm run ios

# Android
npm run android
```

### 3. Create Test User

```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"Aleksi","email":"aleksi@example.com"}'
```

---

## 🎨 Design System

### Theme Colors
```
Primary:     #7C3AED (purple)
Success:     #10B981 (green)
Warning:     #F59E0B (orange)
Danger:      #EF4444 (red)
Background:  #1E1B4B (dark purple)
Text:        #F8FAFC (white)
```

### Typography
```
Hero:        36px bold
Title:       22px bold
Body:        15px regular
Small:       13px regular
Label:       12px bold
```

### Spacing & Radius
```
Radius: 8px (sm), 16px (md), 20px (lg), 24px (xl)
Padding: 16px standard
Gap: 8–16px between elements
```

---

## 🔑 Key Features (MVP #1)

### 1. AI Task Breaker
- **OpenAI gpt-4o-mini** pilkkoo tehtävät
- **Offline fallback** jos API down
- **Lapsiystävälliset emojit + sanat**
- JSON response parsing

### 2. Dopamine Loop
- ✅ **Haptic feedback** (tärinä: `[0, 50, 60, 80]` ms)
- 🎉 **Star burst animation** (tähdet pop in + fade out)
- 📢 **Sound effect** "pling" (v2)
- 🪙 **Coins + XP** visible inline

### 3. Task Cards (Grid Layout)
- 2x2 grid on home screen
- Large emoji (64px)
- Category labels (SIIVOUS, OPISKELU jne.)
- Progress bar underneath

### 4. Virtual Pet (Basis)
- 🦉 **Three mood states**: ecstatic, happy, sad
- **Happiness 0–100** updates on task completion
- **Bounce animation** always
- **Glow aura** color per mood

---

## 📡 Frontend → Backend Integration

**AsyncStorage MVP:**
```typescript
// MVP fase: lokaali storage vain
await AsyncStorage.setItem('tasks', JSON.stringify(tasks));
```

**Backend Phase (V2):**
```typescript
// Integroituu API-kerrokseen
const tasks = await fetchUserTasks(userId);
useTaskStore.setState({ tasks });
```

---

## 🔐 Security Notes

- [ ] API keys eivät koodin sisällä → environment variables
- [ ] CORS enabled vain tunnetuille origineille
- [ ] JWT authentication (V2)
- [ ] Database passwords rotatoitu
- [ ] SSL/TLS enforced (production)

---

## 🚢 Deployment Checklist

- [ ] Backend dockerilla (`docker-compose up`)
- [ ] PostgreSQL instance running
- [ ] Frontend API_BASE URL configured
- [ ] Staging environment tested
- [ ] Production database backups
- [ ] Monitoring configured (Sentry/DataDog)
- [ ] Rate limiting enabled
- [ ] App Store & Play Store builds ready

---

## 📚 Dokumentaation Linkit

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — MVP-vaiheet ja roadmap
- **[OPENAI_PROMPT_GUIDE.md](OPENAI_PROMPT_GUIDE.md)** — AI Task Breaker -opas
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Deploy ja scaling
- **[backend/README.md](backend/README.md)** — Spring Boot -opas

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ Finish Pet happiness integration
2. ✅ Implement streak system
3. ✅ Add push notifications (Firebase, V2)
4. ⚠️ Test on real devices (iOS + Android)

### Short-term (Weeks 2–3)
1. Parental approval dashboard (basic)
2. Real-world reward redemption
3. In-app shop (UI only)
4. Analytics & error tracking (Sentry)

### Medium-term (V2)
1. Focus Mode + LockTask API
2. Full parental control panel
3. Multi-language support (Finnish, English, Swedish)
4. Advanced streak & reward system

---

## 💬 Questions?

- **Backend issues**: Check `docker logs focuspet-api`
- **API docs**: OpenAPI spec (V2)
- **Design**: See [constants/theme.ts](FocusPetApp/src/constants/theme.ts)
- **State management**: [store/](FocusPetApp/src/store/)

---

**Last Updated:** March 31, 2026  
**Status:** MVP #1 Complete ✅ | Backend + API Live 🚀 | Ready for Testing 🧪
