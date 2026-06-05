/**
 * adm_esplodi_ferie.js - Gestione della funzionalità "ESPLODI FERIE" per SUPERUSER
 * Genera un file Excel con 12 fogli (uno per ogni mese dell'anno scolastico)
 * contenente le informazioni sulle ferie approvate degli utenti
 * Integrato con Supabase per la gestione dei dati
 */

// Importa il client Supabase
import { supabase } from './supabase-client.js';

// Funzione per generare il file Excel con le ferie esplose
async function generaExcelFerie() {
    try {
        // Mostra un messaggio di caricamento
        showLoading('Generazione del file Excel in corso...');
        
        // RECUPERO DATI DA SUPABASE: Ottieni tutte le richieste approvate dalla vista richieste_dettagliate
        console.log('Eseguendo query richieste_dettagliate alle:', new Date().toISOString());
        const { data: richieste, error: richiesteError } = await supabase
            .from('richieste_dettagliate')
            .select('*')
            .eq('stato', 'APPROVATA')
            .order('data_inizio', { ascending: true });
        
        if (richiesteError) {
            throw richiesteError;
        }
        
        // RECUPERO UTENTI: Ottieni tutti gli utenti per completare i dati
        const { data: utenti, error: utentiError } = await supabase
            .from('users')
            .select('username, nome, ruolo');
        
        if (utentiError) {
            throw utentiError;
        }
        
        // Processa i dati per il formato Excel - ora i dati sono già completi dalla vista
        const datiProcessati = richieste.map(richiesta => {
            return {
                username: richiesta.username,
                nome: richiesta.nome, // Già disponibile dalla vista
                ruolo: 'utente', // Potresti aggiungere il ruolo alla vista se necessario
                tipo: richiesta.tipo,
                dataInizio: richiesta.data_inizio,
                dataFine: richiesta.data_fine,
                giorni: richiesta.giorni,
                stato: richiesta.stato,
                dataRichiesta: richiesta.created_at
            };
        });
        
        // Mesi dell'anno scolastico
        const MESI_ANNO_SCOLASTICO = [
        { nome: 'Settembre', numero: 9 },
        { nome: 'Ottobre', numero: 10 },
        { nome: 'Novembre', numero: 11 },
        { nome: 'Dicembre', numero: 12 },
        { nome: 'Gennaio', numero: 1 },
        { nome: 'Febbraio', numero: 2 },
        { nome: 'Marzo', numero: 3 },
        { nome: 'Aprile', numero: 4 },
        { nome: 'Maggio', numero: 5 },
        { nome: 'Giugno', numero: 6 },
        { nome: 'Luglio', numero: 7 },
        { nome: 'Agosto', numero: 8 }
        ];
        
        // Ruoli ordinati
        const RUOLI_ORDINATI = [
        'DSGA',
        'ASSISTENTI AMMINISTRATIVI', 
        'ASSISTENTI TECNICI',
        'COLLABORATORI SCOLASTICI'
        ];
        
        // Suffissi per i tipi di ferie
        const SUFFISSI_FERIE = {
        'FERIE': 'F',
        'FERIE VECCHIE': 'FV',
        'FESTIVITA\' SOPPRESSE': 'FS',
        'MOTIVI FAMILIARI': 'MF',
        'RECUPERI': 'R'
        };
        
        // Determina l'anno scolastico
        const dataCorrente = new Date();
        const annoCorrente = dataCorrente.getFullYear();
        const meseCorrente = dataCorrente.getMonth() + 1;
        
        let annoScolasticoInizio, annoScolasticoFine;
        if (meseCorrente >= 9 && meseCorrente <= 12) {
        annoScolasticoInizio = annoCorrente;
        annoScolasticoFine = annoCorrente + 1;
        } else {
        annoScolasticoInizio = annoCorrente - 1;
        annoScolasticoFine = annoCorrente;
        }
        
        // Crea workbook
        const workbook = XLSX.utils.book_new();
        
        // Raggruppa TUTTI gli utenti per ruolo (non solo quelli con ferie)
        const utentiPerRuolo = {};
        RUOLI_ORDINATI.forEach(ruolo => {
        utentiPerRuolo[ruolo] = [];
        });
        
        // Aggiungi tutti gli utenti ai rispettivi ruoli
        utenti.forEach(utente => {
            const ruolo = utente.ruolo ? utente.ruolo.toUpperCase() : 'COLLABORATORI SCOLASTICI';
            if (utentiPerRuolo[ruolo]) {
                utentiPerRuolo[ruolo].push({
                    username: utente.username,
                    nome: utente.nome,
                    ruolo: ruolo
                });
            } else {
                console.warn(`Ruolo non riconosciuto per ${utente.nome}: ${ruolo}`);
                // Aggiungi a COLLABORATORI SCOLASTICI come fallback
                utentiPerRuolo['COLLABORATORI SCOLASTICI'].push({
                    username: utente.username,
                    nome: utente.nome,
                    ruolo: 'COLLABORATORI SCOLASTICI'
                });
            }
        });
        
        // Ordina utenti per nome in ogni ruolo
        Object.keys(utentiPerRuolo).forEach(ruolo => {
        utentiPerRuolo[ruolo].sort((a, b) => a.nome.localeCompare(b.nome));
        });
        
        // Crea un foglio per ogni mese dell'anno scolastico
        for (const mese of MESI_ANNO_SCOLASTICO) {
        const annoMese = mese.numero >= 9 ? annoScolasticoInizio : annoScolasticoFine;
        const giorniNelMese = new Date(annoMese, mese.numero, 0).getDate();
        
        console.log(`Creando foglio per ${mese.nome} ${annoMese} (${giorniNelMese} giorni)`);
        
        // Crea worksheet
        const worksheet = XLSX.utils.aoa_to_sheet([]);
        
        // Intestazione principale
        XLSX.utils.sheet_add_aoa(worksheet, 
            [[`PROSPETTO FERIE ANNO ${annoScolasticoInizio}-${annoScolasticoFine} - PERSONALE ATA`]], 
            { origin: 'A1' }
        );
        
        // Nome mese e anno
        XLSX.utils.sheet_add_aoa(worksheet, [[mese.nome.toLowerCase()]], { origin: 'A2' });
        XLSX.utils.sheet_add_aoa(worksheet, [[annoMese.toString()]], { origin: 'B2' });
        
        // Intestazioni colonne giorni (escluse domeniche)
        const intestazioneGiorni = ['', ''];
        const intestazioneGiorniSettimana = ['', ''];
        const giorniSettimana = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        
        for (let giorno = 1; giorno <= giorniNelMese; giorno++) {
            const dataGiorno = new Date(annoMese, mese.numero - 1, giorno);
            if (dataGiorno.getDay() !== 0) { // Escludi domeniche
                intestazioneGiorni.push(giorno.toString().padStart(2, '0'));
                intestazioneGiorniSettimana.push(giorniSettimana[dataGiorno.getDay()]);
            }
        }
        
        XLSX.utils.sheet_add_aoa(worksheet, [intestazioneGiorni], { origin: 'A3' });
        XLSX.utils.sheet_add_aoa(worksheet, [intestazioneGiorniSettimana], { origin: 'A4' });
        
        // Aggiungi TUTTI gli utenti raggruppati per ruolo
        let rigaCorrente = 5;
        
        for (const ruolo of RUOLI_ORDINATI) {
            if (utentiPerRuolo[ruolo].length > 0) {
                // Intestazione ruolo
                XLSX.utils.sheet_add_aoa(worksheet, [[ruolo]], { origin: `A${rigaCorrente}` });
                rigaCorrente++;
                
                // TUTTI gli utenti del ruolo (anche senza ferie)
                for (const utente of utentiPerRuolo[ruolo]) {
                    const rigaUtente = [utente.nome, 'T.I.'];
                    
                    // Per ogni giorno non-domenica del mese
                    for (let giorno = 1; giorno <= giorniNelMese; giorno++) {
                        const dataGiorno = new Date(annoMese, mese.numero - 1, giorno);
                        
                        if (dataGiorno.getDay() !== 0) { // Non domenica
                            let suffissiGiorno = [];
                            
                            // Cerca richieste per questo utente e giorno
                            for (const richiesta of datiProcessati) {
                                if (richiesta.username === utente.username) {
                                    const dataInizio = new Date(richiesta.dataInizio);
                                    const dataFine = new Date(richiesta.dataFine);
                                    
                                    // Normalizza le date per confronto corretto
                                    const dataGiornoNorm = new Date(dataGiorno.getFullYear(), dataGiorno.getMonth(), dataGiorno.getDate());
                                    const dataInizioNorm = new Date(dataInizio.getFullYear(), dataInizio.getMonth(), dataInizio.getDate());
                                    const dataFineNorm = new Date(dataFine.getFullYear(), dataFine.getMonth(), dataFine.getDate());
                                    
                                    if (dataGiornoNorm >= dataInizioNorm && dataGiornoNorm <= dataFineNorm) {
                                        const suffisso = SUFFISSI_FERIE[richiesta.tipo.toUpperCase()] || '';
                                        if (suffisso && !suffissiGiorno.includes(suffisso)) {
                                            suffissiGiorno.push(suffisso);
                                        }
                                    }
                                }
                            }
                            
                            // Aggiungi gli acronimi delle ferie per questo giorno (o cella vuota)
                            rigaUtente.push(suffissiGiorno.join('/'));
                        }
                    }
                    
                    XLSX.utils.sheet_add_aoa(worksheet, [rigaUtente], { origin: `A${rigaCorrente}` });
                    rigaCorrente++;
                }
                
                // Rimuovi questa riga per non aggiungere spazio vuoto tra i ruoli
                // rigaCorrente++;
            }
        }
        
        // Aggiungi il foglio al workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, mese.nome);
    }
    
    // Genera il blob Excel (cambia bookType da 'xlsx' a 'xlsm')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsm', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.ms-excel.sheet.macroEnabled.12' });
    
    // Crea un link per il download
    const url = URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prospetto_Ferie_${annoScolasticoInizio}-${annoScolasticoFine}.xlsm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Nascondi il messaggio di caricamento
    hideLoading();
    
    // Mostra messaggio di successo con istruzioni
    showSuccessWithInstructions('File Excel generato con successo!');
    
    // Reindirizza alla pagina delle istruzioni macro dopo un breve delay
    setTimeout(() => {
        window.location.href = 'istruzioni-macro.html';
    }, 2000);
        
    } catch (error) {
        // Nascondi il messaggio di caricamento in caso di errore
        hideLoading();
        
        console.error('Errore nella generazione del file Excel:', error);
        console.error('Dettagli errore:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            stack: error.stack
        });
        // Mostra un messaggio di errore
        const errorMessage = error.code ? 
            `Errore ${error.code}: ${error.message}${error.hint ? ' - ' + error.hint : ''}` :
            'Errore nella generazione del file Excel: ' + (error.message || 'Errore sconosciuto');
        showError(errorMessage);
    }
}

/**
 * Mostra un messaggio di caricamento
 * @param {string} message - Messaggio da mostrare
 */
function showLoading(message) {
    // Crea un elemento div per il messaggio di caricamento
    const loadingElement = document.createElement('div');
    loadingElement.id = 'loading-message';
    loadingElement.className = 'loading-overlay';
    loadingElement.innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    // Aggiungi lo stile CSS (solo se non esiste già)
    if (!document.getElementById('notification-instructions-style')) {
        const style = document.createElement('style');
        style.id = 'notification-instructions-style';
        style.textContent = `
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        
        .loading-content {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 2s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
        // Aggiungi gli elementi al documento
        document.head.appendChild(style);
    }
    
    // Aggiungi il messaggio di caricamento al documento
    document.body.appendChild(loadingElement);
}

/**
 * Nascondi il messaggio di caricamento
 */
function hideLoading() {
    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
        loadingElement.remove();
    }
}

/**
 * Mostra un messaggio di successo
 * @param {string} message - Messaggio da mostrare
 */
function showSuccess(message) {
    showNotification(message, 'success');
}

/**
 * Mostra un messaggio di errore
 * @param {string} message - Messaggio da mostrare
 */
function showError(message) {
    showNotification(message, 'error');
}

/**
 * Mostra un messaggio di successo con link alle istruzioni macro
 * @param {string} message - Messaggio da mostrare
 */
function showSuccessWithInstructions(message) {
    showNotificationWithInstructions(message, 'success');
}

/**
 * Mostra una notifica
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo di notifica (success, error)
 */
function showNotification(message, type) {
    // Crea un elemento div per la notifica
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification ${type}`;
    notificationElement.textContent = message;
    
    // Aggiungi lo stile CSS
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
            opacity: 0;
            animation-fill-mode: forwards;
        }
        
        .notification.success {
            background-color: #4caf50;
        }
        
        .notification.error {
            background-color: #f44336;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    
    // Aggiungi lo stile al documento
    document.head.appendChild(style);
    
    // Aggiungi la notifica al documento
    document.body.appendChild(notificationElement);
    
    // Rimuovi la notifica dopo 3 secondi
    setTimeout(() => {
        if (notificationElement.parentElement) {
            notificationElement.remove();
        }
    }, 3000);
}

/**
 * Mostra una notifica con link alle istruzioni macro
 * @param {string} message - Messaggio da mostrare
 * @param {string} type - Tipo di notifica (success, error)
 */
function showNotificationWithInstructions(message, type) {
    // Crea un elemento div per la notifica
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-with-instructions ${type}`;
    notificationElement.innerHTML = `
        <div class="notification-content">
            <div class="notification-message">${message}</div>
            <div class="notification-instructions">
                <p><strong>📋 Prossimo passo:</strong> Importa le macro di formattazione</p>
                <a href="istruzioni-macro.html" target="_blank" class="instructions-link">
                    📖 Visualizza istruzioni dettagliate
                </a>
            </div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Aggiungi lo stile CSS (solo se non esiste già)
    if (!document.getElementById('notification-with-instructions-style')) {
        const style = document.createElement('style');
        style.id = 'notification-with-instructions-style';
        style.textContent = `
        .notification-with-instructions {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            animation: slideIn 0.4s ease-out;
            max-width: 400px;
            min-width: 300px;
        }
        
        .notification-with-instructions.success {
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        }
        
        .notification-content {
            margin-right: 30px;
        }
        
        .notification-message {
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .notification-instructions {
            font-size: 14px;
            opacity: 0.95;
        }
        
        .notification-instructions p {
            margin: 8px 0;
            font-weight: 500;
        }
        
        .instructions-link {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            padding: 8px 15px;
            border-radius: 5px;
            margin-top: 10px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .instructions-link:hover {
            background: rgba(255, 255, 255, 0.3);
            color: white;
            text-decoration: none;
            transform: translateY(-1px);
        }
        
        .notification-close {
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }
        
        .notification-close:hover {
            opacity: 1;
            background: rgba(255, 255, 255, 0.2);
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    
        // Aggiungi lo stile al documento
        document.head.appendChild(style);
    }
    
    // Aggiungi la notifica al documento
    document.body.appendChild(notificationElement);
    
    // Debug: log per verificare che la funzione venga chiamata
    console.log('Notifica con istruzioni aggiunta al DOM:', notificationElement);
    
    // Rimuovi automaticamente la notifica dopo 10 secondi (più tempo per leggere le istruzioni)
    setTimeout(() => {
        if (notificationElement.parentElement) {
            notificationElement.remove();
        }
    }, 10000);
}

// Esporta la funzione per renderla accessibile globalmente
export { generaExcelFerie };