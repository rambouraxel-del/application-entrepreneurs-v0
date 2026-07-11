// Cockpit Entrepreneur — V0.11.1
// Schéma et valeurs par défaut du centre de paramètres.
(function () {
    'use strict';

    var defaults = {
        schemaVersion: 2,
        profile: {
            firstName: 'Julien', lastName: 'Martin', jobTitle: 'Dirigeant',
            email: 'julien.martin@example.com', phone: '01 84 12 34 56', avatar: 'JM',
            language: 'fr', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Paris'
        },
        company: {
            tradeName: 'Cockpit Entrepreneur', legalName: 'Cockpit Entrepreneur SARL',
            activity: 'Services aux entreprises', legalForm: 'SARL', logoUrl: '', initials: 'CE',
            address: '10 rue de l\'Innovation, 75011 Paris', phone: '01 84 12 34 56',
            email: 'contact@cockpit-entrepreneur.example.com', website: 'www.cockpit-entrepreneur.example.com',
            siren: '123 456 789', siret: '123 456 789 00012', vatNumber: 'FR12 123456789',
            vatRegime: 'reel-normal', vatExempt: false, shareCapital: '10 000 €',
            registration: 'RCS Paris 123 456 789', iban: 'FR76 1234 5678 9012 3456 7890 123',
            bic: 'ABCDEFGHXXX', bankName: 'Banque Exemple', accountHolder: 'Cockpit Entrepreneur SARL',
            legalNotice: 'En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée, ainsi qu\'une indemnité forfaitaire de 40 € pour frais de recouvrement. Aucun escompte pour paiement anticipé.',
            footerText: 'Merci pour votre confiance.', showContactDetails: true, showBankDetails: true,
            defaultDocumentText: '', signatureText: 'Bon pour accord, date et signature'
        },
        appearance: {
            density: 'comfortable', defaultPageSize: 5, currency: 'EUR', currencyDecimals: true,
            dateFormat: 'DD/MM/YYYY', weekStartsOn: 'monday', accent: 'blue'
        },
        dashboard: {
            defaultPeriod: 'month', customPeriodStart: '', customPeriodEnd: '',
            revenueGoal: 12000, collectionGoal: 10000, cashGoal: 5000,
            cashHorizon: 'end-month', chartMonths: 6, chartIndicator: 'ca_facture',
            showCompletedTasks: true, maxAlerts: 4
        },
        alerts: {
            overdueInvoice: { enabled: true }, quoteNoReply: { enabled: true, days: 7 },
            unconfirmedAppointment: { enabled: true, days: 2 },
            repeatedPostponement: { enabled: true, count: 2 },
            upcomingHeavyCharge: { enabled: true, amount: 2000, days: 7 },
            lowCash: { enabled: true, amount: 1000 },
            lateGoal: { enabled: true, completionPercent: 70 },
            externalEmail: false, externalPush: false, externalSms: false
        },
        clients: {
            statuses: [
                { id: 'prospect', label: 'Prospect', color: 'neutral', active: true, order: 1 },
                { id: 'client-actif', label: 'Client actif', color: 'success', active: true, order: 2 },
                { id: 'a-relancer', label: 'À relancer', color: 'warning', active: true, order: 3 },
                { id: 'inactif', label: 'Inactif', color: 'neutral', active: true, order: 4 },
                { id: 'fidele', label: 'Fidèle', color: 'info', active: true, order: 5 },
                { id: 'litige', label: 'Litige', color: 'danger', active: true, order: 6 }
            ],
            initialStatus: 'prospect', pageSize: 5, followUpDays: 7,
            visibleFields: ['name', 'company', 'status', 'phone', 'email', 'lastContact']
        },
        agenda: {
            defaultView: 'week', weekStartsOn: 'monday',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            startTime: '08:00', endTime: '19:00', use24Hour: true, slotMinutes: 30,
            defaultDurationMinutes: 60, initialStatus: 'planned', confirmationDays: 2,
            followUpDays: 1, showWeekends: true,
            statuses: [
                { id: 'planned', legacyId: 'prevu', label: 'Planifié', color: 'info', active: true, order: 1 },
                { id: 'confirmed', legacyId: 'confirme', label: 'Confirmé', color: 'success', active: true, order: 2 },
                { id: 'postponed', legacyId: 'reporte', label: 'Reporté', color: 'warning', active: true, order: 3 },
                { id: 'completed', legacyId: 'realise', label: 'Réalisé', color: 'success', active: true, order: 4 },
                { id: 'cancelled', legacyId: 'sans-suite', label: 'Sans suite', color: 'neutral', active: true, order: 5 }
            ]
        },
        products: {
            types: [
                { id: 'service', label: 'Service', color: 'info', active: true, order: 1 },
                { id: 'produit', label: 'Produit', color: 'success', active: true, order: 2 },
                { id: 'abonnement', label: 'Abonnement', color: 'warning', active: true, order: 3 }
            ],
            statuses: [
                { id: 'actif', label: 'Actif', color: 'success', active: true, order: 1 },
                { id: 'brouillon', label: 'Brouillon', color: 'neutral', active: true, order: 2 },
                { id: 'archive', label: 'Archivé', color: 'neutral', active: true, order: 3 }
            ],
            defaultVat: 20, defaultUnit: 'unite',
            paymentTerms: ['Comptant', '15 jours', '30 jours', '45 jours fin de mois'],
            initialStatus: 'brouillon', quoteAllowedStatuses: ['actif'], pageSize: 5, families: []
        },
        billing: {
            quotePrefix: 'DEV', invoicePrefix: 'FAC', startingCounter: 1, includeYear: true,
            quoteValidityDays: 30, defaultPaymentDays: 30, defaultDepositPercent: 30,
            indicativeMaxDiscountPercent: 20, defaultVat: 20,
            acceptedPaymentMethods: ['Virement bancaire', 'Carte bancaire', 'Chèque'],
            latePenaltyText: '3 fois le taux d\'intérêt légal', collectionFee: 40,
            legalNotice: 'Aucun escompte pour paiement anticipé.', showIssuerDetails: true,
            showBankDetails: true, quoteSignature: 'Bon pour accord, date et signature',
            footerText: 'Merci pour votre confiance.'
        },
        treasury: {
            defaultHorizon: 'end-month', lowCashThreshold: 1000, heavyChargeThreshold: 2000,
            projectionMode: '30d',
            categories: [
                { id: 'loyer', label: 'Loyer', color: 'neutral', active: true, order: 1 },
                { id: 'fournisseur', label: 'Fournisseur', color: 'info', active: true, order: 2 },
                { id: 'abonnement', label: 'Abonnement', color: 'info', active: true, order: 3 },
                { id: 'salaires', label: 'Salaires', color: 'warning', active: true, order: 4 },
                { id: 'impots', label: 'Impôts / taxes', color: 'danger', active: true, order: 5 },
                { id: 'remboursement', label: 'Remboursement', color: 'neutral', active: true, order: 6 },
                { id: 'autre', label: 'Autre', color: 'neutral', active: true, order: 7 }
            ],
            recurrences: ['aucune', 'hebdomadaire', 'mensuelle', 'trimestrielle', 'annuelle'],
            includeIssuedInvoices: true, showRealized: true, showForecast: true
        },
        analytics: {
            defaultTab: 'overview', defaultPeriod: 'month',
            visibleIndicators: ['revenue', 'collected', 'cash', 'conversion', 'topClients'],
            comparePreviousPeriod: true, rankingClientCount: 5, automaticFindingThreshold: 10,
            showCharts: true, showFunnels: true
        },
        demo: {
            enabled: false, firstName: 'Julien', lastName: 'Martin', jobTitle: 'Dirigeant',
            company: 'Cockpit Entrepreneur SARL', activity: 'Services aux entreprises', city: 'Paris',
            email: 'contact@cockpit-entrepreneur.example.com', phone: '01 84 12 34 56'
        }
    };

    window.COCKPIT_SETTINGS_DEFAULTS = defaults;
    window.COCKPIT_SETTINGS_SCHEMA_VERSION = defaults.schemaVersion;
})();
