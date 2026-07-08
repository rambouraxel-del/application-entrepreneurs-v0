// Logique d'interactions de l'application - à développer lors des prochaines étapes (navigation, pop-ups).

document.addEventListener('DOMContentLoaded', function () {
    var loginButton = document.getElementById('login-button');
    if (loginButton) {
        loginButton.addEventListener('click', function () {
            window.location.href = 'dashboard.html';
        });
    }
});

// Pop-up centralisé "Work in progress" (étape 7)
// Le contenu et le comportement du pop-up sont définis une seule fois ici.
// Tout élément portant la classe "btn-wip", sur n'importe quelle page, déclenche ce même pop-up.

(function () {
    var WIP_TITLE = 'Work in progress';
    var WIP_MESSAGE = 'Cette fonctionnalité sera développée dans une prochaine version.';
    var overlay = null;

    function createWipPopup() {
        overlay = document.createElement('div');
        overlay.className = 'wip-overlay';

        var modal = document.createElement('div');
        modal.className = 'wip-modal';

        var title = document.createElement('h2');
        title.className = 'wip-title';
        title.textContent = WIP_TITLE;

        var message = document.createElement('p');
        message.className = 'wip-message';
        message.textContent = WIP_MESSAGE;

        var closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-primary wip-close';
        closeButton.textContent = 'Fermer';
        closeButton.addEventListener('click', closeWipPopup);

        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);

        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                closeWipPopup();
            }
        });

        document.body.appendChild(overlay);
    }

    function openWipPopup() {
        if (!overlay) {
            createWipPopup();
        }
        overlay.classList.add('wip-overlay-visible');
    }

    function closeWipPopup() {
        if (overlay) {
            overlay.classList.remove('wip-overlay-visible');
        }
    }

    document.addEventListener('click', function (event) {
        var trigger = event.target.closest('.btn-wip');
        if (trigger) {
            event.preventDefault();
            openWipPopup();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && overlay && overlay.classList.contains('wip-overlay-visible')) {
            closeWipPopup();
        }
    });
})();

// Moteur de modale générique (V0.4.3)
// Réutilisable par n'importe quelle page : le contenu (titre, action d'en-tête
// optionnelle, corps, pied) est fourni par l'appelant via COCKPIT_MODAL.open(...).
// Reste indépendant du pop-up "Work in progress" ci-dessus, pour ne pas risquer
// de régression sur ce composant déjà validé.

(function () {
    var overlay = null;
    var modalCard = null;
    var titleEl = null;
    var headerExtraSlot = null;
    var bodyEl = null;
    var footerEl = null;
    var closeXButton = null;
    var lastTrigger = null;

    function build() {
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        modalCard = document.createElement('div');
        modalCard.className = 'modal-card';
        modalCard.setAttribute('role', 'dialog');
        modalCard.setAttribute('aria-modal', 'true');

        var header = document.createElement('div');
        header.className = 'modal-header';

        titleEl = document.createElement('h2');
        titleEl.className = 'modal-title';

        headerExtraSlot = document.createElement('div');
        headerExtraSlot.className = 'modal-header-extra';

        closeXButton = document.createElement('button');
        closeXButton.type = 'button';
        closeXButton.className = 'modal-close-x';
        closeXButton.setAttribute('aria-label', 'Fermer');
        closeXButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeXButton.addEventListener('click', function () {
            close();
        });

        header.appendChild(titleEl);
        header.appendChild(headerExtraSlot);
        header.appendChild(closeXButton);

        bodyEl = document.createElement('div');
        bodyEl.className = 'modal-body';

        footerEl = document.createElement('div');
        footerEl.className = 'modal-footer';

        modalCard.appendChild(header);
        modalCard.appendChild(bodyEl);
        modalCard.appendChild(footerEl);
        overlay.appendChild(modalCard);

        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
                close();
            }
        });

        document.body.appendChild(overlay);
    }

    function open(options) {
        if (!overlay) {
            build();
        }

        lastTrigger = document.activeElement;

        titleEl.textContent = (options && options.title) || '';

        headerExtraSlot.innerHTML = '';
        if (options && options.headerExtra) {
            headerExtraSlot.appendChild(options.headerExtra);
        }

        bodyEl.innerHTML = '';
        if (options && options.body) {
            bodyEl.appendChild(options.body);
        }

        footerEl.innerHTML = '';
        if (options && options.footer) {
            footerEl.appendChild(options.footer);
        }

        overlay.classList.add('modal-overlay-visible');

        var focusTarget = modalCard.querySelector('[data-modal-autofocus]') || closeXButton;
        focusTarget.focus();
    }

    function close() {
        if (overlay) {
            overlay.classList.remove('modal-overlay-visible');
        }
        if (lastTrigger && typeof lastTrigger.focus === 'function') {
            lastTrigger.focus();
        }
        lastTrigger = null;
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && overlay && overlay.classList.contains('modal-overlay-visible')) {
            close();
        }
    });

    document.addEventListener('click', function (event) {
        if (event.target.closest('[data-modal-close]')) {
            event.preventDefault();
            close();
        }
    });

    window.COCKPIT_MODAL = { open: open, close: close };
})();

// Pagination générique de listes (V0.5.4)
// Réutilisable par n'importe quelle page listant des lignes de tableau
// (Clients, Produits/Services, et les futures listes Devis/Factures/Trésorerie
// en V0.6+). Le helper ignore tout des filtres métier : chaque page lui fournit
// ses propres éléments DOM et une fonction matchRow(row, searchValue) qui
// referme sur ses filtres spécifiques (un seul filtre statut pour Clients,
// deux filtres type+statut pour Produits/Services, etc.).

(function () {
    function init(config) {
        var currentPage = 1;

        function getPageSize() {
            var value = parseInt(config.pageSizeSelect.value, 10);
            return value > 0 ? value : 5;
        }

        function render() {
            var searchValue = config.searchInput.value.trim().toLowerCase();
            var filtered = config.rows.filter(function (row) {
                return config.matchRow(row, searchValue);
            });

            var pageSize = getPageSize();
            var totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
            if (currentPage > totalPages) {
                currentPage = totalPages;
            }
            if (currentPage < 1) {
                currentPage = 1;
            }

            var start = (currentPage - 1) * pageSize;
            var pageRows = filtered.slice(start, start + pageSize);

            config.rows.forEach(function (row) {
                row.style.display = pageRows.indexOf(row) !== -1 ? '' : 'none';
            });

            if (filtered.length === 0) {
                config.counterEl.textContent = config.labelEmpty;
            } else {
                var rangeStart = start + 1;
                var rangeEnd = Math.min(start + pageSize, filtered.length);
                var label = filtered.length > 1 ? config.labelPlural : config.labelSingular;
                config.counterEl.textContent = rangeStart + '–' + rangeEnd + ' sur ' + filtered.length + ' ' + label;
            }

            if (config.pageIndicatorEl) {
                config.pageIndicatorEl.textContent = 'Page ' + currentPage + ' sur ' + totalPages;
            }
            if (config.prevButton) {
                config.prevButton.disabled = currentPage <= 1;
            }
            if (config.nextButton) {
                config.nextButton.disabled = currentPage >= totalPages;
            }
        }

        config.searchInput.addEventListener('input', function () {
            currentPage = 1;
            render();
        });

        (config.filterSelects || []).forEach(function (select) {
            select.addEventListener('change', function () {
                currentPage = 1;
                render();
            });
        });

        config.pageSizeSelect.addEventListener('change', function () {
            currentPage = 1;
            render();
        });

        if (config.prevButton) {
            config.prevButton.addEventListener('click', function () {
                if (currentPage > 1) {
                    currentPage--;
                    render();
                }
            });
        }

        if (config.nextButton) {
            config.nextButton.addEventListener('click', function () {
                currentPage++;
                render();
            });
        }

        if (config.resetButton) {
            config.resetButton.addEventListener('click', function () {
                config.searchInput.value = '';
                (config.filterSelects || []).forEach(function (select) {
                    select.value = '';
                });
                config.pageSizeSelect.value = '5';
                currentPage = 1;
                render();
            });
        }

        render();
    }

    window.COCKPIT_LIST_PAGINATION = { init: init };
})();

// Page Clients : recherche, filtre par statut, pagination et compteur
// enrichi (V0.4.1, pagination ajoutée en V0.5.4 via COCKPIT_LIST_PAGINATION).
// La liste des statuts est centralisée ici : c'est la seule source à modifier
// pour faire évoluer les statuts disponibles (préparation de la V0.4.3).

(function () {
    var CLIENT_STATUSES = [
        { value: 'prospect', label: 'Prospect', badgeClass: 'badge-neutral' },
        { value: 'client-actif', label: 'Client actif', badgeClass: 'badge-success' },
        { value: 'a-relancer', label: 'À relancer', badgeClass: 'badge-warning' },
        { value: 'inactif', label: 'Inactif', badgeClass: 'badge-neutral' },
        { value: 'fidele', label: 'Fidèle', badgeClass: 'badge-info' },
        { value: 'litige', label: 'Litige', badgeClass: 'badge-danger' }
    ];

    window.COCKPIT_CLIENT_STATUSES = CLIENT_STATUSES;

    var table = document.getElementById('clients-table');
    var searchInput = document.getElementById('clients-search');
    var statusFilter = document.getElementById('clients-status-filter');
    var resetButton = document.getElementById('clients-reset-filters');
    var counter = document.getElementById('clients-counter');
    var pageSizeSelect = document.getElementById('clients-page-size');
    var prevButton = document.getElementById('clients-prev-page');
    var nextButton = document.getElementById('clients-next-page');
    var pageIndicator = document.getElementById('clients-page-indicator');

    if (!table || !searchInput || !statusFilter || !counter || !pageSizeSelect) {
        return;
    }

    CLIENT_STATUSES.forEach(function (status) {
        var option = document.createElement('option');
        option.value = status.value;
        option.textContent = status.label;
        statusFilter.appendChild(option);
    });

    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));

    window.COCKPIT_LIST_PAGINATION.init({
        rows: rows,
        searchInput: searchInput,
        filterSelects: [statusFilter],
        resetButton: resetButton,
        counterEl: counter,
        pageSizeSelect: pageSizeSelect,
        prevButton: prevButton,
        nextButton: nextButton,
        pageIndicatorEl: pageIndicator,
        labelSingular: 'client',
        labelPlural: 'clients',
        labelEmpty: 'Aucun client trouvé',
        matchRow: function (row, searchValue) {
            var matchesSearch = !searchValue || (row.dataset.search || '').indexOf(searchValue) !== -1;
            var matchesStatus = !statusFilter.value || row.dataset.status === statusFilter.value;
            return matchesSearch && matchesStatus;
        }
    });
})();

// Page Fiche client : fiche CRM complète à partir de données statiques (V0.4.2)
// CLIENT_DETAILS est une source temporaire et fictive, une entrée par slug déjà
// présent dans pages/clients.html. Elle prépare une vraie source de données
// (backend) sans en construire une dès maintenant.

(function () {
    var HISTORY_TYPES = {
        'appel-sortant': { label: 'Appel sortant', badgeClass: 'badge-success' },
        'email-envoye': { label: 'E-mail envoyé', badgeClass: 'badge-info' },
        'email-recu': { label: 'E-mail reçu', badgeClass: 'badge-neutral' },
        'rdv-realise': { label: 'Rendez-vous réalisé', badgeClass: 'badge-success' },
        'relance': { label: 'Relance', badgeClass: 'badge-warning' },
        'commentaire-interne': { label: 'Commentaire interne', badgeClass: 'badge-neutral' }
    };

    var CLIENT_DETAILS = {
        'martin-dupont': {
            nom: 'Martin Dupont',
            entreprise: '—',
            statut: 'client-actif',
            telephone: '01 23 45 67 89',
            email: 'martin.dupont@example.com',
            dernierContact: '02/07/2026',
            adresse: '12 rue des Artisans, 75011 Paris',
            clientDepuis: '12/03/2026',
            kpis: {
                caGenere: { value: '4 250 €', caption: 'sur 12 derniers mois' },
                montantAEncaisser: { value: '0 €', caption: 'aucune facture impayée' },
                devisEnCours: { value: '1', caption: 'en attente de réponse' },
                prochaineAction: { value: '08/07/2026', caption: 'Rendez-vous prévu' },
                avantages: { value: '150 €', caption: 'avantages accordés' }
            },
            info: {
                statutJuridique: 'Particulier', siret: '—', secteur: 'Rénovation intérieure', siteWeb: '—',
                commercialReferent: 'Julien Martin', conditionsPaiement: '30 jours fin de mois',
                modeReglement: 'Virement bancaire', categorieClient: 'Client actif',
                sourceAcquisition: 'Bouche-à-oreille', tva: '—'
            },
            notes: [
                { contenu: 'Intéressé par notre offre d\'entretien annuel.', auteur: 'Julien Martin', date: '02/07/2026' },
                { contenu: 'Satisfait de la dernière intervention, évoque un futur projet de rénovation.', auteur: 'Julien Martin', date: '20/06/2026' },
                { contenu: 'Premier contact suite à une recommandation d\'un voisin.', auteur: 'Julien Martin', date: '05/06/2026' }
            ],
            notesArchive: [
                { contenu: 'Demande d\'information sur nos horaires d\'intervention.', auteur: 'Julien Martin', date: '28/05/2026' },
                { contenu: 'Premier échange téléphonique, présentation de nos services.', auteur: 'Julien Martin', date: '20/05/2026' }
            ],
            historique: [
                { date: '02/07/2026', heure: '10:15', type: 'appel-sortant', resume: 'Appel de suivi après la dernière intervention. Intérêt confirmé pour l\'offre d\'entretien.', auteur: 'Julien Martin' },
                { date: '28/06/2026', heure: '09:42', type: 'email-envoye', resume: 'Envoi du devis n°DV-2026-015 pour l\'entretien annuel.', auteur: 'Julien Martin' },
                { date: '20/06/2026', heure: '14:00', type: 'rdv-realise', resume: 'Rendez-vous sur site pour évaluation des besoins.', auteur: 'Julien Martin' },
                { date: '10/06/2026', heure: '11:20', type: 'relance', resume: 'Relance suite à la première prise de contact.', auteur: 'Julien Martin' },
                { date: '05/06/2026', heure: '08:55', type: 'commentaire-interne', resume: 'Client sérieux, bon potentiel de fidélisation.', auteur: 'Julien Martin' }
            ],
            rendezVous: [
                { id: 'rdv-martin-dupont-1', date: '08/07/2026', heure: '10:00', objet: 'Présentation offre entretien', lieu: 'Visioconférence', statut: 'Confirmé', badgeClass: 'badge-success' },
                { id: 'rdv-martin-dupont-2', date: '22/07/2026', heure: '14:00', objet: 'Suivi chantier', lieu: '12 rue des Artisans, Paris', statut: 'Planifié', badgeClass: 'badge-info' }
            ],
            documents: [
                { nom: 'DV-2026-015', type: 'Devis', date: '28/06/2026', statut: 'Envoyé', badgeClass: 'badge-info' },
                { nom: 'FA-2026-048', type: 'Facture', date: '20/06/2026', statut: 'Payée', badgeClass: 'badge-success' }
            ]
        },
        'sophie-bernard': {
            nom: 'Sophie Bernard',
            entreprise: '—',
            statut: 'fidele',
            telephone: '02 34 56 78 90',
            email: 'sophie.bernard@example.com',
            dernierContact: '28/06/2026',
            adresse: '8 avenue des Tilleuls, 69003 Lyon',
            clientDepuis: '14/01/2024',
            kpis: {
                caGenere: { value: '11 800 €', caption: 'sur 12 derniers mois' },
                montantAEncaisser: { value: '0 €', caption: 'aucune facture impayée' },
                devisEnCours: { value: '0', caption: 'aucun devis en attente' },
                prochaineAction: { value: '15/07/2026', caption: 'Rendez-vous prévu' },
                avantages: { value: '320 €', caption: 'avantages accordés' }
            },
            info: {
                statutJuridique: 'Particulier', siret: '—', secteur: 'Services aux particuliers', siteWeb: '—',
                commercialReferent: 'Léa Bernard', conditionsPaiement: 'Comptant',
                modeReglement: 'Carte bancaire', categorieClient: 'Client fidèle',
                sourceAcquisition: 'Site web', tva: '—'
            },
            notes: [
                { contenu: 'Cliente fidèle depuis 2 ans, toujours ponctuelle dans ses paiements.', auteur: 'Léa Bernard', date: '28/06/2026' },
                { contenu: 'A recommandé nos services à deux proches ce trimestre.', auteur: 'Léa Bernard', date: '15/05/2026' },
                { contenu: 'Souhaite être informée en priorité des nouvelles offres.', auteur: 'Léa Bernard', date: '02/04/2026' }
            ],
            notesArchive: [
                { contenu: 'A profité de l\'offre de parrainage lors de son inscription.', auteur: 'Léa Bernard', date: '10/12/2025' },
                { contenu: 'Cliente très satisfaite de la première prestation réalisée.', auteur: 'Léa Bernard', date: '14/01/2024' }
            ],
            historique: [
                { date: '28/06/2026', heure: '16:10', type: 'email-recu', resume: 'Confirmation de satisfaction suite à la dernière prestation.', auteur: 'Léa Bernard' },
                { date: '15/05/2026', heure: '09:30', type: 'rdv-realise', resume: 'Rendez-vous annuel de suivi réalisé.', auteur: 'Léa Bernard' },
                { date: '02/04/2026', heure: '13:45', type: 'appel-sortant', resume: 'Appel de courtoisie pour le renouvellement du contrat.', auteur: 'Léa Bernard' },
                { date: '20/02/2026', heure: '10:05', type: 'email-envoye', resume: 'Envoi de la facture annuelle FA-2026-012.', auteur: 'Léa Bernard' },
                { date: '08/01/2026', heure: '15:20', type: 'commentaire-interne', resume: 'Cliente à privilégier pour le programme de fidélité.', auteur: 'Léa Bernard' }
            ],
            rendezVous: [
                { id: 'rdv-sophie-bernard-1', date: '15/07/2026', heure: '09:30', objet: 'Rendez-vous annuel de suivi', lieu: '8 avenue des Tilleuls, Lyon', statut: 'Planifié', badgeClass: 'badge-info' }
            ],
            documents: [
                { nom: 'FA-2026-012', type: 'Facture', date: '20/02/2026', statut: 'Payée', badgeClass: 'badge-success' },
                { nom: 'CON-2025-007', type: 'Contrat', date: '14/01/2025', statut: 'Signé', badgeClass: 'badge-success' }
            ]
        },
        'atelier-leroy': {
            nom: 'Atelier Leroy',
            entreprise: 'Atelier Leroy',
            statut: 'a-relancer',
            telephone: '03 45 67 89 01',
            email: 'contact@atelierleroy.example.com',
            dernierContact: '15/06/2026',
            adresse: '24 rue de l\'Artisanat, 44000 Nantes',
            clientDepuis: '03/09/2025',
            kpis: {
                caGenere: { value: '6 500 €', caption: 'sur 12 derniers mois' },
                montantAEncaisser: { value: '1 200 €', caption: 'facture en attente' },
                devisEnCours: { value: '1', caption: 'en attente de réponse' },
                prochaineAction: { value: '31/07/2026', caption: 'Relance à faire' },
                avantages: { value: '0 €', caption: 'avantages accordés' }
            },
            info: {
                statutJuridique: 'Entreprise individuelle', siret: '812 345 678 00019', secteur: 'Menuiserie d\'art',
                siteWeb: 'www.atelierleroy.example.com', commercialReferent: 'Julien Martin',
                conditionsPaiement: '30 jours fin de mois', modeReglement: 'Virement bancaire',
                categorieClient: 'À relancer', sourceAcquisition: 'Salon professionnel', tva: 'FR56 812345678'
            },
            notes: [
                { contenu: 'N\'a pas donné suite au dernier devis envoyé.', auteur: 'Julien Martin', date: '15/06/2026' },
                { contenu: 'Semblait intéressé mais évoque un budget serré.', auteur: 'Julien Martin', date: '01/06/2026' },
                { contenu: 'Contact initial lors du salon des artisans.', auteur: 'Julien Martin', date: '10/05/2026' }
            ],
            notesArchive: [
                { contenu: 'Échange initial sur les besoins d\'agencement de l\'atelier.', auteur: 'Julien Martin', date: '03/09/2025' },
                { contenu: 'Envoi de la documentation générale de nos prestations.', auteur: 'Julien Martin', date: '05/09/2025' }
            ],
            historique: [
                { date: '15/06/2026', heure: '11:00', type: 'relance', resume: 'Relance téléphonique restée sans réponse.', auteur: 'Julien Martin' },
                { date: '01/06/2026', heure: '10:20', type: 'email-envoye', resume: 'Envoi du devis n°DV-2026-010 pour l\'agencement de l\'atelier.', auteur: 'Julien Martin' },
                { date: '20/05/2026', heure: '14:30', type: 'rdv-realise', resume: 'Visite de l\'atelier pour prise de mesures.', auteur: 'Julien Martin' },
                { date: '10/05/2026', heure: '16:45', type: 'commentaire-interne', resume: 'À relancer avant fin juillet si sans réponse.', auteur: 'Julien Martin' },
                { date: '10/05/2026', heure: '16:00', type: 'appel-sortant', resume: 'Premier contact suite à la rencontre au salon.', auteur: 'Julien Martin' }
            ],
            rendezVous: [],
            documents: [
                { nom: 'DV-2026-010', type: 'Devis', date: '01/06/2026', statut: 'Envoyé', badgeClass: 'badge-info' }
            ]
        },
        'boucherie-morel': {
            nom: 'Boucherie Morel',
            entreprise: 'Boucherie Morel',
            statut: 'inactif',
            telephone: '04 56 78 90 12',
            email: 'contact@boucheriemorel.example.com',
            dernierContact: '01/06/2026',
            adresse: '5 place du Marché, 33000 Bordeaux',
            clientDepuis: '18/11/2023',
            kpis: {
                caGenere: { value: '2 100 €', caption: 'sur 12 derniers mois' },
                montantAEncaisser: { value: '0 €', caption: 'aucune facture impayée' },
                devisEnCours: { value: '0', caption: 'aucun devis en attente' },
                prochaineAction: { value: '—', caption: 'Aucune action prévue' },
                avantages: { value: '0 €', caption: 'avantages accordés' }
            },
            info: {
                statutJuridique: 'Entreprise individuelle', siret: '798 123 456 00027', secteur: 'Commerce alimentaire',
                siteWeb: '—', commercialReferent: 'Léa Bernard', conditionsPaiement: 'Comptant',
                modeReglement: 'Chèque', categorieClient: 'Inactif', sourceAcquisition: 'Prospection',
                tva: 'FR22 798123456'
            },
            notes: [
                { contenu: 'Aucune activité depuis plusieurs mois.', auteur: 'Léa Bernard', date: '01/06/2026' },
                { contenu: 'Avait mentionné une pause d\'activité temporaire.', auteur: 'Léa Bernard', date: '02/03/2026' },
                { contenu: 'Dernière prestation réalisée sans réserve.', auteur: 'Léa Bernard', date: '15/11/2025' }
            ],
            notesArchive: [
                { contenu: 'Mise en place du contrat initial de prestation.', auteur: 'Léa Bernard', date: '18/11/2023' },
                { contenu: 'Première intervention réalisée sans réserve particulière.', auteur: 'Léa Bernard', date: '02/12/2023' }
            ],
            historique: [
                { date: '01/06/2026', heure: '09:00', type: 'email-recu', resume: 'Réponse indiquant une pause d\'activité temporaire.', auteur: 'Léa Bernard' },
                { date: '02/03/2026', heure: '11:30', type: 'relance', resume: 'Relance commerciale sans retour depuis.', auteur: 'Léa Bernard' },
                { date: '15/11/2025', heure: '10:00', type: 'rdv-realise', resume: 'Dernière prestation réalisée sur site.', auteur: 'Léa Bernard' },
                { date: '20/10/2025', heure: '09:15', type: 'email-envoye', resume: 'Envoi de la facture FA-2025-041.', auteur: 'Léa Bernard' },
                { date: '18/11/2023', heure: '14:00', type: 'commentaire-interne', resume: 'Client initial suite à une opération de prospection locale.', auteur: 'Léa Bernard' }
            ],
            rendezVous: [],
            documents: [
                { nom: 'FA-2025-041', type: 'Facture', date: '20/10/2025', statut: 'Payée', badgeClass: 'badge-success' }
            ]
        },
        'julien-petit': {
            nom: 'Julien Petit',
            entreprise: '—',
            statut: 'prospect',
            telephone: '05 67 89 01 23',
            email: 'julien.petit@example.com',
            dernierContact: '20/06/2026',
            adresse: '3 rue des Lilas, 31000 Toulouse',
            clientDepuis: '20/06/2026',
            kpis: {
                caGenere: { value: '0 €', caption: 'sur 12 derniers mois' },
                montantAEncaisser: { value: '0 €', caption: 'aucune facture émise' },
                devisEnCours: { value: '1', caption: 'brouillon à finaliser' },
                prochaineAction: { value: '05/07/2026', caption: 'Rendez-vous découverte' },
                avantages: { value: '0 €', caption: 'avantages accordés' }
            },
            info: {
                statutJuridique: 'Particulier', siret: '—', secteur: '—', siteWeb: '—',
                commercialReferent: 'Julien Martin', conditionsPaiement: '—', modeReglement: '—',
                categorieClient: 'Prospect', sourceAcquisition: 'Formulaire site web', tva: '—'
            },
            notes: [
                { contenu: 'Premier contact via le formulaire du site, demande un devis.', auteur: 'Julien Martin', date: '20/06/2026' },
                { contenu: 'À rappeler la semaine prochaine pour finaliser le devis.', auteur: 'Julien Martin', date: '22/06/2026' }
            ],
            notesArchive: [
                { contenu: 'Inscription à la newsletter suite à une recherche en ligne.', auteur: 'Julien Martin', date: '18/06/2026' }
            ],
            historique: [
                { date: '22/06/2026', heure: '09:00', type: 'appel-sortant', resume: 'Appel de qualification du besoin.', auteur: 'Julien Martin' },
                { date: '20/06/2026', heure: '18:40', type: 'email-recu', resume: 'Demande de devis via le formulaire du site.', auteur: 'Julien Martin' }
            ],
            rendezVous: [
                { id: 'rdv-julien-petit-1', date: '05/07/2026', heure: '11:00', objet: 'Premier rendez-vous découverte', lieu: 'Visioconférence', statut: 'À confirmer', badgeClass: 'badge-warning' }
            ],
            documents: [
                { nom: 'DV-2026-018', type: 'Devis', date: '23/06/2026', statut: 'Brouillon', badgeClass: 'badge-neutral' }
            ]
        },
        'techni-bois-sarl': {
            nom: 'Techni-Bois SARL',
            entreprise: 'Techni-Bois SARL',
            statut: 'litige',
            telephone: '06 78 90 12 34',
            email: 'contact@technibois.example.com',
            dernierContact: '10/06/2026',
            adresse: '17 zone industrielle du Bois, 59000 Lille',
            clientDepuis: '22/07/2022',
            kpis: {
                caGenere: { value: '18 900 €', caption: 'sur 12 derniers mois' },
                montantAEncaisser: { value: '3 450 €', caption: 'facture contestée' },
                devisEnCours: { value: '0', caption: 'aucun devis en attente' },
                prochaineAction: { value: 'En cours', caption: 'Suivi du litige' },
                avantages: { value: '0 €', caption: 'avantages accordés' }
            },
            info: {
                statutJuridique: 'SARL', siret: '501 234 567 00045', secteur: 'Fabrication bois & agencement',
                siteWeb: 'www.technibois.example.com', commercialReferent: 'Léa Bernard',
                conditionsPaiement: '45 jours fin de mois', modeReglement: 'Virement bancaire',
                categorieClient: 'Litige', sourceAcquisition: 'Appel d\'offres', tva: 'FR91 501234567'
            },
            notes: [
                { contenu: 'Conteste le montant de la facture FA-2026-033.', auteur: 'Léa Bernard', date: '10/06/2026' },
                { contenu: 'Dossier transmis au service comptabilité pour vérification.', auteur: 'Léa Bernard', date: '12/06/2026' },
                { contenu: 'Client historique important, litige à traiter en priorité.', auteur: 'Léa Bernard', date: '13/06/2026' }
            ],
            notesArchive: [
                { contenu: 'Signature du contrat-cadre pour les prestations d\'agencement.', auteur: 'Léa Bernard', date: '22/07/2022' },
                { contenu: 'Bilan positif de la première année de collaboration.', auteur: 'Léa Bernard', date: '15/07/2023' }
            ],
            historique: [
                { date: '13/06/2026', heure: '15:00', type: 'commentaire-interne', resume: 'Dossier de litige transmis à la comptabilité pour vérification.', auteur: 'Léa Bernard' },
                { date: '12/06/2026', heure: '10:30', type: 'email-recu', resume: 'Contestation écrite du montant facturé.', auteur: 'Léa Bernard' },
                { date: '10/06/2026', heure: '14:15', type: 'appel-sortant', resume: 'Appel pour comprendre le désaccord sur la facturation.', auteur: 'Léa Bernard' },
                { date: '28/05/2026', heure: '09:00', type: 'email-envoye', resume: 'Envoi de la facture FA-2026-033.', auteur: 'Léa Bernard' },
                { date: '15/05/2026', heure: '11:00', type: 'rdv-realise', resume: 'Livraison et réception du chantier d\'agencement.', auteur: 'Léa Bernard' }
            ],
            rendezVous: [],
            documents: [
                { nom: 'FA-2026-033', type: 'Facture', date: '28/05/2026', statut: 'Contestée', badgeClass: 'badge-danger' },
                { nom: 'CON-2022-004', type: 'Contrat', date: '22/07/2022', statut: 'Signé', badgeClass: 'badge-success' }
            ]
        }
    };

    window.COCKPIT_CLIENT_DETAILS = CLIENT_DETAILS;

    var nameEl = document.getElementById('client-identity-name');

    if (!nameEl) {
        return;
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function makeEl(tag, className, text) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    function makeIconButton(className, title, svgMarkup) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.innerHTML = svgMarkup;
        return button;
    }

    var PENCIL_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>';
    var TRASH_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
    var SLIDERS_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>';
    var PLUS_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    var BACK_ARROW_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>';

    function buildModalFooterButtons(buttons) {
        var fragment = document.createDocumentFragment();
        buttons.forEach(function (button) {
            fragment.appendChild(button);
        });
        return fragment;
    }

    function makeCancelButton(label, autofocus) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-secondary';
        button.setAttribute('data-modal-close', 'true');
        if (autofocus) {
            button.setAttribute('data-modal-autofocus', 'true');
        }
        button.textContent = label || 'Annuler';
        return button;
    }

    function makeSaveButton(label, danger) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = (danger ? 'btn-danger' : 'btn-primary') + ' btn-wip';
        button.setAttribute('data-modal-close', 'true');
        button.textContent = label;
        return button;
    }

    function buildStatusModalBody(client) {
        var body = document.createElement('div');

        body.appendChild(makeEl('p', 'modal-text', 'Client : ' + client.nom));

        var currentLine = makeEl('p', 'modal-text');
        currentLine.appendChild(document.createTextNode('Statut actuel : '));
        var statusInfo = clientStatusInfo(client.statut);
        var currentBadge = makeEl('span', 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral'), statusInfo ? statusInfo.label : client.statut);
        currentLine.appendChild(currentBadge);
        body.appendChild(currentLine);

        var label = makeEl('label', 'modal-label', 'Nouveau statut');
        label.setAttribute('for', 'status-modal-select');
        body.appendChild(label);

        var select = document.createElement('select');
        select.id = 'status-modal-select';
        select.className = 'table-select modal-select';
        select.setAttribute('data-modal-autofocus', 'true');
        (window.COCKPIT_CLIENT_STATUSES || []).forEach(function (status) {
            var option = document.createElement('option');
            option.value = status.value;
            option.textContent = status.label;
            if (status.value === client.statut) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        body.appendChild(select);

        body.appendChild(makeEl('p', 'modal-hint', 'Ce changement de statut ne sera pas encore enregistré : la persistance sera ajoutée dans une prochaine version.'));

        return body;
    }

    function openStatusModal(client) {
        var headerExtra = makeIconButton('block-icon-btn', 'Personnaliser les statuts', SLIDERS_ICON_SVG);
        headerExtra.addEventListener('click', function () {
            openStatusCustomizeModal(client);
        });

        window.COCKPIT_MODAL.open({
            title: 'Modifier le statut client',
            headerExtra: headerExtra,
            body: buildStatusModalBody(client),
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Enregistrer')])
        });
    }

    function buildStatusCustomizeBody(client) {
        var body = document.createElement('div');

        var backLink = document.createElement('button');
        backLink.type = 'button';
        backLink.className = 'modal-back-link';
        backLink.innerHTML = BACK_ARROW_ICON_SVG + ' Retour au changement de statut';
        backLink.addEventListener('click', function () {
            openStatusModal(client);
        });
        body.appendChild(backLink);

        var list = document.createElement('div');
        list.className = 'status-list';

        (window.COCKPIT_CLIENT_STATUSES || []).forEach(function (status) {
            var row = document.createElement('div');
            row.className = 'status-row';

            row.appendChild(makeEl('span', 'badge ' + status.badgeClass, status.label));

            var actions = document.createElement('div');
            actions.className = 'status-row-actions';
            actions.appendChild(makeIconButton('block-icon-btn btn-wip', 'Modifier le statut ' + status.label, PENCIL_ICON_SVG));
            actions.appendChild(makeIconButton('block-icon-btn btn-wip', 'Supprimer le statut ' + status.label, TRASH_ICON_SVG));
            row.appendChild(actions);

            list.appendChild(row);
        });
        body.appendChild(list);

        var addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn-secondary btn-wip status-add-btn';
        addButton.innerHTML = PLUS_ICON_SVG + ' Ajouter un statut';
        body.appendChild(addButton);

        return body;
    }

    function openStatusCustomizeModal(client) {
        window.COCKPIT_MODAL.open({
            title: 'Personnaliser les statuts clients',
            body: buildStatusCustomizeBody(client),
            footer: buildModalFooterButtons([makeCancelButton('Fermer', true)])
        });
    }

    function buildNoteFormBody(client, existingContent, reminder) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Client : ' + client.nom));

        if (reminder) {
            body.appendChild(makeEl('p', 'modal-hint', reminder));
        }

        var label = makeEl('label', 'modal-label', 'Contenu de la note');
        label.setAttribute('for', 'note-modal-textarea');
        body.appendChild(label);

        var textarea = document.createElement('textarea');
        textarea.id = 'note-modal-textarea';
        textarea.className = 'modal-textarea';
        textarea.rows = 4;
        textarea.placeholder = 'Rédigez votre note commerciale...';
        textarea.setAttribute('data-modal-autofocus', 'true');
        if (existingContent) {
            textarea.value = existingContent;
        }
        body.appendChild(textarea);

        return body;
    }

    function openNewNoteModal(client) {
        window.COCKPIT_MODAL.open({
            title: 'Ajouter une note commerciale',
            body: buildNoteFormBody(client),
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Ajouter')])
        });
    }

    function openEditNoteModal(client, note) {
        window.COCKPIT_MODAL.open({
            title: 'Modifier la note',
            body: buildNoteFormBody(client, note.contenu, 'Auteur : ' + note.auteur + ' · ' + note.date),
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Enregistrer')])
        });
    }

    function openDeleteNoteModal(note) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Voulez-vous vraiment supprimer cette note ?'));

        var truncated = note.contenu.length > 90 ? note.contenu.slice(0, 90) + '…' : note.contenu;
        body.appendChild(makeEl('p', 'modal-note-excerpt', '« ' + truncated + ' »'));

        window.COCKPIT_MODAL.open({
            title: 'Supprimer cette note ?',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler', true), makeSaveButton('Supprimer', true)])
        });
    }

    function buildNoteCard(note) {
        var card = document.createElement('div');
        card.className = 'note-card';
        card.appendChild(makeEl('p', 'note-content', note.contenu));

        var authorWords = note.auteur.split(' ').filter(function (word) {
            return word.length > 0;
        });
        var authorInitials = authorWords.slice(0, 2).map(function (word) {
            return word.charAt(0).toUpperCase();
        }).join('');

        var meta = document.createElement('div');
        meta.className = 'note-meta';
        meta.appendChild(makeEl('span', 'note-author-avatar', authorInitials || '?'));
        meta.appendChild(makeEl('span', 'note-author', note.auteur));
        meta.appendChild(makeEl('span', 'note-date', note.date));
        card.appendChild(meta);

        return card;
    }

    function openAllNotesModal(client) {
        var body = document.createElement('div');
        var list = document.createElement('div');
        list.className = 'notes-list modal-notes-list';

        var allNotes = (client.notes || []).concat(client.notesArchive || []);

        if (allNotes.length === 0) {
            list.appendChild(makeEl('p', 'empty-state-inline', 'Aucune note pour ce client.'));
        } else {
            allNotes.forEach(function (note) {
                list.appendChild(buildNoteCard(note));
            });
        }

        body.appendChild(list);

        window.COCKPIT_MODAL.open({
            title: 'Toutes les notes commerciales',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Fermer', true)])
        });
    }

    function clientStatusInfo(statusValue) {
        var statuses = window.COCKPIT_CLIENT_STATUSES || [];
        for (var i = 0; i < statuses.length; i++) {
            if (statuses[i].value === statusValue) {
                return statuses[i];
            }
        }
        return null;
    }

    function renderNotes(notes, client) {
        var list = document.getElementById('client-notes-list');
        if (!list) {
            return;
        }
        list.innerHTML = '';

        if (!notes || notes.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state-inline';
            empty.textContent = 'Aucune note pour ce client.';
            list.appendChild(empty);
            return;
        }

        notes.slice(0, 3).forEach(function (note) {
            var card = document.createElement('div');
            card.className = 'note-card';

            var headerRow = document.createElement('div');
            headerRow.className = 'note-card-header';

            var content = document.createElement('p');
            content.className = 'note-content';
            content.textContent = note.contenu;
            headerRow.appendChild(content);

            var actions = document.createElement('div');
            actions.className = 'note-card-actions';

            var editBtn = makeIconButton('block-icon-btn', 'Modifier la note du ' + note.date, PENCIL_ICON_SVG);
            editBtn.addEventListener('click', function () {
                openEditNoteModal(client, note);
            });

            var deleteBtn = makeIconButton('block-icon-btn', 'Supprimer la note du ' + note.date, TRASH_ICON_SVG);
            deleteBtn.addEventListener('click', function () {
                openDeleteNoteModal(note);
            });

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            headerRow.appendChild(actions);

            var authorWords = note.auteur.split(' ').filter(function (word) {
                return word.length > 0;
            });
            var authorInitials = authorWords.slice(0, 2).map(function (word) {
                return word.charAt(0).toUpperCase();
            }).join('');

            var meta = document.createElement('div');
            meta.className = 'note-meta';

            var avatar = document.createElement('span');
            avatar.className = 'note-author-avatar';
            avatar.textContent = authorInitials || '?';

            var author = document.createElement('span');
            author.className = 'note-author';
            author.textContent = note.auteur;

            var date = document.createElement('span');
            date.className = 'note-date';
            date.textContent = note.date;

            meta.appendChild(avatar);
            meta.appendChild(author);
            meta.appendChild(date);

            card.appendChild(headerRow);
            card.appendChild(meta);
            list.appendChild(card);
        });
    }

    function renderHistory(events) {
        var list = document.getElementById('client-history-list');
        if (!list) {
            return;
        }
        list.innerHTML = '';

        if (!events || events.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state-inline';
            empty.textContent = 'Aucun échange enregistré pour ce client.';
            list.appendChild(empty);
            return;
        }

        events.slice(0, 5).forEach(function (event) {
            var typeInfo = HISTORY_TYPES[event.type] || { label: event.type, badgeClass: 'badge-neutral' };

            var item = document.createElement('div');
            item.className = 'history-item';

            var dateEl = document.createElement('div');
            dateEl.className = 'history-date';
            dateEl.textContent = event.date + ' · ' + event.heure;

            var typeEl = document.createElement('span');
            typeEl.className = 'badge ' + typeInfo.badgeClass;
            typeEl.textContent = typeInfo.label;

            var resumeEl = document.createElement('p');
            resumeEl.className = 'history-resume';
            resumeEl.textContent = event.resume;

            var authorEl = document.createElement('span');
            authorEl.className = 'history-author';
            authorEl.textContent = event.auteur;

            item.appendChild(dateEl);
            item.appendChild(typeEl);
            item.appendChild(resumeEl);
            item.appendChild(authorEl);
            list.appendChild(item);
        });
    }

    function buildAgendaHref(rdvId, slug) {
        var params = [];
        if (rdvId) {
            params.push('rdv=' + encodeURIComponent(rdvId));
        }
        if (slug) {
            params.push('from=fiche-client');
            params.push('client=' + encodeURIComponent(slug));
        }
        return 'agenda.html' + (params.length ? '?' + params.join('&') : '');
    }

    function buildFacturationHref(slug) {
        return slug ? 'facturation.html?from=fiche-client&client=' + encodeURIComponent(slug) : 'facturation.html';
    }

    function renderAppointments(appointments, slug) {
        var list = document.getElementById('client-appointments-list');
        if (!list) {
            return;
        }
        list.innerHTML = '';

        if (!appointments || appointments.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state-inline';
            empty.textContent = 'Aucun rendez-vous à venir pour ce client.';
            list.appendChild(empty);
            return;
        }

        appointments.slice(0, 3).forEach(function (appointment) {
            var item = document.createElement('a');
            item.className = 'appointment-item appointment-item-link';
            item.href = buildAgendaHref(appointment.id, slug);

            var infoEl = document.createElement('div');
            infoEl.className = 'appointment-info';

            var dateEl = document.createElement('p');
            dateEl.className = 'appointment-date';
            dateEl.textContent = appointment.date + ' · ' + appointment.heure;

            var objetEl = document.createElement('p');
            objetEl.className = 'appointment-objet';
            objetEl.textContent = appointment.objet;

            var lieuEl = document.createElement('p');
            lieuEl.className = 'appointment-lieu';
            lieuEl.textContent = appointment.lieu;

            infoEl.appendChild(dateEl);
            infoEl.appendChild(objetEl);
            infoEl.appendChild(lieuEl);

            var statusEl = document.createElement('span');
            statusEl.className = 'badge ' + appointment.badgeClass;
            statusEl.textContent = appointment.statut;

            item.appendChild(infoEl);
            item.appendChild(statusEl);
            list.appendChild(item);
        });
    }

    function renderDocuments(documents) {
        var body = document.getElementById('client-documents-body');
        if (!body) {
            return;
        }
        body.innerHTML = '';

        if (!documents || documents.length === 0) {
            var row = document.createElement('tr');
            var cell = document.createElement('td');
            cell.colSpan = 5;
            cell.className = 'empty-state-inline';
            cell.textContent = 'Aucun document récent pour ce client.';
            row.appendChild(cell);
            body.appendChild(row);
            return;
        }

        documents.slice(0, 3).forEach(function (doc) {
            var row = document.createElement('tr');

            var nomCell = document.createElement('td');
            nomCell.textContent = doc.nom;

            var typeCell = document.createElement('td');
            typeCell.textContent = doc.type;

            var dateCell = document.createElement('td');
            dateCell.textContent = doc.date;

            var statutCell = document.createElement('td');
            var statutBadge = document.createElement('span');
            statutBadge.className = 'badge ' + doc.badgeClass;
            statutBadge.textContent = doc.statut;
            statutCell.appendChild(statutBadge);

            var actionsCell = document.createElement('td');
            var downloadLink = document.createElement('a');
            downloadLink.href = '#';
            downloadLink.className = 'pdf-download btn-wip';
            downloadLink.title = 'Télécharger le PDF';
            downloadLink.setAttribute('aria-label', 'Télécharger le PDF de ' + doc.nom);
            downloadLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span class="pdf-badge">PDF</span>';
            actionsCell.appendChild(downloadLink);

            row.appendChild(nomCell);
            row.appendChild(typeCell);
            row.appendChild(dateCell);
            row.appendChild(statutCell);
            row.appendChild(actionsCell);
            body.appendChild(row);
        });
    }

    function renderClient(slug) {
        var client = CLIENT_DETAILS[slug];
        var notFoundEl = document.getElementById('client-not-found');
        var contentEl = document.getElementById('client-profile-content');

        if (!client) {
            if (contentEl) {
                contentEl.style.display = 'none';
            }
            if (notFoundEl) {
                notFoundEl.style.display = 'block';
            }
            return;
        }

        if (notFoundEl) {
            notFoundEl.style.display = 'none';
        }
        if (contentEl) {
            contentEl.style.display = '';
        }

        setText('client-identity-name', client.nom);
        setText('client-identity-company', client.entreprise);
        setText('client-identity-phone', client.telephone);
        setText('client-identity-email', client.email);
        setText('client-identity-address', client.adresse);
        setText('client-identity-since', client.clientDepuis);
        setText('client-identity-last-contact', client.dernierContact);

        var words = client.nom.split(' ').filter(function (word) {
            return word.length > 0;
        });
        var initials = words.slice(0, 2).map(function (word) {
            return word.charAt(0).toUpperCase();
        }).join('');
        setText('client-identity-initials', initials || '?');

        var statusInfo = clientStatusInfo(client.statut);
        var statusEl = document.getElementById('client-identity-status');
        if (statusEl && statusInfo) {
            statusEl.textContent = statusInfo.label;
            statusEl.className = 'badge badge-clickable ' + statusInfo.badgeClass;
        }

        setText('kpi-ca-genere', client.kpis.caGenere.value);
        setText('kpi-ca-genere-caption', client.kpis.caGenere.caption);
        setText('kpi-montant-encaisser', client.kpis.montantAEncaisser.value);
        setText('kpi-montant-encaisser-caption', client.kpis.montantAEncaisser.caption);
        setText('kpi-devis-encours', client.kpis.devisEnCours.value);
        setText('kpi-devis-encours-caption', client.kpis.devisEnCours.caption);
        setText('kpi-prochaine-action', client.kpis.prochaineAction.value);
        setText('kpi-prochaine-action-caption', client.kpis.prochaineAction.caption);
        setText('kpi-avantages', client.kpis.avantages.value);
        setText('kpi-avantages-caption', client.kpis.avantages.caption);

        setText('info-statut-juridique', client.info.statutJuridique);
        setText('info-siret', client.info.siret);
        setText('info-secteur', client.info.secteur);
        setText('info-site-web', client.info.siteWeb);
        setText('info-commercial-referent', client.info.commercialReferent);
        setText('info-conditions-paiement', client.info.conditionsPaiement);
        setText('info-mode-reglement', client.info.modeReglement);
        setText('info-categorie-client', client.info.categorieClient);
        setText('info-source-acquisition', client.info.sourceAcquisition);
        setText('info-tva', client.info.tva);

        renderNotes(client.notes, client);
        renderHistory(client.historique);
        renderAppointments(client.rendezVous, slug);
        renderDocuments(client.documents);

        var agendaLinkHeader = document.getElementById('agenda-link-header');
        if (agendaLinkHeader) {
            agendaLinkHeader.href = buildAgendaHref(null, slug);
        }

        var facturationLinkHeader = document.getElementById('facturation-link-header');
        if (facturationLinkHeader) {
            facturationLinkHeader.href = buildFacturationHref(slug);
        }

        if (statusEl) {
            statusEl.onclick = function () {
                openStatusModal(client);
            };
        }

        var newNoteBtn = document.getElementById('notes-new-btn');
        if (newNoteBtn) {
            newNoteBtn.onclick = function () {
                openNewNoteModal(client);
            };
        }

        var viewAllNotesBtn = document.getElementById('notes-view-all-btn');
        if (viewAllNotesBtn) {
            viewAllNotesBtn.onclick = function () {
                openAllNotesModal(client);
            };
        }
    }

    var params = new URLSearchParams(window.location.search);
    renderClient(params.get('client'));
})();

// Retour contextuel vers la fiche client depuis Agenda / Facturation (V0.4.3.1)
// N'affiche un lien de retour que si la page a été ouverte depuis la fiche client
// (paramètres "from" et "client" présents et connus) ; aucun changement sinon,
// notamment lors d'un accès direct à ces pages depuis la sidebar.

(function () {
    var params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'fiche-client') {
        return;
    }

    var slug = params.get('client');
    if (!slug) {
        return;
    }

    var pageContent = document.querySelector('.page-content');
    if (!pageContent) {
        return;
    }

    var clientDetails = window.COCKPIT_CLIENT_DETAILS || {};
    var client = clientDetails[slug];
    var label = client ? 'Retour à la fiche de ' + client.nom : 'Retour à la fiche client';

    var link = document.createElement('a');
    link.className = 'contextual-back-link';
    link.href = 'fiche-client.html?client=' + encodeURIComponent(slug);
    link.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg> ' + label;

    pageContent.insertBefore(link, pageContent.firstChild);
})();

// Page Produits / Services : catalogue avec recherche, filtres type/statut et
// compteur dynamique (V0.5.1). PRODUCT_TYPES, PRODUCT_STATUSES et
// PRODUCT_DETAILS sont les seules sources à modifier pour faire évoluer le
// référentiel produits/services ; PRODUCT_DETAILS prépare la fiche détaillée
// de la V0.5.2 sans la construire ici.

(function () {
    var PRODUCT_TYPES = [
        { value: 'produit', label: 'Produit', badgeClass: 'badge-neutral' },
        { value: 'service', label: 'Service', badgeClass: 'badge-info' }
    ];

    var PRODUCT_STATUSES = [
        { value: 'actif', label: 'Actif', badgeClass: 'badge-success' },
        { value: 'brouillon', label: 'Brouillon', badgeClass: 'badge-warning' },
        { value: 'inactif', label: 'Inactif', badgeClass: 'badge-neutral' },
        { value: 'archive', label: 'Archivé', badgeClass: 'badge-info' }
    ];

    var PRODUCT_PAYMENT_MODALITIES = [
        { value: 'comptant', label: 'Comptant' },
        { value: 'forfait', label: 'Forfait' },
        { value: 'abonnement', label: 'Abonnement' },
        { value: 'plusieurs-fois', label: 'Plusieurs fois' },
        { value: 'recurrent', label: 'Récurrent' },
        { value: 'autre', label: 'Autre' }
    ];

    var PRODUCT_DETAILS = {
        'audit-strategique': {
            nom: 'Audit stratégique', type: 'service', prixHT: 750, tva: 20, statut: 'actif',
            descriptionCourte: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.',
            descriptionDetaillee: 'Un audit complet en trois temps : analyse de l\'activité actuelle, identification des leviers de croissance prioritaires, restitution sous forme de plan d\'action synthétique. Destiné aux dirigeants souhaitant prendre du recul sur leur stratégie.',
            beneficesClient: ['Vision claire des priorités à court terme', 'Plan d\'action concret et hiérarchisé'],
            limitesConditions: ['Prestation ponctuelle, non reconductible automatiquement', 'Restitution limitée à un document de synthèse'],
            couts: [
                { nom: 'Temps de préparation', quantite: 1, coutUnitaire: 180 },
                { nom: 'Déplacement client', quantite: 1, coutUnitaire: 100 }
            ],
            margeEstimee: '≈ 63 %',
            modalitesPaiement: ['comptant', 'plusieurs-fois'],
            prixModifiable: true,
            conditionsParticulieres: 'Facturable en une fois ou en deux échéances sur demande.',
            referenceInterne: 'SRV-AUD-001',
            dateCreation: '14/01/2025',
            derniereMiseAJour: '03/06/2026',
            noteInterne: 'Bien cadrer le périmètre avec le client avant le premier rendez-vous pour éviter les dérives de champ.',
            historique: [
                { date: '14/01/2025', heure: '09:15', type: 'creation', resume: 'Création de l\'offre.', auteur: 'Administrateur principal' },
                { date: '20/01/2025', heure: '10:00', type: 'passage-actif', resume: 'Passage en statut Actif.', auteur: 'Administrateur principal' },
                { date: '03/06/2026', heure: '09:42', type: 'modification-prix', resume: 'Prix ajusté de 690 € à 750 € HT.', auteur: 'Administrateur principal' },
                { date: '20/06/2026', heure: '14:20', type: 'modification-modalites', resume: 'Ajout du paiement en plusieurs fois en complément du paiement comptant.', auteur: 'Administrateur principal' }
            ]
        },
        'creation-site-vitrine': {
            nom: 'Création site vitrine', type: 'service', prixHT: 1800, tva: 20, statut: 'actif',
            descriptionCourte: 'Conception et mise en ligne d\'un site vitrine professionnel clé en main.',
            descriptionDetaillee: 'Site vitrine responsive de 5 pages incluant maquette, rédaction assistée, mise en ligne et formation de prise en main. Livré avec hébergement configuré pour la première année.',
            beneficesClient: ['Présence en ligne professionnelle rapide', 'Formation incluse pour l\'autonomie du client'],
            limitesConditions: ['Limité à 5 pages, au-delà devis complémentaire', 'Contenus textuels à fournir par le client'],
            couts: [
                { nom: 'Développement', quantite: 1, coutUnitaire: 450 },
                { nom: 'Hébergement 1ère année', quantite: 1, coutUnitaire: 170 }
            ],
            margeEstimee: '≈ 66 %',
            modalitesPaiement: ['comptant', 'plusieurs-fois'],
            prixModifiable: true,
            conditionsParticulieres: 'Acompte de 30 % à la commande.',
            referenceInterne: 'SRV-SITE-002',
            dateCreation: '02/03/2025',
            derniereMiseAJour: '15/05/2026',
            noteInterne: 'Vérifier la disponibilité du nom de domaine avant de confirmer le devis.',
            historique: [
                { date: '02/03/2025', heure: '08:50', type: 'creation', resume: 'Création de l\'offre.', auteur: 'Administrateur principal' },
                { date: '10/03/2025', heure: '09:30', type: 'passage-actif', resume: 'Passage en statut Actif.', auteur: 'Administrateur principal' },
                { date: '15/05/2026', heure: '11:10', type: 'modification-prix', resume: 'Prix ajusté de 1 650 € à 1 800 € HT.', auteur: 'Administrateur principal' },
                { date: '22/05/2026', heure: '15:05', type: 'modification-modalites', resume: 'Ajout du paiement en plusieurs fois en complément du paiement comptant.', auteur: 'Administrateur principal' }
            ]
        },
        'maintenance-mensuelle': {
            nom: 'Maintenance mensuelle', type: 'service', prixHT: 250, tva: 20, statut: 'actif',
            descriptionCourte: 'Suivi technique mensuel et mises à jour de sécurité pour un site existant.',
            descriptionDetaillee: 'Abonnement mensuel incluant mises à jour techniques, sauvegardes régulières et un créneau de petites modifications. Reconduit tacitement chaque mois.',
            beneficesClient: ['Site maintenu à jour sans intervention du client', 'Tranquillité d\'esprit sur la sécurité'],
            limitesConditions: ['Modifications limitées à 1h par mois', 'Hors refonte ou évolution majeure'],
            couts: [
                { nom: 'Temps de suivi mensuel', quantite: 2, coutUnitaire: 40 },
                { nom: 'Outils de supervision', quantite: 1, coutUnitaire: 15 }
            ],
            margeEstimee: '≈ 62 %',
            modalitesPaiement: ['recurrent', 'abonnement'],
            prixModifiable: false,
            conditionsParticulieres: 'Prélèvement mensuel automatique (mise en place réelle hors périmètre V0).',
            referenceInterne: 'SRV-MAINT-003',
            dateCreation: '18/04/2025',
            derniereMiseAJour: '18/04/2025',
            noteInterne: 'Offre standardisée : éviter les exceptions de prix pour ne pas complexifier le suivi des abonnements.',
            historique: [
                { date: '18/04/2025', heure: '10:20', type: 'creation', resume: 'Création de l\'offre.', auteur: 'Administrateur principal' },
                { date: '25/04/2025', heure: '09:00', type: 'passage-actif', resume: 'Passage en statut Actif.', auteur: 'Administrateur principal' }
            ]
        },
        'formation-personnalisee': {
            nom: 'Formation personnalisée', type: 'service', prixHT: 950, tva: 10, statut: 'actif',
            descriptionCourte: 'Session de formation individuelle adaptée aux besoins du client.',
            descriptionDetaillee: 'Journée de formation sur mesure (7h), présentiel ou distanciel, avec support pédagogique remis en fin de session. Le programme est ajusté après un court échange préalable.',
            beneficesClient: ['Contenu adapté au niveau réel du participant', 'Support pédagogique conservé après la session'],
            limitesConditions: ['Limité à un seul participant par session', 'Programme à valider une semaine avant la date'],
            couts: [
                { nom: 'Préparation pédagogique', quantite: 2, coutUnitaire: 60 },
                { nom: 'Animation (journée)', quantite: 1, coutUnitaire: 190 }
            ],
            margeEstimee: '≈ 67 %',
            modalitesPaiement: ['comptant', 'forfait'],
            prixModifiable: true,
            conditionsParticulieres: 'TVA à taux réduit applicable selon éligibilité de l\'action de formation.',
            referenceInterne: 'SRV-FORM-004',
            dateCreation: '05/09/2025',
            derniereMiseAJour: '12/02/2026',
            noteInterne: 'Vérifier l\'éligibilité au taux de TVA réduit avant émission du devis final.',
            historique: [
                { date: '05/09/2025', heure: '08:40', type: 'creation', resume: 'Création de l\'offre.', auteur: 'Administrateur principal' },
                { date: '09/09/2025', heure: '09:15', type: 'passage-actif', resume: 'Passage en statut Actif.', auteur: 'Administrateur principal' },
                { date: '12/02/2026', heure: '13:50', type: 'modification-tva', resume: 'TVA indicative ajustée de 20 % à 10 %.', auteur: 'Administrateur principal' }
            ]
        },
        'pack-accompagnement-dirigeant': {
            nom: 'Pack accompagnement dirigeant', type: 'service', prixHT: 1200, tva: 20, statut: 'brouillon',
            descriptionCourte: 'Accompagnement mensuel du dirigeant sur trois mois, en cours de cadrage.',
            descriptionDetaillee: 'Offre en cours de construction : accompagnement resserré du dirigeant (points réguliers, suivi d\'objectifs) sur une durée de trois mois. Le contenu précis reste à finaliser avant activation.',
            beneficesClient: ['Suivi resserré et personnalisé', 'Objectifs suivis dans la durée'],
            limitesConditions: ['Offre non finalisée, contenu susceptible d\'évoluer', 'Non disponible à la vente tant qu\'elle reste en Brouillon'],
            couts: [
                { nom: 'Temps d\'accompagnement', quantite: 4, coutUnitaire: 85 },
                { nom: 'Supports remis', quantite: 1, coutUnitaire: 70 }
            ],
            margeEstimee: '≈ 66 %',
            modalitesPaiement: ['forfait', 'plusieurs-fois'],
            prixModifiable: true,
            conditionsParticulieres: 'Conditions à finaliser avant passage en statut Actif.',
            referenceInterne: 'SRV-PACK-005',
            dateCreation: '20/05/2026',
            derniereMiseAJour: '20/05/2026',
            noteInterne: 'En attente de validation du contenu détaillé avant activation ; ne pas proposer aux clients dans l\'état actuel.',
            historique: [
                { date: '20/05/2026', heure: '16:30', type: 'creation', resume: 'Création de l\'offre en statut Brouillon.', auteur: 'Administrateur principal' }
            ]
        },
        'kit-demarrage-digital': {
            nom: 'Kit de démarrage digital', type: 'produit', prixHT: 129, tva: 20, statut: 'actif',
            descriptionCourte: 'Kit prêt à l\'emploi pour démarrer sa présence digitale.',
            descriptionDetaillee: 'Pack comprenant un guide pratique, des modèles de visuels réseaux sociaux et une checklist de mise en ligne. Livré au format numérique après commande.',
            beneficesClient: ['Démarrage rapide sans compétence technique', 'Modèles réutilisables immédiatement'],
            limitesConditions: ['Contenu générique, non personnalisé', 'Pas d\'accompagnement humain inclus'],
            couts: [
                { nom: 'Impression du guide', quantite: 1, coutUnitaire: 12 },
                { nom: 'Packaging & envoi numérique', quantite: 1, coutUnitaire: 23 }
            ],
            margeEstimee: '≈ 73 %',
            modalitesPaiement: ['comptant'],
            prixModifiable: false,
            conditionsParticulieres: 'Prix fixe catalogue, non négociable en l\'état.',
            referenceInterne: 'PRD-KIT-006',
            dateCreation: '11/11/2025',
            derniereMiseAJour: '11/11/2025',
            noteInterne: 'Produit numérique standardisé : ne pas proposer de remise individuelle.',
            historique: [
                { date: '11/11/2025', heure: '09:05', type: 'creation', resume: 'Création de l\'offre.', auteur: 'Administrateur principal' },
                { date: '15/11/2025', heure: '10:45', type: 'passage-actif', resume: 'Passage en statut Actif.', auteur: 'Administrateur principal' }
            ]
        },
        'accessoire-premium': {
            nom: 'Accessoire premium', type: 'produit', prixHT: 89, tva: 20, statut: 'inactif',
            descriptionCourte: 'Accessoire complémentaire, retiré temporairement de la vente.',
            descriptionDetaillee: 'Accessoire physique proposé en complément d\'une prestation. Actuellement en rupture d\'approvisionnement fournisseur, la vente est suspendue jusqu\'à nouvel ordre.',
            beneficesClient: ['Complète efficacement l\'offre principale'],
            limitesConditions: ['Non disponible actuellement (rupture fournisseur)', 'Délai de réapprovisionnement inconnu à ce jour'],
            couts: [
                { nom: 'Matière première', quantite: 1.5, coutUnitaire: 20 },
                { nom: 'Assemblage', quantite: 1, coutUnitaire: 12 }
            ],
            margeEstimee: '≈ 53 %',
            modalitesPaiement: ['comptant'],
            prixModifiable: false,
            conditionsParticulieres: 'Vente suspendue jusqu\'à réapprovisionnement.',
            referenceInterne: 'PRD-ACC-007',
            dateCreation: '02/02/2025',
            derniereMiseAJour: '28/06/2026',
            noteInterne: 'Relancer le fournisseur avant de réactiver cette offre.',
            historique: [
                { date: '02/02/2025', heure: '09:20', type: 'creation', resume: 'Création de l\'offre.', auteur: 'Administrateur principal' },
                { date: '08/02/2025', heure: '10:10', type: 'passage-actif', resume: 'Passage en statut Actif.', auteur: 'Administrateur principal' },
                { date: '28/06/2026', heure: '14:35', type: 'modification-prix', resume: 'Prix ajusté de 79 € à 89 € HT.', auteur: 'Administrateur principal' }
            ]
        },
        'ancienne-offre-decouverte': {
            nom: 'Ancienne offre découverte', type: 'service', prixHT: 300, tva: 20, statut: 'archive',
            descriptionCourte: 'Ancienne offre de découverte, conservée pour historique.',
            descriptionDetaillee: 'Offre d\'entrée de gamme proposée les premières années d\'activité, remplacée depuis par des prestations plus adaptées. Conservée uniquement à titre d\'historique commercial.',
            beneficesClient: ['Offre historique, non proposée aux nouveaux clients'],
            limitesConditions: ['Archivée, non disponible à la vente', 'Conditions d\'origine non garanties si réactivée'],
            couts: [
                { nom: 'Temps de prestation', quantite: 2, coutUnitaire: 60 },
                { nom: 'Frais divers', quantite: 1, coutUnitaire: 20 }
            ],
            margeEstimee: '≈ 53 %',
            modalitesPaiement: ['comptant'],
            prixModifiable: false,
            conditionsParticulieres: 'Aucune, offre archivée.',
            referenceInterne: 'SRV-DECOUV-008',
            dateCreation: '03/06/2024',
            derniereMiseAJour: '10/01/2026',
            noteInterne: 'Conservée pour référence uniquement, ne plus proposer aux prospects.',
            historique: [
                { date: '03/06/2024', heure: '09:00', type: 'creation', resume: 'Création de l\'offre.', auteur: 'Administrateur principal' },
                { date: '10/06/2024', heure: '09:30', type: 'passage-actif', resume: 'Passage en statut Actif.', auteur: 'Administrateur principal' },
                { date: '10/01/2026', heure: '11:15', type: 'archivage', resume: 'Archivage de l\'offre.', auteur: 'Administrateur principal' }
            ]
        }
    };

    window.COCKPIT_PRODUCT_TYPES = PRODUCT_TYPES;
    window.COCKPIT_PRODUCT_STATUSES = PRODUCT_STATUSES;
    window.COCKPIT_PRODUCT_PAYMENT_MODALITIES = PRODUCT_PAYMENT_MODALITIES;
    window.COCKPIT_PRODUCT_DETAILS = PRODUCT_DETAILS;

    // Modale "Ajouter un produit / service" (V0.5.3) : formulaire simulé,
    // aucune donnée n'est ajoutée à PRODUCT_DETAILS. "Enregistrer" ferme la
    // modale et déclenche le pop-up Work in progress existant.
    var addButton = document.getElementById('products-add-btn');
    if (addButton) {
        addButton.addEventListener('click', function () {
            var body = document.createElement('div');

            var nameLabel = document.createElement('label');
            nameLabel.className = 'modal-label';
            nameLabel.textContent = 'Nom';
            nameLabel.setAttribute('for', 'add-product-name');
            body.appendChild(nameLabel);
            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = 'add-product-name';
            nameInput.className = 'modal-input';
            nameInput.placeholder = 'Nom du produit ou service';
            nameInput.setAttribute('data-modal-autofocus', 'true');
            body.appendChild(nameInput);

            var typeLabel = document.createElement('label');
            typeLabel.className = 'modal-label';
            typeLabel.textContent = 'Type';
            typeLabel.setAttribute('for', 'add-product-type');
            body.appendChild(typeLabel);
            var typeSelect = document.createElement('select');
            typeSelect.id = 'add-product-type';
            typeSelect.className = 'table-select modal-select';
            PRODUCT_TYPES.forEach(function (type) {
                var option = document.createElement('option');
                option.value = type.value;
                option.textContent = type.label;
                typeSelect.appendChild(option);
            });
            body.appendChild(typeSelect);

            var priceLabel = document.createElement('label');
            priceLabel.className = 'modal-label';
            priceLabel.textContent = 'Prix HT';
            priceLabel.setAttribute('for', 'add-product-price');
            body.appendChild(priceLabel);
            var priceInput = document.createElement('input');
            priceInput.type = 'number';
            priceInput.id = 'add-product-price';
            priceInput.className = 'modal-input';
            priceInput.placeholder = 'Ex. 500';
            body.appendChild(priceInput);

            var vatLabel = document.createElement('label');
            vatLabel.className = 'modal-label';
            vatLabel.textContent = 'TVA par défaut (%)';
            vatLabel.setAttribute('for', 'add-product-vat');
            body.appendChild(vatLabel);
            var vatInput = document.createElement('input');
            vatInput.type = 'number';
            vatInput.id = 'add-product-vat';
            vatInput.className = 'modal-input';
            vatInput.placeholder = 'Ex. 20';
            body.appendChild(vatInput);

            var statusLabel = document.createElement('label');
            statusLabel.className = 'modal-label';
            statusLabel.textContent = 'Statut initial';
            statusLabel.setAttribute('for', 'add-product-status');
            body.appendChild(statusLabel);
            var statusSelect = document.createElement('select');
            statusSelect.id = 'add-product-status';
            statusSelect.className = 'table-select modal-select';
            PRODUCT_STATUSES.forEach(function (status) {
                var option = document.createElement('option');
                option.value = status.value;
                option.textContent = status.label;
                if (status.value === 'brouillon') {
                    option.selected = true;
                }
                statusSelect.appendChild(option);
            });
            body.appendChild(statusSelect);

            var descLabel = document.createElement('label');
            descLabel.className = 'modal-label';
            descLabel.textContent = 'Description courte';
            descLabel.setAttribute('for', 'add-product-description');
            body.appendChild(descLabel);
            var descInput = document.createElement('input');
            descInput.type = 'text';
            descInput.id = 'add-product-description';
            descInput.className = 'modal-input';
            descInput.placeholder = 'Une phrase pour présenter l\'offre';
            body.appendChild(descInput);

            var paymentLabel = document.createElement('p');
            paymentLabel.className = 'modal-label';
            paymentLabel.textContent = 'Modalités de paiement acceptées';
            body.appendChild(paymentLabel);
            var paymentList = document.createElement('div');
            paymentList.className = 'modal-checkbox-list';
            PRODUCT_PAYMENT_MODALITIES.forEach(function (modality, index) {
                var item = document.createElement('label');
                item.className = 'modal-checkbox-item';
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'add-product-payment-' + index;
                checkbox.value = modality.value;
                item.appendChild(checkbox);
                item.appendChild(document.createTextNode(modality.label));
                paymentList.appendChild(item);
            });
            body.appendChild(paymentList);

            var noteLabel = document.createElement('label');
            noteLabel.className = 'modal-label';
            noteLabel.textContent = 'Note interne';
            noteLabel.setAttribute('for', 'add-product-note');
            body.appendChild(noteLabel);
            var noteTextarea = document.createElement('textarea');
            noteTextarea.id = 'add-product-note';
            noteTextarea.className = 'modal-textarea';
            noteTextarea.rows = 3;
            noteTextarea.placeholder = 'Précision interne, point de vigilance...';
            body.appendChild(noteTextarea);

            var hint = document.createElement('p');
            hint.className = 'modal-hint';
            hint.style.marginTop = '8px';
            hint.textContent = 'Cet ajout ne sera pas encore enregistré : la persistance sera ajoutée dans une prochaine version.';
            body.appendChild(hint);

            var cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'btn-secondary';
            cancelButton.setAttribute('data-modal-close', 'true');
            cancelButton.textContent = 'Annuler';

            var saveButton = document.createElement('button');
            saveButton.type = 'button';
            saveButton.className = 'btn-primary btn-wip';
            saveButton.setAttribute('data-modal-close', 'true');
            saveButton.textContent = 'Enregistrer';

            var footer = document.createDocumentFragment();
            footer.appendChild(cancelButton);
            footer.appendChild(saveButton);

            window.COCKPIT_MODAL.open({
                title: 'Ajouter un produit / service',
                body: body,
                footer: footer
            });
        });
    }

    var table = document.getElementById('products-table');
    var searchInput = document.getElementById('products-search');
    var typeFilter = document.getElementById('products-type-filter');
    var statusFilter = document.getElementById('products-status-filter');
    var resetButton = document.getElementById('products-reset-filters');
    var counter = document.getElementById('products-counter');
    var pageSizeSelect = document.getElementById('products-page-size');
    var prevButton = document.getElementById('products-prev-page');
    var nextButton = document.getElementById('products-next-page');
    var pageIndicator = document.getElementById('products-page-indicator');

    if (!table || !searchInput || !typeFilter || !statusFilter || !counter || !pageSizeSelect) {
        return;
    }

    PRODUCT_TYPES.forEach(function (type) {
        var option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        typeFilter.appendChild(option);
    });

    PRODUCT_STATUSES.forEach(function (status) {
        var option = document.createElement('option');
        option.value = status.value;
        option.textContent = status.label;
        statusFilter.appendChild(option);
    });

    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));

    window.COCKPIT_LIST_PAGINATION.init({
        rows: rows,
        searchInput: searchInput,
        filterSelects: [typeFilter, statusFilter],
        resetButton: resetButton,
        counterEl: counter,
        pageSizeSelect: pageSizeSelect,
        prevButton: prevButton,
        nextButton: nextButton,
        pageIndicatorEl: pageIndicator,
        labelSingular: 'élément',
        labelPlural: 'éléments',
        labelEmpty: 'Aucun produit ou service trouvé',
        matchRow: function (row, searchValue) {
            var matchesSearch = !searchValue || (row.dataset.search || '').indexOf(searchValue) !== -1;
            var matchesType = !typeFilter.value || row.dataset.type === typeFilter.value;
            var matchesStatus = !statusFilter.value || row.dataset.status === statusFilter.value;
            return matchesSearch && matchesType && matchesStatus;
        }
    });
})();

// Page Fiche produit / service : fiche complète à partir de données statiques
// (V0.5.2). PRODUCT_PAYMENT_MODALITIES et OFFER_HISTORY_TYPES sont propres à
// cette page (comme HISTORY_TYPES pour la fiche client) ; STATUS_AVAILABILITY
// dérive automatiquement la disponibilité en devis/facture à partir du statut,
// sans construire de vraie règle métier de facturation.

(function () {
    var nameEl = document.getElementById('item-name');
    if (!nameEl) {
        return;
    }

    var OFFER_HISTORY_TYPES = {
        'creation': { label: 'Création de l\'offre', badgeClass: 'badge-info' },
        'passage-actif': { label: 'Passage en actif', badgeClass: 'badge-success' },
        'modification-prix': { label: 'Modification du prix', badgeClass: 'badge-warning' },
        'modification-tva': { label: 'Modification de la TVA indicative', badgeClass: 'badge-neutral' },
        'modification-modalites': { label: 'Modification des modalités de paiement', badgeClass: 'badge-neutral' },
        'archivage': { label: 'Archivage', badgeClass: 'badge-info' }
    };

    var STATUS_AVAILABILITY = {
        'actif': { label: 'Disponible', caption: 'Sélectionnable dans devis et factures', selectionnable: true },
        'brouillon': { label: 'Non disponible', caption: 'En préparation, non sélectionnable', selectionnable: false },
        'inactif': { label: 'Non disponible', caption: 'Non proposé actuellement', selectionnable: false },
        'archive': { label: 'Non disponible', caption: 'Archivé, conservé pour historique', selectionnable: false }
    };

    var notFoundEl = document.getElementById('item-not-found');
    var contentEl = document.getElementById('item-profile-content');
    var statusEl = document.getElementById('item-status');
    var typeEl = document.getElementById('item-type');
    var priceEl = document.getElementById('item-price');
    var vatEl = document.getElementById('item-vat');
    var descriptionHeaderEl = document.getElementById('item-description-header');

    var kpiPrixEl = document.getElementById('kpi-item-prix');
    var kpiTvaEl = document.getElementById('kpi-item-tva');
    var kpiCoutEl = document.getElementById('kpi-item-cout');
    var kpiMargeEl = document.getElementById('kpi-item-marge');
    var kpiDisponibiliteEl = document.getElementById('kpi-item-disponibilite');
    var kpiDisponibiliteCaptionEl = document.getElementById('kpi-item-disponibilite-caption');

    var descriptionCourteEl = document.getElementById('item-description-courte');
    var descriptionDetailleeEl = document.getElementById('item-description-detaillee');
    var beneficesListEl = document.getElementById('item-benefices-list');
    var limitesListEl = document.getElementById('item-limites-list');

    var paramPrixEl = document.getElementById('item-param-prix');
    var paramTvaEl = document.getElementById('item-param-tva');
    var paramPrixModifiableEl = document.getElementById('item-param-prix-modifiable');
    var paramConditionsEl = document.getElementById('item-param-conditions');
    var paymentBadgesEl = document.getElementById('item-payment-badges');

    var noteMetaEl = document.getElementById('item-note-meta');
    var noteInterneEl = document.getElementById('item-note-interne');
    var historyListEl = document.getElementById('item-history-list');

    var costBodyEl = document.getElementById('item-cost-body');
    var costTotalEl = document.getElementById('item-cost-total');
    var costAddBtn = document.getElementById('item-cost-add-btn');

    var nameEditBtn = document.getElementById('item-name-edit-btn');
    var marginDetailBtn = document.getElementById('kpi-item-marge-detail');
    var descriptionEditBtn = document.getElementById('item-description-edit-btn');
    var paymentEditBtn = document.getElementById('item-payment-edit-btn');
    var noteEditBtn = document.getElementById('item-note-edit-btn');
    var historyViewBtn = document.getElementById('item-history-view-btn');

    function makeEl(tag, className, text) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    function makeCancelButton(label, autofocus) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-secondary';
        button.setAttribute('data-modal-close', 'true');
        if (autofocus) {
            button.setAttribute('data-modal-autofocus', 'true');
        }
        button.textContent = label || 'Annuler';
        return button;
    }

    function makeSaveButton(label) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-primary btn-wip';
        button.setAttribute('data-modal-close', 'true');
        button.textContent = label;
        return button;
    }

    function buildModalFooterButtons(buttons) {
        var fragment = document.createDocumentFragment();
        buttons.forEach(function (button) {
            fragment.appendChild(button);
        });
        return fragment;
    }

    function findLabel(list, value) {
        var match = (list || []).filter(function (entry) {
            return entry.value === value;
        })[0];
        return match || null;
    }

    function formatPrice(value) {
        return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function renderSimpleList(listEl, items) {
        if (!listEl) {
            return;
        }
        listEl.innerHTML = '';
        (items || []).forEach(function (text) {
            var li = document.createElement('li');
            li.textContent = text;
            listEl.appendChild(li);
        });
    }

    function renderPaymentBadges(modalites) {
        if (!paymentBadgesEl) {
            return;
        }
        paymentBadgesEl.innerHTML = '';
        (modalites || []).forEach(function (value) {
            var modality = findLabel(window.COCKPIT_PRODUCT_PAYMENT_MODALITIES, value);
            var badge = document.createElement('span');
            badge.className = 'badge badge-neutral';
            badge.textContent = modality ? modality.label : value;
            paymentBadgesEl.appendChild(badge);
        });
    }

    function buildHistoryList(events) {
        var list = document.createElement('div');
        list.className = 'history-list';

        events.forEach(function (event) {
            var typeInfo = OFFER_HISTORY_TYPES[event.type] || { label: event.type, badgeClass: 'badge-neutral' };

            var item = document.createElement('div');
            item.className = 'history-item';

            var dateEl = document.createElement('div');
            dateEl.className = 'history-date';
            dateEl.textContent = event.date + (event.heure ? ' · ' + event.heure : '');

            var typeEl2 = document.createElement('span');
            typeEl2.className = 'badge ' + typeInfo.badgeClass;
            typeEl2.textContent = typeInfo.label;

            var resumeEl = document.createElement('p');
            resumeEl.className = 'history-resume';
            resumeEl.textContent = event.resume;

            var authorEl = document.createElement('span');
            authorEl.className = 'history-author';
            authorEl.textContent = event.auteur || '—';

            item.appendChild(dateEl);
            item.appendChild(typeEl2);
            item.appendChild(resumeEl);
            item.appendChild(authorEl);
            list.appendChild(item);
        });

        return list;
    }

    function renderHistory(events) {
        if (!historyListEl) {
            return;
        }
        historyListEl.innerHTML = '';

        if (!events || events.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state-inline';
            empty.textContent = 'Aucun historique enregistré pour cette offre.';
            historyListEl.appendChild(empty);
            return;
        }

        var recentEvents = events.slice(-3);
        historyListEl.appendChild(buildHistoryList(recentEvents));

        var hiddenCount = events.length - recentEvents.length;
        if (hiddenCount > 0) {
            var hint = document.createElement('p');
            hint.className = 'modal-hint';
            hint.style.marginTop = '8px';
            hint.textContent = '+' + hiddenCount + ' événement' + (hiddenCount > 1 ? 's' : '') + ' supplémentaire' + (hiddenCount > 1 ? 's' : '') + ' — voir l\'historique complet.';
            historyListEl.appendChild(hint);
        }
    }

    // Modales d'interactions préparatoires (V0.5.3) : aucune ne modifie
    // `item`, qui reste la référence affichée à l'écran. "Enregistrer"/
    // "Valider" ferment la modale et déclenchent le pop-up Work in progress
    // existant (bouton cumulant data-modal-close et btn-wip).

    function openChangeStatusModal(item) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Offre : ' + item.nom));

        var currentLine = makeEl('p', 'modal-text');
        currentLine.appendChild(document.createTextNode('Statut actuel : '));
        var statusInfo = findLabel(window.COCKPIT_PRODUCT_STATUSES, item.statut);
        currentLine.appendChild(makeEl('span', 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral'), statusInfo ? statusInfo.label : item.statut));
        body.appendChild(currentLine);

        var label = makeEl('label', 'modal-label', 'Nouveau statut');
        label.setAttribute('for', 'offer-status-select');
        body.appendChild(label);

        var select = document.createElement('select');
        select.id = 'offer-status-select';
        select.className = 'table-select modal-select';
        select.setAttribute('data-modal-autofocus', 'true');
        (window.COCKPIT_PRODUCT_STATUSES || []).forEach(function (status) {
            var option = document.createElement('option');
            option.value = status.value;
            option.textContent = status.label;
            if (status.value === item.statut) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        body.appendChild(select);

        body.appendChild(makeEl('p', 'modal-hint', 'L\'archivage est un changement de statut, pas une suppression : l\'offre reste consultable. Ce changement ne sera pas encore enregistré.'));

        window.COCKPIT_MODAL.open({
            title: 'Changer le statut de l\'offre',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Valider')])
        });
    }

    function openChangeTypeModal(item) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Offre : ' + item.nom));

        var currentLine = makeEl('p', 'modal-text');
        currentLine.appendChild(document.createTextNode('Type actuel : '));
        var typeInfo = findLabel(window.COCKPIT_PRODUCT_TYPES, item.type);
        currentLine.appendChild(makeEl('span', 'badge ' + (typeInfo ? typeInfo.badgeClass : 'badge-neutral'), typeInfo ? typeInfo.label : item.type));
        body.appendChild(currentLine);

        var label = makeEl('label', 'modal-label', 'Nouveau type');
        label.setAttribute('for', 'offer-type-select');
        body.appendChild(label);

        var select = document.createElement('select');
        select.id = 'offer-type-select';
        select.className = 'table-select modal-select';
        select.setAttribute('data-modal-autofocus', 'true');
        (window.COCKPIT_PRODUCT_TYPES || []).forEach(function (type) {
            var option = document.createElement('option');
            option.value = type.value;
            option.textContent = type.label;
            if (type.value === item.type) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        body.appendChild(select);

        body.appendChild(makeEl('p', 'modal-hint', 'Le type reste uniquement Produit ou Service. Ce changement ne sera pas encore enregistré.'));

        window.COCKPIT_MODAL.open({
            title: 'Changer le type de l\'offre',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Valider')])
        });
    }

    function openEditNameModal(item) {
        var body = document.createElement('div');

        var label = makeEl('label', 'modal-label', 'Nom de l\'offre');
        label.setAttribute('for', 'edit-name-input');
        body.appendChild(label);

        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'edit-name-input';
        input.className = 'modal-input';
        input.value = item.nom;
        input.setAttribute('data-modal-autofocus', 'true');
        body.appendChild(input);

        body.appendChild(makeEl('p', 'modal-hint', 'Cette modification ne sera pas encore enregistrée.'));

        window.COCKPIT_MODAL.open({
            title: 'Modifier le nom de l\'offre',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Enregistrer')])
        });
    }

    function openEditDescriptionModal(item) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Offre : ' + item.nom));

        var shortLabel = makeEl('label', 'modal-label', 'Description courte');
        shortLabel.setAttribute('for', 'edit-desc-courte');
        body.appendChild(shortLabel);
        var shortInput = document.createElement('input');
        shortInput.type = 'text';
        shortInput.id = 'edit-desc-courte';
        shortInput.className = 'modal-input';
        shortInput.value = item.descriptionCourte || '';
        shortInput.setAttribute('data-modal-autofocus', 'true');
        body.appendChild(shortInput);

        var longLabel = makeEl('label', 'modal-label', 'Description détaillée');
        longLabel.setAttribute('for', 'edit-desc-detaillee');
        body.appendChild(longLabel);
        var longTextarea = document.createElement('textarea');
        longTextarea.id = 'edit-desc-detaillee';
        longTextarea.className = 'modal-textarea';
        longTextarea.rows = 3;
        longTextarea.value = item.descriptionDetaillee || '';
        body.appendChild(longTextarea);

        var benefitsLabel = makeEl('label', 'modal-label', 'Bénéfices client (une ligne par bénéfice)');
        benefitsLabel.setAttribute('for', 'edit-desc-benefices');
        body.appendChild(benefitsLabel);
        var benefitsTextarea = document.createElement('textarea');
        benefitsTextarea.id = 'edit-desc-benefices';
        benefitsTextarea.className = 'modal-textarea';
        benefitsTextarea.rows = 2;
        benefitsTextarea.value = (item.beneficesClient || []).join('\n');
        body.appendChild(benefitsTextarea);

        var limitsLabel = makeEl('label', 'modal-label', 'Limites / conditions (une ligne par élément)');
        limitsLabel.setAttribute('for', 'edit-desc-limites');
        body.appendChild(limitsLabel);
        var limitsTextarea = document.createElement('textarea');
        limitsTextarea.id = 'edit-desc-limites';
        limitsTextarea.className = 'modal-textarea';
        limitsTextarea.rows = 2;
        limitsTextarea.value = (item.limitesConditions || []).join('\n');
        body.appendChild(limitsTextarea);

        body.appendChild(makeEl('p', 'modal-hint', 'Cette modification ne sera pas encore enregistrée.'));

        window.COCKPIT_MODAL.open({
            title: 'Modifier la description commerciale',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Enregistrer')])
        });
    }

    function openEditSaleParamsModal(item) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Offre : ' + item.nom));

        var priceLabel = makeEl('label', 'modal-label', 'Prix HT');
        priceLabel.setAttribute('for', 'edit-params-price');
        body.appendChild(priceLabel);
        var priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.id = 'edit-params-price';
        priceInput.className = 'modal-input';
        priceInput.value = item.prixHT;
        priceInput.setAttribute('data-modal-autofocus', 'true');
        body.appendChild(priceInput);

        var vatLabel = makeEl('label', 'modal-label', 'TVA par défaut (%)');
        vatLabel.setAttribute('for', 'edit-params-vat');
        body.appendChild(vatLabel);
        var vatInput = document.createElement('input');
        vatInput.type = 'number';
        vatInput.id = 'edit-params-vat';
        vatInput.className = 'modal-input';
        vatInput.value = item.tva;
        body.appendChild(vatInput);

        var modifiableLabel = makeEl('label', 'modal-label', 'Prix modifiable en devis/facture');
        modifiableLabel.setAttribute('for', 'edit-params-modifiable');
        body.appendChild(modifiableLabel);
        var modifiableSelect = document.createElement('select');
        modifiableSelect.id = 'edit-params-modifiable';
        modifiableSelect.className = 'table-select modal-select';
        [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }].forEach(function (option) {
            var optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            if ((option.value === 'oui') === !!item.prixModifiable) {
                optionEl.selected = true;
            }
            modifiableSelect.appendChild(optionEl);
        });
        body.appendChild(modifiableSelect);

        var conditionsLabel = makeEl('label', 'modal-label', 'Conditions particulières');
        conditionsLabel.setAttribute('for', 'edit-params-conditions');
        body.appendChild(conditionsLabel);
        var conditionsInput = document.createElement('input');
        conditionsInput.type = 'text';
        conditionsInput.id = 'edit-params-conditions';
        conditionsInput.className = 'modal-input';
        conditionsInput.value = item.conditionsParticulieres || '';
        body.appendChild(conditionsInput);

        var paymentLabel = makeEl('p', 'modal-label', 'Modalités de paiement acceptées');
        body.appendChild(paymentLabel);
        var paymentList = document.createElement('div');
        paymentList.className = 'modal-checkbox-list';
        var currentModalites = item.modalitesPaiement || [];
        (window.COCKPIT_PRODUCT_PAYMENT_MODALITIES || []).forEach(function (modality, index) {
            var checkboxLabel = makeEl('label', 'modal-checkbox-item');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'edit-params-payment-' + index;
            checkbox.value = modality.value;
            checkbox.checked = currentModalites.indexOf(modality.value) !== -1;
            checkboxLabel.appendChild(checkbox);
            checkboxLabel.appendChild(document.createTextNode(modality.label));
            paymentList.appendChild(checkboxLabel);
        });
        body.appendChild(paymentList);

        body.appendChild(makeEl('p', 'modal-hint', 'Le Type (Produit ou Service) n\'est pas concerné par ces modalités de paiement. Cette modification ne sera pas encore enregistrée.'));

        window.COCKPIT_MODAL.open({
            title: 'Modifier les paramètres de vente',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Enregistrer')])
        });
    }

    function computeCostTotal(couts) {
        return (couts || []).reduce(function (sum, cout) {
            return sum + (cout.quantite * cout.coutUnitaire);
        }, 0);
    }

    function openAddCostModal(item) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Offre : ' + item.nom));

        var nameLabel = makeEl('label', 'modal-label', 'Nom du coût');
        nameLabel.setAttribute('for', 'add-cost-name');
        body.appendChild(nameLabel);
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'add-cost-name';
        nameInput.className = 'modal-input';
        nameInput.placeholder = 'Ex. Matière première';
        nameInput.setAttribute('data-modal-autofocus', 'true');
        body.appendChild(nameInput);

        var qtyLabel = makeEl('label', 'modal-label', 'Quantité par vente / prestation');
        qtyLabel.setAttribute('for', 'add-cost-qty');
        body.appendChild(qtyLabel);
        var qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.step = 'any';
        qtyInput.id = 'add-cost-qty';
        qtyInput.className = 'modal-input';
        qtyInput.placeholder = 'Ex. 0.5';
        body.appendChild(qtyInput);

        var unitLabel = makeEl('label', 'modal-label', 'Coût unitaire');
        unitLabel.setAttribute('for', 'add-cost-unit');
        body.appendChild(unitLabel);
        var unitInput = document.createElement('input');
        unitInput.type = 'number';
        unitInput.step = 'any';
        unitInput.id = 'add-cost-unit';
        unitInput.className = 'modal-input';
        unitInput.placeholder = 'Ex. 6';
        body.appendChild(unitInput);

        body.appendChild(makeEl('p', 'modal-hint', 'Le total de la ligne sera indicatif, calculé à l\'affichage (quantité × coût unitaire). Cet ajout ne sera pas encore enregistré.'));

        window.COCKPIT_MODAL.open({
            title: 'Ajouter un coût',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Ajouter')])
        });
    }

    function openMarginDetailModal(item) {
        var body = document.createElement('div');
        var costTotal = computeCostTotal(item.couts);

        var recap = document.createElement('div');
        recap.className = 'info-grid';
        recap.appendChild(makeEl('div', 'info-item'));
        recap.lastChild.appendChild(makeEl('span', 'info-label', 'Coût estimé total'));
        recap.lastChild.appendChild(makeEl('span', 'info-value', formatPrice(costTotal) + ' €'));
        recap.appendChild(makeEl('div', 'info-item'));
        recap.lastChild.appendChild(makeEl('span', 'info-label', 'Marge estimée actuelle'));
        recap.lastChild.appendChild(makeEl('span', 'info-value', item.margeEstimee || '—'));
        body.appendChild(recap);

        if (item.couts && item.couts.length > 0) {
            body.appendChild(makeEl('p', 'modal-label', 'Détail des composantes de coût'));
            var breakdown = document.createElement('table');
            breakdown.className = 'data-table';
            var thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>Composante</th><th>Quantité</th><th>Coût unitaire</th><th>Total ligne</th></tr>';
            breakdown.appendChild(thead);
            var tbody = document.createElement('tbody');
            item.couts.forEach(function (cout) {
                var row = document.createElement('tr');
                var lineTotal = cout.quantite * cout.coutUnitaire;
                row.innerHTML = '<td>' + cout.nom + '</td><td>' + cout.quantite + '</td><td>' + formatPrice(cout.coutUnitaire) + ' €</td><td>' + formatPrice(lineTotal) + ' €</td>';
                tbody.appendChild(row);
            });
            breakdown.appendChild(tbody);
            body.appendChild(breakdown);
        }

        body.appendChild(makeEl('p', 'modal-hint', 'Futur outil de calcul de marge : familles de coûts prévues.'));

        var families = ['Coût de production', 'Coût de mise en service', 'Coût commercial', 'Coût de sous-traitance', 'Frais variables', 'Marge cible'];
        var familyGrid = document.createElement('div');
        familyGrid.className = 'info-grid';
        familyGrid.style.marginTop = '10px';
        families.forEach(function (family) {
            var item2 = makeEl('div', 'info-item');
            item2.appendChild(makeEl('span', 'info-label', family));
            item2.appendChild(makeEl('span', 'info-value', 'À définir'));
            familyGrid.appendChild(item2);
        });
        body.appendChild(familyGrid);

        body.appendChild(makeEl('p', 'modal-hint', 'Aucun calcul réel, aucune formule et aucune saisie ne sont encore actifs. Cette modale montre uniquement la future direction fonctionnelle.'));

        window.COCKPIT_MODAL.open({
            title: 'Détail de marge à venir',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Fermer', true)])
        });
    }

    function openEditNoteModal(item) {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Offre : ' + item.nom));

        var label = makeEl('label', 'modal-label', 'Note interne');
        label.setAttribute('for', 'edit-note-textarea');
        body.appendChild(label);

        var textarea = document.createElement('textarea');
        textarea.id = 'edit-note-textarea';
        textarea.className = 'modal-textarea';
        textarea.rows = 4;
        textarea.value = item.noteInterne || '';
        textarea.setAttribute('data-modal-autofocus', 'true');
        body.appendChild(textarea);

        window.COCKPIT_MODAL.open({
            title: 'Modifier la note interne',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Annuler'), makeSaveButton('Enregistrer')])
        });
    }

    function openFullHistoryModal(item) {
        var body = document.createElement('div');
        var events = item.historique || [];

        if (events.length === 0) {
            body.appendChild(makeEl('p', 'empty-state-inline', 'Aucun historique enregistré pour cette offre.'));
        } else {
            body.appendChild(buildHistoryList(events));
        }

        window.COCKPIT_MODAL.open({
            title: 'Historique complet de l\'offre',
            body: body,
            footer: buildModalFooterButtons([makeCancelButton('Fermer', true)])
        });
    }

    function renderItem(slug) {
        var details = window.COCKPIT_PRODUCT_DETAILS || {};
        var item = slug ? details[slug] : null;

        if (!item) {
            if (notFoundEl) {
                notFoundEl.style.display = '';
            }
            if (contentEl) {
                contentEl.style.display = 'none';
            }
            return;
        }

        if (notFoundEl) {
            notFoundEl.style.display = 'none';
        }
        if (contentEl) {
            contentEl.style.display = '';
        }

        nameEl.textContent = item.nom;

        var typeInfo = findLabel(window.COCKPIT_PRODUCT_TYPES, item.type);
        if (typeEl) {
            typeEl.textContent = typeInfo ? typeInfo.label : item.type;
            typeEl.className = 'badge badge-clickable ' + (typeInfo ? typeInfo.badgeClass : 'badge-neutral');
            typeEl.onclick = function () {
                openChangeTypeModal(item);
            };
        }

        var statusInfo = findLabel(window.COCKPIT_PRODUCT_STATUSES, item.statut);
        if (statusEl) {
            statusEl.textContent = statusInfo ? statusInfo.label : item.statut;
            statusEl.className = 'badge badge-clickable ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');
            statusEl.onclick = function () {
                openChangeStatusModal(item);
            };
        }

        var formattedPrice = formatPrice(item.prixHT) + ' € HT';
        var formattedVat = item.tva + ' %';

        if (priceEl) {
            priceEl.textContent = formattedPrice;
        }
        if (vatEl) {
            vatEl.textContent = formattedVat;
        }
        if (descriptionHeaderEl) {
            descriptionHeaderEl.textContent = item.descriptionCourte || '—';
        }

        if (kpiPrixEl) {
            kpiPrixEl.textContent = formattedPrice;
        }
        if (kpiTvaEl) {
            kpiTvaEl.textContent = formattedVat;
        }
        var costTotal = computeCostTotal(item.couts);
        if (kpiCoutEl) {
            kpiCoutEl.textContent = formatPrice(costTotal) + ' €';
        }
        if (kpiMargeEl) {
            kpiMargeEl.textContent = item.margeEstimee || '—';
        }

        var availability = STATUS_AVAILABILITY[item.statut] || { label: '—', caption: '—', selectionnable: false };
        if (kpiDisponibiliteEl) {
            kpiDisponibiliteEl.textContent = availability.label;
        }
        if (kpiDisponibiliteCaptionEl) {
            kpiDisponibiliteCaptionEl.textContent = availability.caption;
        }

        if (descriptionCourteEl) {
            descriptionCourteEl.textContent = item.descriptionCourte || '—';
        }
        if (descriptionDetailleeEl) {
            descriptionDetailleeEl.textContent = item.descriptionDetaillee || '—';
        }
        renderSimpleList(beneficesListEl, item.beneficesClient);
        renderSimpleList(limitesListEl, item.limitesConditions);

        if (paramPrixEl) {
            paramPrixEl.textContent = formattedPrice;
        }
        if (paramTvaEl) {
            paramTvaEl.textContent = formattedVat;
        }
        if (paramPrixModifiableEl) {
            paramPrixModifiableEl.textContent = item.prixModifiable ? 'Oui' : 'Non';
        }
        if (paramConditionsEl) {
            paramConditionsEl.textContent = item.conditionsParticulieres || '—';
        }
        renderPaymentBadges(item.modalitesPaiement);

        if (costBodyEl) {
            costBodyEl.innerHTML = '';
            (item.couts || []).forEach(function (cout) {
                var row = document.createElement('tr');
                var lineTotal = cout.quantite * cout.coutUnitaire;
                row.innerHTML = '<td>' + cout.nom + '</td><td>' + cout.quantite + '</td><td>' + formatPrice(cout.coutUnitaire) + ' €</td><td>' + formatPrice(lineTotal) + ' €</td>';
                costBodyEl.appendChild(row);
            });
        }
        if (costTotalEl) {
            costTotalEl.textContent = formatPrice(costTotal) + ' €';
        }

        if (noteMetaEl) {
            noteMetaEl.textContent = 'Réf. ' + (item.referenceInterne || '—') + ' · Créée le ' + (item.dateCreation || '—') + ' · Mise à jour le ' + (item.derniereMiseAJour || '—');
        }
        if (noteInterneEl) {
            noteInterneEl.textContent = item.noteInterne || '—';
        }

        renderHistory(item.historique);

        if (nameEditBtn) {
            nameEditBtn.onclick = function () {
                openEditNameModal(item);
            };
        }
        if (descriptionEditBtn) {
            descriptionEditBtn.onclick = function () {
                openEditDescriptionModal(item);
            };
        }
        if (marginDetailBtn) {
            marginDetailBtn.onclick = function () {
                openMarginDetailModal(item);
            };
        }
        if (paymentEditBtn) {
            paymentEditBtn.onclick = function () {
                openEditSaleParamsModal(item);
            };
        }
        if (costAddBtn) {
            costAddBtn.onclick = function () {
                openAddCostModal(item);
            };
        }
        if (noteEditBtn) {
            noteEditBtn.onclick = function () {
                openEditNoteModal(item);
            };
        }
        if (historyViewBtn) {
            historyViewBtn.onclick = function () {
                openFullHistoryModal(item);
            };
        }
    }

    var params = new URLSearchParams(window.location.search);
    renderItem(params.get('item'));
})();
