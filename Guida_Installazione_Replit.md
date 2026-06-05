# Guida all'Installazione della WebApp "Gestione Ferie ATA" su Replit

## Panoramica
Questa guida fornisce istruzioni dettagliate per installare e configurare l'applicazione web "Gestione Ferie ATA" sulla piattaforma Replit utilizzando il piano gratuito.

## Prerequisiti
- Account Replit (gratuito)
- File del progetto "AppFerie" scaricati localmente
- Browser web moderno

## Caratteristiche del Progetto
- **Tecnologie**: Node.js, Express.js, HTML, CSS, JavaScript
- **Database**: File Excel (DB_Ferie.xlsx)
- **Compatibilità**: Completamente compatibile con Replit
- **Persistenza**: I file Excel persistono automaticamente su Replit

---

## Passaggio 1: Creazione del Progetto su Replit

### 1.1 Accesso a Replit
1. Vai su [replit.com](https://replit.com)
2. Accedi al tuo account o registrati gratuitamente
3. Clicca su **"Create Repl"** o **"+ Create"**

### 1.2 Configurazione Iniziale
1. Seleziona **"Import from GitHub"** o **"Upload files"**
2. Se scegli "Upload files":
   - Seleziona tutti i file della cartella AppFerie
   - Assicurati di includere:
     - `server.js`
     - `package.json`
     - `DB_Ferie.xlsx`
     - Cartelle `js/`, `css/`, `img/`
     - File HTML (index.html, dashboard.html, ecc.)
3. Nomina il progetto: **"gestione-ferie-ata"**
4. Seleziona **"Node.js"** come template

---

## Passaggio 2: Configurazione dei File

### 2.1 Modifica di server.js
Il file `server.js` deve essere aggiornato per utilizzare la porta dinamica di Replit:

```javascript
// Sostituire questa riga:
// const PORT = 8081;

// Con questa:
const PORT = process.env.PORT || 8081;

// Alla fine del file, sostituire:
// app.listen(PORT, () => {
//     console.log(`Server in esecuzione su http://localhost:${PORT}`);
// });

// Con:
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server in esecuzione su porta ${PORT}`);
});
```

### 2.2 Creazione del file .replit
Crea un nuovo file chiamato `.replit` nella root del progetto:

```toml
run = "npm start"
entrypoint = "server.js"

[nix]
channel = "stable-22_11"

[deployment]
run = ["sh", "-c", "npm start"]
```

### 2.3 Verifica package.json
Assicurati che il file `package.json` contenga:

```json
{
  "name": "appferie",
  "version": "1.0.0",
  "description": "Applicazione per la gestione delle ferie del personale ATA",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "xlsx": "^0.18.5"
  }
}
```

---

## Passaggio 3: Installazione e Avvio

### 3.1 Installazione delle Dipendenze
1. Apri la **Console** in Replit
2. Esegui il comando:
   ```bash
   npm install
   ```
3. Attendi il completamento dell'installazione

### 3.2 Avvio dell'Applicazione
1. Clicca sul pulsante **"Run"** verde
2. Oppure esegui nella console:
   ```bash
   npm start
   ```
3. L'applicazione si avvierà automaticamente

### 3.3 Accesso all'Applicazione
1. Replit mostrerà automaticamente l'URL dell'applicazione
2. L'URL sarà simile a: `https://gestione-ferie-ata.username.repl.co`
3. Clicca sull'URL per aprire l'applicazione

---

## Passaggio 4: Configurazioni Opzionali

### 4.1 Variabili d'Ambiente (Opzionale)
Per maggiore sicurezza, puoi configurare variabili d'ambiente:

1. Vai alla sezione **"Secrets"** in Replit
2. Aggiungi le seguenti variabili:
   - `NODE_ENV`: `production`
   - `DB_PATH`: `DB_Ferie.xlsx`

### 4.2 Configurazione del Dominio Personalizzato
Su Replit gratuito:
- L'URL sarà: `https://nome-progetto.username.repl.co`
- Per domini personalizzati è necessario un piano a pagamento

---

## Passaggio 5: Test e Verifica

### 5.1 Test delle Funzionalità
1. **Login**: Testa l'accesso con credenziali esistenti
2. **Dashboard**: Verifica la visualizzazione dei dati
3. **Richieste**: Prova a creare una nuova richiesta di ferie
4. **Amministrazione**: Testa le funzioni amministrative

### 5.2 Verifica della Persistenza
1. Crea una richiesta di test
2. Riavvia l'applicazione
3. Verifica che i dati siano ancora presenti

---

## Gestione e Manutenzione

### Backup Automatico
- Replit effettua automaticamente snapshot del filesystem
- I file Excel sono persistenti e sicuri
- Non è necessaria configurazione aggiuntiva

### Monitoraggio
- Usa la console di Replit per monitorare i log
- L'applicazione si riavvia automaticamente in caso di errori

### Aggiornamenti
1. Modifica i file direttamente nell'editor di Replit
2. L'applicazione si riavvia automaticamente
3. Per aggiornamenti maggiori, carica i nuovi file

---

## Risoluzione Problemi

### Problema: L'applicazione non si avvia
**Soluzione**:
1. Verifica che `package.json` sia corretto
2. Controlla che tutte le dipendenze siano installate
3. Esegui `npm install` nella console

### Problema: Errore di porta
**Soluzione**:
1. Assicurati che `server.js` usi `process.env.PORT`
2. Verifica che il server ascolti su `0.0.0.0`

### Problema: File Excel non trovato
**Soluzione**:
1. Verifica che `DB_Ferie.xlsx` sia nella root del progetto
2. Controlla i permessi del file
3. Ricarica il file se necessario

### Problema: Errori di CORS
**Soluzione**:
1. Verifica che il middleware CORS sia configurato
2. Controlla che l'URL di Replit sia corretto

---

## Limitazioni del Piano Gratuito

### Risorse
- **RAM**: Limitata, ma sufficiente per l'applicazione
- **CPU**: Condivisa, prestazioni moderate
- **Storage**: 2 GiB per progetto (più che sufficiente)

### Disponibilità
- L'applicazione può "dormire" dopo inattività
- Si riattiva automaticamente al primo accesso
- Tempo di riattivazione: 10-30 secondi

### Traffico
- Nessun limite specifico sul piano gratuito
- Adatto per uso interno/aziendale

---

## Ottimizzazioni Consigliate

### Per Prestazioni
1. **Compressione**: Abilita la compressione gzip
2. **Cache**: Implementa cache per file statici
3. **Logging**: Riduci il logging in produzione

### Per Sicurezza
1. **HTTPS**: Automaticamente fornito da Replit
2. **Variabili d'ambiente**: Usa secrets per configurazioni sensibili
3. **Rate limiting**: Implementa limitazione delle richieste

---

## Conclusioni

L'applicazione "Gestione Ferie ATA" è completamente compatibile con Replit e può essere installata facilmente seguendo questa guida. Il piano gratuito offre risorse sufficienti per un uso aziendale interno con un numero moderato di utenti.

### Vantaggi di Replit
- ✅ Installazione semplice e veloce
- ✅ Persistenza automatica dei dati
- ✅ HTTPS incluso
- ✅ Backup automatici
- ✅ Nessuna configurazione server necessaria

### Prossimi Passi
1. Segui la guida passo-passo
2. Testa tutte le funzionalità
3. Configura gli utenti iniziali
4. Forma il personale sull'uso dell'applicazione

---

**Supporto**: Per assistenza tecnica, consulta la documentazione di Replit o contatta il supporto tecnico.

**Versione Guida**: 1.0 - Gennaio 2025
**Compatibilità**: Replit Free Plan, Node.js 18+