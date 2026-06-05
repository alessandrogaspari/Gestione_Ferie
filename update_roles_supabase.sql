-- =====================================================
-- AGGIORNAMENTO STRUTTURA RUOLI DATABASE SUPABASE
-- =====================================================
-- Questo script aggiorna la tabella users per supportare
-- tutti i ruoli presenti nel file Excel DB_Ferie.xlsx

-- =====================================================
-- RUOLI SUPPORTATI DAL FILE EXCEL:
-- =====================================================
-- - SUPERUSER (Super amministratore)
-- - DS (Dirigente Scolastico)
-- - DSGA (Direttore dei Servizi Generali e Amministrativi)
-- - ASSISTENTI AMMINISTRATIVI
-- - ASSISTENTI TECNICI
-- - COLLABORATORI SCOLASTICI
-- - utente (ruolo base per compatibilità)
-- - admin (ruolo generico amministrativo per compatibilità)

-- =====================================================
-- 1. BACKUP DELLA CONFIGURAZIONE ATTUALE
-- =====================================================

-- Visualizza il constraint attuale
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
  AND contype = 'c'
  AND conname LIKE '%ruolo%';

-- Visualizza i ruoli attuali nel database
SELECT 
    ruolo,
    COUNT(*) as numero_utenti
FROM users 
GROUP BY ruolo 
ORDER BY ruolo;

-- =====================================================
-- 2. RIMOZIONE CONSTRAINT ESISTENTE
-- =====================================================

-- Rimuove il constraint esistente sui ruoli
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ruolo_check;

-- =====================================================
-- 3. AGGIUNTA NUOVO CONSTRAINT CON TUTTI I RUOLI
-- =====================================================

-- Aggiunge il nuovo constraint che include tutti i ruoli del file Excel
ALTER TABLE users ADD CONSTRAINT users_ruolo_check 
    CHECK (ruolo IN (
        'SUPERUSER',
        'DS', 
        'DSGA',
        'ASSISTENTI AMMINISTRATIVI',
        'ASSISTENTI TECNICI', 
        'COLLABORATORI SCOLASTICI',
        'admin',
        'utente'
    ));

-- =====================================================
-- 4. AGGIORNAMENTO POLICY DI SICUREZZA (RLS)
-- =====================================================

-- Policy per la lettura degli utenti
DROP POLICY IF EXISTS "users_select_policy" ON users;
CREATE POLICY "users_select_policy" ON users
    FOR SELECT
    USING (
        -- Gli utenti possono vedere se stessi
        auth.uid()::text = id::text
        OR
        -- Gli amministratori possono vedere tutti
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA')
        )
    );

-- Policy per l'inserimento di nuovi utenti
DROP POLICY IF EXISTS "users_insert_policy" ON users;
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT
    WITH CHECK (
        -- Solo amministratori possono creare utenti
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA')
        )
    );

-- Policy per l'aggiornamento degli utenti
DROP POLICY IF EXISTS "users_update_policy" ON users;
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE
    USING (
        -- Gli utenti possono aggiornare se stessi
        auth.uid()::text = id::text
        OR
        -- Gli amministratori possono aggiornare tutti
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA')
        )
    )
    WITH CHECK (
        -- Gli utenti non possono modificare il proprio ruolo
        (auth.uid()::text = id::text AND ruolo = (SELECT ruolo FROM users WHERE id = auth.uid()))
        OR
        -- Gli amministratori possono modificare tutto
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA')
        )
    );

-- Policy per l'eliminazione degli utenti
DROP POLICY IF EXISTS "users_delete_policy" ON users;
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE
    USING (
        -- Solo SUPERUSER e DS possono eliminare utenti
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('SUPERUSER', 'DS')
        )
        -- Impedisce l'eliminazione dell'ultimo SUPERUSER
        AND NOT (
            ruolo = 'SUPERUSER' 
            AND (SELECT COUNT(*) FROM users WHERE ruolo = 'SUPERUSER') <= 1
        )
    );

-- =====================================================
-- 5. AGGIORNAMENTO POLICY PER ALTRE TABELLE
-- =====================================================

-- Policy per ferie_balance
DROP POLICY IF EXISTS "ferie_balance_select_policy" ON ferie_balance;
CREATE POLICY "ferie_balance_select_policy" ON ferie_balance
    FOR SELECT
    USING (
        -- Gli utenti possono vedere il proprio bilancio
        auth.uid()::text = user_id::text
        OR
        -- Gli amministratori possono vedere tutti i bilanci
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA', 'ASSISTENTI AMMINISTRATIVI')
        )
    );

-- Policy per richieste
DROP POLICY IF EXISTS "richieste_select_policy" ON richieste;
CREATE POLICY "richieste_select_policy" ON richieste
    FOR SELECT
    USING (
        -- Gli utenti possono vedere le proprie richieste
        auth.uid()::text = user_id::text
        OR
        -- Gli amministratori possono vedere tutte le richieste
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA', 'ASSISTENTI AMMINISTRATIVI')
        )
    );

DROP POLICY IF EXISTS "richieste_update_policy" ON richieste;
CREATE POLICY "richieste_update_policy" ON richieste
    FOR UPDATE
    USING (
        -- Gli utenti possono modificare le proprie richieste in attesa
        (auth.uid()::text = user_id::text AND stato = 'IN ATTESA')
        OR
        -- Gli amministratori possono modificare tutte le richieste
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA', 'ASSISTENTI AMMINISTRATIVI')
        )
    );

-- =====================================================
-- 6. CREAZIONE VISTA PER GERARCHIA RUOLI
-- =====================================================

-- Vista che definisce la gerarchia e i privilegi dei ruoli
CREATE OR REPLACE VIEW ruoli_gerarchia AS
SELECT 
    ruolo,
    CASE ruolo
        WHEN 'SUPERUSER' THEN 100
        WHEN 'DS' THEN 90
        WHEN 'DSGA' THEN 80
        WHEN 'admin' THEN 70
        WHEN 'ASSISTENTI AMMINISTRATIVI' THEN 60
        WHEN 'ASSISTENTI TECNICI' THEN 50
        WHEN 'COLLABORATORI SCOLASTICI' THEN 40
        WHEN 'utente' THEN 10
        ELSE 0
    END as livello_privilegio,
    CASE ruolo
        WHEN 'SUPERUSER' THEN 'Accesso completo al sistema'
        WHEN 'DS' THEN 'Dirigente Scolastico - Accesso amministrativo completo'
        WHEN 'DSGA' THEN 'Direttore Servizi Generali - Gestione amministrativa'
        WHEN 'admin' THEN 'Amministratore generico'
        WHEN 'ASSISTENTI AMMINISTRATIVI' THEN 'Gestione pratiche amministrative'
        WHEN 'ASSISTENTI TECNICI' THEN 'Supporto tecnico e laboratori'
        WHEN 'COLLABORATORI SCOLASTICI' THEN 'Servizi ausiliari'
        WHEN 'utente' THEN 'Accesso base'
        ELSE 'Ruolo non definito'
    END as descrizione,
    CASE 
        WHEN ruolo IN ('SUPERUSER', 'DS', 'DSGA', 'admin') THEN true
        ELSE false
    END as puo_gestire_utenti,
    CASE 
        WHEN ruolo IN ('SUPERUSER', 'DS', 'DSGA', 'admin', 'ASSISTENTI AMMINISTRATIVI') THEN true
        ELSE false
    END as puo_approvare_richieste,
    CASE 
        WHEN ruolo IN ('SUPERUSER', 'DS') THEN true
        ELSE false
    END as puo_eliminare_utenti
FROM (
    VALUES 
        ('SUPERUSER'),
        ('DS'),
        ('DSGA'),
        ('admin'),
        ('ASSISTENTI AMMINISTRATIVI'),
        ('ASSISTENTI TECNICI'),
        ('COLLABORATORI SCOLASTICI'),
        ('utente')
) AS ruoli(ruolo);

-- =====================================================
-- 7. FUNZIONE HELPER PER VERIFICARE PRIVILEGI
-- =====================================================

-- Funzione per verificare se un utente ha un determinato privilegio
CREATE OR REPLACE FUNCTION user_has_privilege(user_id_param UUID, privilege_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Ottiene il ruolo dell'utente
    SELECT ruolo INTO user_role
    FROM users
    WHERE id = user_id_param;
    
    -- Verifica il privilegio richiesto
    CASE privilege_type
        WHEN 'gestire_utenti' THEN
            RETURN user_role IN ('SUPERUSER', 'DS', 'DSGA', 'admin');
        WHEN 'approvare_richieste' THEN
            RETURN user_role IN ('SUPERUSER', 'DS', 'DSGA', 'admin', 'ASSISTENTI AMMINISTRATIVI');
        WHEN 'eliminare_utenti' THEN
            RETURN user_role IN ('SUPERUSER', 'DS');
        WHEN 'accesso_completo' THEN
            RETURN user_role IN ('SUPERUSER', 'DS');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. QUERY DI VERIFICA
-- =====================================================

-- Verifica il nuovo constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
  AND contype = 'c'
  AND conname = 'users_ruolo_check';

-- Verifica i ruoli attuali
SELECT 
    ruolo,
    COUNT(*) as numero_utenti
FROM users 
GROUP BY ruolo 
ORDER BY ruolo;

-- Verifica la vista gerarchia ruoli
SELECT * FROM ruoli_gerarchia ORDER BY livello_privilegio DESC;

-- Verifica le policy attive
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'ferie_balance', 'richieste')
ORDER BY tablename, policyname;

-- =====================================================
-- FINE SCRIPT
-- =====================================================

-- NOTA: Dopo aver eseguito questo script, eseguire
-- update_specific_users_roles.sql per aggiornare
-- i ruoli degli utenti specifici secondo il file Excel