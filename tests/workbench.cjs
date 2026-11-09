const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
global.window=global;vm.runInThisContext(fs.readFileSync('static/business-data.js','utf8'));
const {build,csv,dialogues}=require('../static/workbench.js');
const state={id:'fixture',revision:0,config:{reserve:10,budget:80000,design:'A'},order:{},agents:Array.from({length:10},(_,i)=>({id:i+1,name:'Роль '+(i+1),task:'Проверить данные',status:'waiting'}))};
let m=build(state,2);
assert.equal(m.tables.registry.rows.length,1200);assert.equal(m.tables.selected.rows.length,108);assert.equal(m.tables.clean.rows.length,100);assert.equal(m.tables.duplicates.rows.length,8);
for(const key of ['cities','segments'])assert.equal(m.tables[key].rows.reduce((n,r)=>n+r[1],0),100);
assert.equal(m.qty,110);assert.equal(m.total,60000);assert.equal(m.tables.estimate.rows.reduce((n,r)=>n+r[3],0),m.total);
assert.deepEqual(m.tables.quotes.rows.map(r=>r[5]),[60000,65200,60400]);
assert.equal(m.tables.batches.rows.reduce((n,r)=>n+r[1],0),m.qty);
assert.equal(m.tables.distribution.rows.reduce((n,r)=>n+r[2],0),m.qty);
assert.equal(csv(m.tables.registry).split('\r\n').length,1201);
assert.ok(csv({columns:['value'],rows:[['=1+1'],['a"b;c']]}).includes("'"+'=1+1'));
for(let role=1;role<=10;role++){const rounds=dialogues(state,role);assert.equal(rounds.length,3);assert.ok(rounds.every(r=>r[1].length>300));for(const r of rounds)for(const id of r[2])assert.ok(build(state,role).documents.some(d=>d.id===id));}
state.config.reserve=5;m=build(state,3);assert.equal(m.qty,105);assert.equal(m.total,57500);
console.log('PASS: real source aggregation, 1,200-row CSV, budget scenarios, supplier comparison, conservation of gifts, three substantive exchanges per role');
