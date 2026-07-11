// Compatibilité V0.11 : ce fichier reste le point d'entrée chargé avant app.js
// sur les pages existantes. Il charge synchroniquement le nouveau store puis
// l'adaptateur DEMO_CONFIG, sans imposer de modification à chaque page.
(function () {
    'use strict';
    if (window.COCKPIT_SETTINGS_BOOTSTRAPPED) return;
    window.COCKPIT_SETTINGS_BOOTSTRAPPED = true;

    var currentScript = document.currentScript;
    var base = currentScript && currentScript.src ? currentScript.src.replace(/demo-config\.js(?:\?.*)?$/, '') : '../js/';
    var files = ['settings-defaults.js', 'settings-store.js', 'demo-config-adapter.js', 'settings-consumers.js', 'settings-referentials.js'];

    if (document.readyState === 'loading') {
        files.forEach(function (file) {
            document.write('<script src="' + base + file + '"><\/script>');
        });
        return;
    }

    files.reduce(function (promise, file) {
        return promise.then(function () {
            return new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.src = base + file;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        });
    }, Promise.resolve()).catch(function (error) {
        console.error('[Cockpit Settings] Chargement du socle impossible.', error);
    });
})();
