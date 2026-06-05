/**
 * dashboard.js - Gestione della dashboard per l'applicazione Gestione Ferie ATA - Integrato con Supabase
 * 
 * Questo modulo gestisce:
 * - Inizializzazione e autenticazione utente tramite Supabase
 * - Visualizzazione riepilogo ferie e permessi da database Supabase
 * - Gestione calendario con richieste e sospensioni
 * - Tabella delle richieste con azioni CRUD su Supabase
 * - Generazione PDF delle richieste
 * - Navigazione tra le diverse sezioni (tabs)
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';
// Importa le utility per la gestione utente
import { UserUtils } from './user-utils.js';
// Importa le utility per le festività
import Holidays from './holidays.js';

document.addEventListener('DOMContentLoaded', function() {
    // Verifica che l'utente sia autenticato e inizializza l'interfaccia utente
    // Se l'autenticazione fallisce, l'utente viene reindirizzato al login
    if (!UserUtils.initUserUI()) return;
    
    // Carica immediatamente i dati del riepilogo ferie all'avvio della pagina
    caricaDatiRiepilogo();
    
    // ========== RIFERIMENTI AGLI ELEMENTI DOM ==========
    
    // Elementi di navigazione e controllo
    const logoutBtn = document.getElementById('logout-btn');
    const navTabs = document.querySelectorAll('.nav-tabs a') || [];
    const tabContents = document.querySelectorAll('.tab-content');
    const nuovaRichiestaBtn = document.getElementById('nuova-richiesta-btn');
    
    // Elementi del calendario
    const calendarBody = document.getElementById('calendar-body');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const prevYearBtn = document.getElementById('prev-year');
    const nextYearBtn = document.getElementById('next-year');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    
    // Elementi della tabella richieste
    const richiesteTableBody = document.getElementById('richieste-table-body');
    
    // Elementi DOM per il riepilogo dei totali ferie e permessi
    // Questi elementi mostrano i contatori aggiornati in tempo reale
    
    // Ferie anno corrente
    const ferieTotali = document.getElementById('ferie-totali');
    const ferieUtilizzate = document.getElementById('ferie-utilizzate');
    const ferieDisponibili = document.getElementById('ferie-disponibili');
    
    // Ferie anni precedenti (residui)
    const ferieVecchieTotali = document.getElementById('ferie-vecchie-totali');
    const ferieVecchieUtilizzate = document.getElementById('ferie-vecchie-utilizzate');
    const ferieVecchieDisponibili = document.getElementById('ferie-vecchie-disponibili');
    
    // Festività soppresse
    const festivitaTotali = document.getElementById('festivita-totali');
    const festivitaUtilizzate = document.getElementById('festivita-utilizzate');
    const festivitaDisponibili = document.getElementById('festivita-disponibili');
    
    // Permessi per motivi familiari
    const motiviFamiliariTotali = document.getElementById('motivi-familiari-totali');
    const motiviFamiliariUtilizzate = document.getElementById('motivi-familiari-utilizzate');
    const motiviFamiliariDisponibili = document.getElementById('motivi-familiari-disponibili');
    
    // Recuperi (ore di straordinario da recuperare)
    const recuperiTotali = document.getElementById('recuperi-totali');
    const recuperiUtilizzati = document.getElementById('recuperi-utilizzati');
    const recuperiResidui = document.getElementById('recuperi-residui');
    
    // Aggiungi event listener per il pulsante logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            UserUtils.logout();
        });
    }
    
    // Aggiungi event listener per il pulsante genera PDF
    const generaPdfBtn = document.getElementById('genera-pdf-btn');
    if (generaPdfBtn) {
        generaPdfBtn.addEventListener('click', function() {
            generaPdfRichieste();
        });
    }
    
    // Aggiungi event listener per il pulsante nuova richiesta
    if (nuovaRichiestaBtn) {
        nuovaRichiestaBtn.addEventListener('click', function() {
            window.location.href = 'richiesta-ferie.html';
        });
    }
    
    // Gestione delle tab
    if (navTabs.length > 0) {
        navTabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Rimuovi la classe active da tutte le tab
                navTabs.forEach(t => t.classList.remove('active'));
                
                // Aggiungi la classe active alla tab cliccata
                this.classList.add('active');
                
                // Nascondi tutti i contenuti delle tab
                tabContents.forEach(content => {
                    content.style.display = 'none';
                });
                
                // Mostra il contenuto della tab selezionata
                const tabId = this.getAttribute('data-tab');
                const tabContent = document.getElementById(`${tabId}-tab`);
                if (tabContent) {
                    tabContent.style.display = 'block';
                    
                    // Se la tab è "richieste", carica le richieste
                    if (tabId === 'richieste') {
                        caricaRichieste();
                    }
                    // Se la tab è "riepilogo", carica i dati riepilogativi dell'utente
                    else if (tabId === 'riepilogo') {
                        caricaDatiRiepilogo();
                    }
                    // Se la tab è "calendario", renderizza il calendario
                    else if (tabId === 'calendario') {
                        renderCalendar();
                    }
                }
            });
        });
    }
    
    /**
     * Carica e visualizza tutte le richieste dell'utente da Supabase
     * 
     * Questa funzione:
     * - Recupera le richieste da Supabase
     * - Le ordina per data (più recenti prima)
     * - Le visualizza in una tabella con azioni disponibili
     * - Gestisce stati diversi (IN ATTESA, APPROVATA, RIFIUTATA)
     * - Aggiunge pulsanti di azione solo per richieste modificabili
     */
    async function caricaRichieste() {
        // Verifica che i dati utente siano disponibili
        const userData = UserUtils.getUserData();
        if (!userData || !userData.username) {
            console.error('Dati utente non disponibili');
            return;
        }
        
        // Mostra un indicatore di caricamento nella tabella
        richiesteTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Caricamento richieste...</td></tr>';
        
        try {
            // Prima ottieni l'ID dell'utente
            const { data: userRecordData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('username', userData.username)
                .limit(1);
            
            const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
            
            if (!userRecord) {
                throw new Error('Utente non trovato');
            }
            
            if (userError) {
                throw userError;
            }
            
            // RECUPERO RICHIESTE: Query diretta con user_id
            const { data: richieste, error } = await supabase
                .from('richieste')
                .select('*')
                .eq('user_id', userRecord.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                throw error;
            }
            
            console.log('Richieste caricate da Supabase:', richieste);
            
            // Gestisce il caso di nessuna richiesta trovata
            if (!richieste || richieste.length === 0) {
                richiesteTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nessuna richiesta trovata</td></tr>';
                return;
            }
            
            // Svuota la tabella
            richiesteTableBody.innerHTML = '';
            
            // Popola la tabella con le richieste
            richieste.forEach(richiesta => {
                const row = document.createElement('tr');
                
                // Crea le celle della riga
                row.innerHTML = `
                    <td>${richiesta.tipo}</td>
                    <td>${richiesta.data_inizio}</td>
                    <td>${richiesta.data_fine}</td>
                    <td>${richiesta.giorni}</td>
                    <td class="stato-${richiesta.stato.toLowerCase().replace(/\s+/g, '-')}">${richiesta.stato}</td>
                    <td>
                        ${richiesta.stato === 'IN ATTESA' ? `
                            <button class="btn btn-small btn-danger elimina-btn" data-id="${richiesta.id}">Elimina</button>
                            <button class="btn btn-small btn-secondary modifica-btn" data-id="${richiesta.id}">Modifica</button>
                        ` : ''}
                    </td>
                `;
                
                richiesteTableBody.appendChild(row);
            });
            
            // Aggiungi event listeners per i pulsanti elimina
            document.querySelectorAll('.elimina-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    eliminaRichiesta(id);
                });
            });
            
            // Aggiungi event listeners per i pulsanti modifica
            document.querySelectorAll('.modifica-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    modificaRichiesta(id);
                });
            });
            
        } catch (error) {
            console.error('Errore nel caricamento delle richieste da Supabase:', error.message || 'Errore sconosciuto');
            richiesteTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Errore nel caricamento delle richieste: ${error.message}</td></tr>`;
        }
    }
    
    /**
     * Elimina una richiesta specifica da Supabase
     * 
     * @param {string} id - ID della richiesta da eliminare
     */
    async function eliminaRichiesta(id) {
        if (confirm('Sei sicuro di voler eliminare questa richiesta?')) {
            try {
                // ELIMINAZIONE RICHIESTA: Delete diretta su Supabase
                const { error } = await supabase
                    .from('richieste')
                    .delete()
                    .eq('id', id);
                
                if (error) {
                    throw error;
                }
                
                alert('Richiesta eliminata con successo!');
                caricaRichieste(); // Ricarica la lista
                caricaDatiRiepilogo(); // Aggiorna i totali
                
            } catch (error) {
                console.error('Errore nell\'eliminazione da Supabase:', error.message || 'Errore sconosciuto');
                alert('Errore nell\'eliminazione della richiesta: ' + (error.message || 'Errore sconosciuto'));
            }
        }
    }
    
    /**
     * Modifica una richiesta specifica
     * Reindirizza alla pagina di modifica con l'ID della richiesta
     * 
     * @param {string} id - ID della richiesta da modificare
     */
    function modificaRichiesta(id) {
        // Reindirizza alla pagina di modifica con l'ID della richiesta
        window.location.href = `richiesta-ferie.html?id=${id}`;
    }
    
    /**
     * Carica e visualizza i dati riepilogativi dell'utente da Supabase
     * 
     * Questa funzione:
     * - Recupera i totali ferie/permessi da Supabase
     * - Calcola automaticamente i valori disponibili
     * - Aggiorna tutti i contatori nell'interfaccia
     * - Gestisce errori con valori di fallback
     * - Carica anche le richieste in attesa per il calcolo dei totali
     */
    async function caricaDatiRiepilogo() {
        // Verifica che i dati utente siano disponibili
        const userData = UserUtils.getUserData();
        if (!userData || !userData.username) {
            console.error('Dati utente non disponibili');
            return;
        }
        
        try {
            // Prima ottieni l'ID dell'utente
            const { data: userRecordData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('username', userData.username)
                .limit(1);
            
            const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
            
            if (!userRecord) {
                throw new Error('Utente non trovato');
            }
            
            if (userError) {
                throw userError;
            }
            
            // RECUPERO TOTALI FERIE: Ottiene i dati dalla tabella ferie_balance con user_id
            // Usa il client Supabase con headers espliciti per risolvere errore 406
            let totaliData = null;
            let totaliError = null;
            
            try {
                // Usa il client Supabase con colonne specifiche per risolvere errore 406
                const { data: totaliDataArray, error: totaliError } = await supabase
                    .from('ferie_balance')
                    .select('user_id,ferie_totali,ferie_utilizzate,ferie_vecchie_totali,ferie_vecchie_utilizzate,festivita_totali,festivita_utilizzate,motivi_familiari_totali,motivi_familiari_utilizzati,recuperi_totali,recuperi_utilizzati')
                    .eq('user_id', userRecord.id);
                
                // Converte array in singolo oggetto se presente
                totaliData = totaliDataArray && totaliDataArray.length > 0 ? totaliDataArray[0] : null;
            } catch (error) {
                totaliError = error;
            }

            if (totaliError && totaliError.code !== 'PGRST116') {
                throw totaliError;
            }

            // Se non esistono totali, inizializza con valori predefiniti
            const dati = totaliData || {
                ferie_totali: 28,
                ferie_utilizzate: 0,
                ferie_vecchie_totali: 0,
                ferie_vecchie_utilizzate: 0,
                festivita_totali: 4,
                festivita_utilizzate: 0,
                motivi_familiari_totali: 3,
                motivi_familiari_utilizzati: 0,
                recuperi_totali: 0,
                recuperi_utilizzati: 0
            };
            
            /**
             * Funzione helper per aggiornare un elemento DOM in modo sicuro
             * Previene errori se l'elemento non esiste
             * @param {string} id - ID dell'elemento da aggiornare
             * @param {number|string} value - Valore da impostare
             */
            function updateElement(id, value) {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || '0';
                }
            }
            
            // ========== AGGIORNAMENTO FERIE ANNO CORRENTE ==========
            updateElement('ferie-totali', dati.ferie_totali);
            updateElement('ferie-utilizzate', dati.ferie_utilizzate);
            updateElement('ferie-disponibili', dati.ferie_totali - dati.ferie_utilizzate);
            
            // ========== AGGIORNAMENTO FERIE VECCHIE ==========
            updateElement('ferie-vecchie-totali', dati.ferie_vecchie_totali);
            updateElement('ferie-vecchie-utilizzate', dati.ferie_vecchie_utilizzate);
            updateElement('ferie-vecchie-disponibili', dati.ferie_vecchie_totali - dati.ferie_vecchie_utilizzate);
            
            // ========== AGGIORNAMENTO FESTIVITA SOPPRESSE ==========
            updateElement('festivita-totali', dati.festivita_totali);
            updateElement('festivita-utilizzate', dati.festivita_utilizzate);
            updateElement('festivita-disponibili', dati.festivita_totali - dati.festivita_utilizzate);
            
            // ========== AGGIORNAMENTO MOTIVI FAMILIARI ==========
            updateElement('motivi-familiari-totali', dati.motivi_familiari_totali);
            updateElement('motivi-familiari-utilizzate', dati.motivi_familiari_utilizzati);
            updateElement('motivi-familiari-disponibili', dati.motivi_familiari_totali - dati.motivi_familiari_utilizzati);
            
            // ========== AGGIORNAMENTO RECUPERI ==========
            updateElement('recuperi-totali', dati.recuperi_totali);
            updateElement('recuperi-utilizzati', dati.recuperi_utilizzati);
            updateElement('recuperi-residui', dati.recuperi_totali - dati.recuperi_utilizzati);
            
            // Carica le richieste in attesa
            caricaRichiesteInAttesa();
            
        } catch (error) {
            console.error('Errore nel caricamento dei dati da Supabase:', error.message || 'Errore sconosciuto');
            
            // Imposta tutti i valori a '0' in caso di errore
            const ids = [
                'ferie-totali', 'ferie-utilizzate', 'ferie-disponibili',
                'ferie-vecchie-totali', 'ferie-vecchie-utilizzate', 'ferie-vecchie-disponibili',
                'festivita-totali', 'festivita-utilizzate', 'festivita-disponibili',
                'motivi-familiari-totali', 'motivi-familiari-utilizzate', 'motivi-familiari-disponibili',
                'recuperi-totali', 'recuperi-utilizzati', 'recuperi-residui'
            ];
            
            function updateElement(id, value) {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || '0';
                }
            }
            
            ids.forEach(id => updateElement(id, '0'));
        }
    }
    
    /**
     * Carica le richieste in attesa e calcola i giorni per categoria da Supabase
     * 
     * Questa funzione:
     * - Recupera tutte le richieste dell'utente da Supabase
     * - Filtra solo quelle con stato "IN ATTESA"
     * - Calcola il totale giorni per ogni tipo di richiesta
     * - Aggiorna i contatori "in attesa" nell'interfaccia
     * - Fornisce feedback visivo sui giorni ancora da approvare
     */
    async function caricaRichiesteInAttesa() {
        // Verifica disponibilità dati utente
        const userData = UserUtils.getUserData();
        if (!userData || !userData.username) {
            console.error('Dati utente non disponibili');
            return;
        }
        
        try {
            // Prima ottieni l'ID dell'utente
            const { data: userRecordData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('username', userData.username)
                .limit(1);
            
            const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
            
            if (!userRecord) {
                throw new Error('Utente non trovato');
            }
            
            if (userError) {
                throw userError;
            }
            
            // RECUPERO RICHIESTE IN ATTESA: Query diretta con user_id
        const { data: richieste, error } = await supabase
            .from('richieste')
            .select('*')
            .eq('user_id', userRecord.id)
            .eq('stato', 'IN ATTESA');
            
            if (error) {
                throw error;
            }
            
            console.log('Richieste in attesa da Supabase:', richieste);
            
            // Inizializza contatori per ogni tipo di richiesta
            const giorniPerTipo = {
                'FERIE': 0,
                'FERIE VECCHIE': 0,
                'FESTIVITA\' SOPPRESSE': 0,
                'MOTIVI FAMILIARI': 0,
                'RECUPERI': 0
            };
            
            // Somma i giorni per ogni tipo di richiesta in attesa
            if (richieste && richieste.length > 0) {
                richieste.forEach(richiesta => {
                    console.log('Tipo richiesta:', richiesta.tipo);
                    if (giorniPerTipo.hasOwnProperty(richiesta.tipo)) {
                        giorniPerTipo[richiesta.tipo] += parseInt(richiesta.giorni) || 0;
                    }
                });
            }
            
            // ========== AGGIORNAMENTO CONTATORI "IN ATTESA" ==========
            // Aggiorna il contatore ferie in attesa
            const ferieInAttesaEl = document.getElementById('ferie-in-attesa');
            if (ferieInAttesaEl) {
                ferieInAttesaEl.textContent = giorniPerTipo['FERIE'] || 0;
            }
            
            // Aggiorna il contatore ferie vecchie in attesa
            const ferieVecchieInAttesaEl = document.getElementById('ferie-vecchie-in-attesa');
            if (ferieVecchieInAttesaEl) {
                ferieVecchieInAttesaEl.textContent = giorniPerTipo['FERIE VECCHIE'] || 0;
            }
            
            // Aggiorna il contatore festività soppresse in attesa
            const festivitaInAttesaEl = document.getElementById('festivita-in-attesa');
            if (festivitaInAttesaEl) {
                festivitaInAttesaEl.textContent = giorniPerTipo['FESTIVITA\' SOPPRESSE'] || 0;
            }
            
            // Aggiorna il contatore motivi familiari in attesa
            const motiviFamiliariInAttesaEl = document.getElementById('motivi-familiari-in-attesa');
            if (motiviFamiliariInAttesaEl) {
                motiviFamiliariInAttesaEl.textContent = giorniPerTipo['MOTIVI FAMILIARI'] || 0;
            }
            
            // Aggiorna il contatore recuperi in attesa
            const recuperiInAttesaEl = document.getElementById('recuperi-in-attesa');
            if (recuperiInAttesaEl) {
                recuperiInAttesaEl.textContent = giorniPerTipo['RECUPERI'] || 0;
            }
            
        } catch (error) {
            console.error('Errore nel caricamento delle richieste in attesa da Supabase:', error.message || 'Errore sconosciuto');
            
            // Imposta tutti i contatori a 0 in caso di errore
            const elementi = [
                'ferie-in-attesa',
                'ferie-vecchie-in-attesa', 
                'festivita-in-attesa',
                'motivi-familiari-in-attesa',
                'recuperi-in-attesa'
            ];
            
            elementi.forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) {
                    elemento.textContent = '0';
                }
            });
        }
    }
    
    // Mostra la tab attiva all'avvio
    const activeTab = document.querySelector('.nav-tabs a.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).style.display = 'block';
        
        // Se la tab attiva è "richieste", carica le richieste
        if (tabId === 'richieste') {
            caricaRichieste();
        }
        // Se la tab attiva è "riepilogo", carica i dati riepilogativi
        else if (tabId === 'riepilogo') {
            caricaDatiRiepilogo();
        }
    } else {
        // Se non c'è una tab attiva, attiva la tab riepilogo come predefinita
        const riepilogoTab = document.querySelector('.nav-tabs a[data-tab="riepilogo"]');
        if (riepilogoTab) {
            riepilogoTab.classList.add('active');
            document.getElementById('riepilogo-tab').style.display = 'block';
            caricaDatiRiepilogo();
        }
    }
});

// Aggiungi dopo la dichiarazione delle variabili DOM all'inizio del file
const calendarBody = document.getElementById('calendar-body');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const prevYearBtn = document.getElementById('prev-year');
const nextYearBtn = document.getElementById('next-year');
const calendarMonthYear = document.getElementById('calendar-month-year');

// Aggiungi queste variabili globali per tenere traccia del mese e anno correnti
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Aggiungi gli event listener per i pulsanti di navigazione del calendario
if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', function() {
        navigateMonth(-1);
    });
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', function() {
        navigateMonth(1);
    });
}

if (prevYearBtn) {
    prevYearBtn.addEventListener('click', function() {
        navigateYear(-1);
    });
}

if (nextYearBtn) {
    nextYearBtn.addEventListener('click', function() {
        navigateYear(1);
    });
}

// Funzione per navigare tra i mesi
function navigateMonth(step) {
    currentMonth += step;
    
    // Gestisci il cambio di anno quando si naviga oltre dicembre o prima di gennaio
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    
    renderCalendar();
}

// Funzione per navigare tra gli anni
function navigateYear(step) {
    currentYear += step;
    renderCalendar();
}

// Funzione per generare il calendario
function renderCalendar() {
    // Aggiorna il titolo del calendario
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    calendarMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Svuota il corpo del calendario
    calendarBody.innerHTML = '';
    
    // Ottieni il primo giorno del mese (0 = Domenica, 1 = Lunedì, ...)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    // Adatta per iniziare da lunedì (0 = Lunedì, 1 = Martedì, ...)
    const firstDayAdjusted = (firstDay === 0) ? 6 : firstDay - 1;
    
    // Ottieni l'ultimo giorno del mese
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Ottieni l'ultimo giorno del mese precedente
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    
    // Calcola il numero di righe necessarie
    const totalDays = firstDayAdjusted + lastDay;
    const rows = Math.ceil(totalDays / 7);
    
    // Ottieni la data corrente per evidenziare il giorno corrente
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    // Carica le richieste dell'utente per visualizzarle nel calendario
    caricaRichiestePerCalendario();
    
    // Carica le sospensioni didattiche per visualizzarle nel calendario
    caricaSospensioniPerCalendario();
    
    // Genera le righe del calendario
    let date = 1;
    for (let i = 0; i < rows; i++) {
        // Crea una nuova riga
        const row = document.createElement('tr');
        
        // Genera le celle per ogni giorno della settimana
        for (let j = 0; j < 7; j++) {
            // Crea una nuova cella
            const cell = document.createElement('td');
            
            // Gestisci i giorni del mese precedente
            if (i === 0 && j < firstDayAdjusted) {
                const prevDate = prevMonthLastDay - (firstDayAdjusted - j - 1);
                const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                const dateStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${prevDate.toString().padStart(2, '0')}`;
                
                cell.innerHTML = `<div class="day-container">
                                    <div class="day-number text-muted">${prevDate}</div>
                                    <div class="request-indicators-container" data-date="${dateStr}"></div>
                                 </div>`;
                cell.classList.add('text-muted');
                cell.style.backgroundColor = '#f5f5f5'; // Grigio chiaro per i giorni non del mese corrente
            }
            // Gestisci i giorni del mese corrente
            else if (date <= lastDay) {
                // Verifica se è il giorno corrente
                const isToday = date === todayDate && currentMonth === todayMonth && currentYear === todayYear;
                
                // Verifica se è un weekend (sabato o domenica)
                const dayOfWeek = new Date(currentYear, currentMonth, date).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                
                // Verifica se è un giorno festivo
                const currentDate = new Date(currentYear, currentMonth, date);
                const isFestivo = Holidays.isFestivo(currentDate);
                
                // Determina se il giorno deve essere evidenziato (weekend o festivo)
                const isHighlighted = isWeekend || isFestivo;
                
                // Ottieni il nome della festività se è un giorno festivo
                let nomeFestivita = '';
                if (isFestivo) {
                    // Cerca il nome della festività nelle festività fisse
                    const festivitaFissa = Holidays.festivitaFisse.find(f => 
                        f.giorno === currentDate.getDate() && f.mese === currentDate.getMonth() + 1
                    );
                    
                    if (festivitaFissa) {
                        nomeFestivita = festivitaFissa.nome;
                    } else {
                        // Controlla se è Pasqua o Pasquetta
                        const pasqua = Holidays.calcolaPasqua(currentYear);
                        if (currentDate.getDate() === pasqua.getDate() && 
                            currentDate.getMonth() === pasqua.getMonth() && 
                            currentDate.getFullYear() === pasqua.getFullYear()) {
                            nomeFestivita = 'Pasqua';
                        } else {
                            const pasquetta = new Date(pasqua);
                            pasquetta.setDate(pasqua.getDate() + 1);
                            if (currentDate.getDate() === pasquetta.getDate() && 
                                currentDate.getMonth() === pasquetta.getMonth() && 
                                currentDate.getFullYear() === pasquetta.getFullYear()) {
                                nomeFestivita = 'Pasquetta';
                            }
                        }
                    }
                }
                
                // Crea il contenuto della cella
                cell.innerHTML = `<div class="day-container">
                                    <div class="day-number ${isHighlighted ? 'calendar-weekend' : ''}">${date}</div>
                                    <div class="request-indicators-container" data-date="${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}"></div>
                                 </div>`;
                
                // Imposta lo sfondo bianco per i giorni del mese corrente
                cell.style.backgroundColor = '#ffffff';
                
                // Aggiungi classi per stili speciali
                if (isToday) {
                    cell.classList.add('calendar-day-today');
                }
                if (isHighlighted) {
                    cell.classList.add('calendar-weekend');
                    cell.style.backgroundColor = '#ffebee'; // Rosso pastello per weekend e festivi
                    
                    // Aggiungi tooltip per i giorni festivi
                    if (isFestivo && nomeFestivita) {
                        cell.title = nomeFestivita;
                    } else if (isWeekend) {
                        cell.title = dayOfWeek === 0 ? 'Domenica' : 'Sabato';
                    }
                }
                
                date++;
            }
            // Gestisci i giorni del mese successivo
            else {
                const nextDate = date - lastDay;
                const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
                const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
                const dateStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${nextDate.toString().padStart(2, '0')}`;
                
                cell.innerHTML = `<div class="day-container">
                                    <div class="day-number text-muted">${nextDate}</div>
                                    <div class="request-indicators-container" data-date="${dateStr}"></div>
                                 </div>`;
                cell.classList.add('text-muted');
                cell.style.backgroundColor = '#f5f5f5'; // Grigio chiaro per i giorni non del mese corrente
                date++;
            }
            
            // Aggiungi la cella alla riga
            row.appendChild(cell);
        }
        
        // Aggiungi la riga al corpo del calendario
        calendarBody.appendChild(row);
    }
}

/**
 * Carica le richieste dell'utente e le visualizza nel calendario da Supabase
 */
async function caricaRichiestePerCalendario() {
    const userData = UserUtils.getUserData();
    if (!userData || !userData.username) {
        console.error('Dati utente non disponibili');
        return;
    }
    
    // Pulisci i container delle richieste esistenti
    document.querySelectorAll('.request-indicators-container').forEach(container => {
        container.innerHTML = '';
    });
    
    try {
        // Prima ottieni l'ID dell'utente
        const { data: userRecordData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', userData.username)
            .limit(1);
        
        const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
        
        if (!userRecord) {
            throw new Error('Utente non trovato');
        }
        
        if (userError) {
            throw userError;
        }
        
        // CARICAMENTO RICHIESTE CALENDARIO: Query diretta con user_id
        const { data: richieste, error } = await supabase
            .from('richieste')
            .select('*')
            .eq('user_id', userRecord.id);
        
        if (error) {
            throw error;
        }
        
        if (richieste && richieste.length > 0) {
                
            // Mappa le richieste per data
            const richiestePerData = {};
            
            richieste.forEach(richiesta => {
                // Converti le date in oggetti Date (usando i nomi dei campi Supabase)
                const dataInizio = new Date(richiesta.data_inizio);
                const dataFine = new Date(richiesta.data_fine);
                    
                // Itera su tutti i giorni della richiesta
                const currentDate = new Date(dataInizio);
                while (currentDate <= dataFine) {
                    const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
                    
                    if (!richiestePerData[dateKey]) {
                        richiestePerData[dateKey] = [];
                    }
                    
                    richiestePerData[dateKey].push(richiesta);
                    
                    // Passa al giorno successivo
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
                
            // Aggiungi gli indicatori di richiesta alle celle del calendario
            for (const dateKey in richiestePerData) {
                const container = document.querySelector(`.request-indicators-container[data-date="${dateKey}"]`);
                if (container) {
                    richiestePerData[dateKey].forEach(richiesta => {
                        const indicator = document.createElement('div');
                        let statoClass = '';
                        
                        // Normalizza lo stato (gestisce le varianti di genere)
                        let statoNormalizzato = richiesta.stato.toUpperCase().trim();
                        if (statoNormalizzato === 'APPROVATO') {
                            statoNormalizzato = 'APPROVATA';
                        } else if (statoNormalizzato === 'RIFIUTATO') {
                            statoNormalizzato = 'RIFIUTATA';
                        }
                        
                        // Mappa lo stato alla classe CSS
                        switch (statoNormalizzato) {
                            case 'IN ATTESA':
                                statoClass = 'calendar-request-in-attesa';
                                break;
                            case 'APPROVATA':
                                statoClass = 'calendar-request-approvata';
                                break;
                            case 'RIFIUTATA':
                                statoClass = 'calendar-request-rifiutata';
                                break;
                            default:
                                statoClass = 'calendar-request-sconosciuto';
                        }
                        
                        // Crea il contenitore per l'indicatore e l'abbreviazione
                        const indicatorContainer = document.createElement('div');
                        indicatorContainer.style.display = 'flex';
                        indicatorContainer.style.alignItems = 'center';
                        indicatorContainer.style.margin = '2px';
                        
                        // Imposta la classe e il titolo dell'indicatore
                        indicator.className = statoClass;
                        indicator.title = `${richiesta.tipo} - ${richiesta.stato}`;
                        
                        // Aggiungi l'abbreviazione
                        const abbreviazione = document.createElement('span');
                        abbreviazione.style.marginLeft = '2px';
                        abbreviazione.style.fontSize = '10px';
                        
                        // Mappa il tipo di richiesta all'abbreviazione
                        switch (richiesta.tipo) {
                            case 'FERIE':
                                abbreviazione.textContent = 'F';
                                break;
                            case 'FERIE VECCHIE':
                                abbreviazione.textContent = 'FV';
                                break;
                            case "FESTIVITA' SOPPRESSE":
                                abbreviazione.textContent = 'FS';
                                break;
                            case 'MOTIVI FAMILIARI':
                                abbreviazione.textContent = 'MF';
                                break;
                            case 'RECUPERI':
                                abbreviazione.textContent = 'R';
                                break;
                            default:
                                abbreviazione.textContent = '?';
                        }
                        
                        // Assembla il contenitore
                        indicatorContainer.appendChild(indicator);
                        indicatorContainer.appendChild(abbreviazione);
                        
                        container.appendChild(indicatorContainer);
                    });
                }
            }
        }
        
    } catch (error) {
        console.error('Errore nel caricamento delle richieste per il calendario da Supabase:', error.message || 'Errore sconosciuto');
    }
}

/**
 * Carica le sospensioni didattiche e le visualizza nel calendario da Supabase
 */
async function caricaSospensioniPerCalendario() {
    try {
        // CARICAMENTO SOSPENSIONI CALENDARIO: Query diretta a Supabase
        const { data: sospensioni, error } = await supabase
            .from('sospensioni')
            .select('*');
        
        if (error) {
            throw error;
        }
        
        if (sospensioni && sospensioni.length > 0) {
            
            // Applica lo sfondo giallo alle celle delle sospensioni
            sospensioni.forEach(sospensione => {
                const data = new Date(sospensione.data);
                const dateKey = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}-${data.getDate().toString().padStart(2, '0')}`;
                
                // Trova la cella corrispondente nel calendario
                const container = document.querySelector(`.request-indicators-container[data-date="${dateKey}"]`);
                if (container) {
                    const cell = container.closest('td');
                    if (cell) {
                        // Applica la classe per lo sfondo giallo
                        cell.classList.add('calendar-sospensione');
                        
                        // Aggiungi tooltip con informazioni sulla sospensione
                        const existingTitle = cell.title || '';
                        const newTitle = existingTitle ? 
                            `${existingTitle} - Sospensione: ${sospensione.nome}` : 
                            `Sospensione: ${sospensione.nome}`;
                        cell.title = newTitle;
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Errore nel caricamento delle sospensioni per il calendario da Supabase:', error.message || 'Errore sconosciuto');
    }
}

/**
 * Genera un PDF con tutte le richieste di ferie da Supabase
 */
async function generaPdfRichieste() {
    const { jsPDF } = window.jspdf;
    
    // Ottieni i dati dell'utente
    const userData = UserUtils.getUserData();
    
    if (!userData) {
        alert('Errore: impossibile ottenere i dati utente');
        return;
    }
    
    try {
        // Prima ottieni l'ID dell'utente
        const { data: userRecordData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', userData.username)
            .limit(1);
        
        const userRecord = userRecordData && userRecordData.length > 0 ? userRecordData[0] : null;
        
        if (!userRecord) {
            throw new Error('Utente non trovato');
        }
        
        if (userError) {
            throw userError;
        }
        
        // CARICAMENTO RICHIESTE PDF: Query diretta con user_id
        const { data: richieste, error } = await supabase
            .from('richieste')
            .select('*')
            .eq('user_id', userRecord.id);
        
        if (error) {
            throw error;
        }
        
        if (richieste && richieste.length > 0) {
            
            // Separa le richieste approvate da quelle non approvate (usando i nomi dei campi Supabase)
            const richiesteApprovate = richieste.filter(r => r.stato === 'APPROVATA')
                .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio));
            const richiesteNonApprovate = richieste.filter(r => r.stato !== 'APPROVATA')
                .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio));
            
            // Crea il PDF
            const doc = new jsPDF();
            
            // Intestazione
            doc.setFontSize(20);
            doc.text('Riepilogo Richieste Ferie', 20, 20);
            
            doc.setFontSize(12);
            doc.text(`Utente: ${userData.nome || userData.username}`, 20, 35);
            doc.text(`Data generazione: ${new Date().toLocaleDateString('it-IT')}`, 20, 45);
            
            let yPosition = 60;
            
            // Sezione richieste approvate
            if (richiesteApprovate.length > 0) {
                doc.setFontSize(16);
                doc.text('RICHIESTE APPROVATE', 20, yPosition);
                yPosition += 15;
                
                doc.setFontSize(10);
                richiesteApprovate.forEach((richiesta, index) => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    // Usa i nomi dei campi Supabase
                    const dataInizio = new Date(richiesta.data_inizio).toLocaleDateString('it-IT');
                    const dataFine = new Date(richiesta.data_fine).toLocaleDateString('it-IT');
                    
                    doc.text(`${index + 1}. ${richiesta.tipo}`, 20, yPosition);
                    doc.text(`Dal: ${dataInizio} al: ${dataFine}`, 30, yPosition + 8);
                    doc.text(`Giorni: ${richiesta.giorni} - Stato: ${richiesta.stato}`, 30, yPosition + 16);
                    
                    if (richiesta.note) {
                        doc.text(`Note: ${richiesta.note}`, 30, yPosition + 24);
                        yPosition += 32;
                    } else {
                        yPosition += 24;
                    }
                });
                
                yPosition += 10;
            }
            
            // Sezione richieste non approvate
            if (richiesteNonApprovate.length > 0) {
                if (yPosition > 200) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.setFontSize(16);
                doc.text('RICHIESTE NON APPROVATE', 20, yPosition);
                yPosition += 15;
                
                doc.setFontSize(10);
                richiesteNonApprovate.forEach((richiesta, index) => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    // Usa i nomi dei campi Supabase
                    const dataInizio = new Date(richiesta.data_inizio).toLocaleDateString('it-IT');
                    const dataFine = new Date(richiesta.data_fine).toLocaleDateString('it-IT');
                    
                    doc.text(`${index + 1}. ${richiesta.tipo}`, 20, yPosition);
                    doc.text(`Dal: ${dataInizio} al: ${dataFine}`, 30, yPosition + 8);
                    doc.text(`Giorni: ${richiesta.giorni} - Stato: ${richiesta.stato}`, 30, yPosition + 16);
                    
                    if (richiesta.note) {
                        doc.text(`Note: ${richiesta.note}`, 30, yPosition + 24);
                        yPosition += 32;
                    } else {
                        yPosition += 24;
                    }
                });
            }
            
            // Salva il PDF
            const fileName = `Richieste_Ferie_${userData.username}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
        } else {
            // Se non ci sono richieste
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.text('Riepilogo Richieste Ferie', 20, 20);
            doc.setFontSize(12);
            doc.text(`Utente: ${userData.nome || userData.username}`, 20, 35);
            doc.text(`Data generazione: ${new Date().toLocaleDateString('it-IT')}`, 20, 45);
            doc.text('Nessuna richiesta presente.', 20, 60);
            
            const fileName = `Richieste_Ferie_${userData.username}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        }
        
    } catch (error) {
        console.error('Errore nella generazione del PDF da Supabase:', error.message || 'Errore sconosciuto');
        alert(`Errore nella generazione del PDF: ${error.message || 'Errore sconosciuto'}`);
    }
}