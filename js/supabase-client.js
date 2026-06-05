/**
 * Configurazione client Supabase per l'applicazione AppFerie
 * 
 * Questo file contiene la configurazione per connettersi al database Supabase
 * e fornisce un client configurato per l'uso nell'applicazione web.
 */

import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURAZIONE SUPABASE
// =====================================================

// URL del progetto Supabase
//const SUPABASE_URL = 'https://jmeckjmuwxiqjpbualjb.supabase.co';
//const SUPABASE_URL = 'http://127.0.0.1:54321' locale
  const SUPABASE_URL = 'https://keila-aerobiologic-sterling.ngrok-free.dev'

// Chiave pubblica (anon key) per l'accesso client-side
// NOTA: Per l'applicazione web, usa la chiave anon, non la service key
//const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZWNram11d3hpcWpwYnVhbGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODU3OTAsImV4cCI6MjA2ODA2MTc5MH0.spScwTu10-_mmNhcUv3ez7-nHl-scbIInL7mp9FgoJ4';
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHLzjBrEguHvfOxg_3BJgxAaH' 

// Service Role Key (solo per operazioni amministrative server-side)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZWNram11d3hpcWpwYnVhbGpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ4NTc5MCwiZXhwIjoyMDY4MDYxNzkwfQ.CwheQd0QG6qo9E9nEOD9qwf2r8YK6OPdEMUFpLOy9oI';

// =====================================================
// CLIENT SUPABASE
// =====================================================

/**
 * Client Supabase per l'uso nell'applicazione web
 * Utilizza la chiave anon per rispettare le Row Level Security (RLS)
 * Include headers espliciti per risolvere errore 406
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
});

// Client amministrativo rimosso per evitare istanze multiple di GoTrueClient
// Se necessario, può essere ricreato solo quando serve per operazioni specifiche

// =====================================================
// FUNZIONI HELPER
// =====================================================

/**
 * Verifica se l'utente è autenticato
 * Utilizza sessionStorage invece di Supabase Auth per il controllo di autenticazione
 * @returns {boolean} True se l'utente è autenticato
 */
function isAuthenticated() {
    try {
        const user = sessionStorage.getItem('user');
        return !!user;
    } catch (error) {
        console.error('Errore nel controllo autenticazione:', error);
        return false;
    }
}

/**
 * Ottiene l'utente corrente
 * @returns {Object|null} Oggetto utente o null se non autenticato
 */
async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Errore nel recupero utente:', error);
        return null;
    }
    return user;
}

/**
 * Effettua il login con username e password
 * @param {string} username - Username dell'utente
 * @param {string} password - Password dell'utente
 * @returns {Object} Risultato del login
 */
async function signIn(username, password) {
    try {
        // Prima verifica le credenziali nella tabella users
        const { data: userRecords, error: userError } = await supabase
            .from('users')
            .select('id, username, password, nome, ruolo')
            .eq('username', username)
            .order('id')
            .limit(1);
        
        if (userError) {
            return { success: false, error: 'Errore durante la verifica delle credenziali' };
        }
        
        if (!userRecords || userRecords.length === 0) {
            return { success: false, error: 'Credenziali non valide' };
        }
        
        const userData = userRecords[0];

        if (userError || !userData) {
            return { success: false, error: 'Credenziali non valide' };
        }

        // Verifica la password in chiaro
        if (password !== userData.password) {
            return { success: false, error: 'Password non corretta' };
        }
        
        return {
            success: true,
            user: {
                id: userData.id,
                username: userData.username,
                nome: userData.nome,
                ruolo: userData.ruolo
            }
        };
    } catch (error) {
        console.error('Errore durante il login:', error);
        return { success: false, error: 'Errore durante il login' };
    }
}

/**
 * Effettua il logout
 * Rimuove i dati utente da sessionStorage
 */
function signOut() {
    try {
        sessionStorage.removeItem('user');
        return true;
    } catch (error) {
        console.error('Errore durante il logout:', error);
        return false;
    }
}

// =====================================================
// ESPORTAZIONI ES6
// =====================================================

export {
    supabase,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    isAuthenticated,
    getCurrentUser,
    signIn,
    signOut
};

// Export di default per compatibilità
export default supabase;