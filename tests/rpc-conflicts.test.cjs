const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./load-ts.cjs');

for (const code of ['PT409', '40001']) {
  test(`Draft API returns conflict without retrying ${code}`, async () => {
    let calls = 0;
    const route = loadTs('app/api/partner/draft/route.ts', {
      '@/lib/auth/requireApiPartner': { requireApiPartner: async () => ({success:true,partner:{id:'partner'},user:{id:'actor'}}) },
      '@/lib/supabase/service': { createServiceClient: () => ({rpc:async () => {calls++;return {data:null,error:{code}};}}) },
    });
    const response = await route.PUT(new Request('http://localhost', {method:'PUT',body:JSON.stringify({version:1,payload:{firstName:'TEST'}})}));
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /autre fenêtre/);
    assert.equal(calls, 1);
  });

  test(`Refund API preserves a conflict response for ${code}`, async () => {
    let calls = 0;
    const route = loadTs('app/api/admin/accounting/refunds/route.ts', {
      '@/lib/auth/requireApiRole': { requireApiRole: async () => ({success:true,user:{id:'admin'}}) },
      '@/lib/supabase/service': { createServiceClient: () => ({rpc:async () => {calls++;return {data:null,error:{code}};}}) },
      'next/cache': {revalidatePath(){throw Error('Failed mutation must not revalidate');}},
    });
    const form = new FormData();
    for (const [key,value] of Object.entries({paymentId:'10000000-0000-4000-8000-000000000001',operationId:'10000000-0000-4000-8000-000000000002',amount:'20',date:'2026-09-24',method:'bank_transfer',reason:'Test',reference:'TEST'})) form.set(key,value);
    const response = await route.POST(new Request('http://localhost', {method:'POST',body:form}));
    assert.equal(response.status,409);
    assert.match((await response.json()).error,/déjà utilisée/);
    assert.equal(calls,1);
  });
}
