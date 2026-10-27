const settings=window.MATH_MATCH||{},totalSlides=settings.totalSlides||7,questionCount=settings.questionCount||3,setup=document.querySelector('#setup'),remote=document.querySelector('#remote'),status=document.querySelector('#status'),dot=document.querySelector('#statusDot'),server=document.querySelector('#server'),room=document.querySelector('#room'),key=document.querySelector('#key'),slide=document.querySelector('#slide');let socket,current=0,question=1,seconds=settings.defaultSeconds||60;
const questionButtons=Array.from({length:questionCount},(_,index)=>'<button data-question="'+(index+1)+'" class="'+(index===0?'selected':'')+'">QUESTION<br><b>'+(index+1)+'</b></button>').join('');
remote.innerHTML='<p id="slide">SLIDE 1 / '+totalSlides+'</p><button class="next" id="next">NEXT <span>→</span></button><div class="row"><button id="prev">← BACK</button><button class="reset" id="reset">START OVER</button></div><section class="question-controls"><p>QUESTION ROUND</p><div class="topics">'+questionButtons+'</div><label>Timer <input id="seconds" type="number" min="5" max="600" value="'+seconds+'"> seconds</label><button class="start-round" id="startRound">START QUESTION</button><div class="round-actions"><button id="answer">SHOW ANSWER</button><button id="restart">RESTART TIMER</button><button id="moveOn">MOVE ON</button></div></section><button class="disconnect" id="disconnect">Disconnect</button>';
function showStatus(text,ready=false){status.textContent=text;dot.classList.toggle('ready',ready)}function send(message){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message))}function update(){slide.textContent='SLIDE '+(current+1)+' / '+totalSlides;send({type:'go',index:current})}function roundMessage(type){return{type,question,count:1,seconds}}
document.querySelector('#connect').addEventListener('click',()=>{const base=server.value.trim().replace(/\/$/,'');if(!base||!room.value.trim()||!key.value){showStatus('Enter all fields');return}settings.wake?.(base);socket=new WebSocket(base+'?role=controller&room='+encodeURIComponent(room.value.trim()));showStatus('Connecting…');socket.addEventListener('open',()=>send({type:'auth',key:key.value}));socket.addEventListener('message',event=>{try{if(JSON.parse(event.data).type==='authed'){setup.hidden=true;remote.hidden=false;showStatus('Connected',true);update()}}catch{}});socket.addEventListener('close',()=>showStatus('Disconnected'));socket.addEventListener('error',()=>showStatus('Could not connect'))});
document.querySelector('#next').addEventListener('click',()=>{current=Math.min(current+1,totalSlides-1);update()});document.querySelector('#prev').addEventListener('click',()=>{current=Math.max(current-1,0);update()});document.querySelector('#reset').addEventListener('click',()=>{current=0;update()});document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{question=Number(button.dataset.question);document.querySelectorAll('[data-question]').forEach(item=>item.classList.toggle('selected',item===button))}));document.querySelector('#seconds').addEventListener('change',event=>{seconds=Math.max(5,Math.min(600,Number(event.target.value)||60));event.target.value=seconds});document.querySelector('#startRound').addEventListener('click',()=>send(roundMessage('question')));document.querySelector('#answer').addEventListener('click',()=>send(roundMessage('answer')));document.querySelector('#restart').addEventListener('click',()=>send(roundMessage('restart')));document.querySelector('#moveOn').addEventListener('click',()=>send({type:'move-on'}));document.querySelector('#disconnect').addEventListener('click',()=>{socket?.close();remote.hidden=true;setup.hidden=false});
setTimeout(()=>{
  const topics=document.querySelector('.topics');
  if(!topics)return;
  const back=document.createElement('button');
  back.type='button';
  back.textContent='← GO BACK TO TOPICS';
  back.style.cssText='display:none;background:#fff;color:#172133;border:2px solid #172133;margin-top:10px';
  topics.insertAdjacentElement('afterend',back);
  const topicButtons=[...topics.querySelectorAll('[data-question]')];
  const showTopics=()=>{topics.style.display='grid';back.style.display='none'};
  const focusTopic=selected=>{
    topicButtons.forEach(button=>{button.style.display=button===selected?'block':'none'});
    back.style.display='block';
  };
  topicButtons.forEach(button=>button.addEventListener('click',()=>focusTopic(button)));
  back.addEventListener('click',showTopics);
},0);
