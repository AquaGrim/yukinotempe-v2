const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || '';

// Direktori cache lokal
const CACHE_BASE_DIR = path.join(__dirname, '../data/gif_cache');
if (!fs.existsSync(CACHE_BASE_DIR)) {
    fs.mkdirSync(CACHE_BASE_DIR, { recursive: true });
}

// Rate Limiter Sederhana (Maksimal 70 request per jam agar aman dari limit 100/jam)
const MAX_HOURLY_REQUESTS = 70;
let requestTimestamps = [];

// Cooldown khusus AI Auto-GIF per obrolan (minimal 1 menit jeda antar GIF di chat yang sama)
const aiGifCooldowns = new Map();
const AI_GIF_COOLDOWN_MS = 1 * 60 * 1000; // 1 menit

/**
 * Membersihkan nama folder berdasarkan query pencarian
 * Contoh: "anime blush" -> "anime_blush"
 */
function sanitizeCategory(query) {
    return query
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 50) || 'default';
}

/**
 * Ekstraksi ID unik Giphy dari objek item atau URL MP4
 * Contoh: id "BXrwTdoho6hkQ" atau dari URL path
 */
function extractGiphyId(item, url) {
    if (item && item.id) return item.id;
    if (url) {
        const match = url.match(/\/([a-zA-Z0-9]+)\/(?:giphy|200|100)/);
        if (match) return match[1];
    }
    return null;
}

/**
 * Membersihkan log request lama (> 1 jam yang lalu)
 */
function cleanOldRequests() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    requestTimestamps = requestTimestamps.filter(t => t > oneHourAgo);
}

/**
 * Cek apakah kuota aman untuk memanggil Giphy
 */
function isQuotaAvailable() {
    cleanOldRequests();
    return requestTimestamps.length < MAX_HOURLY_REQUESTS;
}

/**
 * Cek apakah chat tertentu boleh dikirimi GIF oleh AI (cooldown check)
 */
function canSendAiGif(chatId) {
    return true;
}

/**
 * Rekam waktu AI mengirim GIF di chat
 */
function recordAiGifSent(chatId) {
    aiGifCooldowns.set(chatId, Date.now());
}

/**
 * Mengambil GIF lokal dari cache berdasarkan kategori/kata kunci
 * @param {string} query
 * @returns {string|null} Path file lokal MP4 jika ada
 */
function getLocalCachedGif(query) {
    const category = sanitizeCategory(query);
    const categoryDir = path.join(CACHE_BASE_DIR, category);

    if (fs.existsSync(categoryDir)) {
        const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.mp4'));
        if (files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)];
            return path.join(categoryDir, randomFile);
        }
    }

    // Jika kategori persis tidak ada, cari di subfolder yang mirip atau default
    const allDirs = fs.existsSync(CACHE_BASE_DIR) ? fs.readdirSync(CACHE_BASE_DIR) : [];
    const matchedDir = allDirs.find(d => category.includes(d) || d.includes(category));
    if (matchedDir) {
        const matchedPath = path.join(CACHE_BASE_DIR, matchedDir);
        const files = fs.readdirSync(matchedPath).filter(f => f.endsWith('.mp4'));
        if (files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)];
            return path.join(matchedPath, randomFile);
        }
    }

    return null;
}

/**
 * Download file video MP4 dari Giphy ke penyimpanan lokal dengan deduplikasi berbasis Giphy ID
 * @param {string} url
 * @param {string} query
 * @param {string|null} giphyId
 * @returns {Promise<string|null>} Path file lokal yang disimpan
 */
function saveGifToCache(url, query, giphyId = null) {
    return new Promise((resolve) => {
        try {
            const category = sanitizeCategory(query);
            const categoryDir = path.join(CACHE_BASE_DIR, category);
            if (!fs.existsSync(categoryDir)) {
                fs.mkdirSync(categoryDir, { recursive: true });
            }

            // Tentukan ID unik untuk nama file
            const uniqueId = giphyId || extractGiphyId(null, url) || `file_${Date.now()}`;
            const fileName = `${uniqueId}.mp4`;
            const filePath = path.join(categoryDir, fileName);

            // Cek apakah file sudah pernah disimpan (anti duplikat 100%)
            if (fs.existsSync(filePath)) {
                return resolve(filePath);
            }

            const fileStream = fs.createWriteStream(filePath);

            https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    fileStream.close();
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    return resolve(null);
                }

                res.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(filePath);
                });
            }).on('error', (err) => {
                console.error('[Cache Download Error]', err);
                fileStream.close();
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                resolve(null);
            });
        } catch (e) {
            console.error('[saveGifToCache Error]', e);
            resolve(null);
        }
    });
}

/**
 * Mencari GIF di Giphy dan mengambil URL video MP4-nya.
 * Jika limit atau offline, otomatis fallback ke cache lokal!
 * @param {string} query
 * @returns {Promise<{ type: 'url'|'file', source: string }|null>}
 */
function fetchGiphyMp4(query) {
    return new Promise((resolve) => {
        const quotaSafe = isQuotaAvailable();

        if (!GIPHY_API_KEY) {
            console.log(`[Giphy] Kuota limit (${requestTimestamps.length}/${MAX_HOURLY_REQUESTS}). Mengambil dari cache lokal...`);
            const localFile = getLocalCachedGif(query);
            if (localFile) {
                return resolve({ type: 'file', source: localFile });
            }
            return resolve(null);
        }

        let finalQuery = query.trim();
        if (!/anime/i.test(finalQuery)) {
            finalQuery = "anime " + finalQuery;
        }
        const encodedQuery = encodeURIComponent(finalQuery);
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodedQuery}&limit=10&rating=g`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const items = parsed?.data;
                    if (items && items.length > 0) {
                        requestTimestamps.push(Date.now()); // Catat pemakaian
                        const randomIndex = Math.floor(Math.random() * items.length);
                        const selected = items[randomIndex];
                        const mp4Url = selected?.images?.original_mp4?.mp4 || selected?.images?.downsized_small?.mp4;
                        const giphyId = selected?.id || extractGiphyId(selected, mp4Url);

                        if (mp4Url) {
                            // Simpan ke cache lokal dengan deduplikasi ID unik Giphy (unlimited storage)
                            saveGifToCache(mp4Url, query, giphyId).catch(() => {});
                            return resolve({ type: 'url', source: mp4Url });
                        }
                    }
                    // Jika hasil kosong dari API, coba cek cache lokal
                    const localFile = getLocalCachedGif(query);
                    if (localFile) return resolve({ type: 'file', source: localFile });
                    resolve(null);
                } catch (e) {
                    console.error('[Giphy Error]', e);
                    const localFile = getLocalCachedGif(query);
                    if (localFile) return resolve({ type: 'file', source: localFile });
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error('[Giphy Request Error]', err);
            const localFile = getLocalCachedGif(query);
            if (localFile) return resolve({ type: 'file', source: localFile });
            resolve(null);
        });
    });
}

/**
 * Kirim GIF ke WhatsApp via Baileys (Bisa via URL atau Path File Lokal)
 * @param {object} sock - Baileys socket
 * @param {string} jid - Target jid
 * @param {string} query - Keyword pencarian GIF
 * @param {string} caption - Pesan caption (opsional)
 * @param {object} quoted - Quoted message (opsional)
 */
async function sendGiphy(sock, jid, query, caption = '', quoted = null) {
    try {
        const result = await fetchGiphyMp4(query);
        if (!result) return false;

        let videoPayload;
        if (result.type === 'file') {
            videoPayload = fs.readFileSync(result.source);
        } else {
            videoPayload = { url: result.source };
        }

        const sendOptions = {
            video: videoPayload,
            gifPlayback: true
        };
        if (caption) sendOptions.caption = caption;

        await sock.sendMessage(jid, sendOptions, quoted ? { quoted } : {});
        return true;
    } catch (err) {
        console.error('[sendGiphy Error]', err);
        // Fallback darurat jika kirim via URL gagal: coba kirim dari cache lokal jika ada
        try {
            const localFile = getLocalCachedGif(query);
            if (localFile) {
                const buffer = fs.readFileSync(localFile);
                const sendOptions = {
                    video: buffer,
                    gifPlayback: true
                };
                if (caption) sendOptions.caption = caption;
                await sock.sendMessage(jid, sendOptions, quoted ? { quoted } : {});
                return true;
            }
        } catch (e) {}
        return false;
    }
}

module.exports = {
    fetchGiphyMp4,
    sendGiphy,
    canSendAiGif,
    recordAiGifSent,
    isQuotaAvailable,
    getLocalCachedGif
};
