const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');
test('bulk prices require admin, explicit confirmation, valid ranges and a fresh revision', async () => {
  let allowed = false, calls = 0, rpcError = null, sent;
  const route = loadTs('app/api/admin/partners/prices/route.ts', {
    '@/lib/auth/requireApiRole': { requireApiRole: async roles => {
      assert.deepEqual(roles, ['admin']);
      return allowed ? {success:true} : {success:false,response:new Response(null,{status:403})};
    } },
    '@/lib/supabase/service': { createServiceClient: () => ({rpc: async (name,args) => { assert.equal(name,'save_all_partner_price_grids'); calls++;sent=args; return {data:{updatedCount:3,revision:'b'.repeat(32)},error:rpcError}; }}) },
  });
  const body = {ranges:[{id:123,minimumAge:0,maximumAge:65,oneYearPrice:150,twoYearPrice:300,isActive:true}],revision:'a'.repeat(32),confirmAll:true};
  const put = data => route.PUT(new Request('https://example.test/api/admin/partners/prices',{method:'PUT',body:JSON.stringify(data)}));
  assert.equal((await put(body)).status,403); assert.equal(calls,0);
  allowed=true;
  for(const bad of [null,{...body,confirmAll:false},{...body,revision:''},{...body,ranges:[]},{...body,ranges:[...body.ranges,{...body.ranges[0],id:124}]}]) assert.equal((await put(bad)).status,400);
  assert.equal(calls,0);
  const response=await put(body);assert.equal(response.status,200);assert.equal((await response.json()).updatedCount,3);assert.equal(sent.p_ranges[0].id,undefined);
  rpcError={code:'PT409'};assert.equal((await put(body)).status,409);
  rpcError={code:'23P01'};assert.equal((await put(body)).status,400);
  rpcError={code:'unknown',message:'private database details'};const failure=await put(body);assert.equal(failure.status,500);assert.ok(!(await failure.text()).includes('private database details'));
});
