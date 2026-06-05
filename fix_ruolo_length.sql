-- =====================================================
-- CORREZIONE LUNGHEZZA CAMPO RUOLO CON GESTIONE POLICY
-- =====================================================
-- Questo script risolve l'errore "value too long for type character varying(20)"
-- e "cannot alter type of a column used in a policy definition"
-- rimuovendo temporaneamente le policy, modificando il campo, e ricreandole

-- =====================================================
-- PROBLEMA:
-- =====================================================
-- Il campo ruolo nella tabella users è definito come VARCHAR(20)
-- ma i nuovi ruoli superano questo limite:
-- - 'ASSISTENTI AMMINISTRATIVI' = 25 caratteri
-- - 'COLLABORATORI SCOLASTICI' = 24 caratteri
-- - 'ASSISTENTI TECNICI' = 17 caratteri (OK)
-- Inoltre, le policy RLS dipendono dal campo ruolo e impediscono la modifica

-- =====================================================
-- SOLUZIONE:
-- =====================================================

-- 1. RIMOZIONE TEMPORANEA DELLE POLICY CHE DIPENDONO DAL CAMPO RUOLO

-- Policy sulla tabella users (nomi originali da supabase_setup.sql)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Policy sulla tabella users (nomi da update_roles_supabase.sql)
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Policy sulla tabella ferie_balance (nomi originali da supabase_setup.sql)
DROP POLICY IF EXISTS "Users can view own balance" ON ferie_balance;
DROP POLICY IF EXISTS "Users can update own balance" ON ferie_balance;

-- Policy sulla tabella ferie_balance (nomi da update_roles_supabase.sql)
DROP POLICY IF EXISTS "ferie_balance_select_policy" ON ferie_balance;
DROP POLICY IF EXISTS "ferie_balance_insert_policy" ON ferie_balance;
DROP POLICY IF EXISTS "ferie_balance_update_policy" ON ferie_balance;
DROP POLICY IF EXISTS "ferie_balance_delete_policy" ON ferie_balance;

-- Policy sulla tabella richieste (nomi originali da supabase_setup.sql)
DROP POLICY IF EXISTS "Users can view own requests" ON richieste;
DROP POLICY IF EXISTS "Users can insert own requests" ON richieste;
DROP POLICY IF EXISTS "Users can update own requests" ON richieste;
DROP POLICY IF EXISTS "Users can delete own requests" ON richieste;

-- Policy sulla tabella richieste (nomi da update_roles_supabase.sql)
DROP POLICY IF EXISTS "richieste_select_policy" ON richieste;
DROP POLICY IF EXISTS "richieste_insert_policy" ON richieste;
DROP POLICY IF EXISTS "richieste_update_policy" ON richieste;
DROP POLICY IF EXISTS "richieste_delete_policy" ON richieste;

-- Policy sulla tabella sospensioni (nomi originali da supabase_setup.sql)
DROP POLICY IF EXISTS "Everyone can view suspensions" ON sospensioni;
DROP POLICY IF EXISTS "Only admins can modify suspensions" ON sospensioni;

-- Rimozione temporanea delle viste che dipendono dal campo ruolo
DROP VIEW IF EXISTS user_summary;
DROP VIEW IF EXISTS richieste_dettagliate;

-- 2. RIMOZIONE DEL CONSTRAINT ESISTENTE
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ruolo_check;

-- 3. MODIFICA DELLA LUNGHEZZA DEL CAMPO RUOLO
ALTER TABLE users ALTER COLUMN ruolo TYPE VARCHAR(50);

-- 4. RICREAZIONE DEL CONSTRAINT CON TUTTI I RUOLI
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

-- 5. RICREAZIONE DELLE POLICY

-- Policy per la lettura degli utenti
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

-- Policy per ferie_balance
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

-- Policy per sospensioni
CREATE POLICY "Everyone can view suspensions" ON sospensioni 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can modify suspensions" ON sospensioni 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo IN ('admin', 'SUPERUSER', 'DS', 'DSGA')
        )
     );

-- Ricreazione delle viste
CREATE VIEW user_summary AS
SELECT 
    u.id,
    u.username,
    u.nome,
    u.ruolo,
    fb.ferie_totali,
    fb.ferie_utilizzate,
    (fb.ferie_totali - fb.ferie_utilizzate) AS ferie_rimanenti,
    fb.ferie_vecchie_totali,
    fb.ferie_vecchie_utilizzate,
    (fb.ferie_vecchie_totali - fb.ferie_vecchie_utilizzate) AS ferie_vecchie_rimanenti,
    fb.festivita_totali,
    fb.festivita_utilizzate,
    (fb.festivita_totali - fb.festivita_utilizzate) AS festivita_rimanenti,
    fb.motivi_familiari_totali,
    fb.motivi_familiari_utilizzati,
    (fb.motivi_familiari_totali - fb.motivi_familiari_utilizzati) AS motivi_familiari_rimanenti,
    fb.recuperi_totali,
    fb.recuperi_utilizzati,
    (fb.recuperi_totali - fb.recuperi_utilizzati) AS recuperi_rimanenti
FROM users u
LEFT JOIN ferie_balance fb ON u.id = fb.user_id;

CREATE VIEW richieste_dettagliate AS
SELECT 
    r.id,
    r.user_id,
    u.username,
    u.nome,
    r.tipo,
    r.data_inizio,
    r.data_fine,
    r.giorni,
    r.note,
    r.stato,
    r.data_richiesta,
    r.data_approvazione,
    admin_user.nome AS approvata_da_nome,
    r.note_approvazione,
    r.created_at,
    r.updated_at
FROM richieste r
JOIN users u ON r.user_id = u.id
LEFT JOIN users admin_user ON r.approvata_da = admin_user.id;

-- =====================================================
-- VERIFICA
-- =====================================================

-- Verifica che il campo sia stato modificato correttamente
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'ruolo';

-- Verifica il nuovo constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
  AND contype = 'c'
  AND conname = 'users_ruolo_check';

-- Verifica le policy ricreate
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('users', 'ferie_balance', 'richieste', 'sospensioni')
ORDER BY tablename, policyname;

-- Verifica le viste ricreate
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name IN ('user_summary', 'richieste_dettagliate')
ORDER BY table_name;

-- =====================================================
-- FINE SCRIPT
-- =====================================================

-- NOTA: Dopo aver eseguito questo script, sarà possibile
-- eseguire update_specific_users_roles.sql senza errori