# Sommaire du projet

> Ce fichier montre l'arborescence **initiale** de la V0 (livrée à l'étape 10). Le projet a depuis évolué jusqu'à la V0.9.1 (Clients/CRM, Produits/Services, Facturation, Agenda commercial, Trésorerie, Analyses...) — voir `README.md` pour la liste à jour des modules et `docs/changelog.md` pour le détail de chaque étape/version.

Arborescence initiale de la V0 (livrée à l'étape 10) :

```text
Application-Entrepreneurs-V0/
├── index.html            Point d'entrée : redirige vers pages/login.html
├── README.md             Présentation générale, périmètre, limites et instructions de test
├── PROJECT_INDEX.md      Ce fichier : sommaire de l'organisation du projet
│
├── css/                  Styles visuels de l'application
│   ├── styles.css        Toute la charte graphique de la V0 (couleurs, cartes, boutons, tableaux, pop-up...)
│   └── README.md
│
├── js/                   Interactions de l'application
│   ├── app.js            Redirection "Se connecter" + logique centralisée du pop-up "Work in progress"
│   └── README.md
│
├── pages/                Pages principales de la V0
│   ├── login.html        Page de connexion fictive
│   ├── dashboard.html    Tableau de bord enrichi (KPI, priorité, agenda, to-do, alertes, notifications, favoris)
│   ├── clients.html      Page Clients fictive (tableau de 4 clients)
│   ├── agenda.html       Page Agenda fictive (rendez-vous de la journée)
│   ├── facturation.html  Page Facturation fictive (tableau de devis/factures)
│   ├── database.html     Page Base de données fictive (6 cartes de bases centrales)
│   ├── settings.html     Page Paramètres fictive (6 sections)
│   └── README.md
│
├── components/           Éléments réutilisables de l'interface (réservé, non utilisé dans cette V0 statique)
│   ├── buttons/
│   ├── cards/
│   ├── tables/
│   ├── forms/
│   ├── modals/
│   └── README.md
│
├── assets/               Ressources graphiques (vide à ce stade, aucune image/icône intégrée)
│   ├── icons/
│   ├── images/
│   └── README.md
│
└── docs/                 Documentation interne du projet
    ├── changelog.md      Détail de chaque étape réalisée (étapes 0 à 10)
    ├── decisions.md      Décisions techniques et de conception prises pendant le développement
    └── README.md
```

## Comment naviguer dans ce projet

Chaque dossier contient son propre `README.md` expliquant son rôle précis, ce qui doit y être rangé et les règles à respecter pour les futures modifications.

- Pour comprendre ce qu'est la V0, ses limites et comment la tester : voir `README.md` à la racine.
- Pour l'historique détaillé du développement, étape par étape : voir `docs/changelog.md`.
- Pour comprendre les choix techniques et de conception effectués en cours de route : voir `docs/decisions.md`.

## Note sur les dossiers `components/` et `assets/`

Ces deux dossiers existent dans l'arborescence depuis l'étape 1, mais restent vides à l'issue de la V0 : pour cette version statique en HTML/CSS/JS natif, les éléments d'interface (boutons, cartes, tableaux, pop-up) ont été codés directement dans `css/styles.css` et `js/app.js`, avec une duplication volontaire et documentée de certains éléments (barre d'onglets) plutôt qu'un système de composants séparés. Ce choix est expliqué dans `docs/decisions.md` et listé comme piste d'évolution possible pour une version future.
