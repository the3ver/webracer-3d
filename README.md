# 🏎️ APEX CIRCUIT // 3D Isometric Arcade Racer

Ein rasanter **3D-Isometrie-Arcade-Racer** im Browser (Three.js), inspiriert von Klassikern wie *GeneRally* und *Circuit Superstars*, mit maßgeschneiderter **2.5D-Arcade-Fahrphysik**, anspruchsvollem Drift-Handling, einem intelligenten **KI-Fahrerfeld** (4 Rennwagen) und dynamischem Web-Audio-Synthesizer.

## Features
- 🏁 **Isometrische 3D-Perspektive:** Orthografische Three.js-Kamera mit flüssiger Fahrzeugverfolgung für optimale Streckenübersicht und Renndynamik.
- 🏎️ **Maßgeschneiderte 2.5D-Arcade-Physik:**
  - Reaktionsschnelle Gas- und Bremsannahme.
  - Dynamischer Drift- und Slip-Angle (Power-Drift mit Leertaste).
  - Oberflächenreibung (Asphalt-Grip, Randstein-Rumble, Rasen-Geschwindigkeitsabfall).
  - Elastische Banden- und Fahrzeugkollisionen (kein Hängenbleiben, packende Positionskämpfe).
- 🤖 **KI-Fahrerfeld:** 3 autonome Kontrahenten mit Ideallinien-Navigation, Kurvenanbremsung und Überhol-Ausweichlogik.
- ⏱️ **Renn-Progression & HUD:** Checkpoint-basierte Rundenzeiterfassung, Live-Platzierungsanzeige (P1–P4), Tacho und Strecken-Radar (Minimap).
- 🔊 **Web Audio Synthesizer:** Prozeduraler Motorensound mit Drehzahl-Pitch, Reifenquietschen beim Driften und Kollisionsgeräusche.

## Steuerung
- **Gas / Bremse:** `W` / `S` oder `Pfeil Oben` / `Pfeil Unten`
- **Lenkung:** `A` / `D` oder `Pfeil Links` / `Pfeil Rechts`
- **Power-Drift:** `Leertaste` oder `Shift`
- **Audio Stummschalten:** `M`
- **Optionen:** `ESC` oder `P`

## Entwicklung & Tests
```bash
# Abhängigkeiten installieren
npm install

# Lokalen Dev-Server starten
npm run dev

# Unit-Tests (Physik, KI, Wegpunkte)
npm run test:unit

# E2E-Tests (Playwright)
npm run test:e2e

# Alle Tests ausführen
npm test
```
