# Ollama Task Breaker — Local AI Prompt Engineering

## 🎯 Tavoite
Murtaa paheksuttavat arjen tehtävät pieniin, hallittaviin, rohkaiseviin askeleisiin. Jokaisessa askeleessa on:
- **Emoji** (visuaalinen ankkuri)
- **Lyhyt kuvaus** (max 8 sanaa, arvoitainen verbi)
- **Positiivinen sävy** ("Voit tehdä sen!")

**Huomio:** Sovellus käyttää **Ollama** -pohjaista paikallista tekoälyä. Se on ilmainen, yksityinen ja offline-yhteensopiva!

---

## � Ollama Setup (before running the app)

### Windows / macOS / Linux

1. **Install Ollama** from [ollama.ai](https://ollama.ai)
   - Download and run the installer for your OS
   - Verify installation: `ollama --version`

2. **Pull the Llama 3.1 model** (8B parameter version, ~5 GB):
   ```bash
   ollama pull llama3.1:8b
   ```

3. **Start Ollama server** (runs on port 11434 by default):
   ```bash
   ollama serve
   ```
   - Keep this terminal open while developing
   - Server listens at `http://localhost:11434`

4. **For Android Emulator**, Ollama is already at `http://10.0.2.2:11434` (Android's alias for host machine)

### Verify Ollama is running:
```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "messages": [{"role": "user", "content": "Hei!"}]
  }'
```

---

## �📋 System Prompt (tuotanto)

```
Olet FocusPet-sovelluksen tehtäväavustaja lapsille (7-12-vuotiaille).
Tehtäväsi on pilkkoa arjen tehtävä 3–5 pieneen, hauskaan askeleeseen.

SÄÄNNÖT:
• Jokainen askel alkaa toimintaverbillä (Kerää, Laita, Petaa, Pese, Siirrä...).
• Maksimissaan 8 sanaa per askel. Lyhyt ja selkeä!
• Jokainen askel sisältää yhden emojin alussa.
• Käytä yksinkertaista, rohkaisevaa kieltä — kuin kaveri puhuisi.
• ÄLÄ käytä vaikeita sanoja tai pitkiä lauseita.
• Askelet etenevät loogisessa järjestyksessä.
• Jos tehtävä on iso, pilko se enemmän askeleisiin (esim. 5 askeleen sijaan 7).

VASTAA AINOASTAAN validissa JSON-muodossa, ilman muuta tekstiä.
```

---

## 📝 Example Prompts & Responses

### Example 1: Huoneen siivous

**User Input:**
```
"Siivoa huone"
```

**System Message:**
```
Pilko tämä tehtävä lapselle sopiviin askeleisiin: "Siivoa huone"
```

**Expected Response:**
```json
{
  "steps": [
    {
      "emoji": "🗑️",
      "description": "Kerää roskat lattialta"
    },
    {
      "emoji": "🧸",
      "description": "Laita lelut omaan laatikkoon"
    },
    {
      "emoji": "🛏️",
      "description": "Petaa sänky siistiksi"
    }
  ]
}
```

---

### Example 2: Läksyjen tekeminen

**User Input:**
```
"Tee läksyt"
```

**Expected Response:**
```json
{
  "steps": [
    {
      "emoji": "🎒",
      "description": "Ota kirja ja vihko esille"
    },
    {
      "emoji": "📖",
      "description": "Lue tehtävä rauhassa ensin"
    },
    {
      "emoji": "✏️",
      "description": "Kirjoita vastaukset vihkoon"
    },
    {
      "emoji": "🔍",
      "description": "Tarkista vastaukset uudestaan"
    }
  ]
}
```

---

### Example 3: Hampaiden pesu

**User Input:**
```
"Pese hampaat"
```

**Expected Response:**
```json
{
  "steps": [
    {
      "emoji": "🪥",
      "description": "Ota hammasharja ja -tahnaa"
    },
    {
      "emoji": "💦",
      "description": "Kostuta harja vedellä"
    },
    {
      "emoji": "👄",
      "description": "Pese hampaat 2 minuuttia"
    },
    {
      "emoji": "💧",
      "description": "Huuhtele suu vedellä"
    }
  ]
}
```

---

## 🧠 Prompt Variations by Task Type

### Siivous-tehtävät (Cleaning)
```
Emojit: 🗑️ 🧹 🛏️ ✨ 🧼 🧽
Verbit: Kerää, Laita, Petaa, Pyyhi, Siivoo
```

### Hygienia-tehtävät (Hygiene)
```
Emojit: 🚰 🪥 🧼 🧴 🚿 💧
Verbit: Pese, Käy, Suihku, Kuiva
```

### Opiskelu-tehtävät (Learning)
```
Emojit: 📚 📖 ✏️ 🖍️ 🎨 📝
Verbit: Ota, Lue, Kirjoita, Tarkista, Opiskele
```

### Järjestys-tehtävät (Organization)
```
Emojit: 🎒 📦 🧸 👕 👟 🏠
Verbit: Pakkaa, Järjestä, Laita, Kerää, Järjestele
```

---

## 🚀 Offline Fallback (MVP)

Jos OpenAI API ei vastaa, käytä `generateFallbackSteps()` -funktiota:

```typescript
const FALLBACK_STEPS: Record<string, Array<{ emoji: string; description: string }>> = {
  siivoa: [
    { emoji: '🗑️', description: 'Kerää roskat ja laita ne roskikseen' },
    { emoji: '🧸', description: 'Laita lelut omaan paikkaan' },
    { emoji: '🛏️', description: 'Petaa sänky siistiksi' },
  ],
  läksyt: [
    { emoji: '🎒', description: 'Ota koulukirja ja vihko esille' },
    { emoji: '✏️', description: 'Lue tehtävä rauhassa ensin' },
    { emoji: '📝', description: 'Tee tehtävät yksi kerrallaan' },
    { emoji: '✅', description: 'Tarkista vastaukset lopuksi' },
  ],
  // ... jne
};
```

---

## 📊 Ollama API Config (Production & Dev)

```typescript
// Ollama API Endpoints (App tries both, auto-fallback to offline)
const OLLAMA_URLS = [
  'http://10.0.2.2:11434/v1/chat/completions', // Android Emulator → Host machine
  'http://localhost:11434/v1/chat/completions',   // Local dev (Windows/Mac/Linux)
];

const OLLAMA_MODEL = 'llama3.1:8b'; // Free, ~8B parameters, good for task breaking

// API Request
const response = await axios.post(
  ollamaUrl, // One of the URLs above
  {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Pilko tämä tehtävä: "${taskTitle}"` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 450,
    temperature: 0.6, // Lower = more consistent, higher = more creative
  },
  { timeout: 15_000 }
);
```

### Why Ollama?
✅ **Free** — No API keys, no subscription costs
✅ **Private** — All processing happens locally on your machine
✅ **Fast** — Sub-second responses (vs. OpenAI network latency)
✅ **Flexible** — Swap models easily (`ollama pull mistral`, etc.)
✅ **Offline-ready** — Works without internet connection

### Alternative Models
If Llama 3.1 is too large, try:
- `ollama pull mistral:7b` — Smaller, faster, good for task breaking
- `ollama pull neural-chat:7b` — Finnish-friendly, conversational
- `ollama pull qwen2:7b` — Multilingual

Pull a model once:
```bash
ollama pull mistral:7b
```

Then update `OLLAMA_MODEL` in `src/services/taskBreaker.ts` and restart the app.

---

## 🔄 Fallback Strategy

The app automatically falls back if Ollama is unavailable:

```
1. Try Ollama (Android Emulator URL)
   ↓ Timeout/error
2. Try Ollama (Localhost URL)
   ↓ Timeout/error
3. Try OpenAI (if OPENAI_API_KEY is set)
   ↓ Error
4. Use offline FALLBACK_STEPS (no network needed)
```

**No user impact** — The app will always produce task suggestions, even without internet.

---

## 💡 Tips & Tricks

### Ollama Tips
1. **Ollama server must be running** — `ollama serve` in a separate terminal
2. **First request is slow** — Model loads into RAM (~5 GB for llama3.1:8b)
3. **GPU acceleration** — Ollama auto-detects GPU; ensure CUDA/Metal drivers are up-to-date
4. **Monitor Ollama logs** — Watch the terminal running `ollama serve` for errors
5. **Adjust temperature** — Lower (0.4–0.6) for consistent task breakdowns, higher (0.8–1.0) for creativity

### Dev Tips
1. **Test offline mode** — Kill Ollama and verify app still works (uses FALLBACK_STEPS)
2. **Mock task breaking** — For UI testing without Ollama:
   ```typescript
   // In taskBreaker.ts, temporarily use fallback:
   export async function breakTaskWithAI(taskTitle: string): Promise<Step[]> {
     return generateFallbackSteps(taskTitle);
   }
   ```
3. **JSON validation** — Validate JSON responses before rendering (already done in extractJson)
4. **User feedback** — Show loader during API calls (500–2000 ms typical)
5. **Locale-aware** — Different languages may need different Ollama models

### Performance Baseline
- **Ollama response time**: 500–2000 ms (Llama 3.1 8B on M1/RTX)
- **Fallback response time**: <10 ms
- **Network timeout**: 15 seconds (OLLAMA_URLS have timeout: 15_000)

---

## 🎓 Iteration Tips

- Testaa eri task typeja ja kerää feedback
- Säädä `temperature` parameteria (0.5–0.9)
- Lisää "safety guidelines" jos lapset syöttävät outoja tehtäviä
- Analysointi: mitkä askelet lapset todella tekevät?
