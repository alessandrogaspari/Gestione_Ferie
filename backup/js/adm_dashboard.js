/**
 * adm_dashboard.js - Gestione della dashboard amministrativa
 */

// Variabile globale per memorizzare tutti gli utenti
let allUsers = [];

document.addEventListener('DOMContentLoaded', function() {
    // Verifica che l'utente sia un SUPERUSER
    const userData = UserUtils.getUserData();
    if (!userData || userData.ruolo !== 'SUPERUSER') {
        window.location.href = 'index.html';
        return;
    }
    
    // Inizializza l'interfaccia utente con nome e ruolo
    UserUtils.initUserUI();
    
    // Carica i dati degli utenti
    loadUsers();

    // Gestione del logout
    document.getElementById('logout-btn').addEventListener('click', function() {
        UserUtils.logout();
    });
    
    // Gestione della ricerca utenti
    document.getElementById('user-search').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        filterUsers(searchTerm);
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
 * Carica e visualizza i dati degli utenti
 */
async function loadUsers() {
    try {
        // Chiamata API per ottenere tutti gli utenti
        const response = await API.getAllUsers();
        
        if (response.success) {
            // Salva tutti gli utenti nella variabile globale
            allUsers = response.users;
            await displayUsers(response.users);
        } else {
            showError('Errore nel caricamento degli utenti: ' + response.message);
        }
    } catch (error) {
        showError('Errore nel caricamento degli utenti: ' + error.message);
    }
}

/**
 * Visualizza i dati degli utenti utilizzando le card
 * @param {Array} users - Array di oggetti utente
 */
async function displayUsers(users) {
    const usersContainer = document.getElementById('users-container');
    usersContainer.innerHTML = '';
    
    // Filtra l'utente corrente (non mostrare l'utente loggato nella lista)
    const currentUser = UserUtils.getUserData();
    const filteredUsers = users.filter(user => user.Username !== currentUser.username);
    
    // Per ogni utente, calcola i giorni in attesa e crea una card
    for (const user of filteredUsers) {
        // Ottieni i dati completi dell'utente
        const userDataResponse = await API.getDatiUtente(user.Username);
        if (!userDataResponse.success) {
            console.error('Errore nel recupero dei dati utente:', userDataResponse.message);
            continue;
        }
        const userData = userDataResponse.user;

        const pendingRequests = await calculatePendingDays(user.Username);
        
        // Clona il template della card utente
        const template = document.getElementById('user-card-template');
        const userCard = document.importNode(template.content, true);
        
        // Imposta il nome utente
        const userNameElement = userCard.querySelector('.user-name');
        userNameElement.firstChild.textContent = userData.nome || user.Username;

        // Mostra l'icona di notifica se ci sono richieste in attesa
        const notificationIcon = userNameElement.querySelector('.notification-icon');
        notificationIcon.style.display = pendingRequests > 0 ? 'inline-block' : 'none';

        // Verifica se l'utente ha record nella tabella FERIE
        const hasFerieResponse = await API.checkUserFerie(user.Username);
        const initButton = userCard.querySelector('.init-user');
        const detailButton = userCard.querySelector('.detail-user');

        if (hasFerieResponse.success && !hasFerieResponse.hasFerie) {
            initButton.style.display = 'inline-block';
            initButton.addEventListener('click', async () => {
                try {
                    // Mostra il popup per l'input dei valori
                    const values = await showInitializationDialog();
                    if (!values) return; // L'utente ha annullato

                    // Aggiungi l'username ai valori
                    values.username = user.Username;

                    const response = await API.initializeUserFerie(values);
                    if (response.success) {
                        // Ricarica i dati dell'utente
                        await loadUsers();
                        showError('Inizializzazione completata con successo');
                    } else {
                        showError('Errore durante l\'inizializzazione: ' + response.message);
                    }
                } catch (error) {
                    showError('Errore durante l\'inizializzazione: ' + error.message);
                }
            });
        } else {
            initButton.style.display = 'none';
        }

        // Imposta il pulsante dettaglio
        detailButton.addEventListener('click', () => {
            window.location.href = `adm_richieste.html?username=${encodeURIComponent(user.Username)}&displayName=${encodeURIComponent(userData.nome || user.Username)}`;
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
                
                // Apri la pagina dei totali come popup
                const width = 800;
                const height = 600;
                const left = (window.innerWidth - width) / 2;
                const top = (window.innerHeight - height) / 2;
                
                window.open('adm_totali.html', 'TotaliWindow',
                    `width=${width},height=${height},left=${left},top=${top},` +
                    'resizable=yes,scrollbars=yes,status=no,location=no,menubar=no,toolbar=no');
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
 * @param {string} searchTerm - Termine di ricerca
 */
function filterUsers(searchTerm) {
    const filteredUsers = allUsers.filter(user =>
        user.Username.toLowerCase().includes(searchTerm)
    );
    displayUsers(filteredUsers);
}

/**
 * Calcola i giorni di ferie in attesa per un utente
 * @param {string} username - Nome utente
 * @returns {Promise<Object>} Oggetto con i giorni in attesa per tipo
 */
async function calculatePendingDays(username) {
    try {
        const response = await API.getRichiestePendenti(username);
        if (!response.success) {
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

        response.requests.forEach(request => {
            switch (request.tipo) {
                case 'FERIE':
                    result.ferie += request.giorni;
                    break;
                case 'FERIE VECCHIE':
                    result.ferieVecchie += request.giorni;
                    break;
                case 'FESTIVITA\' SOPPRESSE':
                    result.festivita += request.giorni;
                    break;
                case 'MOTIVI FAMILIARI':
                    result.motiviFamiliari += request.giorni;
                    break;
                case 'RECUPERI':
                    result.recuperi += request.giorni;
                    break;
            }
        });

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
 * Mostra un messaggio di errore
 * @param {string} message - Messaggio di errore
 */
function showError(message) {
    console.error(message);
    alert(message);
}