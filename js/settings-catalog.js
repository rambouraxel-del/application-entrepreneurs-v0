// Métadonnées fonctionnelles et index de recherche du Centre de paramètres.
(function () {
    'use strict';

    var sections = {
        home: { title: 'Vue d’accueil', description: 'Synthèse des réglages actifs et des informations essentielles à compléter.', keywords: 'résumé accueil configuration' },
        profile: { title: 'Profil utilisateur', description: 'Identité de l’utilisateur, distincte des informations de l’entreprise.', keywords: 'compte utilisateur identité prénom nom' },
        company: { title: 'Entreprise', description: 'Identité légale, coordonnées, banque et mentions des futurs documents.', keywords: 'société raison sociale siret siren tva banque iban logo' },
        appearance: { title: 'Apparence', description: 'Densité, accent, pagination et affichage monétaire compatibles avec la V0.', keywords: 'thème couleur compact décimales devise affichage' },
        dashboard: { title: 'Tableau de bord et objectifs', description: 'Objectifs, période de pilotage, horizon, graphique et alertes affichées.', keywords: 'dashboard cockpit ca chiffre affaires encaissement trésorerie objectif graphique indicateur' },
        alerts: { title: 'Alertes et notifications', description: 'Activation et seuils de la source unique d’alertes internes.', keywords: 'notification relance facture devis rendez-vous seuil retard' },
        clients: { title: 'Clients', description: 'Statuts, pagination, relance et colonnes visibles du CRM.', keywords: 'crm statut client suivi contact colonnes' },
        agenda: { title: 'Agenda', description: 'Vue, horaires, pas, durée, jours travaillés, week-end et statuts.', keywords: 'calendrier horaire horaires week-end weekend rendez-vous rdv durée créneau' },
        products: { title: 'Produits / Services', description: 'Types, statuts, TVA et valeurs proposées lors de la création en mémoire.', keywords: 'catalogue produit service offre unité paiement' },
        billing: { title: 'Facturation et documents', description: 'Numérotation indicative et valeurs par défaut des nouveaux devis et factures.', keywords: 'devis facture acompte remise tva paiement signature pied page validité préfixe' },
        treasury: { title: 'Trésorerie', description: 'Horizon, seuils, catégories, récurrences et visibilité des mouvements.', keywords: 'cash encaissement décaissement charge prévision réalisé' },
        analytics: { title: 'Analyses', description: 'Onglet, période, classements et visualisations du module Analyses.', keywords: 'statistiques indicateur graphique tunnel classement performance' },
        data: { title: 'Données et configuration', description: 'Maintenance locale : vider le cache et réinitialiser les préférences d’affichage.', keywords: 'cache affichage réinitialisation navigateur localstorage' },
        security: { title: 'Compte et sécurité', description: 'État des fonctions locales et des fonctions nécessitant un backend V1.', keywords: 'mot passe double authentification session permission appareil' }
    };

    var labels = {
        firstName:'Prénom',lastName:'Nom',jobTitle:'Fonction',email:'E-mail',phone:'Téléphone',avatar:'Initiales / avatar',language:'Langue',dateFormat:'Format de date',timezone:'Fuseau horaire',
        tradeName:'Nom commercial',legalName:'Raison sociale',activity:'Activité',legalForm:'Forme juridique',logoUrl:'URL du logo',initials:'Initiales du logo',address:'Adresse',website:'Site internet',siren:'SIREN',siret:'SIRET',vatNumber:'TVA intracommunautaire',vatRegime:'Régime de TVA',vatExempt:'Franchise en base',shareCapital:'Capital social',registration:'Immatriculation',iban:'IBAN',bic:'BIC',bankName:'Banque',accountHolder:'Titulaire du compte',legalNotice:'Mentions légales',footerText:'Pied de page',showContactDetails:'Afficher les coordonnées',showBankDetails:'Afficher les informations bancaires',defaultDocumentText:'Texte par défaut',signatureText:'Zone de signature',
        density:'Densité',defaultPageSize:'Taille de liste par défaut',currency:'Devise',currencyDecimals:'Afficher les décimales',weekStartsOn:'Premier jour de la semaine',accent:'Couleur d’accent',
        defaultPeriod:'Période par défaut',customPeriodStart:'Début personnalisé',customPeriodEnd:'Fin personnalisée',revenueGoal:'Objectif de CA (€)',collectionGoal:'Objectif d’encaissement (€)',cashGoal:'Objectif de trésorerie (€)',cashHorizon:'Horizon de trésorerie',chartMonths:'Période du graphique',chartIndicator:'Indicateur graphique',showCompletedTasks:'Afficher les tâches terminées',maxAlerts:'Nombre maximal d’alertes',
        overdueInvoice:'Facture en retard',quoteNoReply:'Devis sans réponse',unconfirmedAppointment:'Rendez-vous non confirmé',repeatedPostponement:'Rendez-vous reporté plusieurs fois',upcomingHeavyCharge:'Charge importante à venir',lowCash:'Trésorerie sous un seuil',lateGoal:'Objectif en retard',enabled:'Activée',days:'Délai (jours)',count:'Nombre de reports',amount:'Seuil (€)',completionPercent:'Seuil de réalisation (%)',externalEmail:'Notification e-mail',externalPush:'Notification push',externalSms:'Notification SMS',
        statuses:'Statuts',initialStatus:'Statut initial',pageSize:'Éléments par page',followUpDays:'Délai de relance (jours)',visibleFields:'Champs visibles',customFields:'Champs personnalisés',
        defaultView:'Vue par défaut',workingDays:'Jours travaillés',startTime:'Heure de début',endTime:'Heure de fin',use24Hour:'Mode 24 heures',slotMinutes:'Pas horaire (minutes)',defaultDurationMinutes:'Durée de RDV par défaut (minutes)',confirmationDays:'Délai de confirmation (jours)',showWeekends:'Afficher les week-ends',
        types:'Types',defaultVat:'TVA par défaut (%)',defaultUnit:'Unité par défaut',paymentTerms:'Modalités de paiement',quoteAllowedStatuses:'Statuts autorisés dans les devis',families:'Familles',
        quotePrefix:'Préfixe Devis',invoicePrefix:'Préfixe Facture',startingCounter:'Compteur de départ indicatif',includeYear:'Inclure l’année',quoteValidityDays:'Validité du devis (jours)',defaultPaymentDays:'Délai de paiement (jours)',defaultDepositPercent:'Acompte par défaut (%)',indicativeMaxDiscountPercent:'Remise maximale indicative (%)',acceptedPaymentMethods:'Moyens de paiement acceptés',latePenaltyText:'Pénalités de retard',collectionFee:'Indemnité forfaitaire (€)',showIssuerDetails:'Afficher l’émetteur',quoteSignature:'Signature du devis',
        defaultHorizon:'Horizon par défaut',lowCashThreshold:'Seuil de trésorerie (€)',heavyChargeThreshold:'Seuil de charge importante (€)',projectionMode:'Projection',categories:'Catégories d’opérations',recurrences:'Récurrences proposées',includeIssuedInvoices:'Prendre en compte les factures émises',showRealized:'Afficher les opérations réalisées',showForecast:'Afficher les opérations prévues',
        defaultTab:'Onglet ouvert',visibleIndicators:'Indicateurs visibles',comparePreviousPeriod:'Comparer à la période précédente',rankingClientCount:'Nombre de clients dans les classements',automaticFindingThreshold:'Seuil des constats automatiques (%)',showCharts:'Afficher les graphiques',showFunnels:'Afficher les tunnels'
    };

    var fields = {
        'profile.avatar': { status:'v1', note:'Aucun composant Avatar n’existe encore dans la V0 ; seules les initiales de l’entreprise sont affichées.', keywords:'photo portrait initiales' },
        'profile.language': { status:'v1', note:'La traduction complète de l’interface est réservée à la V1.', keywords:'français anglais traduction' },
        'profile.dateFormat': { status:'v1', note:'Le format global des dates reste JJ/MM/AAAA dans la V0.', keywords:'date calendrier' },
        'profile.timezone': { status:'v1', note:'Les données V0 ne gèrent pas les fuseaux horaires.', keywords:'heure zone' },
        'company.logoUrl': { status:'limited', note:'Une URL d’image publique est affichée localement ; le téléversement sécurisé est réservé à la V1.', keywords:'image marque' },
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
        'company.vatRegime': { status:'v1', note:'Le régime ne modifie pas les calculs fiscaux dans la V0.', keywords:'fiscal taxe' },
        'company.vatExempt': { status:'v1', note:'La franchise en base ne modifie pas automatiquement les lignes dans la V0.', keywords:'exonération taxe' },
        'appearance.currency': { status:'limited', note:'La V0 prend en charge l’euro uniquement.', keywords:'monnaie eur euro' },
        'appearance.dateFormat': { status:'v1', note:'Le format des dates reste JJ/MM/AAAA dans la V0.', keywords:'date' },
        'appearance.weekStartsOn': { status:'v1', note:'Le calendrier V0 commence le lundi.', keywords:'semaine dimanche lundi' },
        'clients.initialStatus': { status:'v1', note:'La création réelle de clients est encore en Work in progress.', keywords:'nouveau client défaut' },
        'clients.customFields': { status:'v1', note:'Les champs personnalisés nécessitent un modèle de données persistant.', keywords:'champ crm personnalisé' },
        'agenda.weekStartsOn': { status:'v1', note:'Le calendrier V0 commence le lundi.', keywords:'début semaine' },
        'agenda.use24Hour': { status:'v1', note:'La V0 affiche les heures au format 24 h.', keywords:'12h am pm format' },
        'agenda.confirmationDays': { status:'v1', note:'Le seuil réellement utilisé se règle dans Alertes et notifications.', keywords:'confirmer rappel' },
        'agenda.followUpDays': { status:'v1', note:'Les relances automatiques nécessitent un moteur de tâches V1.', keywords:'relance suivi' },
        'products.defaultVat': { status:'limited', note:'Préremplit les nouvelles lignes et la modale de création, dont les données restent en mémoire.', keywords:'taxe taux' },
        'products.defaultUnit': { status:'v1', note:'Le modèle Produit/Service V0 ne possède pas encore de champ Unité.', keywords:'heure jour forfait unité' },
        'products.paymentTerms': { status:'limited', note:'Alimente les choix de la modale V0 ; la création Produit reste non persistante.', keywords:'règlement comptant délai' },
        'products.initialStatus': { status:'limited', note:'Préremplit la modale de création V0, non persistante.', keywords:'nouveau produit défaut' },
        'products.quoteAllowedStatuses': { status:'v1', note:'Choix enregistré pour une utilisation ultérieure.', keywords:'catalogue devis sélectionnable' },
        'products.families': { status:'v1', note:'Les familles nécessitent un champ métier supplémentaire.', keywords:'catégorie gamme' },
        'billing.startingCounter': { status:'limited', note:'Numérotation indicative : aucune séquence comptable persistante sans backend.', keywords:'numéro séquence' },
        'billing.quoteValidityDays': { status:'limited', note:'Préremplit les nouveaux devis en mémoire ; les anciens snapshots restent inchangés.', keywords:'expiration valable validité devis' },
        'billing.defaultPaymentDays': { status:'limited', note:'Préremplit les nouveaux documents en mémoire.', keywords:'échéance délai facture' },
        'billing.defaultDepositPercent': { status:'limited', note:'Préremplit les nouveaux devis en mémoire.', keywords:'acompte avance' },
        'billing.indicativeMaxDiscountPercent': { status:'limited', note:'Plafonne la saisie des remises dans les nouveaux documents V0.', keywords:'remise rabais maximum' },
        'billing.defaultVat': { status:'limited', note:'Préremplit les nouvelles lignes vierges ; les lignes catalogue conservent leur TVA.', keywords:'taxe taux' },
        'billing.latePenaltyText': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'pénalité retard document' },
        'billing.collectionFee': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'indemnité recouvrement' },
        'billing.legalNotice': { status:'limited', note:'Ajoutée aux conditions des nouveaux brouillons en mémoire.', keywords:'mention document' },
        'billing.quoteSignature': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'signature devis' },
        'billing.footerText': { status:'v1', note:'Valeur enregistrée pour les futurs modèles documentaires.', keywords:'pied page facture devis' },
        'treasury.projectionMode': { status:'v1', note:'La V0 utilise un horizon unique ; un mode de projection distinct est réservé à la V1.', keywords:'projection scénario calcul' },
        'analytics.comparePreviousPeriod': { status:'v1', note:'Le module V0 ne possède pas encore un comparatif complet sur tous les onglets.', keywords:'comparaison précédent évolution' },
        'analytics.automaticFindingThreshold': { status:'v1', note:'Le moteur de constats V0 n’expose pas encore ce seuil de façon uniforme.', keywords:'constat insight seuil' },
        'alerts.externalEmail': { status:'v1', note:'Aucun envoi e-mail sans backend.', keywords:'notification mail' },
        'alerts.externalPush': { status:'v1', note:'Aucune notification push sans backend.', keywords:'notification mobile' },
        'alerts.externalSms': { status:'v1', note:'Aucun envoi SMS sans backend.', keywords:'notification téléphone' }
    };

    var synonyms = {
        'company.vatNumber':'TVA numéro taxe intracommunautaire',
        'agenda.startTime':'horaires ouverture début journée', 'agenda.endTime':'horaires fermeture fin journée',
        'agenda.showWeekends':'week-end weekend samedi dimanche', 'dashboard.revenueGoal':'objectif CA chiffre affaires',
        'dashboard.collectionGoal':'objectif encaissement', 'dashboard.cashGoal':'objectif trésorerie cash',
        'billing.quotePrefix':'devis préfixe numéro', 'billing.defaultDepositPercent':'acompte devis avance',
        'alerts.externalEmail':'notification email', 'clients.statuses':'statut client CRM',
        'treasury.defaultHorizon':'trésorerie horizon projection', 'treasury.lowCashThreshold':'trésorerie seuil bas',
        'billing.defaultVat':'TVA devis facture', 'products.defaultVat':'TVA produit service'
    };

    function normalize(value) {
        var text = String(value || '').toLowerCase();
        if (text.normalize) text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return text.replace(/[-_/\.]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function label(key) { return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); }); }
    function buildIndex(defaults) {
        var index = [];
        Object.keys(defaults).forEach(function (section) {
            if (section === 'schemaVersion' || !sections[section]) return;
            index.push({ section:section, path:'', label:sections[section].title, description:sections[section].description, text:normalize([sections[section].title, sections[section].description, sections[section].keywords].join(' ')) });
            function walk(obj, prefix) {
                Object.keys(obj).forEach(function (key) {
                    var path = prefix ? prefix + '.' + key : key, value = obj[key], meta = fields[section + '.' + path] || fields[path] || {}, fullPath = section + '.' + path;
                    index.push({ section:section, path:path, label:label(key), description:meta.note || sections[section].description, status:meta.status || 'functional', text:normalize([sections[section].title, sections[section].description, label(key), path, fullPath, meta.note, meta.keywords, synonyms[fullPath]].join(' ')) });
                    if (value && typeof value === 'object' && !Array.isArray(value)) walk(value, path);
                });
            }
            walk(defaults[section], '');
        });
        return index;
    }
    function search(query, defaults) {
        var q = normalize(query);
        if (!q) return [];
        return buildIndex(defaults).map(function (entry) {
            var score = 0;
            if (normalize(entry.label) === q) score += 20;
            if (entry.text.indexOf(q) !== -1) score += 10;
            q.split(' ').forEach(function (word) { if (word && entry.text.indexOf(word) !== -1) score += 1; });
            return { entry:entry, score:score };
        }).filter(function (result) { return result.score > 0; }).sort(function (a,b) { return b.score - a.score; }).map(function (result) { return result.entry; });
    }

    window.COCKPIT_SETTINGS_CATALOG = {
        sections: sections, fields: fields, labels: labels, label: label, normalize: normalize,
        buildIndex: buildIndex, search: search,
        getField: function (section, path) { return fields[section + '.' + path] || fields[path] || { status:'functional', note:'' }; }
    };
})();
