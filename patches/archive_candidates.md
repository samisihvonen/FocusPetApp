Archive / removal candidates (proposed)

Tämä tiedosto listaa koodikohteet, jotka voi harkita poistettavaksi tai arkistoitavaksi MVP-version yksinkertaistamiseksi.

Ehdotukset (lyhyt perustelu):

1. Wilma-integraatio
   - Tiedostot: FocusPetApp/src/services/wilmaMessagesClient.ts, FocusPetApp/src/services/wilmaSyncParser.ts, .env.example (WILMA_URL)
   - Perustelu: Koulu-/Wilma-integraatio on valinnainen feature; poista tai arkistoi jos MVP pysyy paikallisena.

2. In-app Shop (backend + entity)
   - Tiedostot: backend/src/main/java/com/focuspet/entity/ShopItem.java, backend/src/main/java/com/focuspet/repository/ShopItemRepository.java
   - Perustelu: Kauppa on V2-ominaisuus. Poistamalla backend-koodin yksinkertaistetaan schemaa ja deploy-prosessia.

3. Push-notifikaatiot / Firebase
   - Tiedostot / merkinnät: backend/README.md (push), DEPLOYMENT.md (Firebase), mahdolliset konfiguraatiot
   - Perustelu: Push vaatii backendin ja kolmannen osapuolen integraatiot — siirrettävä V2:een.

4. Sentry / Analytics (valinnainen)
   - Tiedostot: DEPLOYMENT.md viittaa Sentryyn ja backendin build-konfiguraatioon
   - Perustelu: Virheiden seuranta on hyödyllistä, mutta ei pakollinen MVP:lle — voi jättää kommentoiduksi.

Seuraavat askeleet
- Haluatko, että poistan/arkistoin nämä tiedostot automaattisesti? (voin luoda patchin tai siirtää ne `archive/`-kansioon)
- Vahvista mitkä kohteet hyväksyt poistettaviksi, niin laitan muutokset valmiiksi.

-- Archiving performed --

Seuraavat tiedostot siirretty `archive/`-kansioon ja poistettu alkuperäisistä paikoistaan:

- `FocusPetApp/src/services/wilmaSyncParser.ts` → `archive/FocusPetApp/src/services/wilmaSyncParser.ts`
- `FocusPetApp/src/services/wilmaMessagesClient.ts` → `archive/FocusPetApp/src/services/wilmaMessagesClient.ts`
- `backend/src/main/java/com/focuspet/entity/ShopItem.java` → `archive/backend/src/main/java/com/focuspet/entity/ShopItem.java`
- `backend/src/main/java/com/focuspet/repository/ShopItemRepository.java` → `archive/backend/src/main/java/com/focuspet/repository/ShopItemRepository.java`

Huom: `.env.example` on päivitetty merkitsemään Wilma/Hobby-integraatiot arkistoiduiksi.

Jos haluat perua arkistoinnin, voin palauttaa tiedostot tai jättää ne paikalleen sen sijaan.

--
(Auto-havainto: etsin `wilma`, `ShopItem`, `push`, `sentry` tiedostoja työtilasta ja listasin löydökset.)
