#!/bin/bash
while true; do
    echo "Memulai Ngrok Web Dashboard..."
    ngrok http 3000 --log=stdout
    echo "Ngrok terputus (Error Code $?), mengulang dalam 3 detik..."
    sleep 3
done
