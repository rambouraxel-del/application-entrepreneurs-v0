'use strict';
// Tests du moteur d'insights V0.13 (js/insights-engine.js) : chaque règle
// est testée indépendamment du rendu, avec un cas déclenché, un cas non
// déclenché, une valeur limite et un cas d'absence de données lorsque
// c'est pertinent.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function loadEngine() {
    const sandbox = {};
    vm.createContext(sandbox);
    const code = fs.readFileSync(path.join(ROOT, 'js', 'insights-engine.js'), 'utf8');
    vm.runInContext(code, sandbox, { filename: 'insights-engine.js' });
    return sandbox.COCKPIT_INSIGHTS_ENGINE;
}

const ENGINE = loadEngine();
assert(ENGINE, 'le moteur doit s\'exposer sur le contexte global');

// Référence de temps fixe pour des tests reproductibles, indépendants de la
// date système réelle.
const TODAY = new Date(2026, 8, 8); // 8 septembre 2026
TODAY.setHours(0, 0, 0, 0);

function parseFr(value) {
    if (!value) return null;
    const p = String(value).split('/');
    if (p.length !== 3) return null;
    const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    return isNaN(d.getTime()) ? null : d;
}

// ---------- Fausses implémentations minimales des moteurs de calcul ----------
// (mêmes signatures que window.COCKPIT_DEVIS_CALC / COCKPIT_FACTURE_CALC /
// COCKPIT_AGENDA_CALC réels, simplifiées pour des lignes {montant}.)

const devisCalc = {
    roundMoney: (v) => Math.round(v * 100) / 100,
    formatMoney: (v) => Math.round(v) + ' €',
    computeDevisTotals: (lignes) => ({ totalTTC: (lignes || []).reduce((sum, l) => sum + (l.montant || 0), 0) }),
    getActiveVersion: (devis) => devis.versions[devis.versions.length - 1]
};

const factureCalc = {
    computePaiements: (paiements, totalTTC) => {
        const totalPaye = (paiements || []).reduce((s, p) => s + (p.montant || 0), 0);
        return { totalPaye: totalPaye, resteAPayer: Math.round((totalTTC - totalPaye) * 100) / 100 };
    },
    computeStatutAffiche: (params) => {
        if (params.statutEmission !== 'emise') return 'non-emise';
        const paye = (params.paiements || []).reduce((s, p) => s + (p.montant || 0), 0);
        const reste = params.totalTTC - paye;
        if (reste <= 0) return 'payee';
        const echeance = parseFr(params.dateEcheance);
        if (echeance && echeance < TODAY) return 'en-retard';
        return paye > 0 ? 'partiellement-payee' : 'non-payee';
    }
};

const agendaCalc = { parseDateFr: parseFr };

function baseCtx(overrides) {
    return ENGINE.normalizeContext(Object.assign({
        today: TODAY,
        devisCalc: devisCalc,
        factureCalc: factureCalc,
        agendaCalc: agendaCalc,
        tresorerieCalc: null,
        devisDetails: {},
        factureDetails: {},
        rdvDetails: {},
        clientDetails: {},
        todos: []
    }, overrides || {}));
}

// ================= Règle : factures en retard =================
(function () {
    const facturesEnRetard = {
        'FAC-1': { statutEmission: 'emise', dateEcheance: '01/08/2026', lignes: [{ montant: 1000 }], paiements: [] },
        'FAC-2': { statutEmission: 'emise', dateEcheance: '05/08/2026', lignes: [{ montant: 500 }], paiements: [{ montant: 200 }] }
    };
    const facturesAJour = {
        'FAC-3': { statutEmission: 'emise', dateEcheance: '01/12/2026', lignes: [{ montant: 800 }], paiements: [] },
        'FAC-4': { statutEmission: 'emise', dateEcheance: '01/01/2026', lignes: [{ montant: 100 }], paiements: [{ montant: 100 }] }
    };

    // Cas déclenché : deux factures en retard, agrégées en une seule alerte.
    let ctx = baseCtx({ factureDetails: facturesEnRetard, alertSettings: { overdueInvoice: { enabled: true } } });
    let result = ENGINE.rules.facturesEnRetard(ctx);
    assert.strictEqual(result.length, 1, 'une alerte agrégée attendue');
    assert.strictEqual(result[0].priority, 'critique');
    assert.strictEqual(result[0].value, 1300, 'montant restant cumulé (1000 + 300)');
    assert.match(result[0].title, /2 factures/);
    assert.strictEqual(result[0].actionUrl, 'facturation.html');

    // Cas non déclenché : aucune facture en retard.
    ctx = baseCtx({ factureDetails: facturesAJour });
    assert.strictEqual(ENGINE.rules.facturesEnRetard(ctx).length, 0);

    // Absence de données : dictionnaire vide.
    assert.strictEqual(ENGINE.rules.facturesEnRetard(baseCtx({})).length, 0);

    // Règle désactivée dans les paramètres : ne doit rien remonter même si
    // les données qualifient.
    ctx = baseCtx({ factureDetails: facturesEnRetard, alertSettings: { overdueInvoice: { enabled: false } } });
    assert.strictEqual(ENGINE.rules.facturesEnRetard(ctx).length, 0);

    // Moteur de calcul indisponible : ne doit jamais lever d'exception.
    ctx = baseCtx({ factureDetails: facturesEnRetard, devisCalc: null });
    assert.strictEqual(ENGINE.rules.facturesEnRetard(ctx).length, 0);

    console.log('règle factures en retard : OK');
})();

// ================= Règle : devis en attente =================
(function () {
    function devisEnvoye(dateModification, montant) {
        return { versionActive: 1, versions: [{ version: 1, statut: 'envoye', dateCreation: dateModification, dateModification: dateModification, lignes: [{ montant: montant }] }] };
    }

    // Cas déclenché : envoyé il y a 10 jours (> seuil 7 jours par défaut).
    let ctx = baseCtx({ devisDetails: { 'D1': devisEnvoye('29/08/2026', 1000) } });
    let result = ENGINE.rules.devisEnAttente(ctx);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].value, 1000);
    assert.strictEqual(result[0].priority, 'importante');

    // Cas non déclenché : envoyé il y a 3 jours seulement.
    ctx = baseCtx({ devisDetails: { 'D2': devisEnvoye('05/09/2026', 1000) } });
    assert.strictEqual(ENGINE.rules.devisEnAttente(ctx).length, 0);

    // Valeur limite : exactement le seuil (7 jours) doit déclencher (>=).
    ctx = baseCtx({ devisDetails: { 'D3': devisEnvoye('01/09/2026', 500) } });
    result = ENGINE.rules.devisEnAttente(ctx);
    assert.strictEqual(result.length, 1, 'le seuil exact (7 jours) doit déclencher la règle');

    // Devis brouillon ou refusé : jamais pris en compte.
    ctx = baseCtx({ devisDetails: { 'D4': { versionActive: 1, versions: [{ version: 1, statut: 'brouillon', dateCreation: '01/01/2026', lignes: [{ montant: 999 }] }] } } });
    assert.strictEqual(ENGINE.rules.devisEnAttente(ctx).length, 0);

    console.log('règle devis en attente : OK');
})();

// ================= Règle : rendez-vous non confirmés =================
(function () {
    function rdv(date, confirme, statut) {
        return { id: 'r', date: date, statut: statut || 'prevu', communication: { confirme: !!confirme } };
    }

    // Cas déclenché : demain, non confirmé.
    let ctx = baseCtx({ rdvDetails: { r1: rdv('09/09/2026', false) } });
    let result = ENGINE.rules.rdvNonConfirmes(ctx);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].priority, 'importante');

    // Cas non déclenché : déjà confirmé.
    ctx = baseCtx({ rdvDetails: { r1: rdv('09/09/2026', true) } });
    assert.strictEqual(ENGINE.rules.rdvNonConfirmes(ctx).length, 0);

    // Valeur limite : exactement au seuil (2 jours) déclenche.
    ctx = baseCtx({ rdvDetails: { r1: rdv('10/09/2026', false) } });
    assert.strictEqual(ENGINE.rules.rdvNonConfirmes(ctx).length, 1, 'le seuil exact (2 jours) doit déclencher la règle');

    // Hors fenêtre : dans 5 jours, au-delà du seuil.
    ctx = baseCtx({ rdvDetails: { r1: rdv('13/09/2026', false) } });
    assert.strictEqual(ENGINE.rules.rdvNonConfirmes(ctx).length, 0);

    // Rendez-vous déjà clos : jamais pris en compte même non confirmé.
    ctx = baseCtx({ rdvDetails: { r1: rdv('09/09/2026', false, 'annule') } });
    assert.strictEqual(ENGINE.rules.rdvNonConfirmes(ctx).length, 0);

    console.log('règle rendez-vous non confirmés : OK');
})();

// ================= Règle : trésorerie =================
(function () {
    // Cas déclenché : deux alertes trésorerie distinctes, l'une critique
    // l'autre importante.
    let ctx = baseCtx({
        tresorerieCalc: { computeSnapshot: () => ({ alertes: [
            { titre: 'Risque de tension de trésorerie', sousTexte: 'Seuil configuré : 1000 €', niveau: 'warning', lien: 'tresorerie.html' },
            { titre: 'Charge importante à venir', sousTexte: 'Loyer', niveau: 'critical', lien: 'tresorerie.html' }
        ] }) }
    });
    let result = ENGINE.rules.tresorerie(ctx);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].priority, 'importante');
    assert.strictEqual(result[1].priority, 'critique');

    // Déduplication : une alerte « facture(s) en retard » venant de la
    // trésorerie ne doit pas être reprise, la règle « Factures en retard »
    // ci-dessus couvrant déjà ce cas avec le montant restant à encaisser.
    ctx = baseCtx({
        tresorerieCalc: { computeSnapshot: () => ({ alertes: [
            { titre: '3 facture(s) en retard', sousTexte: 'À traiter dans Facturation', niveau: 'critical', lien: 'facturation.html' },
            { titre: 'Risque de tension de trésorerie', sousTexte: '', niveau: 'warning', lien: 'tresorerie.html' }
        ] }) }
    });
    result = ENGINE.rules.tresorerie(ctx);
    assert.strictEqual(result.length, 1, 'l\'alerte facture en retard de la trésorerie doit être filtrée');
    assert.strictEqual(result[0].title, 'Risque de tension de trésorerie');

    // Absence de moteur de calcul : aucune exception.
    assert.strictEqual(ENGINE.rules.tresorerie(baseCtx({})).length, 0);

    console.log('règle trésorerie : OK');
})();

// ================= Règle : client à relancer =================
(function () {
    let ctx = baseCtx({ clientDetails: { c1: { nom: 'Client A', statut: 'a-relancer', dernierContact: '01/08/2026' } } });
    assert.strictEqual(ENGINE.rules.clientARelancer(ctx).length, 1, 'statut à relancer doit remonter une opportunité');

    ctx = baseCtx({ clientDetails: { c1: { nom: 'Client B', statut: 'client-actif' } } });
    assert.strictEqual(ENGINE.rules.clientARelancer(ctx).length, 0, 'un autre statut ne doit rien remonter');

    console.log('règle client à relancer : OK');
})();

// ================= Règle : client fidèle inactif =================
(function () {
    // Cas déclenché : fidèle, dernier contact il y a 30 jours, seuil par
    // défaut 7 jours.
    let ctx = baseCtx({ clientDetails: { c1: { nom: 'Fidèle', statut: 'fidele', dernierContact: '09/08/2026' } } });
    let result = ENGINE.rules.clientFideleInactif(ctx);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].value, 30);

    // Cas non déclenché : contact récent (2 jours).
    ctx = baseCtx({ clientDetails: { c1: { nom: 'Fidèle', statut: 'fidele', dernierContact: '06/09/2026' } } });
    assert.strictEqual(ENGINE.rules.clientFideleInactif(ctx).length, 0);

    // Valeur limite : exactement le seuil configuré (10 jours ici).
    ctx = baseCtx({ clientDetails: { c1: { nom: 'Fidèle', statut: 'fidele', dernierContact: '29/08/2026' } }, clientsSettings: { followUpDays: 10 } });
    assert.strictEqual(ENGINE.rules.clientFideleInactif(ctx).length, 1, 'le seuil exact doit déclencher la règle');

    // Statut différent : jamais pris en compte.
    ctx = baseCtx({ clientDetails: { c1: { nom: 'Autre', statut: 'inactif', dernierContact: '01/01/2026' } } });
    assert.strictEqual(ENGINE.rules.clientFideleInactif(ctx).length, 0);

    console.log('règle client fidèle inactif : OK');
})();

// ================= Règle : devis à forte valeur =================
(function () {
    function devisEnvoye(clientSlug, montant) {
        return { versionActive: 1, versions: [{ version: 1, statut: 'envoye', dateCreation: '01/09/2026', clientSlug: clientSlug, lignes: [{ montant: montant }] }] };
    }

    let ctx = baseCtx({
        devisDetails: { petit: devisEnvoye('a', 500), grand: devisEnvoye('b', 5000) },
        clientDetails: { a: { nom: 'Petit client' }, b: { nom: 'Grand client' } }
    });
    let result = ENGINE.rules.devisForteValeur(ctx);
    assert.strictEqual(result.length, 1, 'un seul devis mis en avant');
    assert.match(result[0].title, /grand/, 'le devis le plus élevé doit être choisi');

    // Absence de devis ouvert : aucune opportunité.
    assert.strictEqual(ENGINE.rules.devisForteValeur(baseCtx({})).length, 0);

    console.log('règle devis à forte valeur : OK');
})();

// ================= Règle : RDV à fort potentiel =================
(function () {
    let ctx = baseCtx({ rdvDetails: { r1: { id: 'r1', titre: 'Présentation', statut: 'confirme', opportunite: 'fort', montantPotentiel: 2000, clientSlug: 'a' } }, clientDetails: { a: { nom: 'Client A' } } });
    assert.strictEqual(ENGINE.rules.rdvFortPotentiel(ctx).length, 1);

    // Potentiel moyen ou faible : non retenu.
    ctx = baseCtx({ rdvDetails: { r1: { id: 'r1', statut: 'confirme', opportunite: 'moyen' } } });
    assert.strictEqual(ENGINE.rules.rdvFortPotentiel(ctx).length, 0);

    // Rendez-vous déjà réalisé : non retenu même à fort potentiel.
    ctx = baseCtx({ rdvDetails: { r1: { id: 'r1', statut: 'realise', opportunite: 'fort' } } });
    assert.strictEqual(ENGINE.rules.rdvFortPotentiel(ctx).length, 0);

    console.log('règle RDV à fort potentiel : OK');
})();

// ================= Priorités du jour =================
(function () {
    const rdvDetails = {
        matin: { id: 'matin', titre: 'RDV matin', date: '08/09/2026', heureDebut: '09:00', statut: 'prevu', clientSlug: 'a' },
        apresmidi: { id: 'apresmidi', titre: 'RDV après-midi', date: '08/09/2026', heureDebut: '14:00', statut: 'confirme', clientSlug: 'b' },
        demain: { id: 'demain', titre: 'RDV demain', date: '09/09/2026', heureDebut: '08:00', statut: 'prevu', clientSlug: 'a' },
        annule: { id: 'annule', titre: 'RDV annulé', date: '08/09/2026', heureDebut: '08:00', statut: 'annule', clientSlug: 'a' }
    };
    const todos = [
        { id: 1, titre: 'Tâche haute', priorite: 'haute', terminee: false },
        { id: 2, titre: 'Tâche basse', priorite: 'basse', terminee: false },
        { id: 3, titre: 'Tâche terminée', priorite: 'haute', terminee: true }
    ];
    const ctx = baseCtx({ rdvDetails: rdvDetails, todos: todos, clientDetails: { a: { nom: 'Client A' }, b: { nom: 'Client B' } } });
    const priorities = ENGINE.computePriorities(ctx);

    // Seuls les deux RDV du jour (ni annulé, ni demain) + les 2 tâches non
    // terminées doivent apparaître, soit 4 éléments.
    assert.strictEqual(priorities.length, 4);
    assert.strictEqual(priorities[0].id, 'priority-rdv-matin', 'le RDV du matin doit passer avant celui de l\'après-midi');
    assert.strictEqual(priorities[1].id, 'priority-rdv-apresmidi');
    assert.strictEqual(priorities[2].id, 'priority-todo-1');
    assert.strictEqual(priorities[2].priority, 'importante', 'une tâche haute priorité devient une priorité importante');
    assert.strictEqual(priorities[3].id, 'priority-todo-2');

    // Absence de données : aucune exception, liste vide.
    assert.strictEqual(ENGINE.computePriorities(baseCtx({})).length, 0);

    console.log('priorités du jour : OK');
})();

// ================= compute() : orchestration =================
(function () {
    // Absence totale de données : ne doit jamais lever d'exception.
    const empty = ENGINE.compute({});
    assert.strictEqual(empty.alerts.length, 0);
    assert.strictEqual(empty.priorities.length, 0);
    assert.strictEqual(empty.opportunities.length, 0);

    // Tri par priorité et plafonnement du nombre d'alertes.
    const ctx = {
        today: TODAY,
        devisCalc: devisCalc,
        factureCalc: factureCalc,
        agendaCalc: agendaCalc,
        tresorerieCalc: { computeSnapshot: () => ({ alertes: [{ titre: 'Trésorerie basse', sousTexte: 'Sous le seuil', niveau: 'warning', lien: 'tresorerie.html' }] }) },
        factureDetails: { f1: { statutEmission: 'emise', dateEcheance: '01/08/2026', lignes: [{ montant: 400 }], paiements: [] } },
        devisDetails: { d1: { versionActive: 1, versions: [{ version: 1, statut: 'envoye', dateCreation: '01/09/2026', dateModification: '01/09/2026', clientSlug: 'a', lignes: [{ montant: 5000 }] }] } },
        rdvDetails: { r1: { id: 'r1', statut: 'confirme', opportunite: 'fort', montantPotentiel: 900, clientSlug: 'a' } },
        clientDetails: { a: { nom: 'Client A', statut: 'a-relancer', dernierContact: '01/08/2026' } },
        todos: [],
        maxAlerts: 1
    };
    const result = ENGINE.compute(ctx);
    assert.strictEqual(result.alerts.length, 1, 'plafonné à maxAlerts malgré plusieurs alertes possibles');
    assert.strictEqual(result.alerts[0].priority, 'critique', 'la facture en retard (critique) doit passer avant la trésorerie (importante)');
    assert.ok(result.opportunities.length >= 2, 'le devis à forte valeur et le client à relancer doivent remonter en opportunités');

    console.log('compute() orchestration : OK');
})();

console.log('insights-engine.test.js: OK');
