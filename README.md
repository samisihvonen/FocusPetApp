# FocusPet — Lightweight MVP

Tämä README on tiivistetty versio projektin ARCHITECTURE.md:stä: tavoitteena paikallinen, helppo julkaista oleva MVP ilman monimutkaista backend-riippuvuutta.

Ydintavoitteet
- Tee tehtävien pilkkomisesta hauskaa lapsille
- Palkitse suoritetuista askelista (kolikot, XP, animaatiot)
- Säilytä tekninen pinta-ala pienenä: paikallinen tallennus ja minimiriippuvuudet

Keskeiset komponentit
- Frontend: React Native + TypeScript (kansio: FocusPetApp/src)
- Paikallinen tallennus: `@react-native-async-storage/async-storage`
- Task Breaker: OpenAI-kutsu + offline-fallback tai yksinkertainen heuristiikka
- Minimal state: Zustand tai paikallinen komponenttitila

MVP-ominaisuudet
- Lisää tehtävä ja pilko se osiin
- Suorita askeleet, ansaitse kolikkoja ja XP:tä
- Virtual Pet: kolme tilaa (ilo, neutraali, suru)
- Accessibility: yksinkertainen tila suuremmilla fonteilla

Nopea käynnistys (paikallinen MVP)
1. Backend (valinnainen paikallisesti): katso [backend/README.md](backend/README.md)
  ```bash
  cd backend
  docker-compose up
  ```
2. Frontend
  ```bash
  cd FocusPetApp
  npm install
  npm start
  # Android: npm run android
  # iOS: npm run ios
  ```

Säilytettävät periaatteet
- Pidä data paikallisena (AsyncStorage) oletuksena
- Lisää synkronointi vain opt-in-periaatteella (v2)
- Vältä turhia backend-ominaisuuksia V1:ssä

Seuraavat toimet
- Pienennetään README vastaamaan tätä yksinkertaistettua arkkitehtuuria (valmis)
- Etsi ja listaa moduulit, jotka voidaan poistaa tai arkistoida (seuraava)

Lisätiedot ja suunnitelma: katso [ARCHITECTURE.md](ARCHITECTURE.md)

---

**Last Updated:** Aug 13, 2026

