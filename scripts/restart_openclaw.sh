#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.nvm/versions/node/v26.10.0/bin:$PATH"

# Cari binary openclaw
OPENCLAW_BIN="$(which openclaw 2>/dev/null || echo "$HOME/.nvm/versions/node/v26.10.0/bin/openclaw")"

# Bunuh instance openclaw-gateway yang lama jika ada
pkill -f "openclaw-gateway" 2>/dev/null
pkill -f "openclaw gateway" 2>/dev/null
sleep 2

# Jalankan ulang openclaw gateway di background dengan nohup
nohup "$OPENCLAW_BIN" gateway run > /tmp/openclaw-gateway.log 2>&1 &

echo "✅ OpenClaw Gateway berhasil direstart di background! PID: $!"
