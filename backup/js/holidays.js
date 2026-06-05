/**
 * Gestione delle festività italiane
 */

const Holidays = {
    /**
     * Festività fisse italiane (giorno, mese)
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
     * Calcola la data della Pasqua per un dato anno
     * @param {number} anno - Anno per cui calcolare la Pasqua
     * @returns {Date} - Data della Pasqua
     */
    calcolaPasqua: function(anno) {
        const a = anno % 19;
        const b = Math.floor(anno / 100);
        const c = anno % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mese = Math.floor((h + l - 7 * m + 114) / 31);
        const giorno = ((h + l - 7 * m + 114) % 31) + 1;
        
        return new Date(anno, mese - 1, giorno);
    },
    
    /**
     * Ottiene tutte le festività per un dato anno
     * @param {number} anno - Anno per cui ottenere le festività
     * @returns {Array} - Array di date festive
     */
    getFestivita: function(anno) {
        const festivita = [];
        
        // Aggiungi festività fisse
        this.festivitaFisse.forEach(festa => {
            festivita.push(new Date(anno, festa.mese - 1, festa.giorno));
        });
        
        // Calcola Pasqua e Pasquetta
        const pasqua = this.calcolaPasqua(anno);
        festivita.push(pasqua);
        
        // Pasquetta (lunedì dopo Pasqua)
        const pasquetta = new Date(pasqua);
        pasquetta.setDate(pasqua.getDate() + 1);
        festivita.push(pasquetta);
        
        return festivita;
    },
    
    /**
     * Verifica se una data è festiva
     * @param {Date} data - Data da verificare
     * @returns {boolean} - True se la data è festiva
     */
    isFestivo: function(data) {
        const anno = data.getFullYear();
        const festivita = this.getFestivita(anno);
        
        // Controlla se la data è una festività
        return festivita.some(festivo => 
            festivo.getDate() === data.getDate() && 
            festivo.getMonth() === data.getMonth() && 
            festivo.getFullYear() === data.getFullYear()
        );
    },
    
    /**
     * Verifica se una data è un giorno lavorativo (non weekend e non festivo)
     * @param {Date} data - Data da verificare
     * @returns {boolean} - True se la data è un giorno lavorativo
     */
    isLavorativo: function(data) {
        const giorno = data.getDay();
        // 0 = domenica, 6 = sabato
        const isWeekend = (giorno === 0 || giorno === 6);
        
        return !isWeekend && !this.isFestivo(data);
    },
    
    /**
     * Calcola i giorni lavorativi tra due date
     * @param {Date} dataInizio - Data di inizio
     * @param {Date} dataFine - Data di fine
     * @returns {number} - Numero di giorni lavorativi
     */
    calcolaGiorniLavorativi: function(dataInizio, dataFine) {
        // Clona le date per non modificare quelle originali
        const inizio = new Date(dataInizio);
        const fine = new Date(dataFine);
        
        // Normalizza le date rimuovendo l'ora
        inizio.setHours(0, 0, 0, 0);
        fine.setHours(0, 0, 0, 0);
        
        // Verifica che le date siano valide
        if (fine < inizio) {
            return 0;
        }
        
        let giorniLavorativi = 0;
        const currentDate = new Date(inizio);
        
        // Itera attraverso tutti i giorni
        while (currentDate <= fine) {
            if (this.isLavorativo(currentDate)) {
                giorniLavorativi++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return giorniLavorativi;
    }
};