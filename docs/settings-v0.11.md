# V0.11 — Centre de paramètres (en revue humaine)

> Statut : développement sur `v0.11-settings-center`. Cette version et ses jalons ne sont pas validés tant que la recette navigateur humaine n'est pas terminée.

## Cartographie préalable

| Réglage | Source actuelle avant V0.11 | Pages consommatrices | Fonctionnel avant V0.11 | Destination V0.11 |
|---|---|---|---|---|
| Profil / identité de démo | `js/demo-config.js` | Dashboard, Paramètres, documents | Oui, mais uniquement par modification du code | `profile` + `demo`, persistés séparément |
| Entreprise | `COMPANY_SETTINGS` dans `js/app.js` et `pages/parametres-entreprise.html` | Devis, factures, documents | Formulaire non persistant | `company`, snapshots uniquement pour les nouveaux documents |
| Pilotage Dashboard | `js/pilotage-config.js` et contrôles du Dashboard | Dashboard, Paramètres | Valeurs codées en dur | `dashboard`, valeurs par défaut persistantes |
| Agenda | Constantes dans `app.js` et `pilotage-config.js` | Agenda, mini-agenda Dashboard | Partiellement configurable dans le code | `agenda`, adaptateur partagé |
| Statuts Clients | Tableau local `CLIENT_STATUSES` | Liste Clients, fiche client | Liste centralisée mais non modifiable | `clients.statuses`, compatibilité `COCKPIT_CLIENT_STATUSES` |
| Types/statuts Produits | Tableaux locaux de `app.js` | Liste et fiche Produits/Services, devis | Non persistants | `products.types` / `products.statuses` |
| Modalités de paiement | Tableaux et chaînes du module Facturation | Produits, devis, factures, paiements | Codées en dur | `products.paymentTerms` + `billing.acceptedPaymentMethods` |
| Numérotation et documents | Fonctions de calcul et `COMPANY_SETTINGS` | Éditeurs et documents | Indicatif, en mémoire | `billing`, avec avertissement prototype |
| Trésorerie | Constantes de seuils et catégories | Trésorerie, Dashboard | Calculs réels sur données fictives | `treasury` + seuils d'alertes |
| Analyses | Valeurs locales de la page | Analyses | Contrôles temporaires | `analytics`, valeurs d'ouverture par défaut |
| Alertes | Seuils codés en dur dans Dashboard/Trésorerie | Dashboard, Trésorerie | Calculées mais non configurables | `alerts`, seuils et activation centralisés |
| Apparence | CSS et sélecteurs de listes | Toutes les pages | Non persistante | `appearance`, réglages limités et sûrs |

## Architecture retenue

La V0.11 utilise une architecture hybride :

- `pages/settings.html` devient le centre de configuration avec navigation secondaire, recherche, sauvegarde par section et gestion des états non enregistrés ;
- `js/settings-defaults.js` définit le schéma versionné et les valeurs par défaut ;
- `js/settings-store.js` encapsule `localStorage`, filtre les propriétés, fusionne les valeurs manquantes, migre le schéma et publie une API stable ;
- `js/demo-config.js` reste le point d'entrée historique chargé avant `app.js` et charge synchroniquement le nouveau socle ;
- `js/demo-config-adapter.js`, `js/pilotage-config.js` et `js/settings-consumers.js` préservent les anciennes interfaces globales ;
- les documents historiques conservent leur snapshot ; seuls les nouveaux documents utilisent les réglages courants.

Clé locale : `cockpit.settings.v1`.

## Sécurité et limites

La configuration est enregistrée dans le navigateur actuel uniquement. Il ne s'agit pas d'une sauvegarde cloud, d'une synchronisation, d'une base de données ou d'un stockage sécurisé. Aucun mot de passe, secret, jeton ou donnée métier ne doit être enregistré dans les paramètres.

Les fonctions de compte sécurisé, double authentification, sessions, appareils, permissions, e-mail, push et SMS sont affichées comme indisponibles sans backend. Aucun envoi ni mécanisme de sécurité n'est simulé.

L'export JSON contient seulement la configuration. L'import refuse les propriétés inconnues, complète les valeurs manquantes avec les valeurs par défaut et n'exécute aucun contenu.

## API publique

```javascript
COCKPIT_SETTINGS.get();
COCKPIT_SETTINGS.getSection('agenda');
COCKPIT_SETTINGS.updateSection('agenda', values);
COCKPIT_SETTINGS.resetSection('agenda');
COCKPIT_SETTINGS.resetAll();
COCKPIT_SETTINGS.exportConfig();
COCKPIT_SETTINGS.importConfig(data);
COCKPIT_SETTINGS.validateImport(data);
COCKPIT_SETTINGS.subscribe(listener);
```

## Checklist de recette navigateur

1. Ouvrir `pages/settings.html` et parcourir toutes les sections sans erreur console.
2. Vérifier que le hash conserve et rouvre la section sélectionnée.
3. Rechercher « TVA », « horaires », « objectif », « devis », « notification » et « statut client » ; vérifier l'ouverture et la mise en évidence du bon réglage.
4. Modifier Profil, Entreprise et Apparence ; vérifier l'état « non enregistré », l'enregistrement, puis le maintien après rechargement.
5. Vérifier l'avertissement avant de quitter une section modifiée et avant chaque réinitialisation.
6. Exporter le JSON, vérifier qu'il ne contient aucune donnée métier, puis le réimporter après modification.
7. Refuser un JSON invalide, une version de schéma future et une propriété inconnue.
8. Charger les valeurs de démonstration et vérifier que le profil de démonstration reste distinct du profil utilisateur.
9. Vérifier le message d'accueil et la carte Compte après modification du profil.
10. Créer un nouveau devis/facture et vérifier l'émetteur, les coordonnées et les valeurs par défaut ; ouvrir un document historique et vérifier que son snapshot n'a pas changé.
11. Vérifier les valeurs par défaut du Dashboard : période, horizon, graphique, indicateur et nombre maximal d'alertes.
12. Vérifier l'Agenda : vue d'ouverture, horaires, pas horaire, statut initial, week-ends et affichage d'un RDV hors plage.
13. Vérifier les listes Clients et Produits/Services : statuts actifs, ordre, couleur, pagination et conservation des valeurs désactivées sur les données existantes.
14. Vérifier la Facturation : préfixes, aperçu indicatif, TVA, conditions et moyens de paiement.
15. Vérifier la Trésorerie : horizon, seuils, catégories et visibilité réalisé/prévu.
16. Vérifier les Analyses : onglet, période, classements, graphiques et tunnels.
17. Vérifier que les notifications externes et les fonctions de sécurité restent explicitement indisponibles.
18. Vérifier les chemins de scripts et l'absence de 404 sur toutes les pages principales.
19. Vérifier que `main` reste inchangée et qu'aucun tag `v0.11` n'existe avant validation humaine.
