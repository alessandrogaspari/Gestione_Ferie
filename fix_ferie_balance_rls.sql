-- =====================================================
-- FIX PER ROW LEVEL SECURITY POLICIES - COMPLETE
-- =====================================================
-- Questo script risolve il problema degli errori 400/500 causati dalle
-- RLS policies sulle tabelle ferie_balance, richieste e sospensioni che usano auth.uid() 
-- con un sistema di autenticazione personalizzato

-- Disabilita temporaneamente RLS per la tabella ferie_balance
ALTER TABLE ferie_balance DISABLE ROW LEVEL SECURITY;

-- Rimuove TUTTE le policy esistenti per ferie_balance
DROP POLICY IF EXISTS "Users can view own balance" ON ferie_balance;
DROP POLICY IF EXISTS "Users can update own balance" ON ferie_balance;
DROP POLICY IF EXISTS "ferie_balance_select_policy" ON ferie_balance;
DROP POLICY IF EXISTS "ferie_balance_insert_policy" ON ferie_balance;
DROP POLICY IF EXISTS "ferie_balance_update_policy" ON ferie_balance;
DROP POLICY IF EXISTS "ferie_balance_delete_policy" ON ferie_balance;

-- Riabilita RLS con policy semplificate
ALTER TABLE ferie_balance ENABLE ROW LEVEL SECURITY;

-- Policy che permette l'accesso per utenti anonimi (usando anon key)
CREATE POLICY "Allow anon access to ferie_balance" ON ferie_balance 
    FOR ALL TO anon USING (true);

-- Policy che permette l'accesso per utenti autenticati
CREATE POLICY "Allow authenticated access to ferie_balance" ON ferie_balance 
    FOR ALL TO authenticated USING (true);

-- =====================================================
-- FIX PER TABELLA RICHIESTE
-- =====================================================

-- Disabilita temporaneamente RLS per la tabella richieste
ALTER TABLE richieste DISABLE ROW LEVEL SECURITY;

-- Rimuove TUTTE le policy esistenti per richieste
DROP POLICY IF EXISTS "Users can view own requests" ON richieste;
DROP POLICY IF EXISTS "Users can insert own requests" ON richieste;
DROP POLICY IF EXISTS "Users can update own requests" ON richieste;
DROP POLICY IF EXISTS "Users can delete own requests" ON richieste;
DROP POLICY IF EXISTS "richieste_select_policy" ON richieste;
DROP POLICY IF EXISTS "richieste_insert_policy" ON richieste;
DROP POLICY IF EXISTS "richieste_update_policy" ON richieste;
DROP POLICY IF EXISTS "richieste_delete_policy" ON richieste;

-- Riabilita RLS con policy semplificate
ALTER TABLE richieste ENABLE ROW LEVEL SECURITY;

-- Policy che permette l'accesso per utenti anonimi (usando anon key)
CREATE POLICY "Allow anon access to richieste" ON richieste 
    FOR ALL TO anon USING (true);

-- Policy che permette l'accesso per utenti autenticati
CREATE POLICY "Allow authenticated access to richieste" ON richieste 
    FOR ALL TO authenticated USING (true);

-- =====================================================
-- FIX PER TABELLA SOSPENSIONI
-- =====================================================

-- Disabilita temporaneamente RLS per la tabella sospensioni
ALTER TABLE sospensioni DISABLE ROW LEVEL SECURITY;

-- Rimuove TUTTE le policy esistenti per sospensioni
DROP POLICY IF EXISTS "Everyone can view suspensions" ON sospensioni;
DROP POLICY IF EXISTS "Only admins can modify suspensions" ON sospensioni;
DROP POLICY IF EXISTS "sospensioni_select_policy" ON sospensioni;
DROP POLICY IF EXISTS "sospensioni_insert_policy" ON sospensioni;
DROP POLICY IF EXISTS "sospensioni_update_policy" ON sospensioni;
DROP POLICY IF EXISTS "sospensioni_delete_policy" ON sospensioni;

-- Riabilita RLS con policy semplificate
ALTER TABLE sospensioni ENABLE ROW LEVEL SECURITY;

-- Policy che permette l'accesso per utenti anonimi (usando anon key)
CREATE POLICY "Allow anon access to sospensioni" ON sospensioni 
    FOR ALL TO anon USING (true);

-- Policy che permette l'accesso per utenti autenticati
CREATE POLICY "Allow authenticated access to sospensioni" ON sospensioni 
    FOR ALL TO authenticated USING (true);

-- Commenti per future implementazioni:
-- Quando si implementerà un sistema di autenticazione più robusto,
-- queste policy dovranno essere aggiornate per essere più restrittive
-- e basate su un sistema di sessioni o JWT personalizzato.
-- 
-- Per ora, permettiamo l'accesso completo per risolvere gli errori 400/500
-- e permettere il funzionamento dell'applicazione.