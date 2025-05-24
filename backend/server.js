const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const geoip = require('geoip-lite');
const { disconnect } = require('process');
const fs = require('fs');


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


let onlineUsers = 0;

// log events to a file
function logEvent(event){
    fs.appendFileSync('./logs/visitor.log', event + '\n')
}

wss.on('connection', function connection(ws) {
    const ip = ws._socket.remoteAddress.replace('::ffff:', '') // Clean up IPv4
    const geo = geoip.lookup(ip);
    const location = geo ? `${geo.city}, ${geo.country}`: 'Unknown';
    const timestamp = new Date().toISOString();
    const disconnectTime = new Date().toISOString(); 

    onlineUsers++;
    broadcastOnlineCount();

// Log the Connection
logEvent(`[${timestamp}] CONNECT from ${ip} (${location})`)


    ws.on('close', () => {
        onlineUsers--;
        broadcastOnlineCount();
        // disconnect log
        logEvent(`[${disconnectTime}] DISCONNECT from ${ip} (${location})`)
    })
})


function broadcastOnlineCount() {
    wss.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({onlineUsers}))
        }
    })
}

app.use(express.static('../frontend'));

server.listen(3000, () => {
    console.log('Server is listening on PORT 3000')
})