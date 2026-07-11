// Correctifs finaux de capacité et de visibilité V0.11.
(function () {
    'use strict';
    var catalog = window.COCKPIT_SETTINGS_CATALOG;
    var store = window.COCKPIT_SETTINGS;
    if (!catalog || !store) return;

    Object.assign(catalog.fields, {
        'company.activity': { status:'limited', note:'Conservée dans l’identité et les nouveaux snapshots ; le modèle documentaire V0 ne l’affiche pas encore.', keywords:'activité métier' },
        'company.legalForm': { status:'limited', note:'Conservée dans les nouveaux snapshots ; le modèle documentaire V0 ne l’affiche pas encore.', keywords:'forme juridique' },
        'company.shareCapital': { status:'v1', note:'Le modèle documentaire V0 ne possède pas encore d’emplacement Capital social.', keywords:'capital document' },
        'company.registration': { status:'v1', note:'Le modèle documentaire V0 ne possède pas encore d’emplacement Immatriculation.', keywords:'rcs registre document' },
        'company.bankName': { status:'v1', note:'La V0 affiche IBAN/BIC uniquement ; le nom de banque sera intégré au modèle V1.', keywords:'banque établissement' },
        'company.accountHolder': { status:'v1', note:'La V0 affiche IBAN/BIC uniquement ; le titulaire sera intégré au modèle V1.', keywords:'titulaire compte' },
        'company.legalNotice': { status:'v1', note:'Les documents historiques ne possèdent pas de snapshot de mentions ; un modèle documentaire versionné est requis en V1.', keywords:'mentions document' },
        'company.defaultDocumentText': { status:'v1', note:'Aucun champ de corps documentaire générique n’existe dans la V0.', keywords:'texte document' },
        'company.footerText': { status:'v1', note:'Le modèle imprimable V0 ne lit pas encore un pied de page versionné par snapshot.', keywords:'document pied page' },
        'company.signatureText': { status:'v1', note:'Le modèle imprimable V0 ne lit pas encore une signature versionnée par snapshot.', keywords:'document signature' },
        'products.quoteAllowedStatuses': { status:'v1', note:'L’éditeur V0 filtre encore le statut Actif en dur ; le filtre configurable nécessite un refactoring V1.', keywords:'catalogue devis sélectionnable' },
        'billing.latePenaltyText': { status:'v1', note:'Le modèle imprimable V0 ne versionne pas encore cette mention dans les snapshots historiques.', keywords:'pénalité retard document' },
        'billing.collectionFee': { status:'v1', note:'Le modèle imprimable V0 ne versionne pas encore cette indemnité dans les snapshots historiques.', keywords:'indemnité recouvrement' },
        'billing.legalNotice': { status:'limited', note:'Ajoutée aux conditions des nouveaux brouillons en mémoire ; les documents historiques restent inchangés.', keywords:'mention document' },
        'billing.quoteSignature': { status:'v1', note:'La zone de signature du modèle imprimable n’est pas encore pilotée par snapshot.', keywords:'signature devis' },
        'billing.footerText': { status:'v1', note:'Le pied de page du modèle imprimable n’est pas encore piloté par snapshot.', keywords:'pied page facture devis' }
    });

    function applyAnalyticsVisibility() {
        var body = document.getElementById('analyses-vue-top-clients-body');
        if (!body || !body.closest) return;
        var block = body.closest('.dashboard-block');
        if (!block) return;
        var settings = store.getSection('analytics');
        block.style.display = settings.visibleIndicators.indexOf('topClients') !== -1 ? '' : 'none';
    }
    document.addEventListener('DOMContentLoaded', function () { setTimeout(applyAnalyticsVisibility, 0); });
    window.addEventListener('load', applyAnalyticsVisibility);
    store.subscribe(applyAnalyticsVisibility);
})();
