// Funzione generica per chiamare le API
async function call(action, data = {}) {
  try {
    const response = await fetch(`http://localhost:8081/api/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Errore HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Errore nella chiamata API ${action}:`, error);
    return { success: false, message: error.message };
  }
}

// Definizione dell'oggetto API con tutte le funzioni
const API = {
  // Verifica le credenziali dell'utente
  verificaCredenziali: async function(username, password) {
    return await call('verificaCredenziali', { username, password });
  },

  // Ottiene i dati dell'utente
  getDatiUtente: async function(username) {
    return await call('getDatiUtente', { username });
  },

  // Ottiene le richieste dell'utente
  getRichieste: async function(username) {
    return await call('getRichieste', { username });
  },

  // Invia una nuova richiesta
  inviaRichiesta: async function(richiesta) {
    return await call('inviaRichiesta', { richiesta });
  },

  // Modifica una richiesta esistente
  modificaRichiesta: async function(id, richiesta) {
    return await call('modificaRichiesta', { id, richiesta });
  },

  // Elimina una richiesta
  eliminaRichiesta: async function(id) {
    return await call('eliminaRichiesta', { id });
  },

  // Approva o rifiuta una richiesta
  approvaRichiesta: async function(id, approvazione) {
    return await call('approvaRichiesta', { id, approvazione });
  },

  // Ottiene l'elenco di tutti gli utenti (solo per SUPERUSER)
  getAllUsers: async function() {
    return await call('getAllUsers');
  },

  // Verifica se un utente ha record nella tabella FERIE
  checkUserFerie: async function(username) {
    return await call('checkUserFerie', { username });
  },

  // Inizializza i record di ferie per un utente
  initializeUserFerie: async function(values) {
    return await call('initializeUserFerie', values);
  },

  // Aggiorna i totali delle ferie per un utente
  aggiornaTotali: async function(totals) {
    return await call('aggiornaTotali', { totals });
  },

  // Ottiene le richieste pendenti per un utente
  getRichiestePendenti: async function(username) {
    return await call('getRichiestePendenti', { username });
  }
};

// Esporta le funzioni in base all'ambiente di esecuzione
if (typeof window !== 'undefined') {
  // Ambiente browser
  window.API = API;
} else if (typeof module !== 'undefined' && module.exports) {
  // Ambiente Node.js
  module.exports = API;
}