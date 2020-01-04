const assert = require('assert');
const WebSocket = require('ws');
 
const wss = new WebSocket.Server({ port: 8080 });

let matching = new Map();
let waitingQueue = [];
let curId = 1;

wss.on('connection', function connection(ws) {
  let myId = curId++;
  ws.id = myId;

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
});

