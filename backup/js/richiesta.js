/**
 * Gestione del form di richiesta ferie
 */

// Verifica se l'utente è autenticato
UserUtils.checkAuth();

// Elementi DOM
const form = document.getElementById('richiesta-form');
const tipoFerieSelect = document.getElementById('tipo-ferie');
const dataInizioInput = document.getElementById('data-inizio');
const dataFineInput = document.getElementById('data-fine');
const giorniInput = document.getElementById('giorni');
const giorniLavorativiInput = document.getElementById('giorni-lavorativi');
const noteTextarea = document.getElementById('note');
const userNameSpan = document.getElementById('user-name');
const userRoleSpan = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');
const disponibilitaValue = document.getElementById('disponibilita-value');
const cardHeader = document.querySelector('.card-header h2');
const submitButton = document.querySelector('button[type="submit"]');

// Elementi per il riepilogo giorni
const summaryTotale = document.getElementById('summary-totale');
const summaryLavorativi = document.getElementById('summary-lavorativi');
const summaryFestivi = document.getElementById('summary-festivi');

// Verifica se siamo in modalità modifica (presenza di ID nell'URL)
const urlParams = new URLSearchParams(window.location.search);
const richiestaId = urlParams.get('id');
let richiestaOriginale = null;
let modalitaModifica = false;

if (richiestaId) {
    modalitaModifica = true;
    // Cambia il titolo e il testo del pulsante per indicare la modalità modifica
    cardHeader.textContent = 'Modifica Richiesta';
    cardHeader.style.color = '#e67e22'; // Colore arancione per evidenziare la modalità modifica
    submitButton.textContent = 'Aggiorna Richiesta';
    
    // Aggiungi un indicatore visivo che siamo in modalità modifica
    const cardBody = document.querySelector('.card-body');
    const modalitaIndicator = document.createElement('div');
    modalitaIndicator.className = 'modalita-modifica';
    modalitaIndicator.textContent = 'Modalità Modifica';
    modalitaIndicator.style.backgroundColor = '#e67e22';
    modalitaIndicator.style.color = 'white';
    modalitaIndicator.style.padding = '5px 10px';
    modalitaIndicator.style.borderRadius = '3px';
    modalitaIndicator.style.marginBottom = '15px';
    modalitaIndicator.style.textAlign = 'center';
    modalitaIndicator.style.fontWeight = 'bold';
    cardBody.insertBefore(modalitaIndicator, cardBody.firstChild);
}

// Carica i dati dell'utente usando la utility
UserUtils.initUserUI();

// Aggiungi event listener per il logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        UserUtils.logout();
    });
}

/**
 * Carica i dati della richiesta da modificare
 */
async function caricaRichiestaEsistente() {
    if (!richiestaId) return;
    
    try {
        const user = UserUtils.getUserData();
        if (!user) return;
        
        // Ottieni tutte le richieste dell'utente
        const response = await API.getRichieste(user.username);
        if (response.success && response.richieste) {
            // Trova la richiesta con l'ID specificato
            const richiesta = response.richieste.find(r => r.id == richiestaId);
            
            if (richiesta) {
                richiestaOriginale = richiesta;
                
                // Popola il form con i dati della richiesta
                tipoFerieSelect.value = richiesta.tipo;
                dataInizioInput.value = richiesta.dataInizio;
                dataFineInput.value = richiesta.dataFine;
                noteTextarea.value = richiesta.note || '';
                
                // Calcola i giorni
                calcolaGiorni();
                
                // Aggiorna la disponibilità
                caricaDisponibilita();
                
                // Verifica se la richiesta è modificabile (solo se IN ATTESA)
                if (richiesta.stato !== 'IN ATTESA') {
                    alert('Attenzione: questa richiesta è già stata ' + richiesta.stato.toLowerCase() + ' e non può essere modificata.');
                    // Disabilita i campi del form
                    tipoFerieSelect.disabled = true;
                    dataInizioInput.disabled = true;
                    dataFineInput.disabled = true;
                    noteTextarea.disabled = true;
                    submitButton.disabled = true;
                }
            } else {
                alert('Richiesta non trovata o non autorizzata.');
                window.location.href = 'dashboard.html';
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento della richiesta:', error);
        alert('Errore nel caricamento della richiesta: ' + error.message);
    }
}

// Se siamo in modalità modifica, carica la richiesta esistente
if (modalitaModifica) {
    caricaRichiestaEsistente();
}

/**
 * Carica i dati di disponibilità dell'utente
 */
async function caricaDisponibilita() {
    try {
        const user = UserUtils.getUserData();
        if (!user) return;
        
        const response = await API.getDatiUtente(user.username);
        if (response.success) {
            const userData = response.data.userData;
            
            // Aggiorna la disponibilità in base al tipo selezionato
            updateDisponibilita(userData);
        }
    } catch (error) {
        console.error('Errore nel caricamento delle disponibilità:', error);
    }
}

// Carica le disponibilità al caricamento della pagina
caricaDisponibilita();

/**
 * Aggiorna la disponibilità in base al tipo di assenza selezionato
 */
function updateDisponibilita(userData) {
    if (!userData) return;
    
    const tipoSelezionato = tipoFerieSelect.value;
    let disponibili = '--';
    
    switch(tipoSelezionato) {
        case 'FERIE':
            disponibili = userData.ferie.disponibili;
            break;
        case 'FERIE VECCHIE':
            disponibili = userData.ferieVecchie.disponibili;
            break;
        case 'FESTIVITA\' SOPPRESSE':
            disponibili = userData.festivita.disponibili;
            break;
        case 'MOTIVI FAMILIARI':
            disponibili = userData.motiviFamiliari.disponibili;
            break;
        case 'RECUPERI':
            disponibili = userData.recuperi.disponibili;
            break;
        default:
            disponibili = '--';
    }
    
    disponibilitaValue.textContent = disponibili;
}

// Event listener per il cambio del tipo di assenza
tipoFerieSelect.addEventListener('change', async function() {
    const user = UserUtils.getUserData();
    if (!user) return;
    
    const response = await API.getDatiUtente(user.username);
    if (response.success) {
        updateDisponibilita(response.data.userData);
    }
});

/**
 * Calcola i giorni tra due date
 */
function calcolaGiorni() {
    const dataInizio = dataInizioInput.value ? new Date(dataInizioInput.value) : null;
    const dataFine = dataFineInput.value ? new Date(dataFineInput.value) : null;

    if (dataInizio && dataFine) {
        if (dataFine < dataInizio) {
            alert('La data di fine non può essere precedente alla data di inizio');
            dataFineInput.value = dataInizioInput.value;
            calcolaGiorni();
            return;
        }

        // Calcola i giorni totali
        const diffTime = Math.abs(dataFine - dataInizio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (giorniInput) giorniInput.value = diffDays;
        
        // Calcola i giorni lavorativi usando la funzione di holidays.js
        const giorniLavorativi = Holidays.calcolaGiorniLavorativi(dataInizio, dataFine);
        giorniLavorativiInput.value = giorniLavorativi;
        
        // Aggiorna il riepilogo
        summaryTotale.textContent = diffDays;
        summaryLavorativi.textContent = giorniLavorativi;
        summaryFestivi.textContent = diffDays - giorniLavorativi;
    } else {
        if (giorniInput) giorniInput.value = '';
        giorniLavorativiInput.value = '';
        summaryTotale.textContent = '0';
        summaryLavorativi.textContent = '0';
        summaryFestivi.textContent = '0';
    }
}

// Event listeners per il calcolo dei giorni
dataInizioInput.addEventListener('change', calcolaGiorni);
dataFineInput.addEventListener('change', calcolaGiorni);

// Aggiungi event listeners per il calcolo in tempo reale
dataInizioInput.addEventListener('input', function() {
    // Verifica se entrambe le date sono state inserite
    if (dataInizioInput.value && dataFineInput.value) {
        calcolaGiorni();
    }
});

dataFineInput.addEventListener('input', function() {
    // Verifica se entrambe le date sono state inserite
    if (dataInizioInput.value && dataFineInput.value) {
        calcolaGiorni();
    }
});

// Event listener per l'invio del form
form.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Validazione del form
    if (!tipoFerieSelect.value) {
        alert('Seleziona il tipo di assenza');
        return;
    }

    if (!dataInizioInput.value) {
        alert('Inserisci la data di inizio');
        return;
    }

    if (!dataFineInput.value) {
        alert('Inserisci la data di fine');
        return;
    }

    // Ottieni i dati dell'utente da sessionStorage
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
        alert('Sessione utente non valida. Effettua nuovamente il login.');
        window.location.href = 'index.html';
        return;
    }

    // Prepara i dati della richiesta
    const richiesta = {
        username: user.username,
        tipo: tipoFerieSelect.value,
        dataInizio: dataInizioInput.value,
        dataFine: dataFineInput.value,
        giorni: parseFloat(giorniLavorativiInput.value), // Usa i giorni lavorativi invece del totale
        note: noteTextarea.value,
        stato: 'IN ATTESA',
        dataRichiesta: new Date().toISOString().split('T')[0]
    };

    try {
        // Verifica disponibilità giorni
        const datiUtente = await API.getDatiUtente(user.username);
        
        if (datiUtente.success) {
            let disponibili = 0;
            
            // Verifica disponibilità in base al tipo di richiesta
            switch(richiesta.tipo) {
                case 'FERIE':
                    disponibili = datiUtente.data.userData.ferie.disponibili;
                    break;
                case 'FERIE VECCHIE':
                    disponibili = datiUtente.data.userData.ferieVecchie.disponibili;
                    break;
                case 'FESTIVITA\' SOPPRESSE':
                    disponibili = datiUtente.data.userData.festivita.disponibili;
                    break;
                case 'MOTIVI FAMILIARI':
                    disponibili = datiUtente.data.userData.motiviFamiliari.disponibili;
                    break;
                case 'RECUPERI':
                    disponibili = datiUtente.data.userData.recuperi;
                    break;
            }
            
            // Se siamo in modalità modifica e il tipo di richiesta è lo stesso, consideriamo i giorni già utilizzati
            if (modalitaModifica && richiestaOriginale && richiestaOriginale.tipo === richiesta.tipo) {
                disponibili += richiestaOriginale.giorni; // Aggiungiamo i giorni della richiesta originale che stiamo modificando
            }
            
            if (richiesta.giorni > disponibili) {
                alert(`Non hai giorni sufficienti disponibili per questa richiesta. Disponibili: ${disponibili}, Richiesti: ${richiesta.giorni}`);
                return;
            }
        }

        let response;
        
        // Se siamo in modalità modifica, aggiorna la richiesta esistente
        if (modalitaModifica && richiestaId) {
            response = await API.modificaRichiesta(richiestaId, richiesta);
            if (response.success) {
                alert('Richiesta modificata con successo!');
            } else {
                alert(`Errore nella modifica della richiesta: ${response.message}`);
            }
        } else {
            // Altrimenti, invia una nuova richiesta
            response = await API.inviaRichiesta(richiesta);
            if (response.success) {
                alert('Richiesta inviata con successo!');
            } else {
                alert(`Errore nell'invio della richiesta: ${response.message}`);
            }
        }

        if (response.success) {
            // Reindirizza alla dashboard
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Errore nell\'invio/modifica della richiesta:', error);
        alert(`Errore nell'operazione: ${error.message}`);
    }
});