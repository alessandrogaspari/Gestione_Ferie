-- =====================================================
-- FIX PER ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Questo script risolve il problema degli errori 500 causati dalle
-- RLS policies che usano auth.uid() con un sistema di autenticazione personalizzato

-- Disabilita temporaneamente RLS per la tabella users per permettere il login
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Rimuove TUTTE le policy esistenti per users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Allow login access" ON users;
DROP POLICY IF EXISTS "Allow authenticated access" ON users;
DROP POLICY IF EXISTS "Allow authenticated updates" ON users;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON users;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Crea una policy semplice che permette l'accesso per il login
-- Nota: Questo è temporaneo per permettere il funzionamento del sistema di login personalizzato
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy che permette la lettura per l'autenticazione (usando anon key)
CREATE POLICY "Allow login access" ON users 
    FOR SELECT TO anon USING (true);

-- Policy che permette la lettura per utenti autenticati
CREATE POLICY "Allow authenticated access" ON users 
    FOR SELECT TO authenticated USING (true);

-- Policy per aggiornamenti (permette sia anon che authenticated)
CREATE POLICY "Allow authenticated updates" ON users 
    FOR UPDATE TO anon, authenticated USING (true);

-- Policy per inserimenti (permette la creazione di nuovi utenti)
-- Permette sia a anon che a authenticated di inserire utenti
CREATE POLICY "Allow authenticated inserts" ON users 
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Policy per eliminazioni (permette l'eliminazione degli utenti)
-- Permette sia a anon che a authenticated di eliminare utenti
CREATE POLICY "Allow authenticated deletes" ON users 
    FOR DELETE TO anon, authenticated USING (true);

-- Commenti per future implementazioni:
-- Quando si implementerà un sistema di autenticazione più robusto,
-- queste policy dovranno essere aggiornate per essere più restrittive
-- e basate su un sistema di sessioni o JWT personalizzato.