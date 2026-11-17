const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

test('notification requests and renewals start concurrently and preserve the result', async () => {
  const started = [], pending = [];
  const query = table => new Proxy({table}, {get(target,key){return key === 'table' ? table : () => query(table);}});
  const { getNotificationSummary } = loadTs('lib/admin/getNotificationSummary.ts', {
    '@/lib/supabase/service': { createServiceClient: () => ({from:query}) },
    '@/lib/supabase/readAll': { readAll: q => {started.push(q.table);return new Promise(resolve=>pending.push(resolve));} },
  });
  const result = getNotificationSummary({role:'admin',userId:'admin-a'});
  assert.deepEqual(started, ['insurance_requests','insurance_renewals']);
  pending.forEach(resolve=>resolve({data:[],error:null}));
  assert.deepEqual(await result,{count:0,level:'none',renewalCount:0});
});

test('deduplicated identity still checks every caller’s role and rejects invalid sessions', async () => {
  const scenarios=[
    {user:null,error:null,allowed:['admin'],target:'/admin/connexion'},
    {user:{app_metadata:{role:'admin'}},error:{message:'revoked'},allowed:['admin'],target:'/admin/connexion'},
    {user:{app_metadata:{role:'agent'},user_metadata:{role:'admin'}},error:null,allowed:['admin'],target:'/admin/acces-refuse'},
    {user:{app_metadata:{role:'partner'}},error:null,allowed:['admin','agent'],target:'/admin/acces-refuse'},
  ];
  for(const s of scenarios){
    const {requireRole}=loadTs('lib/auth/requireRole.ts', {
      './getVerifiedUser': {getVerifiedUser:async()=>({data:{user:s.user},error:s.error})},
      'next/navigation': {redirect:path=>{throw new Error(path);}},
    });
    await assert.rejects(()=>requireRole(s.allowed), e=>e.message===s.target);
  }
  let calls=0;
  // Model one React render cache scope; a new renderer gets a fresh cache.
  const cache=fn=>{let result;return()=>result ??= fn();};
  const {requireRole}=loadTs('lib/auth/requireRole.ts',{
    react:{cache},
    '@/lib/supabase/server':{createServerSupabaseClient:async()=>({auth:{getUser:async()=>{calls++;return {data:{user:{id:'a',app_metadata:{role:'agent'}}},error:null};}}})},
    'next/navigation':{redirect:path=>{throw new Error(path);}},
  });
  await Promise.all([requireRole(['admin','agent']),requireRole(['agent'])]);
  assert.equal(calls,1);
  await assert.rejects(()=>requireRole(['admin']),e=>e.message==='/admin/acces-refuse');
});
