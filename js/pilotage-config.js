// Configuration de pilotage (V0.10.2)
// Centralise les valeurs par défaut utilisées par le tableau de bord
// (période de pilotage, horizon de trésorerie, plage horaire de l'agenda,
// période/indicateur par défaut du graphique de performance).
//
// Distincte de js/demo-config.js : demo-config.js porte l'identité fictive
// d'une démonstration (personne, entreprise...), pilotage-config.js porte
// des préférences d'affichage génériques, indépendantes du prospect
// démontré. Chargée avant js/app.js sur les pages qui en dépendent
// (dashboard.html, settings.html).
//
// Comme le reste de la V0, cet objet est rechargé à son état par défaut à
// chaque changement de page : modifier une valeur ici change le
// comportement par défaut du prototype, mais aucune interaction utilisateur
// (ex. la carte "Pilotage et activité" de settings.html) ne peut la
// modifier durablement, faute de backend ou de persistance. Voir
// docs/decisions.md pour le choix explicite de ne pas introduire de
// localStorage.

(function () {
    window.COCKPIT_PILOTAGE_CONFIG = {
        periodePilotage: 'mois', // 'mois' | '30j' | 'trimestre' | 'custom'
        periodeCustomDebut: null,
        periodeCustomFin: null,

        horizonTresorerie: 'fin-mois', // 'fin-mois' | 'fin-mois-suivant' | '30j' | '60j' | '90j'

        agendaHeureDebut: '08:00',
        agendaHeureFin: '19:00',
        agendaPasHoraire: 30, // 15 | 30 | 60 (minutes)
        agenda24h: false,

        graphiquePeriodeMois: 6, // 6 | 12
        graphiqueIndicateurDefaut: 'ca_facture' // 'ca_facture' | 'encaisse' | 'solde_net'
    };
})();
