const fs = require('fs');
const path = require('path');

const memoryPath = path.join(__dirname, '../database/yuki_memory.json');

function getMemory() {
    try {
        if (!fs.existsSync(memoryPath)) {
            fs.writeFileSync(memoryPath, JSON.stringify({}));
        }
        return JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveMemory(data) {
    try {
        fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2));
    } catch (e) {}
}

function getChatHistory(senderJid) {
    const memory = getMemory();
    if (!memory[senderJid]) {
        memory[senderJid] = [];
    }
    return memory[senderJid];
}

function addChatHistory(senderJid, role, text) {
    const memory = getMemory();
    if (!memory[senderJid]) memory[senderJid] = [];
    
    memory[senderJid].push({ role, content: text });
    
    // Simpan maksimal 10 chat terakhir per entitas agar tidak berat
    if (memory[senderJid].length > 10) {
        memory[senderJid].shift();
    }
    
    saveMemory(memory);
}

// Memori RAM khusus untuk konteks grup agar tidak membebani database disk terus-menerus
const groupMemoryRAM = {};

function addGroupContext(groupId, senderName, text) {
    if (!groupMemoryRAM[groupId]) groupMemoryRAM[groupId] = [];
    
    groupMemoryRAM[groupId].push({ sender: senderName, content: text });
    
    // Simpan maksimal 10 pesan terakhir grup di RAM
    if (groupMemoryRAM[groupId].length > 10) {
        groupMemoryRAM[groupId].shift();
    }
}

function getGroupContext(groupId) {
    return groupMemoryRAM[groupId] || [];
}

module.exports = { getChatHistory, addChatHistory, addGroupContext, getGroupContext };
