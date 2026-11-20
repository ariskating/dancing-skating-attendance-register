# Registro presenze Vue

Interfaccia Vue 3 leggera per l’appello di gruppi sportivi. È pensata per essere pubblicata come sito statico su Vercel e usa soltanto dati fittizi.

## Cosa offre

- Vue 3 in build di produzione, senza toolchain o dipendenze di build
- Calendario, gruppo, allenatore e stati `P`, `A`, `R`
- Comandi per segnare tutto presente, azzerare e scaricare un CSV
- Salvataggio solo nella sessione del browser: nessun dato viene inviato dal sito pubblico
- Interfaccia responsive, tastiera accessibile e messaggi di stato annunciati
- Header di sicurezza e pagina esclusa dall’indicizzazione

## Privacy e integrazione dati

Il deploy Vercel non contiene nomi reali, né chiavi, né un database. L’app conserva l’appello soltanto con `sessionStorage`: chiudendo la sessione del browser, i dati locali vengono rimossi.

`Code.gs` conserva il modello backend Google Apps Script separato, con convalida e lock concorrente. Prima di usare dati personali occorre collegare un backend autenticato e privato (per esempio un servizio API con controllo degli accessi) e non inserirli mai nella repository o nel bundle del browser.

## Sviluppo e verifica

Non serve una build: Vercel serve direttamente `index.html` e `assets/`.

```sh
node tests/static-check.mjs
```

## Deploy

Il progetto è configurato con `vercel.json`. Dopo avere collegato il repository al progetto Vercel, ogni push su `main` può generare un nuovo deploy.
