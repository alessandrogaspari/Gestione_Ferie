# Correzione Ruoli Database Supabase - AppFerie

## Problema Identificato

Il database Supabase nella tabella `users` ha un constraint sul campo `ruolo` che permette solo i valori `'admin'` e `'utente'`, ma l'applicazione AppFerie utilizza anche il ruolo `'SUPERUSER'`.

### Ruoli utilizzati nell'applicazione (dal file Excel DB_Ferie.xlsx):
- **`SUPERUSER`** - Super amministratore del sistema con accesso completo
- **`DS`** - Dirigente Scolastico con accesso amministrativo completo
- **`DSGA`** - Direttore dei Servizi Generali e Amministrativi
- **`ASSISTENTI AMMINISTRATIVI`** - Personale amministrativo di segreteria
- **`ASSISTENTI TECNICI`** - Personale tecnico di laboratorio
- **`COLLABORATORI SCOLASTICI`** - Personale ausiliario (bidelli, etc.)
- **`admin`** - Amministratore generico (per compatibilità)
- **`utente`** - Utenti standard con accesso limitato

### Constraint attuale nel database:
```sql
CHECK (ruolo IN ('admin', 'utente'))
```

### Constraint necessario:
```sql
CHECK (ruolo IN (
    'SUPERUSER', 'DS', 'DSGA', 
    'ASSISTENTI AMMINISTRATIVI', 'ASSISTENTI TECNICI', 
    'COLLABORATORI SCOLASTICI', 'admin', 'utente'
))
```

## Soluzione

Sono stati creati due file SQL per risolvere il problema:

### 1. `update_roles_supabase.sql`
**Scopo**: Aggiorna la struttura del database per supportare tutti i ruoli

**Cosa fa**:
- Rimuove il constraint esistente sui ruoli
- Aggiunge un nuovo constraint che include tutti i ruoli del file Excel
- Aggiorna tutte le policy di sicurezza (RLS) per tutti i ruoli
- Crea una vista per la gerarchia dei ruoli
- Aggiunge funzioni helper per verificare i privilegi
- Fornisce query di verifica complete

### 2. `update_specific_users_roles.sql`
**Scopo**: Aggiorna i ruoli degli utenti specifici

**Cosa fa**:
- Identifica e aggiorna tutti i ruoli specifici del file Excel
- Gestisce la mappatura automatica basata su pattern comuni
- Fornisce esempi per aggiornamenti manuali specifici
- Include backup automatico e procedure di rollback
- Verifica la correttezza dei ruoli assegnati

## Istruzioni per l'Esecuzione

### Passo 1: Backup del Database
```sql
-- Crea un backup della tabella users
CREATE TABLE users_backup AS SELECT * FROM users;
```

### Passo 2: Eseguire il primo script
```bash
# Esegui il file di aggiornamento struttura
psql -h [HOST] -U [USER] -d [DATABASE] -f update_roles_supabase.sql
```

### Passo 3: Personalizzare e eseguire il secondo script
1. Aprire `update_specific_users_roles.sql`
2. Modificare le query di aggiornamento secondo le esigenze specifiche
3. Eseguire il script:
```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f update_specific_users_roles.sql
```

### Passo 4: Verifica
```sql
-- Verifica i ruoli aggiornati
SELECT username, nome, ruolo FROM users ORDER BY ruolo DESC, username;

-- Verifica il constraint
SELECT conname, consrc FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND contype = 'c';
```

## Utenti che dovrebbero avere ruolo SUPERUSER

Basandosi sui ruoli del file Excel DB_Ferie.xlsx, gli utenti dovrebbero essere assegnati secondo la loro funzione:

1. **SUPERUSER** - Amministratori di sistema con accesso completo
2. **DS** - Dirigenti Scolastici
3. **DSGA** - Direttori dei Servizi Generali e Amministrativi
4. **ASSISTENTI AMMINISTRATIVI** - Personale di segreteria
5. **ASSISTENTI TECNICI** - Personale tecnico di laboratorio
6. **COLLABORATORI SCOLASTICI** - Personale ausiliario

### Esempi di aggiornamento per tutti i ruoli:
```sql
-- Aggiorna l'amministratore principale
UPDATE users SET ruolo = 'SUPERUSER' WHERE username = 'admin';

-- Aggiorna Dirigente Scolastico
UPDATE users SET ruolo = 'DS' 
WHERE nome ILIKE '%dirigente%' OR username ILIKE '%dirigente%';

-- Aggiorna DSGA
UPDATE users SET ruolo = 'DSGA' 
WHERE nome ILIKE '%dsga%' OR username ILIKE '%dsga%';

-- Aggiorna Assistenti Amministrativi
UPDATE users SET ruolo = 'ASSISTENTI AMMINISTRATIVI' 
WHERE nome ILIKE '%segreteria%' OR username ILIKE '%amministrativ%';

-- Aggiorna Assistenti Tecnici
UPDATE users SET ruolo = 'ASSISTENTI TECNICI' 
WHERE nome ILIKE '%tecnico%' OR username ILIKE '%laboratorio%';

-- Aggiorna Collaboratori Scolastici
UPDATE users SET ruolo = 'COLLABORATORI SCOLASTICI' 
WHERE nome ILIKE '%bidello%' OR username ILIKE '%collaborator%';
```

## Funzionalità per Ruolo

### SUPERUSER
- Accesso completo a tutte le funzioni amministrative
- Gestione utenti (creazione, modifica, eliminazione)
- Gestione richieste di tutti gli utenti
- Accesso ai report e statistiche complete
- Gestione festività e sospensioni

### admin
- Accesso alle funzioni amministrative standard
- Visualizzazione e gestione richieste
- Accesso ai report

### utente
- Accesso limitato alle proprie richieste
- Visualizzazione del proprio bilancio ferie
- Creazione nuove richieste

## Verifica Post-Aggiornamento

Dopo aver eseguito gli script, verificare:

1. **Constraint aggiornato**:
```sql
SELECT consrc FROM pg_constraint 
WHERE conrelid = 'users'::regclass AND conname = 'users_ruolo_check';
```

2. **Ruoli degli utenti**:
```sql
SELECT ruolo, COUNT(*) FROM users GROUP BY ruolo;
```

3. **Policy di sicurezza**:
```sql
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies WHERE tablename = 'users';
```

4. **Test dell'applicazione**:
   - Login con utente SUPERUSER
   - Verifica accesso alle funzioni amministrative
   - Test creazione/modifica utenti
   - Verifica policy di sicurezza

## Rollback (Se Necessario)

In caso di problemi, utilizzare questi comandi per il rollback:

```sql
-- Ripristina la tabella dal backup
DROP TABLE users;
CREATE TABLE users AS SELECT * FROM users_backup;

-- Oppure riporta tutti i SUPERUSER ad admin
UPDATE users SET ruolo = 'admin' WHERE ruolo = 'SUPERUSER';

-- Ripristina il constraint originale
ALTER TABLE users DROP CONSTRAINT users_ruolo_check;
ALTER TABLE users ADD CONSTRAINT users_ruolo_check 
    CHECK (ruolo IN ('admin', 'utente'));
```

## Note Importanti

1. **Backup**: Sempre creare un backup prima di modificare la struttura del database
2. **Test**: Testare in ambiente di sviluppo prima della produzione
3. **Policy**: Le policy RLS sono state aggiornate per includere SUPERUSER
4. **Applicazione**: Verificare che l'applicazione riconosca correttamente tutti i ruoli
5. **Sicurezza**: I ruoli SUPERUSER hanno accesso completo, assegnare con cautela

## Contatti

Per problemi o domande relative a questa migrazione, contattare l'amministratore del sistema.