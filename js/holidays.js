/**
 * MODULO: Gestione Festività Italiane
 * 
 * Questo modulo gestisce:
 * - Calcolo automatico delle festività italiane per qualsiasi anno
 * - Festività fisse (date sempre uguali)
 * - Festività mobili (Pasqua e Lunedì dell'Angelo)
 * - Verifica se una data specifica è festiva
 * - Calcolo giorni lavorativi escludendo festività e weekend
 * 
 * Utilizzato per:
 * - Validazione richieste ferie (esclusione festività)
 * - Calcolo automatico giorni lavorativi
 * - Generazione calendari con evidenziazione festività
 */

const Holidays = {
    /**
     * Elenco delle festività nazionali italiane con date fisse
     * 
     * Queste festività cadono sempre nello stesso giorno e mese
     * ogni anno, indipendentemente dal giorno della settimana.
     */
    festivitaFisse: [
        { giorno: 1, mese: 1, nome: "Capodanno" },
        { giorno: 6, mese: 1, nome: "Epifania" },
        { giorno: 25, mese: 4, nome: "Festa della Liberazione" },
        { giorno: 1, mese: 5, nome: "Festa dei Lavoratori" },
        { giorno: 2, mese: 6, nome: "Festa della Repubblica" },
        { giorno: 15, mese: 8, nome: "Ferragosto" },
        { giorno: 1, mese: 11, nome: "Tutti i Santi" },
        { giorno: 8, mese: 12, nome: "Immacolata Concezione" },
        { giorno: 25, mese: 12, nome: "Natale" },
        { giorno: 26, mese: 12, nome: "Santo Stefano" }
    ],
    
    /**
     * Calcola la data della Pasqua per un dato anno usando l'algoritmo di Gauss
     * 
     * Implementa l'algoritmo matematico per determinare la data della Pasqua
     * secondo il calendario gregoriano. La Pasqua cade la prima domenica
     * dopo la prima luna piena che segue l'equinozio di primavera.
     * 
     * @param {number} anno - Anno per cui calcolare la Pasqua (es. 2024)
     * @returns {Date} - Oggetto Date rappresentante la domenica di Pasqua
     */
    calcolaPasqua: function(anno) {
        // Algoritmo di Gauss per il calcolo della Pasqua
        // Variabili intermedie per i calcoli astronomici
        const a = anno % 19;                              // Ciclo metonico (19 anni)
        const b = Math.floor(anno / 100);                 // Secolo
        const c = anno % 100;                             // Anno nel secolo
        const d = Math.floor(b / 4);                      // Correzione secolare
        const e = b % 4;                                  // Resto correzione secolare
        const f = Math.floor((b + 8) / 25);               // Correzione lunare
        const g = Math.floor((b - f + 1) / 3);            // Correzione lunare aggiuntiva
        const h = (19 * a + b - d - g + 15) % 30;         // Epatta (età della luna)
        const i = Math.floor(c / 4);                      // Anni bisestili nel secolo
        const k = c % 4;                                  // Resto anni bisestili
        const l = (32 + 2 * e + 2 * i - h - k) % 7;       // Giorno della settimana
        const m = Math.floor((a + 11 * h + 22 * l) / 451); // Correzione per aprile/maggio
        
        // Calcolo finale del mese e giorno
        const mese = Math.floor((h + l - 7 * m + 114) / 31);
        const giorno = ((h + l - 7 * m + 114) % 31) + 1;
        
        // Restituisce la data (mese-1 perché JavaScript usa 0-11 per i mesi)
        return new Date(anno, mese - 1, giorno);
    },
    
    /**
     * Genera l'elenco completo delle festività italiane per un anno specifico
     * 
     * Combina festività fisse (sempre nelle stesse date) con quelle mobili
     * (che dipendono dal calcolo della Pasqua). Utilizzata per validare
     * le richieste di ferie e calcolare i giorni lavorativi.
     * 
     * @param {number} anno - Anno per cui generare l'elenco (es. 2024)
     * @returns {Array<Date>} - Array contenente tutte le date festive dell'anno
     */
    getFestivita: function(anno) {
        const festivita = [];
        
        // FESTIVITÀ FISSE: Aggiungi tutte le festività con date fisse
        this.festivitaFisse.forEach(festa => {
            // Crea oggetto Date per ogni festività (mese-1 perché JS usa 0-11)
            festivita.push(new Date(anno, festa.mese - 1, festa.giorno));
        });
        
        // FESTIVITÀ MOBILI: Calcola Pasqua e festività correlate
        const pasqua = this.calcolaPasqua(anno);
        festivita.push(pasqua);  // Domenica di Pasqua
        
        // Pasquetta (Lunedì dell'Angelo) - sempre il giorno dopo Pasqua
        const pasquetta = new Date(pasqua);
        pasquetta.setDate(pasqua.getDate() + 1);
        festivita.push(pasquetta);
        
        return festivita;
    },
    
    /**
     * Verifica se una data specifica corrisponde a una festività italiana
     * 
     * Confronta la data fornita con tutte le festività dell'anno
     * (sia fisse che mobili). Utilizzata per validare le richieste
     * di ferie e impedire la selezione di giorni festivi.
     * 
     * @param {Date} data - Data da verificare (oggetto Date)
     * @returns {boolean} - True se la data è una festività, false altrimenti
     */
    isFestivo: function(data) {
        const anno = data.getFullYear();
        const festivita = this.getFestivita(anno);  // Ottieni tutte le festività dell'anno
        
        // Confronta la data con ogni festività (giorno, mese, anno)
        return festivita.some(festivo => 
            festivo.getDate() === data.getDate() && 
            festivo.getMonth() === data.getMonth() && 
            festivo.getFullYear() === data.getFullYear()
        );
    },
    
    /**
     * Determina se una data è un giorno lavorativo effettivo
     * 
     * Un giorno è considerato lavorativo se:
     * - Non è sabato o domenica (weekend)
     * - Non è una festività italiana
     * 
     * Utilizzata per calcolare automaticamente i giorni lavorativi
     * nelle richieste di ferie e per la validazione.
     * 
     * @param {Date} data - Data da verificare (oggetto Date)
     * @returns {boolean} - True se è un giorno lavorativo, false altrimenti
     */
    isLavorativo: function(data) {
        const giorno = data.getDay();
        // Verifica weekend: 0 = domenica, 6 = sabato
        const isWeekend = (giorno === 0 || giorno === 6);
        
        // Restituisce true solo se non è weekend E non è festivo
        return !isWeekend && !this.isFestivo(data);
    },
    
    /**
     * Calcola il numero esatto di giorni lavorativi in un periodo
     * 
     * Conta tutti i giorni compresi tra due date (incluse) che sono
     * effettivamente lavorativi, escludendo automaticamente:
     * - Sabati e domeniche
     * - Tutte le festività italiane (fisse e mobili)
     * 
     * Utilizzata per:
     * - Calcolare automaticamente i giorni di ferie richiesti
     * - Validare la disponibilità residua dell'utente
     * - Generare report sui giorni lavorativi
     * 
     * @param {Date} dataInizio - Data di inizio del periodo (inclusa)
     * @param {Date} dataFine - Data di fine del periodo (inclusa)
     * @returns {number} - Numero di giorni lavorativi nel periodo (0 se date non valide)
     */
    calcolaGiorniLavorativi: function(dataInizio, dataFine) {
        // PREPARAZIONE DATI: Clona le date per evitare modifiche agli originali
        const inizio = new Date(dataInizio);
        const fine = new Date(dataFine);
        
        // Normalizza le date a mezzanotte per confronti accurati
        inizio.setHours(0, 0, 0, 0);
        fine.setHours(0, 0, 0, 0);
        
        // VALIDAZIONE: Verifica che il periodo sia valido
        if (fine < inizio) {
            return 0;  // Periodo non valido
        }
        
        // CONTEGGIO: Itera giorno per giorno nel periodo
        let giorniLavorativi = 0;
        const currentDate = new Date(inizio);
        
        // Scorre tutti i giorni dal primo all'ultimo (inclusi)
        while (currentDate <= fine) {
            // Conta solo i giorni effettivamente lavorativi
            if (this.isLavorativo(currentDate)) {
                giorniLavorativi++;
            }
            // Passa al giorno successivo
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return giorniLavorativi;
    }
};

// Export per Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Holidays;
}

// Export per ES6 modules
export default Holidays;