// Point d'entrée commun V0.11, chargé avant app.js sur les pages existantes.
(function () {
    'use strict';
    if (window.COCKPIT_SETTINGS_BOOTSTRAPPED) return;
    window.COCKPIT_SETTINGS_BOOTSTRAPPED = true;

    var currentScript=document.currentScript;
    var base=currentScript&&currentScript.src?currentScript.src.replace(/demo-config\.js(?:\?.*)?$/,''):'../js/';
    var cssHref=base.replace(/\/js\/$/,'/css/')+'preferences.css';
    if(!document.querySelector('link[data-cockpit-preferences]')){
        var link=document.createElement('link');link.rel='stylesheet';link.href=cssHref;link.setAttribute('data-cockpit-preferences','true');document.head.appendChild(link);
    }
    var files=['settings-defaults.js','settings-store.js','settings-catalog.js','demo-config-adapter.js','settings-consumers.js','settings-referentials.js','settings-alerts.js','settings-finalize.js'];
    if(document.readyState==='loading'){
        files.forEach(function(file){document.write('<script src="'+base+file+'"><\/script>');});
        return;
    }
    files.reduce(function(promise,file){return promise.then(function(){return new Promise(function(resolve,reject){var script=document.createElement('script');script.src=base+file;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});});},Promise.resolve()).catch(function(error){console.error('[Cockpit Settings] Chargement du socle impossible.',error);});
})();
