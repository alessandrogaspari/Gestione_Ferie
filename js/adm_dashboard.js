/**
 * adm_dashboard.js - Gestione della dashboard amministrativa - Integrato con Supabase
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';
// Importa le utility per la gestione utente
import { UserUtils } from './user-utils.js';
// Importa la funzione per generare Excel delle ferie
import { generaExcelFerie } from './adm_esplodi_ferie.js';

// Variabili globali per memorizzare tutti gli utenti e gestire la paginazione
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const usersPerPage = 10;

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Aggiungi l'event listener al pulsante "Esplodi Ferie" nel nav-tabs
    const esplodiFerieBtnNav = document.getElementById('esplodi-ferie-btn-nav');
    if (esplodiFerieBtnNav) {
        esplodiFerieBtnNav.addEventListener('click', generaExcelFerie);
    }
    
    // Aggiungi l'event listener al pulsante "Riepilogo PDF"
    const riepilogoPdfBtn = document.getElementById('riepilogo-pdf-btn');
    if (riepilogoPdfBtn) {
        riepilogoPdfBtn.addEventListener('click', generaRiepilogoPDF);
    }
    
    // Inizializza l'interfaccia utente con nome e ruolo
    UserUtils.initUserUI();
    
    // Carica i dati degli utenti
    loadUsers();

    // Gestione del logout nell'header
    document.getElementById('logout-btn-header').addEventListener('click', function() {
        UserUtils.logout();
    });
    
    // Gestione della ricerca utenti
    document.getElementById('user-search').addEventListener('input', async function() {
        const searchTerm = this.value.toLowerCase().trim();
        await filterUsers(searchTerm);
    });
    
    // Gestione del filtro per richieste in attesa
    document.getElementById('pending-requests-filter').addEventListener('change', async function() {
        const searchTerm = document.getElementById('user-search').value.toLowerCase().trim();
        await filterUsers(searchTerm);
    });
    
    // Gestione dei controlli di paginazione
    document.getElementById('prev-page-btn').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
        }
    });
    
    document.getElementById('next-page-btn').addEventListener('click', function() {
        const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayCurrentPage();
        }
    });

    // Gestione delle schede
    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            
            // Nascondi tutte le schede
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Rimuovi la classe active da tutti i tab
            document.querySelectorAll('.tab-link').forEach(t => {
                t.classList.remove('active');
            });
            
            // Mostra la scheda selezionata e attiva il tab
            document.getElementById(targetId).style.display = 'block';
            this.classList.add('active');
        });
    });

    // Attiva la prima scheda per default
    document.querySelector('.tab-link').click();
});

/**
 * Carica e visualizza i dati degli utenti da Supabase
 */
async function loadUsers() {
    try {
        // Mostra l'indicatore di caricamento
        const loadingIndicator = document.getElementById('loading-indicator');
        const progressBar = document.getElementById('progress-bar');
        loadingIndicator.style.display = 'block';
        document.getElementById('users-container').innerHTML = '';
        progressBar.style.width = '0%';
        
        // RECUPERO UTENTI: Query diretta a Supabase (esclude utenti SUPERUSER)
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, nome, ruolo')
            .neq('ruolo', 'SUPERUSER')
            .order('nome', { ascending: true });
        
        if (usersError) {
            throw usersError;
        }
        
        console.log('Utenti caricati da Supabase:', users);
        
        // Carica i dati completi per ogni utente
        const usersWithData = [];
        const totalUsers = users.length;
        
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            
            // RECUPERO TOTALI FERIE per ogni utente (senza .single() per evitare errori)
            const { data: totaliData, error: totaliError } = await supabase
                .from('ferie_balance')
                .select('user_id, ferie_totali, ferie_utilizzate, ferie_vecchie_totali, ferie_vecchie_utilizzate, festivita_totali, festivita_utilizzate, motivi_familiari_totali, motivi_familiari_utilizzati, recuperi_totali, recuperi_utilizzati')
                .eq('user_id', user.id)
                .limit(1);
            
            // Procedi sempre, anche se non ci sono dati ferie
            const ferieRecord = totaliData && totaliData.length > 0 ? totaliData[0] : null;
            if (!totaliError) {
                usersWithData.push({
                    ...user,
                    Username: user.username, // Compatibilità con il codice esistente
                    userData: {
                        nome: user.nome
                    },
                    // Dati ferie (con valori predefiniti se non esistono)
                    FerieTotali: ferieRecord?.ferie_totali || 26,
                    FerieUtilizzate: ferieRecord?.ferie_utilizzate || 0,
                    FerieVecchieTotali: ferieRecord?.ferie_vecchie_totali || 0,
                    FerieVecchieUtilizzate: ferieRecord?.ferie_vecchie_utilizzate || 0,
                    FestivitaTotali: ferieRecord?.festivita_totali || 0,
                    FestivitaUtilizzate: ferieRecord?.festivita_utilizzate || 0,
                    MotiviFamiliariTotali: ferieRecord?.motivi_familiari_totali || 3,
                    MotiviFamiliariUtilizzati: ferieRecord?.motivi_familiari_utilizzati || 0,
                    RecuperiTotali: ferieRecord?.recuperi_totali || 0,
                    RecuperiUtilizzati: ferieRecord?.recuperi_utilizzati || 0
                });
            }
            
            // Aggiorna la barra di progresso
            const progress = Math.round(((i + 1) / totalUsers) * 100);
            progressBar.style.width = progress + '%';
        }
        
        // Gli utenti sono già ordinati dalla query Supabase
        
        // Salva tutti gli utenti nella variabile globale
        allUsers = usersWithData;
        
        // Inizializza gli utenti filtrati con tutti gli utenti
        filteredUsers = [...allUsers];
        
        // Reset della paginazione
        currentPage = 1;
        
        // Nascondi l'indicatore di caricamento
        loadingIndicator.style.display = 'none';
        
        // Visualizza gli utenti con paginazione
        displayCurrentPage();
        
    } catch (error) {
        // Nascondi l'indicatore di caricamento in caso di errore
        document.getElementById('loading-indicator').style.display = 'none';
        console.error('Errore nel caricamento degli utenti da Supabase:', error);
        showError('Errore nel caricamento degli utenti: ' + (error.message || 'Errore sconosciuto'));
    }
}

/**
 * Visualizza la pagina corrente degli utenti
 */
function displayCurrentPage() {
    // Filtra l'utente corrente (non mostrare l'utente loggato nella lista)
    const currentUser = UserUtils.getUserData();
    const usersToShow = filteredUsers.filter(user => 
        user.Username !== currentUser.username
    );
    
    // Calcola gli indici per la paginazione
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const currentPageUsers = usersToShow.slice(startIndex, endIndex);
    
    // Visualizza gli utenti della pagina corrente
    displayUsers(currentPageUsers);
    
    // Aggiorna i controlli di paginazione
    updatePaginationControls(usersToShow.length);
}

/**
 * Aggiorna i controlli di paginazione
 * @param {number} totalUsers - Numero totale di utenti
 */
function updatePaginationControls(totalUsers) {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const startUser = totalUsers > 0 ? (currentPage - 1) * usersPerPage + 1 : 0;
    const endUser = Math.min(currentPage * usersPerPage, totalUsers);
    
    // Aggiorna il testo informativo
    document.getElementById('pagination-info-text').textContent = 
        `Visualizzazione utenti ${startUser}-${endUser} di ${totalUsers}`;
    
    // Aggiorna il numero di pagina
    document.getElementById('page-info').textContent = 
        totalPages > 0 ? `Pagina ${currentPage} di ${totalPages}` : 'Pagina 1';
    
    // Aggiorna lo stato dei pulsanti
    document.getElementById('prev-page-btn').disabled = currentPage <= 1;
    document.getElementById('next-page-btn').disabled = currentPage >= totalPages;
    
    // Mostra/nascondi i controlli di paginazione
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.style.display = totalUsers > usersPerPage ? 'block' : 'none';
}

/**
 * Visualizza i dati degli utenti utilizzando le card
 * @param {Array} users - Array di oggetti utente
 */
async function displayUsers(users) {
    const usersContainer = document.getElementById('users-container');
    usersContainer.innerHTML = '';
    
    // Per ogni utente con dati completi, crea una card
    for (const user of users) {
        const userData = user.userData;

        const pendingRequests = await calculatePendingDays(user.Username);
        
        // Clona il template della card utente
        const template = document.getElementById('user-card-template');
        const userCard = document.importNode(template.content, true);
        
        // Imposta il nome utente
        const userNameElement = userCard.querySelector('.user-name');
        userNameElement.firstChild.textContent = userData.nome || user.Username;

        // Mostra l'icona di notifica se ci sono richieste in attesa
        const notificationIcon = userNameElement.querySelector('.notification-icon');
        const hasPendingRequests = pendingRequests.ferie > 0 || 
                                  pendingRequests.ferieVecchie > 0 || 
                                  pendingRequests.festivita > 0 || 
                                  pendingRequests.motiviFamiliari > 0 || 
                                  pendingRequests.recuperi > 0;
        notificationIcon.style.display = hasPendingRequests ? 'inline-block' : 'none';

        // Verifica se l'utente ha record nella tabella totali_ferie da Supabase
        const initButton = userCard.querySelector('.init-user');
        const detailButton = userCard.querySelector('.detail-user');
        
        try {
            // Prima ottieni l'ID dell'utente
            const { data: userRecord, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('username', user.Username)
                .limit(1);
            
            const userRecordSingle = userRecord && userRecord.length > 0 ? userRecord[0] : null;
            
            let hasFerie = false;
            if (!userError && userRecordSingle) {
                // VERIFICA ESISTENZA TOTALI FERIE: Query diretta a Supabase
                const { data: totaliData, error: totaliError } = await supabase
                    .from('ferie_balance')
                    .select('id')
                    .eq('user_id', userRecordSingle.id)
                    .limit(1);
                
                hasFerie = !totaliError && totaliData && totaliData.length > 0;
            }
            
            if (!hasFerie) {
                initButton.style.display = 'inline-block';
                initButton.addEventListener('click', async () => {
                    try {
                        // Mostra il popup per l'input dei valori
                        const values = await showInitializationDialog();
                        if (!values) return; // L'utente ha annullato

                        // Prima ottieni l'ID dell'utente per l'inserimento
                        const { data: insertUserRecord, error: insertUserError } = await supabase
                            .from('users')
                            .select('id')
                            .eq('username', user.Username)
                            .limit(1);
                        
                        if (insertUserError || !insertUserRecord || insertUserRecord.length === 0) {
                            throw new Error('Utente non trovato');
                        }
                        
                        const insertUserRecordSingle = insertUserRecord[0];

                        // INIZIALIZZAZIONE TOTALI FERIE: Insert diretta su Supabase
                        const { error: insertError } = await supabase
                            .from('ferie_balance')
                            .insert({
                                user_id: insertUserRecordSingle.id,
                                ferie_totali: values.FerieTotali || 26,
                                ferie_utilizzate: 0,
                                ferie_vecchie_totali: values.FerieVecchieTotali || 0,
                                ferie_vecchie_utilizzate: 0,
                                festivita_totali: values.FestivitaTotali || 0,
                                festivita_utilizzate: 0,
                                motivi_familiari_totali: values.MotiviFamiliariTotali || 3,
                                motivi_familiari_utilizzati: 0,
                                recuperi_totali: values.RecuperiTotali || 0,
                                recuperi_utilizzati: 0
                            });
                        
                        if (insertError) {
                            throw insertError;
                        }
                        
                        // Ricarica i dati dell'utente
                        await loadUsers();
                        showError('Inizializzazione completata con successo');
                        
                    } catch (error) {
                        console.error('Errore durante l\'inizializzazione da Supabase:', error.message || 'Errore sconosciuto');
                        showError('Errore durante l\'inizializzazione: ' + (error.message || 'Errore sconosciuto'));
                    }
                });
            } else {
                initButton.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Errore nella verifica totali ferie da Supabase:', error.message || 'Errore sconosciuto');
            initButton.style.display = 'none';
        }

        // Imposta il pulsante dettaglio
        detailButton.addEventListener('click', () => {
            window.location.href = `/adm_richieste.html?username=${encodeURIComponent(user.username)}&displayName=${encodeURIComponent(userData.nome || user.username)}`;
        });

        // Aggiungi il pulsante Gestione Totali e il suo event listener
        const manageTotalsBtn = userCard.querySelector('.manage-totals');
        if (manageTotalsBtn) {
            manageTotalsBtn.addEventListener('click', function() {
                // Salva i dati completi dell'utente selezionato
                const userToSave = {
                    ...user,
                    ...userData,  // Includiamo tutti i dati dell'utente
                    username: user.Username,  // Assicuriamoci che il campo username sia presente
                    FerieTotali: user.FerieTotali || 0,
                    FerieVecchieTotali: user.FerieVecchieTotali || 0,
                    FestivitaTotali: user.FestivitaTotali || 0,
                    MotiviFamiliariTotali: user.MotiviFamiliariTotali || 0,
                    RecuperiTotali: user.RecuperiTotali || 0
                };
                localStorage.setItem('selectedUserData', JSON.stringify(userToSave));
                
                // Reindirizza alla pagina dei totali
                window.location.href = `adm_totali.html?username=${encodeURIComponent(user.Username)}&displayName=${encodeURIComponent(userData.nome || user.Username)}`;
            });
        }

        // Calcola i valori residui
        const ferieResidue = (user.FerieTotali || 0) - (user.FerieUtilizzate || 0);
        const ferieVecchieResidue = (user.FerieVecchieTotali || 0) - (user.FerieVecchieUtilizzate || 0);
        const festivitaResidue = (user.FestivitaTotali || 0) - (user.FestivitaUtilizzate || 0);
        const motiviFamiliariResidui = (user.MotiviFamiliariTotali || 0) - (user.MotiviFamiliariUtilizzati || 0);
        const recuperiResidui = (user.RecuperiTotali || 0) - (user.RecuperiUtilizzati || 0);

        // Imposta i valori per le ferie
        userCard.querySelector('.ferie-totali').textContent = user.FerieTotali || 0;
        userCard.querySelector('.ferie-utilizzate').textContent = user.FerieUtilizzate || 0;
        userCard.querySelector('.ferie-residue').textContent = ferieResidue;
        userCard.querySelector('.ferie-in-attesa').textContent = pendingRequests.ferie || 0;

        // Imposta i valori per le ferie vecchie
        userCard.querySelector('.ferie-vecchie-totali').textContent = user.FerieVecchieTotali || 0;
        userCard.querySelector('.ferie-vecchie-utilizzate').textContent = user.FerieVecchieUtilizzate || 0;
        userCard.querySelector('.ferie-vecchie-residue').textContent = ferieVecchieResidue;
        userCard.querySelector('.ferie-vecchie-in-attesa').textContent = pendingRequests.ferieVecchie || 0;

        // Imposta i valori per le festività
        userCard.querySelector('.festivita-totali').textContent = user.FestivitaTotali || 0;
        userCard.querySelector('.festivita-utilizzate').textContent = user.FestivitaUtilizzate || 0;
        userCard.querySelector('.festivita-residue').textContent = festivitaResidue;
        userCard.querySelector('.festivita-in-attesa').textContent = pendingRequests.festivita || 0;

        // Imposta i valori per i motivi familiari
        userCard.querySelector('.motivi-familiari-totali').textContent = user.MotiviFamiliariTotali || 0;
        userCard.querySelector('.motivi-familiari-utilizzati').textContent = user.MotiviFamiliariUtilizzati || 0;
        userCard.querySelector('.motivi-familiari-residui').textContent = motiviFamiliariResidui;
        userCard.querySelector('.motivi-familiari-in-attesa').textContent = pendingRequests.motiviFamiliari || 0;

        // Imposta i valori per i recuperi
        userCard.querySelector('.recuperi-totali').textContent = user.RecuperiTotali || 0;
        userCard.querySelector('.recuperi-utilizzati').textContent = user.RecuperiUtilizzati || 0;
        userCard.querySelector('.recuperi-residui').textContent = recuperiResidui;
        userCard.querySelector('.recuperi-in-attesa').textContent = pendingRequests.recuperi || 0;

        // Aggiungi la card al container
        usersContainer.appendChild(userCard);
    }
}

/**
 * Filtra gli utenti in base al termine di ricerca
 * @param {string} searchTerm - Il termine di ricerca
 */
async function filterUsers(searchTerm) {
    // Se non ci sono utenti, non fare nulla
    if (!allUsers || allUsers.length === 0) return;
    
    // Mostra l'indicatore di caricamento
    const loadingIndicator = document.getElementById('loading-indicator');
    const progressBar = document.getElementById('progress-bar');
    loadingIndicator.style.display = 'block';
    document.getElementById('users-container').innerHTML = '';
    progressBar.style.width = '0%';
    
    try {
        // Filtra gli utenti in base al termine di ricerca e allo stato del checkbox
        const showOnlyPending = document.getElementById('pending-requests-filter').checked;
        
        let localFilteredUsers = allUsers;
        
        // Filtra per termine di ricerca (parole intere)
        if (searchTerm) {
            localFilteredUsers = localFilteredUsers.filter(user => {
                const fullName = (user.userData.nome || '') + ' ' + (user.userData.cognome || '');
                const username = user.Username || '';
                const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
                
                return searchWords.every(word => {
                    // Normalizza le stringhe per la ricerca
                    const normalizedWord = word.toLowerCase();
                    const normalizedFullName = fullName.toLowerCase();
                    const normalizedUsername = username.toLowerCase();
                    
                    // Verifica se la parola di ricerca è contenuta nel nome o username (ricerca parziale)
                    return normalizedFullName.includes(normalizedWord) ||
                           normalizedUsername.includes(normalizedWord);
                });
            });
            
            // Aggiorna la barra di progresso dopo il filtraggio per termine
            progressBar.style.width = '50%';
        } else {
            progressBar.style.width = '30%';
        }
        
        // Filtra per richieste in attesa
        if (showOnlyPending) {
            const filteredByPending = [];
            const totalUsers = localFilteredUsers.length;
            
            for (let i = 0; i < localFilteredUsers.length; i++) {
                const user = localFilteredUsers[i];
                const pendingRequests = await calculatePendingDays(user.Username);
                const hasPendingRequests = pendingRequests.ferie > 0 || 
                                          pendingRequests.ferieVecchie > 0 || 
                                          pendingRequests.festivita > 0 || 
                                          pendingRequests.motiviFamiliari > 0 || 
                                          pendingRequests.recuperi > 0;
                if (hasPendingRequests) {
                    filteredByPending.push(user);
                }
                
                // Aggiorna la barra di progresso durante il filtraggio per richieste in attesa
                const baseProgress = searchTerm ? 50 : 30;
                const additionalProgress = Math.round(((i + 1) / totalUsers) * (100 - baseProgress));
                progressBar.style.width = (baseProgress + additionalProgress) + '%';
            }
            localFilteredUsers = filteredByPending;
        } else {
            // Se non filtriamo per richieste in attesa, possiamo avanzare la barra
            progressBar.style.width = '90%';
        }
        
        // Ordina gli utenti filtrati alfabeticamente per nome e cognome
        localFilteredUsers.sort((a, b) => {
            const nameA = `${a.userData.nome || ''} ${a.userData.cognome || ''}`.trim().toLowerCase();
            const nameB = `${b.userData.nome || ''} ${b.userData.cognome || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Aggiorna la variabile globale filteredUsers
        filteredUsers = localFilteredUsers;
        
        // Reset della paginazione
        currentPage = 1;
        
        // Nascondi l'indicatore di caricamento
        loadingIndicator.style.display = 'none';
        
        // Visualizza gli utenti filtrati con paginazione
        displayCurrentPage();
    } catch (error) {
        // Nascondi l'indicatore di caricamento in caso di errore
        loadingIndicator.style.display = 'none';
        showError('Errore durante il filtraggio degli utenti: ' + error.message);
    }
}

/**
 * Calcola i giorni di ferie in attesa per un utente da Supabase
 * @param {string} username - Nome utente
 * @returns {Promise<Object>} Oggetto con i giorni in attesa per tipo
 */
async function calculatePendingDays(username) {
    try {
        // Prima ottieni l'ID dell'utente
        const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .limit(1);
        
        if (userError || !userRecord || userRecord.length === 0) {
            console.error('Errore nel recupero ID utente:', userError);
            return {
                ferie: 0,
                ferieVecchie: 0,
                festivita: 0,
                motiviFamiliari: 0,
                recuperi: 0
            };
        }
        
        const userRecordSingle = userRecord[0];
        
        // RECUPERO RICHIESTE IN ATTESA: Query diretta a Supabase
        const { data: requests, error } = await supabase
            .from('richieste')
            .select('user_id, tipo, giorni, stato')
            .eq('user_id', userRecordSingle.id)
            .eq('stato', 'IN ATTESA');
        
        if (error) {
            console.error('Errore nel recupero richieste in attesa:', error);
            return {
                ferie: 0,
                ferieVecchie: 0,
                festivita: 0,
                motiviFamiliari: 0,
                recuperi: 0
            };
        }

        // Filtra le richieste in attesa e calcola i giorni per tipo
        const result = {
            ferie: 0,
            ferieVecchie: 0,
            festivita: 0,
            motiviFamiliari: 0,
            recuperi: 0
        };

        if (requests && requests.length > 0) {
            requests.forEach(request => {
                // Converti i giorni in numero
                const giorni = parseFloat(request.giorni) || 0;
                
                switch (request.tipo) {
                    case 'FERIE':
                        result.ferie += giorni;
                        break;
                    case 'FERIE VECCHIE':
                        result.ferieVecchie += giorni;
                        break;
                    case 'FESTIVITA\' SOPPRESSE':
                        result.festivita += giorni;
                        break;
                    case 'MOTIVI FAMILIARI':
                        result.motiviFamiliari += giorni;
                        break;
                    case 'RECUPERI':
                        result.recuperi += giorni;
                        break;
                }
            });
        }

        return result;
    } catch (error) {
        console.error('Errore nel calcolo dei giorni in attesa:', error);
        return {
            ferie: 0,
            ferieVecchie: 0,
            festivita: 0,
            motiviFamiliari: 0,
            recuperi: 0
        };
    }
}

/**
 * Mostra un dialog per l'inserimento dei valori di inizializzazione
 * @returns {Promise<object|null>} - Oggetto con i valori inseriti o null se annullato
 */
async function showInitializationDialog() {
    return new Promise((resolve) => {
        // Crea il dialog
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.style.display = 'flex';
        dialog.style.alignItems = 'center';
        dialog.style.justifyContent = 'center';
        dialog.innerHTML = `
            <div class="modal-content" style="width: 400px; padding: 20px;">
                <h2 style="text-align: center; margin-bottom: 20px;">Inizializzazione Utente</h2>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="ferieTotali">Ferie Totali:</label>
                    <input type="number" id="ferieTotali" min="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="ferieVecchieTotali">Ferie Vecchie Totali:</label>
                    <input type="number" id="ferieVecchieTotali" min="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="festivitaTotali">Festività Totali:</label>
                    <input type="number" id="festivitaTotali" min="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label for="motiviFamiliariTotali">Motivi Familiari Totali:</label>
                    <input type="number" id="motiviFamiliariTotali" min="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="recuperiTotali">Recuperi Totali:</label>
                    <input type="number" id="recuperiTotali" min="0" required>
                </div>
                <div class="button-group" style="text-align: center;">
                    <button class="btn btn-primary" id="confirmInit">Conferma</button>
                    <button class="btn btn-secondary" id="cancelInit">Annulla</button>
                </div>
            </div>
        `;

        // Aggiungi il dialog al documento
        document.body.appendChild(dialog);

        // Gestisci il click su Conferma
        document.getElementById('confirmInit').addEventListener('click', () => {
            // Verifica che tutti i campi siano stati compilati
            const inputs = dialog.querySelectorAll('input[type="number"]');
            let allValid = true;
            inputs.forEach(input => {
                if (!input.value || input.value === '') {
                    input.style.borderColor = 'red';
                    allValid = false;
                } else {
                    input.style.borderColor = '';
                }
            });

            if (!allValid) {
                showError('Tutti i campi sono obbligatori');
                return;
            }

            const values = {
                FerieTotali: parseInt(document.getElementById('ferieTotali').value),
                FerieVecchieTotali: parseInt(document.getElementById('ferieVecchieTotali').value),
                FestivitaTotali: parseInt(document.getElementById('festivitaTotali').value),
                MotiviFamiliariTotali: parseInt(document.getElementById('motiviFamiliariTotali').value),
                RecuperiTotali: parseInt(document.getElementById('recuperiTotali').value)
            };
            document.body.removeChild(dialog);
            resolve(values);
        });

        // Gestisci il click su Annulla
        document.getElementById('cancelInit').addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(null);
        });
    });
}

/**
 * Genera un PDF riepilogativo con i dati di tutti gli utenti
 */
async function generaRiepilogoPDF() {
    try {
        // Importa jsPDF dinamicamente
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showError('Libreria PDF non disponibile. Assicurati che jsPDF sia caricato.');
            return;
        }

        // Carica tutti i dati direttamente dal database
        console.log('Caricamento dati per PDF...');
        
        // Carica tutti gli utenti dal database
        const { data: allUsersFromDB, error: usersError } = await supabase
            .from('users')
            .select('id, username, nome, ruolo')
            .order('ruolo', { ascending: true })
            .order('nome', { ascending: true });
        
        if (usersError) {
            console.error('Errore nel caricamento utenti:', usersError);
            showError('Errore nel caricamento dei dati utenti: ' + usersError.message);
            return;
        }
        
        if (!allUsersFromDB || allUsersFromDB.length === 0) {
            showError('Nessun dato utente disponibile nel database.');
            return;
        }
        
        // Carica tutti i dati delle ferie
        const { data: allFerieFromDB, error: ferieError } = await supabase
            .from('ferie_balance')
            .select('*')
            .order('user_id');
        
        if (ferieError) {
            console.error('Errore nel caricamento ferie:', ferieError);
            showError('Errore nel caricamento dei dati ferie: ' + ferieError.message);
            return;
        }
        
        // Crea una mappa dei dati ferie per user_id
        const ferieMap = {};
        if (allFerieFromDB) {
            allFerieFromDB.forEach(ferie => {
                ferieMap[ferie.user_id] = ferie;
            });
        }
        
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Configurazione del documento ottimizzata per sfruttare tutto lo spazio
        const pageWidth = doc.internal.pageSize.width; // ~297mm
        const pageHeight = doc.internal.pageSize.height; // ~210mm
        const margin = 10; // Margini ridotti per sfruttare più spazio
        const lineHeight = 5;
        let currentY = margin;
        
        // Titolo del documento
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Riepilogo Ferie Personale ATA', pageWidth / 2, currentY, { align: 'center' });
        currentY += lineHeight * 2.5;
        
        // Data di generazione
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const dataGenerazione = new Date().toLocaleDateString('it-IT');
        doc.text(`Generato il: ${dataGenerazione}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += lineHeight * 2.5;
        
        // Intestazioni della tabella - ottimizzate per sfruttare tutto lo spazio
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        
        // Calcolo larghezze per utilizzare tutto lo spazio disponibile
        const totalWidth = pageWidth - (margin * 2); // Spazio totale disponibile
        const colWidths = {
            nome: 45,
            ferieGroup: 42, // Tot, Uti, Res per Ferie
            ferieVecchieGroup: 42, // Tot, Uti, Res per Ferie Vecchie
            festivitaGroup: 42, // Tot, Uti, Res per Festività
            motiviFamiliariGroup: 42, // Tot, Uti, Res per Motivi Familiari
            recuperiGroup: 42, // Tot, Uti, Res per Recuperi
            totaleResidui: 22
        };
        
        const subColWidth = 14; // Larghezza per Tot, Uti, Res
        
        // Filtra l'utente corrente
        const currentUser = UserUtils.getUserData();
        const filteredUsers = allUsersFromDB.filter(user => user.username !== currentUser.username);
        
        // Raggruppa utenti per ruolo
        const usersByRole = {};
        filteredUsers.forEach(user => {
            const ruolo = user.ruolo || 'Senza Ruolo';
            if (!usersByRole[ruolo]) {
                usersByRole[ruolo] = [];
            }
            usersByRole[ruolo].push(user);
        });
        
        // Ordina i ruoli secondo la priorità definita
        const roleOrder = ['DSGA', 'ASSISTENTI AMMINISTRATIVI', 'ASSISTENTI TECNICI', 'COLLABORATORI SCOLASTICI'];
        const sortedRoles = Object.keys(usersByRole).sort((a, b) => {
            const indexA = roleOrder.indexOf(a);
            const indexB = roleOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
        
        // Genera il PDF per ogni gruppo di ruolo
        for (const ruolo of sortedRoles) {
            const groupUsers = usersByRole[ruolo];
            
            // Aggiungi intestazione del gruppo
            if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = margin;
            }
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${ruolo} (${groupUsers.length})`, margin, currentY);
            currentY += lineHeight * 1.5;
            
            // Intestazioni colonne per questo gruppo
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            
            let startX = margin;
            
            // Prima riga di intestazioni (categorie principali) - CENTRATE
            doc.text('Nome Utente', startX + (colWidths.nome / 2), currentY, { align: 'center' });
            startX += colWidths.nome;
            
            doc.text('Ferie', startX + (colWidths.ferieGroup / 2), currentY, { align: 'center' });
            startX += colWidths.ferieGroup;
            
            doc.text('Ferie Vecchie', startX + (colWidths.ferieVecchieGroup / 2), currentY, { align: 'center' });
            startX += colWidths.ferieVecchieGroup;
            
            doc.text('Festività', startX + (colWidths.festivitaGroup / 2), currentY, { align: 'center' });
            startX += colWidths.festivitaGroup;
            
            doc.text('Motivi Fam.', startX + (colWidths.motiviFamiliariGroup / 2), currentY, { align: 'center' });
            startX += colWidths.motiviFamiliariGroup;
            
            doc.text('Recuperi', startX + (colWidths.recuperiGroup / 2), currentY, { align: 'center' });
            startX += colWidths.recuperiGroup;
            
            doc.text('Tot. Residui', startX + (colWidths.totaleResidui / 2), currentY, { align: 'center' });
            
            currentY += lineHeight;
            
            // Seconda riga di intestazioni (Tot, Uti, Res) - CENTRATE
            startX = margin + colWidths.nome;
            
            // Per ogni categoria, aggiungi Tot, Uti, Res centrati
            const categories = ['ferieGroup', 'ferieVecchieGroup', 'festivitaGroup', 'motiviFamiliariGroup', 'recuperiGroup'];
            categories.forEach(category => {
                doc.text('Tot', startX + (subColWidth / 2), currentY, { align: 'center' });
                doc.text('Uti', startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                doc.text('Res', startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                startX += colWidths[category];
            });
            
            currentY += lineHeight;
            
            // Linee di separazione più definite
            doc.setLineWidth(0.5);
            doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
            
            // Linee verticali per separare tutte le colonne principali
            let verticalX = margin + colWidths.nome;
            doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
            
            verticalX += colWidths.ferieGroup;
            doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
            
            verticalX += colWidths.ferieVecchieGroup;
            doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
            
            verticalX += colWidths.festivitaGroup;
            doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
            
            verticalX += colWidths.motiviFamiliariGroup;
            doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
            
            verticalX += colWidths.recuperiGroup;
            doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
            
            // Linee verticali per le sottocolonne Tot/Uti/Res
            categories.forEach((category, index) => {
                const baseX = margin + colWidths.nome + (index * colWidths[category]);
                // Linea dopo Tot
                doc.line(baseX + subColWidth, currentY - lineHeight - 2, baseX + subColWidth, currentY - 2);
                // Linea dopo Uti
                doc.line(baseX + (subColWidth * 2), currentY - lineHeight - 2, baseX + (subColWidth * 2), currentY - 2);
            });
            
            currentY += 2;
            
            // Dati degli utenti per questo gruppo
            doc.setFont('helvetica', 'normal');
            
            for (const user of groupUsers) {
                if (currentY > pageHeight - 30) {
                    doc.addPage();
                    currentY = margin;
                    
                    // Ripeti intestazioni sulla nuova pagina
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${ruolo} (continua)`, margin, currentY);
                    currentY += lineHeight * 1.5;
                    
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    
                    startX = margin;
                    
                    // Prima riga di intestazioni (categorie principali) - CENTRATE
                    doc.text('Nome Utente', startX + (colWidths.nome / 2), currentY, { align: 'center' });
                    startX += colWidths.nome;
                    
                    doc.text('Ferie', startX + (colWidths.ferieGroup / 2), currentY, { align: 'center' });
                    startX += colWidths.ferieGroup;
                    
                    doc.text('Ferie Vecchie', startX + (colWidths.ferieVecchieGroup / 2), currentY, { align: 'center' });
                    startX += colWidths.ferieVecchieGroup;
                    
                    doc.text('Festività', startX + (colWidths.festivitaGroup / 2), currentY, { align: 'center' });
                    startX += colWidths.festivitaGroup;
                    
                    doc.text('Motivi Fam.', startX + (colWidths.motiviFamiliariGroup / 2), currentY, { align: 'center' });
                    startX += colWidths.motiviFamiliariGroup;
                    
                    doc.text('Recuperi', startX + (colWidths.recuperiGroup / 2), currentY, { align: 'center' });
                    startX += colWidths.recuperiGroup;
                    
                    doc.text('Tot. Residui', startX + (colWidths.totaleResidui / 2), currentY, { align: 'center' });
                    
                    currentY += lineHeight;
                    
                    // Seconda riga di intestazioni (Tot, Uti, Res) - CENTRATE
                    startX = margin + colWidths.nome;
                    
                    // Per ogni categoria, aggiungi Tot, Uti, Res centrati
                    const categories = ['ferieGroup', 'ferieVecchieGroup', 'festivitaGroup', 'motiviFamiliariGroup', 'recuperiGroup'];
                    categories.forEach(category => {
                        doc.text('Tot', startX + (subColWidth / 2), currentY, { align: 'center' });
                        doc.text('Uti', startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                        doc.text('Res', startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                        startX += colWidths[category];
                    });
                    
                    currentY += lineHeight;
                    
                    // Linee di separazione più definite
                    doc.setLineWidth(0.5);
                    doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
                    
                    // Linee verticali per separare tutte le colonne principali
                    let verticalX = margin + colWidths.nome;
                    doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
                    
                    verticalX += colWidths.ferieGroup;
                    doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
                    
                    verticalX += colWidths.ferieVecchieGroup;
                    doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
                    
                    verticalX += colWidths.festivitaGroup;
                    doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
                    
                    verticalX += colWidths.motiviFamiliariGroup;
                    doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
                    
                    verticalX += colWidths.recuperiGroup;
                    doc.line(verticalX, currentY - lineHeight * 2 - 2, verticalX, currentY - 2);
                    
                    // Linee verticali per le sottocolonne Tot/Uti/Res
                    categories.forEach((category, index) => {
                        const baseX = margin + colWidths.nome + (index * colWidths[category]);
                        // Linea dopo Tot
                        doc.line(baseX + subColWidth, currentY - lineHeight - 2, baseX + subColWidth, currentY - 2);
                        // Linea dopo Uti
                        doc.line(baseX + (subColWidth * 2), currentY - lineHeight - 2, baseX + (subColWidth * 2), currentY - 2);
                    });
                    
                    currentY += 2;
                    
                    doc.setFont('helvetica', 'normal');
                }
                
                // Trova i dati delle ferie per questo utente dalla mappa
                const ferieData = ferieMap[user.id];
                
                startX = margin;
                
                // Nome utente - centrato nella colonna
                const displayName = user.nome || user.username;
                doc.text(displayName.substring(0, 30), startX + (colWidths.nome / 2), currentY, { align: 'center' });
                startX += colWidths.nome;
                
                // Dati delle ferie - mostra Tot, Uti, Res per ogni categoria centrati
                if (ferieData) {
                    // Ferie
                    const ferieTotali = ferieData.ferie_totali || 0;
                    const ferieUtilizzate = ferieData.ferie_utilizzate || 0;
                    const ferieResidue = ferieTotali - ferieUtilizzate;
                    
                    doc.text(ferieTotali.toString(), startX + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(ferieUtilizzate.toString(), startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(ferieResidue.toString(), startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                    startX += colWidths.ferieGroup;
                    
                    // Ferie Vecchie
                    const ferieVecchieTotali = ferieData.ferie_vecchie_totali || 0;
                    const ferieVecchieUtilizzate = ferieData.ferie_vecchie_utilizzate || 0;
                    const ferieVecchieResidue = ferieVecchieTotali - ferieVecchieUtilizzate;
                    
                    doc.text(ferieVecchieTotali.toString(), startX + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(ferieVecchieUtilizzate.toString(), startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(ferieVecchieResidue.toString(), startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                    startX += colWidths.ferieVecchieGroup;
                    
                    // Festività
                    const festivitaTotali = ferieData.festivita_totali || 0;
                    const festivitaUtilizzate = ferieData.festivita_utilizzate || 0;
                    const festivitaResidue = festivitaTotali - festivitaUtilizzate;
                    
                    doc.text(festivitaTotali.toString(), startX + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(festivitaUtilizzate.toString(), startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(festivitaResidue.toString(), startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                    startX += colWidths.festivitaGroup;
                    
                    // Motivi Familiari
                    const motiviFamiliariTotali = ferieData.motivi_familiari_totali || 0;
                    const motiviFamiliariUtilizzati = ferieData.motivi_familiari_utilizzati || 0;
                    const motiviFamiliariResidui = motiviFamiliariTotali - motiviFamiliariUtilizzati;
                    
                    doc.text(motiviFamiliariTotali.toString(), startX + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(motiviFamiliariUtilizzati.toString(), startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(motiviFamiliariResidui.toString(), startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                    startX += colWidths.motiviFamiliariGroup;
                    
                    // Recuperi
                    const recuperiTotali = ferieData.recuperi_totali || 0;
                    const recuperiUtilizzati = ferieData.recuperi_utilizzati || 0;
                    const recuperiResidui = recuperiTotali - recuperiUtilizzati;
                    
                    doc.text(recuperiTotali.toString(), startX + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(recuperiUtilizzati.toString(), startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                    doc.text(recuperiResidui.toString(), startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                    startX += colWidths.recuperiGroup;
                    
                    // Calcola totale residui
                    const totaleResidui = ferieResidue + ferieVecchieResidue + festivitaResidue + motiviFamiliariResidui + recuperiResidui;
                    doc.text(totaleResidui.toString(), startX + (colWidths.totaleResidui / 2), currentY, { align: 'center' });
                } else {
                    // Dati non disponibili - ripeti per ogni gruppo di 3 colonne centrati
                    for (let i = 0; i < 5; i++) {
                        doc.text('0', startX + (subColWidth / 2), currentY, { align: 'center' });
                        doc.text('0', startX + subColWidth + (subColWidth / 2), currentY, { align: 'center' });
                        doc.text('0', startX + (subColWidth * 2) + (subColWidth / 2), currentY, { align: 'center' });
                        startX += (i === 0) ? colWidths.ferieGroup : 
                                 (i === 1) ? colWidths.ferieVecchieGroup :
                                 (i === 2) ? colWidths.festivitaGroup :
                                 (i === 3) ? colWidths.motiviFamiliariGroup : colWidths.recuperiGroup;
                    }
                    doc.text('0', startX + (colWidths.totaleResidui / 2), currentY, { align: 'center' });
                }
                
                currentY += lineHeight;
            }
            
            currentY += lineHeight; // Spazio tra gruppi
        }
        
        // Salva il PDF
        const fileName = `Riepilogo_Ferie_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showError('PDF generato con successo!');
        
    } catch (error) {
        console.error('Errore nella generazione del PDF:', error);
        showError('Errore nella generazione del PDF: ' + error.message);
    }
}

/**
 * Mostra un messaggio di errore
 * @param {string} message - Messaggio di errore
 */
function showError(message) {
    console.error(message);
    alert(message);
}