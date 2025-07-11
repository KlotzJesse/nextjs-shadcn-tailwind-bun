# PLZ-Import Feature

## Übersicht

Die neue PLZ-Import-Funktion ermöglicht es Benutzern, PLZ-Regionen in verschiedenen Formaten zu importieren und basierend auf der aktuellen Granularität intelligent zu verarbeiten.

## Funktionen

### 1. Mehrere Eingabeformate
- **CSV/TXT-Dateien**: Drag & Drop oder Dateiauswahl
- **Direkteingabe**: Text einfügen oder tippen
- **Verschiedene Trennzeichen**: Komma, Semikolon, Leerzeichen, neue Zeile

### 2. Intelligente Granularitätserkennung
- **Vollständige PLZ** (86899): Exakte Übereinstimmung
- **Teilweise PLZ** (8, 9): Alle PLZ die mit diesen Ziffern beginnen
- **Mit Ländercode** (D-86899, D-8): Automatische Bereinigung

### 3. Format-Beispiele

#### Direkte Eingabe
```
86899, 86932
D-86899, D-86932
8, 9
86
```

#### CSV-Format
```csv
PLZ
86899
86932
D-87435
```

#### Komma-getrennt
```
86899,86932,87435,88234
```

### 4. Granularitäts-Logik

| Eingabe | 5-stellige Granularität | 2-stellige Granularität | 1-stellige Granularität |
|---------|------------------------|-------------------------|-------------------------|
| `8` | Alle PLZ 80000-89999 | PLZ-Region 80-89 | PLZ-Region 8 |
| `86` | Alle PLZ 86000-86999 | PLZ-Region 86 | PLZ-Region 8 |
| `86899` | PLZ 86899 | PLZ-Region 86 | PLZ-Region 8 |

### 5. Benutzerfreundliche Features
- **Live-Vorschau**: Zeigt gefundene Übereinstimmungen in Echtzeit
- **Validierung**: Kennzeichnet ungültige PLZ-Eingaben
- **Statistiken**: Anzahl gültiger/ungültiger Codes und Übereinstimmungen
- **Fehlerbehandlung**: Klare Fehlermeldungen bei Problemen

## Technische Implementation

### Komponenten
- `PostalCodeImportDialog`: Haupt-Dialog-Komponente
- `useFileImport`: Hook für Datei-Upload und -verarbeitung
- `usePostalCodeBulkImport`: Hook für Bulk-Import-Logik
- `postal-code-parser.ts`: Utility-Funktionen für Parsing und Validierung

### Parser-Funktionen
- `parsePostalCodeInput()`: Parst verschiedene Eingabeformate
- `normalizePostalCode()`: Normalisiert PLZ (entfernt D- Präfix etc.)
- `findPostalCodeMatches()`: Findet Übereinstimmungen basierend auf Granularität
- `isValidGermanPostalCode()`: Validiert deutsche PLZ-Formate

### Integration
- Verwendet bestehende `useMapState()` für Zustandsverwaltung
- Integriert sich nahtlos in die bestehende PLZ-Auswahl-UI
- Unterstützt alle verfügbaren Granularitätsstufen

## Verwendung

1. **Import-Button klicken**: Öffnet den Import-Dialog
2. **Daten eingeben**:
   - Dateien per Drag & Drop oder Auswahl hochladen
   - Oder Text direkt eingeben/einfügen
3. **Vorschau prüfen**: Überprüfen der gefundenen Übereinstimmungen
4. **Importieren**: Bestätigen und PLZ zur Auswahl hinzufügen

## Unterstützte Dateiformate
- `.csv` - Comma-separated values
- `.txt` - Plain text
- Geplant: `.xlsx`, `.xls` (Excel-Dateien)

## Error Handling
- Ungültige PLZ werden markiert aber ignoriert
- Datei-Upload-Fehler werden benutzerfreundlich angezeigt
- Network-Fehler werden abgefangen und gemeldet
- Leere Eingaben werden validiert

## Performance
- Große Datei-Uploads werden im Hintergrund verarbeitet
- Live-Suche ist gedrosselt um Performance zu optimieren
- Duplikate werden automatisch entfernt
- Memory-effiziente Verarbeitung von großen Datensätzen
