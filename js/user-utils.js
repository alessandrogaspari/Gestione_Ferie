/**
 * MODULO: UserUtils - Gestione Centralizzata Dati Utente
 * 
 * Questo modulo fornisce funzionalità comuni per:
 * - Gestione autenticazione e sessione utente
 * - Recupero sicuro dei dati utente da sessionStorage
 * - Controllo automatico dell'autenticazione
 * - Inizializzazione elementi UI con dati utente
 * - Logout centralizzato con pulizia sessione
 * 
 * Utilizzato da tutte le pagine dell'applicazione per garantire
 * coerenza nella gestione dell'autenticazione.
 */

const UserUtils = {
    /**
     * Recupera i dati dell'utente dalla sessionStorage
     * 
     * @returns {Object|null} Oggetto con dati utente (username, nome, ruolo) o null se non autenticato
     * 
     * Struttura dati utente:
     * {
     *   username: string,
     *   nome: string,
     *   ruolo: string ('utente'|'admin')
     * }
     */
    getUserData: function() {
        try {
            // Tenta di parsare i dati JSON dalla sessionStorage
            return JSON.parse(sessionStorage.getItem('user'));
        } catch (error) {
            // Gestisce errori di parsing (dati corrotti)
            console.error('Errore nel recupero dei dati utente:', error);
            return null;
        }
    },

    /**
     * Verifica se l'utente è attualmente autenticato
     * 
     * @returns {boolean} True se l'utente ha una sessione valida
     */
    isAuthenticated: function() {
        return this.getUserData() !== null;
    },

    /**
     * Controlla l'autenticazione e reindirizza al login se necessario
     * 
     * Questa funzione deve essere chiamata all'inizio di ogni pagina protetta
     * per garantire che solo utenti autenticati possano accedere.
     * 
     * @returns {boolean} True se l'utente è autenticato, false se reindirizzato
     */
    checkAuth: function() {
        if (!this.isAuthenticated()) {
            // Reindirizza automaticamente alla pagina di login
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    /**
     * Inizializza gli elementi UI con i dati dell'utente corrente
     * 
     * Questa funzione popola automaticamente gli elementi dell'interfaccia
     * con nome e ruolo dell'utente autenticato. Gestisce intelligentemente
     * i prefissi esistenti negli elementi.
     * 
     * @param {string} userNameElementId - ID dell'elemento per il nome utente (default: 'user-name')
     * @param {string} userRoleElementId - ID dell'elemento per il ruolo utente (default: 'user-role')
     * @returns {boolean} True se l'inizializzazione è avvenuta con successo
     */
    initUserUI: function(userNameElementId = 'user-name', userRoleElementId = 'user-role') {
        // Verifica autenticazione prima di procedere
        if (!this.checkAuth()) return false;
        
        const user = this.getUserData();
        const userNameElement = document.getElementById(userNameElementId);
        const userRoleElement = document.getElementById(userRoleElementId);
        
        // ========== AGGIORNAMENTO NOME UTENTE ==========
        if (userNameElement) {
            // Gestisce elementi con prefisso "Utente: " esistente
            if (userNameElement.textContent.trim().startsWith('Utente:')) {
                userNameElement.textContent = 'Utente: ' + (user.nome || user.username);
            } else {
                // Imposta solo il nome senza prefisso
                userNameElement.textContent = user.nome || user.username;
            }
        }
        
        // ========== AGGIORNAMENTO RUOLO UTENTE ==========
        if (userRoleElement) {
            // Gestisce elementi con prefisso "Ruolo: " esistente
            if (userRoleElement.textContent.trim().startsWith('Ruolo:')) {
                userRoleElement.textContent = 'Ruolo: ' + (user.ruolo || 'Utente');
            } else {
                // Imposta solo il ruolo senza prefisso
                userRoleElement.textContent = user.ruolo || 'Utente';
            }
        }
        
        return true;
    },

    /**
     * Verifica se l'utente corrente ha privilegi di amministratore
     * 
     * Utilizzata per controllare l'accesso a funzionalità amministrative
     * come gestione utenti, approvazione richieste, configurazioni sistema.
     * 
     * @returns {boolean} True se l'utente è un amministratore
     */
    isSuperUser: function() {
        const user = this.getUserData();
        return user && user.ruolo === 'admin';
    },

    /**
     * Inizializza il nome utente nell'header (funzione semplificata)
     * 
     * Versione semplificata di initUserUI che aggiorna solo il nome utente.
     * Utilizzata quando non è necessario aggiornare anche il ruolo.
     * 
     * @returns {boolean} True se l'inizializzazione è avvenuta con successo
     */
    initializeUserName: function() {
        // Verifica autenticazione
        if (!this.checkAuth()) return false;
        
        const user = this.getUserData();
        const userNameElement = document.getElementById('user-name');
        
        // Aggiorna l'elemento nome utente se presente
        if (userNameElement && user) {
            // Priorità: nome reale > username > fallback "Utente"
            userNameElement.textContent = user.nome || user.username || 'Utente';
        }
        
        return true;
    },

    /**
     * Effettua il logout dell'utente e pulizia della sessione
     * 
     * Questa funzione:
     * - Rimuove tutti i dati utente dalla sessionStorage
     * - Reindirizza automaticamente alla pagina di login
     * - Garantisce la pulizia completa della sessione
     * 
     * Può essere chiamata da qualsiasi pagina dell'applicazione.
     */
    logout: function() {
        // Rimuove i dati utente dalla sessionStorage
        sessionStorage.removeItem('user');
        // Reindirizza alla pagina di login
        window.location.href = 'index.html';
    }
};

// Esporta UserUtils per l'uso come modulo ES6
export { UserUtils };