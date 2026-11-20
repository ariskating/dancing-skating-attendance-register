# Registro presenze Vue

Interfaccia Vue 3 leggera per l’appello di gruppi sportivi. È pensata per essere pubblicata come sito statico su Vercel e usa soltanto dati fittizi.

## Cosa offre

- Vue 3 in build di produzione, senza toolchain o dipendenze di build
- Calendario, gruppo, allenatore e stati `P`, `A`, `R`
- Comandi per segnare tutto presente, azzerare e scaricare un CSV
- Salvataggio server-side in una private Vercel Blob Store europea (`fra1`)
- Interfaccia responsive, tastiera accessibile e messaggi di stato annunciati
- Header di sicurezza e pagina esclusa dall’indicizzazione

## Privacy e integrazione dati

Il deploy Vercel non contiene nomi reali, chiavi o presenze. I record sono scritti soltanto da `/api/attendance` in una **private** Vercel Blob Store: non hanno URL pubblici e sono accessibili unicamente attraverso le funzioni del progetto protette da Vercel Authentication. Il token Blob resta nei segreti dell’ambiente Vercel, mai nel browser né nel repository.

Ogni scrittura convalida data, gruppo, allenatore e stati; usa l’ETag Blob per il controllo ottimistico di concorrenza e salva un evento di audit privato. Se due persone aggiornano lo stesso appello, la seconda riceve un conflitto e l’interfaccia ricarica la versione corrente invece di sovrascriverla.

## Sviluppo e verifica

Non serve una build: Vercel serve direttamente `index.html` e `assets/`.

```sh
node tests/static-check.mjs
```

## Deploy

Il progetto è configurato con `vercel.json`. Dopo avere collegato il repository al progetto Vercel, ogni push su `main` può generare un nuovo deploy.
