# Risoluzione Errore Accesso Dashboard Amministrativa

## Problema Identificato

L'errore `400 Bad Request` e l'impossibilità di accedere alla dashboard amministrativa sono causati da:

1. **Utente non autenticato**: Non c'è nessun utente loggato nel sistema
2. **Controllo ruoli**: Solo utenti con ruoli amministrativi possono accedere alle pagine `adm_*.html`

## Ruoli Amministrativi Validi

Possono accedere alla dashboard amministrativa solo utenti con questi ruoli:
- `SUPERUSER`
- `DS` (Dirigente Scolastico)
- `DSGA` (Direttore Servizi Generali Amministrativi)
- `admin`

## Passi per Risolvere

### 1. Effettuare il Login
1. Andare alla pagina di login: `http://localhost:8000/index.html`
2. Inserire le credenziali di un utente con ruolo amministrativo
3. Il sistema reindirizzerà automaticamente alla dashboard corretta

### 2. Verificare il Ruolo Utente
Se non si è sicuri del proprio ruolo:
1. Aprire `http://localhost:8000/test_auth.html`
2. Verificare lo stato dell'autenticazione e il ruolo
3. Se necessario, contattare l'amministratore per modificare il ruolo

### 3. Test di Funzionalità
Dopo il login:
1. Verificare l'accesso a `http://localhost:8000/adm_dashboard.html`
2. Controllare che non ci siano più errori 400
3. Testare le funzionalità di esportazione Excel

## Problemi Aggiuntivi Risolti

### Policy RLS Supabase
Se persistono errori 400 relativi a Supabase, applicare lo script SQL:
1. Aprire il dashboard Supabase
2. Andare in "SQL Editor"
3. Eseguire il contenuto del file `fix_ferie_balance_rls.sql`
4. Questo risolverà i problemi di accesso ai dati

### Funzione Excel
La funzione di esportazione Excel è stata riparata:
- Aggiunta libreria SheetJS
- Corretti gli import/export delle funzioni
- Ripristinata la funzionalità `generaExcelFerie`

## File di Test Disponibili

- `test_auth.html`: Test completo dell'autenticazione e ruoli
- `debug_user.html`: Debug dettagliato dei dati utente
- `fix_ferie_balance_rls.sql`: Script per risolvere problemi RLS

## Contatti

Se il problema persiste dopo aver seguito questi passi:
1. Verificare che l'utente esista nel database con ruolo corretto
2. Controllare la configurazione Supabase
3. Verificare che tutte le tabelle siano accessibili

---

**Nota**: Il controllo dei ruoli funziona correttamente. Il problema principale è l'assenza di autenticazione.