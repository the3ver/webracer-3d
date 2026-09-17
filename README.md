# 🌲 PINE VALLEY RACEWAY // 3D Isometric Arcade Circuit

Ein rasanter **3D-Isometrie-Arcade-Racer** im Browser (Three.js), inspiriert von Motorsport-Klassikern wie *GeneRally* und *Circuit Superstars*. Die Rennstrecke liegt idyllisch in einem von dichten Kiefern- und Birkenwäldern, Felsen und Kiesbetten umgebenen Bergtal.

## Strecken-Thema: Pine Valley Raceway (Kiefernwald Ring)
- 🌲 **Malerische Tallandschaft:** Kiefern- und Birkenwälder, Felsformationen, umliegende Berg-Silhouetten und sattes Wiesengrün.
- 🏁 **Detaillierte Grand-Prix-Strecke:**
  - Dunkler Asphaltbelag mit gestrichelter Ideallinien-Mittenmarkierung.
  - Aufgemalte Startaufstellungs-Boxen (P1–P4) und Ziellinie.
  - Rot-weiße, abgeschrägte 3D-Curbs (Randsteine) in den Scheitelpunkten.
  - **Kiesbetten (Gravel Traps):** Ockerfarbene Auslaufzonen hinter Haarnadel- und High-Speed-Kurven.
  - **Sponsor-Bandenwerbung:** Farbige Bandenreklame (Rot, Blau, Gelb) und doppelte Reifenstapel-Barrieren.
  - **Tribüne & Boxengebäude:** Überdachte Zuschauertribüne mit bunten Sitzblöcken und Boxengebäude mit Toren an der Start-/Zielgeraden.
  - **Bremspunkte-Tafeln:** 150m-, 100m- und 50m-Schilder vor der Schlüsselkurve.
- 🏎️ **Maßgeschneiderte 2.5D-Arcade-Physik:**
  - Ausbalancierte Höchstgeschwindigkeit und Beschleunigung für präzise Fahrzeugkontrolle.
  - Kontrollierbarer Power-Drift mit dynamischem Slip-Angle (`Leertaste`).
  - Echte Oberflächenreibung (Asphalt-Grip, Randstein-Rumble, Rasen-Verzögerung).
  - Elastische Banden- und Fahrzeugkollisionen ohne Hängenbleiben.
- 🤖 **KI-Fahrerfeld:** 3 autonome Konkurrenten auf der Rennlinie mit Kurvenanbremsung und Überhollogik.
- ⏱️ **Renn-HUD:** Live-Platzierung (P1–P4), Rundenzeiten, Minimap-Radar und Podium-Ergebnisliste.
- 🔊 **Web Audio Synthesizer:** Prozeduraler Motorsound, Drift-Quietschen und Kollisionssounds.

## Steuerung
- **Gas / Bremse:** `W` / `S` oder `Pfeil Oben` / `Pfeil Unten`
- **Lenkung:** `A` / `D` oder `Pfeil Links` / `Pfeil Rechts`
- **Power-Drift:** `Leertaste` oder `Shift`
- **Ton An/Aus:** `M`
- **Optionen:** `ESC` oder `P`

## Tests & Entwicklung
```bash
# Unit-Tests ausführen (Physik, KI, Wegpunkte, Streckendetails)
npm run test:unit

# E2E-Tests ausführen (Playwright)
npm run test:e2e

# Alle Tests ausführen
npm test

# Dev-Server starten
npm run dev
```
