const {test} = require('node:test');
const assert = require('node:assert/strict');
const now = new Date('2026-09-09T22:00:00Z');
function applicant() { return {id:'app1',fields:{'Review Status':{name:'Approved'},'Reviewed By':'Joey','First Name':'Case','Last Name':'Student','School Email':'Case@example.edu','Mobile Phone':'+1 212 555 0199','Birth Year':2000,'Applicant Confirmations':[{name:'I am 18 or older and currently enrolled'}],'Email Control Status':{name:'Verified'},'Phone Control Status':{name:'Verified'},'Email Verified At':'2026-09-08T12:00:00Z','Phone Verified At':'2026-09-08T12:00:00Z','Consent Version':'student-intake-2026-09-07','Consent Accepted At':'2026-09-08T12:00:00Z','Enrollment Status':{name:'Verified'},'Enrollment Verified At':'2026-09-09T12:00:00Z','Enrollment Verification Method':{name:'Live student-portal check'},'Enrollment Evidence Notes':'Current term and name checked; no document retained.','Phone Screen Status':{name:'Not required'}}}; }
function panelist() {return {id:'pan1',fields:{'First name':'Case','Last name':'Student','.edu email':'case@example.edu',Phone:'+12125550199',Status:{name:'Active'}}};}
test('transfer admits new identity and reuses exact normalized existing identity',async()=>{
 const {planTransfer}=await import('../operations/panel-transfer.mjs');
 assert.equal(planTransfer(applicant(),[],[],now).ok,true);
 assert.equal(planTransfer(applicant(),[panelist()],[],now).existingId,'pan1');
 const legacy = panelist(); delete legacy.fields.Status;
 assert.equal(planTransfer(applicant(),[legacy],[],now).existingId,'pan1','unreviewed blank-status legacy identity is reused after full new review');
});
test('transfer rejects missing, expired, withdrawn, test and contradictory evidence',async()=>{
 const {planTransfer}=await import('../operations/panel-transfer.mjs');
 for(const [field,value] of [['Reviewed By',''],['Test Record',true],['Consent Withdrawn At',now.toISOString()],['Risk Flags',[{name:'Conflict'}]],['Enrollment Evidence Notes',''],['Enrollment Verification Method',null],['Enrollment Verified At','2024-01-01'],['Enrollment Verification Expires','2026-09-01'],['Phone Screen Status',{name:'Failed'}],['Email Verified At','2027-01-01'],['Birth Year',2015],['Consent Version','old']]) {
  const a=applicant(); a.fields[field]=value; assert.equal(planTransfer(a,[],[],now).ok,false,field);
 }
});
test('transfer blocks partial matches, suppression, names, duplicate approvals and wrong links',async()=>{
 const {planTransfer}=await import('../operations/panel-transfer.mjs');
 for(const patch of [{Phone:'+12125550198'},{Status:{name:'Inactive'}},{Status:{name:'Blacklist'}},{Status:{name:'Unknown'}},{'Fraud Flags':[{name:'Fraud'}]},{'First name':'Other'}]) {
  const p=panelist();Object.assign(p.fields,patch);assert.equal(planTransfer(applicant(),[p],[],now).ok,false);
 }
 assert.equal(planTransfer(applicant(),[panelist(),{...panelist(),id:'pan2'}],[],now).ok,false);
 assert.equal(planTransfer(applicant(),[],[{...applicant(),id:'app2'}],now).ok,false);
 const a=applicant();a.fields['Linked Panelist']=[{id:'wrong'}];assert.equal(planTransfer(a,[panelist()],[],now).ok,false);
});

test('routine admission needs no document or call and does not manufacture enrollment proof',async()=>{
 const {planTransfer,transferReviewedApplicant}=await import('../operations/panel-transfer.mjs');
 const a=applicant();
 a.fields['Enrollment Status']={name:'Pending evidence'};
 for(const field of ['Enrollment Verified At','Enrollment Verification Method','Enrollment Evidence Notes']) delete a.fields[field];
 a.fields['Phone Screen Status']={name:'Not scheduled'};
 assert.equal(planTransfer(a,[],[],now).ok,true);
 const f=fakeBase(a);await transferReviewedApplicant(f.base,a.id,{now});
 assert.equal(f.creates(),1);
 assert.equal(a.fields['Phone Screen Status'].name,'Not required');
 assert.equal(a.fields['Enrollment Status'].name,'Pending evidence');
 assert.equal(a.fields['Enrollment Verified At'],undefined);
 assert.equal(a.fields['Enrollment Verification Expires'],undefined);
 const processedAt=a.fields['Processed At'];
 Object.assign(a.fields,{'Enrollment Status':{name:'Verified'},'Enrollment Verified At':now.toISOString(),'Enrollment Verification Method':{name:'Live student-portal check'},'Enrollment Evidence Notes':'Current term checked for a study.'});
 await transferReviewedApplicant(f.base,a.id,{now});
 assert.equal(a.fields['Enrollment Verification Expires'],'2027-09-09');
 assert.equal(a.fields['Processed At'],processedAt);
 assert.equal(f.creates(),1);
 for(const patch of [{'Enrollment Status':{name:'Rejected'}},{'Enrollment Status':{name:'Expired'}},{'Phone Screen Status':{name:'Scheduled'}},{'Risk Flags':[{name:'Enrollment concern'}]}]) {
  const held=structuredClone(a);Object.assign(held.fields,patch);assert.equal(planTransfer(held,[],[],now).ok,false);
 }
});
function fakeBase(a, {failLinkOnce=false}={}) {
 let serial=0, creates=0; const rows={ 'Panelist Applications':[a], Panelists:[] };
 const panelFields=['First name','Last name','.edu email','Phone','Status','Fraud Flags','Current Application','Current Intake Approved','Date joined','Verification Status','Verified At','Verification Method','Birth Year','Adult Confirmed','Consent Version','Consent Accepted At'];
 const appFields=[...new Set([...Object.keys(a.fields),'Consent Withdrawn At','Processed At','Reviewed At','Enrollment Verified At','Enrollment Verification Method','Enrollment Evidence Notes','Enrollment Verification Expires','Linked Panelist','Panel Transfer Result'])];
 const wrap=r=>({id:r.id,getCellValue:k=>r.fields[k]??null});
 const tables=Object.fromEntries(Object.entries(rows).map(([name,data])=>[name,{fields:(name==='Panelists'?panelFields:appFields).map(name=>({name,isComputed:false})),getField:()=>({type:'singleLineText'}),selectRecordAsync:async id=>{const r=data.find(r=>r.id===id);return r?wrap(r):null;},selectRecordsAsync:async()=>({records:data.map(wrap)}),createRecordAsync:async fields=>{creates++;const id='pan'+ ++serial;data.push({id,fields:structuredClone(fields)});return id;},updateRecordAsync:async(id,fields)=>{if(name==='Panelist Applications'&&fields['Linked Panelist']&&failLinkOnce){failLinkOnce=false;throw Error('injected link failure');}Object.assign(data.find(r=>r.id===id).fields,structuredClone(fields));}}]));
 return {base:{getTable:n=>tables[n]},rows,creates:()=>creates};
}
test('failed linking leaves panel not ready; retry reuses record and later retry preserves timestamp',async()=>{
 const {transferReviewedApplicant}=await import('../operations/panel-transfer.mjs');
 const f=fakeBase(applicant(),{failLinkOnce:true});
 await assert.rejects(transferReviewedApplicant(f.base,'app1',{now}),/injected/);
 assert.equal(f.rows.Panelists[0].fields['Current Intake Approved'],false);
 await transferReviewedApplicant(f.base,'app1',{now});
 assert.equal(f.creates(),1); assert.equal(f.rows.Panelists[0].fields['Current Intake Approved'],true);
 const date=f.rows['Panelist Applications'][0].fields['Processed At'];
 await transferReviewedApplicant(f.base,'app1',{now:new Date('2026-09-10T22:00:00Z')});
 assert.equal(f.creates(),1);assert.equal(f.rows['Panelist Applications'][0].fields['Processed At'],date);
});
test('dry run and unapproved automation test perform zero writes',async()=>{
 const {transferReviewedApplicant}=await import('../operations/panel-transfer.mjs');
 const a=applicant(),f=fakeBase(a);await transferReviewedApplicant(f.base,a.id,{dryRun:true,now});assert.equal(f.creates(),0);assert.equal(a.fields['Processed At'],undefined);
 a.fields['Review Status']={name:'Needs verification'};await transferReviewedApplicant(f.base,a.id,{now});assert.equal(f.creates(),0);assert.equal(a.fields['Panel Transfer Result'],undefined);
});
test('withdrawal suppresses the matching identity and preserves a blacklist',async()=>{
 const {transferReviewedApplicant}=await import('../operations/panel-transfer.mjs');
 const a=applicant(),f=fakeBase(a);await transferReviewedApplicant(f.base,a.id,{now});
 a.fields['Consent Withdrawn At']=now.toISOString();f.rows.Panelists[0].fields.Status={name:'Blacklist'};
 await transferReviewedApplicant(f.base,a.id,{now});
 assert.equal(f.rows.Panelists[0].fields['Current Intake Approved'],false);
 assert.equal(f.rows.Panelists[0].fields.Status.name,'Blacklist');
});
