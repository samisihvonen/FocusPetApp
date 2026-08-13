# FocusPet — Yksinkertaistettu arkkitehtuuri

Tämä tiedosto kuvaa yksinkertaisemman, kevyemmän version sovelluksesta — tavoitteena vähentää ylläpidon ja kehityksen vaatimusta sekä nopeuttaa julkaisuvalmiutta.

Ydintavoite
- Tehdä tehtävien pilkkomisesta hauskaa ja palkitsevaa lapsille.
- Säilyttää mahdollisimman pieni tekninen pinta-ala (paikallinen tila, minimimäärä riippuvuuksia).

Keskeiset komponentit (vain mitä tarvitaan MVP:hen)
- UI (React Native + TypeScript): kotinäkymä, tehtävänäkymä, askelkortit, pet-display (3 tilaa).
- Task Breaker: AI-kutsut tai paikallinen heuristiikka pilkkomiseen.
- Paikallinen tallennus: `AsyncStorage` (Tasks, User, Pet, Coins/Xp).
- Minimal state management: paikallinen Zustand/Context tai pelkkä komponenttitila.

Minimitoiminnot (MVP)
- Tehtävän lisääminen ja pilkkominen (AI tai yksinkertainen sääntöjärjestelmä).
- Askeleiden suoritus ja yksinkertainen palkitseminen: animaatio + ääniefekti + kolikot + XP.
- Pet-display: kolme tilaa (ilo, neutraali, suru) — ei persistenssiä tai monimutkaista logiikkaa.
- Paikalliset asetukset: käyttäjätili vain laitteella.

Miksi yksinkertaistaa
- Nopeampi kehityssykli ja pienempi ylläpitokustannus.
- Vähentää backend-työn tarvetta — julkaise ensin paikallisena kokemuksena.
- Helpottaa testausta ja käyttäjäpalautteen keräämistä.

Kasvupolku (yksinkertaisesti)
1. Julkaise paikallinen MVP: kaikki data `AsyncStorage`-ssä.
2. Jos käyttäjäarvio ja tarve kasvaa, lisää opt-in synkronointi (esim. Supabase tai kevyt REST-API).
3. Lisää vanhempien hyväksyntä ja push-notifikaatiot vasta kun backend on perustettu.

Tekninen pinnoitus
- React Native + TypeScript
- Paikallinen storage: `@react-native-async-storage/async-storage`
- Optional: Zustand (kevyempi state management)

Pidetään lista ominaisuuksista minimissä: vältä monimutkaisia toimenpiteitä kuten monen laitteen synkronointia, monimutkaista analytiikkaa tai laajaa backend-arkkitehtuuria V1:ssä.

Seuraavat toimet
- Pienennetään README:tä vastaamaan tätä yksinkertaisempaa lähestymistapaa.
- Listataan koodissa poistettavat/arkistoitavat moduulit (pyydä halutessasi automaattista etsintää).


