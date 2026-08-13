Ehdotetut riippuvuuksien karsinnat (FocusPet — Local MVP)

Tavoite: pienentää riippuvuuksien määrää ja pysyä MVPssä ilman tarpeettomia natiivilisäosia.

Ehdotetut poistot (ei tehdä automaattisesti):

- `@react-native-voice/voice` — puheentunnistus. Poista jos et käytä ääni-komentoja.
- `react-native-tts` — TTS (puhe). Poista jos ei ole ääni-feedbackia.
- `react-native-sound` — äänten toisto, poista jos käytät vain kevyttä ääniefektiä tai platformin native-APIa.
- `react-native-image-picker` — kuvan valinta, poista jos et tarvitse mediaominaisuuksia MVP:ssä.

Miten poistaa (npm):

```sh
npm uninstall @react-native-voice/voice react-native-tts react-native-sound react-native-image-picker
```

Huomioitavaa:
- Ennen poistamista etsi koodista import-lauseita ja korvaa/poista niihin liittyvät hookit ja käyttökohdat.
- Jos poistat natiivi-moduuleja, puhdista Android/iOS buildit:

```sh
# Android
cd android && ./gradlew clean

# iOS (macOS)
cd ios && pod install --repo-update
```

Listaa koodiviittaukset ennen poistoa:

```sh
# Esimerkki (shell):
rg "react-native-tts|@react-native-voice/voice|react-native-sound|react-native-image-picker" -n
```

Jos haluat, voin:
- Etsiä ja poistaa koodiviittaukset automaattisesti.
- Soveltaa `package.json` muutosta ja ajaa `npm uninstall` paikallisesti (pyydä ensin).
