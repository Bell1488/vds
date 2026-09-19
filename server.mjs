import http from 'node:http';
import https from 'node:https';
import {readFile, stat} from 'node:fs/promises';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SocksProxyAgent} from 'socks-proxy-agent';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=__dirname;

// Lightweight .env loader, no dependency required.
const envPath=path.join(root,'.env');
if(existsSync(envPath)){
  for(const raw of readFileSync(envPath,'utf8').split(/\r?\n/)){
    const line=raw.trim(); if(!line||line.startsWith('#')||!line.includes('=')) continue;
    const i=line.indexOf('='); const k=line.slice(0,i).trim(); let v=line.slice(i+1).trim();
    if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    if(!(k in process.env)) process.env[k]=v;
  }
}

const PORT=Number(process.env.PORT||8080);
const METRIKA_ID=(process.env.YANDEX_METRIKA_ID||'').replace(/\D/g,'');
const MAX_BODY=32*1024;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json; charset=utf-8'};
let rateCache={expires:0,data:null};

// SOCKS5 proxy setup for Telegram in Russia
const SOCKS_PROXY=process.env.SOCKS5_PROXY; // e.g., socks5h://127.0.0.1:1080
let telegramAgent=null;
if(SOCKS_PROXY){
  try{
    telegramAgent=new SocksProxyAgent(SOCKS_PROXY);
    console.log(`Using SOCKS5 proxy for Telegram: ${SOCKS_PROXY.replace(/\/\/[^:]+:[^@]+@/,'//***@')}`);
  }catch(e){
    console.error('Failed to initialize SOCKS5 proxy:',e.message);
  }
}

function telegramRequest(method, payload){
  return new Promise((resolve,reject)=>{
    const body=JSON.stringify(payload||{});
    const req=https.request(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,{
      method:'POST',
      agent:telegramAgent||undefined,
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},
      timeout:8000
    },res=>{
      const chunks=[];
      res.on('data',chunk=>chunks.push(chunk));
      res.on('end',()=>{
        const text=Buffer.concat(chunks).toString('utf8');
        let data;
        try{data=JSON.parse(text)}catch{ return reject(new Error(`telegram_invalid_response_${res.statusCode}`)) }
        if(res.statusCode<200||res.statusCode>=300||!data.ok) return reject(new Error(`telegram_${res.statusCode||'error'}`));
        resolve(data);
      });
    });
    req.on('timeout',()=>req.destroy(new Error('telegram_timeout')));
    req.on('error',reject);
    req.end(body);
  });
}

const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function readJson(req){
  let size=0, chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY) throw new Error('body_too_large');chunks.push(chunk)}
  const text=Buffer.concat(chunks).toString('utf8');
  return text?JSON.parse(text):{};
}

function extractRate(xml,code){
  const blocks=[...xml.matchAll(/<Valute\b[^>]*>([\s\S]*?)<\/Valute>/g)].map(m=>m[1]);
  for(const b of blocks){
    if(new RegExp(`<CharCode>\\s*${code}\\s*<\\/CharCode>`).test(b)){
      const val=b.match(/<Value>\s*([0-9,]+)\s*<\/Value>/)?.[1];
      const nom=b.match(/<Nominal>\s*(\d+)\s*<\/Nominal>/)?.[1]||'1';
      if(val) return Number(val.replace(',','.'))/Number(nom);
    }
  }
  return null;
}

async function getRates(){
  const now=Date.now(); if(rateCache.data&&rateCache.expires>now) return rateCache.data;
  const fallback={RUB:1,CNY:12.5457,USD:84.1732,updated:'17.09.2026',source:'Банк России · резервный курс'};
  try{
    const r=await fetch('https://www.cbr.ru/scripts/XML_daily.asp',{headers:{'User-Agent':'VDS-Logistic/1.0'},signal:AbortSignal.timeout(5000)});
    if(!r.ok) throw new Error(`cbr_${r.status}`);
    const xml=await r.text(); const usd=extractRate(xml,'USD'), cny=extractRate(xml,'CNY');
    if(!(usd>0&&cny>0)) throw new Error('rates_missing');
    const date=xml.match(/Date="([^"]+)"/)?.[1]||'сегодня';
    const data={RUB:1,CNY:cny,USD:usd,updated:date,source:'Банк России'};
    rateCache={expires:now+4*60*60*1000,data}; return data;
  }catch(e){rateCache={expires:now+15*60*1000,data:fallback};return fallback}
}

async function deliverLead(data){
  const tasks=[];
  const webhook=process.env.LEAD_WEBHOOK_URL;
  if(webhook){
    tasks.push(fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw new Error(`webhook_${r.status}`)}));
  }
  const token=process.env.TELEGRAM_BOT_TOKEN, chat=process.env.TELEGRAM_CHAT_ID;
  if(token&&chat){
    const p=data.payment||{};
    const lines=[
      '<b>Новая заявка VDS Logistic</b>',
      `Источник: ${esc(data.source||'site')}`,
      `Имя: ${esc(data.name)}`,
      `Контакт: ${esc(data.contact)}`,
      data.from?`Откуда: ${esc(data.from)}`:null,
      data.to?`Куда: ${esc(data.to)}`:null,
      data.cargo?`Груз: ${esc(data.cargo)}`:null,
      p.summary?`Платёж: ${esc(p.summary)}`:null,
      data.payment_comment?`Дополнительная информация: ${esc(data.payment_comment)}`:null,
      data.utm_source?`UTM source: ${esc(data.utm_source)}`:null,
      data.utm_campaign?`UTM campaign: ${esc(data.utm_campaign)}`:null,
      data.utm_term?`UTM term: ${esc(data.utm_term)}`:null,
      data.yclid?`yclid: ${esc(data.yclid)}`:null,
      data.page?`Страница: ${esc(data.page)}`:null,
    ].filter(Boolean).join('\n');

    tasks.push(
      telegramRequest('sendMessage',{chat_id:chat,text:lines,parse_mode:'HTML',disable_web_page_preview:true})
    );
  }
  if(!tasks.length) throw new Error('lead_destination_not_configured');
  await Promise.all(tasks);
}

async function serveStatic(req,res,url){
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/'||pathname==='') pathname='/index.html';
  if(pathname.endsWith('/')) pathname+='index.html';
  const clean=path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const full=path.join(root,clean);
  if(!full.startsWith(root)) return false;
  try{
    const st=await stat(full); if(!st.isFile()) return false;
    const ext=path.extname(full).toLowerCase(); let body=await readFile(full);
    if(ext==='.html'&&METRIKA_ID){body=Buffer.from(body.toString('utf8').replace(/data-metrika-id="[^"]*"/g,`data-metrika-id="${METRIKA_ID}"`))}
    const headers={'Content-Type':mime[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
    if(ext==='.html') headers['Cache-Control']='no-cache'; else if(pathname.startsWith('/assets/')) headers['Cache-Control']='public, max-age=86400';
    res.writeHead(200,headers);res.end(body);return true;
  }catch{return false}
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/health') return json(res,200,{ok:true,service:'vds-logistic'});
    if(req.method==='GET'&&url.pathname==='/api/rates') return json(res,200,await getRates());
    if(req.method==='POST'&&url.pathname==='/api/lead'){
      const data=await readJson(req);
      if(data.website) return json(res,200,{ok:true}); // honeypot: silently accept bots
      if(!String(data.name||'').trim()||!String(data.contact||'').trim()) return json(res,422,{ok:false,error:'name_and_contact_required'});
      await deliverLead({...data,received_at:new Date().toISOString()});
      return json(res,200,{ok:true});
    }
    if(req.method==='GET'||req.method==='HEAD'){
      if(await serveStatic(req,res,url)) return;
      try{
        const body=await readFile(path.join(root,'404.html'));
        res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(body);return;
      }catch{}
    }
    json(res,404,{ok:false,error:'not_found'});
  }catch(e){
    const status=e.message==='body_too_large'?413:e instanceof SyntaxError?400:503;
    json(res,status,{ok:false,error:status===503?'service_unavailable':'bad_request'});
  }
});
server.listen(PORT,()=>console.log(`VDS Logistic: http://localhost:${PORT}`));
