const assert = require('assert');
const WebSocket = require('ws');
 
const wss = new WebSocket.Server({ port: 8080 });

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
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  let myId = curId;
  curId = (curId + 1) % MAX_NODES;
  ws.id = myId;
  ws.ip = req.connection.remoteAddress;

  if(waitingQueue.length > 0) {
    let partner = waitingQueue.shift();
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
  } else {
    waitingQueue.push(ws);
  }

  ws.on('message', function incoming(msgText) {
    let other = matching.get(ws.id);
    let partner = matching.get(ws.id);
    const msg = {
      'event': 'message',
      'text': msgText
    }
    partner.send(msg);
  });

  ws.on('close', () => {
    console.log(`disclosed ID : ${ws.id}`);
    const partner = matching.get(ws.id);
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