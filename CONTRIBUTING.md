# Linee Guida per i Contributi

Grazie per il tuo interesse a contribuire a Voice Notes Transcriber! Questo documento fornisce le linee guida per contribuire al progetto.

## Come Contribuire

### 1. Fork e Clone

1. Fai un fork del repository
2. Clona il tuo fork:
```bash
git clone https://github.com/giacomoverdi/voice-notes-transcriber.git
cd voice-notes-transcriber
```

### 2. Setup Sviluppo

1. Installa le dipendenze:
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

2. Configura l'ambiente:
```bash
cp .env.example .env
# Modifica .env con le tue configurazioni
```

### 3. Branch e Sviluppo

1. Crea un nuovo branch:
```bash
git checkout -b feature/nome-feature
```

2. Sviluppa la tua feature seguendo le linee guida di codice

### 4. Test

1. Esegui i test:
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

2. Assicurati che tutti i test passino

### 5. Commit

1. Fai commit delle tue modifiche:
```bash
git commit -m "feat: descrizione della feature"
```

2. Pusha al tuo fork:
```bash
git push origin feature/nome-feature
```

### 6. Pull Request

1. Crea una Pull Request dal tuo fork al repository principale
2. Descrivi le modifiche e i test effettuati
3. Attendi la review

## Linee Guida di Codice

### Stile del Codice

- Usa ESLint e Prettier per il frontend
- Segui le convenzioni di stile di Node.js per il backend
- Mantieni il codice DRY (Don't Repeat Yourself)
- Scrivi commenti chiari e documentazione

### Commit Messages

Usa il formato:
```
tipo: descrizione breve

- tipo: feat, fix, docs, style, refactor, test, chore
- descrizione: imperativo, presente, prima lettera minuscola
```

Esempi:
- `feat: aggiunge supporto per trascrizione multilingua`
- `fix: risolve problema di autenticazione`
- `docs: aggiorna README con nuove istruzioni`

### Testing

- Scrivi test unitari per nuove funzionalità
- Mantieni la copertura dei test sopra l'80%
- Includi test per casi d'uso comuni e edge cases

### Documentazione

- Aggiorna la documentazione quando necessario
- Documenta le API con JSDoc
- Aggiorna il README per nuove funzionalità

## Processo di Review

1. Ogni PR richiede almeno una review
2. I test devono passare
3. Il codice deve seguire le linee guida
4. La documentazione deve essere aggiornata

## Supporto

Per domande o chiarimenti:
- Apri una issue
- Contatta g.verdi@jugaad.digital
- Visita [@giacomoverdi](https://github.com/giacomoverdi)

## Licenza

Contribuendo, accetti che il tuo codice sarà distribuito sotto la licenza MIT. 