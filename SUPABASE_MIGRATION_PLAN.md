# Piano di Migrazione da Excel a Supabase

## Struttura Database Attuale (Excel)

Il database Excel `DB_Ferie.xlsx` contiene 4 fogli:

### 1. UTENTI (Foglio PERSONALE)
```
Colonne:
- Username (string) - Chiave primaria
- Password (string)
- Nome (string)
- Ruolo (string) - 'admin' o 'utente'
- userId (number) - ID numerico
```

### 2. FERIE
```
Colonne:
- Username (string) - Riferimento a UTENTI
- FerieTotali (number) - Default: 28
- FerieUtilizzate (number) - Default: 0
- FerieVecchieTotali (number) - Default: 0
- FerieVecchieUtilizzate (number) - Default: 0
- FestivitaTotali (number) - Default: 4
- FestivitaUtilizzate (number) - Default: 0
- MotiviFamiliariTotali (number) - Default: 3
- MotiviFamiliariUtilizzati (number) - Default: 0
- RecuperiTotali (number) - Default: 0
- RecuperiUtilizzati (number) - Default: 0
```

### 3. RICHIESTE
```
Colonne:
- ID (number) - Chiave primaria auto-incrementale
- Username (string) - Riferimento a UTENTI
- Tipo (string) - 'FERIE', 'FERIE VECCHIE', 'FESTIVITA\' SOPPRESSE', 'MOTIVI FAMILIARI', 'RECUPERI'
- DataInizio (date)
- DataFine (date)
- Giorni (number)
- Note (string)
- Stato (string) - 'IN ATTESA', 'APPROVATA', 'RIFIUTATA'
- DataRichiesta (date)
- DataApprovazione (date)
- ApprovataDa (string)
- NoteApprovazione (string)
```

### 4. SOSPENSIONI
```
Colonne:
- Data (date)
- Descrizione (string)
- Tipo (string) - 'festività' o 'sospensione'
```

## Schema Supabase Proposto

### Tabella: users
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  ruolo VARCHAR(20) DEFAULT 'utente' CHECK (ruolo IN ('admin', 'utente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabella: ferie_balance
```sql
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
```

### Tabella: richieste
```sql
CREATE TABLE richieste (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('FERIE', 'FERIE VECCHIE', 'FESTIVITA\' SOPPRESSE', 'MOTIVI FAMILIARI', 'RECUPERI')),
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
```

### Tabella: sospensioni
```sql
CREATE TABLE sospensioni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  descrizione VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'festività' CHECK (tipo IN ('festività', 'sospensione')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Indici per Performance
```sql
-- Indici per ottimizzare le query più comuni
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_richieste_user_id ON richieste(user_id);
CREATE INDEX idx_richieste_stato ON richieste(stato);
CREATE INDEX idx_richieste_data_inizio ON richieste(data_inizio);
CREATE INDEX idx_sospensioni_data ON sospensioni(data);
```

## Trigger per Updated_at
```sql
-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per ogni tabella
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ferie_balance_updated_at BEFORE UPDATE ON ferie_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_richieste_updated_at BEFORE UPDATE ON richieste FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sospensioni_updated_at BEFORE UPDATE ON sospensioni FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Row Level Security (RLS)
```sql
-- Abilita RLS per tutte le tabelle
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ferie_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE richieste ENABLE ROW LEVEL SECURITY;
ALTER TABLE sospensioni ENABLE ROW LEVEL SECURITY;

-- Policy per users: gli utenti possono vedere solo i propri dati
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Policy per ferie_balance: gli utenti possono vedere solo i propri dati
CREATE POLICY "Users can view own balance" ON ferie_balance FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own balance" ON ferie_balance FOR UPDATE USING (user_id = auth.uid());

-- Policy per richieste: gli utenti possono vedere solo le proprie richieste
CREATE POLICY "Users can view own requests" ON richieste FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own requests" ON richieste FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own requests" ON richieste FOR UPDATE USING (user_id = auth.uid());

-- Policy per sospensioni: tutti possono leggere, solo admin possono modificare
CREATE POLICY "Everyone can view suspensions" ON sospensioni FOR SELECT TO authenticated USING (true);
```

## Vantaggi della Migrazione

1. **Scalabilità**: PostgreSQL gestisce meglio grandi volumi di dati
2. **Concorrenza**: Supporto nativo per accessi simultanei
3. **Integrità**: Vincoli di integrità referenziale
4. **Sicurezza**: Row Level Security e autenticazione integrata
5. **Performance**: Indici ottimizzati e query SQL efficienti
6. **Backup**: Backup automatici e point-in-time recovery
7. **API REST**: API automatiche generate da Supabase
8. **Real-time**: Sottoscrizioni real-time per aggiornamenti live

## Prossimi Passi

1. ✅ Creare account Supabase
2. ⏳ Creare il progetto e configurare il database
3. ⏳ Eseguire gli script SQL per creare le tabelle
4. ⏳ Migrare i dati esistenti dall'Excel
5. ⏳ Aggiornare il codice JavaScript per usare Supabase
6. ⏳ Testare tutte le funzionalità
7. ⏳ Deploy in produzione

## Note Tecniche

- Utilizzare password in chiaro per semplicità
- Implementare autenticazione JWT tramite Supabase Auth
- Usare le API REST di Supabase o il client JavaScript
- Mantenere la compatibilità con l'interfaccia utente esistente
- Implementare validazione lato client e server