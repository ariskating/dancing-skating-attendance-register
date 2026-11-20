# Registro presenze per Google Apps Script

Modello riutilizzabile per gestire l’appello di gruppi sportivi con una Web App di Google Apps Script e un Google Sheet creato automaticamente al primo salvataggio.

Il progetto nasce dallo studio di una soluzione esistente e ne conserva i principi utili: una sola fonte per i gruppi, convalida dei dati, aggiornamento idempotente delle presenze e lock per evitare scritture concorrenti. Non contiene nomi, presenze o altri dati reali.

## Funzioni

- Selezione di data, gruppo e allenatore
- Stati `P` (presente), `A` (assente) e `R` (pioggia/annullato)
- Lettura e aggiornamento della stessa riga per atleta, data e gruppo
- Lock di Google Apps Script durante il salvataggio
- Foglio Google creato solo al primo utilizzo

## Personalizzazione

Modifica soltanto la costante `GROUPS` in `Code.gs`: ogni gruppo specifica etichetta, giorno, allenatori e atleti. I dati inclusi sono di esempio e vanno sostituiti prima dell’uso.

## Pubblicazione come Web App

1. Crea un progetto Apps Script e aggiungi `Code.gs`, `Pagina.html` e `appsscript.json`.
2. In Apps Script, scegli **Distribuisci → Nuova distribuzione → App web**.
3. Scegli gli utenti autorizzati e distribuisci.
4. Conserva con cura l’accesso al foglio creato: contiene dati personali e non deve essere reso pubblico.

## Verifica locale

```sh
npm run check
```

Il controllo statico verifica che le API della pagina e del backend siano allineate e che non siano stati inseriti dati di atlete del progetto di origine.

## Privacy

Un registro presenze può contenere dati personali, anche di minori. Mantieni privati sia il foglio sia il deployment dell’App Script; non inserire dati reali nel repository pubblico.
