/**
 * MODULO: Comunicazione API con Supabase Database
 * 
 * Gestisce tutte le comunicazioni con il database Supabase.
 * Fornisce un'interfaccia unificata per tutte le operazioni CRUD
 * del sistema di gestione ferie.
 * 
 * Caratteristiche:
 * - Integrazione diretta con Supabase
 * - Row Level Security (RLS) automatica
 * - Gestione automatica errori
 * - Logging centralizzato per debugging
 * - Validazione automatica permessi
 * - Real-time subscriptions disponibili
 */

// Importa il client Supabase
import { supabase, getCurrentUser } from './supabase-client.js';

/**
 * Funzione helper per gestire errori Supabase in modo uniforme
 * 
 * @param {Object} error - Errore Supabase
 * @param {string} operation - Nome dell'operazione per logging
 * @returns {Object} - Oggetto errore standardizzato
 */
function handleSupabaseError(error, operation) {
    console.error(`Errore Supabase in ${operation}:`, error);
    return {
        success: false,
        message: error.message || 'Errore durante l\'operazione',
        error: error
    };
}

/**
 * Funzione helper per verificare l'autenticazione dell'utente
 * 
 * @returns {Promise<Object|null>} - Dati utente autenticato o null
 */
async function getAuthenticatedUser() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Utente non autenticato');
    }
    return user;
}

/**
 * OGGETTO API: Interfaccia Unificata per Comunicazione Server
 * 
 * Organizza tutte le funzioni API in categorie logiche per facilitare
 * la manutenzione e l'utilizzo. Ogni funzione incapsula la logica
 * di comunicazione con un endpoint specifico del server.
 * 
 * Struttura organizzativa:
 * 1. AUTENTICAZIONE - Login, logout, verifica sessioni
 * 2. GESTIONE RICHIESTE - CRUD richieste ferie utenti
 * 3. AMMINISTRAZIONE - Funzioni riservate ai SUPERUSER
 * 4. SOSPENSIONI - Gestione periodi accademici
 * 5. UTILITÀ - Funzioni di supporto e validazione
 * 
 * Pattern di utilizzo:
 * - Tutte le funzioni sono asincrone (async/await)
 * - Ritornano sempre oggetti con proprietà 'success'
 * - Gestiscono automaticamente errori di rete
 * - Loggano operazioni per debugging
 */
const API = {
  // ==================== SEZIONE AUTENTICAZIONE ====================
  
  /**
   * Verifica le credenziali di login dell'utente con Supabase
   * 
   * Utilizza Supabase Auth per autenticare l'utente e recupera
   * i dati aggiuntivi dalla tabella utenti.
   * 
   * @param {string} email - Email dell'utente (username)
   * @param {string} password - Password in chiaro
   * @returns {Promise<Object>} - Oggetto con success, message e dati utente
   */
  verificaCredenziali: async function(email, password) {
    try {
      // AUTENTICAZIONE SUPABASE: Effettua login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (authError) {
        return {
          success: false,
          message: 'Credenziali non valide'
        };
      }

      // RECUPERO DATI UTENTE: Ottiene dati aggiuntivi dalla tabella utenti
      const { data: userDataArray, error: userError } = await supabase
        .from('users')
        .select('id, username, nome, ruolo')
        .eq('email', email)
        .order('id')
        .limit(1);
      
      const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
      
      if (!userData) {
        return {
          success: false,
          message: 'Utente non trovato'
        };
      }

      if (userError) {
        return handleSupabaseError(userError, 'recupero dati utente');
      }

      return {
        success: true,
        message: 'Login effettuato con successo',
        user: userData
      };

    } catch (error) {
      return handleSupabaseError(error, 'verificaCredenziali');
    }
  },

  /**
   * Recupera i dati completi dell'utente autenticato da Supabase
   * 
   * Utilizzata per aggiornare i dati utente in sessione
   * o per verificare permessi specifici.
   * 
   * @param {string} email - Email dell'utente di cui recuperare i dati
   * @returns {Promise<Object>} - Dati completi dell'utente
   */
  getDatiUtente: async function(email) {
    try {
      const { data: userDataArray, error } = await supabase
        .from('users')
        .select('id, username, nome, ruolo')
        .eq('email', email)
        .order('id')
        .limit(1);
      
      const data = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
      
      if (!data) {
        return {
          success: false,
          message: 'Utente non trovato'
        };
      }

      if (error) {
        return handleSupabaseError(error, 'getDatiUtente');
      }

      return {
        success: true,
        user: data
      };

    } catch (error) {
      return handleSupabaseError(error, 'getDatiUtente');
    }
  },

  // ========== GESTIONE RICHIESTE FERIE ==========
  
  /**
   * Recupera tutte le richieste di ferie dell'utente da Supabase
   * 
   * Ottiene dal database l'elenco completo delle richieste
   * dell'utente autenticato, inclusi tutti gli stati
   * (approvate, pendenti, rifiutate).
   * 
   * @param {string} username - Nome utente di cui recuperare le richieste
   * @returns {Promise<Object>} - Array di richieste con dettagli completi
   */
  getRichieste: async function(username) {
    try {
      // Prima ottieni l'ID dell'utente
      const { data: userRecordArray, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .order('id')
        .limit(1);
      
      const userRecord = userRecordArray && userRecordArray.length > 0 ? userRecordArray[0] : null;
      
      if (!userRecord) {
        return {
          success: false,
          message: 'Utente non trovato'
        };
      }
      
      if (userError) {
        return handleSupabaseError(userError, 'getRichieste');
      }
      
      const { data, error } = await supabase
        .from('richieste')
        .select('id, user_id, tipo, data_inizio, data_fine, giorni, stato, motivazione, data_richiesta, approvata_da, data_approvazione')
        .eq('user_id', userRecord.id)
        .order('data_inizio', { ascending: false });

      if (error) {
        return handleSupabaseError(error, 'getRichieste');
      }

      return {
        success: true,
        richieste: data
      };

    } catch (error) {
      return handleSupabaseError(error, 'getRichieste');
    }
  },

  /**
   * Invia una nuova richiesta di ferie a Supabase
   * 
   * Crea una nuova richiesta nel database con tutti i dettagli
   * forniti dall'utente. Supabase valida i dati automaticamente.
   * 
   * @param {Object} richiesta - Oggetto con tutti i dati della richiesta
   * @param {string} richiesta.username - Nome utente richiedente
   * @param {string} richiesta.tipo - Tipo di permesso (ferie, malattia, ecc.)
   * @param {string} richiesta.data_inizio - Data inizio in formato ISO
   * @param {string} richiesta.data_fine - Data fine in formato ISO
   * @param {string} richiesta.motivazione - Motivazione della richiesta
   * @returns {Promise<Object>} - Conferma creazione con ID richiesta
   */
  inviaRichiesta: async function(richiesta) {
    try {
      // Prima ottieni l'ID dell'utente
      const { data: userRecordArray, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', richiesta.username)
        .order('id')
        .limit(1);
      
      const userRecord = userRecordArray && userRecordArray.length > 0 ? userRecordArray[0] : null;
      
      if (!userRecord) {
        return {
          success: false,
          message: 'Utente non trovato'
        };
      }
      
      if (userError) {
        return handleSupabaseError(userError, 'inviaRichiesta');
      }
      
      const { data, error } = await supabase
        .from('richieste')
        .insert([{
          user_id: userRecord.id,
          tipo: richiesta.tipo,
          data_inizio: richiesta.data_inizio,
          data_fine: richiesta.data_fine,
          motivazione: richiesta.motivazione,
          stato: 'pendente',
          data_richiesta: new Date().toISOString()
        }])
        .select();

      if (error) {
        return handleSupabaseError(error, 'inviaRichiesta');
      }

      return {
        success: true,
        message: 'Richiesta inviata con successo',
        richiesta: data[0]
      };

    } catch (error) {
      return handleSupabaseError(error, 'inviaRichiesta');
    }
  },

  /**
   * Modifica una richiesta esistente in Supabase
   * 
   * Aggiorna i dati di una richiesta già presente nel database.
   * Possibile solo per richieste in stato "pendente".
   * 
   * @param {number} id - ID della richiesta da modificare
   * @param {Object} richiesta - Nuovi dati della richiesta
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  modificaRichiesta: async function(id, richiesta) {
    try {
      const { data, error } = await supabase
        .from('richieste')
        .update({
          tipo: richiesta.tipo,
          data_inizio: richiesta.data_inizio,
          data_fine: richiesta.data_fine,
          motivazione: richiesta.motivazione
        })
        .eq('id', id)
        .eq('stato', 'pendente')
        .select();

      if (error) {
        return handleSupabaseError(error, 'modificaRichiesta');
      }

      if (data.length === 0) {
        return {
          success: false,
          message: 'Richiesta non trovata o non modificabile'
        };
      }

      return {
        success: true,
        message: 'Richiesta modificata con successo',
        richiesta: data[0]
      };

    } catch (error) {
      return handleSupabaseError(error, 'modificaRichiesta');
    }
  },
  
  /**
   * Calcola automaticamente i giorni di ferie per un periodo
   * 
   * Utilizza una logica client-side per calcolare il numero esatto
   * di giorni lavorativi in un periodo, escludendo weekend.
   * 
   * @param {string} dataInizio - Data inizio periodo
   * @param {string} dataFine - Data fine periodo
   * @returns {Promise<Object>} - Numero giorni calcolati
   */
  esplodiFerie: async function(dataInizio, dataFine) {
    try {
      const start = new Date(dataInizio);
      const end = new Date(dataFine);
      let giorni = 0;
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Esclude sabato (6) e domenica (0)
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          giorni++;
        }
      }

      return {
        success: true,
        giorni: giorni
      };

    } catch (error) {
      return {
        success: false,
        message: 'Errore nel calcolo dei giorni',
        error: error.message
      };
    }
  },

  /**
   * Elimina una richiesta dal database Supabase
   * 
   * Rimuove completamente una richiesta. Operazione irreversibile.
   * Possibile solo per richieste in stato "pendente".
   * 
   * @param {number} id - ID univoco della richiesta da eliminare
   * @returns {Promise<Object>} - Conferma eliminazione
   */
  eliminaRichiesta: async function(id) {
    try {
      const { data, error } = await supabase
        .from('richieste')
        .delete()
        .eq('id', id)
        .eq('stato', 'pendente')
        .select();

      if (error) {
        return handleSupabaseError(error, 'eliminaRichiesta');
      }

      if (data.length === 0) {
        return {
          success: false,
          message: 'Richiesta non trovata o non eliminabile'
        };
      }

      return {
        success: true,
        message: 'Richiesta eliminata con successo'
      };

    } catch (error) {
      return handleSupabaseError(error, 'eliminaRichiesta');
    }
  },

  /**
   * Approva o rifiuta una richiesta in Supabase (solo amministratori)
   * 
   * Cambia lo stato di una richiesta da "pendente" a "approvata"
   * o "rifiutata". Aggiorna automaticamente i totali ferie
   * dell'utente se approvata.
   * 
   * @param {number} id - ID della richiesta
   * @param {boolean} approvazione - true per approvare, false per rifiutare
   * @returns {Promise<Object>} - Risultato dell'operazione
   */
  approvaRichiesta: async function(id, approvazione) {
    try {
      // Verifica che l'utente abbia privilegi amministrativi
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata'
        };
      }

      const stato = approvazione ? 'approvata' : 'rifiutata';
      
      const { data, error } = await supabase
        .from('richieste')
        .update({
          stato: stato,
          data_approvazione: new Date().toISOString()
        })
        .eq('id', id)
        .eq('stato', 'pendente')
        .select();

      if (error) {
        return handleSupabaseError(error, 'approvaRichiesta');
      }

      if (data.length === 0) {
        return {
          success: false,
          message: 'Richiesta non trovata o già processata'
        };
      }

      return {
        success: true,
        message: `Richiesta ${stato} con successo`,
        richiesta: data[0]
      };

    } catch (error) {
      return handleSupabaseError(error, 'approvaRichiesta');
    }
  },

  // ========== FUNZIONI AMMINISTRATIVE (SOLO SUPERUSER) ==========
  
  /**
   * Ottiene l'elenco completo di tutti gli utenti del sistema da Supabase
   * Accessibile solo agli utenti con ruolo SUPERUSER
   * @returns {Promise<Object>} - Lista di tutti gli utenti registrati
   */
  getAllUsers: async function() {
    try {
      // Verifica che l'utente abbia privilegi amministrativi
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata'
        };
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, username, nome, ruolo')
        .order('nome', { ascending: true });

      if (error) {
        return handleSupabaseError(error, 'getAllUsers');
      }

      return {
        success: true,
        users: data
      };

    } catch (error) {
      return handleSupabaseError(error, 'getAllUsers');
    }
  },

  /**
   * Verifica se un utente ha già record inizializzati nella tabella FERIE in Supabase
   * Utilizzato prima di creare nuovi record per evitare duplicati
   * @param {string} username - Nome utente da verificare
   * @returns {Promise<Object>} - Risultato della verifica
   */
  checkUserFerie: async function(username) {
    try {
      // Prima ottieni l'ID dell'utente
      const { data: userRecordArray, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .order('id')
        .limit(1);
      
      const userRecord = userRecordArray && userRecordArray.length > 0 ? userRecordArray[0] : null;
      
      if (!userRecord) {
        return {
          success: false,
          message: 'Utente non trovato'
        };
      }
      
      if (userError) {
        return handleSupabaseError(userError, 'checkUserFerie');
      }
      
      const { data: ferieDataArray, error } = await supabase
        .from('ferie_balance')
        .select('user_id, ferie_totali, ferie_utilizzate, ferie_residue, ferie_vecchie, festivita, motivi_familiari, recuperi')
        .eq('user_id', userRecord.id)
        .order('id')
        .limit(1);
      
      const data = ferieDataArray && ferieDataArray.length > 0 ? ferieDataArray[0] : null;

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        return handleSupabaseError(error, 'checkUserFerie');
      }

      return {
        success: true,
        exists: !!data,
        totali: data
      };

    } catch (error) {
      return handleSupabaseError(error, 'checkUserFerie');
    }
  },

  /**
   * Inizializza i record di ferie per un nuovo utente in Supabase
   * Crea le righe base nella tabella FERIE con i totali iniziali
   * @param {Object} values - Valori iniziali per i totali ferie
   * @returns {Promise<Object>} - Risultato dell'inizializzazione
   */
  initializeUserFerie: async function(values) {
    try {
      const { data, error } = await supabase
        .from('ferie_balance')
        .insert([values])
        .select();

      if (error) {
        return handleSupabaseError(error, 'initializeUserFerie');
      }

      return {
        success: true,
        message: 'Totali ferie inizializzati con successo',
        totali: data[0]
      };

    } catch (error) {
      return handleSupabaseError(error, 'initializeUserFerie');
    }
  },

  /**
   * Aggiorna i totali delle ferie per un utente esistente in Supabase
   * Modifica i valori nella tabella FERIE (giorni disponibili, utilizzati, ecc.)
   * @param {Object} totals - Nuovi totali da impostare
   * @returns {Promise<Object>} - Risultato dell'aggiornamento
   */
  aggiornaTotali: async function(totals) {
    try {
      // Verifica che l'utente abbia privilegi amministrativi
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata'
        };
      }

      // Prima ottieni l'ID dell'utente
      const { data: userRecordArray, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', totals.username)
        .order('id')
        .limit(1);
      
      const userRecord = userRecordArray && userRecordArray.length > 0 ? userRecordArray[0] : null;
      
      if (!userRecord) {
        return {
          success: false,
          message: 'Utente non trovato'
        };
      }
      
      if (userError) {
        return handleSupabaseError(userError, 'aggiornaTotali');
      }
      
      // Rimuovi username dai totals e aggiungi user_id
      const { username, ...totalsWithoutUsername } = totals;
      const updatedTotals = { ...totalsWithoutUsername, user_id: userRecord.id };
      
      const { data, error } = await supabase
        .from('ferie_balance')
        .update(updatedTotals)
        .eq('user_id', userRecord.id)
        .select();

      if (error) {
        return handleSupabaseError(error, 'aggiornaTotali');
      }

      return {
        success: true,
        message: 'Totali aggiornati con successo',
        totali: data[0]
      };

    } catch (error) {
      return handleSupabaseError(error, 'aggiornaTotali');
    }
  },

  /**
   * Ottiene le richieste in stato pendente da Supabase
   * Utilizzato per verificare richieste non ancora approvate/rifiutate
   * @param {string} username - Nome utente (opzionale)
   * @returns {Promise<Object>} - Lista delle richieste pendenti
   */
  getRichiestePendenti: async function(username) {
    try {
      // Verifica che l'utente abbia privilegi amministrativi
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata'
        };
      }

      let query = supabase
        .from('richieste')
        .select('id, user_id, tipo, data_inizio, data_fine, giorni, stato, motivazione, data_richiesta')
        .eq('stato', 'pendente');
      
      if (username) {
        // Prima ottieni l'ID dell'utente
        const { data: userRecords, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .order('id')
          .limit(1);
        
        if (userError) {
          return handleSupabaseError(userError, 'getRichiestePendenti');
        }
        
        if (!userRecords || userRecords.length === 0) {
          return {
            success: false,
            message: 'Utente non trovato'
          };
        }
        
        const userRecord = userRecords[0];
        
        if (userError) {
          return handleSupabaseError(userError, 'getRichiestePendenti');
        }
        
        query = query.eq('user_id', userRecord.id);
      }
      
      query = query.order('data_richiesta', { ascending: true });

      const { data, error } = await query;

      if (error) {
        return handleSupabaseError(error, 'getRichiestePendenti');
      }

      return {
        success: true,
        richieste: data
      };

    } catch (error) {
      return handleSupabaseError(error, 'getRichiestePendenti');
    }
  },

  /**
   * Ottiene l'elenco completo degli utenti per la gestione amministrativa da Supabase
   * @returns {Promise<Object>} - Lista degli utenti con tutti i dettagli
   */
  getUsers: async function() {
    try {
      // Verifica che l'utente abbia privilegi amministrativi
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata'
        };
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, username, nome, ruolo')
        .order('nome', { ascending: true });

      if (error) {
        return handleSupabaseError(error, 'getUsers');
      }

      return {
        success: true,
        users: data
      };

    } catch (error) {
      return handleSupabaseError(error, 'getUsers');
    }
  },

  /**
   * Crea un nuovo utente nel sistema Supabase
   * @param {Object} userData - Dati del nuovo utente (username, nome, ruolo, ecc.)
   * @returns {Promise<Object>} - Risultato della creazione
   */
  createUser: async function(userData) {
    try {
      // Verifica che l'utente abbia privilegi amministrativi
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'DS', 'DSGA', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata'
        };
      }

      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select();

      if (error) {
        return handleSupabaseError(error, 'createUser');
      }

      return {
        success: true,
        message: 'Utente creato con successo',
        user: data[0]
      };

    } catch (error) {
      return handleSupabaseError(error, 'createUser');
    }
  },

  /**
   * Aggiorna i dati di un utente esistente in Supabase
   * @param {number} userId - ID dell'utente da aggiornare
   * @param {Object} userData - Nuovi dati dell'utente
   * @returns {Promise<Object>} - Risultato dell'aggiornamento
   */
  updateUser: async function(userId, userData) {
    try {
      // Verifica che l'utente abbia privilegi amministrativi
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'DS', 'DSGA', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata'
        };
      }

      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select();

      if (error) {
        return handleSupabaseError(error, 'updateUser');
      }

      return {
        success: true,
        message: 'Utente aggiornato con successo',
        user: data[0]
      };

    } catch (error) {
      return handleSupabaseError(error, 'updateUser');
    }
  },
    
    // ========== GESTIONE SOSPENSIONI ACCADEMICHE ==========
    
    /**
     * Ottiene tutte le sospensioni accademiche configurate da Supabase
     * Le sospensioni sono periodi in cui non si possono richiedere ferie
     * @returns {Promise<Object>} - Lista delle sospensioni attive
     */
    getSospensioni: async function() {
      try {
        const { data, error } = await supabase
          .from('sospensioni')
          .select('id, data_inizio, data_fine, descrizione, attiva')
          .order('data_inizio', { ascending: true });

        if (error) {
          return handleSupabaseError(error, 'getSospensioni');
        }

        return {
          success: true,
          sospensioni: data
        };

      } catch (error) {
        return handleSupabaseError(error, 'getSospensioni');
      }
    },
    
    /**
     * Salva una nuova sospensione accademica in Supabase
     * @param {Object} sospensione - Dati della sospensione (date, descrizione)
     * @returns {Promise<Object>} - Risultato del salvataggio
     */
    salvaSospensione: async function(sospensione) {
      try {
        // Verifica che l'utente abbia privilegi amministrativi
        const user = await getAuthenticatedUser();
        if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
          return {
            success: false,
            message: 'Operazione non autorizzata'
          };
        }

        const { data, error } = await supabase
          .from('sospensioni')
          .insert([sospensione])
          .select();

        if (error) {
          return handleSupabaseError(error, 'salvaSospensione');
        }

        return {
          success: true,
          message: 'Sospensione salvata con successo',
          sospensione: data[0]
        };

      } catch (error) {
        return handleSupabaseError(error, 'salvaSospensione');
      }
    },
    
    /**
     * Modifica una sospensione accademica esistente in Supabase
     * @param {number} id - ID della sospensione da modificare
     * @param {Object} sospensione - Nuovi dati della sospensione
     * @returns {Promise<Object>} - Risultato della modifica
     */
    modificaSospensione: async function(id, sospensione) {
      try {
        // Verifica che l'utente abbia privilegi amministrativi
        const user = await getAuthenticatedUser();
        if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
          return {
            success: false,
            message: 'Operazione non autorizzata'
          };
        }

        const { data, error } = await supabase
          .from('sospensioni')
          .update(sospensione)
          .eq('id', id)
          .select();

        if (error) {
          return handleSupabaseError(error, 'modificaSospensione');
        }

        return {
          success: true,
          message: 'Sospensione modificata con successo',
          sospensione: data[0]
        };

      } catch (error) {
        return handleSupabaseError(error, 'modificaSospensione');
      }
    },
    
    /**
     * Elimina una sospensione accademica da Supabase
     * @param {number} id - ID della sospensione da eliminare
     * @returns {Promise<Object>} - Risultato dell'eliminazione
     */
    eliminaSospensione: async function(id) {
      try {
        // Verifica che l'utente abbia privilegi amministrativi
        const user = await getAuthenticatedUser();
        if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
          return {
            success: false,
            message: 'Operazione non autorizzata'
          };
        }

        const { data, error } = await supabase
          .from('sospensioni')
          .delete()
          .eq('id', id)
          .select();

        if (error) {
          return handleSupabaseError(error, 'eliminaSospensione');
        }

        return {
          success: true,
          message: 'Sospensione eliminata con successo'
        };

      } catch (error) {
        return handleSupabaseError(error, 'eliminaSospensione');
      }
    },

  /**
   * Elimina definitivamente un utente dal sistema Supabase
   * @param {number} userId - ID dell'utente da eliminare
   * @returns {Promise<Object>} - Risultato dell'eliminazione
   */
  deleteUser: async function(userId) {
    try {
      // Verifica che l'utente abbia privilegi di eliminazione (SUPERUSER e admin)
      const user = await getAuthenticatedUser();
      if (!['SUPERUSER', 'admin'].includes(user.ruolo)) {
        return {
          success: false,
          message: 'Operazione non autorizzata - solo SUPERUSER e admin possono eliminare utenti'
        };
      }

      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .select();

      if (error) {
        return handleSupabaseError(error, 'deleteUser');
      }

      return {
        success: true,
        message: 'Utente eliminato con successo'
      };

    } catch (error) {
      return handleSupabaseError(error, 'deleteUser');
    }
  }
};

// Esportazione per compatibilità con diversi ambienti
if (typeof module !== 'undefined' && module.exports) {
  // Ambiente Node.js
  module.exports = { API, handleSupabaseError, getAuthenticatedUser };
} else {
  // Ambiente Browser - rende API disponibile globalmente
  window.API = API;
  window.handleSupabaseError = handleSupabaseError;
  window.getAuthenticatedUser = getAuthenticatedUser;
}