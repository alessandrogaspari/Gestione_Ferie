/**
 * adm_totali.js - Gestione dei totali delle ferie
 * Integrato con Supabase per la gestione dei dati
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';
// Importa le utility per la gestione utente
import { UserUtils } from './user-utils.js';

// Variabile globale per i dati dell'utente selezionato
let selectedUserData = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Inizializza il nome utente nell'header
    UserUtils.initializeUserName();
    
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

    // Recupera i parametri dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const displayName = urlParams.get('displayName');

    if (!username) {
        alert('Nessun utente selezionato');
        window.location.href = 'adm_dashboard.html';
        return;
    }

    selectedUserData = { username: username, nome: displayName };

    // Mostra il nome completo dell'utente selezionato
    document.getElementById('selected-user-name').textContent = displayName || username;

    try {
        // Carica i totali esistenti dal database
        await loadUserData();

        // Gestione del form di salvataggio dei totali
        document.getElementById('totals-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Prima ottieni l'ID dell'utente
            const { data: userRecordArray, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('username', selectedUserData.username)
                .limit(1);
            
            const userRecord = userRecordArray && userRecordArray.length > 0 ? userRecordArray[0] : null;
            
            if (!userRecord) {
                throw new Error('Utente non trovato');
            }
            
            if (userError) {
                throw userError;
            }
            
            const totals = {
                user_id: userRecord.id,
                ferie_totali: parseInt(document.getElementById('ferieTotali').value) || 0,
                ferie_vecchie_totali: parseInt(document.getElementById('ferieVecchieTotali').value) || 0,
                festivita_totali: parseInt(document.getElementById('festivitaTotali').value) || 0,
                motivi_familiari_totali: parseInt(document.getElementById('motiviFamiliariTotali').value) || 0,
                recuperi_totali: parseInt(document.getElementById('recuperiTotali').value) || 0,
                updated_at: new Date().toISOString()
            };

            try {
                // AGGIORNAMENTO TOTALI: Upsert su Supabase (inserisce se non esiste, aggiorna se esiste)
                const { error } = await supabase
                    .from('ferie_balance')
                    .upsert(totals, {
                        onConflict: 'user_id'
                    });
                
                if (error) {
                    throw error;
                }
                
                alert('Totali aggiornati con successo');
                window.location.href = 'adm_dashboard.html';
                
            } catch (error) {
                console.error('Errore durante l\'aggiornamento dei totali:', error);
                alert('Errore durante l\'aggiornamento dei totali: ' + (error.message || 'Errore sconosciuto'));
            }
        });

    } catch (error) {
        alert('Errore nel caricamento dei dati: ' + error.message);
        window.location.href = 'adm_dashboard.html';
    }
});

/**
 * Carica i dati dell'utente dal database e popola i campi del form
 */
async function loadUserData() {
    try {
        // Prima ottieni l'ID dell'utente
        const { data: userRecordArray, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('username', selectedUserData.username)
            .limit(1);
        
        const userRecord = userRecordArray && userRecordArray.length > 0 ? userRecordArray[0] : null;
        
        if (!userRecord) {
            throw new Error('Utente non trovato');
        }
        
        if (userError) {
            throw userError;
        }
        
        // CARICAMENTO TOTALI: Query diretta su Supabase
        const { data: totaliDataArray, error } = await supabase
            .from('ferie_balance')
            .select('*')
            .eq('user_id', userRecord.id)
            .limit(1);
        
        const totaliData = totaliDataArray && totaliDataArray.length > 0 ? totaliDataArray[0] : null;
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }
        
        // Se non ci sono dati, usa valori di default
        const totali = totaliData || {
            ferie_totali: 0,
            ferie_vecchie_totali: 0,
            festivita_totali: 0,
            motivi_familiari_totali: 0,
            recuperi_totali: 0
        };

        // Popola i campi del form con i dati esistenti (adattati ai nomi dei campi Supabase)
        document.getElementById('ferieTotali').value = totali.ferie_totali || 0;
        document.getElementById('ferieVecchieTotali').value = totali.ferie_vecchie_totali || 0;
        document.getElementById('festivitaTotali').value = totali.festivita_totali || 0;
        document.getElementById('motiviFamiliariTotali').value = totali.motivi_familiari_totali || 0;
        document.getElementById('recuperiTotali').value = totali.recuperi_totali || 0;

    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        throw new Error('Errore nel caricamento dei dati: ' + (error.message || 'Errore sconosciuto'));
    }
}