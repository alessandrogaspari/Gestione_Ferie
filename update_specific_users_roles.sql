-- =====================================================
-- SCRIPT DI AGGIORNAMENTO RUOLI SPECIFICI UTENTI
-- =====================================================
-- Questo script aggiorna i ruoli degli utenti specifici
-- basandosi sui ruoli originali del file Excel DB_Ferie.xlsx
-- con i ruoli: SUPERUSER, DS, DSGA, ASSISTENTI AMMINISTRATIVI,
-- ASSISTENTI TECNICI, COLLABORATORI SCOLASTICI

-- =====================================================
-- IMPORTANTE: ESEGUIRE PRIMA update_roles_supabase.sql
-- =====================================================
-- Prima di eseguire questo script, assicurarsi di aver
-- eseguito il file update_roles_supabase.sql per aggiornare
-- i constraint e le policy della tabella users

-- =====================================================
-- 1. BACKUP E VERIFICA STATO ATTUALE
-- =====================================================

-- Crea backup della tabella users
CREATE TABLE IF NOT EXISTS users_backup_ruoli AS 
SELECT * FROM users;

-- Mostra lo stato attuale dei ruoli
SELECT 
    'STATO ATTUALE' as fase,
    ruolo,
    COUNT(*) as numero_utenti
FROM users 
GROUP BY ruolo 
ORDER BY ruolo;

-- =====================================================
-- 2. MAPPATURA RUOLI DAL FILE EXCEL
-- =====================================================

-- Basandosi sui ruoli presenti nel file Excel DB_Ferie.xlsx:
-- - SUPERUSER: Super amministratore del sistema
-- - DS: Dirigente Scolastico
-- - DSGA: Direttore dei Servizi Generali e Amministrativi
-- - ASSISTENTI AMMINISTRATIVI: Personale amministrativo
-- - ASSISTENTI TECNICI: Personale tecnico di laboratorio
-- - COLLABORATORI SCOLASTICI: Personale ausiliario

-- =====================================================
-- 3. AGGIORNAMENTO RUOLI AMMINISTRATIVI
-- =====================================================

-- Aggiorna l'utente admin principale a SUPERUSER
UPDATE users SET ruolo = 'SUPERUSER' 
WHERE username = 'admin'
  AND ruolo IN ('admin', 'utente');

-- Aggiorna utenti che dovrebbero essere Dirigenti Scolastici
-- Modifica i criteri secondo le esigenze specifiche
UPDATE users SET ruolo = 'DS' 
WHERE (nome ILIKE '%dirigente%' 
       OR username ILIKE '%dirigente%'
       OR nome ILIKE '%preside%'
       OR username ILIKE '%preside%')
  AND ruolo IN ('admin', 'utente');

-- Aggiorna utenti che dovrebbero essere DSGA
UPDATE users SET ruolo = 'DSGA' 
WHERE (nome ILIKE '%dsga%' 
       OR username ILIKE '%dsga%'
       OR nome ILIKE '%direttore%servizi%'
       OR username ILIKE '%dsga%')
  AND ruolo IN ('admin', 'utente');

-- =====================================================
-- 4. AGGIORNAMENTO RUOLI PERSONALE ATA
-- =====================================================

-- Aggiorna Assistenti Amministrativi
-- Modifica i criteri secondo i dati reali del file Excel
UPDATE users SET ruolo = 'ASSISTENTI AMMINISTRATIVI' 
WHERE (nome ILIKE '%assistente%amministrativ%' 
       OR username ILIKE '%assistente%amministrativ%'
       OR nome ILIKE '%segreteria%'
       OR username ILIKE '%segreteria%'
       OR nome ILIKE '%amministrativ%'
       OR username ILIKE '%amministrativ%')
  AND ruolo IN ('admin', 'utente');

-- Aggiorna Assistenti Tecnici
UPDATE users SET ruolo = 'ASSISTENTI TECNICI' 
WHERE (nome ILIKE '%assistente%tecnic%' 
       OR username ILIKE '%assistente%tecnic%'
       OR nome ILIKE '%tecnic%'
       OR username ILIKE '%tecnic%'
       OR nome ILIKE '%laboratorio%'
       OR username ILIKE '%laboratorio%')
  AND ruolo IN ('admin', 'utente');

-- Aggiorna Collaboratori Scolastici
UPDATE users SET ruolo = 'COLLABORATORI SCOLASTICI' 
WHERE (nome ILIKE '%collaborator%scolastic%' 
       OR username ILIKE '%collaborator%scolastic%'
       OR nome ILIKE '%bidell%'
       OR username ILIKE '%bidell%'
       OR nome ILIKE '%ausiliario%'
       OR username ILIKE '%ausiliario%')
  AND ruolo IN ('admin', 'utente');

-- =====================================================
-- 5. AGGIORNAMENTI SPECIFICI PER UTENTI NOTI
-- =====================================================

-- Aggiorna utenti specifici basandosi sui dati reali
-- PERSONALIZZARE QUESTA SEZIONE SECONDO I DATI EFFETTIVI

-- Esempio: aggiorna utenti specifici a SUPERUSER
-- UPDATE users SET ruolo = 'SUPERUSER' 
-- WHERE username IN ('gaspari', 'admin_principale');

-- Esempio: aggiorna utenti specifici a DS
-- UPDATE users SET ruolo = 'DS' 
-- WHERE username IN ('dirigente.scolastico', 'preside');

-- Esempio: aggiorna utenti specifici a DSGA
-- UPDATE users SET ruolo = 'DSGA' 
-- WHERE username IN ('dsga', 'direttore.servizi');

-- =====================================================
-- 6. AGGIORNAMENTO BASATO SU PATTERN COMUNI
-- =====================================================

-- Aggiorna utenti con pattern comuni nei nomi/username
-- Questi pattern sono basati su convenzioni tipiche scolastiche

-- Pattern per identificare personale amministrativo
UPDATE users SET ruolo = 'ASSISTENTI AMMINISTRATIVI' 
WHERE ruolo = 'utente'
  AND (username ILIKE '%segreteria%' 
       OR username ILIKE '%amministrazione%'
       OR username ILIKE '%ufficio%'
       OR nome ILIKE '%segreteria%'
       OR nome ILIKE '%ufficio%');

-- Pattern per identificare personale tecnico
UPDATE users SET ruolo = 'ASSISTENTI TECNICI' 
WHERE ruolo = 'utente'
  AND (username ILIKE '%lab%' 
       OR username ILIKE '%tecnico%'
       OR username ILIKE '%informatica%'
       OR nome ILIKE '%tecnico%'
       OR nome ILIKE '%laboratorio%');

-- =====================================================
-- 7. VERIFICA DELLE MODIFICHE
-- =====================================================

-- Mostra il confronto prima/dopo
SELECT 
    'DOPO AGGIORNAMENTO' as fase,
    ruolo,
    COUNT(*) as numero_utenti
FROM users 
GROUP BY ruolo 
ORDER BY ruolo;

-- Mostra tutti gli utenti e i loro ruoli aggiornati
SELECT 
    username,
    nome,
    ruolo,
    updated_at
FROM users 
ORDER BY 
    CASE ruolo
        WHEN 'SUPERUSER' THEN 1
        WHEN 'DS' THEN 2
        WHEN 'DSGA' THEN 3
        WHEN 'admin' THEN 4
        WHEN 'ASSISTENTI AMMINISTRATIVI' THEN 5
        WHEN 'ASSISTENTI TECNICI' THEN 6
        WHEN 'COLLABORATORI SCOLASTICI' THEN 7
        WHEN 'utente' THEN 8
        ELSE 9
    END,
    username;

-- Mostra solo gli utenti con ruoli amministrativi
SELECT 
    'UTENTI AMMINISTRATIVI' as categoria,
    username,
    nome,
    ruolo
FROM users 
WHERE ruolo IN ('SUPERUSER', 'DS', 'DSGA', 'admin')
ORDER BY 
    CASE ruolo
        WHEN 'SUPERUSER' THEN 1
        WHEN 'DS' THEN 2
        WHEN 'DSGA' THEN 3
        WHEN 'admin' THEN 4
    END,
    username;

-- Mostra il personale ATA
SELECT 
    'PERSONALE ATA' as categoria,
    username,
    nome,
    ruolo
FROM users 
WHERE ruolo IN ('ASSISTENTI AMMINISTRATIVI', 'ASSISTENTI TECNICI', 'COLLABORATORI SCOLASTICI')
ORDER BY ruolo, username;

-- Verifica la gerarchia dei privilegi
SELECT 
    r.ruolo,
    r.livello_privilegio,
    r.descrizione,
    COUNT(u.id) as numero_utenti
FROM ruoli_gerarchia r
LEFT JOIN users u ON u.ruolo = r.ruolo
GROUP BY r.ruolo, r.livello_privilegio, r.descrizione
ORDER BY r.livello_privilegio DESC;

-- =====================================================
-- 8. SCRIPT DI ROLLBACK (SE NECESSARIO)
-- =====================================================

-- In caso di errore, utilizzare questi comandi per il rollback:
-- ATTENZIONE: Questi comandi annullano TUTTE le modifiche!

-- Rollback completo: ripristina dalla tabella di backup
-- DROP TABLE users;
-- CREATE TABLE users AS SELECT * FROM users_backup_ruoli;

-- Rollback parziale: riporta tutti i ruoli specifici ad 'utente'
-- UPDATE users SET ruolo = 'utente' 
-- WHERE ruolo IN ('DS', 'DSGA', 'ASSISTENTI AMMINISTRATIVI', 'ASSISTENTI TECNICI', 'COLLABORATORI SCOLASTICI');

-- Rollback parziale: riporta tutti i SUPERUSER ad 'admin'
-- UPDATE users SET ruolo = 'admin' WHERE ruolo = 'SUPERUSER';

-- =====================================================
-- 9. SCRIPT PERSONALIZZATO PER DATI SPECIFICI
-- =====================================================

-- SEZIONE DA PERSONALIZZARE BASANDOSI SUI DATI REALI DEL FILE EXCEL
-- Decommentare e modificare secondo i dati effettivi:

/*
-- Esempio di aggiornamenti specifici basati sui dati reali:

-- Aggiorna utenti specifici a SUPERUSER
UPDATE users SET ruolo = 'SUPERUSER' 
WHERE username IN (
    'admin',
    'gaspari',
    'amministratore_sistema'
);

-- Aggiorna il Dirigente Scolastico
UPDATE users SET ruolo = 'DS' 
WHERE username IN (
    'dirigente',
    'preside',
    'dirigente.scolastico'
);

-- Aggiorna il DSGA
UPDATE users SET ruolo = 'DSGA' 
WHERE username IN (
    'dsga',
    'direttore.servizi'
);

-- Aggiorna Assistenti Amministrativi specifici
UPDATE users SET ruolo = 'ASSISTENTI AMMINISTRATIVI' 
WHERE username IN (
    'segreteria1',
    'segreteria2',
    'amministrazione'
);

-- Aggiorna Assistenti Tecnici specifici
UPDATE users SET ruolo = 'ASSISTENTI TECNICI' 
WHERE username IN (
    'tecnico.informatica',
    'tecnico.laboratorio',
    'assistente.tecnico'
);

-- Aggiorna Collaboratori Scolastici specifici
UPDATE users SET ruolo = 'COLLABORATORI SCOLASTICI' 
WHERE username IN (
    'bidello1',
    'bidello2',
    'collaboratore.scolastico'
);
*/

-- =====================================================
-- 10. VERIFICA FINALE E PULIZIA
-- =====================================================

-- Verifica finale: mostra il riepilogo completo
SELECT 
    'RIEPILOGO FINALE' as stato,
    ruolo,
    COUNT(*) as numero_utenti,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentuale
FROM users 
GROUP BY ruolo 
ORDER BY COUNT(*) DESC;

-- Verifica che non ci siano utenti senza ruolo valido
SELECT 
    'VERIFICA RUOLI VALIDI' as controllo,
    COUNT(*) as utenti_con_ruoli_non_validi
FROM users 
WHERE ruolo NOT IN (
    'SUPERUSER', 'DS', 'DSGA', 'admin', 
    'ASSISTENTI AMMINISTRATIVI', 'ASSISTENTI TECNICI', 
    'COLLABORATORI SCOLASTICI', 'utente'
);

-- Rimuovi la tabella di backup se tutto è andato bene
-- (decommentare solo dopo aver verificato che tutto funzioni)
-- DROP TABLE users_backup_ruoli;

-- =====================================================
-- FINE SCRIPT
-- =====================================================

-- ISTRUZIONI POST-ESECUZIONE:
-- 1. Verificare che tutti gli utenti abbiano ruoli corretti
-- 2. Testare l'accesso alle funzioni amministrative
-- 3. Verificare che le policy di sicurezza funzionino
-- 4. Controllare che l'applicazione riconosca tutti i ruoli
-- 5. Aggiornare la documentazione con i nuovi ruoli

-- NOTA IMPORTANTE:
-- Questo script contiene esempi generici. È FONDAMENTALE
-- personalizzarlo basandosi sui dati reali presenti nel
-- file Excel DB_Ferie.xlsx nella tabella UTENTI.