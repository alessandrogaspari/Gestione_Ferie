/**
 * auth.js - Gestione dell'autenticazione per l'applicazione Gestione Ferie ATA
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se l'utente è già autenticato
    checkAuthStatus();
    
    // Riferimenti agli elementi del DOM
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loadingMessage = document.getElementById('loading-message');
    const loginButton = document.getElementById('login-button');
    
    // Gestione del form di login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validazione dei campi
            if (!usernameInput.value || !passwordInput.value) {
                showMessage('Inserisci username e password', true);
                return;
            }
            
            // Disabilita il form durante l'autenticazione
            setFormLoading(true);
            
            try {
                // Effettua il login
                const result = await API.verificaCredenziali(usernameInput.value, passwordInput.value);
                
                if (result.success) {
                    // Salva i dati dell'utente in sessionStorage
                    const user = {
                        username: usernameInput.value,
                        nome: result.nome || usernameInput.value,
                        ruolo: result.ruolo || 'utente'
                    };
                    console.log("Salvataggio dati utente in sessionStorage:", user);
                    sessionStorage.setItem('user', JSON.stringify(user));
                    
                    // Mostra messaggio di successo
                    showMessage('Accesso effettuato, reindirizzamento in corso...', false);
                    
                    // Reindirizza alla dashboard appropriata in base al ruolo
                    setTimeout(function() {
                        if (user.ruolo === 'SUPERUSER') {
                            window.location.href = 'adm_dashboard.html';
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }, 2000);
                } else {
                    // Mostra messaggio di errore
                    showMessage('Credenziali non valide. Riprova.', true);
                    setFormLoading(false);
                }
            } catch (error) {
                console.error('Errore durante l\'autenticazione:', error);
                showMessage('Si è verificato un errore durante l\'autenticazione: ' + (error.message || 'Errore sconosciuto'), true);
                setFormLoading(false);
            }
        });
    }
    
    /**
     * Mostra un messaggio all'utente
     * @param {string} message - Messaggio da mostrare
     * @param {boolean} isError - Indica se è un errore
     */
    function showMessage(message, isError = true) {
        if (errorMessage) {
            errorMessage.textContent = message;
            // Forza la visualizzazione del messaggio di errore
            if (message && isError) {
                errorMessage.style.display = 'block';
                errorMessage.className = 'error-message';
            } else if (message && !isError) {
                errorMessage.style.display = 'block'; // Mostra anche i messaggi di info
                errorMessage.className = 'info-message';
            } else {
                errorMessage.style.display = 'none';
            }
        }
        
        if (loadingMessage) {
            loadingMessage.style.display = isError ? 'none' : 'block';
        }
    }
    
    /**
     * Imposta lo stato di caricamento del form
     * @param {boolean} loading - Indica se il form è in caricamento
     */
    function setFormLoading(loading) {
        if (loginButton) {
            loginButton.disabled = loading;
            loginButton.textContent = loading ? 'Autenticazione...' : 'Accedi';
        }
        
        if (usernameInput) usernameInput.disabled = loading;
        if (passwordInput) passwordInput.disabled = loading;
        
        // Mostra il messaggio di caricamento solo se stiamo caricando
        if (loading) {
            showMessage('Autenticazione in corso...', false);
        }
        // Non nascondere eventuali messaggi di errore quando il caricamento termina
    }
});

/**
 * Verifica lo stato di autenticazione dell'utente
 */
function checkAuthStatus() {
    const user = sessionStorage.getItem('user');
    
    // Se siamo nella pagina di login e l'utente è già autenticato, reindirizza alla dashboard
    if (user && window.location.pathname.includes('index.html')) {
        window.location.href = 'dashboard.html';
    }
    
    // Se non siamo nella pagina di login e l'utente non è autenticato, reindirizza al login
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

/**
 * Effettua il logout dell'utente
 */
function logout() {
    console.log('Esecuzione logout: pulizia dati utente');
    
    // Rimuovi tutti i dati dell'utente da sessionStorage
    sessionStorage.removeItem('user');
    
    // Pulizia di eventuali altri dati relativi all'utente
    // Se ci sono altri dati specifici dell'utente in sessionStorage, rimuovili qui
    
    console.log('Reindirizzamento alla pagina di login');
    
    // Reindirizza alla pagina di login
    window.location.href = 'index.html';
}