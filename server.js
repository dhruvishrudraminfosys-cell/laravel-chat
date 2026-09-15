const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// 1. Static folders pehla declare karo jethi static files ane ads.txt fast load thay
app.use(express.static(path.join(__dirname, 'public')));

// 2. Clean routes for the pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

const uploadDirectory = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

app.use('/uploads', express.static(uploadDirectory));

const storage = multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname);
        callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    }
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const ImageUrl = `/uploads/${req.file.filename}`;
        const payload = {
            type: 'image',
            url: ImageUrl,
            user: req.body.user || 'Anonymous',
            timestamp: new Date().toISOString()
        };
        broadcast(payload, null);
        return res.status(200).json({ message: 'File uploaded successfully', url: ImageUrl });
    } catch (error) {
        console.error('Error during file upload:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

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
            broadcast(parsedMessage, ws);
        } catch (error) {
            console.log('Failed to parse message', error);
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