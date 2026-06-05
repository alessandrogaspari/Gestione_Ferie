/**
 * dashboard.js - Gestione della dashboard per l'applicazione Gestione Ferie ATA
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verifica autenticazione e inizializza UI utente
    if (!UserUtils.initUserUI()) return;
    
    // Carica i dati del riepilogo all'avvio della pagina
    caricaDatiRiepilogo();
    
    // Elementi DOM
    const logoutBtn = document.getElementById('logout-btn');
    const navTabs = document.querySelectorAll('.nav-tabs a') || [];
    const tabContents = document.querySelectorAll('.tab-content');
    const nuovaRichiestaBtn = document.getElementById('nuova-richiesta-btn');
    const calendarBody = document.getElementById('calendar-body');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const prevYearBtn = document.getElementById('prev-year');
    const nextYearBtn = document.getElementById('next-year');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const richiesteTableBody = document.getElementById('richieste-table-body');
    
    // Elementi DOM per il riepilogo
    const ferieTotali = document.getElementById('ferie-totali');
    const ferieUtilizzate = document.getElementById('ferie-utilizzate');
    const ferieDisponibili = document.getElementById('ferie-disponibili');
    const ferieVecchieTotali = document.getElementById('ferie-vecchie-totali');
    const ferieVecchieUtilizzate = document.getElementById('ferie-vecchie-utilizzate');
    const ferieVecchieDisponibili = document.getElementById('ferie-vecchie-disponibili');
    const festivitaTotali = document.getElementById('festivita-totali');
    const festivitaUtilizzate = document.getElementById('festivita-utilizzate');
    const festivitaDisponibili = document.getElementById('festivita-disponibili');
    const motiviFamiliariTotali = document.getElementById('motivi-familiari-totali');
    const motiviFamiliariUtilizzate = document.getElementById('motivi-familiari-utilizzate');
    const motiviFamiliariDisponibili = document.getElementById('motivi-familiari-disponibili');
    const recuperiTotali = document.getElementById('recuperi-totali');
    const recuperiUtilizzati = document.getElementById('recuperi-utilizzati');
    const recuperiResidui = document.getElementById('recuperi-residui');
    
    // Aggiungi event listener per il pulsante logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            UserUtils.logout();
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
    
    // Carica le richieste dell'utente
    function caricaRichieste() {
        const userData = UserUtils.getUserData();
        if (!userData || !userData.username) {
            console.error('Dati utente non disponibili');
            return;
        }
        
        // Mostra indicatore di caricamento
        richiesteTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Caricamento richieste...</td></tr>';
        
        // Carica le richieste tramite API
        API.getRichieste(userData.username)
            .then(response => {
                if (response.success) {
                    // Correzione: accedi a response.richieste invece di response.data
                    const richieste = response.richieste;
                    
                    if (!richieste || richieste.length === 0) {
                        richiesteTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nessuna richiesta trovata</td></tr>';
                        return;
                    }
                    
                    // Ordina le richieste per data (più recenti prima)
                    richieste.sort((a, b) => new Date(b.dataRichiesta) - new Date(a.dataRichiesta));
                    
                    // Svuota la tabella
                    richiesteTableBody.innerHTML = '';
                    
                    // Popola la tabella con le richieste
                    richieste.forEach(richiesta => {
                        const row = document.createElement('tr');
                        
                        // Crea le celle della riga
                        row.innerHTML = `
                            <td>${richiesta.tipo}</td>
                            <td>${richiesta.dataInizio}</td>
                            <td>${richiesta.dataFine}</td>
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
                } else {
                    richiesteTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Errore nel caricamento delle richieste: ${response.message}</td></tr>`;
                }
            })
            .catch(error => {
                console.error('Errore nel caricamento delle richieste:', error);
                richiesteTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Errore nel caricamento delle richieste: ${error.message}</td></tr>`;
            });
    }
    
    // Funzione per eliminare una richiesta
    function eliminaRichiesta(id) {
        if (confirm('Sei sicuro di voler eliminare questa richiesta?')) {
            API.eliminaRichiesta(id)
                .then(response => {
                    if (response.success) {
                        alert('Richiesta eliminata con successo!');
                        caricaRichieste(); // Ricarica le richieste
                    } else {
                        alert(`Errore nell'eliminazione della richiesta: ${response.message}`);
                    }
                })
                .catch(error => {
                    console.error('Errore nell\'eliminazione della richiesta:', error);
                    alert(`Errore nell'eliminazione della richiesta: ${error.message}`);
                });
        }
    }
    
    // Funzione per modificare una richiesta
    function modificaRichiesta(id) {
        // Reindirizza alla pagina di modifica con l'ID della richiesta
        window.location.href = `richiesta-ferie.html?id=${id}`;
    }
    
    /**
     * Carica i dati riepilogativi dell'utente
     */
    function caricaDatiRiepilogo() {
        const userData = UserUtils.getUserData();
        if (!userData || !userData.username) {
            console.error('Dati utente non disponibili');
            return;
        }
        
        API.getDatiUtente(userData.username)
            .then(response => {
                if (!response) {
                    throw new Error('Risposta non valida dal server');
                }

                const dati = response.data || {};
                
                // Funzione helper per aggiornare un elemento in modo sicuro
                function updateElement(id, value) {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value || '0';
                    }
                }
                
                // Aggiorna i valori per le ferie
                updateElement('ferie-totali', dati.FerieTotali);
                updateElement('ferie-utilizzate', dati.FerieUtilizzate);
                updateElement('ferie-disponibili', dati.FerieTotali - dati.FerieUtilizzate);
                
                // Aggiorna i valori per le ferie vecchie
                updateElement('ferie-vecchie-totali', dati.FerieVecchieTotali);
                updateElement('ferie-vecchie-utilizzate', dati.FerieVecchieUtilizzate);
                updateElement('ferie-vecchie-disponibili', dati.FerieVecchieTotali - dati.FerieVecchieUtilizzate);
                
                // Aggiorna i valori per le festività soppresse
                updateElement('festivita-totali', dati.FestivitaTotali);
                updateElement('festivita-utilizzate', dati.FestivitaUtilizzate);
                updateElement('festivita-disponibili', dati.FestivitaTotali - dati.FestivitaUtilizzate);
                
                // Aggiorna i valori per i motivi familiari
                updateElement('motivi-familiari-totali', dati.MotiviFamiliariTotali);
                updateElement('motivi-familiari-utilizzate', dati.MotiviFamiliariUtilizzati);
                updateElement('motivi-familiari-disponibili', dati.MotiviFamiliariTotali - dati.MotiviFamiliariUtilizzati);
                
                // Aggiorna i valori per i recuperi
                updateElement('recuperi-totali', dati.RecuperiTotali);
                updateElement('recuperi-utilizzati', dati.RecuperiUtilizzati);
                updateElement('recuperi-residui', dati.RecuperiTotali - dati.RecuperiUtilizzati);
                
                // Carica le richieste in attesa
                caricaRichiesteInAttesa();
            })
            .catch(error => {
                console.error('Errore nel caricamento dei dati:', error.message || 'Errore sconosciuto');
                // Imposta tutti i valori a '0' in caso di errore
                const ids = [
                    'ferie-totali', 'ferie-utilizzate', 'ferie-disponibili',
                    'ferie-vecchie-totali', 'ferie-vecchie-utilizzate', 'ferie-vecchie-disponibili',
                    'festivita-totali', 'festivita-utilizzate', 'festivita-disponibili',
                    'motivi-familiari-totali', 'motivi-familiari-utilizzate', 'motivi-familiari-disponibili',
                    'recuperi-totali', 'recuperi-utilizzati', 'recuperi-residui'
                ];
                ids.forEach(id => updateElement(id, '0'));
            });
    }
    
    /**
     * Carica le richieste in attesa e mostra i giorni per categoria
     */
    function caricaRichiesteInAttesa() {
        const userData = UserUtils.getUserData();
        if (!userData || !userData.username) {
            console.error('Dati utente non disponibili');
            return;
        }
        
        // Carica le richieste tramite API
        API.getRichieste(userData.username)
            .then(response => {
                if (response.success && response.richieste) {
                    const richieste = response.richieste;
                    console.log('Tutte le richieste:', richieste);
                    
                    // Filtra solo le richieste in attesa
                    const richiesteInAttesa = richieste.filter(r => r.stato.toUpperCase().trim() === 'IN ATTESA');
                    console.log('Richieste in attesa:', richiesteInAttesa);
                    
                    // Calcola i giorni per tipo di richiesta
                    const giorniPerTipo = {
                        'FERIE': 0,
                        'FERIE VECCHIE': 0,
                        'FESTIVITA\' SOPPRESSE': 0,
                        'MOTIVI FAMILIARI': 0,
                        'RECUPERI': 0
                    };
                    
                    richiesteInAttesa.forEach(richiesta => {
                        console.log('Tipo richiesta:', richiesta.tipo);
                        if (giorniPerTipo.hasOwnProperty(richiesta.tipo)) {
                            giorniPerTipo[richiesta.tipo] += parseInt(richiesta.giorni) || 0;
                        }
                    });
                    
                    // Aggiorna i valori in attesa per ciascuna categoria
                    const ferieInAttesaEl = document.getElementById('ferie-in-attesa');
                    if (ferieInAttesaEl) {
                        ferieInAttesaEl.textContent = giorniPerTipo['FERIE'] || 0;
                    }
                    
                    const ferieVecchieInAttesaEl = document.getElementById('ferie-vecchie-in-attesa');
                    if (ferieVecchieInAttesaEl) {
                        ferieVecchieInAttesaEl.textContent = giorniPerTipo['FERIE VECCHIE'] || 0;
                    }
                    
                    const festivitaInAttesaEl = document.getElementById('festivita-in-attesa');
                    if (festivitaInAttesaEl) {
                        festivitaInAttesaEl.textContent = giorniPerTipo['FESTIVITA\' SOPPRESSE'] || 0;
                    }
                    
                    const motiviFamiliariInAttesaEl = document.getElementById('motivi-familiari-in-attesa');
                    if (motiviFamiliariInAttesaEl) {
                        motiviFamiliariInAttesaEl.textContent = giorniPerTipo['MOTIVI FAMILIARI'] || 0;
                    }
                    
                    const recuperiInAttesaEl = document.getElementById('recuperi-in-attesa');
                    if (recuperiInAttesaEl) {
                        recuperiInAttesaEl.textContent = giorniPerTipo['RECUPERI'] || 0;
                    }
                }
            })
            .catch(error => {
                console.error('Errore nel caricamento delle richieste in attesa:', error);
            });
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
 * Carica le richieste dell'utente e le visualizza nel calendario
 */
function caricaRichiestePerCalendario() {
    const userData = UserUtils.getUserData();
    if (!userData || !userData.username) {
        console.error('Dati utente non disponibili');
        return;
    }
    
    // Pulisci i container delle richieste esistenti
    document.querySelectorAll('.request-indicators-container').forEach(container => {
        container.innerHTML = '';
    });
    
    // Carica le richieste tramite API
    API.getRichieste(userData.username)
        .then(response => {
            if (response.success && response.richieste) {
                const richieste = response.richieste;
                
                // Mappa le richieste per data
                const richiestePerData = {};
                
                richieste.forEach(richiesta => {
                    // Converti le date in oggetti Date
                    const dataInizio = new Date(richiesta.dataInizio);
                    const dataFine = new Date(richiesta.dataFine);
                    
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
        })
        .catch(error => {
            console.error('Errore nel caricamento delle richieste per il calendario:', error);
        });
}