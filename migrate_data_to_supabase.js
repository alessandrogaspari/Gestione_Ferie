/**
 * Script per migrare i dati da Excel a Supabase
 * 
 * Questo script:
 * 1. Legge i dati dal file Excel esistente
 * 2. Li trasforma nel formato Supabase
 * 3. Li inserisce nel database Supabase
 * 
 * PREREQUISITI:
 * - Aver configurato il progetto Supabase
 * - Aver eseguito lo script supabase_setup.sql
 * - Aver installato le dipendenze: npm install @supabase/supabase-js
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

// =====================================================
// CONFIGURAZIONE SUPABASE
// =====================================================
// IMPORTANTE: Sostituire con i propri valori dal dashboard Supabase
const SUPABASE_URL = 'https://jmeckjmuwxiqjpbualjb.supabase.co' ; // es: https://xxxxx.supabase.co
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptZWNram11d3hpcWpwYnVhbGpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ4NTc5MCwiZXhwIjoyMDY4MDYxNzkwfQ.CwheQd0QG6qo9E9nEOD9qwf2r8YK6OPdEMUFpLOy9oI'; // Service Role Key (non anon key!)

// Inizializza il client Supabase con Service Role Key per bypassare RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Percorso del file Excel
const DB_PATH = path.join(__dirname, 'DB_Ferie.xlsx');

// Nomi dei fogli Excel
const SHEETS = {
    PERSONALE: 'UTENTI',
    FERIE: 'FERIE',
    RICHIESTE: 'RICHIESTE',
    SOSPENSIONI: 'SOSPENSIONI'
};

// =====================================================
// FUNZIONI HELPER
// =====================================================

/**
 * Legge i dati da un foglio Excel
 */
function readExcelSheet(sheetName) {
    try {
        const workbook = XLSX.readFile(DB_PATH);
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
            console.log(`Foglio ${sheetName} non trovato`);
            return [];
        }
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log(`Letti ${data.length} record dal foglio ${sheetName}`);
        return data;
    } catch (error) {
        console.error(`Errore nella lettura del foglio ${sheetName}:`, error);
        return [];
    }
}

/**
 * Converte la password in stringa
 */
function convertPassword(password) {
    // Converte sempre la password in stringa
    return String(password || 'password123');
}

/**
 * Converte una data Excel in formato ISO
 */
function convertExcelDate(excelDate) {
    if (!excelDate) return null;
    
    // Se è già una stringa in formato data
    if (typeof excelDate === 'string') {
        const date = new Date(excelDate);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }
    
    // Se è un numero Excel (giorni dal 1900-01-01)
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    return null;
}

/**
 * Mappa i ruoli dal file Excel ai valori permessi nel database
 * Supporta tutti i ruoli specifici del file Excel DB_Ferie.xlsx
 */
function mapRole(excelRole) {
    const roleString = String(excelRole || '').trim().toUpperCase();
    
    // Mappa i ruoli specifici del file Excel
    if (roleString.includes('SUPERUSER')) {
        return 'SUPERUSER';
    }
    
    if (roleString.includes('DS') && !roleString.includes('DSGA')) {
        return 'DS';
    }
    
    if (roleString.includes('DSGA')) {
        return 'DSGA';
    }
    
    if (roleString.includes('ASSISTENTI AMMINISTRATIVI') || 
        roleString.includes('ASSISTENTE AMMINISTRATIVO')) {
        return 'ASSISTENTI AMMINISTRATIVI';
    }
    
    if (roleString.includes('ASSISTENTI TECNICI') || 
        roleString.includes('ASSISTENTE TECNICO')) {
        return 'ASSISTENTI TECNICI';
    }
    
    if (roleString.includes('COLLABORATORI SCOLASTICI') || 
        roleString.includes('COLLABORATORE SCOLASTICO')) {
        return 'COLLABORATORI SCOLASTICI';
    }
    
    // Mappa ruoli amministrativi generici ad 'admin'
    if (roleString.includes('ADMIN')) {
        return 'admin';
    }
    
    // Tutti gli altri ruoli diventano 'utente'
    return 'utente';
}

/**
 * Mappa gli stati delle richieste ai valori permessi nel database
 */
function mapRequestStatus(excelStatus) {
    const statusString = String(excelStatus || '').trim().toUpperCase();
    
    // Mappa gli stati approvati
    if (statusString.includes('APPROVATO') || statusString.includes('APPROVATA')) {
        return 'APPROVATA';
    }
    
    // Mappa gli stati rifiutati
    if (statusString.includes('RIFIUTATO') || statusString.includes('RIFIUTATA')) {
        return 'RIFIUTATA';
    }
    
    // Default: in attesa
    return 'IN ATTESA';
}

// =====================================================
// FUNZIONI DI MIGRAZIONE
// =====================================================

/**
 * Migra gli utenti
 */
async function migrateUsers() {
    console.log('\n=== MIGRAZIONE UTENTI ===');
    
    const excelUsers = readExcelSheet(SHEETS.PERSONALE);
    if (excelUsers.length === 0) {
        console.log('Nessun utente da migrare');
        return new Map();
    }
    
    const userIdMap = new Map(); // Mappa username -> UUID Supabase
    
    for (const excelUser of excelUsers) {
        try {
            // Verifica che l'username sia valido
            if (!excelUser.Username) {
                console.log(`⚠ Utente senza username, salto: ${JSON.stringify(excelUser)}`);
                continue;
            }
            
            // Converte la password in stringa (gestisce anche valori numerici dal file Excel)
            const password = convertPassword(excelUser.Password);
            
            const userData = {
                username: String(excelUser.Username).trim(),
                password: password,
                nome: String(excelUser.Nome || excelUser.Username).trim(),
                ruolo: mapRole(excelUser.Ruolo)
            };
            
            const { data: insertedUsers, error } = await supabase
                .from('users')
                .insert(userData)
                .select('id, username')
                .limit(1);
            
            const data = insertedUsers && insertedUsers.length > 0 ? insertedUsers[0] : null;
            
            if (error) {
                console.error(`❌ Errore inserimento utente ${excelUser.Username}:`);
                console.error(`   Codice errore: ${error.code}`);
                console.error(`   Messaggio: ${error.message}`);
                console.error(`   Dettagli: ${JSON.stringify(error.details)}`);
                console.error(`   Dati utente: ${JSON.stringify(userData)}`);
            } else {
                console.log(`✓ Utente ${excelUser.Username} migrato con ID: ${data.id}`);
                userIdMap.set(excelUser.Username, data.id);
            }
        } catch (error) {
            console.error(`Errore durante la migrazione dell'utente ${excelUser.Username}:`, error);
        }
    }
    
    console.log(`Migrati ${userIdMap.size}/${excelUsers.length} utenti`);
    return userIdMap;
}

/**
 * Migra i bilanci ferie
 */
async function migrateFerieBalance(userIdMap) {
    console.log('\n=== MIGRAZIONE BILANCI FERIE ===');
    
    const excelFerie = readExcelSheet(SHEETS.FERIE);
    if (excelFerie.length === 0) {
        console.log('Nessun bilancio ferie da migrare');
        return;
    }
    
    let migratedCount = 0;
    
    for (const excelRecord of excelFerie) {
        try {
            const userId = userIdMap.get(excelRecord.Username);
            if (!userId) {
                console.log(`⚠ Utente ${excelRecord.Username} non trovato, salto il bilancio ferie`);
                continue;
            }
            
            const ferieData = {
                user_id: userId,
                ferie_totali: parseInt(excelRecord.FerieTotali) || 28,
                ferie_utilizzate: parseFloat(excelRecord.FerieUtilizzate) || 0,
                ferie_vecchie_totali: parseInt(excelRecord.FerieVecchieTotali) || 0,
                ferie_vecchie_utilizzate: parseFloat(excelRecord.FerieVecchieUtilizzate) || 0,
                festivita_totali: parseInt(excelRecord.FestivitaTotali) || 4,
                festivita_utilizzate: parseFloat(excelRecord.FestivitaUtilizzate) || 0,
                motivi_familiari_totali: parseInt(excelRecord.MotiviFamiliariTotali) || 3,
                motivi_familiari_utilizzati: parseFloat(excelRecord.MotiviFamiliariUtilizzati) || 0,
                recuperi_totali: parseInt(excelRecord.RecuperiTotali) || 0,
                recuperi_utilizzati: parseFloat(excelRecord.RecuperiUtilizzati) || 0
            };
            
            // Aggiorna il record esistente (creato automaticamente dal trigger)
            const { error } = await supabase
                .from('ferie_balance')
                .update(ferieData)
                .eq('user_id', userId);
            
            if (error) {
                console.error(`Errore aggiornamento bilancio per ${excelRecord.Username}:`, error);
            } else {
                console.log(`✓ Bilancio ferie per ${excelRecord.Username} migrato`);
                migratedCount++;
            }
        } catch (error) {
            console.error(`Errore durante la migrazione del bilancio per ${excelRecord.Username}:`, error);
        }
    }
    
    console.log(`Migrati ${migratedCount}/${excelFerie.length} bilanci ferie`);
}

/**
 * Migra le richieste
 */
async function migrateRichieste(userIdMap) {
    console.log('\n=== MIGRAZIONE RICHIESTE ===');
    
    const excelRichieste = readExcelSheet(SHEETS.RICHIESTE);
    if (excelRichieste.length === 0) {
        console.log('Nessuna richiesta da migrare');
        return;
    }
    
    let migratedCount = 0;
    
    for (const excelRichiesta of excelRichieste) {
        try {
            const userId = userIdMap.get(excelRichiesta.Username);
            if (!userId) {
                console.log(`⚠ Utente ${excelRichiesta.Username} non trovato, salto la richiesta ${excelRichiesta.ID}`);
                continue;
            }
            
            // Trova l'ID dell'utente che ha approvato (se presente)
            let approvataUserId = null;
            if (excelRichiesta.ApprovataDa) {
                approvataUserId = userIdMap.get(excelRichiesta.ApprovataDa);
            }
            
            const richiestaData = {
                user_id: userId,
                tipo: excelRichiesta.Tipo,
                data_inizio: convertExcelDate(excelRichiesta.DataInizio),
                data_fine: convertExcelDate(excelRichiesta.DataFine),
                giorni: parseFloat(excelRichiesta.Giorni) || 0,
                note: excelRichiesta.Note || null,
                stato: mapRequestStatus(excelRichiesta.Stato),
                data_richiesta: convertExcelDate(excelRichiesta.DataRichiesta) || new Date().toISOString().split('T')[0],
                data_approvazione: convertExcelDate(excelRichiesta.DataApprovazione),
                approvata_da: approvataUserId,
                note_approvazione: excelRichiesta.NoteApprovazione || null
            };
            
            const { error } = await supabase
                .from('richieste')
                .insert(richiestaData);
            
            if (error) {
                console.error(`Errore inserimento richiesta ${excelRichiesta.ID}:`, error);
            } else {
                console.log(`✓ Richiesta ${excelRichiesta.ID} per ${excelRichiesta.Username} migrata`);
                migratedCount++;
            }
        } catch (error) {
            console.error(`Errore durante la migrazione della richiesta ${excelRichiesta.ID}:`, error);
        }
    }
    
    console.log(`Migrate ${migratedCount}/${excelRichieste.length} richieste`);
}

/**
 * Migra le sospensioni
 */
async function migrateSospensioni() {
    console.log('\n=== MIGRAZIONE SOSPENSIONI ===');
    
    const excelSospensioni = readExcelSheet(SHEETS.SOSPENSIONI);
    if (excelSospensioni.length === 0) {
        console.log('Nessuna sospensione da migrare');
        return;
    }
    
    let migratedCount = 0;
    
    for (const excelSospensione of excelSospensioni) {
        try {
            const sospensioneData = {
                data: convertExcelDate(excelSospensione.Data),
                descrizione: excelSospensione.Descrizione || 'Sospensione',
                tipo: excelSospensione.Tipo || 'festività'
            };
            
            if (!sospensioneData.data) {
                console.log(`⚠ Data non valida per sospensione: ${JSON.stringify(excelSospensione)}`);
                continue;
            }
            
            const { error } = await supabase
                .from('sospensioni')
                .insert(sospensioneData);
            
            if (error) {
                console.error(`Errore inserimento sospensione ${sospensioneData.data}:`, error);
            } else {
                console.log(`✓ Sospensione ${sospensioneData.data} - ${sospensioneData.descrizione} migrata`);
                migratedCount++;
            }
        } catch (error) {
            console.error(`Errore durante la migrazione della sospensione:`, error);
        }
    }
    
    console.log(`Migrate ${migratedCount}/${excelSospensioni.length} sospensioni`);
}

// =====================================================
// FUNZIONE PRINCIPALE
// =====================================================

async function migrateAllData() {
    console.log('🚀 INIZIO MIGRAZIONE DATI DA EXCEL A SUPABASE');
    console.log('===============================================');
    
    // Verifica configurazione
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
        console.error('❌ ERRORE: Configurare SUPABASE_URL e SUPABASE_SERVICE_KEY nel file');
        process.exit(1);
    }
    
    // Verifica connessione a Supabase
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            console.error('❌ ERRORE: Impossibile connettersi a Supabase:', error);
            process.exit(1);
        }
        console.log('✓ Connessione a Supabase verificata');
    } catch (error) {
        console.error('❌ ERRORE: Impossibile connettersi a Supabase:', error);
        process.exit(1);
    }
    
    try {
        // 1. Migra utenti
        const userIdMap = await migrateUsers();
        
        // 2. Migra bilanci ferie
        await migrateFerieBalance(userIdMap);
        
        // 3. Migra richieste
        await migrateRichieste(userIdMap);
        
        // 4. Migra sospensioni
        await migrateSospensioni();
        
        console.log('\n🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!');
        console.log('===============================================');
        console.log('\nProssimi passi:');
        console.log('1. Verificare i dati nel dashboard Supabase');
        console.log('2. Testare l\'autenticazione con le credenziali migrate');
        console.log('3. Aggiornare il codice dell\'applicazione per usare Supabase');
        
    } catch (error) {
        console.error('❌ ERRORE DURANTE LA MIGRAZIONE:', error);
        process.exit(1);
    }
}

// =====================================================
// ESECUZIONE
// =====================================================

// Esegui la migrazione se il file viene eseguito direttamente
if (require.main === module) {
    migrateAllData();
}

module.exports = {
    migrateAllData,
    migrateUsers,
    migrateFerieBalance,
    migrateRichieste,
    migrateSospensioni
};