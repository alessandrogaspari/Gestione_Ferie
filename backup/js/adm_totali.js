/**
 * adm_totali.js - Gestione dei totali delle ferie
 */

// Variabile globale per i dati dell'utente selezionato
let selectedUserData = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Verifica che l'utente sia un SUPERUSER
    const userData = UserUtils.getUserData();
    if (!userData || userData.ruolo !== 'SUPERUSER') {
        window.location.href = 'index.html';
        return;
    }

    // Recupera i dati dell'utente selezionato dal localStorage
    const storedUserData = localStorage.getItem('selectedUserData');
    if (!storedUserData) {
        alert('Nessun utente selezionato');
        window.close();
        return;
    }

    try {
        selectedUserData = JSON.parse(storedUserData);
        if (!selectedUserData || !selectedUserData.username) {
            throw new Error('Dati utente non validi');
        }

        // Mostra il nome dell'utente selezionato
        document.getElementById('user-name').textContent = selectedUserData.username;

        // Carica i totali esistenti dal database
        await loadUserData();

        // Gestione del form di salvataggio dei totali
        document.getElementById('totals-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = {
                username: selectedUserData.username,
                ferieTotali: parseInt(document.getElementById('ferieTotali').value) || 0,
                ferieVecchieTotali: parseInt(document.getElementById('ferieVecchieTotali').value) || 0,
                festivitaTotali: parseInt(document.getElementById('festivitaTotali').value) || 0,
                motiviFamiliariTotali: parseInt(document.getElementById('motiviFamiliariTotali').value) || 0,
                recuperiTotali: parseInt(document.getElementById('recuperiTotali').value) || 0
            };

            try {
                const response = await API.updateTotali(data);
                if (response.success) {
                    alert('Totali aggiornati con successo');
                    window.close();
                } else {
                    throw new Error(response.message || 'Errore durante l\'aggiornamento dei totali');
                }
            } catch (error) {
                alert('Errore durante l\'aggiornamento dei totali: ' + error.message);
            }
        });

    } catch (error) {
        alert('Errore nel caricamento dei dati: ' + error.message);
        window.close();
    }
});

/**
 * Carica i dati dell'utente dal database e popola i campi del form
 */
async function loadUserData() {
    try {
        const response = await API.getDatiUtente(selectedUserData.username);
        if (!response.success || !response.data) {
            throw new Error('Dati utente non trovati');
        }

        // Popola i campi del form con i dati esistenti
        document.getElementById('ferieTotali').value = response.data.FerieTotali || 0;
        document.getElementById('ferieVecchieTotali').value = response.data.FerieVecchieTotali || 0;
        document.getElementById('festivitaTotali').value = response.data.FestivitaTotali || 0;
        document.getElementById('motiviFamiliariTotali').value = response.data.MotiviFamiliariTotali || 0;
        document.getElementById('recuperiTotali').value = response.data.RecuperiTotali || 0;

    } catch (error) {
        throw new Error('Errore nel caricamento dei dati: ' + error.message);
    }
}