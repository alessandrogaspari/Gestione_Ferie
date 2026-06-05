/**
 * MODULO: Gestione Form Richiesta Ferie
 * 
 * Questo modulo gestisce:
 * - Creazione di nuove richieste ferie/permessi
 * - Modifica di richieste esistenti
 * - Calcolo automatico giorni lavorativi e festivi
 * - Validazione date e disponibilità
 * - Aggiornamento dinamico della disponibilità per tipo
 * - Gestione calendario con esclusione festività
 * - Integrato con Supabase per la gestione dei dati
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';
// Importa le utility per la gestione utente
import { UserUtils } from './user-utils.js';
// Importa il modulo per la gestione delle festività
import Holidays from './holidays.js';

// ========== CONTROLLO AUTENTICAZIONE ==========
// Verifica che l'utente sia autenticato prima di accedere al form
UserUtils.checkAuth();

// ========== RIFERIMENTI ELEMENTI DOM ==========
// Form principale e controlli di input
const form = document.getElementById('richiesta-form');
const tipoFerieSelect = document.getElementById('tipo-ferie');
const dataInizioInput = document.getElementById('data-inizio');
const dataFineInput = document.getElementById('data-fine');
const giorniInput = document.getElementById('giorni');
const giorniLavorativiInput = document.getElementById('giorni-lavorativi');
const noteTextarea = document.getElementById('note');

// Elementi interfaccia utente
const userNameSpan = document.getElementById('user-name');
const userRoleSpan = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');
const disponibilitaValue = document.getElementById('disponibilita-value');
const cardHeader = document.querySelector('.card-header h2');
const submitButton = document.querySelector('button[type="submit"]');

// Elementi per il riepilogo giorni (pannello informativo)
const summaryTotale = document.getElementById('summary-totale');
const summaryLavorativi = document.getElementById('summary-lavorativi');
const summaryFestivi = document.getElementById('summary-festivi');

// ========== GESTIONE MODALITÀ MODIFICA ==========
// Verifica se siamo in modalità modifica controllando la presenza di ID nell'URL
const urlParams = new URLSearchParams(window.location.search);
const richiestaId = urlParams.get('id');
let richiestaOriginale = null; // Memorizza i dati originali per confronto
let modalitaModifica = false;

if (richiestaId) {
    modalitaModifica = true;
    
    // ========== PERSONALIZZAZIONE UI PER MODALITÀ MODIFICA ==========
    // Cambia il titolo per indicare che stiamo modificando
    cardHeader.textContent = 'Modifica Richiesta';
    cardHeader.style.color = '#e67e22'; // Colore arancione distintivo
    submitButton.textContent = 'Aggiorna Richiesta';
    
    // Crea un indicatore visivo per la modalità modifica
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

// ========== INIZIALIZZAZIONE INTERFACCIA UTENTE ==========
// Carica e visualizza i dati dell'utente (nome, ruolo) nell'header
UserUtils.initUserUI();

// Configura il pulsante di logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        UserUtils.logout();
    });
}

/**
 * Carica i dati di una richiesta esistente per la modifica
 * 
 * Questa funzione:
 * - Recupera la richiesta specifica tramite ID
 * - Popola il form con i dati esistenti
 * - Verifica se la richiesta è modificabile (stato IN ATTESA)
 * - Disabilita il form se la richiesta è già stata processata
 * - Ricalcola automaticamente giorni e disponibilità
 */
async function caricaRichiestaEsistente() {
    // Esce se non siamo in modalità modifica
    if (!richiestaId) return;
    
    try {
        // Verifica che i dati utente siano disponibili
        const user = UserUtils.getUserData();
        if (!user) return;
        
        // Recupera la richiesta specifica dal database
        // Prima ottieni l'ID dell'utente
        const { data: userRecordData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', user.username)
            .limit(1);
        
        const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
        
        if (!userRecord) {
            throw new Error('Utente non trovato');
        }
        
        if (userError) {
            throw userError;
        }
        
        const { data: richiestaData, error } = await supabase
            .from('richieste')
            .select('*')
            .eq('id', richiestaId)
            .eq('user_id', userRecord.id)
            .limit(1);
        
        const richiesta = richiestaData && richiestaData.length > 0 ? richiestaData[0] : null;
        
        if (error) {
            console.error('Errore nel caricamento della richiesta:', error);
            alert('Richiesta non trovata o non autorizzata.');
            window.location.href = 'dashboard.html';
            return;
        }
        
        if (richiesta) {
            // Memorizza i dati originali per confronti futuri
            richiestaOriginale = richiesta;
            
            // ========== POPOLAMENTO FORM CON DATI ESISTENTI ==========
            tipoFerieSelect.value = richiesta.tipo;
            dataInizioInput.value = richiesta.data_inizio;
            dataFineInput.value = richiesta.data_fine;
            noteTextarea.value = richiesta.note || '';
            
            // Ricalcola automaticamente i giorni basandosi sulle date
            calcolaGiorni();
            
            // Aggiorna la disponibilità per il tipo selezionato
            caricaDisponibilita();
            
            // ========== CONTROLLO MODIFICABILITÀ ==========
            // Solo le richieste "IN ATTESA" possono essere modificate
            if (richiesta.stato !== 'IN ATTESA') {
                alert('Attenzione: questa richiesta è già stata ' + richiesta.stato.toLowerCase() + ' e non può essere modificata.');
                // Disabilita tutti i controlli del form
                tipoFerieSelect.disabled = true;
                dataInizioInput.disabled = true;
                dataFineInput.disabled = true;
                noteTextarea.disabled = true;
                submitButton.disabled = true;
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
        
        // Prima ottieni l'ID dell'utente
        const { data: userRecordData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', user.username)
            .limit(1);
        
        const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
        
        if (!userRecord) {
            throw new Error('Utente non trovato');
        }
        
        if (userError) {
            throw userError;
        }
        
        const { data: totaliDataArray, error } = await supabase
            .from('ferie_balance')
            .select('*')
            .eq('user_id', userRecord.id)
            .limit(1);
        
        const totaliData = totaliDataArray && totaliDataArray.length > 0 ? totaliDataArray[0] : null;
        
        if (error) {
            console.error('Errore nel caricamento delle disponibilità:', error);
            return;
        }
        
        if (totaliData) {
            updateDisponibilita(totaliData);
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
    
    // Calcola i giorni disponibili in base ai dati dell'utente
    switch(tipoSelezionato) {
        case 'FERIE':
            disponibili = userData.ferie_totali - userData.ferie_utilizzate;
            break;
        case 'FERIE VECCHIE':
            disponibili = userData.ferie_vecchie_totali - userData.ferie_vecchie_utilizzate;
            break;
        case 'FESTIVITA\' SOPPRESSE':
            disponibili = userData.festivita_totali - userData.festivita_utilizzate;
            break;
        case 'MOTIVI FAMILIARI':
            disponibili = userData.motivi_familiari_totali - userData.motivi_familiari_utilizzati;
            break;
        case 'RECUPERI':
            disponibili = userData.recuperi_totali - userData.recuperi_utilizzati;
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
    
    // Prima ottieni l'ID dell'utente
    const { data: userRecordData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', user.username)
        .limit(1);
    
    const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
    
    if (!userRecord) {
        console.error('Utente non trovato');
        return;
    }
    
    if (userError) {
        console.error('Errore nel caricamento dell\'utente:', userError);
        return;
    }
    
    const { data: totaliDataArray, error } = await supabase
        .from('ferie_balance')
        .select('*')
        .eq('user_id', userRecord.id)
        .limit(1);
    
    const totaliData = totaliDataArray && totaliDataArray.length > 0 ? totaliDataArray[0] : null;
    
    if (error) {
        console.error('Errore nel caricamento delle disponibilità:', error);
        return;
    }
    
    if (totaliData) {
        updateDisponibilita(totaliData);
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
        // Prima ottieni l'ID dell'utente
        const { data: userRecordData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', user.username)
            .limit(1);
        
        const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
        
        if (!userRecord) {
            alert('Utente non trovato');
            return;
        }
        
        if (userError) {
            console.error('Errore nel caricamento dell\'utente:', userError);
            alert('Errore nel caricamento dei dati utente.');
            return;
        }
        
        const { data: totaliDataArray, error: totaliError } = await supabase
            .from('ferie_balance')
            .select('*')
            .eq('user_id', userRecord.id)
            .limit(1);
        
        const totaliData = totaliDataArray && totaliDataArray.length > 0 ? totaliDataArray[0] : null;
        
        if (totaliError) {
            console.error('Errore nel caricamento dei totali:', totaliError);
            alert('Errore nel caricamento dei dati utente.');
            return;
        }
        
        if (totaliData) {
            let disponibili = 0;
            
            // Verifica disponibilità in base al tipo di richiesta
            switch(richiesta.tipo) {
                case 'FERIE':
                    disponibili = totaliData.ferie_totali - totaliData.ferie_utilizzate;
                    break;
                case 'FERIE VECCHIE':
                    disponibili = totaliData.ferie_vecchie_totali - totaliData.ferie_vecchie_utilizzate;
                    break;
                case 'FESTIVITA\' SOPPRESSE':
                    disponibili = totaliData.festivita_totali - totaliData.festivita_utilizzate;
                    break;
                case 'MOTIVI FAMILIARI':
                    disponibili = totaliData.motivi_familiari_totali - totaliData.motivi_familiari_utilizzati;
                    break;
                case 'RECUPERI':
                    disponibili = totaliData.recuperi_totali - totaliData.recuperi_utilizzati;
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
            const { error: updateError } = await supabase
                .from('richieste')
                .update({
                    tipo: richiesta.tipo,
                    data_inizio: richiesta.dataInizio,
                    data_fine: richiesta.dataFine,
                    giorni: richiesta.giorni,
                    note: richiesta.note,
                    updated_at: new Date().toISOString()
                })
                .eq('id', richiestaId);
            
            if (updateError) {
                console.error('Errore nella modifica della richiesta:', updateError);
                alert(`Errore nella modifica della richiesta: ${updateError.message}`);
                return;
            }
            
            alert('Richiesta modificata con successo!');
        } else {
            // Altrimenti, invia una nuova richiesta
            const { error: insertError } = await supabase
                .from('richieste')
                .insert({
                    user_id: userRecord.id,
                    tipo: richiesta.tipo,
                    data_inizio: richiesta.dataInizio,
                    data_fine: richiesta.dataFine,
                    giorni: richiesta.giorni,
                    note: richiesta.note,
                    stato: richiesta.stato,
                    data_richiesta: richiesta.dataRichiesta,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (insertError) {
                console.error('Errore nell\'invio della richiesta:', insertError);
                alert(`Errore nell'invio della richiesta: ${insertError.message}`);
                return;
            }
            
            alert('Richiesta inviata con successo!');
        }

        // Reindirizza alla dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Errore nell\'invio/modifica della richiesta:', error);
        alert(`Errore nell'operazione: ${error.message}`);
    }
});