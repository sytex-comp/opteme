const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Use the API Key from Google Cloud Environment Variables
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Open a live streaming connection to Deepgram
    const dgConnection = deepgram.listen.live({
        model: "nova-3",
        interim_results: true,
        smart_format: true,
        encoding: "linear16",
        sample_rate: 16000,
    });

    dgConnection.on('open', () => {
        console.log('Deepgram connection opened');
        
        // When we get audio from the user, send it to Deepgram
        ws.on('message', (data) => {
            dgConnection.send(data);
        });
    });

    // When Deepgram sends text back, send it to the user
    dgConnection.on('transcriptReceived', (packet) => {
        const transcript = packet.channel.alternatives[0].transcript;
        if (transcript) {
            ws.send(JSON.stringify({ text: transcript, isFinal: packet.is_final }));
        }
    });

    ws.on('close', () => {
        dgConnection.finish();
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
