/**
 * adm_festivita.js - Gestione delle festività e sospensioni didattiche
 * Integrato con Supabase per la gestione dei dati
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';
// Importa le utility per la gestione utente
import { UserUtils } from './user-utils.js';
// Importa il modulo per il calcolo delle festività
import Holidays from './holidays.js';

// Espone UserUtils globalmente per l'uso negli eventi onclick dell'HTML
window.UserUtils = UserUtils;

// Variabili globali
let festivitaData = [];
let sospensioniData = [];
let selectedRowId = null;
let isEditMode = false;

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', function() {
    UserUtils.initializeUserName();
    initializePage();
    setupEventListeners();
    // Rimuovo loadFestivita() - ora caricheremo tutto dal database
    loadSospensioni().catch(error => {
        console.error('Errore nel caricamento iniziale delle sospensioni:', error);
    });
});

/**
 * Inizializza la pagina
 */
function initializePage() {
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
}

/**
 * Configura gli event listeners
 */
function setupEventListeners() {
    // Pulsanti azioni
    document.getElementById('btn-insert').addEventListener('click', openInsertModal);
    document.getElementById('btn-genera-festivita').addEventListener('click', generaFestivitaAnnoScolastico);
    document.getElementById('btn-modify').addEventListener('click', openModifyModal);
    document.getElementById('btn-delete').addEventListener('click', deleteSospensione);
    
    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
    document.getElementById('sospensione-form').addEventListener('submit', saveSospensione);
    
    // Chiudi modal cliccando fuori
    document.getElementById('sospensione-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

/**
 * Carica le festività dal modulo holidays.js
 */
function loadFestivita() {
    // Funzione ora vuota - le festività vengono caricate dal database
    // tramite loadSospensioni()
    festivitaData = [];
}

/**
 * Ottiene il nome della festività dalla data
 */
function getFestivitaName(data) {
    const giorno = data.getDate();
    const mese = data.getMonth() + 1;
    
    // Festività fisse
    const festivitaFisse = {
        '1-1': 'Capodanno',
        '6-1': 'Epifania',
        '25-4': 'Festa della Liberazione',
        '1-5': 'Festa dei Lavoratori',
        '2-6': 'Festa della Repubblica',
        '15-8': 'Ferragosto',
        '1-11': 'Tutti i Santi',
        '8-12': 'Immacolata Concezione',
        '25-12': 'Natale',
        '26-12': 'Santo Stefano'
    };
    
    const key = `${giorno}-${mese}`;
    if (festivitaFisse[key]) {
        return festivitaFisse[key];
    }
    
    // Verifica se è Pasqua o Pasquetta
    const anno = data.getFullYear();
    const pasqua = Holidays.calcolaPasqua(anno);
    const pasquetta = new Date(pasqua);
    pasquetta.setDate(pasqua.getDate() + 1);
    
    if (data.getTime() === pasqua.getTime()) {
        return 'Pasqua';
    }
    if (data.getTime() === pasquetta.getTime()) {
        return 'Pasquetta';
    }
    
    return 'Festività';
}

/**
 * Carica le sospensioni didattiche dal database
 */
async function loadSospensioni() {
    try {
        // CARICAMENTO SOSPENSIONI: Query diretta su Supabase
        const { data: sospensioni, error } = await supabase
            .from('sospensioni')
            .select('*')
            .order('data', { ascending: true });
        
        if (error) {
            throw error;
        }
        
        // Processa i dati per il formato richiesto
        // Separa festività e sospensioni dal database
        festivitaData = [];
        sospensioniData = [];
        
        (sospensioni || []).forEach(sospensione => {
            // Nella funzione loadSospensioni
            const item = {
                id: sospensione.id,
                data: new Date(sospensione.data),
                nome: sospensione.descrizione,
                tipo: sospensione.tipo,
                editable: sospensione.tipo === 'sospensione' // ✅ Le sospensioni sono editabili
            };
            
            if (sospensione.tipo === 'festività') {
                festivitaData.push(item);
            } else {
                sospensioniData.push(item);
            }
        });
        
        renderTable();
    } catch (error) {
        console.error('Errore nel caricamento delle sospensioni:', error);
        festivitaData = [];
        sospensioniData = [];
        renderTable();
        showError('Errore nel caricamento dei dati: ' + (error.message || 'Errore sconosciuto'));
    }
}

/**
 * Renderizza la tabella con festività e sospensioni
 */
function renderTable() {
    const tbody = document.getElementById('festivita-tbody');
    tbody.innerHTML = '';
    
    // Combina festività e sospensioni
    const allData = [...festivitaData, ...sospensioniData]
        .sort((a, b) => a.data - b.data);
    
    allData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.dataset.id = index;
        row.dataset.type = item.tipo || 'festività';
        row.dataset.editable = item.editable || false;
        
        // Aggiungi classe CSS in base al tipo
        if (item.tipo === 'festività') {
            row.classList.add('festivita-fissa');
        } else if (item.tipo === 'sospensione') {
            row.classList.add('sospensione-didattica');
            if (item.editable) {
                row.classList.add('editable');
            }
        }
        
        const dataFormatted = new Date(item.data).toLocaleDateString('it-IT');
        const tipoBadge = getTipoBadge(item.tipo || 'festività');
        
        // Determina il contenuto della colonna Azioni
        let azioniContent;
        if (item.editable) {
            azioniContent = '<button class="btn-select" onclick="selectRow(' + index + ')">Seleziona</button>';
        } else {
            azioniContent = '<span class="non-modificabile">Non modificabile</span>';
        }
        
        row.innerHTML = `
            <td>${dataFormatted}</td>
            <td>${item.descrizione || item.nome || ''}</td>
            <td>${tipoBadge}</td>
            <td>${azioniContent}</td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Ottiene il badge per il tipo di festività
 */
function getTipoBadge(tipo) {
    const badges = {
        'festività': '<span class="tipo-badge tipo-fissa">Festività</span>',
        'sospensione': '<span class="tipo-badge tipo-sospensione">Sospensione</span>'
    };
    return badges[tipo] || `<span class="tipo-badge">${tipo}</span>`;
}

/**
 * Seleziona una riga della tabella
 */
function selectRow(index) {
    // Rimuovi selezione precedente
    document.querySelectorAll('.selected-row').forEach(row => {
        row.classList.remove('selected-row');
    });
    
    // Seleziona nuova riga
    const row = document.querySelector(`tr[data-id="${index}"]`);
    if (row && row.dataset.editable === 'true') {
        row.classList.add('selected-row');
        selectedRowId = index;
        
        // Abilita pulsanti modifica ed elimina
        document.getElementById('btn-modify').disabled = false;
        document.getElementById('btn-delete').disabled = false;
    }
}

/**
 * Apre il modal per inserire una nuova sospensione
 */
function openInsertModal() {
    isEditMode = false;
    document.getElementById('modal-title').textContent = 'Inserisci Sospensione Didattica';
    document.getElementById('sospensione-form').reset();
    document.getElementById('sospensione-modal').style.display = 'block';
}

/**
 * Apre il modal per modificare una sospensione esistente
 */
async function openModifyModal() {
    if (selectedRowId === null) return;
    
    try {
        const allData = [...festivitaData, ...sospensioniData]
            .sort((a, b) => a.data - b.data);
        const selectedItem = allData[selectedRowId];
        
        if (selectedItem && selectedItem.id) {
            const { data: dbRecord, error: fetchError } = await supabase
                .from('sospensioni')
                .select('*')
                .eq('id', selectedItem.id)
                .single();
            
            if (fetchError) {
                throw fetchError;
            }
            
            if (dbRecord.tipo === 'sospensione') {
                isEditMode = true;
                document.getElementById('modal-title').textContent = 'Modifica Sospensione Didattica';
                
                // Popola il form con i dati esistenti
                const dataFormatted = new Date(dbRecord.data).toISOString().split('T')[0];
                document.getElementById('data-sospensione').value = dataFormatted;
                document.getElementById('descrizione-sospensione').value = dbRecord.descrizione || '';
                document.getElementById('tipo-sospensione').value = dbRecord.tipo || 'sospensione';
                
                document.getElementById('sospensione-modal').style.display = 'block';
            } else {
                showError('Impossibile modificare: questo è un record di tipo "' + dbRecord.tipo + '" e non può essere modificato');
            }
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        showError('Errore nel caricamento dei dati: ' + (error.message || 'Errore sconosciuto'));
    }
}

/**
 * Chiude il modal
 */
function closeModal() {
    document.getElementById('sospensione-modal').style.display = 'none';
    document.getElementById('sospensione-form').reset();
    isEditMode = false;
}

/**
 * Salva una sospensione (inserimento o modifica)
 */
async function saveSospensione(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const dataValue = formData.get('data');
    const descrizioneValue = formData.get('descrizione');
    const tipoValue = formData.get('tipo');
    
    // Validazione
    if (!dataValue || !descrizioneValue) {
        showError('Data e descrizione sono obbligatori');
        return;
    }
    
    const sospensione = {
        data: dataValue,
        descrizione: descrizioneValue.trim(),
        tipo: tipoValue || 'sospensione'
    };
    
    // Verifica che la data sia valida
    if (isNaN(new Date(sospensione.data).getTime())) {
        showError('Data non valida');
        return;
    }
    
    try {
        if (isEditMode && selectedRowId !== null) {
            // MODIFICA SOSPENSIONE
            const allData = [...festivitaData, ...sospensioniData]
                .sort((a, b) => a.data - b.data);
            const selectedItem = allData[selectedRowId];
            
            if (selectedItem && selectedItem.id) {
                const { error } = await supabase
                    .from('sospensioni')
                    .update({
                        data: sospensione.data,
                        descrizione: sospensione.descrizione,
                        tipo: sospensione.tipo,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', selectedItem.id);
                
                if (error) {
                    throw error;
                }
                
                showSuccess('Sospensione modificata con successo');
            } else {
                showError('Elemento selezionato non valido per la modifica');
                return;
            }
        } else {
            // INSERIMENTO SOSPENSIONE
            const { error } = await supabase
                .from('sospensioni')
                .insert({
                    data: sospensione.data,
                    descrizione: sospensione.descrizione,
                    tipo: sospensione.tipo
                });
            
            if (error) {
                throw error;
            }
            
            showSuccess('Sospensione inserita con successo');
        }
        
        // Ricarica le sospensioni dal database
        await loadSospensioni();
        
        // Chiudi modal e reset selezione
        closeModal();
        resetSelection();
        
    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        showError('Errore nel salvataggio della sospensione: ' + (error.message || 'Errore sconosciuto'));
    }
}

/**
 * Elimina una sospensione
 */
async function deleteSospensione() {
    if (selectedRowId === null) {
        showError('Nessuna sospensione selezionata');
        return;
    }
    
    if (confirm('Sei sicuro di voler eliminare questa sospensione?')) {
        try {
            // ✅ CORREZIONE: Usa lo stesso ordinamento di renderTable
            const allData = [...festivitaData, ...sospensioniData]
                .sort((a, b) => a.data - b.data);
            const selectedItem = allData[selectedRowId];
            
            // Verifica che l'elemento sia modificabile e abbia un ID valido
            if (selectedItem && selectedItem.editable && selectedItem.id) {
                // ELIMINAZIONE SOSPENSIONE: Delete su Supabase
                const { error } = await supabase
                    .from('sospensioni')
                    .delete()
                    .eq('id', selectedItem.id);
                
                if (error) {
                    throw error;
                }
                
                // Ricarica le sospensioni dal database
                await loadSospensioni();
                resetSelection();
                showSuccess('Sospensione eliminata con successo');
            } else if (!selectedItem.editable) {
                showError('Questo elemento non può essere eliminato (festività fissa)');
            } else {
                showError('Impossibile eliminare questo elemento');
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione:', error);
            showError('Errore nell\'eliminazione della sospensione: ' + (error.message || 'Errore sconosciuto'));
        }
    }
}

// Funzione rimossa: saveSospensioniToStorage - ora si salva direttamente nel database

/**
 * Reset della selezione
 */
function resetSelection() {
    selectedRowId = null;
    document.querySelectorAll('.selected-row').forEach(row => {
        row.classList.remove('selected-row');
    });
    document.getElementById('btn-modify').disabled = true;
    document.getElementById('btn-delete').disabled = true;
}

/**
 * Mostra un messaggio di errore
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/**
 * Mostra un messaggio di successo
 */
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Funzione globale per la selezione delle righe (chiamata dall'HTML)
window.selectRow = selectRow;

/**
 * Genera automaticamente le festività canoniche per l'anno scolastico corrente
 * Da settembre dell'anno corrente ad agosto dell'anno successivo
 */
async function generaFestivitaAnnoScolastico() {
    try {
        // Chiedi all'utente di scegliere l'anno scolastico
        const annoScolastico = prompt(
            'Inserisci l\'anno scolastico per cui generare le festività\n\n' +
            'Formato: AAAA/AA (es. 2024/25, 2025/26)\n\n' +
            'L\'anno scolastico va da settembre ad agosto dell\'anno successivo.',
            '2024/25'
        );
        
        if (!annoScolastico) return;
        
        // Valida il formato dell'anno scolastico
        const formatoAnno = /^(\d{4})\/(\d{2})$/;
        const match = annoScolastico.match(formatoAnno);
        
        if (!match) {
            showError('Formato anno scolastico non valido. Usa il formato AAAA/AA (es. 2024/25)');
            return;
        }
        
        const annoInizioScolastico = parseInt(match[1]);
        const annoFineScolastico = annoInizioScolastico + 1;
        const annoFineInput = parseInt('20' + match[2]);
        
        // Verifica che l'anno di fine corrisponda
        if (annoFineScolastico !== annoFineInput) {
            showError('Anno scolastico non valido. L\'anno di fine deve essere consecutivo a quello di inizio.');
            return;
        }
        
        const conferma = confirm(
            `Questa operazione genererà automaticamente tutte le festività canoniche italiane ` +
            `per l'anno scolastico ${annoInizioScolastico}-${annoFineScolastico} (da settembre ad agosto).\n\n` +
            'Le festività già esistenti non verranno duplicate.\n\n' +
            'Vuoi continuare?'
        );
        
        if (!conferma) return;
        
        console.log(`Generazione festività per anno scolastico ${annoInizioScolastico}-${annoFineScolastico}`);
        
        // Ottieni festività per entrambi gli anni
        const festivitaAnno1 = Holidays.getFestivita(annoInizioScolastico);
        const festivitaAnno2 = Holidays.getFestivita(annoFineScolastico);
        
        // Filtra solo le festività dell'anno scolastico (settembre-agosto)
        const festivitaAnnoScolastico = [];
        
        // Festività da settembre a dicembre dell'anno di inizio
        festivitaAnno1.forEach(data => {
            if (data.getMonth() >= 8) { // Settembre = mese 8 in JavaScript
                festivitaAnnoScolastico.push({
                    data: data,
                    nome: getFestivitaNameFromDate(data),
                    descrizione: 'Festività nazionale italiana'
                });
            }
        });
        
        // Festività da gennaio ad agosto dell'anno di fine
        festivitaAnno2.forEach(data => {
            if (data.getMonth() <= 7) { // Agosto = mese 7 in JavaScript
                festivitaAnnoScolastico.push({
                    data: data,
                    nome: getFestivitaNameFromDate(data),
                    descrizione: 'Festività nazionale italiana'
                });
            }
        });
        
        // Verifica festività già esistenti nel database
        const { data: festivitaEsistenti, error: errorQuery } = await supabase
            .from('sospensioni')
            .select('data')
            .eq('tipo', 'festività');
            
        if (errorQuery) {
            throw new Error(`Errore nel controllo festività esistenti: ${errorQuery.message}`);
        }
        
        const dateEsistenti = new Set(
            festivitaEsistenti.map(f => f.data)
        );
        
        // Filtra solo le festività non ancora presenti
        const festivitaDaInserire = festivitaAnnoScolastico
            .filter(festività => !dateEsistenti.has(festività.data.toISOString().split('T')[0]))
            .map(festività => ({
                data: festività.data, // Mantieni l'oggetto Date
                nome: festività.nome,
                descrizione: festività.descrizione,
                tipo: 'festività'
            }));
        
        if (festivitaDaInserire.length === 0) {
            showSuccess(`Tutte le festività per l'anno scolastico ${annoInizioScolastico}-${annoFineScolastico} sono già presenti nel database.`);
            return;
        }
        
        // Inserisci le nuove festività
        const festivitaPerDB = festivitaDaInserire.map(festa => ({
            data: festa.data.toISOString().split('T')[0], // Ora converte correttamente
            descrizione: festa.nome,
            tipo: 'festività'
        }));
        
        const { error: errorInsert } = await supabase
            .from('sospensioni')
            .insert(festivitaPerDB);
            
        if (errorInsert) {
            throw new Error(`Errore nell'inserimento: ${errorInsert.message}`);
        }
        
        showSuccess(`${festivitaDaInserire.length} festività generate con successo per l'anno scolastico ${annoInizioScolastico}-${annoFineScolastico}!`);
        
        // Ricarica la tabella
        await loadSospensioni();
        renderTable();
        
    } catch (error) {
        console.error('Errore nella generazione delle festività:', error);
        showError(`Errore nella generazione delle festività: ${error.message}`);
    }
}

/**
 * Ottiene il nome della festività da un oggetto Date
 */
function getFestivitaNameFromDate(data) {
    const giorno = data.getDate();
    const mese = data.getMonth() + 1;
    
    // Festività fisse
    const festivitaFisse = {
        '1-1': 'Capodanno',
        '6-1': 'Epifania',
        '25-4': 'Festa della Liberazione',
        '1-5': 'Festa dei Lavoratori',
        '2-6': 'Festa della Repubblica',
        '15-8': 'Ferragosto',
        '1-11': 'Tutti i Santi',
        '8-12': 'Immacolata Concezione',
        '25-12': 'Natale',
        '26-12': 'Santo Stefano'
    };
    
    const key = `${giorno}-${mese}`;
    if (festivitaFisse[key]) {
        return festivitaFisse[key];
    }
    
    // Verifica se è Pasqua o Pasquetta
    const anno = data.getFullYear();
    const pasqua = Holidays.calcolaPasqua(anno);
    const pasquetta = new Date(pasqua);
    pasquetta.setDate(pasqua.getDate() + 1);
    
    if (data.getTime() === pasqua.getTime()) {
        return 'Pasqua';
    }
    if (data.getTime() === pasquetta.getTime()) {
        return 'Pasquetta';
    }
    
    return 'Festività';
}