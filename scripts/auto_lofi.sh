#!/bin/bash
while true; do
    echo "Memulai Lofi Stream (Hemat Kuota Offline - Playlist Baru)..."
    rm -rf ~/.config/mpv/watch_later/*
    
    mpv --loop-file=inf --no-video --no-resume-playback --cache=yes --demuxer-max-bytes=1024MiB --volume=70 "/home/aquagrim/music/lofi-new.m4a"
    echo "Lofi terputus (Error Code $?), mengulang dalam 3 detik..."
    sleep 3
done