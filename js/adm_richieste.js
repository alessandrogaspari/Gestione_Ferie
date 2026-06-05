/**
 * adm_richieste.js - Gestione della pagina di dettaglio delle richieste - Integrato con Supabase
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';
// Importa le utility per la gestione utente
import { UserUtils } from './user-utils.js';

// Espone UserUtils globalmente per l'uso negli eventi onclick dell'HTML
window.UserUtils = UserUtils;

// Variabili globali
let currentUsername = null;
let displayName = null;

document.addEventListener('DOMContentLoaded', function() {
    // Inizializza il nome utente nell'header
    UserUtils.initializeUserName();
    
    // Verifica che l'utente sia SUPERUSER o admin
    const userData = UserUtils.getUserData();
    if (!userData || !['SUPERUSER', 'admin'].includes(userData.ruolo)) {
        // Reindirizza gli altri utenti alla dashboard normale
        if (userData && ['DS', 'DSGA', 'ASSISTENTI AMMINISTRATIVI', 'ASSISTENTI TECNICI', 'COLLABORATORI SCOLASTICI'].includes(userData.ruolo)) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
        return;
    }
    
    // Ottieni l'username e il displayName dalla query string
    const urlParams = new URLSearchParams(window.location.search);
    currentUsername = urlParams.get('username');
    displayName = urlParams.get('displayName');
    
    if (!currentUsername) {
        window.location.href = 'adm_dashboard.html';
        return;
    }
    
    // Carica i dati dell'utente e le sue richieste
    loadUserData();
});

/**
 * Carica i dati dell'utente e le sue richieste da Supabase
 */
async function loadUserData() {
    try {
        // RECUPERO DATI UTENTE: Query diretta a Supabase
        const { data: userDataArray, error: userError } = await supabase
            .from('users')
            .select('id, username, nome, ruolo')
            .eq('username', currentUsername)
            .limit(1);
        
        const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
        
        if (!userData) {
            showError('Utente non trovato');
            return;
        }
        
        if (userError) {
            showError('Errore nel caricamento dei dati utente: ' + userError.message);
            return;
        }
        
        // Imposta il nome dell'utente nella pagina
        document.getElementById('user-name').textContent = displayName || userData.nome || currentUsername;
        
        // RECUPERO RICHIESTE: Query diretta a Supabase
        const { data: requests, error: requestsError } = await supabase
            .from('richieste')
            .select('id, user_id, tipo, data_inizio, data_fine, giorni, stato, approvata_da, data_approvazione, created_at')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false });
        
        if (requestsError) {
            showError('Errore nel caricamento delle richieste: ' + requestsError.message);
            return;
        }
        
        console.log('Richieste caricate da Supabase:', requests);
        
        // Visualizza le richieste
        displayRequests(requests || []);
        
    } catch (error) {
        console.error('Errore nel caricamento dei dati da Supabase:', error);
        showError('Errore nel caricamento dei dati: ' + (error.message || 'Errore sconosciuto'));
    }
}

/**
 * Visualizza le richieste dell'utente
 * @param {Array} requests - Array delle richieste da visualizzare
 */
function displayRequests(requests) {
    const tableBody = document.getElementById('requests-table-body');
    tableBody.innerHTML = '';
    
    if (!requests || requests.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="6" style="text-align: center;">Nessuna richiesta trovata per questo utente.</td>';
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Le richieste sono già ordinate per data dalla query Supabase
    
    requests.forEach(request => {
        // Clona il template della riga
        const template = document.getElementById('request-row-template');
        const requestRow = document.importNode(template.content, true);
        
        // Imposta i dati della richiesta (adattati ai nomi dei campi Supabase)
        requestRow.querySelector('.request-type').textContent = request.tipo;
        requestRow.querySelector('.date-from').textContent = new Date(request.data_inizio).toLocaleDateString();
        requestRow.querySelector('.date-to').textContent = new Date(request.data_fine).toLocaleDateString();
        requestRow.querySelector('.days-count').textContent = request.giorni;
        requestRow.querySelector('.request-status').textContent = request.stato || 'IN ATTESA';
        
        // Configura i pulsanti delle azioni
        const btnApprova = requestRow.querySelector('.btn-approve');
        const btnRifiuta = requestRow.querySelector('.btn-reject');
        const btnElimina = requestRow.querySelector('.btn-delete');
        
        // Aggiungi event listener per il pulsante APPROVATO
        btnApprova.addEventListener('click', async () => {
            try {
                const userData = UserUtils.getUserData();
                
                // AGGIORNAMENTO STATO: Update diretta su Supabase
                const { error } = await supabase
                    .from('richieste')
                    .update({ 
                        stato: 'APPROVATA',
                        approvata_da: userData.id,
                        data_approvazione: new Date().toISOString().split('T')[0]
                    })
                    .eq('id', request.id);
                
                if (error) {
                    throw error;
                }
                
                loadUserData(); // Ricarica i dati per aggiornare la tabella
                
            } catch (error) {
                console.error('Errore nell\'approvazione della richiesta:', error);
                showError('Errore nell\'approvazione della richiesta: ' + (error.message || 'Errore sconosciuto'));
            }
        });
        
        // Aggiungi event listener per il pulsante RIFIUTATO
        btnRifiuta.addEventListener('click', async () => {
            try {
                const userData = UserUtils.getUserData();
                
                // AGGIORNAMENTO STATO: Update diretta su Supabase
                const { error } = await supabase
                    .from('richieste')
                    .update({ 
                        stato: 'RIFIUTATA',
                        approvata_da: userData.id,
                        data_approvazione: new Date().toISOString().split('T')[0]
                    })
                    .eq('id', request.id);
                
                if (error) {
                    throw error;
                }
                
                loadUserData(); // Ricarica i dati per aggiornare la tabella
                
            } catch (error) {
                console.error('Errore nel rifiuto della richiesta:', error);
                showError('Errore nel rifiuto della richiesta: ' + (error.message || 'Errore sconosciuto'));
            }
        });
        
        // Aggiungi event listener per il pulsante ELIMINA
        btnElimina.addEventListener('click', async () => {
            if (confirm('Sei sicuro di voler eliminare questa richiesta?')) {
                try {
                    // ELIMINAZIONE RICHIESTA: Delete diretta su Supabase
                    const { error } = await supabase
                        .from('richieste')
                        .delete()
                        .eq('id', request.id);
                    
                    if (error) {
                        throw error;
                    }
                    
                    loadUserData(); // Ricarica i dati per aggiornare la tabella
                    
                } catch (error) {
                    console.error('Errore nell\'eliminazione della richiesta:', error);
                    showError('Errore nell\'eliminazione della richiesta: ' + (error.message || 'Errore sconosciuto'));
                }
            }
        });
        
        // Aggiungi la riga alla tabella
        tableBody.appendChild(requestRow);
    });
}

/**
 * Mostra un messaggio di errore
 * @param {string} message - Messaggio di errore da mostrare
 */
function showError(message) {
    // Implementare la visualizzazione degli errori
    console.error(message);
    alert(message);
}