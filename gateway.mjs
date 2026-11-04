export const roles = {viewer:{label:'Support Viewer',allow:['get_trip','get_payment']},operator:{label:'Refund Operator',allow:['get_trip','get_payment','issue_refund']}};
const input=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const trip={type:'string',description:'The fictional trip identifier, for example TRIP-1042.'};
export const tools=[
 {name:'get_trip',description:'Read trip status, fare in cents, and payment reference for a support investigation.',inputSchema:input({trip_id:trip})},
 {name:'get_payment',description:'Read payment status, charged amount in cents, and refunded status for a trip.',inputSchema:input({trip_id:trip})},
 {name:'issue_refund',description:'Refund the full charged fare for an eligible cancelled trip. Reject duplicate refunds and invalid amounts.',inputSchema:input({trip_id:trip,amount_cents:{type:'integer',minimum:1,description:'Full refund amount in cents. Use 2400 for TRIP-1042.'}})}];
export class Gateway {
 constructor(){this.reset()}
 reset(){this.enabled=Object.fromEntries(tools.map(t=>[t.name,true]));this.refunds=[];this.events=[];this.handlerCalls=0;this.seq=0;}
 event(layer,action,details){this.events.push({id:++this.seq,layer,action,...details});}
 state(){return {enabled:this.enabled,refunds:this.refunds,events:this.events,handlerCalls:this.handlerCalls};}
 discover(role,query=''){return tools.filter(t=>this.enabled[t.name]&&roles[role]?.allow.includes(t.name)&&`${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase())).map(({name,description})=>({name,description}));}
 schema(role,name){return this.discover(role).some(t=>t.name===name)?tools.find(t=>t.name===name):null;}
 invoke(role,name,args){
 const deny=(code,reason)=>{this.event('gateway','denied',{role,tool:name,reason});return {status:code,body:{ok:false,reason,backend_reached:false}}};
 if(!roles[role])return deny(401,'Unknown identity');
 const tool=tools.find(t=>t.name===name);if(!tool)return deny(404,'Unknown tool');
 if(!this.enabled[name])return deny(403,'Tool disabled by owner');
 if(!roles[role].allow.includes(name))return deny(403,'Caller is not allowed to use this tool');
 const props=tool.inputSchema.properties;
 if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(props,k))||tool.inputSchema.required.some(k=>!Object.hasOwn(args,k))||typeof args.trip_id!=='string'||(name==='issue_refund'&&(!Number.isSafeInteger(args.amount_cents)||args.amount_cents<=0)))return deny(400,'Invalid tool arguments');
 this.event('gateway','allowed',{role,tool:name});this.handlerCalls++;this.event('backend','handler entered',{role,tool:name});
 const reject=reason=>{this.event('backend','rejected',{role,tool:name,reason});return {status:422,body:{ok:false,reason,backend_reached:true}}};
 if(args.trip_id!=='TRIP-1042')return reject('Trip not found');
 let result;
 if(name==='get_trip')result={trip_id:args.trip_id,status:'cancelled',fare_cents:2400,currency:'USD',payment_id:'PAY-2042'};
 if(name==='get_payment')result={payment_id:'PAY-2042',trip_id:args.trip_id,charged_cents:2400,currency:'USD',refunded:this.refunds.length>0};
 if(name==='issue_refund'){
 if(args.amount_cents!==2400)return reject('Refund must equal the full charged fare of 2400 cents');
 if(this.refunds.length)return reject('Trip already refunded');
 result={refund_id:'REF-0001',...args,currency:'USD',status:'simulated'};this.refunds.push(result);
 }
 this.event('backend',name==='issue_refund'?'refund created':'read completed',{role,tool:name});return {status:200,body:{ok:true,result,backend_reached:true}};
 }
}
const discoveryTools=[
 {name:'discover_tools',description:'Search enabled tools available to the caller.',inputSchema:input({query:{type:'string'}})},
 {name:'get_tool_schema',description:'Fetch the input schema for one allowed tool.',inputSchema:input({name:{type:'string'}})},
 {name:'invoke_tool',description:'Execute a tool through the gateway. The server checks the session identity and permission.',inputSchema:input({name:{type:'string'},arguments:{type:'object'}})}];
export function measurement(){
 const user={role:'user',content:'Read trip TRIP-1042.'};
 const result=tools.filter(t=>t.name==='get_trip').map(({name,description})=>({name,description}));
 const messages=[user,{role:'assistant',tool_call:{name:'discover_tools',arguments:{query:'get_trip'}}},{role:'tool',name:'discover_tools',content:result},{role:'assistant',tool_call:{name:'get_tool_schema',arguments:{name:'get_trip'}}},{role:'tool',name:'get_tool_schema',content:tools[0]}];
 const eager=[{tools,messages:[user]}];
 const incremental=[{tools:discoveryTools,messages:[user]},{tools:discoveryTools,messages:messages.slice(0,3)},{tools:discoveryTools,messages}];
 const bytes=x=>Buffer.byteLength(JSON.stringify(x),'utf8');
 const summarise=inputs=>({initial:bytes(inputs[0]),cumulative:inputs.reduce((n,x)=>n+bytes(x),0),per_request:inputs.map(bytes),inputs});
 return {unit:'UTF-8 bytes',serialization:'Compact JSON.stringify, no whitespace',scope:'Illustrative model input snapshots through tool selection, before business-tool execution. Full history and definitions resent at each step. No LLM call, tokenizer, caching, transport overhead, or result response included.',eager:summarise(eager),incremental:summarise(incremental)};
}
