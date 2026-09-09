const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createApplication } = require('../api/_lib/airtable');
const { FIELD } = require('../api/_lib/study-requests');
const studyHandler = require('../api/study-requests');
const startHandler = require('../api/verification-start');
const checkHandler = require('../api/verification-check');
const { signBotProof } = require('../api/_lib/bot');

const req = body => ({ method: 'POST', headers: { origin: 'https://campustakes.com', 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.201' }, body });
const res = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.code=n; return this; }, json(body) { this.body=body; return this; } });

test('shared campus IP supports distinct students while contact resend budget remains enforced', async () => {
  const original = global.fetch;
  Object.assign(process.env, { TWILIO_ACCOUNT_SID:'test', TWILIO_AUTH_TOKEN:'test', TWILIO_VERIFY_SERVICE_SID:'test' });
  let sends=0;
  global.fetch=async () => { sends++; return {ok:true,json:async()=>({status:'pending'})}; };
  try {
    for(let i=0;i<8;i++) { const response=res(); await startHandler(req({channel:'email',value:`nat${i}@psu.edu`}),response); assert.equal(response.code,200); }
    for(let i=0;i<2;i++) { const response=res(); await startHandler(req({channel:'email',value:'nat0@psu.edu'}),response); assert.equal(response.code,200); }
    const blocked=res(); await startHandler(req({channel:'email',value:'nat0@psu.edu'}),blocked); assert.equal(blocked.code,429); assert.equal(sends,10);
  } finally { global.fetch=original; }
});

test('expired bot proof accepts a fresh challenge during code verification', async () => {
  const original=global.fetch;
  Object.assign(process.env,{TURNSTILE_SITE_KEY:'test',TURNSTILE_SECRET_KEY:'test',VERIFICATION_TOKEN_SECRET:'a-test-secret-that-is-at-least-thirty-two-characters'});
  let challenges=0;
  global.fetch=async url=>({ok:true,json:async()=>String(url).includes('cloudflare') ? (challenges++,{success:true,hostname:'campustakes.com',action:'student-intake'}) : {status:'approved'}});
  try {
    const response=res();
    await checkHandler(req({channel:'email',value:'delayed@psu.edu',code:'123456',botProof:signBotProof('203.0.113.201',1000),botChallenge:'a-fresh-challenge-token'}),response);
    assert.equal(response.code,200); assert.equal(challenges,1); assert.ok(response.body.token); assert.ok(response.body.expiresAt>Date.now());
  } finally { global.fetch=original; delete process.env.TURNSTILE_SITE_KEY; delete process.env.TURNSTILE_SECRET_KEY; }
});

test('lost response retry acknowledges the original study without duplicate or status reset', async () => {
  const original=global.fetch;
  process.env.AIRTABLE_TOKEN='test';
  const body={requestId:randomUUID(),clientName:'Test Client',company:'Research Company',workEmail:'client@example.org',targetDescription:'Current undergraduate students',participantCount:5,format:'Interview',timing:'October',incentiveBudget:50};
  let record, writes=0;
  global.fetch=async (url,options)=>{
    if(options.method==='PATCH') { writes++; const sent=JSON.parse(options.body); assert.deepEqual(sent.performUpsert.fieldsToMergeOn,[FIELD.requestId]); record={id:'recSavedStudy',fields:sent.records[0].fields}; throw new Error('Response lost after commit'); }
    return {ok:true,json:async()=>({records:record?[record]:[]})};
  };
  try {
    const first=res(); await studyHandler(req(body),first); assert.equal(first.code,503);
    record.fields[FIELD.status]='In progress';
    const retry=res(); await studyHandler(req(body),retry); assert.equal(retry.code,200); assert.equal(writes,1); assert.equal(record.fields[FIELD.status],'In progress');
  } finally { global.fetch=original; delete process.env.AIRTABLE_TOKEN; }
});

test('successful upstream HTTP without a record ID is not accepted as a saved application', async () => {
  const original=global.fetch; process.env.AIRTABLE_TOKEN='test';
  global.fetch=async()=>({ok:true,json:async()=>({records:[{}]})});
  try { await assert.rejects(createApplication({}), /did not confirm/); }
  finally { global.fetch=original; delete process.env.AIRTABLE_TOKEN; }
});

test('quote economics includes labor and flags an underpriced pilot', async () => {
  const {economics}=await import('../operations/quote-economics.mjs');
  const value={completions:10,price:120,incentive:50,directCostPerCompletion:5,founderHours:15,hourlyCost:30,acquisitionCost:0,riskReserve:0,targetMargin:0.25};
  const result=economics(value); assert.equal(result.laborAdjustedContribution,200); assert.ok(Math.abs(result.priceFloor-133.333333)<0.001); assert.match(result.decision,/REQUOTE/);
  assert.equal(economics({...value,incentive:75}).laborAdjustedContribution,-50);
  assert.throws(()=>economics({...value,completions:0}));
});
