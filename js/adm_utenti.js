/**
 * Modulo per la gestione degli utenti (amministrazione)
 * Gestisce la visualizzazione, creazione, modifica ed eliminazione degli utenti
 * Integrato con Supabase per la gestione dei dati
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';
// Importa le utility per la gestione utente
import { UserUtils } from './user-utils.js';

// Variabili globali
let users = [];
let isEditing = false;
let editingUserId = null;

// Funzione per inizializzare automaticamente tutte le tabelle correlate a un nuovo utente
async function initializeUserRelatedTables(userId) {
    const errors = [];
    let success = true;
    
    try {
        console.log(`Inizializzazione tabelle correlate per utente ID: ${userId}`);
        
        // 1. Inizializza ferie_balance
        await initializeFerieBalance(userId, errors);
        
        // 2. Verifica che non ci siano record orfani o inconsistenti
        await verifyUserDataConsistency(userId, errors);
        
        if (errors.length > 0) {
            success = false;
            console.error('Errori durante l\'inizializzazione:', errors);
        } else {
            console.log('Inizializzazione completata con successo per utente:', userId);
        }
        
    } catch (error) {
        success = false;
        errors.push(`Errore generale durante l'inizializzazione: ${error.message}`);
        console.error('Errore generale durante l\'inizializzazione:', error);
    }
    
    return { success, errors };
}

// Funzione per inizializzare la tabella ferie_balance
async function initializeFerieBalance(userId, errors) {
    try {
        // Verifica se esistono già dati ferie per questo utente
        const { data: existingFerieData, error: checkError } = await supabase
            .from('ferie_balance')
            .select('*')
            .eq('user_id', userId)
            .order('id')
            .limit(1);
        
        if (checkError) {
            errors.push(`Errore nella verifica ferie_balance: ${checkError.message}`);
            return;
        }
        
        const existingFerie = existingFerieData && existingFerieData.length > 0 ? existingFerieData[0] : null;
        
        const ferieData = {
            user_id: userId,
            ferie_totali: parseInt(document.getElementById('ferieTotali')?.value) || 28,
            ferie_utilizzate: 0,
            ferie_vecchie_totali: parseInt(document.getElementById('ferieVecchieTotali')?.value) || 0,
            ferie_vecchie_utilizzate: 0,
            festivita_totali: parseInt(document.getElementById('festivitaTotali')?.value) || 4,
            festivita_utilizzate: 0,
            motivi_familiari_totali: parseInt(document.getElementById('motiviFamiliariTotali')?.value) || 3,
            motivi_familiari_utilizzati: 0,
            recuperi_totali: parseInt(document.getElementById('recuperiTotali')?.value) || 0,
            recuperi_utilizzati: 0,
            updated_at: new Date().toISOString()
        };
        
        if (existingFerie) {
            // Aggiorna i dati esistenti mantenendo i valori utilizzati
            const updateData = {
                ferie_totali: ferieData.ferie_totali,
                ferie_vecchie_totali: ferieData.ferie_vecchie_totali,
                festivita_totali: ferieData.festivita_totali,
                motivi_familiari_totali: ferieData.motivi_familiari_totali,
                recuperi_totali: ferieData.recuperi_totali,
                updated_at: ferieData.updated_at
            };
            
            const { error } = await supabase
                .from('ferie_balance')
                .update(updateData)
                .eq('user_id', userId);
                
            if (error) {
                errors.push(`Errore nell'aggiornamento ferie_balance: ${error.message}`);
            } else {
                console.log('ferie_balance aggiornato con successo');
            }
        } else {
            // Crea nuovi dati ferie
            ferieData.created_at = new Date().toISOString();
            const { error } = await supabase
                .from('ferie_balance')
                .insert(ferieData);
                
            if (error) {
                errors.push(`Errore nella creazione ferie_balance: ${error.message}`);
            } else {
                console.log('ferie_balance creato con successo');
            }
        }
        
    } catch (error) {
        errors.push(`Errore durante l'inizializzazione ferie_balance: ${error.message}`);
    }
}

// Funzione per verificare la consistenza dei dati utente
async function verifyUserDataConsistency(userId, errors) {
    try {
        // Verifica che l'utente esista
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, username, nome')
            .eq('id', userId)
            .order('id')
            .limit(1);
        
        if (userError) {
            errors.push(`Errore nella verifica utente: ${userError.message}`);
            return;
        }
        
        if (!userData || userData.length === 0) {
            errors.push('Utente non trovato durante la verifica di consistenza');
            return;
        }
        
        // Verifica che ferie_balance esista
        const { data: ferieData, error: ferieError } = await supabase
            .from('ferie_balance')
            .select('id')
            .eq('user_id', userId)
            .order('id')
            .limit(1);
        
        if (ferieError) {
            errors.push(`Errore nella verifica ferie_balance: ${ferieError.message}`);
            return;
        }
        
        if (!ferieData || ferieData.length === 0) {
            errors.push('Record ferie_balance non trovato dopo l\'inizializzazione');
            return;
        }
        
        console.log('Verifica di consistenza completata con successo');
        
    } catch (error) {
        errors.push(`Errore durante la verifica di consistenza: ${error.message}`);
    }
}

// Funzione per verificare e riparare tutti gli utenti esistenti
async function verifyAndRepairAllUsers() {
    const button = document.querySelector('.btn-verify-repair');
    const originalText = button ? button.innerHTML : '';
    
    try {
        // Disabilita il pulsante e mostra lo stato di caricamento
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifica in corso...';
        }
        
        console.log('Inizio verifica e riparazione di tutti gli utenti...');
        
        // Ottieni tutti gli utenti
        const { data: allUsers, error: usersError } = await supabase
            .from('users')
            .select('id, username, nome')
            .order('username');
        
        if (usersError) {
            console.error('Errore nel caricamento utenti:', usersError);
            alert('Errore nel caricamento utenti: ' + usersError.message);
            return;
        }
        
        if (!allUsers || allUsers.length === 0) {
            console.log('Nessun utente trovato');
            alert('Nessun utente trovato nel sistema.');
            return;
        }
        
        let repairedUsers = 0;
        let totalErrors = [];
        
        for (const user of allUsers) {
            console.log(`Verifica utente: ${user.username}`);
            
            // Verifica se l'utente ha un record ferie_balance
            const { data: ferieData, error: ferieError } = await supabase
                .from('ferie_balance')
                .select('id')
                .eq('user_id', user.id)
                .order('id')
                .limit(1);
            
            if (ferieError) {
                console.error(`Errore nella verifica ferie per ${user.username}:`, ferieError);
                totalErrors.push(`${user.username}: ${ferieError.message}`);
                continue;
            }
            
            if (!ferieData || ferieData.length === 0) {
                console.log(`Riparazione necessaria per utente: ${user.username}`);
                
                // Inizializza le tabelle correlate per questo utente
                const initResult = await initializeUserRelatedTablesWithDefaults(user.id);
                
                if (initResult.success) {
                    repairedUsers++;
                    console.log(`Utente ${user.username} riparato con successo`);
                } else {
                    totalErrors.push(`${user.username}: ${initResult.errors.join(', ')}`);
                }
            }
        }
        
        const message = `Verifica completata:\n- Utenti totali: ${allUsers.length}\n- Utenti riparati: ${repairedUsers}\n- Errori: ${totalErrors.length}`;
        
        if (totalErrors.length > 0) {
            console.error('Errori durante la riparazione:', totalErrors);
            alert(message + '\n\nErrori:\n' + totalErrors.join('\n'));
        } else {
            console.log('Verifica e riparazione completata con successo');
            if (repairedUsers > 0) {
                alert(`Verifica completata con successo!\n${repairedUsers} utenti sono stati riparati e inizializzati.`);
            } else {
                alert('Verifica completata! Tutti gli utenti hanno già i dati correttamente inizializzati.');
            }
        }
        
        // Ricarica la tabella degli utenti per mostrare i dati aggiornati
        await loadUsers();
        
    } catch (error) {
        console.error('Errore durante la verifica e riparazione:', error);
        alert('Errore durante la verifica e riparazione: ' + error.message);
    } finally {
        // Ripristina il pulsante
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
}

// Funzione per inizializzare le tabelle correlate con valori di default
async function initializeUserRelatedTablesWithDefaults(userId) {
    const errors = [];
    let success = true;
    
    try {
        console.log(`Inizializzazione con valori di default per utente ID: ${userId}`);
        
        // Crea record ferie_balance con valori di default
        const ferieData = {
            user_id: userId,
            ferie_totali: 28,
            ferie_utilizzate: 0,
            ferie_vecchie_totali: 0,
            ferie_vecchie_utilizzate: 0,
            festivita_totali: 4,
            festivita_utilizzate: 0,
            motivi_familiari_totali: 3,
            motivi_familiari_utilizzati: 0,
            recuperi_totali: 0,
            recuperi_utilizzati: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { error: ferieError } = await supabase
            .from('ferie_balance')
            .insert(ferieData);
        
        if (ferieError) {
            errors.push(`Errore nella creazione ferie_balance: ${ferieError.message}`);
            success = false;
        } else {
            console.log('ferie_balance creato con valori di default');
        }
        
    } catch (error) {
        success = false;
        errors.push(`Errore generale: ${error.message}`);
    }
    
    return { success, errors };
}

// Funzioni di utilità
function showUserForm() {
    document.getElementById('userForm').style.display = 'block';
    document.getElementById('formTitle').textContent = isEditing ? 'Modifica Utente' : 'Nuovo Utente';
    
    // Reset del form e degli errori
    document.getElementById('usernameError').style.display = 'none';
    
    if (!isEditing) {
        // In modalità creazione, resettiamo completamente il form
        document.getElementById('userDataForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('username').disabled = false;
        document.getElementById('role').disabled = false;
        
        // Imposta un ruolo predefinito (non SUPERUSER)
        document.getElementById('role').value = 'ASSISTENTI AMMINISTRATIVI';
        
        // Imposta i valori di default per i campi delle ferie
        document.getElementById('ferieTotali').value = '28';
        document.getElementById('ferieVecchieTotali').value = '0';
        document.getElementById('festivitaTotali').value = '4';
        document.getElementById('motiviFamiliariTotali').value = '3';
        document.getElementById('recuperiTotali').value = '0';
    }
}

function hideUserForm() {
    document.getElementById('userForm').style.display = 'none';
    document.getElementById('userDataForm').reset();
    document.getElementById('usernameError').style.display = 'none';
    isEditing = false;
    editingUserId = null;
    
    // Reset dei campi delle ferie ai valori di default
    document.getElementById('ferieTotali').value = '28';
    document.getElementById('ferieVecchieTotali').value = '0';
    document.getElementById('festivitaTotali').value = '4';
    document.getElementById('motiviFamiliariTotali').value = '3';
    document.getElementById('recuperiTotali').value = '0';
}

function validateUsername(username) {
    return users.every(user => user.username !== username || (isEditing && user.username === editingUserId));
}

// Caricamento iniziale degli utenti
async function loadUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('username');
        
        if (error) {
            console.error('Errore nel caricamento degli utenti:', error);
            return;
        }
        
        users = data || [];
        renderUsers();
    } catch (error) {
        console.error('Errore nella richiesta:', error);
    }
}

// Rendering della tabella utenti
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.nome || ''}</td>
            <td>${user.ruolo || ''}</td>
            <td class="user-actions">
                <button class="btn-edit" onclick="editUser('${user.username}')">
                    <i class="fas fa-edit"></i>
                </button>
                ${user.ruolo !== 'SUPERUSER' ? `
                    <button class="btn-delete" onclick="deleteUser('${user.username}')">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Gestione del salvataggio utente (creazione/modifica)
async function saveUser(event) {
    event.preventDefault();

    // Validazione dei campi obbligatori
    const usernameField = document.getElementById('username');
    const displayNameField = document.getElementById('displayName');
    const passwordField = document.getElementById('password');
    
    if (!usernameField.value.trim()) {
        alert('Lo username è obbligatorio');
        usernameField.focus();
        return;
    }
    
    if (!displayNameField.value.trim()) {
        alert('Il nome completo è obbligatorio');
        displayNameField.focus();
        return;
    }

    // Validazione della password per nuovi utenti
    if (!isEditing && !passwordField.value.trim()) {
        // Informiamo l'utente che verrà utilizzata la password predefinita
        if (!confirm('Non hai inserito una password. Verrà utilizzata la password predefinita "1234". Vuoi continuare?')) {
            passwordField.focus();
            return;
        }
    }

    const userData = {
        username: usernameField.value.trim(),
        nome: displayNameField.value.trim(),
        ruolo: document.getElementById('role').value
    };
    
    // Gestione della password
    if (passwordField.value.trim()) {
        // Se è stata inserita una password, la utilizziamo
        userData.password = passwordField.value.trim();
    } else if (!isEditing) {
        // Se è un nuovo utente e non è stata specificata una password, usiamo quella di default
        userData.password = '1234';
    }
    // Se è in modalità modifica e non è stata specificata una password, quella esistente verrà mantenuta dal backend

    // Validazione username univoco
    if (!isEditing) {
        // In modalità creazione, verifichiamo che lo username non sia già in uso
        if (!validateUsername(userData.username)) {
            const errorElement = document.getElementById('usernameError');
            errorElement.textContent = 'Username già in uso';
            errorElement.style.display = 'block';
            return;
        }
    } else {
        // In modalità modifica, verifichiamo solo se lo username è stato cambiato
        if (userData.username !== editingUserId && !validateUsername(userData.username)) {
            const errorElement = document.getElementById('usernameError');
            errorElement.textContent = 'Il nuovo username è già in uso';
            errorElement.style.display = 'block';
            return;
        }
    }

    try {
        let response;
        if (isEditing) {
            // In modalità modifica
            const existingUser = users.find(u => u.username === editingUserId);
            if (existingUser && existingUser.ruolo === 'SUPERUSER') {
                // Mantiene il ruolo SUPERUSER invariato
                userData.ruolo = 'SUPERUSER';
            }
            
            // Prima verifica se l'utente esiste effettivamente nel database
            const { data: checkUserData, error: checkError } = await supabase
                .from('users')
                .select('id, username, ruolo')
                .eq('username', editingUserId)
                .order('id')
                .limit(1);
            
            if (checkError) {
                console.error('Errore durante la verifica dell\'utente:', checkError);
                alert('Errore durante la verifica dell\'utente: ' + checkError.message);
                return;
            }
            
            const userExists = checkUserData && checkUserData.length > 0;
            
            if (!userExists) {
                // L'utente non esiste nel database, lo creiamo
                const { data: newUserData, error: createError } = await supabase
                    .from('users')
                    .insert({
                        username: userData.username,
                        nome: userData.nome,
                        ruolo: userData.ruolo,
                        password: userData.password,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .order('id')
                    .limit(1);
                
                const newUser = newUserData && newUserData.length > 0 ? newUserData[0] : null;
                
                if (createError || !newUser) {
                    console.error('Errore durante la creazione dell\'utente:', createError);
                    alert('Errore durante la creazione dell\'utente: ' + (createError?.message || 'Utente non creato'));
                    return;
                }
                
                console.log('Utente creato con successo:', newUser);
                 var updatedUser = newUser;
             } else {
                 // L'utente esiste, procediamo con l'aggiornamento
                 const { data: updatedUserData, error: updateError } = await supabase
                     .from('users')
                     .update({
                         nome: userData.nome,
                         ruolo: userData.ruolo,
                         password: userData.password,
                         updated_at: new Date().toISOString()
                     })
                     .eq('username', editingUserId)
                     .select()
                     .order('id')
                     .limit(1);
                 
                 const updatedUserResult = updatedUserData && updatedUserData.length > 0 ? updatedUserData[0] : null;
                 
                 if (updateError || !updatedUserResult) {
                     console.error('Errore durante l\'aggiornamento dell\'utente:', updateError);
                     alert('Errore durante l\'aggiornamento dell\'utente: ' + (updateError?.message || 'Utente non aggiornato'));
                     return;
                 }
                 
                 console.log('Utente aggiornato con successo:', updatedUserResult);
                 var updatedUser = updatedUserResult;
             }
            
            console.log('Utente aggiornato con successo:', updatedUser);
            
            // Verifica se l'utente ha già dati delle ferie
            const { data: existingTotaliData } = await supabase
                .from('ferie_balance')
                .select('*')
                .eq('user_id', updatedUser.id)
                .order('id')
                .limit(1);
            
            const existingTotali = existingTotaliData && existingTotaliData.length > 0 ? existingTotaliData[0] : null;
            
            if (existingTotali) {
                // Prepara i dati per l'aggiornamento dei totali delle ferie
                const ferieData = {
                    ferie_totali: parseInt(document.getElementById('ferieTotali').value) || 28,
                    ferie_vecchie_totali: parseInt(document.getElementById('ferieVecchieTotali').value) || 0,
                    festivita_totali: parseInt(document.getElementById('festivitaTotali').value) || 4,
                    motivi_familiari_totali: parseInt(document.getElementById('motiviFamiliariTotali').value) || 3,
                    recuperi_totali: parseInt(document.getElementById('recuperiTotali').value) || 0,
                    updated_at: new Date().toISOString()
                };
                
                // Aggiorna i dati delle ferie
                const { error: ferieError } = await supabase
                    .from('ferie_balance')
                    .update(ferieData)
                    .eq('user_id', updatedUser.id);
                
                if (ferieError) {
                    console.error('Errore durante l\'aggiornamento dei dati ferie:', ferieError);
                    alert('Utente aggiornato con successo, ma si è verificato un errore durante l\'aggiornamento dei dati ferie: ' + ferieError.message);
                } else {
                    console.log('Dati ferie aggiornati con successo');
                    alert('Utente e dati ferie aggiornati con successo!');
                }
            } else {
                alert('Utente aggiornato con successo!');
            }
            
            await loadUsers();
            hideUserForm();
        } else {
            // In modalità creazione
            const { data: newUserData, error: createError } = await supabase
                .from('users')
                .insert({
                    username: userData.username,
                    nome: userData.nome,
                    ruolo: userData.ruolo,
                    password: userData.password,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .order('id')
                .limit(1);
            
            const newUser = newUserData && newUserData.length > 0 ? newUserData[0] : null;
            
            if (!newUser) {
                console.error('Errore: utente non creato correttamente');
                alert('Errore: utente non creato correttamente');
                return;
            }
            
            if (createError) {
                console.error('Errore durante la creazione dell\'utente:', createError);
                alert('Errore durante la creazione dell\'utente: ' + createError.message);
                return;
            }
            
            console.log('Utente creato con successo:', newUser);
            
            // Inizializza automaticamente tutte le tabelle correlate all'utente
            const initResult = await initializeUserRelatedTables(newUser.id);
            
            if (initResult.success) {
                console.log('Tutte le tabelle correlate inizializzate con successo');
                alert('Utente creato con successo e tutte le tabelle correlate inizializzate!');
            } else {
                console.error('Errori durante l\'inizializzazione:', initResult.errors);
                alert(`Utente creato con successo, ma si sono verificati alcuni errori durante l'inizializzazione:\n${initResult.errors.join('\n')}`);
            }
            
            await loadUsers();
            hideUserForm();
        }
    } catch (error) {
        console.error('Errore nella richiesta:', error);
        alert('Errore durante l\'operazione: ' + error.message);
    }
}

// Funzione per l'editing di un utente
async function editUser(username) {
    const user = users.find(u => u.username === username);
    if (!user) return;

    isEditing = true;
    editingUserId = username;

    document.getElementById('userId').value = user.username;
    document.getElementById('username').value = user.username;
    document.getElementById('username').disabled = false; // Username modificabile in editing
    document.getElementById('displayName').value = user.nome || '';
    document.getElementById('role').value = user.ruolo || '';

    // Disabilita la modifica del ruolo per gli utenti SUPERUSER
    const roleSelect = document.getElementById('role');
    if (user.ruolo === 'SUPERUSER') {
        roleSelect.disabled = true;
    } else {
        roleSelect.disabled = false;
    }

    // Verifica se l'utente ha già un record nella tabella ferie_balance
    try {
        const { data: totaliDataArray, error } = await supabase
            .from('ferie_balance')
            .select('*')
            .eq('user_id', user.id)
            .order('id')
            .limit(1);
        
        const totaliData = totaliDataArray && totaliDataArray.length > 0 ? totaliDataArray[0] : null;
        
        if (error && error.code !== 'PGRST116') {
            console.error('Errore nel caricamento dei dati ferie:', error);
        }
        
        if (totaliData) {
            // Imposta i valori dei campi delle ferie
            document.getElementById('ferieTotali').value = totaliData.ferie_totali || 28;
            document.getElementById('ferieVecchieTotali').value = totaliData.ferie_vecchie_totali || 0;
            document.getElementById('festivitaTotali').value = totaliData.festivita_totali || 4;
            document.getElementById('motiviFamiliariTotali').value = totaliData.motivi_familiari_totali || 3;
            document.getElementById('recuperiTotali').value = totaliData.recuperi_totali || 0;
        } else {
            // Se l'utente non ha un record nella tabella ferie_balance, inizializza automaticamente
            console.log(`Utente ${user.username} non ha record ferie_balance, inizializzazione automatica...`);
            
            // Imposta i valori di default nel form
            document.getElementById('ferieTotali').value = 28;
            document.getElementById('ferieVecchieTotali').value = 0;
            document.getElementById('festivitaTotali').value = 4;
            document.getElementById('motiviFamiliariTotali').value = 3;
            document.getElementById('recuperiTotali').value = 0;
            
            // Inizializza automaticamente le tabelle correlate
            const initResult = await initializeUserRelatedTables(user.id);
            
            if (!initResult.success) {
                console.error('Errori durante l\'inizializzazione automatica:', initResult.errors);
                alert(`Attenzione: si sono verificati errori durante l'inizializzazione automatica dei dati per l'utente ${user.username}:\n${initResult.errors.join('\n')}`);
            } else {
                console.log('Inizializzazione automatica completata con successo');
            }
        }
    } catch (error) {
        console.error('Errore nella verifica dei record ferie:', error);
        // Imposta i valori di default in caso di errore
        document.getElementById('ferieTotali').value = 28;
        document.getElementById('ferieVecchieTotali').value = 0;
        document.getElementById('festivitaTotali').value = 4;
        document.getElementById('motiviFamiliariTotali').value = 3;
        document.getElementById('recuperiTotali').value = 0;
    }

    showUserForm();
}

// Funzione per l'eliminazione di un utente
async function deleteUser(username) {
    const user = users.find(u => u.username === username);
    if (!user) {
        alert('Utente non trovato');
        return;
    }
    
    if (user.ruolo === 'SUPERUSER') {
        alert('Non è possibile eliminare un utente con ruolo SUPERUSER');
        return;
    }

    if (confirm(`Sei sicuro di voler eliminare l'utente ${user.username}?`)) {
        try {
            // Elimina prima i dati delle ferie associati
            await supabase
                .from('ferie_balance')
                .delete()
                .eq('user_id', user.id);
            
            // Elimina le richieste associate
            await supabase
                .from('richieste')
                .delete()
                .eq('user_id', user.id);
            
            // Elimina l'utente
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('username', username);
            
            if (error) {
                console.error('Errore nell\'eliminazione:', error);
                alert('Errore nell\'eliminazione: ' + error.message);
                return;
            }
            
            console.log('Utente eliminato con successo');
            await loadUsers(); // Ricarica la lista utenti
        } catch (error) {
            alert('Errore nella richiesta: ' + error.message);
            console.error('Errore nella richiesta:', error);
        }
    }
}

// Funzione per mostrare il form di creazione nuovo utente
function showNewUserForm() {
    isEditing = false;
    editingUserId = null;
    showUserForm();
}

// Esposizione delle funzioni globalmente per l'uso nell'HTML
window.saveUser = saveUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.hideUserForm = hideUserForm;
window.showNewUserForm = showNewUserForm;
window.verifyAndRepairAllUsers = verifyAndRepairAllUsers;
window.UserUtils = UserUtils;

// Inizializzazione della pagina
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza il nome utente nell'header
    UserUtils.initializeUserName();
    
    // Carica gli utenti esistenti
    loadUsers();
    
    // Aggiungi event listener per il pulsante 'Nuovo Utente'
    document.querySelector('.btn-add-user').addEventListener('click', showNewUserForm);
});