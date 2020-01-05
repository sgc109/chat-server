const assert = require('assert');
// const https = require('https');
const WebSocket = require('ws');
 
// const server = https.createServer() // for https
const wss = new WebSocket.Server({port:8080});

const MAX_NODES = 1000000;
const BROKEN_CHECK_INTERVAL = 10000;
let matching = new Map();
let waitingQueue = [];
let curId = 1;

function noop() {}
 
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', function connection(ws, req) {
  console.log('connection recieved!');
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  let myId = curId;
  curId = (curId + 1) % MAX_NODES;
  ws.id = myId;
  ws.ip = req.connection.remoteAddress;

  let isConnected = false;
  while(waitingQueue.length > 0) {
    let partner = waitingQueue.shift();
    if(partner.readyState !== WebSocket.OPEN) continue;
    isConnected = true;

    assert(myId != partner.id);
    assert(myId)
    assert(partner && partner.id);

    matching.set(myId, partner);
    matching.set(partner.id, ws);

    console.log(`connection built! between ${partner.id} and ${myId}`);

    const myMsg = {
      'event': 'connected',
      'id': myId
    }
    const partnerMsg = {
      'event': 'connected',
      'id': partner.id
    }
    ws.send(JSON.stringify(myMsg));
    partner.send(JSON.stringify(partnerMsg));
  }
  if(!isConnected) {
    waitingQueue.push(ws);
  }

  ws.on('message', function incoming(msg) {
    console.log('message recieved!');
    let partner = matching.get(ws.id);
    if(!partner) {
      console.log('when not connected to other user yet, but sent a message for random reason');
      return;
    }

    partner.send(msg);
  });

  ws.on('close', () => {
    console.log(`disclosed ID : ${ws.id}`);
    const partner = matching.get(ws.id);
    if(!partner) return; // when not connected to other user yet, and try to close connection
    if(partner.readyState === WebSocket.OPEN) {
      console.log(`also disclosed ID : ${partner.id}`);
      partner.terminate();
    }
  });
});

const interval = setInterval(function ping() {
  console.log('perform regular broke connection check(eg. by pulling out chord)!');
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log(`terminate id : ${ws.id}`);
      const partner = matching.get(ws.id);
      const msg = {
        'event': 'closed',
      }
      try {
        partner.send(JSON.stringify(msg));
      } catch {
        console.log('call send() function after connection being closed');
      }
      return ws.terminate();
    }
 
    ws.isAlive = false;
    ws.ping(noop);
  });
}, BROKEN_CHECK_INTERVAL);

// server.listen(8080); // for https