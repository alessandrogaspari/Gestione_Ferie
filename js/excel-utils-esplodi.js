/**
 * excel-utils-esplodi.js - Funzioni per la generazione del file Excel con le ferie esplose
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Holidays = require('./holidays');

// Percorso del file Excel
const DB_PATH = path.join(__dirname, '..', 'DB_Ferie.xlsx');

// Nomi dei fogli
const SHEETS = {
    PERSONALE: 'UTENTI',
    FERIE: 'FERIE',
    RICHIESTE: 'RICHIESTE'
};

// Mesi dell'anno scolastico (da Settembre ad Agosto)
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

// Ruoli ordinati per priorità
const RUOLI_ORDINATI = [
    'DSGA',
    'ASSISTENTI AMMINISTRATIVI',
    'ASSISTENTI TECNICI',
    'COLLABORATORI SCOLASTICI'
];

// Mappatura dei tipi di ferie ai suffissi
const SUFFISSI_FERIE = {
    'FERIE': 'F',
    'FERIE VECCHIE': 'FV',
    'FESTIVITA\' SOPPRESSE': 'FS',
    'MOTIVI FAMILIARI': 'MF',
    'RECUPERI': 'R'
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
        return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
        console.error(`Errore nella lettura del foglio ${sheetName}:`, error);
        throw error;
    }
}

/**
 * Genera il file Excel con le ferie esplose
 * @returns {object} - Risposta con l'esito dell'operazione
 */
async function esplodiFerie() {
    try {
        // Ottieni l'anno corrente
        const dataCorrente = new Date();
        const annoCorrente = dataCorrente.getFullYear();
        const meseCorrente = dataCorrente.getMonth() + 1; // I mesi in JavaScript partono da 0
        
        // Determina l'anno scolastico corrente
        // Se siamo tra gennaio e agosto, l'anno scolastico è (annoCorrente-1)/(annoCorrente)
        // Se siamo tra settembre e dicembre, l'anno scolastico è (annoCorrente)/(annoCorrente+1)
        let annoScolasticoInizio, annoScolasticoFine;
        if (meseCorrente >= 9 && meseCorrente <= 12) {
            annoScolasticoInizio = annoCorrente;
            annoScolasticoFine = annoCorrente + 1;
        } else {
            annoScolasticoInizio = annoCorrente - 1;
            annoScolasticoFine = annoCorrente;
        }
        
        // Crea un nuovo workbook
        const workbook = XLSX.utils.book_new();
        
        // Ottieni tutti gli utenti
        const utenti = readSheet(SHEETS.PERSONALE);
        console.log(`Totale utenti letti dal foglio ${SHEETS.PERSONALE}: ${utenti.length}`);
        utenti.forEach((utente, index) => {
            console.log(`Utente ${index + 1}: Nome=${utente.Nome}, Ruolo=${utente.Ruolo}, Username=${utente.Username}`);
        });
        
        // Ottieni tutte le richieste approvate
        const richieste = readSheet(SHEETS.RICHIESTE).filter(r => 
            r.Stato.toUpperCase().trim() === 'APPROVATA' || 
            r.Stato.toUpperCase().trim() === 'APPROVATO'
        );
        
        // Debug specifico per usr1
        console.log('=== DEBUG USR1 ===');
        const richiesteUsr1 = richieste.filter(r => r.Username === 'usr1');
        console.log(`Richieste approvate per usr1: ${richiesteUsr1.length}`);
        richiesteUsr1.forEach((richiesta, index) => {
            console.log(`Richiesta ${index + 1}: Tipo=${richiesta.Tipo}, DataInizio=${richiesta.DataInizio}, DataFine=${richiesta.DataFine}, Stato=${richiesta.Stato}`);
        });
        console.log('=== FINE DEBUG USR1 ===');
        
        // Raggruppa gli utenti per ruolo
        const utentiPerRuolo = {};
        RUOLI_ORDINATI.forEach(ruolo => {
            utentiPerRuolo[ruolo] = [];
        });
        
        // Aggiungi gli utenti ai rispettivi gruppi di ruolo
        utenti.forEach(utente => {
            const ruolo = utente.Ruolo;
            console.log(`Processando utente: ${utente.Nome}, Ruolo: ${ruolo}`);
            if (ruolo === 'DSGA') {
                utentiPerRuolo['DSGA'].push(utente);
            } else if (ruolo === 'ASSISTENTI AMMINISTRATIVI') {
                utentiPerRuolo['ASSISTENTI AMMINISTRATIVI'].push(utente);
            } else if (ruolo === 'ASSISTENTI TECNICI') {
                utentiPerRuolo['ASSISTENTI TECNICI'].push(utente);
            } else if (ruolo === 'COLLABORATORI SCOLASTICI') {
                utentiPerRuolo['COLLABORATORI SCOLASTICI'].push(utente);
            } else {
                console.warn(`Ruolo non riconosciuto per utente ${utente.Nome}: ${ruolo}`);
            }
        });
        
        // Debug: stampa il numero di utenti per ruolo
        Object.keys(utentiPerRuolo).forEach(ruolo => {
            console.log(`Ruolo ${ruolo}: ${utentiPerRuolo[ruolo].length} utenti`);
            utentiPerRuolo[ruolo].forEach(utente => {
                console.log(`  - ${utente.Nome}`);
            });
        });
        
        // Ordina gli utenti all'interno di ciascun gruppo per cognome e nome
        Object.keys(utentiPerRuolo).forEach(ruolo => {
            utentiPerRuolo[ruolo].sort((a, b) => {
                const nomeA = a.Nome.toUpperCase();
                const nomeB = b.Nome.toUpperCase();
                return nomeA.localeCompare(nomeB);
            });
        });
        
        // Per ogni mese dell'anno scolastico, crea un foglio
        for (const mese of MESI_ANNO_SCOLASTICO) {
            // Determina l'anno del mese corrente nell'anno scolastico
            const annoMese = mese.numero >= 9 ? annoScolasticoInizio : annoScolasticoFine;
            
            // Processando mese corrente
            
            // Ottieni il numero di giorni nel mese
            const giorniNelMese = new Date(annoMese, mese.numero, 0).getDate();
            
            // Crea un nuovo foglio per il mese
            const worksheet = XLSX.utils.aoa_to_sheet([]);
            
            // Imposta le proprietà del foglio
            worksheet['!cols'] = [{ wch: 30 }, { wch: 5 }]; // Larghezza delle colonne
            
            // Aggiungi l'intestazione del foglio
            const intestazione = [`PROSPETTO FERIE ANNO ${annoScolasticoInizio}-${annoScolasticoFine} - PERSONALE ATA`];
            XLSX.utils.sheet_add_aoa(worksheet, [intestazione], { origin: 'A1' });
            
            // Aggiungi il nome del mese
            const nomeMese = [`${mese.nome.toLowerCase()}`];
            XLSX.utils.sheet_add_aoa(worksheet, [nomeMese], { origin: 'A2' });
            
            // Aggiungi l'anno del mese
            const annoMeseArray = [`${annoMese}`];
            XLSX.utils.sheet_add_aoa(worksheet, [annoMeseArray], { origin: 'B2' });
            
            // Crea l'intestazione delle colonne con i giorni del mese (escluse le domeniche)
            const intestazioneGiorni = ['', '']; // A=nome, B=contratto
            const intestazioneGiorniSettimana = ['', '']; // A=nome, B=contratto
            const giorniSettimana = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
            
            for (let giorno = 1; giorno <= giorniNelMese; giorno++) {
                const dataGiorno = new Date(annoMese, mese.numero - 1, giorno);
                // Salta le domeniche anche nell'intestazione
                if (dataGiorno.getDay() !== 0) {
                    intestazioneGiorni.push(giorno.toString().padStart(2, '0'));
                    intestazioneGiorniSettimana.push(giorniSettimana[dataGiorno.getDay()]);
                }
            }
            XLSX.utils.sheet_add_aoa(worksheet, [intestazioneGiorni], { origin: 'A3' });
            XLSX.utils.sheet_add_aoa(worksheet, [intestazioneGiorniSettimana], { origin: 'A4' });
            
            // Funzione per applicare i bordi alle celle
            const applicaBordi = (cellRef, backgroundColor = null) => {
                if (!worksheet[cellRef]) worksheet[cellRef] = { v: '' };
                if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
                
                // Applica i bordi
                worksheet[cellRef].s.border = {
                    top: { style: 'thin', color: { rgb: 'FF000000' } },
                    bottom: { style: 'thin', color: { rgb: 'FF000000' } },
                    left: { style: 'thin', color: { rgb: 'FF000000' } },
                    right: { style: 'thin', color: { rgb: 'FF000000' } }
                };
                
                // Applica il colore di sfondo se specificato
                if (backgroundColor) {
                    worksheet[cellRef].s.fill = {
                        fgColor: { rgb: backgroundColor }
                    };
                }
            };
            
            // Applica i bordi alle intestazioni dei giorni (riga 3 e 4)
            for (let col = 0; col < intestazioneGiorni.length; col++) {
                const colLetter = col <= 25 ? String.fromCharCode(65 + col) : 
                                 String.fromCharCode(65 + Math.floor(col / 26) - 1) + String.fromCharCode(65 + (col % 26));
                
                // Applica bordi alla riga 3 (numeri giorni)
                applicaBordi(`${colLetter}3`);
                
                // Applica bordi alla riga 4 (giorni settimana) e colore rosso per i sabati
                if (col >= 2) { // Solo per le colonne dei giorni (escluse A e B)
                    const giornoIndex = col - 2;
                    let giornoCorrente = 1;
                    let giornoTrovato = 0;
                    
                    // Trova il giorno corrispondente alla colonna
                    for (let g = 1; g <= giorniNelMese; g++) {
                        const dataG = new Date(annoMese, mese.numero - 1, g);
                        if (dataG.getDay() !== 0) { // Non domenica
                            if (giornoTrovato === giornoIndex) {
                                giornoCorrente = g;
                                break;
                            }
                            giornoTrovato++;
                        }
                    }
                    
                    const dataGiornoIntestazione = new Date(annoMese, mese.numero - 1, giornoCorrente);
                    const isSabatoIntestazione = dataGiornoIntestazione.getDay() === 6;
                    
                    if (isSabatoIntestazione) {
                        applicaBordi(`${colLetter}4`, 'FFFF0000'); // Rosso per sabati
                    } else {
                        applicaBordi(`${colLetter}4`); // Solo bordi
                    }
                } else {
                    applicaBordi(`${colLetter}4`); // Solo bordi per colonne A e B
                }
            }
            
            // Aggiungi una riga vuota
            XLSX.utils.sheet_add_aoa(worksheet, [['DSGA']], { origin: 'A5' });
            
            // Riga corrente per l'inserimento dei dati
            let rigaCorrente = 6;
            
            // Per ogni ruolo, aggiungi gli utenti
            for (const ruolo of RUOLI_ORDINATI) {
                console.log(`Processando ruolo: ${ruolo} con ${utentiPerRuolo[ruolo].length} utenti`);
                
                // Se non è il primo ruolo, aggiungi l'intestazione del ruolo
                if (ruolo !== 'DSGA') {
                    XLSX.utils.sheet_add_aoa(worksheet, [[ruolo]], { origin: `A${rigaCorrente}` });
                    applicaBordi(`A${rigaCorrente}`);
                    rigaCorrente++;
                }
                
                // Per ogni utente nel ruolo, aggiungi una riga
                for (const utente of utentiPerRuolo[ruolo]) {
                    console.log(`Aggiungendo utente: ${utente.Nome} alla riga ${rigaCorrente}`);
                    
                    // Aggiungi il nome dell'utente
                    XLSX.utils.sheet_add_aoa(worksheet, [[utente.Nome]], { origin: `A${rigaCorrente}` });
                    applicaBordi(`A${rigaCorrente}`);
                    
                    // Aggiungi il tipo di contratto (T.I. o T.D.)
                    const tipoContratto = utente.TipoContratto || 'T.I.';
                    XLSX.utils.sheet_add_aoa(worksheet, [[tipoContratto]], { origin: `B${rigaCorrente}` });
                    applicaBordi(`B${rigaCorrente}`);
                    
                    // Per ogni giorno del mese, verifica se l'utente ha una richiesta approvata
                    let colonnaCorrente = 2; // Inizia dalla colonna C (indice 2)
                    for (let giorno = 1; giorno <= giorniNelMese; giorno++) {
                        const dataGiorno = new Date(annoMese, mese.numero - 1, giorno);
                        
                        // Data del giorno corrente
                        
                        // Verifica se il giorno è una domenica (0 = domenica)
                        if (dataGiorno.getDay() === 0) {
                            // Salta le domeniche
                            continue;
                        }
                        
                        // Colonna corrispondente al giorno (A=nome, B=contratto, C=giorno1, D=giorno2, ...)
                        let colonna;
                        if (colonnaCorrente <= 25) {
                            colonna = String.fromCharCode(65 + colonnaCorrente);
                        } else {
                            // Per colonne oltre Z (AA, AB, AC, ...)
                            const primaLettera = Math.floor((colonnaCorrente - 26) / 26);
                            const secondaLettera = (colonnaCorrente - 26) % 26;
                            colonna = String.fromCharCode(65 + primaLettera) + String.fromCharCode(65 + secondaLettera);
                        }
                        
                        colonnaCorrente++; // Incrementa la colonna per il prossimo giorno non-domenica
                        
                        // Verifica se il giorno è un sabato (6 = sabato) o una festività
                        const isSabato = dataGiorno.getDay() === 6;
                        const isFestivo = Holidays.isFestivo(dataGiorno);
                        
                        // Applica i bordi alla cella del giorno
                        const cellRef = `${colonna}${rigaCorrente}`;
                        
                        // Se è un sabato o una festività, applica bordi e colore rosso
                        if (isSabato || isFestivo) {
                            applicaBordi(cellRef, 'FFFF0000'); // Rosso
                        } else {
                            applicaBordi(cellRef); // Solo bordi
                        }
                        
                        // Verifica se l'utente ha una richiesta approvata per questo giorno
                        let suffissiGiorno = [];
                        for (const richiesta of richieste) {
                            if (richiesta.Username === utente.Username) {
                                // Normalizza tutte le date a mezzanotte UTC per confronto corretto
                                const dataInizio = new Date(richiesta.DataInizio);
                                const dataFine = new Date(richiesta.DataFine);
                                
                                // Crea date normalizzate a mezzanotte UTC per confronto
                                const dataGiornoNorm = new Date(Date.UTC(dataGiorno.getFullYear(), dataGiorno.getMonth(), dataGiorno.getDate()));
                                const dataInizioNorm = new Date(Date.UTC(dataInizio.getFullYear(), dataInizio.getMonth(), dataInizio.getDate()));
                                const dataFineNorm = new Date(Date.UTC(dataFine.getFullYear(), dataFine.getMonth(), dataFine.getDate()));
                                
                                // Confronto delle date normalizzate
                                
                                // Verifica se il giorno corrente è compreso tra la data di inizio e la data di fine della richiesta
                                if (dataGiornoNorm >= dataInizioNorm && dataGiornoNorm <= dataFineNorm) {
                                    // Ottieni il suffisso per il tipo di ferie
                                    const suffisso = SUFFISSI_FERIE[richiesta.Tipo] || '';
                                    if (suffisso && !suffissiGiorno.includes(suffisso)) {
                                        suffissiGiorno.push(suffisso);
                                    }
                                }
                            }
                        }
                        
                        // Se ci sono suffissi per questo giorno, aggiungili alla cella
                        if (suffissiGiorno.length > 0) {
                            const suffissiConcatenati = suffissiGiorno.join('/');
                            XLSX.utils.sheet_add_aoa(worksheet, [[suffissiConcatenati]], { origin: `${colonna}${rigaCorrente}` });
                            // Riapplica i bordi dopo aver aggiunto il contenuto
                            applicaBordi(cellRef);
                        }
                    }
                    
                    rigaCorrente++;
                }
            }
            
            // Aggiungi il foglio al workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, mese.nome);
        }
        
        // Applica la formattazione direttamente nel codice JavaScript
        // Poiché XLSX non supporta macro VBA reali, applichiamo la formattazione qui
        
        for (const mese of MESI_ANNO_SCOLASTICO) {
            const worksheet = workbook.Sheets[mese.nome];
            if (!worksheet) continue;
            
            // Trova l'ultima riga e colonna con dati
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            const lastRow = range.e.r + 1;
            const lastCol = range.e.c + 1;
            
            // Applica bordi e formattazione a tutte le celle
            for (let r = 0; r < lastRow; r++) {
                for (let c = 0; c < lastCol; c++) {
                    const cellRef = XLSX.utils.encode_cell({ r, c });
                    if (!worksheet[cellRef]) {
                        worksheet[cellRef] = { t: 's', v: '' };
                    }
                    
                    // Applica bordi neri
                    if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
                    worksheet[cellRef].s.border = {
                        top: { style: 'thin', color: { rgb: 'FF000000' } },
                        bottom: { style: 'thin', color: { rgb: 'FF000000' } },
                        left: { style: 'thin', color: { rgb: 'FF000000' } },
                        right: { style: 'thin', color: { rgb: 'FF000000' } }
                    };
                    
                    // Colora di rosso le colonne dei sabati e festivi
                    if (r === 3 && c >= 2) { // Riga 4 (indice 3) contiene i giorni
                        const cellValue = worksheet[cellRef] ? worksheet[cellRef].v : '';
                        if (cellValue && (cellValue.toString().includes('Sab') || cellValue.toString().includes('Dom'))) {
                            // Colora tutta la colonna di rosso
                            for (let rowIndex = 0; rowIndex < lastRow; rowIndex++) {
                                const colCellRef = XLSX.utils.encode_cell({ r: rowIndex, c });
                                if (!worksheet[colCellRef]) {
                                    worksheet[colCellRef] = { t: 's', v: '' };
                                }
                                if (!worksheet[colCellRef].s) worksheet[colCellRef].s = {};
                                worksheet[colCellRef].s.fill = {
                                    fgColor: { rgb: 'FFFF0000' }
                                };
                            }
                        }
                    }
                }
            }
            
            // Imposta larghezza automatica delle colonne
            const colWidths = [];
            for (let c = 0; c < lastCol; c++) {
                let maxWidth = 10;
                for (let r = 0; r < lastRow; r++) {
                    const cellRef = XLSX.utils.encode_cell({ r, c });
                    if (worksheet[cellRef] && worksheet[cellRef].v) {
                        const cellLength = worksheet[cellRef].v.toString().length;
                        maxWidth = Math.max(maxWidth, cellLength + 2);
                    }
                }
                colWidths.push({ wch: Math.min(maxWidth, 30) });
            }
            worksheet['!cols'] = colWidths;
        }
        
        // Genera il nome del file con estensione XLSM
        const nomeFile = `Prospetto_Ferie_${annoScolasticoInizio}-${annoScolasticoFine}.xlsm`;
        const percorsoFile = path.join(process.cwd(), nomeFile);
        
        // Imposta le opzioni di scrittura per file con macro
        const writeOpts = {
            bookType: 'xlsm',
            type: 'buffer',
            cellStyles: true,
            sheetStubs: false
        };
        
        // Scrivi il file Excel con estensione macro-enabled
        XLSX.writeFile(workbook, percorsoFile, writeOpts);
        
        console.log('✓ File Excel .xlsm generato con successo!');
        console.log('NOTA: Per aggiungere le macro di formattazione, segui le istruzioni dettagliate nella pagina dedicata.');
        console.log('Apri il browser e vai su: http://localhost:8081/istruzioni-macro.html');
        
        // Restituisci il percorso del file generato
        return {
            success: true,
            message: 'File Excel generato con successo',
            fileUrl: `http://localhost:8081/${nomeFile}`
        };
    } catch (error) {
        console.error('Errore nella generazione del file Excel:', error);
        return {
            success: false,
            message: 'Errore durante la generazione del file Excel: ' + error.message
        };
    }
}

module.exports = {
    esplodiFerie
};