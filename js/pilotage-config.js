// Adaptateur de compatibilité V0.10.2 -> V0.11.
(function () {
    'use strict';

    function build() {
        var dashboard = window.COCKPIT_SETTINGS ? window.COCKPIT_SETTINGS.getSection('dashboard') : {};
        var agenda = window.COCKPIT_SETTINGS ? window.COCKPIT_SETTINGS.getSection('agenda') : {};
        var mapPeriod = { month: 'mois', '30d': '30j', quarter: 'trimestre', custom: 'custom' };
        var mapHorizon = { 'end-month': 'fin-mois', 'end-next-month': 'fin-mois-suivant', '30d': '30j', '60d': '60j', '90d': '90j' };

        window.COCKPIT_PILOTAGE_CONFIG = {
            periodePilotage: mapPeriod[dashboard.defaultPeriod] || dashboard.defaultPeriod || 'mois',
            periodeCustomDebut: dashboard.customPeriodStart || null,
            periodeCustomFin: dashboard.customPeriodEnd || null,
            horizonTresorerie: mapHorizon[dashboard.cashHorizon] || dashboard.cashHorizon || 'fin-mois',
            agendaHeureDebut: agenda.startTime || '08:00',
            agendaHeureFin: agenda.endTime || '19:00',
            agendaPasHoraire: Number(agenda.slotMinutes) || 30,
            agenda24h: !!agenda.use24Hour,
            graphiquePeriodeMois: Number(dashboard.chartMonths) === 12 ? 12 : 6,
            graphiqueIndicateurDefaut: dashboard.chartIndicator || 'ca_facture'
        };
    }

    build();
    if (window.COCKPIT_SETTINGS) window.COCKPIT_SETTINGS.subscribe(build);
})();
