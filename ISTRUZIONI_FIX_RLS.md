# Istruzioni per Risolvere l'Errore 400 Bad Request

## Problema
L'applicazione sta ricevendo errori `400 Bad Request` quando tenta di accedere alle tabelle Supabase perché le Row Level Security (RLS) policies richiedono un utente autenticato tramite `auth.uid()`, ma l'applicazione usa un sistema di autenticazione personalizzato basato su `sessionStorage`.

## Soluzione
Eseguire lo script SQL `fix_ferie_balance_rls.sql` nel database Supabase per disabilitare temporaneamente le policy RLS restrittive.

## Passi da Seguire

### 1. Accedere al Dashboard Supabase
1. Vai su [https://supabase.com](https://supabase.com)
2. Accedi al tuo account
3. Seleziona il progetto dell'applicazione ferie

### 2. Aprire l'Editor SQL
1. Nel menu laterale, clicca su **SQL Editor**
2. Clicca su **New Query** per creare una nuova query

### 3. Eseguire lo Script
1. Copia tutto il contenuto del file `fix_ferie_balance_rls.sql`
2. Incolla il contenuto nell'editor SQL
3. Clicca su **Run** per eseguire lo script

### 4. Verificare l'Esecuzione
Lo script dovrebbe eseguirsi senza errori. Se ci sono errori, potrebbero essere dovuti a policy già rimosse (questo è normale).

### 5. Testare l'Applicazione
1. Ricarica la pagina `adm_dashboard.html`
2. Verifica che i dati vengano caricati correttamente
3. L'errore `400 Bad Request` dovrebbe essere risolto

## Cosa Fa lo Script

Lo script:
1. **Disabilita temporaneamente** le RLS per le tabelle `ferie_balance`, `richieste` e `sospensioni`
2. **Rimuove tutte le policy esistenti** che usano `auth.uid()`
3. **Crea nuove policy semplificate** che permettono l'accesso sia agli utenti anonimi che autenticati
4. **Riabilita le RLS** con le nuove policy permissive

## Note Importanti

⚠️ **Sicurezza**: Queste policy sono temporanee e molto permissive. In un ambiente di produzione, dovresti implementare un sistema di autenticazione più robusto.

✅ **Funzionalità**: Dopo l'applicazione dello script, l'applicazione dovrebbe funzionare correttamente senza errori di autenticazione.

🔄 **Future Implementazioni**: Quando implementerai un sistema di autenticazione più sicuro, dovrai aggiornare queste policy per essere più restrittive.

## Risoluzione Problemi

### Se l'errore persiste:
1. Verifica che lo script sia stato eseguito completamente
2. Controlla la console del browser per altri errori
3. Verifica che l'URL e la chiave API di Supabase siano corretti in `supabase-client.js`

### Se ci sono errori nell'esecuzione dello script:
- Gli errori tipo "policy does not exist" sono normali e possono essere ignorati
- Se ci sono errori di sintassi, verifica di aver copiato tutto il contenuto del file