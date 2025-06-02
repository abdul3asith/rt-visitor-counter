// const express = require('express');
// const http = require('http');
// const WebSocket = require('ws');
// const geoip = require('geoip-lite');
// const { disconnect } = require('process');
// const fs = require('fs');
// const redis = require('redis')
// const path = require('path');


// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });


// // redis clients
// const pub = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
// const sub = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

// await pub.connect();
// await sub.connect();

// let onlineUsers = 0;

// // log events to a file
// function logEvent(event){
//     fs.appendFileSync('./logs/visitor.log', event + '\n')
// }

// wss.on('connection', function connection(ws) {
//     const ip = ws._socket.remoteAddress.replace('::ffff:', '') // Clean up IPv4
//     const geo = geoip.lookup(ip);
//     const location = geo ? `${geo.city}, ${geo.country}`: 'Unknown';
//     const timestamp = new Date().toISOString();
//     const disconnectTime = new Date().toISOString(); 

//     onlineUsers++;
//     broadcastOnlineCount();

// // Log the Connection
// logEvent(`[${timestamp}] CONNECT from ${ip} (${location})`)


//     ws.on('close', () => {
//         onlineUsers--;
//         broadcastOnlineCount();
//         // disconnect log
//         logEvent(`[${disconnectTime}] DISCONNECT from ${ip} (${location})`)
//     })
// })


// function broadcastOnlineCount() {
//     wss.clients.forEach(client => {
//         if(client.readyState === WebSocket.OPEN){
//             client.send(JSON.stringify({onlineUsers}))
//         }
//     })
// }

// app.use(express.static('../frontend'));

// server.listen(3000, () => {
//     console.log('Server is listening on PORT 3000')
// })

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');
const geoip = require('geoip-lite');
const fs = require('fs');
const path = require('path');

// Create app and server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Redis clients
const pub = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const sub = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

pub.connect().then(() => console.log('Redis pub connected'));
sub.connect().then(() => console.log('Redis sub connected'));
// Create log folder if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFile = path.join(logDir, 'visitor.log');
function logEvent(text) {
  fs.appendFileSync(logFile, text + '\n');
  console.log(text);
}

let onlineUsers = 0;

function broadcastOnlineCount() {
  const message = JSON.stringify({ type: 'onlineUsers', count: onlineUsers });
  pub.publish('user_updates', message);
}

sub.subscribe('user_updates', (message) => {
  const data = JSON.parse(message);
  if (data.type === 'onlineUsers') {
    // Broadcast to clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ onlineUsers: data.count }));
      }
    });
  }
});

wss.on('connection', (ws) => {
  const ip = ws._socket.remoteAddress.replace('::ffff:', '');
  const geo = geoip.lookup(ip);
  const location = geo ? `${geo.city || 'Unknown'}, ${geo.country}` : 'Unknown';
  const timestamp = new Date().toISOString();

  onlineUsers++;
  logEvent(`[${timestamp}] CONNECT from ${ip} (${location})`);
  broadcastOnlineCount();

  ws.on('close', () => {
    onlineUsers--;
    const disconnectTime = new Date().toISOString();
    logEvent(`[${disconnectTime}] DISCONNECT from ${ip} (${location})`);
    broadcastOnlineCount();
  });
});


app.use(express.static(path.join(__dirname, 'frontend'))); // Adjust path if needed

console.log('Serving static files from:', path.join(__dirname, 'frontend'));

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;"
  );
  next();
});