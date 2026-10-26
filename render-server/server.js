const http=require("http");
const WebSocket=require("ws");
const port=process.env.PORT||10000;
const controllerKey=process.env.CONTROLLER_KEY;
if(!controllerKey)console.warn("CONTROLLER_KEY is not set. Controller connections will be denied.");
const server=http.createServer((_,response)=>{response.writeHead(200,{"content-type":"application/json"});response.end(JSON.stringify({ok:true}))});
const wss=new WebSocket.Server({server,path:"/ws"});
const rooms=new Map();
function roomClients(name){if(!rooms.has(name))rooms.set(name,{clients:new Set(),lastMessage:null});return rooms.get(name)}
wss.on("connection",(socket,request)=>{
  const url=new URL(request.url,"http://localhost"),room=(url.searchParams.get("room")||"math-match").slice(0,80),role=url.searchParams.get("role"),channel=roomClients(room);
  if(role==="controller"&&url.searchParams.get("key")!==controllerKey){socket.close(1008,"Unauthorized");return}
  if(role!=="controller"&&role!=="display"){socket.close(1008,"Unknown role");return}
  channel.clients.add(socket);
  if(role==="display"&&channel.lastMessage)socket.send(channel.lastMessage);
  socket.on("message",raw=>{
    if(role!=="controller"||raw.length>200)return;
    let message;try{message=JSON.parse(raw)}catch{return}
    const isSlide=message.type==="go"&&Number.isInteger(message.index)&&message.index>=0&&message.index<=50;
    const isRound=["question","answer","restart"].includes(message.type)&&["dummy-1","dummy-2","dummy-3"].includes(message.topic)&&message.number===1&&Number.isInteger(message.seconds)&&message.seconds>=5&&message.seconds<=600;
    const isMoveOn=message.type==="move-on";
    if(!isSlide&&!isRound&&!isMoveOn)return;
    channel.lastMessage=JSON.stringify(message);
    for(const client of channel.clients)if(client.readyState===WebSocket.OPEN)client.send(channel.lastMessage);
  });
  socket.on("close",()=>{channel.clients.delete(socket);if(channel.clients.size===0)rooms.delete(room)});
});
server.listen(port,"0.0.0.0",()=>console.log("Listening on "+port));
