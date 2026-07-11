// Correctifs finaux de capacité, visibilité et propagation V0.11.1.
(function () {
    'use strict';
    var catalog = window.COCKPIT_SETTINGS_CATALOG;
    var store = window.COCKPIT_SETTINGS;
    if (!catalog || !store) return;

    Object.assign(catalog.fields, {
        'company.activity': { status:'limited', note:'Conservée dans l’identité et les nouveaux snapshots.', keywords:'activité métier' },
        'company.legalForm': { status:'limited', note:'Conservée dans les nouveaux snapshots.', keywords:'forme juridique' },
        'company.shareCapital': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'capital document' },
        'company.registration': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'rcs registre document' },
        'company.bankName': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'banque établissement' },
        'company.accountHolder': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'titulaire compte' },
        'company.legalNotice': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'mentions document' },
        'company.defaultDocumentText': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'texte document' },
        'company.footerText': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'document pied page' },
        'company.signatureText': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'document signature' },
        'products.quoteAllowedStatuses': { status:'v1', note:'Choix enregistré pour une utilisation ultérieure.', keywords:'catalogue devis sélectionnable' },
        'billing.latePenaltyText': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'pénalité retard document' },
        'billing.collectionFee': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'indemnité recouvrement' },
        'billing.legalNotice': { status:'limited', note:'Ajoutée aux conditions des nouveaux brouillons en mémoire.', keywords:'mention document' },
        'billing.quoteSignature': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'signature devis' },
        'billing.footerText': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'pied page facture devis' }
    });

    function emitChange(node) {
        if (!node) return;
        try { node.dispatchEvent(new Event('change', { bubbles: true })); } catch (ignore) {}
    }

    function setPageSize(id, size) {
        var select = document.getElementById(id);
        if (!select) return;
        var wanted = String(size || 5);
        var exists = Array.prototype.some.call(select.options || [], function (option) { return String(option.value) === wanted; });
        if (!exists || String(select.value) === wanted) return;
        select.value = wanted;
        emitChange(select);
    }

    function applyPageSizes() {
        var appearance = store.getSection('appearance');
        var clients = store.getSection('clients');
        var products = store.getSection('products');
        setPageSize('clients-page-size', clients.pageSize || appearance.defaultPageSize);
        setPageSize('products-page-size', products.pageSize || appearance.defaultPageSize);
        ['agenda-page-size', 'devis-page-size', 'factures-page-size'].forEach(function (id) {
            setPageSize(id, appearance.defaultPageSize);
        });
    }

    function applyAnalyticsVisibility() {
        var body = document.getElementById('analyses-vue-top-clients-body');
        if (!body || !body.closest) return;
        var block = body.closest('.dashboard-block');
        if (!block) return;
        var settings = store.getSection('analytics');
        block.style.display = settings.visibleIndicators.indexOf('topClients') !== -1 ? '' : 'none';
    }

    function applyAll() {
        applyAnalyticsVisibility();
        applyPageSizes();
    }

    document.addEventListener('DOMContentLoaded', function () { setTimeout(applyAll, 0); });
    window.addEventListener('load', applyAll);
    store.subscribe(applyAll);
})();
