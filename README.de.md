# node-red-contrib-ta-cmi-coe

[🇬🇧 README English Version](README.md)

[![Platform][platform-shield]][platform-link] [![Release][release-shield]][release-link] [![Downloads][downloads-shield]][downloads-link] [![CommitDate][date-shield]][date-link] [![License][license-shield]][license-link] [![Languages][languages-shield]][languages-link]

Node-RED Bibliothek zum Lesen und Schreiben von Werten an Technische Alternative CMI über CAN over Ethernet (CoE).

## Funktionsumfang

- **CoE Input Node**: Empfang von analogen und digitalen Einzelwerten von der CMI
- **CoE Output Node**: Senden einzelner Werte an das CMI / Regler
- **CoE Monitor**: Empfängt und überwacht Pakete von allen Quellen
- Unterstützung für CoE-Version 1 & 2
- Automatische Konvertierung analoger Werte basierend auf Unit ID
- Unterstützung für von TA definierte Messgrößen
- Einstellung von Sendebedingung und -intervall

---

[![BuyMeCoffee][buymecoffee-shield]][buymecoffee-link]

---

## Installation

### Über Node-RED Palette Manager (empfohlen)

1. Öffne Node-RED
2. Menü → Manage palette → Install
3. Suche nach `node-red-contrib-ta-cmi-coe`
4. Installiere das Paket

### Manuelle Installation

```bash
cd ~/.node-red
npm install node-red-contrib-ta-cmi-coe
```

### Lokale Entwicklungsumgebung

```bash
cd ~/.node-red
git clone https://github.com/mayflo/node-red-contrib-ta-cmi-coe.git
cd node-red-contrib-ta-cmi-coe
npm link
cd ~/.node-red
npm link node-red-contrib-ta-cmi-coe
```

Starte Node-RED neu.

## Voraussetzungen

- CMI von Technische Alternative mit Firmware 1.39.1 oder höher
- Die verwendete CoE-Version wird auf dem CMI konfiguriert (Einstellungen > CAN > CoE).
- Für Empfang: CoE-Ausgänge müssen auf der CMI konfiguriert werden (Einstellungen > Ausgänge > CoE).
- Für Senden: CAN-Eingänge müssen auf dem Regler konfiguriert werden.
- Für den Empfang von Nachrichten benötigt die verwendeten CMIs eine fest eingestellte IP-Addresse
- Die Kommunikation erfolgt über UDP-Ports, welche auf dem Node-RED-Host geöffnet werden müssen (CoE V1 Port 5441 / CoE V2 Port 5442)

## Unterstützte Geräte

Die Bibliothek wurde für UVR610 entwickelt und getestet, funktioniert aber grundsätzlich mit allen Geräten, die über den CAN-Bus der CMI verbunden sind:

- UVR16x2
- UVR1611
- UVR61-3
- X2 Regler
- Andere CAN-Bus Geräte von Technische Alternative

## Schnellstart

### 1. CMI Konfigurations-Node erstellen

Erstelle zunächst eine CMI Konfiguration:
- Öffne einen beliebigen Node zur Bearbeitung
- Bei "CMI Konfig" auf Plus klicken → "Neuen Knoten hinzufügen..."
- **IP-Bereich**: IP-Adressbereich des UDP-Ports (0.0.0.0 = alle Interfaces, 127.0.0.1 = lokales Netzwerk)
- **CMI Adresse**: (Feste) IP-Adresse des CMI
- **CoE Version**: CoE V1/V2 (siehe CMI Einstellungen → CAN)

### 2. CMI konfigurieren

#### Für Empfang vom CMI (CoE Input):
Auf der CMI unter **Einstellungen → Ausgänge → CoE**:
- **Eingang**: CAN-Bus Eingang (z.B. CAN 1)
- **IP**: IP-Adresse von Node-RED
- **Knoten**: Knoten-Nummer des Input Nodes
- **Netzwerkausgang**: Nummer des Ausgangs (1-32 in CoE V1 / 1-64 in CoE V2)
- **Sendebedingungen**: Unterdrückung kleiner & häufiger Änderungen, Intervall für wiederholtes Senden (nach Bedarf)

#### Für Senden an CMI (CoE Output):
Auf dem Regler: CAN-Eingang konfigurieren
- **Knoten**: Wert aus "Node Number" des Output Nodes
- **Ausgangsnummer**: Nummer des Ausgangs (1-32 in CoE V1 / 1-64 in CoE V2)
- **Messgröße**: "Automatisch" für Unit von Node-RED

## Node Typen

### CoE Input Node

Empfängt Werte von der CMI.

**Output Message:**
```javascript
{
    payload: 22.5,                    // Der Wert
    topic: "coe/10/analog/1",         // Format: coe/{node}/{type}/{output}
    coe: {
        sourceIP: "192.168.1.100",    // IP der CMI
        nodeNumber: 10,               // CAN Knoten-Nummer
        dataType: "analog",           // Datentyp
        blockNumber: 1,               // CoE Block-Nummer (nur V1)
        outputNumber: 1,              // Netzwerkausgang
        state: 22.5,                  // Wert oder digitaler Zustand
        unit: 1,                      // Unit ID (z.B. 1 = °C)
        unitName: "Temperatur °C",    // Unit Name
        unitSymbol: "°C°",            // Unit Symbol
        timestamp: 2026-01-08T11:04   // Eingangszeit
    }
}
```

### CoE Output Node

Sendet einzelne Werte an die CMI.

**Input Message:**
```javascript
// Einfach:
msg.payload = 22.5;

// Mit eigener Unit:
msg.payload = 22.5;
msg.coe = { unit: 1 };  // Überschreibt Config
```

## Troubleshooting

### Keine Daten empfangen

1. **CMI CoE-Ausgänge prüfen**: Prüfe ob IP und Port korrekt sind
2. **Lokale IP**: Den max. Empfangsbereich mit Lokale IP = 0.0.0.0 (alle) probieren (insbesondere für Docker-Umgebungen)
3. **Firewall**: Prüfe ob in der Firewall Port 5441/UDP (CoE V1) bzw. 5442/UDP (CoE V2) geöffnet sind
4. **Node Number**: Prüfe ob mit CMI-Konfiguration übereinstimmend
5. **Debug aktivieren**: "Receive All" aktivieren und Debug-Output prüfen

### Senden funktioniert nicht

1. **CMI erreichbar?** Ping zur CMI IP
2. **CAN-Eingang auf Regler**: Prüfe ob Knoten-Nr und Ausgangsnr korrekt sind
3. **Timeout auf Regler?** "Sende Ausgänge alle" Intervall nutzen

### Mehrere CMIs

- Es müssen unterschiedliche Knoten-Nummern verwendet werden.

### Werte falsch

- **Zu große Werte**: CAN-Bus V1 ist limitiert auf ±32.767 (dimensionslos)
- **Falsche Unit**: Manche Einheiten (Arbeitszahl, Euro) haben Einschränkungen
- **Nachkommastellen**: Prüfe ob korrekte Einheiten-ID verwendet wird

## Bekannte Einschränkungen

1. **Max. Wertbereich**: CAN-Bus Version 1 ist limitiert auf ±32.767 (V2 für größeren Wertebereich benutzen)
2. **Keine Quittierung**: CoE hat keine Bestätigung (Fire-and-forget)
3. **Das CMI funktioniert als Gateway**: Werte werden zwar vom CMI über CoE übertragen, können aber nicht direkt an CMI gesendet werden. Die Werte werden vom CMI an den CAN-Bus weitergeleitet und von den Reglern ausgelesen.

## Erweiterte Nutzung

### Custom Unit Conversion

```javascript
// In Function Node vor Output:
const rawValue = msg.payload * 100;  // 2 Nachkommastellen
msg.payload = rawValue;
msg.coe = { unit: 0 };  // Dimensionslos
return msg;
```

## Lizenz

Veröffentlicht unter der [Apache 2.0 Lizenz](LICENSE)

- ✅ Private und gewerbliche Nutzung
- ⚠️ Keine Haftung für Schäden durch Nutzung

## Credits

Basiert auf dem Protokoll-Verständnis und der Dokumentation von:
- [SymconJoTTACoE](https://github.com/jotata/SymconJoTTACoE/) von jotata
- [Ta-CoE](https://gitlab.com/DeerMaximum/ta-coe) von DeerMaximum

## Support

- **Issues**: [GitHub Issue Tracker](https://github.com/mayflo/node-red-contrib-ta-cmi-coe/issues)
- **Dokumentation**: Siehe README

## Author

[![Author][author-shield]][author-link]

---

**Hinweis**: Diese Bibliothek wurde in der Freizeit entwickelt. Support erfolgt nach Verfügbarkeit. 😊

[platform-link]: https://nodered.org
[platform-shield]: https://img.shields.io/badge/platform-Node--RED-red?style=flat
[release-link]: https://www.npmjs.com/package/node-red-contrib-ta-cmi-coe
[release-shield]: https://img.shields.io/npm/v/node-red-contrib-ta-cmi-coe?style=flat
[date-link]: https://github.com/mayflo/node-red-contrib-ta-cmi-coe/releases
[date-shield]: https://img.shields.io/github/release-date/mayflo/node-red-contrib-ta-cmi-coe?style=flat
[downloads-link]: https://www.npmjs.com/package/node-red-contrib-ta-cmi-coe
[downloads-shield]: https://img.shields.io/npm/d18m/node-red-contrib-ta-cmi-coe?style=flat
[license-link]: https://github.com/mayflo/node-red-contrib-ta-cmi-coe/blob/main/LICENSE
[license-shield]: https://img.shields.io/badge/license-Apache%202.0-blue?style=flat?style=flat
[languages-link]: https://github.com/mayflo/node-red-contrib-ta-cmi-coe
[languages-shield]: https://img.shields.io/github/languages/count/mayflo/node-red-contrib-ta-cmi-coe?style=flat
[author-link]: https://github.com/mayflo
[author-shield]: https://img.shields.io/badge/author-mayflo-orange?style=flat&logo=github
[buymecoffee-link]: https://www.buymeacoffee.com/mayflo
[buymecoffee-shield]: https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png
