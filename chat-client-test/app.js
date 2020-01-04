const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');
 
ws.on('open', function open() {
  
});
 
ws.on('message', function incoming(msg) {
  const data = JSON.parse(msg);
  if(data.event == 'message') {
    console.log(`random guy : ${data.text}`);
  } else if(data.event == 'connected') {
    console.log(`connected with ID ${data.id}`);
  }
});

