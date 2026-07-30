const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('./config');

async function startRushBot() {
    // Auth Session folder setup
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ["Rush-TD Bot", "Chrome", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    // Connection Updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔴 Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startRushBot();
            }
        } else if (connection === 'open') {
            console.log(`✅ ${config.BOT_NAME} Connected Successfully!`);
        }
    });

    // Message Listening
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (!text.startsWith(config.PREFIX)) return;

        const args = text.slice(config.PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Basic Commands
        if (command === 'ping') {
            await sock.sendMessage(from, { text: `🏓 Pong! *${config.BOT_NAME}* is active!` }, { quoted: msg });
        } 
        else if (command === 'menu' || command === 'help') {
            const menuText = `
🤖 *${config.BOT_NAME} WHATSAPP BOT* 🤖

📌 *Prefix:* \`${config.PREFIX}\`

*Commands:*
• \`${config.PREFIX}ping\` - Check bot status
• \`${config.PREFIX}alive\` - Check bot alive status
• \`${config.PREFIX}menu\` - Show menu list

⚡ *Powered by Rush-TD*
            `;
            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        } 
        else if (command === 'alive') {
            await sock.sendMessage(from, { text: `👋 Hey! *${config.BOT_NAME}* is working fine.` }, { quoted: msg });
        }
    });
}

startRushBot();
