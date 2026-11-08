# FFRogue – Die übergeordnete Projektvision

> Herkunft: vom Entwickler am 2026-11-07 aus der Codex-Arbeitsumgebung übergeben,
> Wortlaut unverändert übernommen (nur als Markdown formatiert). Abschnitt 10
> beschreibt den damaligen Entwicklungsstand, nicht den aktuellen. Ergänzungen
> und Präzisierungen des Entwicklers stehen am Ende unter
> „Präzisierungen 2026-11-07“.

- **Projektname:** Final Fantasy Rogue (FFRogue)
- **Plattform:** PC (Windows/Desktop), später optional Mobilgeräte
- **Genre:** Final-Fantasy-Crossover-Roguelike mit rundenbasierten Kämpfen
- **Grundlage:** Final Fantasy Brave Exvius (FFBE) und dessen Originalressourcen
- **Projektcharakter:** Privates, nicht kommerzielles Fanprojekt

## 1. Die Vision in einem Satz

FFRogue soll ein hochwertiges, endlos erweiterbares Final-Fantasy-Roguelike werden, in dem authentische Charaktere, Animationen, Fähigkeiten, Gegner, Kampfhintergründe und Musik aus möglichst allen Final-Fantasy-Teilen in einem gemeinsamen Spielsystem zusammenkommen.

Es soll sich anfühlen, als würde man mit einer zufällig zusammengestellten Final-Fantasy-Party durch unterschiedliche Welten der gesamten Spielereihe reisen.

Die audiovisuelle Identität orientiert sich stark an Final Fantasy Brave Exvius – insbesondere an seinen Charakter-Sprites, aufwendigen Skillanimationen, Kampfeffekten, Sounds und seiner Fantasy-Ästhetik.

Gleichzeitig soll FFRogue ein eigenständiges Roguelike mit eigenen Regeln, Entscheidungen und einem hohen Wiederspielwert werden.

Es geht nicht darum, FFBE einfach zu kopieren. Es geht darum, seine außergewöhnlichen Originalressourcen in einem neuen, abwechslungsreichen Spielkonzept lebendig zu machen.

## 2. Das gewünschte Spielerlebnis

Eine Expedition beginnt nicht mit einer fest vorgegebenen Heldengruppe.

Stattdessen erhält der Spieler über eine mechanische Slot Machine eine zufällige Party aus drei Final-Fantasy-Charakteren.

Das kann beispielsweise eine Kombination aus Cloud, Delita und Cloud of Darkness sein – oder eine völlig andere Zusammenstellung.

Jeder Charakter bringt seine eigene Identität mit:

- Originales Charakterdesign und passende Unit-Variante
- Originale Kampf- und Idle-Animationen
- Charaktertypische Fähigkeiten
- Eigene HP-, MP- und Kampfwerte
- Tatsächlich existierende FFBE-Seltenheitsstufen
- Passende originale Sounds und visuelle Effekte

Vor Beginn kann der Spieler die vollständige Party mehrfach neu ziehen. Aktuell gibt es eine kostenlose Ziehung und drei vollständige Team-Rerolls.

Eine wichtige Regel: Dieselbe Charakterfamilie soll nicht mehrfach innerhalb einer Party erscheinen. Unterschiedliche Varianten von Cloud sollen beispielsweise nicht gleichzeitig als voneinander unabhängige Helden in derselben Gruppe auftreten.

Nach der Auswahl beginnt die Expedition.

Der Spieler durchläuft unterschiedliche Gebiete, begegnet Gegnergruppen, kämpft gegen Bosse und verbessert seine Party durch Belohnungen.

Jede Expedition soll neue Kombinationen, Entscheidungen und Herausforderungen erzeugen.

### Der Roguelike-Kern

Der Spieler startet mit einer begrenzten Auswahl an Fähigkeiten.

Aktuell besitzt jeder Charakter einen Startskill und kann insgesamt bis zu drei aktive Skills ausrüsten.

Nach Kämpfen werden Belohnungen angeboten, die beispielsweise neue Fähigkeiten oder Verbesserungen ermöglichen.

Nach besonderen Kämpfen können Charaktere erwachen und stärkere Originalformen erreichen.

Dabei sollen keine künstlichen Fantasie-Seltenheiten entstehen. Stattdessen verwendet FFRogue die tatsächlich nachgewiesenen FFBE-Formen wie 3★ bis 7★, Neo Vision und perspektivisch weitere korrekt rekonstruierte Entwicklungsstufen.

Eine Expedition besitzt eine feste Charakteridentität, nachvollziehbare Entscheidungen und ein klares Ende durch Sieg oder Niederlage.

Der Wiederspielwert entsteht aus unterschiedlichen Partys, Skillkombinationen, Belohnungen, Gegnern, Bossmechaniken und Final-Fantasy-Welten – nicht bloß aus zufällig erhöhten Zahlenwerten.

## 3. Das Herzstück: Originalgetreue Final-Fantasy-Charaktere und Fähigkeiten

Dieser Punkt ist für das gesamte Projekt besonders wichtig.

FFRogue soll die vorhandenen Originalressourcen aus FFBE möglichst authentisch wiedergeben.

Die Charaktere sollen ihre erkennbaren Original-Sprites, Körperbewegungen, Angriffsanimationen, Seltenheitsformen und Auren verwenden.

Vor allem die Fähigkeiten sind ein entscheidendes Qualitätsmerkmal.

Wenn Cloud beispielsweise Brave Slash, Blade Beam oder Climhazzard einsetzt, soll die Fähigkeit visuell und akustisch möglichst so wirken wie im ursprünglichen FFBE.

Das umfasst:

- Körperanimationen und Bewegungen
- Angriffs- und Treffertimings
- Effektgeometrie und Materialien
- Partikel und Texturen
- Transparenz, Blendmodi und Licht
- Mehrphasige Effekte
- Originale Sound-Cues
- Synchronisation zwischen Animation, Schaden und Audio

### Originaltreue statt bloßer Annäherung

Ein wichtiges Entwicklungsprinzip lautet:

Wir wollen verstehen, wie Originaleffekte funktionieren, statt sie nur oberflächlich nachzubauen.

Deshalb besitzt FFRogue eine eigene Source-Rendering- und Importarchitektur.

Originaleffekte sollen aus ihren Daten rekonstruiert und in Echtzeit dargestellt werden.

Das reine Abspielen vorgerenderter Bild- oder Videosequenzen ist nicht die gewünschte Hauptlösung.

Kurzfristig ist eine visuell überzeugende, authentische Darstellung wichtiger als stundenlanges Pixel-Perfect-Tuning. Langfristig soll die technische Grundlage aber möglichst viele Originaleffekte korrekt unterstützen.

Ebenso wichtig ist die ehrliche Kennzeichnung von Rekonstruktionen:

Ein belegter FFBE-Effekt ist etwas anderes als ein eigens entwickelter FFRogue-Effekt.

Originaldaten, plausible Annahmen und bewusste FFRogue-Anpassungen dürfen nicht miteinander verwechselt werden.

## 4. Eine Reise durch die gesamte Final-Fantasy-Reihe

FFRogue soll sich nicht auf die ursprünglichen FFBE-Welten beschränken.

Die langfristige Vision umfasst möglichst viele Spiele des Final-Fantasy-Universums:

Final Fantasy I bis Final Fantasy XVI, Final Fantasy Tactics und passende Ableger wie Crisis Core, Type-0 und andere tatsächlich durch Ressourcen unterstützte Titel.

Dabei sind mehrere Ebenen wichtig:

### Charaktere

Helden und später weitere Figuren aus den verschiedenen Final-Fantasy-Spielen sollen im gemeinsamen Roster verfügbar werden.

Jeder Charakter soll über seine tatsächliche Herkunft, Original-Unit-ID und Varianten identifizierbar sein.

### Arenen

Die Expedition soll durch authentische Kampfumgebungen aus unterschiedlichen Final-Fantasy-Teilen führen.

Beispiele sind Shinra- und Mako-Reaktor-Umgebungen aus FFVII, Dollet aus FFVIII sowie künftig passende Orte aus weiteren Spielen.

Wenn die Originaldaten animierte Hintergründe enthalten, sollen diese auch in FFRogue animiert sein.

### Musik

Jede Welt soll musikalisch wiedererkennbar sein.

Ein normaler Kampf in einer FFVII-Arena soll nach Möglichkeit die normale FFVII-Kampfmusik verwenden, nicht einen beliebigen besonders dramatischen Boss-Track.

Für FFVIII wäre beispielsweise Don't Be Afraid das gewünschte klassische Standard-Kampfthema.

Es muss zwischen normaler Kampfmusik, Bossmusik, Gebietsmusik und besonderen Ereignisstücken unterschieden werden.

Musik soll innerhalb eines zusammenhängenden Gebiets kontinuierlich laufen. Bewusste Wechsel beim Boss, beim Gebietswechsel oder beim Run-Ende sind dagegen erwünscht.

Die Musik soll Atmosphäre schaffen und die Herkunft einer Arena unterstreichen – nicht zufällig irgendeinen verfügbaren Soundtrack abspielen.

### Gegner und Bosse

Langfristig sollen auch Gegner und Bosse mit ihren originalen Animationen, Angriffen und Fähigkeiten integriert werden.

Ein Guard Scorpion soll irgendwann nicht nur wie der Originalboss aussehen, sondern auch mit seinen charakteristischen Attacken kämpfen.

Bosskämpfe sollen sich durch Mechaniken, Angriffsphasen und ihre Inszenierung voneinander unterscheiden.

## 5. Die wichtigste technische Vision: eine universelle Import-Pipeline

FFRogue soll langfristig nicht dadurch wachsen, dass jede einzelne Figur und Fähigkeit mühsam von Hand programmiert wird.

Das eigentliche technische Ziel ist ein datengetriebenes System, das Originalinhalte aus FFBE möglichst automatisiert importieren und produktiv verwenden kann.

Dazu gehören mehrere zusammenhängende Pipelines.

- **Charakter-Pipeline:** Original-Unit finden, Herkunft und Varianten bestimmen, Sprites und Körperanimationen importieren, original belegte Formen und Auren verknüpfen.
- **Skill-Pipeline:** Originalfähigkeiten identifizieren, Effektgruppen und Animationen rekonstruieren, Sounds und Zeitpunkte zuordnen und als spielbare Aktionen bereitstellen.
- **Gegner-Pipeline:** Gegnerdaten, Körperclips, Fähigkeiten, Angriffsregeln und visuelle Effekte aus Originalressourcen übernehmen.
- **Arena-Pipeline:** Kampfhintergründe automatisch katalogisieren, Texturen und Animationen importieren, Herkunft zuordnen und im produktiven Renderer darstellen.
- **Musik- und Audio-Pipeline:** Originalarchive, Cue-IDs, Loop-Marken und Musikrollen erkennen und mit den passenden Spielsituationen verbinden.

### Das langfristige Ideal

Wenn wir beispielsweise einen neuen FFVII-Charakter hinzufügen möchten, soll das System möglichst automatisch erkennen:

- Welche Original-Unit-Varianten existieren?
- Welche Seltenheitsformen sind vorhanden?
- Welche Sprites und Animationen gehören dazu?
- Welche Skills sind verfügbar?
- Welche Effekt- und Sounddaten sind vorhanden?
- Welche dieser Inhalte lassen sich bereits zuverlässig importieren?
- Was fehlt noch?

Die Pipeline soll dabei automatisch zwischen vollständig unterstützten, teilweise unterstützten und blockierten Inhalten unterscheiden.

Neue Inhalte sollen auf wiederverwendbaren Regeln beruhen und nicht auf einer immer größer werdenden Sammlung hartcodierter Sonderfälle.

Die universelle Importarchitektur ist der Schlüssel dazu, dass FFRogue irgendwann Hunderte Charaktere, Fähigkeiten, Gegner und Arenen unterstützen könnte, ohne dass jede Ergänzung ein neues Entwicklungsprojekt wird.

## 6. Kampfinterface und visuelle Identität

FFRogue soll sich nicht wie eine gewöhnliche Website mit Spielgrafik anfühlen.

Die Benutzeroberfläche soll hochwertig, atmosphärisch und klar Final-Fantasy-inspiriert wirken.

Die gewählte visuelle Richtung ist:

- Tiefblaue und silberne Farben
- Elegante Fantasy-Rahmen
- Dezente kristalline Ornamente
- Gute, ruhige Typografie
- Klare und gut lesbare Kampfwerte
- Hochwertige, aber nicht überladene Animationen

Das Spiel bleibt primär für den PC entwickelt und verwendet eine Hochformat-Spieloberfläche.

### Die wichtigste Bedienphilosophie

Der Spieler soll nicht gegen das Interface kämpfen müssen.

Im Kampf sollen drei Charaktere mit originalen Kopfporträts, HP- und MP-Balken sichtbar sein.

Die verfügbaren Aktionen sollen ohne unnötige Untermenüs erreichbar sein.

Standardangriff und die maximal drei ausgerüsteten Skills bilden den Kern der direkten Bedienung.

Gegner sollen ihre eigenen grafischen HP-Balken besitzen und direkt in der Arena angeklickt werden können.

Die Arena selbst ist also gleichzeitig der Ort, an dem Ziele ausgewählt werden.

Die Originalanimationen sollen viel Platz erhalten, während Statusanzeigen und Befehle kompakt und klar bleiben.

Überflüssige Mechaniken aus früheren Entwicklungsphasen sollen nicht künstlich erhalten werden. Ein Beispiel ist das inzwischen entfernte, von FFRogue erfundene Melee-/Ranged-Stance-System.

Das aktuelle Arena-First-Battle-Ribbon verfolgt diese Philosophie bereits, ist aber gestalterisch und ergonomisch noch nicht endgültig abgenommen.

## 7. Was FFRogue besonders machen soll

FFRogue soll sich von einem gewöhnlichen Fanprojekt durch die Verbindung mehrerer Eigenschaften unterscheiden.

- **Authentizität:** Charaktere, Fähigkeiten, Auren, Gegner, Arenen und Musik sollen für Final-Fantasy-Fans unmittelbar wiedererkennbar sein.
- **Abwechslung:** Unterschiedliche Charakterzusammenstellungen, Fähigkeiten und Gebiete sollen dazu führen, dass sich Expeditionen nicht ständig gleich anfühlen.
- **Kompakte Spielbarkeit:** Der Kampf soll angenehm direkt bedienbar sein. Weniger verschachtelte Menüs, mehr tatsächliches Spielen.
- **Atmosphäre:** Musik, animierte Hintergründe, Originaleffekte, Crystal Encounter und Siegesanimationen sollen ein zusammenhängendes Final-Fantasy-Erlebnis erzeugen.
- **Wachstum:** Das Spiel soll durch seine Importarchitektur ständig um weitere authentische Inhalte erweitert werden können.
- **Technische Nachvollziehbarkeit:** Jeder importierte Inhalt soll auf konkrete Originaldaten zurückgeführt und mit reproduzierbaren Tests überprüft werden können.

Der Spieler soll langfristig immer wieder auf neue Charaktere, Gegner, Arenen und Kombinationen stoßen können, ohne dass dabei die Qualität der vorhandenen Inhalte verloren geht.

## 8. Langfristige Erweiterungen

Wenn die grundlegenden Systeme stabil, spielbar und optisch überzeugend sind, kann FFRogue schrittweise wachsen.

Geplante beziehungsweise denkbare Ausbaustufen sind:

1. Ein deutlich größerer spielbarer Charakterkatalog aus verschiedenen Final-Fantasy-Teilen.
2. Mehr authentische Source-Skills pro Charakter, statt ständig nur neue Figuren mit einer einzigen Fähigkeit hinzuzufügen.
3. Weitere thematische Gebiete mit eigenen Gegnern, Bossen, Hintergründen und Musik.
4. Interessantere Bossmechaniken und originalgetreue Gegnerfähigkeiten.
5. Mehr strategische Vielfalt durch Skills, Belohnungen und Charakterentwicklung.
6. Ein Charakter-Kompendium mit Originalformen, Varianten und Informationen zur Herkunft.
7. Ein Bestiarium mit Gegnern, Bossen, Animationen und gegebenenfalls Kampfdaten.
8. Langfristig ein optionaler privater Port auf Mobilgeräte, nachdem die PC-Version stabil ist.

Die genaue Anzahl der Gebiete, Kämpfe, Charaktere und Erweiterungen ist dabei keine unveränderliche Vorgabe.

Die Architektur soll Wachstum ermöglichen, ohne das Spiel schon zu Beginn mit unnötiger Komplexität zu überladen.

## 9. Verbindliche Entwicklungsprinzipien

Für jede KI oder jeden Entwickler, der an FFRogue arbeitet, gelten folgende Grundsätze:

- **Originaltreue vor Fantasie:** Wenn wir eine originale FFBE-Fähigkeit importieren, soll sie möglichst dem Original entsprechen. Fehlende Daten dürfen nicht als angeblich original erfunden werden.
- **Universelle Lösungen vor Sonderfällen:** Ein neu verstandener Importmechanismus soll möglichst vielen Charakteren, Skills oder Gegnern helfen.
- **Spielbarer Fortschritt vor reiner Forschung:** Erkenntnisse sollen nach Möglichkeit direkt im produktiven Spiel ankommen. Forschung ohne absehbaren Nutzen darf nicht unbegrenzt weiterlaufen.
- **Vorhandene Abnahmen respektieren:** Bereits geprüfte Charakteranimationen, Auren, Effekte, Sounds und UI-Elemente dürfen nicht ohne konkreten Grund verändert werden.
- **Originalressourcen bewahren:** Rohdaten, Forschungsbestände und frühere Nachweise sollen nachvollziehbar erhalten bleiben. Bereinigungen müssen referenzierbar und abgesichert sein.
- **Keine überflüssigen Altmechaniken:** Historische Workarounds, die durch korrekte Originalimporte ersetzt wurden, sollen vollständig entfernt werden, statt dauerhaft als tote Funktionen zu verbleiben.
- **Kritisch arbeiten:** Eine KI soll Probleme offen benennen, falsche Annahmen korrigieren und bessere Lösungen vorschlagen, statt lediglich jeden Wunsch unkritisch umzusetzen.
- **Technische Prüfung ist nicht visuelle Abnahme:** Ein erfolgreicher Build und bestandene Tests bedeuten nicht automatisch, dass eine Animation, ein Sound oder das UI dem gewünschten Qualitätsniveau entspricht.
- **Private Nutzung respektieren:** Das Projekt ist ein nicht kommerzielles Fanprojekt mit Ressourcen, deren Rechte bei den jeweiligen Inhabern liegen. Eine öffentliche Veröffentlichung oder Weiterverteilung dieser Inhalte ist nicht automatisch Teil der Vision.

## 10. Wo das Projekt heute steht

FFRogue ist längst nicht mehr nur eine theoretische Idee.

Es existiert bereits ein spielbarer PC-Prototyp mit:

- Einer Hauptmenü- und Slot-Machine-Struktur
- Zufälligen Dreierpartys
- Originalen FFBE-Unit-Formen und Awakenings
- 15 spielbaren Source-Skills
- Einem gemeinsamen Source-Effektrenderer
- Zahlreichen belegten Original-Kampfgeräuschen
- Zwei spielbaren Gebieten mit insgesamt vier Kämpfen
- Ochu und Guard Scorpion als Bossen
- Zusätzlichen importierten, animierten FFVII- und FFVIII-Arenen
- Einer Arena- und Musikgalerie
- Getrennter Normal- und Bosskampfmusik im FFVII-Reaktor
- Dem visuell abgenommenen Crystal Encounter
- Einem neuen Arena-First-Battle-Ribbon
- Reproduzierbaren Runs, Belohnungen, Speicherständen und Regressionstests

Das aktuelle Kampfinterface ist bereits erheblich verbessert, benötigt aber noch gestalterische und ergonomische Feinarbeit.

Weitere Original-Skills, fehlende Audiodaten, zusätzliche Arenen und insbesondere die Rekonstruktion originaler Bossfähigkeiten bleiben wichtige Entwicklungsgebiete.

Das tiefgehende Reverse Engineering der Bossfähigkeiten ist momentan aus Ressourcengründen pausiert.

Diese Informationen beschreiben einen Entwicklungsstand, nicht die Grenze der langfristigen Vision.

## 11. Das langfristige Zielbild

Stell dir FFRogue in einer deutlich weiterentwickelten Version vor:

Du startest das Spiel und siehst das vertraute blau-silberne Hauptmenü mit einem schwebenden Kristall.

Du beginnst eine Expedition.

Die Slot Machine zieht drei zufällige Final-Fantasy-Charaktere aus einem großen, vielfältigen Roster.

Du entscheidest, ob du diese Party behältst oder eine weitere vollständige Ziehung verwendest.

Du betrittst die erste Arena durch einen eindrucksvollen Crystal Encounter.

Der Hintergrund stammt erkennbar aus einer bestimmten Final-Fantasy-Welt. Die Musik passt zur Umgebung und zur Art der Begegnung.

Deine Charaktere stehen mit ihren originalen Sprites und Auren in der Arena. Gegner besitzen sichtbare Lebensbalken und reagieren auf deine Aktionen.

Du wählst direkt einen Charakter, einen seiner Skills und das gewünschte Ziel.

Es folgt eine aufwendige Original-Final-Fantasy-Animation mit korrekt synchronisierten Effekten und Geräuschen.

Nach dem Kampf erhältst du Belohnungen, entwickelst deine Party weiter und entscheidest, wie du mit deinen begrenzten Ressourcen umgehst.

Später betrittst du ein anderes Gebiet aus einem anderen Final-Fantasy-Teil.

Ein neuer Hintergrund, neue Musik, andere Gegner und ein besonderer Boss verändern die Atmosphäre.

Vielleicht erreichst du eine höhere originale Charakterform. Vielleicht entsteht eine ungewöhnlich starke Skillkombination. Vielleicht scheitert deine Expedition an einem schwierigen Boss.

Beim nächsten Start wird deine Party völlig anders aussehen.

Und mit jedem neuen, sauber importierten Final-Fantasy-Inhalt wird das Universum größer.

Genau das ist FFRogue: Eine immer wieder neu erlebbare Reise durch das Final-Fantasy-Universum, getragen von authentischen Originalressourcen, einem zugänglichen Roguelike-Spielsystem und einer universellen technischen Grundlage, die stetig erweitert werden kann.

## Abschließende Anweisung an jede zukünftige Entwicklungs-KI

Betrachte FFRogue nicht bloß als Sammlung von FFBE-Assets und auch nicht bloß als ein kleines Roguelike.

Das eigentliche Projekt besteht darin, eine gemeinsame technische und spielerische Welt zu schaffen, in der die unterschiedlichsten Final-Fantasy-Inhalte originalgetreu, nachvollziehbar und dauerhaft erweiterbar zusammenkommen.

Neue Features sollen dieser Vision dienen.

Die höchste Priorität haben ein überzeugendes Spielerlebnis, die Qualität der vorhandenen Inhalte und wiederverwendbare technische Lösungen.

Das Ziel ist nicht möglichst schnell möglichst viel Inhalt. Das Ziel ist ein Spiel, das sich wirklich nach Final Fantasy anfühlt – und dessen Qualität auch dann erhalten bleibt, wenn sein Umfang stark wächst.

## Präzisierungen 2026-11-07

Aus dem Gespräch mit dem Entwickler (Stand nach Abschluss des Debug-Pfad-Cleanups):

- **Skills: „schön fürs Auge“ vor Pixel-Treue.** Importierte Skills müssen nicht
  pixel-perfect sein, sondern visuell überzeugen. Ein Import darf nicht zu einer
  offenen Reverse-Engineering-Aufgabe werden; die bisherigen 15 Skills haben zu
  lange gedauert und brauchten wiederholt manuelle Annahmen. Das FFBE-Kampfsystem
  (Chains, Formeln) wird nicht nachgebaut, nur die Optik der Skills.
- **Ziel des Imports:** einen Charakter auswählen und mit allen Sprite-Stances,
  Angriffsmustern und Skill-Animationen importieren; dasselbe später für Gegner
  und Bosse, damit sich jeder Run anders anfühlt.
- **Entschieden: Importer statt Aufnahmen.** Jeder Charakter kann zum Run-Start
  oder als Belohnung jeden seiner 10–20 Skills erhalten, und der Roster soll
  FF I–XVI abdecken. Einzelaufnahmen aus dem Memorial-Client skalieren dafür
  nicht. Es bleibt beim datengetriebenen Importer mit Echtzeit-Darstellung
  (Abschnitt 3 und 5), aber mit gesenkter Messlatte: Ein Skill ist fertig, wenn
  er überzeugend aussieht, das Ziel trifft und der Einschlag sichtbar am Gegner
  sitzt. Exakte Pixel-, Positions- oder Timing-Treue ist kein Abnahmekriterium.
  Reverse Engineering wird zeitlich begrenzt; eine plausible, generische Lösung,
  die vielen Skills hilft, geht vor der exakten Rekonstruktion eines einzelnen.
  Herkunft wird weiterhin ehrlich gekennzeichnet (Abschnitt 3).
- **Kampf-UI hat jetzt Priorität:** Ziele sollen vor dem Befehl in der Arena
  anklickbar sein (heute: erst Befehl, dann Ziel mit gelbem Rahmen). Die UI darf
  gestalterisch frei neu entworfen werden, innerhalb der Richtung aus Abschnitt 6.
- **Referenzinstanz:** Eine FFBE-Memorial-Instanz („FFBE Trace“, BlueStacks)
  steht auf Anfrage als visuelle Referenz zur Verfügung.
- **Arbeitsweise:** Die Entwicklungs-KI arbeitet selbstständig in kleinen,
  geprüften Schritten (Code bereinigen, UI verbessern, Doku aktuell halten) und
  berichtet im Nachgang. Rückfragen nur bei echten Produktentscheidungen.


## Präzisierungen 2026-11-08 (Richtung nach dem ersten Playtest)

- **Vollständiger Charakter-Importer:** Ein Charakter wird ausgewählt und kommt komplett ins Spiel:
  Sprites und alle Posen, alle Skills mit Animationen und Original-Sounds, Limit Burst, Formen.
- **Vollständiger Stage-Importer:** Genauso für Stages: eine Stage wird ausgewählt und kommt mit
  ihren hinterlegten Animationen (z. B. Nebel im Mako-Reaktor) und ihrer Original-Musik
  (z. B. FFVII "Let the Battles Begin!") ins Spiel.
- **Gegner gehören zur Stage:** Der Stage-Import bringt die Gegner und Bosse der jeweiligen Welt mit
  (FFVII-Stage → FFVII-Gegner usw., aus den Originaldaten), inklusive ihrer Skills, Skill-Animationen
  und Sounds. Bosse der einzelnen Areale gehören dazu.
- **Inhaltlicher Rahmen:** Nur Stages (und Musik) mit Bezug zu den Mainline-Spielen Final Fantasy I–XVI
  sowie Final Fantasy Tactics.
- **Übergänge:** Der bisherige Codex-Übergang (Play → Spiel, Menü → Kampf) ist nur ein Platzhalter.
  Ziel ist ein immersiver, eigener Übergang; Musik-Wechsel weich.
- **Danach Run-Twists:** Systeme, die Runs frisch, fordernd und abwechslungsreich halten (auch Ideen
  aus anderen Roguelikes); Runs dürfen weder zu leicht noch langweilig sein.
- **Reihenfolge:** Polishing (Gegner-Treffer-Feedback, Aktions-Banner, einheitliche Weichzeichnung,
  Musik) → Charakter-Importer komplett → Stage-/Musik-Importer → Run-Twists.
