// Moteur d'insights V0.13 — Cockpit décisionnel.
//
// Objectif : transformer les données déjà présentes dans l'application
// (factures, devis, rendez-vous, clients, tâches, trésorerie) en constats
// utiles à la décision, pour les niveaux 2 (À surveiller), 3 (Mes priorités
// du jour) et 4 (Opportunités) du Dashboard.
//
// Règles explicites et déterministes uniquement — aucune IA, aucune
// estimation inventée. Chaque règle est documentée dans
// docs/insights-engine.md. Ce fichier ne touche pas au DOM : il prend un
// contexte de données en entrée (`compute(context)`) et renvoie des objets
// simples, ce qui le rend testable indépendamment du rendu (voir
// tests/insights-engine.test.js).
(function (root) {
    'use strict';

    var TYPES = { ALERT: 'alert', PRIORITY: 'priority', OPPORTUNITY: 'opportunity', INFO: 'info' };
    var PRIORITIES = { CRITICAL: 'critique', IMPORTANT: 'importante', NORMAL: 'normale' };
    var PRIORITY_RANK = { critique: 0, importante: 1, normale: 2 };
    var TODO_RANK = { haute: 0, moyenne: 1, basse: 2 };
    var RDV_CLOSED_STATUSES = { realise: true, annule: true, sans_suite: true };
    var RDV_OPEN_STATUSES = { prevu: true, confirme: true };

    function num(value, fallback) {
        var n = Number(value);
        return isFinite(n) ? n : fallback;
    }

    function money(calc, value) {
        if (calc && typeof calc.formatMoney === 'function') {
            return calc.formatMoney(value);
        }
        return String(Math.round((value || 0) * 100) / 100) + ' €';
    }

    function daysBetween(fromDate, toDate) {
        return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
    }

    function heureToMinutes(h) {
        if (!h) {
            return 0;
        }
        var parts = String(h).split(':');
        return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }

    function clientName(ctx, slug) {
        var client = ctx.clientDetails[slug];
        return client && client.nom ? client.nom : (slug || 'Client');
    }

    // ================= Niveau 2 — À surveiller (alertes) =================
    //
    // Chaque règle ne se déclenche que si les moteurs de calcul nécessaires
    // sont disponibles ; sinon elle renvoie une liste vide plutôt que
    // d'inventer un résultat.

    // Règle « Factures en retard » — agrégée : une facture émise, non
    // annulée, dont le statut calculé (COCKPIT_FACTURE_CALC) est
    // « en-retard ». Résultat : nombre de factures + montant restant à
    // encaisser, cumulés.
    function ruleFacturesEnRetard(ctx) {
        var cfg = ctx.alertSettings.overdueInvoice;
        if (!cfg || cfg.enabled === false) {
            return [];
        }
        var calc = ctx.devisCalc, fcalc = ctx.factureCalc;
        if (!calc || !fcalc) {
            return [];
        }
        var count = 0, montant = 0;
        Object.keys(ctx.factureDetails).forEach(function (key) {
            var f = ctx.factureDetails[key];
            if (f.statutEmission !== 'emise') {
                return;
            }
            var totals = calc.computeDevisTotals(f.lignes || []);
            var statut = fcalc.computeStatutAffiche({
                statutEmission: f.statutEmission,
                totalTTC: totals.totalTTC,
                paiements: f.paiements || [],
                dateEcheance: f.dateEcheance
            });
            if (statut !== 'en-retard') {
                return;
            }
            var paiementsInfo = fcalc.computePaiements(f.paiements || [], totals.totalTTC);
            count += 1;
            montant = calc.roundMoney(montant + paiementsInfo.resteAPayer);
        });
        if (count === 0) {
            return [];
        }
        return [{
            id: 'alert-factures-retard',
            type: TYPES.ALERT,
            priority: PRIORITIES.CRITICAL,
            title: count === 1 ? '1 facture est en retard' : count + ' factures sont en retard',
            description: money(calc, montant) + ' restent à encaisser.',
            value: montant,
            actionLabel: 'Voir les factures',
            actionUrl: 'facturation.html',
            source: 'factures'
        }];
    }

    // Règle « Devis en attente de réponse » — agrégée : devis dont la
    // version active est « envoyé » et sans modification depuis au moins
    // le seuil configuré (paramètres > Alertes > quoteNoReply.days,
    // 7 jours par défaut).
    function ruleDevisEnAttente(ctx) {
        var cfg = ctx.alertSettings.quoteNoReply;
        if (!cfg || cfg.enabled === false) {
            return [];
        }
        var seuil = num(cfg.days, 7);
        var calc = ctx.devisCalc, agendaCalc = ctx.agendaCalc;
        if (!calc || !agendaCalc) {
            return [];
        }
        var count = 0, montant = 0;
        Object.keys(ctx.devisDetails).forEach(function (key) {
            var devis = ctx.devisDetails[key];
            var version = calc.getActiveVersion ? calc.getActiveVersion(devis) : null;
            if (!version || version.statut !== 'envoye') {
                return;
            }
            var date = agendaCalc.parseDateFr(version.dateModification || version.dateCreation);
            if (!date) {
                return;
            }
            var elapsed = daysBetween(date, ctx.today);
            if (elapsed < seuil) {
                return;
            }
            count += 1;
            montant = calc.roundMoney(montant + calc.computeDevisTotals(version.lignes || []).totalTTC);
        });
        if (count === 0) {
            return [];
        }
        return [{
            id: 'alert-devis-attente',
            type: TYPES.ALERT,
            priority: PRIORITIES.IMPORTANT,
            title: (count === 1 ? '1 devis est' : count + ' devis sont') + ' en attente de réponse depuis plus de ' + seuil + ' jours',
            description: money(calc, montant) + ' de chiffre d\'affaires potentiel.',
            value: montant,
            actionLabel: 'Voir les devis',
            actionUrl: 'facturation.html',
            source: 'devis'
        }];
    }

    // Règle « Trésorerie » — réutilise telle quelle la sortie de
    // COCKPIT_TRESORERIE_CALC.computeSnapshot(horizon), déjà déterministe et
    // pilotée par les seuils des paramètres (montant bas, charge à venir).
    // Exclut les alertes « facture(s) en retard » : ce cas précis est déjà
    // couvert, avec le montant restant à encaisser, par la règle
    // « Factures en retard » ci-dessus — les reprendre ici doublonnerait la
    // même information (voir docs/insights-engine.md).
    var FACTURES_RETARD_PATTERN = /facture.*retard/i;
    function ruleTresorerie(ctx) {
        var calc = ctx.tresorerieCalc;
        if (!calc || typeof calc.computeSnapshot !== 'function') {
            return [];
        }
        var snapshot = calc.computeSnapshot(ctx.horizonDays);
        return (snapshot.alertes || [])
            .filter(function (a) { return !FACTURES_RETARD_PATTERN.test(a.titre || ''); })
            .map(function (a, index) {
                return {
                    id: 'alert-tresorerie-' + index,
                    type: TYPES.ALERT,
                    priority: a.niveau === 'critical' ? PRIORITIES.CRITICAL : PRIORITIES.IMPORTANT,
                    title: a.titre,
                    description: a.sousTexte || '',
                    value: null,
                    actionLabel: 'Voir la trésorerie',
                    actionUrl: a.lien || 'tresorerie.html',
                    source: 'tresorerie'
                };
            });
    }

    // Règle « Rendez-vous non confirmés » — agrégée : rendez-vous non clos,
    // non confirmés par le client, dans les N prochains jours (paramètres >
    // Alertes > unconfirmedAppointment.days, 2 jours par défaut).
    function ruleRdvNonConfirmes(ctx) {
        var cfg = ctx.alertSettings.unconfirmedAppointment;
        if (!cfg || cfg.enabled === false) {
            return [];
        }
        var seuil = num(cfg.days, 2);
        var agendaCalc = ctx.agendaCalc;
        if (!agendaCalc) {
            return [];
        }
        var count = 0;
        Object.keys(ctx.rdvDetails).forEach(function (key) {
            var r = ctx.rdvDetails[key];
            if (RDV_CLOSED_STATUSES[r.statut]) {
                return;
            }
            if (r.communication && r.communication.confirme) {
                return;
            }
            var date = agendaCalc.parseDateFr(r.date);
            if (!date) {
                return;
            }
            var remaining = daysBetween(ctx.today, date);
            if (remaining < 0 || remaining > seuil) {
                return;
            }
            count += 1;
        });
        if (count === 0) {
            return [];
        }
        return [{
            id: 'alert-rdv-non-confirmes',
            type: TYPES.ALERT,
            priority: PRIORITIES.IMPORTANT,
            title: count === 1 ? '1 rendez-vous n\'est pas confirmé' : count + ' rendez-vous ne sont pas confirmés',
            description: 'Dans les ' + seuil + ' prochains jours.',
            value: count,
            actionLabel: 'Voir l\'agenda',
            actionUrl: 'agenda.html',
            source: 'agenda'
        }];
    }

    function computeAlerts(ctx) {
        var rules = [ruleFacturesEnRetard, ruleDevisEnAttente, ruleTresorerie, ruleRdvNonConfirmes];
        var result = [];
        rules.forEach(function (rule) {
            (rule(ctx) || []).forEach(function (insight) { result.push(insight); });
        });
        return result;
    }

    // ================= Niveau 3 — Mes priorités du jour =================
    //
    // Réunit, sans les fusionner techniquement, ce qui est déjà prévu
    // aujourd'hui (rendez-vous du jour) et ce qui reste à faire (tâches non
    // terminées). Ne reprend pas les alertes du niveau 2 pour éviter de
    // répéter la même information à deux endroits du Dashboard.
    function computePriorities(ctx) {
        var result = [];
        var agendaCalc = ctx.agendaCalc;
        if (agendaCalc) {
            Object.keys(ctx.rdvDetails)
                .map(function (key) { return ctx.rdvDetails[key]; })
                .filter(function (r) {
                    if (RDV_CLOSED_STATUSES[r.statut]) {
                        return false;
                    }
                    var d = agendaCalc.parseDateFr(r.date);
                    return !!d && d.getTime() === ctx.today.getTime();
                })
                .sort(function (a, b) { return heureToMinutes(a.heureDebut) - heureToMinutes(b.heureDebut); })
                .forEach(function (r) {
                    result.push({
                        id: 'priority-rdv-' + r.id,
                        type: TYPES.PRIORITY,
                        priority: PRIORITIES.NORMAL,
                        title: (r.heureDebut ? r.heureDebut + ' — ' : '') + (r.titre || 'Rendez-vous'),
                        description: clientName(ctx, r.clientSlug),
                        value: null,
                        actionLabel: 'Voir le rendez-vous',
                        actionUrl: 'fiche-rdv.html?rdv=' + encodeURIComponent(r.id),
                        source: 'agenda'
                    });
                });
        }

        (ctx.todos || [])
            .filter(function (t) { return !t.terminee; })
            .slice()
            .sort(function (a, b) { return (TODO_RANK[a.priorite] === undefined ? 9 : TODO_RANK[a.priorite]) - (TODO_RANK[b.priorite] === undefined ? 9 : TODO_RANK[b.priorite]); })
            .forEach(function (t) {
                result.push({
                    id: 'priority-todo-' + t.id,
                    type: TYPES.PRIORITY,
                    priority: t.priorite === 'haute' ? PRIORITIES.IMPORTANT : PRIORITIES.NORMAL,
                    title: t.titre,
                    description: t.echeance ? 'Échéance : ' + t.echeance : '',
                    value: null,
                    actionLabel: null,
                    actionUrl: null,
                    source: 'todo'
                });
            });

        return result;
    }

    // ================= Niveau 4 — Opportunités =================
    //
    // Chaque règle s'appuie sur une donnée déjà saisie dans l'application
    // (statut client, historique de contact, montant de devis, potentiel
    // d'un rendez-vous) : aucun potentiel commercial n'est inventé.

    // Client dont le statut est explicitement « à relancer ».
    function ruleClientARelancer(ctx) {
        var result = [];
        Object.keys(ctx.clientDetails).forEach(function (slug) {
            var c = ctx.clientDetails[slug];
            if (c.statut !== 'a-relancer') {
                return;
            }
            result.push({
                id: 'opportunity-client-relance-' + slug,
                type: TYPES.OPPORTUNITY,
                priority: PRIORITIES.NORMAL,
                title: 'Relancer ' + (c.nom || slug),
                description: 'Client marqué « à relancer »' + (c.dernierContact ? ' · dernier contact le ' + c.dernierContact : '') + '.',
                value: null,
                actionLabel: 'Voir la fiche client',
                actionUrl: 'fiche-client.html?client=' + encodeURIComponent(slug),
                source: 'clients'
            });
        });
        return result;
    }

    // Client fidèle sans contact depuis plus longtemps que le délai de
    // relance configuré (paramètres > Clients > followUpDays, 7 jours par
    // défaut) : ce délai est réutilisé tel quel, sans nouveau seuil inventé.
    function ruleClientFideleInactif(ctx) {
        var agendaCalc = ctx.agendaCalc;
        if (!agendaCalc) {
            return [];
        }
        var seuil = ctx.clientsSettings.followUpDays;
        var result = [];
        Object.keys(ctx.clientDetails).forEach(function (slug) {
            var c = ctx.clientDetails[slug];
            if (c.statut !== 'fidele') {
                return;
            }
            var date = agendaCalc.parseDateFr(c.dernierContact);
            if (!date) {
                return;
            }
            var elapsed = daysBetween(date, ctx.today);
            if (elapsed < seuil) {
                return;
            }
            result.push({
                id: 'opportunity-client-fidele-' + slug,
                type: TYPES.OPPORTUNITY,
                priority: PRIORITIES.NORMAL,
                title: (c.nom || slug) + ' n\'a pas été recontacté depuis ' + elapsed + ' jours',
                description: 'Client fidèle — dernier contact le ' + c.dernierContact + '.',
                value: elapsed,
                actionLabel: 'Voir la fiche client',
                actionUrl: 'fiche-client.html?client=' + encodeURIComponent(slug),
                source: 'clients'
            });
        });
        return result;
    }

    // Devis ouvert (envoyé) au montant le plus élevé : signale l'opportunité
    // commerciale la plus importante à suivre, indépendamment de son
    // ancienneté (contrairement à la règle d'alerte « devis en attente »).
    function ruleDevisForteValeur(ctx) {
        var calc = ctx.devisCalc;
        if (!calc) {
            return [];
        }
        var candidates = [];
        Object.keys(ctx.devisDetails).forEach(function (key) {
            var devis = ctx.devisDetails[key];
            var version = calc.getActiveVersion ? calc.getActiveVersion(devis) : null;
            if (!version || version.statut !== 'envoye') {
                return;
            }
            var montant = calc.computeDevisTotals(version.lignes || []).totalTTC;
            if (!(montant > 0)) {
                return;
            }
            candidates.push({ key: key, version: version, montant: montant });
        });
        candidates.sort(function (a, b) { return b.montant - a.montant; });
        return candidates.slice(0, 1).map(function (item) {
            var client = ctx.clientDetails[item.version.clientSlug];
            var clientNom = client && client.nom ? client.nom
                : (item.version.clientSnapshot && item.version.clientSnapshot.nom) || item.version.clientSlug;
            return {
                id: 'opportunity-devis-' + item.key,
                type: TYPES.OPPORTUNITY,
                priority: PRIORITIES.NORMAL,
                title: 'Devis ' + item.key + ' — ' + clientNom,
                description: money(calc, item.montant) + ' potentiel, envoyé le ' + item.version.dateCreation + '.',
                value: item.montant,
                actionLabel: 'Voir le devis',
                actionUrl: 'devis-edition.html?devis=' + encodeURIComponent(item.key),
                source: 'devis'
            };
        });
    }

    // Rendez-vous non clos explicitement marqué à fort potentiel commercial
    // (champ `opportunite` déjà saisi sur la fiche RDV).
    function ruleRdvFortPotentiel(ctx) {
        var result = [];
        Object.keys(ctx.rdvDetails).forEach(function (key) {
            var r = ctx.rdvDetails[key];
            if (!RDV_OPEN_STATUSES[r.statut] || r.opportunite !== 'fort') {
                return;
            }
            result.push({
                id: 'opportunity-rdv-' + r.id,
                type: TYPES.OPPORTUNITY,
                priority: PRIORITIES.NORMAL,
                title: (r.titre || 'Rendez-vous') + ' — ' + clientName(ctx, r.clientSlug),
                description: r.montantPotentiel
                    ? 'Potentiel estimé : ' + money(ctx.devisCalc, r.montantPotentiel) + '.'
                    : 'Rendez-vous à fort potentiel commercial.',
                value: r.montantPotentiel || null,
                actionLabel: 'Voir le rendez-vous',
                actionUrl: 'fiche-rdv.html?rdv=' + encodeURIComponent(r.id),
                source: 'agenda'
            });
        });
        return result;
    }

    function computeOpportunities(ctx) {
        var rules = [ruleRdvFortPotentiel, ruleClientARelancer, ruleDevisForteValeur, ruleClientFideleInactif];
        var result = [];
        rules.forEach(function (rule) {
            (rule(ctx) || []).forEach(function (insight) { result.push(insight); });
        });
        return result;
    }

    // ================= Orchestration =================

    function sortByPriority(list) {
        return list.slice().sort(function (a, b) {
            var rankA = PRIORITY_RANK[a.priority] === undefined ? 9 : PRIORITY_RANK[a.priority];
            var rankB = PRIORITY_RANK[b.priority] === undefined ? 9 : PRIORITY_RANK[b.priority];
            return rankA - rankB;
        });
    }

    function normalizeContext(raw) {
        var ctx = raw || {};
        var today;
        if (ctx.today instanceof Date && !isNaN(ctx.today.getTime())) {
            today = new Date(ctx.today.getTime());
        } else {
            today = new Date();
        }
        today.setHours(0, 0, 0, 0);
        var alertSettings = ctx.alertSettings || {};
        var clientsSettings = ctx.clientsSettings || {};
        return {
            today: today,
            devisDetails: ctx.devisDetails || {},
            factureDetails: ctx.factureDetails || {},
            rdvDetails: ctx.rdvDetails || {},
            clientDetails: ctx.clientDetails || {},
            todos: ctx.todos || [],
            devisCalc: ctx.devisCalc || null,
            factureCalc: ctx.factureCalc || null,
            agendaCalc: ctx.agendaCalc || null,
            tresorerieCalc: ctx.tresorerieCalc || null,
            horizonDays: num(ctx.horizonDays, 30),
            alertSettings: {
                overdueInvoice: alertSettings.overdueInvoice || { enabled: true },
                quoteNoReply: alertSettings.quoteNoReply || { enabled: true, days: 7 },
                unconfirmedAppointment: alertSettings.unconfirmedAppointment || { enabled: true, days: 2 }
            },
            clientsSettings: { followUpDays: num(clientsSettings.followUpDays, 7) },
            maxAlerts: num(ctx.maxAlerts, 4),
            maxPriorities: num(ctx.maxPriorities, 6),
            maxOpportunities: num(ctx.maxOpportunities, 4)
        };
    }

    function compute(rawContext) {
        var ctx = normalizeContext(rawContext);
        return {
            alerts: sortByPriority(computeAlerts(ctx)).slice(0, ctx.maxAlerts),
            priorities: computePriorities(ctx).slice(0, ctx.maxPriorities),
            opportunities: sortByPriority(computeOpportunities(ctx)).slice(0, ctx.maxOpportunities)
        };
    }

    root.COCKPIT_INSIGHTS_ENGINE = {
        TYPES: TYPES,
        PRIORITIES: PRIORITIES,
        compute: compute,
        // Exposées séparément pour des tests ciblés par règle
        // (tests/insights-engine.test.js) sans dépendre du DOM.
        rules: {
            facturesEnRetard: ruleFacturesEnRetard,
            devisEnAttente: ruleDevisEnAttente,
            tresorerie: ruleTresorerie,
            rdvNonConfirmes: ruleRdvNonConfirmes,
            clientARelancer: ruleClientARelancer,
            clientFideleInactif: ruleClientFideleInactif,
            devisForteValeur: ruleDevisForteValeur,
            rdvFortPotentiel: ruleRdvFortPotentiel
        },
        computePriorities: computePriorities,
        normalizeContext: normalizeContext
    };
})(typeof window !== 'undefined' ? window : this);
