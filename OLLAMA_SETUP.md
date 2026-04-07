# Ollama Setup Guide — FocusPetApp

Fast guide to get Ollama running for local AI task breaking.

## ⚡ Quick Start (5 minutes)

### 1. Install Ollama
- **macOS**: `brew install ollama` or download from [ollama.ai](https://ollama.ai)
- **Windows**: Download installer from [ollama.ai](https://ollama.ai)
- **Linux**: `curl https://ollama.ai/install.sh | sh`

### 2. Pull the Model (first time only, ~5 GB)
```bash
ollama pull llama3.1:8b
```

### 3. Start Ollama Server
Keep this terminal open during development:
```bash
ollama serve
```

You should see:
```
[GIN] 2024-01-15 10:30:00 | 200 | POST /api/generate
Listening at http://localhost:11434
```

### 4. Verify It Works
```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "messages": [{"role": "user", "content": "Hei, mitä kuuluu?"}]
  }'
```

If successful, you'll see a JSON response with the model's answer.

### 5. Start FocusPetApp
The app will automatically connect to `http://localhost:11434` on desktop or `http://10.0.2.2:11434` on Android Emulator.

## 🚀 Running the App

### For Local Desktop Testing (Windows/Mac/Linux)
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start React Native dev server
npm start

# Terminal 3: Run on Android Emulator or iPhone
npm run android
npm run ios
```

### For Android Emulator
Ollama server must be **running on your host machine** (Terminal 1 above).
The app connects via `http://10.0.2.2:11434` (Android's magic IP for host).

## 🔧 Troubleshooting

### ❌ "Ollama request failed" or "Network error"

**Check 1: Ollama server running?**
```bash
# Should see "Listening at http://localhost:11434"
ollama serve
```

**Check 2: Model pulled?**
```bash
ollama list
# Should show: llama3.1:8b
```

If not, pull it:
```bash
ollama pull llama3.1:8b
```

**Check 3: Port 11434 not blocked?**
```bash
# macOS/Linux
lsof -i :11434

# Windows
netstat -ano | findstr :11434
```

If port is in use, stop the conflict or change Ollama port.

**Check 4: Android Emulator IP?**
For Android Emulator, the app uses `http://10.0.2.2:11434`.
If using a physical device, use your computer's IP:
- Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac)
- Edit `src/services/taskBreaker.ts`: Change `10.0.2.2` to your IP (e.g., `192.168.1.100`)

### ❌ "Model not found" or 404 error
Pull the model:
```bash
ollama pull llama3.1:8b
```

### ❌ "Timeout" (request takes >15 seconds)
- Model is loading into RAM (first request after restart)
- Your computer is low on memory (Llama 3.1 8B needs ~10 GB RAM)
- Network latency is high

**Solutions:**
- Wait 5–10 seconds and try again (model caches in RAM)
- Switch to a smaller model:
  ```bash
  ollama pull mistral:7b
  # Then update OLLAMA_MODEL in taskBreaker.ts to 'mistral:7b'
  ```

### ❌ App falls back to offline FALLBACK_STEPS
This is **not an error**—it's the expected fallback chain:
1. Ollama tried but failed/timed out
2. OpenAI tried (if key is set) but failed
3. App uses offline task templates

This means the user still gets functional task suggestions, just without AI personalization.

## 📊 Model Comparison

| Model | Size | Speed | Memory | Best For |
|-------|------|-------|--------|----------|
| **llama3.1:8b** | 5 GB | 500–800 ms | 8 GB | 🏆 Recommended (balance) |
| mistral:7b | 4 GB | 300–600 ms | 6 GB | Faster, smaller |
| neural-chat:7b | 4 GB | 400–700 ms | 7 GB | More conversational |
| llama3.1:70b | 40 GB | 2–5 s | 40 GB | Highest quality (slow) |

**Quick swap:**
```bash
# Remove old model (optional)
ollama rm llama3.1:8b

# Pull new model
ollama pull mistral:7b

# Update taskBreaker.ts
# Change: const OLLAMA_MODEL = 'llama3.1:8b';
# To:     const OLLAMA_MODEL = 'mistral:7b';

# Restart the app
```

## 🔐 Security & Privacy

✅ **All processing is local** — No data sent to external servers
✅ **No API keys needed** — No subscription costs
✅ **Fully offline** — Works without internet
✅ **Your data stays private** — No telemetry or logging by default

## 📈 Performance Optimization

### GPU Acceleration (Faster Responses)

**macOS (Apple Silicon):**
- Ollama auto-detects; no setup needed
- Response time: ~300–500 ms

**macOS (Intel):**
- Install Metal support (built-in)
- Response time: ~600–1000 ms

**Windows (NVIDIA GPU):**
1. Install CUDA 12.2+: https://developer.nvidia.com/cuda-downloads
2. Install cuDNN v9+: https://developer.nvidia.com/cudnn
3. Restart Ollama
4. Verify: Check Ollama logs for "GPU:"

**Windows (AMD GPU):**
1. Install ROCm: https://rocmdocs.amd.com/en/docs-5.7.3/deploy/windows/
2. Restart Ollama
3. Verify: Check Ollama logs for "GPU:"

**Linux:**
- CUDA: Follow NVIDIA docs, restart Ollama
- AMD: Follow ROCm docs, restart Ollama

### CPU-Only (Still Fine)
- CPU inference is acceptable for task breaking (<2 sec per request)
- If you have 4+ cores and 8 GB RAM, performance is good

## 🎯 Next Steps

1. ✅ Ollama running? → Try opening the app
2. ❌ Still having issues? → Check `/memories/session/ollama-debug.md` for detailed logs
3. 🚀 Want faster responses? → Set up GPU acceleration above
4. 🔄 Want to swap models? → Follow "Model Comparison" section

## 📞 Support

**Ollama Docs:** https://github.com/ollama/ollama
**Llama 3.1 Info:** https://huggingface.co/meta-llama/Llama-3.1-8B

**For FocusPetApp specific issues:**
- Check `src/services/taskBreaker.ts` for the fallback chain logic
- Review app logs in `TaskBreakerScreen.tsx` (where `breakTaskWithAI` is called)
- Check offline templates in `FALLBACK_STEPS` in `taskBreaker.ts`
