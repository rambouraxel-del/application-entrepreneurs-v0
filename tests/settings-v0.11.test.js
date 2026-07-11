'use strict';
const assert=require('assert');const fs=require('fs');const vm=require('vm');const path=require('path');
const ROOT=path.resolve(__dirname,'..');
function context(storage){
 const listeners={}; const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(storage,k)?storage[k]:null,setItem:(k,v)=>{storage[k]=String(v)},removeItem:k=>delete storage[k],clear:()=>Object.keys(storage).forEach(k=>delete storage[k])};
 const window={localStorage,console,CustomEvent:function(type,init){this.type=type;this.detail=init&&init.detail},dispatchEvent(){},addEventListener(type,fn){(listeners[type]||(listeners[type]=[])).push(fn)}};
 const ctx={window,localStorage,console,CustomEvent:window.CustomEvent,Date,JSON,Number,String,Boolean,Array,Object,Math,setTimeout,clearTimeout,Intl};vm.createContext(ctx);return ctx;
}
function load(ctx,file){vm.runInContext(fs.readFileSync(path.join(ROOT,'js',file),'utf8'),ctx,{filename:file});}
function newStore(storage){const c=context(storage);load(c,'settings-defaults.js');load(c,'settings-store.js');load(c,'settings-catalog.js');return c;}
(function(){
 const storage={};let c=newStore(storage),s=c.window.COCKPIT_SETTINGS;
 assert.strictEqual(s.getSchemaVersion(),2);assert.strictEqual(s.getSection('dashboard').revenueGoal,12000);
 s.updateSection('dashboard',Object.assign(s.getSection('dashboard'),{revenueGoal:7777}));assert.strictEqual(s.getSection('dashboard').revenueGoal,7777);
 c=newStore(storage);s=c.window.COCKPIT_SETTINGS;assert.strictEqual(s.getSection('dashboard').revenueGoal,7777,'rechargement');
 s.resetSection('dashboard');assert.strictEqual(s.getSection('dashboard').revenueGoal,12000,'reset section');
 s.updateSection('company',Object.assign(s.getSection('company'),{tradeName:'TestCo'}));s.resetAll();assert.strictEqual(s.getSection('company').tradeName,'Cockpit Entrepreneur','reset global');
 const exported=JSON.parse(s.exportConfig());assert(exported.settings&&exported.note.includes('données métier'));assert(!('CLIENT_DETAILS' in exported));
 const imported=JSON.parse(s.exportConfig());imported.settings.dashboard.revenueGoal=4321;let check=s.validateImport(imported);assert(check.valid);assert(check.summary.sections.includes('dashboard'));s.importConfig(imported);assert.strictEqual(s.getSection('dashboard').revenueGoal,4321);
 const legacy=s.get();legacy.schemaVersion=1;legacy.dashboard.revenueGoal=9000;storage[s.STORAGE_KEY]=JSON.stringify(legacy);c=newStore(storage);s=c.window.COCKPIT_SETTINGS;assert.strictEqual(s.getSchemaVersion(),2);assert.strictEqual(s.getSection('dashboard').revenueGoal,9000,'migration');
 let bad=s.get();bad.schemaVersion=99;assert(!s.validateImport(bad).valid,'future rejected');bad=s.get();bad.dashboard.hacker=true;assert(!s.validateImport(bad).valid,'unknown rejected');bad=s.get();bad.dashboard=[];assert(!s.validateImport(bad).valid,'incompatible rejected');
 let agenda=s.getSection('agenda');agenda.statuses.push({id:'nouveau',label:'Nouveau',color:'info',active:true,order:99});s.updateSection('agenda',agenda);let added=s.getSection('agenda').statuses.find(x=>x.label==='Nouveau');assert(added);assert.strictEqual(Object.prototype.hasOwnProperty.call(added,'legacyId'),false,'new agenda status has no legacyId');
 agenda=s.getSection('agenda');agenda.statuses.push({id:'prevu',label:'Collision',color:'neutral',active:true,order:99});assert.throws(()=>s.updateSection('agenda',agenda),/collision/i);
 for(const section of ['clients','agenda','products','treasury']){const sec=s.getSection(section);for(const key of Object.keys(sec)){const list=sec[key];if(Array.isArray(list)&&list[0]&&typeof list[0]==='object'&&'id' in list[0]){const tokens=[];for(const item of list){assert(!tokens.includes(item.id),section+'.'+key+' duplicate id');tokens.push(item.id);if(item.legacyId){assert(!tokens.includes(item.legacyId),section+'.'+key+' id/legacy collision');tokens.push(item.legacyId);}}}}}
 s.updateSection('company',Object.assign(s.getSection('company'),{tradeName:'Conservée'}));s.updateSection('dashboard',Object.assign(s.getSection('dashboard'),{revenueGoal:9999}));s.loadDemo();assert.strictEqual(s.getSection('company').tradeName,'Conservée');assert.strictEqual(s.getSection('dashboard').revenueGoal,9999);assert.strictEqual(s.getSection('demo').enabled,true,'demo preserves other sections');
 load(c,'demo-config-adapter.js');assert.strictEqual(c.window.COCKPIT_DEMO_CONFIG.entreprise,s.getDefaults().company.legalName,'historical bootstrap remains stable');assert.notStrictEqual(c.window.COCKPIT_DEMO_CONFIG.entreprise,s.getSection('company').tradeName,'current company is not injected into historical snapshots');
 assert.strictEqual(c.window.COCKPIT_SETTINGS_CATALOG.getField('treasury','projectionMode').status,'v1');
 const catalog=c.window.COCKPIT_SETTINGS_CATALOG;const queries={'TVA':'company','horaires':'agenda','objectif':'dashboard','devis':'billing','notification':'alerts','statut client':'clients','trésorerie':'treasury','acompte':'billing','week-end':'agenda'};for(const [q,expected] of Object.entries(queries)){const results=catalog.search(q,s.getDefaults());assert(results.length,q+' no result');assert(results.some(r=>r.section===expected),q+' wrong section');}
 console.log('settings-v0.11.test.js: OK');
})();
