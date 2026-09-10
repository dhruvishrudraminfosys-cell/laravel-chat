const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

function broadcast(data, excludeClient) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws) => {
    console.log('A new client connected');
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            // Broadcast the message to all other connected clients (User B sees User A's message)
            broadcast(parsedMessage, ws);
        } catch (error) {
            console.error('Failed to parse message', error);
        }
    });
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});         