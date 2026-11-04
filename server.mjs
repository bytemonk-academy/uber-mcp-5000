import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Gateway,roles,measurement} from './gateway.mjs';
const gateway=new Gateway(),sessions=new Map(),root=fileURLToPath(new URL('./public/',import.meta.url));
const port=Number(process.env.PORT||4318),origin=`http://127.0.0.1:${port}`;
const server=http.createServer(async(req,res)=>{
 const send=(status,obj,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj));};
 try{
 if(req.headers.host!==`127.0.0.1:${port}`)return send(403,{error:'Use the loopback URL printed by the server'});
 const url=new URL(req.url,origin),route=url.pathname;
 if(route.startsWith('/api/')){
 if(req.method==='POST'&&req.headers.origin!==origin)return send(403,{error:'Same-origin requests only'});
 let body={};if(req.method==='POST'){let raw='';for await(const c of req){raw+=c;if(raw.length>16000)return send(413,{error:'Request too large'});}try{body=JSON.parse(raw||'{}')}catch{return send(400,{error:'Invalid JSON'})}}
 const sid=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('demo_session='))?.split('=')[1];
 const role=sessions.get(sid)||'viewer';
 if(route==='/api/state'&&req.method==='GET')return send(200,{...gateway.state(),role,roles});
 if(route==='/api/discover'&&req.method==='GET')return send(200,{tools:gateway.discover(role,url.searchParams.get('q')||'')});
 if(route==='/api/schema'&&req.method==='GET'){const t=gateway.schema(role,url.searchParams.get('name'));return send(t?200:403,t||{error:'Schema unavailable for this caller'});}
 if(route==='/api/measure'&&req.method==='GET')return send(200,measurement());
 if(route==='/api/session'&&req.method==='POST'){if(!Object.hasOwn(roles,body.role))return send(400,{error:'Unknown role'});if(sid)sessions.delete(sid);const token=randomUUID();sessions.set(token,body.role);return send(200,{role:body.role},{'Set-Cookie':`demo_session=${token}; HttpOnly; SameSite=Strict; Path=/`});}
 if(route==='/api/invoke'&&req.method==='POST'){const result=gateway.invoke(role,body.name,body.arguments);return send(result.status,result.body);}
 if(route==='/api/reset'&&req.method==='POST'){gateway.reset();sessions.clear();return send(200,{ok:true},{'Set-Cookie':'demo_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
 if(route==='/api/enabled'&&req.method==='POST'){if(!Object.hasOwn(gateway.enabled,body.name)||typeof body.enabled!=='boolean')return send(400,{error:'Invalid configuration'});gateway.enabled[body.name]=body.enabled;gateway.event('control plane','owner configuration changed',{tool:body.name,enabled:body.enabled});return send(200,{ok:true});}
 return send(404,{error:'Unknown endpoint'});
 }
 if(req.method!=='GET')return send(405,{error:'Method not allowed'});
 const file=path.resolve(root,'.'+decodeURIComponent(route==='/'?'/index.html':route));if(!file.startsWith(root))return send(403,{error:'Forbidden'});
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch(e){if(!res.headersSent)send(500,{error:'Request failed'});else res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(`ByteMonk local demo: ${origin}\nFictional data. No external services. Ctrl+C stops the demo.`));
