# Projekt-Kontext & Agenten-Regeln: FFBE Browser-Roguelike

## 1. Projektziel & Kern-Vision
Entwicklung eines rundenbasierten 2D-Browser-Roguelikes (privat/nicht-kommerziell).
- **Vorbilder:** Kampfsystem, Optik, Raster-Aufstellung (Party rechts, Gegner links) und "Move-to-Target"-Angriffsanimationen wie in *Final Fantasy Brave Exvius (FFBE)*. Run-Struktur (Kampf -> Belohnung/Buff wählen -> nächster Kampf) wie in *PokeRogue*.
- **MVP-Umfang:** 3er-Party (z. B. Tank, Heiler, Damage Dealer) gegen 1–3 Gegner. 5 normale Kämpfe + 1 Bosskampf. Kein Open-World-Exploring, keine Story im MVP.
- **Tech-Stack:** TypeScript, Phaser 3, Vite (für das Spiel), Python + Pillow (nur für Offline-Asset-Analyse/Pipeline-Skripte), Git zur Synchronisation zwischen zwei Windows-PCs.

## 2. Strikte Arbeitsweise für den KI-Agenten (ZWINGEND EINZUHALTEN)
1. **Kleine, überprüfbare Schritte:** Erstelle NIals mehrere Systeme oder das halbe Spiel auf einmal. Arbeite immer nur den aktuell angeforderten Meilenstein ab und warte danach auf Freigabe.
2. **Keine erfundenen Tests:** Behaupte niemals, dass ein Tool, ein Build oder eine Animation funktioniert, wenn du es nicht tatsächlich über das Terminal ausgeführt und die Ausgabedateien geprüft hast. Nenne immer klar, was getestet wurde und was nicht.
3. **Ursachenforschung statt Workarounds:** Wenn ein Skript, ein Pfad oder ein Sprite-Offset nicht stimmt, analysiere zuerst die Ursache (z. B. CSV/JSON-Datenstruktur), anstatt blinde Korrekturwerte im Code zu stapeln.
4. **Windows-Umgebung & 2-PC-Sync beachten:** Alle Terminal-Befehle müssen unter Windows (PowerShell/CMD) funktionieren. Halte das Repository über eine saubere `.gitignore` kompakt, damit jederzeit problemlos per `git push` / `git pull` zwischen zwei Windows-Rechnern gewechselt werden kann.
5. **Strikte Trennung von Pipeline und Spiel:** Die Verarbeitung von FFBE-Rohdaten (CSV, CGG, CGS, Roh-Atlas) findet ausschließlich in `tools/` statt. Das Phaser-Spiel in `src/` lädt später nur fertig aufbereitete Standard-Spritesheets und saubere JSON-Metadaten.
6. **Language Convention:** All code, comments, state enums, identifiers, and in-game UI strings must be written in English. German is only used for chat prompts with the developer.
7. **Asset Dump Consultation:** Always consult `docs/asset_structure.md` before searching for or importing new assets from the dump.
8. **Character Import Standard:** Follow `docs/character-import-workflow.md` for character/skill imports. Use reviewed recipes under `tools/characters/` and `tools/effects/`; inspect before publishing. Asset availability is not proof of runtime support or original-game fidelity. Do not add per-character loaders or silently replace missing effects.

## 3. Spezielle Anforderungen an die FFBE-Sprites
- Keine falsch zugeschnittenen oder springenden Sprites.
- Da Einheiten im Kampf von `idle` in `move` (zum Gegner gleiten) und `atk` (Angriff) wechseln, müssen die unterschiedlichen Frame-Größen der Animationen über einen konsistenten Ankerpunkt (Fußpunkt/Pivot) ausgerichtet werden, damit der Charakter beim Animationswechsel nicht springt.
