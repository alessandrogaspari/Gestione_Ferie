/**
 * adm_richieste.js - Gestione della pagina di dettaglio delle richieste
 */

// Variabili globali
let currentUsername = null;
let displayName = null;

document.addEventListener('DOMContentLoaded', function() {
    // Verifica che l'utente sia un SUPERUSER
    const userData = UserUtils.getUserData();
    if (!userData || userData.ruolo !== 'SUPERUSER') {
        window.location.href = 'index.html';
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
 * Carica i dati dell'utente e le sue richieste
 */
async function loadUserData() {
    try {
        // Ottieni i dati dell'utente
        const userResponse = await API.getDatiUtente(currentUsername);
        if (!userResponse.success) {
            showError('Errore nel caricamento dei dati utente: ' + userResponse.message);
            return;
        }
        
        // Imposta il nome dell'utente nella pagina
        document.getElementById('user-name').textContent = displayName || userResponse.data.userData.nome || currentUsername;
        
        // Ottieni le richieste dell'utente
        const requestsResponse = await API.getRichieste(currentUsername);
        if (!requestsResponse.success) {
            showError('Errore nel caricamento delle richieste: ' + requestsResponse.message);
            return;
        }
        
        // Visualizza le richieste
        displayRequests(requestsResponse.richieste);
    } catch (error) {
        showError('Errore nel caricamento dei dati: ' + error.message);
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
    
    // Ordina le richieste per data (più recenti prima)
    requests.sort((a, b) => new Date(b.dataRichiesta) - new Date(a.dataRichiesta));
    
    requests.forEach(request => {
        // Clona il template della riga
        const template = document.getElementById('request-row-template');
        const requestRow = document.importNode(template.content, true);
        
        // Imposta i dati della richiesta
        requestRow.querySelector('.request-type').textContent = request.tipo;
        requestRow.querySelector('.date-from').textContent = new Date(request.dataInizio).toLocaleDateString();
        requestRow.querySelector('.date-to').textContent = new Date(request.dataFine).toLocaleDateString();
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
                const response = await API.approvaRichiesta(request.id, { 
                    stato: 'APPROVATO',
                    username: userData.username,
                    note: ''
                });
                if (response.success) {
                    loadUserData(); // Ricarica i dati per aggiornare la tabella
                } else {
                    showError('Errore nell\'approvazione della richiesta: ' + response.message);
                }
            } catch (error) {
                showError('Errore nell\'approvazione della richiesta: ' + error.message);
            }
        });
        
        // Aggiungi event listener per il pulsante RIFIUTATO
        btnRifiuta.addEventListener('click', async () => {
            try {
                const userData = UserUtils.getUserData();
                const response = await API.approvaRichiesta(request.id, { 
                    stato: 'RIFIUTATO',
                    username: userData.username,
                    note: ''
                });
                if (response.success) {
                    loadUserData(); // Ricarica i dati per aggiornare la tabella
                } else {
                    showError('Errore nel rifiuto della richiesta: ' + response.message);
                }
            } catch (error) {
                showError('Errore nel rifiuto della richiesta: ' + error.message);
            }
        });
        
        // Aggiungi event listener per il pulsante ELIMINA
        btnElimina.addEventListener('click', async () => {
            if (confirm('Sei sicuro di voler eliminare questa richiesta?')) {
                try {
                    const response = await API.eliminaRichiesta(request.id);
                    if (response.success) {
                        loadUserData(); // Ricarica i dati per aggiornare la tabella
                    } else {
                        showError('Errore nell\'eliminazione della richiesta: ' + response.message);
                    }
                } catch (error) {
                    showError('Errore nell\'eliminazione della richiesta: ' + error.message);
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