# Guida Completa: Setup Supabase e Migrazione

## Passo 1: Creare Account e Progetto Supabase

### 1.1 Registrazione
1. Vai su [https://supabase.com](https://supabase.com)
2. Clicca su "Start your project"
3. Registrati con GitHub, Google o email
4. Verifica la tua email se richiesto

### 1.2 Creare un Nuovo Progetto
1. Nel dashboard, clicca "New Project"
2. Compila i campi:
   - **Name**: `app-ferie` (o nome a tua scelta)
   - **Database Password**: Scegli una password sicura e **ANNOTALA**
   - **Region**: Scegli la regione più vicina (es. "Europe West (Ireland)")
   - **Pricing Plan**: Seleziona "Free" (0$/mese)
3. Clicca "Create new project"
4. Attendi 2-3 minuti per la creazione del progetto

### 1.3 Ottenere le Credenziali
Una volta creato il progetto:
1. Vai nella sezione **Settings** → **API**
2. Annota questi valori:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ⚠️ **MANTIENI SEGRETO**

## Passo 2: Configurare il Database

### 2.1 Accedere all'Editor SQL
1. Nel dashboard Supabase, vai su **SQL Editor**
2. Clicca "New query"

### 2.2 Eseguire lo Script di Setup
1. Apri il file `supabase_setup.sql` che abbiamo creato
2. Copia tutto il contenuto
3. Incollalo nell'editor SQL di Supabase
4. Clicca "Run" per eseguire lo script
5. Verifica che non ci siano errori (dovrebbe mostrare "Success")

### 2.3 Verificare le Tabelle Create
1. Vai su **Table Editor**
2. Dovresti vedere le tabelle:
   - `users`
   - `ferie_balance`
   - `richieste`
   - `sospensioni`

## Passo 3: Preparare la Migrazione

### 3.1 Installare le Dipendenze
Apri il terminale nella cartella del progetto ed esegui:
```bash
npm install @supabase/supabase-js
```

### 3.2 Configurare lo Script di Migrazione
1. Apri il file `migrate_data_to_supabase.js`
2. Sostituisci le variabili di configurazione:
   ```javascript
   const SUPABASE_URL = 'https://xxxxx.supabase.co'; // Il tuo Project URL
   const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIs...'; // Il tuo service_role key
   ```

## Passo 4: Eseguire la Migrazione

### 4.1 Backup del File Excel
**IMPORTANTE**: Prima di procedere, fai una copia di backup del file `DB_Ferie.xlsx`

### 4.2 Eseguire lo Script
Nel terminale, esegui:
```bash
node migrate_data_to_supabase.js
```

### 4.3 Verificare la Migrazione
Lo script mostrerà il progresso:
```
🚀 INIZIO MIGRAZIONE DATI DA EXCEL A SUPABASE
===============================================
✓ Connessione a Supabase verificata

=== MIGRAZIONE UTENTI ===
✓ Utente admin migrato con ID: 12345...
✓ Utente mario.rossi migrato con ID: 67890...
Migrati 2/2 utenti

=== MIGRAZIONE BILANCI FERIE ===
✓ Bilancio ferie per admin migrato
✓ Bilancio ferie per mario.rossi migrato
Migrati 2/2 bilanci ferie

=== MIGRAZIONE RICHIESTE ===
✓ Richiesta 1 per mario.rossi migrata
Migrate 1/1 richieste

=== MIGRAZIONE SOSPENSIONI ===
✓ Sospensione 2024-01-01 - Capodanno migrata
Migrate 10/10 sospensioni

🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!
```

## Passo 5: Verificare i Dati

### 5.1 Nel Dashboard Supabase
1. Vai su **Table Editor**
2. Clicca su ogni tabella per vedere i dati migrati:
   - **users**: Verifica che tutti gli utenti siano presenti
   - **ferie_balance**: Controlla i bilanci ferie
   - **richieste**: Verifica le richieste migrate
   - **sospensioni**: Controlla le festività

### 5.2 Testare le Query
Nell'**SQL Editor**, prova queste query:

```sql
-- Vedere tutti gli utenti
SELECT * FROM user_summary;

-- Vedere tutte le richieste con dettagli
SELECT * FROM richieste_dettagliate;

-- Contare i record per tabella
SELECT 'users' as tabella, COUNT(*) as record FROM users
UNION ALL
SELECT 'ferie_balance', COUNT(*) FROM ferie_balance
UNION ALL
SELECT 'richieste', COUNT(*) FROM richieste
UNION ALL
SELECT 'sospensioni', COUNT(*) FROM sospensioni;
```

## Passo 6: Configurare l'Autenticazione (Opzionale)

### 6.1 Disabilitare l'Autenticazione Email (per ora)
Poiché stiamo migrando da un sistema con password in chiaro:
1. Vai su **Authentication** → **Settings**
2. Disabilita "Enable email confirmations"
3. Disabilita "Enable email change confirmations"

### 6.2 Testare il Login
Puoi testare il login con le credenziali migrate usando l'API Supabase.

## Passo 7: Aggiornare il Codice dell'Applicazione

### 7.1 Installare il Client Supabase
```bash
npm install @supabase/supabase-js
```

### 7.2 Creare il File di Configurazione
Crea `supabase-client.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xxxxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIs...' // anon public key

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## Risoluzione Problemi Comuni

### Errore: "relation does not exist"
- Verifica di aver eseguito correttamente lo script `supabase_setup.sql`
- Controlla che tutte le tabelle siano state create nel **Table Editor**

### Errore: "Invalid API key"
- Verifica di aver copiato correttamente il `service_role key`
- Assicurati di non aver copiato spazi extra

### Errore: "Cannot connect to Supabase"
- Verifica la connessione internet
- Controlla che l'URL del progetto sia corretto
- Verifica che il progetto sia attivo nel dashboard

### Dati non migrati correttamente
- Controlla il formato delle date nel file Excel
- Verifica che i nomi delle colonne corrispondano
- Controlla i log dello script per errori specifici

## Limiti del Piano Gratuito

- **Database**: 500 MB
- **Bandwidth**: 5 GB/mese
- **Storage**: 1 GB
- **Monthly Active Users**: 50.000
- **Requests**: Illimitate

Per la maggior parte delle applicazioni aziendali piccole/medie, questi limiti sono più che sufficienti.

## Prossimi Passi

1. ✅ **Setup Supabase completato**
2. ✅ **Migrazione dati completata**
3. ⏳ **Aggiornare il codice dell'app per usare Supabase**
4. ⏳ **Testare tutte le funzionalità**
5. ⏳ **Deploy in produzione**

## Supporto

Se incontri problemi:
1. Controlla la [documentazione Supabase](https://supabase.com/docs)
2. Verifica i log nel dashboard Supabase
3. Controlla la console del browser per errori JavaScript

---

**Nota**: Mantieni sempre un backup del file Excel originale fino a quando non sei sicuro che tutto funzioni correttamente con Supabase.