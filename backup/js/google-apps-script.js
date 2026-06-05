/**
 * Script per la gestione delle ferie del personale ATA
 * Questa versione utilizza un file Excel locale invece di Google Sheets
 */

const excelUtils = require('./excel-utils');

/**
 * Funzione doGet - Gestisce le richieste GET
 * @param {object} e - Evento
 * @returns {object} - Risposta JSON
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * Funzione doPost - Gestisce le richieste POST
 * @param {object} e - Evento
 * @returns {object} - Risposta JSON
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * Gestisce le richieste in arrivo (GET e POST)
 * @param {object} e - Evento (contiene parameters, postData, method)
 * @returns {object} - Risposta JSON
 */
function handleRequest(e) {
  // Imposta le intestazioni CORS
  const headers = {
    'Access-Control-Allow-Origin': 'http://localhost:8081',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Gestisci le richieste OPTIONS (preflight CORS)
  if (e.method === 'OPTIONS') {
    return {
      headers: headers,
      body: JSON.stringify({status: 'ok'})
    };
  }

  try {
    let requestData;
    if (e.method === 'POST') {
      if (!e.body) {
        throw new Error('Nessun dato POST ricevuto.');
      }
      requestData = JSON.parse(e.body);
    } else if (e.method === 'GET') {
      requestData = e.query;
    } else {
      throw new Error('Metodo HTTP non supportato.');
    }

    const action = requestData.action;
    let resultData;

    switch (action) {
      case 'verificaCredenziali':
        resultData = excelUtils.verificaCredenziali(requestData.username, requestData.password);
        break;
      case 'getDatiUtente':
        resultData = excelUtils.getDatiUtente(requestData.username);
        break;
      case 'getRichieste':
        resultData = excelUtils.getRichieste(requestData.username);
        break;
      case 'inviaRichiesta':
        resultData = excelUtils.inviaRichiesta(requestData.richiesta);
        break;
      case 'modificaRichiesta':
        resultData = excelUtils.modificaRichiesta(requestData.id, requestData.richiesta);
        break;
      case 'eliminaRichiesta':
        resultData = excelUtils.eliminaRichiesta(requestData.id);
        break;
      default:
        throw new Error('Azione non valida: ' + action);
    }

    return {
      headers: headers,
      body: JSON.stringify(resultData)
    };

  } catch (error) {
    const errorResponse = {
      success: false,
      message: 'Errore del server: ' + error.message
    };

    return {
      headers: headers,
      body: JSON.stringify(errorResponse)
    };
  }
}

module.exports = {
  doGet,
  doPost,
  handleRequest
};