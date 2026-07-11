// Adaptateur de compatibilité V0.9.2 -> V0.11.
// Les valeurs historiques utilisées pendant l'initialisation des jeux de données
// restent stables. Les préférences courantes sont appliquées ensuite par les
// consommateurs V0.11 uniquement aux nouveaux objets et aux écrans.
(function () {
    'use strict';
    function build() {
        var store=window.COCKPIT_SETTINGS;
        var defaults=store?store.getDefaults():window.COCKPIT_SETTINGS_DEFAULTS||{};
        var historicalProfile=defaults.profile||{};
        var historicalCompany=defaults.company||{};
        var currentDemo=store?store.getSection('demo'):defaults.demo||{};
        var dashboard=store?store.getSection('dashboard'):defaults.dashboard||{};
        window.COCKPIT_DEMO_CONFIG={
            prenom:historicalProfile.firstName||'Julien',
            nom:historicalProfile.lastName||'Martin',
            nomComplet:((historicalProfile.firstName||'Julien')+' '+(historicalProfile.lastName||'Martin')).trim(),
            fonction:historicalProfile.jobTitle||'Dirigeant',
            entreprise:historicalCompany.legalName||historicalCompany.tradeName||'Cockpit Entrepreneur SARL',
            activite:historicalCompany.activity||'Services aux entreprises',
            ville:(defaults.demo||{}).city||'',
            email:historicalCompany.email||'contact@example.com',
            telephone:historicalCompany.phone||'',
            objectifMensuel:Number(dashboard.revenueGoal)||12000,
            profilDemonstrationActif:!!currentDemo.enabled
        };
    }
    build();
    if(window.COCKPIT_SETTINGS)window.COCKPIT_SETTINGS.subscribe(build);
})();
