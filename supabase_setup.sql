-- =====================================================
-- SCRIPT DI SETUP SUPABASE PER APP FERIE
-- =====================================================
-- Questo script crea tutte le tabelle, indici, trigger e policy
-- necessarie per migrare da Excel a Supabase

-- =====================================================
-- 1. CREAZIONE TABELLE
-- =====================================================

-- Tabella utenti
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  ruolo VARCHAR(20) DEFAULT 'utente' CHECK (ruolo IN ('admin', 'utente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella bilancio ferie per ogni utente
CREATE TABLE ferie_balance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ferie_totali INTEGER DEFAULT 28,
  ferie_utilizzate DECIMAL(4,2) DEFAULT 0,
  ferie_vecchie_totali INTEGER DEFAULT 0,
  ferie_vecchie_utilizzate DECIMAL(4,2) DEFAULT 0,
  festivita_totali INTEGER DEFAULT 4,
  festivita_utilizzate DECIMAL(4,2) DEFAULT 0,
  motivi_familiari_totali INTEGER DEFAULT 3,
  motivi_familiari_utilizzati DECIMAL(4,2) DEFAULT 0,
  recuperi_totali INTEGER DEFAULT 0,
  recuperi_utilizzati DECIMAL(4,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabella richieste ferie
CREATE TABLE richieste (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('FERIE', 'FERIE VECCHIE', 'FESTIVITA'' SOPPRESSE', 'MOTIVI FAMILIARI', 'RECUPERI')),
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  giorni DECIMAL(4,2) NOT NULL,
  note TEXT,
  stato VARCHAR(20) DEFAULT 'IN ATTESA' CHECK (stato IN ('IN ATTESA', 'APPROVATA', 'RIFIUTATA')),
  data_richiesta DATE DEFAULT CURRENT_DATE,
  data_approvazione DATE,
  approvata_da UUID REFERENCES users(id),
  note_approvazione TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella sospensioni e festività
CREATE TABLE sospensioni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  descrizione VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'festività' CHECK (tipo IN ('festività', 'sospensione')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INDICI PER PERFORMANCE
-- =====================================================

-- Indici per ottimizzare le query più comuni
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_ferie_balance_user_id ON ferie_balance(user_id);
CREATE INDEX idx_richieste_user_id ON richieste(user_id);
CREATE INDEX idx_richieste_stato ON richieste(stato);
CREATE INDEX idx_richieste_data_inizio ON richieste(data_inizio);
CREATE INDEX idx_richieste_data_fine ON richieste(data_fine);
CREATE INDEX idx_richieste_tipo ON richieste(tipo);
CREATE INDEX idx_sospensioni_data ON sospensioni(data);
CREATE INDEX idx_sospensioni_tipo ON sospensioni(tipo);

-- =====================================================
-- 3. TRIGGER PER UPDATED_AT
-- =====================================================

-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per ogni tabella
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ferie_balance_updated_at 
    BEFORE UPDATE ON ferie_balance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_richieste_updated_at 
    BEFORE UPDATE ON richieste 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sospensioni_updated_at 
    BEFORE UPDATE ON sospensioni 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. FUNZIONI HELPER
-- =====================================================

-- Funzione per calcolare i giorni lavorativi tra due date
CREATE OR REPLACE FUNCTION calcola_giorni_lavorativi(
    data_inizio DATE,
    data_fine DATE
) RETURNS DECIMAL(4,2) AS $$
DECLARE
    giorni_totali INTEGER;
    giorni_weekend INTEGER;
    giorni_festivi INTEGER;
    risultato DECIMAL(4,2);
BEGIN
    -- Calcola i giorni totali
    giorni_totali := data_fine - data_inizio + 1;
    
    -- Calcola i weekend (sabato e domenica)
    SELECT COUNT(*) INTO giorni_weekend
    FROM generate_series(data_inizio, data_fine, '1 day'::interval) AS d
    WHERE EXTRACT(DOW FROM d) IN (0, 6); -- 0=domenica, 6=sabato
    
    -- Calcola i giorni festivi (esclusi weekend)
    SELECT COUNT(*) INTO giorni_festivi
    FROM sospensioni s
    WHERE s.data BETWEEN data_inizio AND data_fine
    AND s.tipo = 'festività'
    AND EXTRACT(DOW FROM s.data) NOT IN (0, 6);
    
    -- Calcola il risultato
    risultato := giorni_totali - giorni_weekend - giorni_festivi;
    
    RETURN GREATEST(risultato, 0);
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare automaticamente il bilancio ferie
CREATE OR REPLACE FUNCTION aggiorna_bilancio_ferie()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo se la richiesta è stata approvata
    IF NEW.stato = 'APPROVATA' AND (OLD.stato IS NULL OR OLD.stato != 'APPROVATA') THEN
        UPDATE ferie_balance 
        SET 
            ferie_utilizzate = CASE 
                WHEN NEW.tipo = 'FERIE' THEN ferie_utilizzate + NEW.giorni
                ELSE ferie_utilizzate
            END,
            ferie_vecchie_utilizzate = CASE 
                WHEN NEW.tipo = 'FERIE VECCHIE' THEN ferie_vecchie_utilizzate + NEW.giorni
                ELSE ferie_vecchie_utilizzate
            END,
            festivita_utilizzate = CASE 
                WHEN NEW.tipo = 'FESTIVITA'' SOPPRESSE' THEN festivita_utilizzate + NEW.giorni
                ELSE festivita_utilizzate
            END,
            motivi_familiari_utilizzati = CASE 
                WHEN NEW.tipo = 'MOTIVI FAMILIARI' THEN motivi_familiari_utilizzati + NEW.giorni
                ELSE motivi_familiari_utilizzati
            END,
            recuperi_utilizzati = CASE 
                WHEN NEW.tipo = 'RECUPERI' THEN recuperi_utilizzati + NEW.giorni
                ELSE recuperi_utilizzati
            END
        WHERE user_id = NEW.user_id;
    END IF;
    
    -- Se la richiesta viene rifiutata dopo essere stata approvata, ripristina il bilancio
    IF OLD.stato = 'APPROVATA' AND NEW.stato = 'RIFIUTATA' THEN
        UPDATE ferie_balance 
        SET 
            ferie_utilizzate = CASE 
                WHEN NEW.tipo = 'FERIE' THEN ferie_utilizzate - NEW.giorni
                ELSE ferie_utilizzate
            END,
            ferie_vecchie_utilizzate = CASE 
                WHEN NEW.tipo = 'FERIE VECCHIE' THEN ferie_vecchie_utilizzate - NEW.giorni
                ELSE ferie_vecchie_utilizzate
            END,
            festivita_utilizzate = CASE 
                WHEN NEW.tipo = 'FESTIVITA'' SOPPRESSE' THEN festivita_utilizzate - NEW.giorni
                ELSE festivita_utilizzate
            END,
            motivi_familiari_utilizzati = CASE 
                WHEN NEW.tipo = 'MOTIVI FAMILIARI' THEN motivi_familiari_utilizzati - NEW.giorni
                ELSE motivi_familiari_utilizzati
            END,
            recuperi_utilizzati = CASE 
                WHEN NEW.tipo = 'RECUPERI' THEN recuperi_utilizzati - NEW.giorni
                ELSE recuperi_utilizzati
            END
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare automaticamente il bilancio
CREATE TRIGGER trigger_aggiorna_bilancio_ferie
    AFTER UPDATE ON richieste
    FOR EACH ROW
    EXECUTE FUNCTION aggiorna_bilancio_ferie();

-- Funzione per creare automaticamente il bilancio ferie per nuovi utenti
CREATE OR REPLACE FUNCTION crea_bilancio_ferie_utente()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ferie_balance (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per creare automaticamente il bilancio
CREATE TRIGGER trigger_crea_bilancio_ferie
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION crea_bilancio_ferie_utente();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Abilita RLS per tutte le tabelle
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferie_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE richieste ENABLE ROW LEVEL SECURITY;
ALTER TABLE sospensioni ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. POLICY DI SICUREZZA
-- =====================================================

-- Policy per users: gli utenti possono vedere solo i propri dati
CREATE POLICY "Users can view own profile" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users 
    FOR UPDATE USING (auth.uid() = id);

-- Gli admin possono vedere tutti gli utenti
CREATE POLICY "Admins can view all users" ON users 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy per ferie_balance: gli utenti possono vedere solo i propri dati
CREATE POLICY "Users can view own balance" ON ferie_balance 
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

CREATE POLICY "Users can update own balance" ON ferie_balance 
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy per richieste: gli utenti possono vedere solo le proprie richieste
CREATE POLICY "Users can view own requests" ON richieste 
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

CREATE POLICY "Users can insert own requests" ON richieste 
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own requests" ON richieste 
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

CREATE POLICY "Users can delete own requests" ON richieste 
    FOR DELETE USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- Policy per sospensioni: tutti possono leggere, solo admin possono modificare
CREATE POLICY "Everyone can view suspensions" ON sospensioni 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can modify suspensions" ON sospensioni 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND ruolo = 'admin'
        )
    );

-- =====================================================
-- 7. VISTE UTILI
-- =====================================================

-- Vista per il riepilogo completo utente
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

-- Vista per le richieste con dettagli utente
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
-- 8. DATI DI ESEMPIO (OPZIONALE)
-- =====================================================

-- Inserimento admin di default (password: admin123 - da cambiare!)
-- Nota: Password in chiaro per semplicità
INSERT INTO users (username, password, nome, ruolo) VALUES 
('admin', 'admin123', 'Amministratore', 'admin');

-- Inserimento festività italiane comuni per il 2024
INSERT INTO sospensioni (data, descrizione, tipo) VALUES 
('2024-01-01', 'Capodanno', 'festività'),
('2024-01-06', 'Epifania', 'festività'),
('2024-04-25', 'Festa della Liberazione', 'festività'),
('2024-05-01', 'Festa del Lavoro', 'festività'),
('2024-06-02', 'Festa della Repubblica', 'festività'),
('2024-08-15', 'Ferragosto', 'festività'),
('2024-11-01', 'Ognissanti', 'festività'),
('2024-12-08', 'Immacolata Concezione', 'festività'),
('2024-12-25', 'Natale', 'festività'),
('2024-12-26', 'Santo Stefano', 'festività');

-- =====================================================
-- FINE SCRIPT
-- =====================================================

-- Per verificare che tutto sia stato creato correttamente:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM user_summary;