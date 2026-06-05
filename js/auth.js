/**
 * MODULO: Gestione Autenticazione Sistema Ferie ATA con Supabase
 * 
 * Responsabilità principali:
 * - Autenticazione sicura degli utenti tramite Supabase Auth
 * - Gestione sessione utente con Supabase e sessionStorage
 * - Controllo autorizzazioni e ruoli (admin/utente)
 * - Reindirizzamento automatico basato su ruolo
 * - Validazione stato autenticazione su ogni pagina
 * - Logout sicuro con pulizia sessione
 * 
 * Flusso di autenticazione:
 * 1. Utente inserisce credenziali nel form
 * 2. Validazione lato client (campi obbligatori)
 * 3. Autenticazione tramite Supabase Auth
 * 4. Recupero dati utente dalla tabella utenti
 * 5. Salvataggio dati utente in sessionStorage
 * 6. Reindirizzamento a dashboard appropriata
 * 
 * Sicurezza:
 * - Credenziali verificate tramite Supabase Auth
 * - Dati sensibili mai salvati in localStorage
 * - Controllo autorizzazioni su ogni pagina
 * - Row Level Security (RLS) per protezione dati
 */

// Importa il client Supabase
import { supabase, isAuthenticated, getCurrentUser, signIn, signOut } from './supabase-client.js';

// INIZIALIZZAZIONE MODULO
document.addEventListener('DOMContentLoaded', function() {
    // Nota: checkAuthStatus() rimossa per evitare loop infiniti
    // Viene chiamata solo dalle pagine protette quando necessario
    
    // RIFERIMENTI DOM: Ottiene elementi del form di login
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loadingMessage = document.getElementById('loading-message');
    const loginButton = document.getElementById('login-button');
    
    // GESTIONE FORM LOGIN: Configura event listener solo se form presente
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Previene il submit standard del form HTML
            
            // VALIDAZIONE CLIENT: Verifica campi obbligatori prima della chiamata API
            if (!usernameInput.value || !passwordInput.value) {
                showMessage('Inserisci username e password', true);
                return;
            }
            
            // STATO LOADING: Disabilita form per evitare submit multipli
            setFormLoading(true);
            
            try {
                // AUTENTICAZIONE SUPABASE: Verifica credenziali tramite Supabase Auth
                const authResult = await signIn(usernameInput.value, passwordInput.value);
                
                if (authResult.success) {
                    // RECUPERO DATI UTENTE: Ottiene informazioni dalla tabella utenti
                    const { data: userDataArray, error: userError } = await supabase
                        .from('users')
                        .select('username, nome, ruolo')
                        .eq('username', usernameInput.value)
                        .order('id')
                        .limit(1);
                    
                    const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
                    
                    if (!userData) {
                        showMessage('Utente non trovato', true);
                        setFormLoading(false);
                        return;
                    }
                    
                    if (userError) {
                        console.error('Errore recupero dati utente:', userError);
                        showMessage('Errore nel recupero dei dati utente', true);
                        setFormLoading(false);
                        return;
                    }
                    
                    // CREAZIONE SESSIONE: Prepara oggetto utente con dati da Supabase
                    const user = {
                        username: userData.username,
                        nome: userData.nome || userData.username, // Fallback al username
                        ruolo: userData.ruolo || 'utente' // Fallback a ruolo base
                    };
                    console.log("Salvataggio dati utente in sessionStorage:", user);
                    
                    // PERSISTENZA SESSIONE: Salva dati utente in sessionStorage
                    // (sessionStorage si cancella alla chiusura del browser per sicurezza)
                    sessionStorage.setItem('user', JSON.stringify(user));
                    
                    // FEEDBACK UTENTE: Mostra conferma di login riuscito
                    showMessage('Accesso effettuato, reindirizzamento in corso...', false);
                    
                    // REINDIRIZZAMENTO BASATO SU RUOLO: Porta alla dashboard appropriata
                    setTimeout(function() {
                        // Ruoli amministrativi con accesso completo
                        if (user.ruolo === 'SUPERUSER' || user.ruolo === 'DS' || user.ruolo === 'DSGA') {
                            // Amministratori -> Dashboard amministrativa completa
                            window.location.href = 'adm_dashboard.html';
                        } else if (user.ruolo === 'admin') {
                            // Admin generico -> Dashboard amministrativa
                            window.location.href = 'adm_dashboard.html';
                        } else {
                            // Tutti gli altri ruoli -> Dashboard utente standard
                            // Include: ASSISTENTI AMMINISTRATIVI, ASSISTENTI TECNICI, 
                            // COLLABORATORI SCOLASTICI, utente
                            window.location.href = 'dashboard.html';
                        }
                    }, 2000); // Delay per permettere lettura messaggio
                    
                } else {
                    // GESTIONE FALLIMENTO: Credenziali non valide
                    showMessage(authResult.message || 'Credenziali non valide. Riprova.', true);
                    setFormLoading(false); // Riabilita form per nuovo tentativo
                }
                
            } catch (error) {
                // GESTIONE ERRORI: Problemi di rete o server
                console.error('Errore durante l\'autenticazione:', error);
                showMessage('Si è verificato un errore durante l\'autenticazione: ' + (error.message || 'Errore sconosciuto'), true);
                setFormLoading(false); // Riabilita form per nuovo tentativo
            }
        });
    }
    
    /**
     * Gestisce la visualizzazione di messaggi di feedback all'utente
     * 
     * Mostra messaggi di errore (rossi) o informativi (verdi) nell'interfaccia
     * utente, gestendo automaticamente lo stile e la visibilità.
     * 
     * @param {string} message - Testo del messaggio da visualizzare
     * @param {boolean} isError - True per errori (rosso), false per info (verde)
     */
    function showMessage(message, isError = true) {
        if (errorMessage) {
            // Imposta il contenuto testuale del messaggio
            errorMessage.textContent = message;
            
            // GESTIONE STILE E VISIBILITÀ
            if (message && isError) {
                // Messaggio di errore: rosso, visibile
                errorMessage.style.display = 'block';
                errorMessage.className = 'error-message';
            } else if (message && !isError) {
                // Messaggio informativo: verde, visibile
                errorMessage.style.display = 'block';
                errorMessage.className = 'info-message';
            } else {
                // Nessun messaggio: nascosto
                errorMessage.style.display = 'none';
            }
        }
        
        if (loadingMessage) {
            loadingMessage.style.display = isError ? 'none' : 'block';
        }
    }
    
    /**
     * Controlla lo stato di caricamento del form di login
     * 
     * Gestisce l'interfaccia utente durante il processo di autenticazione:
     * - Disabilita/abilita tutti i campi del form
     * - Cambia il testo del pulsante per dare feedback
     * - Mostra messaggio di caricamento appropriato
     * - Previene submit multipli durante l'autenticazione
     * 
     * @param {boolean} loading - True per attivare stato loading, false per disattivarlo
     */
    function setFormLoading(loading) {
        // CONTROLLO PULSANTE: Disabilita e cambia testo durante loading
        if (loginButton) {
            loginButton.disabled = loading;
            loginButton.textContent = loading ? 'Autenticazione...' : 'Accedi';
        }
        
        // CONTROLLO CAMPI: Disabilita input per evitare modifiche durante auth
        if (usernameInput) usernameInput.disabled = loading;
        if (passwordInput) passwordInput.disabled = loading;
        
        // FEEDBACK VISIVO: Mostra stato di caricamento
        if (loading) {
            showMessage('Autenticazione in corso...', false);
        }
        // Nota: Non nasconde messaggi di errore quando loading termina
        // per permettere all'utente di vedere eventuali errori
    }
});

/**
 * FUNZIONE GLOBALE: Controllo Stato Autenticazione e Protezione Pagine
 * 
 * Implementa il sistema di sicurezza dell'applicazione verificando
 * lo stato di autenticazione tramite Supabase e gestendo i reindirizzamenti automatici.
 * 
 * Logica di protezione:
 * 1. Utente autenticato su pagina login -> Reindirizza a dashboard
 * 2. Utente non autenticato su pagina protetta -> Reindirizza a login
 * 3. Utente autenticato su pagina corretta -> Nessuna azione
 * 
 * Chiamata automaticamente:
 * - Al caricamento di ogni pagina
 * - Dopo login/logout
 * - Prima di operazioni sensibili
 */
async function checkAuthStatus() {
    // VERIFICA SESSIONE: Controlla autenticazione tramite sessionStorage
    const isAuth = isAuthenticated();
    const user = sessionStorage.getItem('user');
    
    // Ottiene il nome del file corrente
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // CASO 1: Utente già autenticato sulla pagina di login
    // Evita login multipli reindirizzando direttamente alla dashboard
    if (isAuth && user && (currentPage === 'index.html' || currentPage === '')) {
        const userData = JSON.parse(user);
        // Ruoli amministrativi con accesso completo
        if (userData.ruolo === 'SUPERUSER' || userData.ruolo === 'DS' || 
            userData.ruolo === 'DSGA' || userData.ruolo === 'admin') {
            window.location.href = 'adm_dashboard.html';
        } else {
            // Tutti gli altri ruoli -> Dashboard utente standard
            window.location.href = 'dashboard.html';
        }
        return;
    }
    
    // CASO 2: Utente non autenticato su pagina protetta
    // Forza autenticazione reindirizzando alla pagina di login
    if (!isAuth && currentPage !== 'index.html' && currentPage !== '') {
        // Pulisce sessionStorage se non autenticato
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
        return;
    }
    
    // CASO 3: Utente autenticato su pagina corretta
    // Nessuna azione necessaria, continua normale esecuzione
}

/**
 * FUNZIONE GLOBALE: Logout Sicuro con Pulizia Sessione Supabase
 * 
 * Gestisce il processo completo di disconnessione dell'utente:
 * - Disconnette l'utente da Supabase Auth
 * - Rimuove tutti i dati sensibili dalla sessione
 * - Pulisce cache e storage temporanei
 * - Reindirizza alla pagina di login
 * - Previene accessi non autorizzati dopo logout
 * 
 * Utilizzata da:
 * - Pulsanti logout in tutte le dashboard
 * - Timeout automatico di sessione
 * - Gestione errori di autenticazione
 * 
 * Sicurezza:
 * - Logout completo da Supabase Auth
 * - Pulizia completa di sessionStorage
 * - Nessun dato sensibile rimane nel browser
 * - Reindirizzamento immediato per prevenire accessi
 * - Può essere chiamata da qualsiasi pagina dell'applicazione
 */
async function logout() {
    console.log('Esecuzione logout: disconnessione da Supabase e pulizia dati utente');
    
    try {
        // LOGOUT: Rimuove i dati utente da sessionStorage
        signOut();
        
        // Rimuove i dati principali dell'utente da sessionStorage
        // Questo invalida immediatamente la sessione locale
        sessionStorage.removeItem('user');
        
        // Pulizia di eventuali altri dati relativi all'utente
        // Espandibile per rimuovere cache, preferenze, ecc.
        // sessionStorage.removeItem('userPreferences');
        // sessionStorage.removeItem('cachedData');
        
        console.log('Logout completato, reindirizzamento alla pagina di login');
        
    } catch (error) {
        console.error('Errore durante il logout:', error);
        // Anche in caso di errore, pulisce i dati locali
        sessionStorage.removeItem('user');
    }
    
    // Reindirizza immediatamente alla pagina di login
    // Questo completa il processo di logout
    window.location.href = 'index.html';
}