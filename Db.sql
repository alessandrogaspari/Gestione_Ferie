-- Pulizia del dump PostgreSQL per l'importazione diretta delle tabelle dello schema public

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- 1. FUNZIONI DELLO SCHEMA PUBLIC

CREATE OR REPLACE FUNCTION public.aggiorna_bilancio_ferie() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.calcola_giorni_lavorativi(data_inizio date, data_fine date) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    giorni_totali INTEGER;
    giorni_weekend INTEGER;
    giorni_festivi INTEGER;
    risultato DECIMAL(4,2);
BEGIN
    giorni_totali := data_fine - data_inizio + 1;
    
    SELECT COUNT(*) INTO giorni_weekend
    FROM generate_series(data_inizio, data_fine, '1 day'::interval) AS d
    WHERE EXTRACT(DOW FROM d) IN (0, 6);
    
    SELECT COUNT(*) INTO giorni_festivi
    FROM sospensioni s
    WHERE s.data BETWEEN data_inizio AND data_fine
    AND s.tipo = 'festività'
    AND EXTRACT(DOW FROM s.data) NOT IN (0, 6);
    
    risultato := giorni_totali - giorni_weekend - giorni_festivi;
    RETURN GREATEST(risultato, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.crea_bilancio_ferie_utente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO ferie_balance (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_privilege(user_id_param uuid, privilege_type text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT ruolo INTO user_role
    FROM users
    WHERE id = user_id_param;
    
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
$$;


-- 2. CREAZIONE DELLE TABELLE PRINCIPALI (SCHEMA PUBLIC)

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    nome character varying(100) NOT NULL,
    ruolo character varying(50) DEFAULT 'utente'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_username_key UNIQUE (username),
    CONSTRAINT users_ruolo_check CHECK (((ruolo)::text = ANY (ARRAY[('SUPERUSER'::character varying)::text, ('DS'::character varying)::text, ('DSGA'::character varying)::text, ('ASSISTENTI AMMINISTRATIVI'::character varying)::text, ('ASSISTENTI TECNICI'::character varying)::text, ('COLLABORATORI SCOLASTICI'::character varying)::text, ('admin'::character varying)::text, ('utente'::character varying)::text])))
);

CREATE TABLE IF NOT EXISTS public.ferie_balance (
    user_id uuid NOT NULL,
    ferie_spettanti numeric(4,1) DEFAULT 32.0,
    ferie_utilizzate numeric(4,1) DEFAULT 0.0,
    ferie_vecchie_spettanti numeric(4,1) DEFAULT 0.0,
    ferie_vecchie_utilizzate numeric(4,1) DEFAULT 0.0,
    festivita_spettanti numeric(4,1) DEFAULT 4.0,
    festivita_utilizzate numeric(4,1) DEFAULT 0.0,
    motivi_familiari_spettanti numeric(4,1) DEFAULT 3.0,
    motivi_familiari_utilizzati numeric(4,1) DEFAULT 0.0,
    recuperi_spettanti numeric(4,1) DEFAULT 0.0,
    recuperi_utilizzati numeric(4,1) DEFAULT 0.0,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ferie_balance_pkey PRIMARY KEY (user_id),
    CONSTRAINT ferie_balance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.richieste (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    tipo character varying(50) NOT NULL,
    data_inizio date NOT NULL,
    data_fine date NOT NULL,
    giorni numeric(4,1) NOT NULL,
    note text,
    stato character varying(20) DEFAULT 'IN ATTESA'::character varying,
    data_richiesta timestamp with time zone DEFAULT now(),
    data_approvazione timestamp with time zone,
    approvata_da uuid,
    note_approvazione text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT richieste_pkey PRIMARY KEY (id),
    CONSTRAINT richieste_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT richieste_approvata_da_fkey FOREIGN KEY (approvata_da) REFERENCES public.users(id),
    CONSTRAINT richieste_stato_check CHECK (((stato)::text = ANY (ARRAY[('IN ATTESA'::character varying)::text, ('APPROVATA'::character varying)::text, ('RIFIUTATA'::character varying)::text])))
);

CREATE SEQUENCE IF NOT EXISTS public.richieste_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.richieste_id_seq OWNED BY public.richieste.id;
ALTER TABLE ONLY public.richieste ALTER COLUMN id SET DEFAULT nextval('public.richieste_id_seq');

CREATE TABLE IF NOT EXISTS public.sospensioni (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data date NOT NULL,
    descrizione character varying(255),
    tipo character varying(50) DEFAULT 'festività'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sospensioni_pkey PRIMARY KEY (id),
    CONSTRAINT sospensioni_data_key UNIQUE (data)
);

CREATE TABLE IF NOT EXISTS public.users_backup_ruoli (
    id uuid NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nome character varying(100) NOT NULL,
    ruolo character varying(50) NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT users_backup_ruoli_pkey PRIMARY KEY (id)
);


-- 3. VISTE

CREATE OR REPLACE VIEW public.richieste_dettagliate AS
 SELECT r.id,
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
   FROM ((public.richieste r
     JOIN public.users u ON ((r.user_id = u.id)))
     LEFT JOIN public.users admin_user ON ((r.approvata_da = admin_user.id)));


-- 4. TRIGGER

CREATE OR REPLACE TRIGGER trigger_aggiorna_bilancio_ferie
    AFTER UPDATE ON public.richieste
    FOR EACH ROW
    EXECUTE FUNCTION public.aggiorna_bilancio_ferie();

CREATE OR REPLACE TRIGGER trigger_crea_bilancio_ferie
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.crea_bilancio_ferie_utente();

CREATE OR REPLACE TRIGGER update_ferie_balance_updated_at
    BEFORE UPDATE ON public.ferie_balance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_richieste_updated_at
    BEFORE UPDATE ON public.richieste
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_sospensioni_updated_at
    BEFORE UPDATE ON public.sospensioni
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();