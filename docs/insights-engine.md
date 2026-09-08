# Moteur d'insights V0.13

> Complète `docs/positionnement-produit.md` (source de vérité produit) avec le détail technique du moteur qui alimente le Dashboard décisionnel.

## Rôle

Le Dashboard ne doit plus se contenter d'afficher des données : il doit répondre en quelques secondes à quatre questions (voir `docs/positionnement-produit.md`) :

1. Où en est mon entreprise ? → Niveau 1, KPI existants (`dashboard-kpis-situation`), inchangés en V0.13.
2. Qu'est-ce qui mérite mon attention ? → Niveau 2, alimenté par `insights.alerts`.
3. Que dois-je faire aujourd'hui ? → Niveau 3, alimenté par `insights.priorities`.
4. Quelles opportunités puis-je saisir ? → Niveau 4, alimenté par `insights.opportunities`.

`js/insights-engine.js` (`window.COCKPIT_INSIGHTS_ENGINE`) calcule ces trois listes à partir des données déjà chargées dans `app.js` (clients, devis, factures, rendez-vous, trésorerie, tâches). Il ne touche pas au DOM : `compute(context)` prend un objet de données en entrée et renvoie `{ alerts, priorities, opportunities }`, ce qui le rend testable indépendamment du rendu (`tests/insights-engine.test.js`). Le rendu (construction des `<li>`/cartes, empty states) reste dans `js/app.js`, à l'endroit où vivait déjà le rendu du Dashboard.

## Principes

- **Règles explicites et déterministes uniquement.** Chaque règle est une fonction pure listée ci-dessous ; aucune estimation ou recommandation n'est inventée. Pas d'IA, pas d'appel externe.
- **Réutilise les seuils déjà configurables** dans le Centre de paramètres (`window.COCKPIT_SETTINGS`, section `alerts` et `clients.followUpDays`) plutôt que d'en inventer de nouveaux.
- **Réutilise les moteurs de calcul existants** (`COCKPIT_DEVIS_CALC`, `COCKPIT_FACTURE_CALC`, `COCKPIT_AGENDA_CALC`, `COCKPIT_TRESORERIE_CALC`) — le moteur d'insights ne recalcule pas de logique métier déjà correcte ailleurs.
- **Silencieux par défaut.** Si un moteur de calcul nécessaire est absent, une règle renvoie une liste vide plutôt que de lever une exception ou d'afficher une donnée approximative.
- **Pas de répétition entre niveaux.** Un même fait n'est présenté qu'une fois. En particulier, l'alerte « facture(s) en retard » que `COCKPIT_TRESORERIE_CALC.computeSnapshot()` remonte déjà (par l'intermédiaire de `js/settings-consumers.js`) est filtrée de la règle trésorerie du niveau 2, puisque la règle « Factures en retard » du moteur d'insights couvre déjà ce cas, avec le montant restant à encaisser en plus.

## Structure d'un insight

```js
{
  id, type, priority, title, description, value,
  actionLabel, actionUrl, source
}
```

- `type` : `alert` | `priority` | `opportunity` | `info` (`info` n'est pas encore utilisé en V0.13, réservé pour une itération ultérieure).
- `priority` : `critique` | `importante` | `normale`.
- `value` : donnée numérique brute derrière le constat (montant, nombre de jours…), utile pour un futur tri ou affichage alternatif ; peut être `null`.
- `actionUrl`/`actionLabel` : `null` quand aucune destination pertinente n'existe déjà dans l'application (ex. une tâche de la to-do list).

## Règles implémentées

### Niveau 2 — À surveiller (`insights.alerts`)

| Règle | Source | Condition | Résultat | Priorité | Action |
|---|---|---|---|---|---|
| Factures en retard | Factures | Facture émise, statut calculé `en-retard` (`COCKPIT_FACTURE_CALC`) | Agrégée : nombre + montant restant à encaisser cumulé | Critique | Voir les factures → `facturation.html` |
| Devis en attente de réponse | Devis | Version active `envoyé`, sans modification depuis ≥ seuil (`alerts.quoteNoReply.days`, 7 j. par défaut) | Agrégée : nombre + montant potentiel cumulé | Importante | Voir les devis → `facturation.html` |
| Trésorerie | Trésorerie | Alertes déjà calculées par `COCKPIT_TRESORERIE_CALC.computeSnapshot()` (seuils `alerts.lowCash`, `alerts.upcomingHeavyCharge`), hors « facture(s) en retard » (dédoublonnée avec la règle ci-dessus) | Reprise telle quelle | Critique/Importante selon le niveau d'origine | Voir la trésorerie → `tresorerie.html` |
| Rendez-vous non confirmés | Rendez-vous | Non clos, non confirmé par le client, dans les N prochains jours (`alerts.unconfirmedAppointment.days`, 2 j. par défaut) | Agrégée : nombre | Importante | Voir l'agenda → `agenda.html` |

Chaque règle est désactivable individuellement via le Centre de paramètres (`enabled: false` sur la section correspondante).

### Niveau 3 — Mes priorités du jour (`insights.priorities`)

Réunit, sans les fusionner techniquement, deux sources déjà existantes :

- les rendez-vous du jour (non annulés/sans suite/réalisés), triés par heure ;
- les tâches non terminées de la to-do list, triées par priorité (haute → moyenne → basse).

Les alertes du niveau 2 ne sont volontairement pas reprises ici, pour éviter de répéter la même information à deux endroits du Dashboard.

### Niveau 4 — Opportunités (`insights.opportunities`)

| Règle | Source | Condition | Action |
|---|---|---|---|
| Client à relancer | Clients | `statut === 'a-relancer'` (statut existant du référentiel Clients) | Voir la fiche client |
| Client fidèle sans contact récent | Clients | `statut === 'fidele'` et dernier contact ≥ `clients.followUpDays` (7 j. par défaut, seuil réutilisé) | Voir la fiche client |
| Devis ouvert à forte valeur | Devis | Devis actifs `envoyé`, le plus élevé par montant (indépendamment de son ancienneté — à la différence de l'alerte « devis en attente ») | Voir le devis |
| Rendez-vous à fort potentiel | Rendez-vous | Non clos (`prevu`/`confirme`) et champ `opportunite === 'fort'` déjà saisi sur la fiche RDV | Voir le rendez-vous |

## Limites connues de la V0.13

- **Dates de la démonstration.** La plupart des rendez-vous et devis de démonstration portent encore des dates fixes (février à juillet 2026) ; selon la date système réelle, les règles « rendez-vous du jour » ou « rendez-vous non confirmés » peuvent ne rien remonter pour ces entrées-là, alors qu'elles fonctionneraient normalement sur des données réelles à jour. Depuis la V0.13.1, un petit nombre d'entrées clés (un rendez-vous du jour, un devis en attente, une facture en retard, un dernier contact client) sont calculées par rapport à la date réelle du jour (`window.COCKPIT_DEMO_DATES`, voir `js/app.js`) pour garantir une démonstration cohérente du Dashboard ; le reste du jeu de données n'a pas été converti (voir `docs/decisions.md`). Ce n'est pas une limite du moteur mais du jeu de données de la V0.
- **Pas de persistance.** Comme le reste de la V0, les tâches de la to-do list restent en mémoire de page.
- **Opportunités volontairement limitées à 4 règles** simples et directement justifiées par une donnée déjà saisie. Pas de score de potentiel commercial global, pas de recommandation combinée.
- **Le type `info`** de la structure d'insight est prévu mais non utilisé en V0.13 : aucun constat purement informatif (hors attention/priorité/opportunité) n'a été jugé nécessaire pour cette itération.
- **`js/settings-alerts.js`** (V0.11, ancienne source d'alertes du Dashboard) a été supprimé en V0.13.1 : ses règles avaient déjà été reprises, agrégées et enrichies (montants) dans `insights-engine.js` en V0.13, et il n'était plus chargé ni utilisé nulle part (voir `docs/decisions.md`).

## Règles envisageables pour une itération ultérieure

- Relance automatique des rendez-vous reportés plusieurs fois (règle `repeatedPostponement` déjà présente dans les paramètres, non reprise dans le moteur d'insights en V0.13).
- Objectif de chiffre d'affaires en retard (`alerts.lateGoal`), déjà affiché sous forme de KPI au niveau 1 : à évaluer si une reformulation en insight apporte une valeur supplémentaire.
- Un type `info` pour des constats neutres (ex. tendance d'activité), séparés des alertes et opportunités.
- Priorisation des opportunités par valeur estimée plutôt que par ordre de règle, si leur nombre augmente.
