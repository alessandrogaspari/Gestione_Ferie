/**
 * user-utils.js - Gestione centralizzata dei dati utente
 */

const UserUtils = {
    /**
     * Ottiene i dati dell'utente dalla sessionStorage
     * @returns {Object|null} Dati utente o null se non autenticato
     */
    getUserData: function() {
        try {
            return JSON.parse(sessionStorage.getItem('user'));
        } catch (error) {
            console.error('Errore nel recupero dei dati utente:', error);
            return null;
        }
    },

    /**
     * Verifica se l'utente è autenticato
     * @returns {boolean} True se l'utente è autenticato
     */
    isAuthenticated: function() {
        return this.getUserData() !== null;
    },

    /**
     * Reindirizza alla pagina di login se l'utente non è autenticato
     * @returns {boolean} True se l'utente è autenticato
     */
    checkAuth: function() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    /**
     * Inizializza gli elementi UI con i dati dell'utente
     * @param {string} userNameElementId - ID dell'elemento per il nome utente
     * @param {string} userRoleElementId - ID dell'elemento per il ruolo utente
     * @returns {boolean} True se l'inizializzazione è avvenuta con successo
     */
    initUserUI: function(userNameElementId = 'user-name', userRoleElementId = 'user-role') {
        if (!this.checkAuth()) return false;
        
        const user = this.getUserData();
        const userNameElement = document.getElementById(userNameElementId);
        const userRoleElement = document.getElementById(userRoleElementId);
        
        if (userNameElement) {
            // Verifica se l'elemento contiene già il prefisso "Utente: "
            if (userNameElement.textContent.trim().startsWith('Utente:')) {
                userNameElement.textContent = 'Utente: ' + (user.nome || user.username);
            } else {
                userNameElement.textContent = user.nome || user.username;
            }
        }
        
        if (userRoleElement) {
            // Verifica se l'elemento contiene già il prefisso "Ruolo: "
            if (userRoleElement.textContent.trim().startsWith('Ruolo:')) {
                userRoleElement.textContent = 'Ruolo: ' + (user.ruolo || 'Utente');
            } else {
                userRoleElement.textContent = user.ruolo || 'Utente';
            }
        }
        
        return true;
    },

    /**
     * Verifica se l'utente è un amministratore
     * @returns {boolean} True se l'utente è un amministratore
     */
    isSuperUser: function() {
        const user = this.getUserData();
        return user && user.ruolo === 'admin';
    },

    /**
     * Effettua il logout dell'utente
     */
    logout: function() {
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
    }
};