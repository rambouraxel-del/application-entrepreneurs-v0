// Configuration de démonstration (V0.9.2)
// Centralise l'identité fictive utilisée pendant une démonstration
// (dirigeant + entreprise), pour pouvoir adapter rapidement le prototype à
// un prospect sans toucher au code des pages ni aux données métier fictives
// (clients, devis, factures, rendez-vous...). Ce fichier doit être chargé
// AVANT js/app.js sur chaque page, pour que window.COCKPIT_DEMO_CONFIG soit
// disponible dès que app.js s'exécute.
//
// Valeurs entièrement fictives par défaut. Ne jamais y placer de donnée
// personnelle réelle, de mot de passe ou de clé/API : ce fichier est un
// simple objet JavaScript chargé tel quel dans le navigateur, sans backend
// ni chiffrement.
//
// Pour adapter la démo à un prospect : modifier uniquement les valeurs de
// DEMO_CONFIG ci-dessous. Aucun autre fichier n'a besoin d'être touché pour
// les éléments listés dans docs/README.md (section "Personnaliser la
// démo").

(function () {
    var DEMO_CONFIG = {
        prenom: 'Julien',
        nom: 'Martin',
        fonction: 'Dirigeant',
        entreprise: 'Cockpit Entrepreneur SARL',
        activite: 'Services aux entreprises',
        ville: 'Paris',
        email: 'contact@cockpit-entrepreneur.example.com',
        telephone: '01 84 12 34 56',
        objectifMensuel: 12000
    };

    var DEFAULTS = {
        prenom: 'Julien',
        nom: 'Martin',
        fonction: 'Dirigeant',
        entreprise: 'Cockpit Entrepreneur SARL',
        activite: 'Services aux entreprises',
        ville: 'Paris',
        email: 'contact@example.com',
        telephone: '01 00 00 00 00',
        objectifMensuel: 12000
    };

    function get(key) {
        var value = DEMO_CONFIG[key];
        if (value === undefined || value === null || value === '') {
            return DEFAULTS[key];
        }
        return value;
    }

    var prenom = get('prenom');
    var nom = get('nom');
    var objectifMensuel = get('objectifMensuel');

    window.COCKPIT_DEMO_CONFIG = {
        prenom: prenom,
        nom: nom,
        nomComplet: prenom + ' ' + nom,
        fonction: get('fonction'),
        entreprise: get('entreprise'),
        activite: get('activite'),
        ville: get('ville'),
        email: get('email'),
        telephone: get('telephone'),
        objectifMensuel: typeof objectifMensuel === 'number' && !isNaN(objectifMensuel) ? objectifMensuel : DEFAULTS.objectifMensuel
    };
})();
