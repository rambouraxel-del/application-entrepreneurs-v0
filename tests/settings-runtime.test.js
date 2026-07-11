'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');const ROOT=path.resolve(__dirname,'..');
const storage={};const events={};
const document={
 documentElement:{attrs:{},setAttribute(k,v){this.attrs[k]=v}},body:{},readyState:'loading',
 getElementById(){return null},querySelector(){return null},querySelectorAll(){return []},
 addEventListener(type,fn){(events[type]||(events[type]=[])).push(fn)}
};
const window={document,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=String(v)},console,CustomEvent:function(){},dispatchEvent(){},addEventListener(type,fn){(events['w:'+type]||(events['w:'+type]=[])).push(fn)},location:{pathname:'/pages/test.html',search:''}};
const ctx={window,document,localStorage:window.localStorage,console,CustomEvent:window.CustomEvent,location:window.location,URLSearchParams,Event:function(type){this.type=type},MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{}},Date,JSON,Number,String,Boolean,Array,Object,Math,Intl,setTimeout,clearTimeout};vm.createContext(ctx);
function load(name){vm.runInContext(fs.readFileSync(path.join(ROOT,'js',name),'utf8'),ctx,{filename:name});}
load('settings-defaults.js');load('settings-store.js');load('settings-catalog.js');
let store=window.COCKPIT_SETTINGS;let company=store.getSection('company');company.legalName='Nouvelle société';store.updateSection('company',company);let billing=store.getSection('billing');billing.quotePrefix='DVC';billing.invoicePrefix='FCT';store.updateSection('billing',billing);
load('settings-consumers.js');load('settings-referentials.js');
window.COCKPIT_DEVIS_DETAILS={'OLD':{versions:[{companySnapshot:{nom:'Historique'}}]}};window.COCKPIT_FACTURE_DETAILS={};
window.COCKPIT_DEVIS_CALC={computeNextDevisNumero:()=>'',formatMoney:v=>String(v),snapshotCompany:()=>({nom:'ancien'}),getActiveVersion:q=>q.versions[(q.versionActive||q.versions.length)-1],computeDevisTotals:()=>({totalTTC:0})};
window.COCKPIT_FACTURE_CALC={computeNextFactureNumero:()=>''};
assert(window.COCKPIT_DEVIS_CALC.computeNextDevisNumero(2026).startsWith('DVC-2026-'));
assert(window.COCKPIT_FACTURE_CALC.computeNextFactureNumero(2026).startsWith('FCT-2026-'));
assert.strictEqual(window.COCKPIT_DEVIS_CALC.snapshotCompany().nom,'Nouvelle société');
assert.strictEqual(window.COCKPIT_DEVIS_DETAILS.OLD.versions[0].companySnapshot.nom,'Historique','historical snapshot untouched');
let treasury=store.getSection('treasury');treasury.showForecast=false;treasury.includeIssuedInvoices=false;store.updateSection('treasury',treasury);
window.COCKPIT_TRESORERIE_CALC={labelForCategorie:v=>'legacy '+v,computeSnapshot:()=>({soldePrevisionnel:500,facturesAEncaisser:[{statut:'en-retard',resteAPayer:100}],aEncaisser:100,mouvements:[{statut:'prevu',lien:{type:'facture'}},{statut:'realise'}],chargesPrevues:[{statut:'prevu'}],alertes:[{titre:'old'}]})};
let snap=window.COCKPIT_TRESORERIE_CALC.computeSnapshot(30);assert.strictEqual(snap.facturesAEncaisser.length,0);assert(snap.mouvements.every(m=>m.statut==='realise'));assert(!snap.alertes.some(a=>a.titre==='old'));
load('settings-alerts.js');const alerts=window.COCKPIT_SETTINGS_ALERTS.compute();assert.strictEqual(new Set(alerts.map(a=>a.key)).size,alerts.length,'duplicate alerts');
window.COCKPIT_CLIENT_STATUSES=[{value:'old'}];assert(window.COCKPIT_CLIENT_STATUSES.some(x=>x.value==='prospect'));
window.COCKPIT_PRODUCT_TYPES=[{value:'old'}];assert(window.COCKPIT_PRODUCT_TYPES.some(x=>x.value==='service'));
window.COCKPIT_RDV_STATUSES=[{value:'old'}];assert(window.COCKPIT_RDV_STATUSES.some(x=>x.value==='prevu'));
for(const [sectionName,section] of Object.entries(store.getDefaults())){if(sectionName==='schemaVersion')continue;function walk(obj,prefix){for(const [key,value] of Object.entries(obj)){const p=prefix?prefix+'.'+key:key;const meta=window.COCKPIT_SETTINGS_CATALOG.getField(sectionName,p);assert(['functional','limited','v1'].includes(meta.status),sectionName+'.'+p+' capability');if(value&&typeof value==='object'&&!Array.isArray(value))walk(value,p)}}walk(section,'')}
console.log('settings-runtime.test.js: OK');
