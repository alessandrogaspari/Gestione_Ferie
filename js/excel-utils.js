// Utility per la gestione del file Excel locale
const XLSX = require('xlsx');
const path = require('path');

// Percorso del file Excel
const DB_PATH = path.join(__dirname, '..', 'DB_Ferie.xlsx');

// Nomi dei fogli
const SHEETS = {
    PERSONALE: 'UTENTI',
    FERIE: 'FERIE',
    RICHIESTE: 'RICHIESTE',
    SOSPENSIONI: 'SOSPENSIONI'
};

/**
 * Legge i dati da un foglio del file Excel
 * @param {string} sheetName - Nome del foglio da leggere
 * @returns {Array} - Array di oggetti con i dati del foglio
 */
function readSheet(sheetName) {
    try {
        const workbook = XLSX.readFile(DB_PATH);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Data successfully read from sheet
        
        return data;
    } catch (error) {
        console.error(`Errore nella lettura del foglio ${sheetName}:`, error);
        throw error;
    }
}

/**
 * Scrive i dati in un foglio del file Excel
 * @param {string} sheetName - Nome del foglio in cui scrivere
 * @param {Array} data - Array di oggetti da scrivere nel foglio
 */
function writeSheet(sheetName, data) {
    let attempts = 0;
    const maxAttempts = 5;
    const retryDelay = 500; // 500ms tra i tentativi
    
    const attemptWrite = () => {
        try {
            // Verifica che il file esista
            const fs = require('fs');
            if (!fs.existsSync(DB_PATH)) {
                console.error(`Il file ${DB_PATH} non esiste`);
                throw new Error(`Il file ${DB_PATH} non esiste`);
            }
            
            // Leggi il file Excel esistente
            const workbook = XLSX.readFile(DB_PATH, { cellStyles: true, cellNF: true });
            
            // Verifica che il foglio esista
            if (!workbook.SheetNames.includes(sheetName)) {
                console.error(`Il foglio ${sheetName} non esiste nel file Excel`);
                // Se il foglio non esiste, crealo
                workbook.SheetNames.push(sheetName);
                workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet([]);
            }
            
            const worksheet = workbook.Sheets[sheetName];
            
            // Converti i dati in un foglio Excel
            const newWorksheet = XLSX.utils.json_to_sheet(data);
            
            // Preserva le proprietà del foglio originale
            if (worksheet) {
                // Mantieni le proprietà di formattazione del foglio
                if (worksheet['!cols']) newWorksheet['!cols'] = worksheet['!cols'];
                if (worksheet['!rows']) newWorksheet['!rows'] = worksheet['!rows'];
                if (worksheet['!merges']) newWorksheet['!merges'] = worksheet['!merges'];
                if (worksheet['!protect']) newWorksheet['!protect'] = worksheet['!protect'];
                if (worksheet['!autofilter']) newWorksheet['!autofilter'] = worksheet['!autofilter'];
                if (worksheet['!margins']) newWorksheet['!margins'] = worksheet['!margins'];
                if (worksheet['!outline']) newWorksheet['!outline'] = worksheet['!outline'];
                if (worksheet['!images']) newWorksheet['!images'] = worksheet['!images'];
                if (worksheet['!drawing']) newWorksheet['!drawing'] = worksheet['!drawing'];
            }
            
            // Aggiorna il foglio nel workbook
            workbook.Sheets[sheetName] = newWorksheet;
            
            // Scrivi il file Excel
            XLSX.writeFile(workbook, DB_PATH);
            
            console.log(`Scrittura nel foglio ${sheetName} completata con successo`);
            return true;
        } catch (error) {
            attempts++;
            console.error(`Tentativo ${attempts}/${maxAttempts} fallito: ${error.message}`);
            
            if (attempts < maxAttempts) {
                console.log(`Riprovo tra ${retryDelay}ms...`);
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(attemptWrite());
                    }, retryDelay);
                });
            } else {
                console.error(`Errore nella scrittura del foglio ${sheetName} dopo ${maxAttempts} tentativi:`, error);
                throw error;
            }
        }
    };
    
    return attemptWrite();
}

/**
 * Verifica le credenziali dell'utente
 * @param {string} username - Nome utente
 * @param {string} password - Password
 * @returns {object} - Risposta con i dati dell'utente
 */
async function verificaCredenziali(username, password) {
    try {
        const workbook = XLSX.readFile(DB_PATH);
        const sheetName = SHEETS.PERSONALE;
        const worksheet = workbook.Sheets[sheetName];
        const users = XLSX.utils.sheet_to_json(worksheet);

        console.log("Utenti trovati nel foglio Excel:", users);

        const foundUser = users.find(user => {
            // Ensure both username and password from Excel are treated as strings and trimmed
            const excelUsername = String(user.Username).trim();
            const excelPassword = String(user.Password).trim();

            // Ensure input username and password are treated as strings and trimmed
            const inputUsername = String(username).trim();
            const inputPassword = String(password).trim();

            console.log(`Confronto: ${excelUsername} === ${inputUsername} && ${excelPassword} === ${inputPassword}`);
            return excelUsername === inputUsername && excelPassword === inputPassword;
        });

        if (foundUser) {
            console.log("Utente trovato:", foundUser);
            return {
                success: true,
                message: 'Autenticazione riuscita',
                nome: foundUser.Nome || foundUser.Username,
                ruolo: foundUser.Ruolo || 'utente'
            };
        } else {
            console.log("Nessun utente trovato con le credenziali fornite");
            return {
                success: false,
                message: 'Credenziali non valide'
            };
        }
    } catch (error) {
        console.error('Errore durante la verifica delle credenziali:', error);
        return {
            success: false,
            message: 'Errore durante la verifica delle credenziali: ' + error.message
        };
    }
}

/**
 * Verifica se un utente ha record nella tabella FERIE
 * @param {string} username - Nome utente
 * @returns {object} - Risposta con l'esito della verifica
 */
function checkUserFerie(username) {
    try {
        const ferie = readSheet(SHEETS.FERIE);
        const userData = ferie.find(f => f.Username === username);
        
        return {
            success: true,
            hasFerie: !!userData
        };
    } catch (error) {
        console.error('Errore durante la verifica dei record ferie:', error);
        return {
            success: false,
            message: 'Errore durante la verifica dei record ferie: ' + error.message
        };
    }
}

/**
 * Inizializza i record di ferie per un utente
 * @param {object} values - Oggetto contenente i valori di inizializzazione
 * @param {string} values.username - Nome utente
 * @param {number} values.FerieTotali - Totale ferie
 * @param {number} values.FerieVecchieTotali - Totale ferie vecchie
 * @param {number} values.FestivitaTotali - Totale festività
 * @param {number} values.MotiviFamiliariTotali - Totale motivi familiari
 * @param {number} values.RecuperiTotali - Totale recuperi
 * @returns {object} - Risposta con l'esito dell'inizializzazione
 */
function initializeUserFerie(values) {
    try {
        const ferie = readSheet(SHEETS.FERIE);
        const userData = ferie.find(f => f.Username === values.username);
        
        if (userData) {
            return {
                success: false,
                message: 'L\'utente ha già dei record nella tabella FERIE'
            };
        }

        // Crea un nuovo record con i valori forniti dall'utente
        const newRecord = {
            Username: values.username,
            FerieTotali: values.FerieTotali,
            FerieUtilizzate: 0,
            FerieVecchieTotali: values.FerieVecchieTotali,
            FerieVecchieUtilizzate: 0,
            FestivitaTotali: values.FestivitaTotali,
            FestivitaUtilizzate: 0,
            MotiviFamiliariTotali: values.MotiviFamiliariTotali,
            MotiviFamiliariUtilizzati: 0,
            RecuperiTotali: values.RecuperiTotali,
            RecuperiUtilizzati: 0
        };
        
        ferie.push(newRecord);
        writeSheet(SHEETS.FERIE, ferie);
        
        return {
            success: true,
            message: 'Record ferie inizializzati con successo'
        };
    } catch (error) {
        console.error('Errore durante l\'inizializzazione dei record ferie:', error);
        return {
            success: false,
            message: 'Errore durante l\'inizializzazione dei record ferie: ' + error.message
        };
    }
}

/**
 * Ottiene le richieste pendenti per un utente
 * @param {string} username - Nome utente
 * @returns {object} - Risposta con le richieste pendenti
 */
function getRichiestePendenti(username) {
    try {
        const richieste = readSheet(SHEETS.RICHIESTE);
        const richiestePendenti = richieste.filter(r => {
            const stato = (r.Stato || '').toUpperCase().trim();
            return r.Username === username && stato === 'IN ATTESA';
        });

        return {
            success: true,
            requests: richiestePendenti
        };
    } catch (error) {
        console.error('Errore durante il recupero delle richieste pendenti:', error);
        return {
            success: false,
            message: 'Errore durante il recupero delle richieste pendenti: ' + error.message
        };
    }
}

/**
 * Ottiene i dati dell'utente (riepilogo ferie)
 * @param {string} username - Nome utente
 * @returns {object} - Risposta con i dati dell'utente
 */
function getDatiUtente(username) {
    try {
        const ferie = readSheet(SHEETS.FERIE);
        const richieste = readSheet(SHEETS.RICHIESTE);
        const utenti = readSheet(SHEETS.PERSONALE);
        const datiPersonali = utenti.find(u => u.Username === username);
        let userData = ferie.find(f => f.Username === username);
        
        // Calcola i giorni utilizzati dalle richieste approvate
        const richiesteApprovate = richieste.filter(r => {
            const stato = (r.Stato || '').toUpperCase().trim();
            return r.Username === username && (stato === 'APPROVATA' || stato === 'APPROVATO');
        });
        
        // Aggiorna i conteggi in base alle richieste approvate
        richiesteApprovate.forEach(richiesta => {
            const giorni = parseFloat(richiesta.Giorni) || 0;
            switch(richiesta.Tipo) {
                case 'FERIE':
                    userData.FerieUtilizzate = (parseFloat(userData.FerieUtilizzate) || 0) + giorni;
                    break;
                case 'FERIE VECCHIE':
                    userData.FerieVecchieUtilizzate = (parseFloat(userData.FerieVecchieUtilizzate) || 0) + giorni;
                    break;
                case 'FESTIVITA\' SOPPRESSE':
                    userData.FestivitaUtilizzate = (parseFloat(userData.FestivitaUtilizzate) || 0) + giorni;
                    break;
                case 'MOTIVI FAMILIARI':
                    userData.MotiviFamiliariUtilizzati = (parseFloat(userData.MotiviFamiliariUtilizzati) || 0) + giorni;
                    break;
                case 'RECUPERI':
                    userData.RecuperiUtilizzati = (parseFloat(userData.RecuperiUtilizzati) || 0) + giorni;
                    break;
            }
        });
        
        // Se l'utente non esiste, crea un nuovo record
        if (!userData) {
            console.log(`Utente ${username} non trovato nel foglio ferie. Creazione nuovo record...`);
            const nuovoUtente = {
                Username: username,
                FerieTotali: 28, // Valore predefinito per le ferie totali
                FerieUtilizzate: 0,
                FerieVecchieTotali: 0,
                FerieVecchieUtilizzate: 0,
                FestivitaTotali: 4, // Valore predefinito per le festività soppresse
                FestivitaUtilizzate: 0,
                MotiviFamiliariTotali: 3, // Valore predefinito per i motivi familiari
                MotiviFamiliariUtilizzati: 0,
                RecuperiTotali: 0,
                RecuperiUtilizzati: 0
            };
            
            ferie.push(nuovoUtente);
            writeSheet(SHEETS.FERIE, ferie);
            userData = nuovoUtente;
        }
        
        return {
            success: true,
            message: 'Dati utente recuperati',
            data: {
                FerieTotali: userData.FerieTotali || 0,
                FerieUtilizzate: userData.FerieUtilizzate || 0,
                FerieVecchieTotali: userData.FerieVecchieTotali || 0,
                FerieVecchieUtilizzate: userData.FerieVecchieUtilizzate || 0,
                FestivitaTotali: userData.FestivitaTotali || 0,
                FestivitaUtilizzate: userData.FestivitaUtilizzate || 0,
                MotiviFamiliariTotali: userData.MotiviFamiliariTotali || 0,
                MotiviFamiliariUtilizzati: userData.MotiviFamiliariUtilizzati || 0,
                RecuperiTotali: userData.RecuperiTotali || 0,
                RecuperiUtilizzati: userData.RecuperiUtilizzati || 0
            },
            user: {
                nome: datiPersonali ? datiPersonali.Nome : username,
                username: username,
                ruolo: datiPersonali ? datiPersonali.Ruolo : 'utente'
            }
        };
    } catch (error) {
        return {
            success: false,
            message: 'Errore durante il recupero dei dati utente: ' + error.message
        };
    }
}

/**
 * Ottiene le richieste dell'utente
 * @param {string} username - Nome utente
 * @returns {object} - Risposta con le richieste dell'utente
 */
function getRichieste(username) {
    try {
        const richieste = readSheet(SHEETS.RICHIESTE);
        const userRequests = richieste
            .filter(r => r.Username.toLowerCase() === username.toLowerCase())
            .map(r => ({
                id: r.ID,
                tipo: r.Tipo,
                dataInizio: r.DataInizio,
                dataFine: r.DataFine,
                giorni: r.Giorni,
                stato: r.Stato,
                note: r.Note || '',
                username: r.Username,
                dataRichiesta: r.DataRichiesta,
                dataApprovazione: r.DataApprovazione || '',
                approvataDa: r.ApprovataDa || '',
                noteApprovazione: r.NoteApprovazione || ''
            }));
        
        return {
            success: true,
            message: 'Richieste recuperate con successo',
            richieste: userRequests
        };
    } catch (error) {
        console.error('Errore nel recupero delle richieste:', error);
        return {
            success: false,
            message: 'Errore durante il recupero delle richieste: ' + error.message,
            richieste: []
        };
    }
}

/**
 * Invia una nuova richiesta
 * @param {object} richiesta - Dati della richiesta
 * @returns {object|Promise} - Risposta con l'esito dell'operazione o Promise
 */
function inviaRichiesta(richiesta) {
    try {
        const richieste = readSheet(SHEETS.RICHIESTE);
        
        // Gestione sicura della generazione del nuovo ID
        let maxId = 0;
        richieste.forEach(r => {
            const id = parseInt(r.ID);
            if (!isNaN(id) && id > maxId) {
                maxId = id;
            }
        });
        const newId = maxId + 1;
        
        // Formatta i dati della richiesta per il foglio Excel
        const nuovaRichiesta = {
            ID: newId,
            Username: richiesta.username,
            Tipo: richiesta.tipo,
            DataInizio: richiesta.dataInizio,
            DataFine: richiesta.dataFine,
            Giorni: richiesta.giorni,
            Note: richiesta.note || "",
            Stato: "IN ATTESA",
            DataRichiesta: new Date().toISOString().split('T')[0],
            DataApprovazione: "",
            ApprovataDa: "",
            NoteApprovazione: ""
        };
        
        richieste.push(nuovaRichiesta);
        const writeResult = writeSheet(SHEETS.RICHIESTE, richieste);
        
        // Non aggiorniamo più il foglio FERIE qui, lo faremo solo quando la richiesta viene approvata
        if (writeResult instanceof Promise) {
            return writeResult.then(() => {
                return {
                    success: true,
                    message: 'Richiesta inviata con successo',
                    data: nuovaRichiesta
                };
            }).catch(error => {
                return {
                    success: false,
                    message: 'Errore durante l\'invio della richiesta: ' + error.message
                };
            });
        }
        
        return {
            success: true,
            message: 'Richiesta inviata con successo',
            data: nuovaRichiesta
        };
    } catch (error) {
        return {
            success: false,
            message: 'Errore durante l\'invio della richiesta: ' + error.message
        };
    }
}

/**
 * Aggiorna il foglio FERIE dopo l'invio di una richiesta
 * @param {object} richiesta - Dati della richiesta
 * @returns {Promise|boolean} - Risultato dell'operazione
 */
function aggiornaFoglio(richiesta) {
    try {
        const ferie = readSheet(SHEETS.FERIE);
        const username = richiesta.username || richiesta.Username;
        let userIndex = ferie.findIndex(f => f.Username === username);
        
        // Se l'utente non esiste, crea un nuovo record
        if (userIndex === -1) {
            console.log(`Utente ${username} non trovato nel foglio ferie. Creazione nuovo record...`);
            const nuovoUtente = {
                Username: username,
                FerieTotali: 28, // Valore predefinito per le ferie totali
                FerieUtilizzate: 0,
                FerieVecchieTotali: 0,
                FerieVecchieUtilizzate: 0,
                FestivitaTotali: 4, // Valore predefinito per le festività soppresse
                FestivitaUtilizzate: 0,
                MotiviFamiliariTotali: 3, // Valore predefinito per i motivi familiari
                MotiviFamiliariUtilizzati: 0,
                Recuperi: 0
            };
            
            ferie.push(nuovoUtente);
            userIndex = ferie.length - 1;
        }
        
        // Aggiorna i dati in base al tipo di richiesta SOLO se la richiesta è approvata (gestisce entrambe le varianti)
        const stato = (richiesta.stato || richiesta.Stato || '').toUpperCase().trim();
        if (stato === 'APPROVATA' || stato === 'APPROVATO') {
            const tipo = richiesta.tipo || richiesta.Tipo;
            const giorni = parseFloat(richiesta.giorni || richiesta.Giorni) || 0;
            
            switch(tipo) {
                case 'FERIE':
                    ferie[userIndex].FerieUtilizzate = (parseFloat(ferie[userIndex].FerieUtilizzate) || 0) + giorni;
                    break;
                case 'FERIE VECCHIE':
                    ferie[userIndex].FerieVecchieUtilizzate = (parseFloat(ferie[userIndex].FerieVecchieUtilizzate) || 0) + giorni;
                    break;
                case 'FESTIVITA\' SOPPRESSE':
                    ferie[userIndex].FestivitaUtilizzate = (parseFloat(ferie[userIndex].FestivitaUtilizzate) || 0) + giorni;
                    break;
                case 'MOTIVI FAMILIARI':
                    ferie[userIndex].MotiviFamiliariUtilizzati = (parseFloat(ferie[userIndex].MotiviFamiliariUtilizzati) || 0) + giorni;
                    break;
                case 'RECUPERI':
                    ferie[userIndex].Recuperi = (parseFloat(ferie[userIndex].Recuperi) || 0) - giorni;
                    break;
            }
            
            const writeResult = writeSheet(SHEETS.FERIE, ferie);
            return writeResult;
        }
        
        return true;
    } catch (error) {
        console.error('Errore durante l\'aggiornamento del foglio ferie:', error);
        throw error;
    }
}

/**
 * Modifica una richiesta esistente
 * @param {number} id - ID della richiesta da modificare
 * @param {object} richiesta - Nuovi dati della richiesta
 * @returns {object|Promise} - Risposta con l'esito dell'operazione o Promise
 */
function modificaRichiesta(id, richiesta) {
    try {
        const richieste = readSheet(SHEETS.RICHIESTE);
        const index = richieste.findIndex(r => parseInt(r.ID) === parseInt(id));
        
        if (index === -1) {
            return {
                success: false,
                message: 'Richiesta non trovata'
            };
        }
        
        const richiestaOriginale = {...richieste[index]};
        
        // Se cambiano i giorni o il tipo, ripristina i giorni originali prima di aggiornare
        if ((richiesta.giorni && richiesta.giorni !== richiestaOriginale.Giorni) || 
            (richiesta.tipo && richiesta.tipo !== richiestaOriginale.Tipo)) {
            
            // Ripristina i giorni della richiesta originale
            ripristinaGiorniFerie(richiestaOriginale);
            
            // Poi aggiorna con i nuovi giorni
            if (richiesta.giorni || richiesta.tipo) {
                const nuovaRichiesta = {
                    username: richiesta.username || richiestaOriginale.Username,
                    tipo: richiesta.tipo || richiestaOriginale.Tipo,
                    giorni: richiesta.giorni || richiestaOriginale.Giorni
                };
                aggiornaFoglio(nuovaRichiesta);
            }
        }
        
        // Invece di usare lo spread operator che può causare problemi con i nomi dei campi,
        // mappiamo esplicitamente i campi con i nomi corretti
        if (richiesta.username) richieste[index].Username = richiesta.username;
        if (richiesta.tipo) richieste[index].Tipo = richiesta.tipo;
        if (richiesta.dataInizio) richieste[index].DataInizio = richiesta.dataInizio;
        if (richiesta.dataFine) richieste[index].DataFine = richiesta.dataFine;
        if (richiesta.giorni) richieste[index].Giorni = richiesta.giorni;
        if (richiesta.note !== undefined) richieste[index].Note = richiesta.note;
        if (richiesta.stato) richieste[index].Stato = richiesta.stato;
        if (richiesta.dataRichiesta) richieste[index].DataRichiesta = richiesta.dataRichiesta;
        if (richiesta.dataApprovazione) richieste[index].DataApprovazione = richiesta.dataApprovazione;
        if (richiesta.approvataDa) richieste[index].ApprovataDa = richiesta.approvataDa;
        if (richiesta.noteApprovazione !== undefined) richieste[index].NoteApprovazione = richiesta.noteApprovazione;
        
        const writeResult = writeSheet(SHEETS.RICHIESTE, richieste);
        
        // Se writeSheet ha restituito una Promise, gestiamo il risultato asincrono
        if (writeResult instanceof Promise) {
            return writeResult.then(() => {
                return {
                    success: true,
                    message: 'Richiesta modificata con successo',
                    data: richieste[index]
                };
            }).catch(error => {
                return {
                    success: false,
                    message: 'Errore durante la modifica della richiesta: ' + error.message
                };
            });
        }
        
        // Altrimenti restituiamo direttamente il risultato
        return {
            success: true,
            message: 'Richiesta modificata con successo',
            data: richieste[index]
        };
    } catch (error) {
        return {
            success: false,
            message: 'Errore durante la modifica della richiesta: ' + error.message
        };
    }
}

/**
 * Elimina una richiesta
 * @param {number} id - ID della richiesta da eliminare
 * @returns {object|Promise} - Risposta con l'esito dell'operazione o Promise
 */
function eliminaRichiesta(id) {
    try {
        if (!id || isNaN(parseInt(id))) {
            return {
                success: false,
                message: 'ID richiesta non valido'
            };
        }

        const richieste = readSheet(SHEETS.RICHIESTE);
        const index = richieste.findIndex(r => parseInt(r.ID) === parseInt(id));
        
        if (index === -1) {
            return {
                success: false,
                message: 'Richiesta non trovata'
            };
        }
        
        const richiestaEliminata = richieste[index];

        // Ripristina i giorni di ferie solo per le richieste approvate (gestisce entrambe le varianti)
        const statoRichiesta = richiestaEliminata.Stato.toUpperCase().trim();
        if (statoRichiesta === 'APPROVATA' || statoRichiesta === 'APPROVATO') {
            ripristinaGiorniFerie(richiestaEliminata);
        }

        richieste.splice(index, 1);
        
        const writeResult = writeSheet(SHEETS.RICHIESTE, richieste);
        
        if (writeResult instanceof Promise) {
            return writeResult.then(() => ({
                success: true,
                message: 'Richiesta eliminata con successo',
                data: richiestaEliminata
            })).catch(error => ({
                success: false,
                message: 'Errore durante l\'eliminazione della richiesta: ' + error.message
            }));
        }
        
        return {
            success: true,
            message: 'Richiesta eliminata con successo',
            data: richiestaEliminata
        };
    } catch (error) {
        console.error('Errore durante l\'eliminazione della richiesta:', error);
        return {
            success: false,
            message: 'Errore durante l\'eliminazione della richiesta: ' + error.message
        };
    }
}

/**
 * Approva o rifiuta una richiesta
 * @param {number} id - ID della richiesta da approvare/rifiutare
 * @param {object} approvazione - Dati dell'approvazione (stato, username, note)
 * @returns {object|Promise} - Risposta con l'esito dell'operazione o Promise
 */
function approvaRichiesta(id, approvazione) {
    try {
        const richieste = readSheet(SHEETS.RICHIESTE);
        const index = richieste.findIndex(r => parseInt(r.ID) === parseInt(id));
        
        if (index === -1) {
            return {
                success: false,
                message: 'Richiesta non trovata'
            };
        }
        
        const richiestaOriginale = {...richieste[index]};
        const statoOriginale = richiestaOriginale.Stato;
        
        // Aggiorna lo stato della richiesta
        richieste[index] = {
            ...richieste[index],
            Stato: approvazione.stato,
            DataApprovazione: new Date().toISOString().split('T')[0],
            ApprovataDa: approvazione.username,
            NoteApprovazione: approvazione.note || ''
        };
        
        // Normalizza gli stati per il confronto
        const statoOrigNorm = statoOriginale.toUpperCase().trim();
        const nuovoStatoNorm = approvazione.stato.toUpperCase().trim();
        
        // Se lo stato cambia da non approvato ad approvato, aggiorna il foglio FERIE
        if ((statoOrigNorm !== 'APPROVATA' && statoOrigNorm !== 'APPROVATO') && 
            (nuovoStatoNorm === 'APPROVATA' || nuovoStatoNorm === 'APPROVATO')) {
            aggiornaFoglio(richieste[index]);
        }
        // Se lo stato cambia da approvato a rifiutato, ripristina i giorni
        else if ((statoOrigNorm === 'APPROVATA' || statoOrigNorm === 'APPROVATO') && 
                 (nuovoStatoNorm === 'RIFIUTATA' || nuovoStatoNorm === 'RIFIUTATO')) {
            ripristinaGiorniFerie(richiestaOriginale);
        }
        
        const writeResult = writeSheet(SHEETS.RICHIESTE, richieste);
        
        // Se writeSheet ha restituito una Promise, gestiamo il risultato asincrono
        if (writeResult instanceof Promise) {
            return writeResult.then(() => {
                return {
                    success: true,
                    message: `Richiesta ${approvazione.stato.toLowerCase()} con successo`,
                    data: richieste[index]
                };
            }).catch(error => {
                return {
                    success: false,
                    message: 'Errore durante l\'approvazione della richiesta: ' + error.message
                };
            });
        }
        
        // Altrimenti restituiamo direttamente il risultato
        return {
            success: true,
            message: `Richiesta ${approvazione.stato.toLowerCase()} con successo`,
            data: richieste[index]
        };
    } catch (error) {
        return {
            success: false,
            message: 'Errore durante l\'approvazione della richiesta: ' + error.message
        };
    }
}

/**
 * Ripristina i giorni di ferie quando una richiesta viene eliminata o modificata
 * @param {object} richiesta - Dati della richiesta da ripristinare
 * @param {number} giorni - Giorni da ripristinare (se diverso da richiesta.giorni)
 * @returns {Promise|boolean} - Risultato dell'operazione
 */
function ripristinaGiorniFerie(richiesta, giorni = null) {
    try {
        const giorniDaRipristinare = giorni !== null ? giorni : richiesta.giorni || richiesta.Giorni;
        if (!giorniDaRipristinare || isNaN(parseFloat(giorniDaRipristinare)) || parseFloat(giorniDaRipristinare) <= 0) {
            console.log('Nessun giorno da ripristinare o valore non valido');
            return true;
        }
        
        const ferie = readSheet(SHEETS.FERIE);
        const username = richiesta.username || richiesta.Username;
        const tipo = richiesta.tipo || richiesta.Tipo;
        
        const userIndex = ferie.findIndex(f => f.Username === username);
        
        if (userIndex === -1) {
            console.error(`Utente ${username} non trovato nel foglio ferie`);
            return false;
        }
        
        // Ripristina i giorni in base al tipo di richiesta
        switch(tipo) {
            case 'FERIE':
                ferie[userIndex].FerieUtilizzate = Math.max(0, (parseFloat(ferie[userIndex].FerieUtilizzate) || 0) - parseFloat(giorniDaRipristinare));
                break;
            case 'FERIE VECCHIE':
                ferie[userIndex].FerieVecchieUtilizzate = Math.max(0, (parseFloat(ferie[userIndex].FerieVecchieUtilizzate) || 0) - parseFloat(giorniDaRipristinare));
                break;
            case 'FESTIVITA\' SOPPRESSE':
                ferie[userIndex].FestivitaUtilizzate = Math.max(0, (parseFloat(ferie[userIndex].FestivitaUtilizzate) || 0) - parseFloat(giorniDaRipristinare));
                break;
            case 'MOTIVI FAMILIARI':
                ferie[userIndex].MotiviFamiliariUtilizzati = Math.max(0, (parseFloat(ferie[userIndex].MotiviFamiliariUtilizzati) || 0) - parseFloat(giorniDaRipristinare));
                break;
            case 'RECUPERI':
                ferie[userIndex].Recuperi = (parseFloat(ferie[userIndex].Recuperi) || 0) + parseFloat(giorniDaRipristinare);
                break;
        }
        
        const writeResult = writeSheet(SHEETS.FERIE, ferie);
        return writeResult;
    } catch (error) {
        console.error('Errore durante il ripristino dei giorni di ferie:', error);
        throw error;
    }
}

/**
 * Ottiene l'elenco di tutti gli utenti (solo per SUPERUSER)
 * @returns {object} - Risposta con l'elenco degli utenti
 */
function getAllUsers() {
    try {
        // Leggi i dati degli utenti dal foglio PERSONALE
        const users = readSheet(SHEETS.PERSONALE);
        
        // Leggi i dati delle ferie dal foglio FERIE
        const ferie = readSheet(SHEETS.FERIE);
        
        // Combina i dati degli utenti con i dati delle ferie
        const usersWithFerie = users.map(user => {
            const userFerie = ferie.find(f => f.Username === user.Username) || {};
            return { ...user, ...userFerie };
        });
        
        return {
            success: true,
            message: 'Utenti recuperati con successo',
            users: usersWithFerie
        };
    } catch (error) {
        console.error('Errore nel recupero degli utenti:', error);
        return {
            success: false,
            message: 'Errore durante il recupero degli utenti: ' + error.message,
            users: []
        };
    }
}

/**
 * Aggiorna i totali delle ferie per un utente
 * @param {object} totals - Oggetto contenente i nuovi totali
 * @returns {object} - Risposta con l'esito dell'operazione
 */
function aggiornaTotali(totals) {
    try {
        if (!totals || !totals.username) {
            return {
                success: false,
                message: 'Dati utente non validi'
            };
        }

        const ferie = readSheet(SHEETS.FERIE);
        const userIndex = ferie.findIndex(f => f.Username === totals.username);

        if (userIndex === -1) {
            return {
                success: false,
                message: 'Utente non trovato nel foglio FERIE'
            };
        }

        // Aggiorna i totali mantenendo i valori utilizzati
        ferie[userIndex] = {
            ...ferie[userIndex],
            FerieTotali: totals.FerieTotali,
            FerieVecchieTotali: totals.FerieVecchieTotali,
            FestivitaTotali: totals.FestivitaTotali,
            MotiviFamiliariTotali: totals.MotiviFamiliariTotali,
            RecuperiTotali: totals.RecuperiTotali
        };

        const writeResult = writeSheet(SHEETS.FERIE, ferie);

        if (writeResult instanceof Promise) {
            return writeResult.then(() => ({
                success: true,
                message: 'Totali aggiornati con successo'
            })).catch(error => ({
                success: false,
                message: 'Errore durante l\'aggiornamento dei totali: ' + error.message
            }));
        }

        return {
            success: true,
            message: 'Totali aggiornati con successo'
        };
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dei totali:', error);
        return {
            success: false,
            message: 'Errore durante l\'aggiornamento dei totali: ' + error.message
        };
    }
}

/**
 * Crea un nuovo utente
 * @param {object} userData - Dati dell'utente da creare
 * @returns {object} - Risposta con l'esito dell'operazione
 */
function createUser(userData) {
    try {
        // Validazione dei dati obbligatori
        if (!userData.Username || !userData.Nome || !userData.Password) {
            return {
                success: false,
                message: 'Username, Nome e Password sono campi obbligatori'
            };
        }

        // Leggi gli utenti esistenti
        const users = readSheet(SHEETS.PERSONALE);
        
        // Verifica che lo username non sia già in uso
        if (users.some(user => user.Username === userData.Username)) {
            return {
                success: false,
                message: 'Username già in uso'
            };
        }
        
        // Aggiungi il nuovo utente
        users.push(userData);
        
        // Scrivi i dati aggiornati
        const writeResult = writeSheet(SHEETS.PERSONALE, users);
        
        if (writeResult instanceof Promise) {
            return writeResult.then(() => ({
                success: true,
                message: 'Utente creato con successo',
                user: userData
            })).catch(error => ({
                success: false,
                message: 'Errore durante la creazione dell\'utente: ' + error.message
            }));
        }
        
        return {
            success: true,
            message: 'Utente creato con successo',
            user: userData
        };
    } catch (error) {
        console.error('Errore durante la creazione dell\'utente:', error);
        return {
            success: false,
            message: 'Errore durante la creazione dell\'utente: ' + error.message
        };
    }
}

/**
 * Aggiorna i dati di un utente esistente
 * @param {string} userId - Username dell'utente da aggiornare
 * @param {object} userData - Nuovi dati dell'utente
 * @returns {object} - Risposta con l'esito dell'operazione
 */
function updateUser(userId, userData) {
    try {
        // Validazione dei dati obbligatori
        if (!userId || !userData.Username || !userData.Nome) {
            return {
                success: false,
                message: 'Username e Nome sono campi obbligatori'
            };
        }
        
        // Leggi gli utenti esistenti
        const users = readSheet(SHEETS.PERSONALE);
        
        // Trova l'indice dell'utente da aggiornare
        const userIndex = users.findIndex(user => user.Username === userId);
        
        if (userIndex === -1) {
            return {
                success: false,
                message: 'Utente non trovato'
            };
        }
        
        // Verifica che il nuovo username non sia già in uso (se è stato cambiato)
        if (userData.Username !== userId && users.some(user => user.Username === userData.Username)) {
            return {
                success: false,
                message: 'Il nuovo username è già in uso'
            };
        }
        
        // Se la password non è specificata, mantieni quella esistente
        if (!userData.Password) {
            userData.Password = users[userIndex].Password;
        }
        
        // Aggiorna i dati dell'utente
        users[userIndex] = userData;
        
        // Scrivi i dati aggiornati nel foglio PERSONALE
        let writeResult = writeSheet(SHEETS.PERSONALE, users);
        
        // Se lo username è stato modificato, aggiorna anche i fogli RICHIESTE e FERIE
        if (userData.Username !== userId) {
            console.log(`Aggiornamento username da ${userId} a ${userData.Username} nei fogli RICHIESTE e FERIE`);
            
            // Aggiorna il foglio RICHIESTE
            try {
                const richieste = readSheet(SHEETS.RICHIESTE);
                let richiesteModificate = false;
                
                // Aggiorna lo username in tutte le richieste dell'utente
                richieste.forEach(richiesta => {
                    if (richiesta.Username === userId) {
                        richiesta.Username = userData.Username;
                        richiesteModificate = true;
                    }
                });
                
                // Salva le modifiche solo se ci sono state modifiche
                if (richiesteModificate) {
                    const richiesteResult = writeSheet(SHEETS.RICHIESTE, richieste);
                    if (richiesteResult instanceof Promise) {
                        writeResult = Promise.all([writeResult, richiesteResult]);
                    }
                }
            } catch (error) {
                console.error('Errore durante l\'aggiornamento dello username nel foglio RICHIESTE:', error);
            }
            
            // Aggiorna il foglio FERIE
            try {
                const ferie = readSheet(SHEETS.FERIE);
                let ferieModificate = false;
                
                // Aggiorna lo username nei record delle ferie dell'utente
                ferie.forEach(record => {
                    if (record.Username === userId) {
                        record.Username = userData.Username;
                        ferieModificate = true;
                    }
                });
                
                // Salva le modifiche solo se ci sono state modifiche
                if (ferieModificate) {
                    const ferieResult = writeSheet(SHEETS.FERIE, ferie);
                    if (ferieResult instanceof Promise) {
                        writeResult = Promise.all([writeResult, ferieResult]);
                    }
                }
            } catch (error) {
                console.error('Errore durante l\'aggiornamento dello username nel foglio FERIE:', error);
            }
        }
        
        if (writeResult instanceof Promise) {
            return writeResult.then(() => ({
                success: true,
                message: 'Utente aggiornato con successo',
                user: userData
            })).catch(error => ({
                success: false,
                message: 'Errore durante l\'aggiornamento dell\'utente: ' + error.message
            }));
        }
        
        return {
            success: true,
            message: 'Utente aggiornato con successo',
            user: userData
        };
    } catch (error) {
        console.error('Errore durante l\'aggiornamento dell\'utente:', error);
        return {
            success: false,
            message: 'Errore durante l\'aggiornamento dell\'utente: ' + error.message
        };
    }
}

/**
 * Elimina un utente
 * @param {string} userId - Username dell'utente da eliminare
 * @returns {object} - Risposta con l'esito dell'operazione
 */
function deleteUser(userId) {
    try {
        // Leggi gli utenti esistenti
        const users = readSheet(SHEETS.PERSONALE);
        
        // Trova l'indice dell'utente da eliminare
        const userIndex = users.findIndex(user => user.Username === userId);
        
        if (userIndex === -1) {
            return {
                success: false,
                message: 'Utente non trovato'
            };
        }
        
        // Verifica che l'utente non sia un SUPERUSER
        if (users[userIndex].Ruolo === 'SUPERUSER') {
            return {
                success: false,
                message: 'Non è possibile eliminare un utente con ruolo SUPERUSER'
            };
        }
        
        // Rimuovi l'utente
        const deletedUser = users.splice(userIndex, 1)[0];
        
        // Scrivi i dati aggiornati nel foglio PERSONALE
        let writeResult = writeSheet(SHEETS.PERSONALE, users);
        
        // Rimuovi i record associati all'utente nelle tabelle RICHIESTE e FERIE
        console.log(`Rimozione dei record associati all'utente ${userId} nei fogli RICHIESTE e FERIE`);
        
        // Rimuovi le richieste dell'utente
        try {
            const richieste = readSheet(SHEETS.RICHIESTE);
            const richiesteOriginali = richieste.length;
            
            // Filtra le richieste per rimuovere quelle dell'utente eliminato
            const richiesteAggiornate = richieste.filter(richiesta => richiesta.Username !== userId);
            
            // Salva le modifiche solo se ci sono state modifiche
            if (richiesteAggiornate.length < richiesteOriginali) {
                console.log(`Rimosse ${richiesteOriginali - richiesteAggiornate.length} richieste dell'utente ${userId}`);
                const richiesteResult = writeSheet(SHEETS.RICHIESTE, richiesteAggiornate);
                if (richiesteResult instanceof Promise) {
                    writeResult = Promise.all([writeResult, richiesteResult]);
                }
            }
        } catch (error) {
            console.error('Errore durante la rimozione delle richieste dell\'utente:', error);
        }
        
        // Rimuovi i record delle ferie dell'utente
        try {
            const ferie = readSheet(SHEETS.FERIE);
            const ferieOriginali = ferie.length;
            
            // Filtra i record delle ferie per rimuovere quelli dell'utente eliminato
            const ferieAggiornate = ferie.filter(record => record.Username !== userId);
            
            // Salva le modifiche solo se ci sono state modifiche
            if (ferieAggiornate.length < ferieOriginali) {
                console.log(`Rimosso il record delle ferie dell'utente ${userId}`);
                const ferieResult = writeSheet(SHEETS.FERIE, ferieAggiornate);
                if (ferieResult instanceof Promise) {
                    writeResult = Promise.all([writeResult, ferieResult]);
                }
            }
        } catch (error) {
            console.error('Errore durante la rimozione del record delle ferie dell\'utente:', error);
        }
        
        if (writeResult instanceof Promise) {
            return writeResult.then(() => ({
                success: true,
                message: 'Utente eliminato con successo',
                user: deletedUser
            })).catch(error => ({
                success: false,
                message: 'Errore durante l\'eliminazione dell\'utente: ' + error.message
            }));
        }
        
        return {
            success: true,
            message: 'Utente eliminato con successo',
            user: deletedUser
        };
    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'utente:', error);
        return {
            success: false,
            message: 'Errore durante l\'eliminazione dell\'utente: ' + error.message
        };
    }
}

/**
 * Carica le sospensioni didattiche dal database
 * @returns {Array} - Array di sospensioni
 */
function getSospensioni() {
    try {
        const data = readSheet(SHEETS.SOSPENSIONI);
        const sospensioni = data.map(item => ({
            ...item,
            data: item.data ? new Date(item.data) : new Date(),
            tipo: 'sospensione',
            editable: true
        }));
        return { success: true, data: sospensioni };
    } catch (error) {
        console.error('Errore nel caricamento delle sospensioni:', error);
        // Se il foglio non esiste, restituisce array vuoto
        return { success: true, data: [] };
    }
}

/**
 * Salva una sospensione nel database
 * @param {Object} sospensione - Dati della sospensione
 * @returns {Object} - Risultato dell'operazione
 */
function salvaSospensione(sospensione) {
    try {
        let sospensioni = [];
        try {
            sospensioni = readSheet(SHEETS.SOSPENSIONI);
        } catch (error) {
            // Il foglio non esiste ancora, inizializza array vuoto
            console.log('Foglio SOSPENSIONI non esistente, verrà creato');
        }
        
        // Prepara i dati per il salvataggio
        const sospensioneToSave = {
            id: sospensione.id || Date.now().toString(),
            data: sospensione.data instanceof Date ? sospensione.data.toISOString().split('T')[0] : sospensione.data,
            nome: sospensione.nome,
            descrizione: sospensione.descrizione || '',
            tipo: 'sospensione'
        };
        
        // Aggiungi la nuova sospensione
        sospensioni.push(sospensioneToSave);
        
        // Salva nel database
        writeSheet(SHEETS.SOSPENSIONI, sospensioni);
        
        return { success: true, message: 'Sospensione salvata con successo' };
    } catch (error) {
        console.error('Errore nel salvataggio della sospensione:', error);
        return { success: false, message: 'Errore nel salvataggio della sospensione' };
    }
}

/**
 * Modifica una sospensione esistente
 * @param {string} sospensioneId - ID della sospensione da modificare
 * @param {Object} nuoviDati - Nuovi dati della sospensione
 * @returns {Object} - Risultato dell'operazione
 */
function modificaSospensione(sospensioneId, nuoviDati) {
    try {
        const sospensioni = readSheet(SHEETS.SOSPENSIONI);
        const index = sospensioni.findIndex(s => s.id === sospensioneId);
        
        if (index === -1) {
            return { success: false, message: 'Sospensione non trovata' };
        }
        
        // Aggiorna i dati
        sospensioni[index] = {
            ...sospensioni[index],
            data: nuoviDati.data instanceof Date ? nuoviDati.data.toISOString().split('T')[0] : nuoviDati.data,
            nome: nuoviDati.nome,
            descrizione: nuoviDati.descrizione || ''
        };
        
        // Salva nel database
        writeSheet(SHEETS.SOSPENSIONI, sospensioni);
        
        return { success: true, message: 'Sospensione modificata con successo' };
    } catch (error) {
        console.error('Errore nella modifica della sospensione:', error);
        return { success: false, message: 'Errore nella modifica della sospensione' };
    }
}

/**
 * Elimina una sospensione dal database
 * @param {string} sospensioneId - ID della sospensione da eliminare
 * @returns {Object} - Risultato dell'operazione
 */
function eliminaSospensione(sospensioneId) {
    try {
        const sospensioni = readSheet(SHEETS.SOSPENSIONI);
        const index = sospensioni.findIndex(s => s.id === sospensioneId);
        
        if (index === -1) {
            return { success: false, message: 'Sospensione non trovata' };
        }
        
        // Rimuovi la sospensione
        sospensioni.splice(index, 1);
        
        // Salva nel database
        writeSheet(SHEETS.SOSPENSIONI, sospensioni);
        
        return { success: true, message: 'Sospensione eliminata con successo' };
    } catch (error) {
        console.error('Errore nell\'eliminazione della sospensione:', error);
        return { success: false, message: 'Errore nell\'eliminazione della sospensione' };
    }
}

// Importa il modulo per la generazione del file Excel con le ferie esplose
const excelUtilsEsplodi = require('./excel-utils-esplodi');

module.exports = {
    verificaCredenziali,
    getDatiUtente,
    getRichieste,
    inviaRichiesta,
    modificaRichiesta,
    eliminaRichiesta,
    approvaRichiesta,
    getAllUsers,
    checkUserFerie,
    initializeUserFerie,
    aggiornaTotali,
    getRichiestePendenti,
    createUser,
    updateUser,
    deleteUser,
    getSospensioni,
    salvaSospensione,
    modificaSospensione,
    eliminaSospensione,
    esplodiFerie: excelUtilsEsplodi.esplodiFerie
};