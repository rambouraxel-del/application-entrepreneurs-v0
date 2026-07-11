// Adaptateur de compatibilité V0.9.2 -> V0.11.
(function () {
    'use strict';

    function build() {
        var store = window.COCKPIT_SETTINGS;
        var profile = store ? store.getSection('profile') : {};
        var company = store ? store.getSection('company') : {};
        var demo = store ? store.getSection('demo') : {};
        var dashboard = store ? store.getSection('dashboard') : {};
        var useDemo = !!demo.enabled;
        var firstName = useDemo ? demo.firstName : profile.firstName;
        var lastName = useDemo ? demo.lastName : profile.lastName;

        window.COCKPIT_DEMO_CONFIG = {
            prenom: firstName || 'Julien',
            nom: lastName || 'Martin',
            nomComplet: ((firstName || 'Julien') + ' ' + (lastName || 'Martin')).trim(),
            fonction: (useDemo ? demo.jobTitle : profile.jobTitle) || 'Dirigeant',
            entreprise: (useDemo ? demo.company : company.legalName) || company.tradeName || 'Cockpit Entrepreneur SARL',
            activite: (useDemo ? demo.activity : company.activity) || 'Services aux entreprises',
            ville: demo.city || '',
            email: (useDemo ? demo.email : company.email) || profile.email || 'contact@example.com',
            telephone: (useDemo ? demo.phone : company.phone) || profile.phone || '',
            objectifMensuel: Number(dashboard.revenueGoal) || 12000,
            profilDemonstrationActif: useDemo
        };
    }

    build();
    if (window.COCKPIT_SETTINGS) window.COCKPIT_SETTINGS.subscribe(build);
})();
