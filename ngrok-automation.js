const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configurazione
const CONFIG = {
    github: {
        token: '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', // Nuovo token aggiornato
        owner: 'alessandrogaspari',
        repo: 'APRI02000Q_APP_FERIE',
        branch: 'main'
    },
    email: {
        from: 'alessandro.gaspari@ipsiafermo.edu.it',
        password: 'vxdz yvmi jbss dqtm',
        to: 'alessandro.gaspari@gmail.com'
    },
    ngrok: {
        apiUrl: 'http://127.0.0.1:4040/api/tunnels'
    }
};

// Funzione per recuperare l'URL di ngrok
async function getNgrokUrl() {
    try {
        console.log('🔍 Recupero URL ngrok...');
        const response = await axios.get(CONFIG.ngrok.apiUrl);
        const tunnels = response.data.tunnels;
        
        if (tunnels.length === 0) {
            throw new Error('Nessun tunnel ngrok attivo trovato');
        }
        
        // Trova il tunnel HTTPS
        const httpsTunnel = tunnels.find(tunnel => tunnel.proto === 'https');
        if (httpsTunnel) {
            console.log('✅ URL ngrok trovato:', httpsTunnel.public_url);
            return httpsTunnel.public_url;
        }
        
        throw new Error('Tunnel HTTPS non trovato');
    } catch (error) {
        console.error('❌ Errore nel recupero URL ngrok:', error.message);
        throw error;
    }
}

// Funzione per generare la pagina HTML
function generateHTML(ngrokUrl) {
    const currentDate = new Date().toLocaleString('it-IT');
    const timestamp = Date.now(); // Timestamp per cache busting
    
    return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Meta tag per controllo cache - SOLUZIONE A -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta http-equiv="Last-Modified" content="${new Date().toUTCString()}">
    
    <!-- Auto-refresh ogni 30 secondi -->
    <meta http-equiv="refresh" content="30">
    
    <title>AppFerie - Accesso Applicazione (${timestamp})</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            border-radius: 15px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .access-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 10px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .access-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .copy-button {
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
            margin: 5px;
            transition: background 0.2s;
        }
        .copy-button:hover {
            background: #218838;
        }
        .url-display {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-family: monospace;
            word-break: break-all;
            font-size: 14px;
        }
        .info-section {
            background: #e3f2fd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        }
        .developer-info {
            background: #f0f8ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .cache-info {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 12px;
            color: #856404;
        }
        .refresh-notice {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 12px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="refresh-notice">
        🔄 Auto-refresh: 30s
    </div>
    
    <div class="container">
        <div class="logo">AF</div>
        <h1>AppFerie</h1>
        <p class="subtitle">Sistema di Gestione Ferie - IPSIA Apri</p>
        
        <div class="cache-info">
            <strong>📅 Timestamp:</strong> ${timestamp}<br>
            <strong>🕒 Generato:</strong> ${currentDate}<br>
            <strong>🔄 Auto-refresh:</strong> Ogni 30 secondi
        </div>
        
        <div class="developer-info">
            <h3>👨‍💻 Informazioni Sviluppatore</h3>
            <p><strong>Sviluppatore:</strong> Alessandro Gaspari</p>
            <p><strong>Email:</strong> alessandro.gaspari@gmail.com</p>
        </div>
        
        <a href="${ngrokUrl}" class="access-button" target="_blank">
            🚀 Accedi all'Applicazione
        </a>
        
        <div class="url-display">${ngrokUrl}</div>
        
        <button class="copy-button" onclick="copyUrl()">📋 Copia URL</button>
        
        <div class="info-section">
            <h3>📋 Informazioni Applicazione</h3>
            <p><strong>Versione:</strong> 2.0</p>
            <p><strong>Ultimo aggiornamento:</strong> ${currentDate}</p>
            <p><strong>Stato:</strong> Attivo</p>
            <p><strong>Porta:</strong> 3000</p>
            <p><strong>Cache Busting:</strong> Attivo (${timestamp})</p>
        </div>
    </div>

    <script>
        function copyUrl() {
            const url = '${ngrokUrl}';
            navigator.clipboard.writeText(url).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✅ Copiato!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#28a745';
                }, 2000);
            });
        }
        
        // Notifica visiva di aggiornamento
        window.addEventListener('beforeunload', function() {
            document.body.style.opacity = '0.5';
        });
        
        // Debug info in console
        console.log('AppFerie - Cache Busting Attivo');
        console.log('Timestamp:', ${timestamp});
        console.log('Generato:', '${currentDate}');
    </script>
</body>
</html>`;
}

// Funzione per caricare su GitHub
async function uploadToGitHub(htmlContent) {
    try {
        console.log('📤 Caricamento su GitHub Pages...');
        
        const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/index.html`;
        
        // Prima verifica se il file esiste già
        let sha = null;
        try {
            const existingFile = await axios.get(url, {
                headers: {
                    'Authorization': `token ${CONFIG.github.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            sha = existingFile.data.sha;
        } catch (error) {
            // File non esiste, va bene così
        }
        
        const data = {
            message: `Aggiornamento automatico URL ngrok - ${new Date().toISOString()}`,
            content: Buffer.from(htmlContent).toString('base64'),
            branch: CONFIG.github.branch
        };
        
        if (sha) {
            data.sha = sha;
        }
        
        await axios.put(url, data, {
            headers: {
                'Authorization': `token ${CONFIG.github.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        console.log('✅ Pagina caricata su GitHub Pages');
        return `https://${CONFIG.github.owner}.github.io/${CONFIG.github.repo}`;
    } catch (error) {
        console.error('❌ Errore nel caricamento su GitHub:', error.response?.data || error.message);
        throw error;
    }
}

// Funzione per inviare email di notifica
async function sendEmailNotification(ngrokUrl, githubUrl) {
    try {
        console.log('📧 Invio notifica email...');
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: CONFIG.email.from,
                pass: CONFIG.email.password
            }
        });
        
        const mailOptions = {
            from: CONFIG.email.from,
            to: CONFIG.email.to,
            subject: '🔄 AppFerie - Nuovo URL di Accesso Disponibile',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1>🚀 AppFerie - Aggiornamento URL</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
                        <p>Ciao Alessandro,</p>
                        
                        <p>L'URL di accesso remoto per AppFerie è stato aggiornato automaticamente.</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <h3>🔗 Nuovo URL Diretto:</h3>
                            <p style="font-family: monospace; background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all;">
                                <a href="${ngrokUrl}" style="color: #667eea; text-decoration: none;">${ngrokUrl}</a>
                            </p>
                            
                            <h3>🌐 Pagina di Accesso:</h3>
                            <p style="font-family: monospace; background: #e9ecef; padding: 10px; border-radius: 5px; word-break: break-all;">
                                <a href="${githubUrl}" style="color: #667eea; text-decoration: none;">${githubUrl}</a>
                            </p>
                        </div>
                        
                        <p><strong>Cosa fare:</strong></p>
                        <ul>
                            <li>Usa il nuovo URL per accedere all'applicazione</li>
                            <li>Aggiorna i tuoi segnalibri se necessario</li>
                            <li>La pagina di accesso è sempre disponibile al link GitHub</li>
                        </ul>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            Questo messaggio è stato generato automaticamente dal sistema di automazione AppFerie.<br>
                            Data: ${new Date().toLocaleString('it-IT')}
                        </p>
                    </div>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Email di notifica inviata');
    } catch (error) {
        console.error('❌ Errore nell\'invio email:', error.message);
        // Non bloccare l'esecuzione per errori email
    }
}

// Funzione principale
async function main() {
    try {
        console.log('🚀 Avvio automazione AppFerie...');
        console.log('⏰ Data/Ora:', new Date().toLocaleString('it-IT'));
        
        // 1. Recupera URL ngrok
        const ngrokUrl = await getNgrokUrl();
        
        // 2. Genera HTML
        console.log('📝 Generazione pagina HTML...');
        const htmlContent = generateHTML(ngrokUrl);
        
        // 3. Carica su GitHub
        const githubUrl = await uploadToGitHub(htmlContent);
        
        // 4. Invia notifica email
        await sendEmailNotification(ngrokUrl, githubUrl);
        
        console.log('🎉 Automazione completata con successo!');
        console.log('🔗 URL ngrok:', ngrokUrl);
        console.log('🌐 Pagina GitHub:', githubUrl);
        
    } catch (error) {
        console.error('💥 Errore nell\'automazione:', error.message);
        process.exit(1);
    }
}

// Esegui se chiamato direttamente
if (require.main === module) {
    main();
}

module.exports = { main, getNgrokUrl, generateHTML, uploadToGitHub };