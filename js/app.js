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

// Données Clients (V0.4.2, isolées en V0.6.4 pour être disponibles avant les
// données Devis/Factures : la fiche client a désormais besoin de
// DEVIS_DETAILS/FACTURE_DETAILS pour afficher les documents réellement liés
// à un client, voir plus bas). CLIENT_DETAILS est une source temporaire et
// fictive, une entrée par slug déjà présent dans pages/clients.html. Elle
// prépare une vraie source de données (backend) sans en construire une dès
// maintenant.

(function () {
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
})();

// Données Facturation / Devis (V0.6.1)
// COMPANY_SETTINGS est la source par défaut de l'émetteur pour tout nouveau
// devis ; chaque version de devis conserve ensuite son propre companySnapshot
// et clientSnapshot, figés au moment de leur création, pour ne jamais changer
// rétroactivement un devis existant si les Paramètres entreprise ou la fiche
// client évoluent plus tard. DEVIS_DETAILS est une source statique en mémoire,
// comme CLIENT_DETAILS et PRODUCT_DETAILS : aucune persistance réelle, aucun
// localStorage. Le versionnement et le verrouillage sont démontrés sur ce jeu
// de données fictif ; ils ne sont pas reconstruits dynamiquement. Positionné
// ici (avant la fiche client) pour que snapshotClient() puisse lire
// CLIENT_DETAILS déjà exposé ci-dessus.

(function () {
    var COMPANY_SETTINGS = {
        nom: 'Cockpit Entrepreneur SARL',
        adresse: '10 rue de l\'Innovation, 75011 Paris',
        telephone: '01 84 12 34 56',
        email: 'contact@cockpit-entrepreneur.example.com',
        siteInternet: 'www.cockpit-entrepreneur.example.com',
        siren: '123 456 789',
        siret: '123 456 789 00012',
        tva: 'FR12 123456789',
        iban: 'FR76 1234 5678 9012 3456 7890 123',
        bic: 'ABCDEFGHXXX',
        mentionsLegales: 'En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée, ainsi qu\'une indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 du Code de commerce). Aucun escompte pour paiement anticipé.'
    };

    var DEVIS_STATUSES = [
        { value: 'brouillon', label: 'Brouillon', badgeClass: 'badge-neutral' },
        { value: 'envoye', label: 'Envoyé', badgeClass: 'badge-info' },
        { value: 'accepte', label: 'Accepté', badgeClass: 'badge-success' },
        { value: 'refuse', label: 'Refusé', badgeClass: 'badge-danger' }
    ];

    function snapshotClient(slug) {
        var client = (window.COCKPIT_CLIENT_DETAILS || {})[slug];
        if (!client) {
            return null;
        }
        return {
            nom: client.nom,
            entreprise: client.entreprise,
            adresse: client.adresse,
            telephone: client.telephone,
            email: client.email
        };
    }

    function snapshotCompany() {
        return {
            nom: COMPANY_SETTINGS.nom,
            adresse: COMPANY_SETTINGS.adresse,
            telephone: COMPANY_SETTINGS.telephone,
            email: COMPANY_SETTINGS.email,
            siret: COMPANY_SETTINGS.siret,
            tva: COMPANY_SETTINGS.tva
        };
    }

    var DEVIS_DETAILS = {
        'DEV-2026-00011': {
            numero: 'DEV-2026-00011',
            versionActive: 1,
            versions: [
                {
                    version: 1,
                    statut: 'brouillon',
                    dateCreation: '05/07/2026',
                    dateModification: '05/07/2026',
                    clientSlug: 'julien-petit',
                    clientSnapshot: snapshotClient('julien-petit'),
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement à réception', acompte: '', fractionne: '', note: '' }
                }
            ]
        },
        'DEV-2026-00012': {
            numero: 'DEV-2026-00012',
            versionActive: 1,
            versions: [
                {
                    version: 1,
                    statut: 'envoye',
                    dateCreation: '22/06/2026',
                    dateModification: '22/06/2026',
                    clientSlug: 'atelier-leroy',
                    clientSnapshot: snapshotClient('atelier-leroy'),
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Création site vitrine', description: 'Conception et mise en ligne d\'un site vitrine professionnel clé en main.', quantite: 1, prixUnitaireHT: 1800, tauxTVA: 20, remisePourcent: 10 },
                        { designation: 'Maintenance mensuelle', description: 'Suivi technique mensuel et mises à jour de sécurité pour un site existant.', quantite: 3, prixUnitaireHT: 250, tauxTVA: 20, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: 'Acompte de 30 % à la commande', fractionne: '', note: '' }
                }
            ]
        },
        'DEV-2026-00013': {
            numero: 'DEV-2026-00013',
            versionActive: 1,
            versions: [
                {
                    version: 1,
                    statut: 'refuse',
                    dateCreation: '15/05/2026',
                    dateModification: '15/05/2026',
                    clientSlug: 'techni-bois-sarl',
                    clientSnapshot: snapshotClient('techni-bois-sarl'),
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Formation personnalisée', description: 'Session de formation individuelle adaptée aux besoins du client.', quantite: 2, prixUnitaireHT: 950, tauxTVA: 10, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement comptant', acompte: '', fractionne: '', note: '' }
                }
            ]
        },
        'DEV-2026-00014': {
            numero: 'DEV-2026-00014',
            versionActive: 1,
            versions: [
                {
                    version: 1,
                    statut: 'envoye',
                    dateCreation: '28/06/2026',
                    dateModification: '28/06/2026',
                    clientSlug: 'boucherie-morel',
                    clientSnapshot: snapshotClient('boucherie-morel'),
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Kit de démarrage digital', description: 'Kit prêt à l\'emploi pour démarrer sa présence digitale.', quantite: 5, prixUnitaireHT: 129, tauxTVA: 20, remisePourcent: 5 },
                        { designation: 'Accessoire premium', description: 'Accessoire complémentaire, retiré temporairement de la vente.', quantite: 2, prixUnitaireHT: 89, tauxTVA: 20, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement à 15 jours', acompte: '', fractionne: '', note: '' }
                }
            ]
        },
        'DEV-2026-00015': {
            numero: 'DEV-2026-00015',
            versionActive: 3,
            versions: [
                {
                    version: 1,
                    statut: 'envoye',
                    dateCreation: '14/02/2026',
                    dateModification: '14/02/2026',
                    clientSlug: 'martin-dupont',
                    clientSnapshot: { nom: 'Martin Dupont', entreprise: '—', adresse: '8 rue des Artisans, 75011 Paris', telephone: '01 23 45 67 89', email: 'martin.dupont@example.com' },
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 },
                        { designation: 'Maintenance mensuelle', description: 'Suivi technique mensuel et mises à jour de sécurité pour un site existant.', quantite: 1, prixUnitaireHT: 250, tauxTVA: 20, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: '', fractionne: '', note: '' }
                },
                {
                    version: 2,
                    statut: 'envoye',
                    dateCreation: '02/03/2026',
                    dateModification: '02/03/2026',
                    clientSlug: 'martin-dupont',
                    clientSnapshot: snapshotClient('martin-dupont'),
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 },
                        { designation: 'Création site vitrine', description: 'Conception et mise en ligne d\'un site vitrine professionnel clé en main.', quantite: 1, prixUnitaireHT: 1800, tauxTVA: 20, remisePourcent: 10 },
                        { designation: 'Maintenance mensuelle', description: 'Suivi technique mensuel et mises à jour de sécurité pour un site existant.', quantite: 1, prixUnitaireHT: 250, tauxTVA: 20, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: 'Acompte de 30 % à la commande (site vitrine)', fractionne: '', note: '' }
                },
                {
                    version: 3,
                    statut: 'accepte',
                    dateCreation: '15/03/2026',
                    dateModification: '15/03/2026',
                    clientSlug: 'martin-dupont',
                    clientSnapshot: snapshotClient('martin-dupont'),
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 },
                        { designation: 'Création site vitrine', description: 'Conception et mise en ligne d\'un site vitrine professionnel clé en main.', quantite: 1, prixUnitaireHT: 1800, tauxTVA: 20, remisePourcent: 10 },
                        { designation: 'Maintenance mensuelle', description: 'Suivi technique mensuel et mises à jour de sécurité pour un site existant.', quantite: 3, prixUnitaireHT: 250, tauxTVA: 20, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: 'Acompte de 30 % à la commande (site vitrine)', fractionne: 'Paiement en 3 fois pour la maintenance', note: 'Facturation de la maintenance mensuelle en 3 échéances trimestrielles.' }
                }
            ]
        },
        'DEV-2026-00016': {
            numero: 'DEV-2026-00016',
            versionActive: 1,
            versions: [
                {
                    version: 1,
                    statut: 'accepte',
                    dateCreation: '18/06/2026',
                    dateModification: '18/06/2026',
                    clientSlug: 'sophie-bernard',
                    clientSnapshot: snapshotClient('sophie-bernard'),
                    companySnapshot: snapshotCompany(),
                    lignes: [
                        { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 }
                    ],
                    conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: '', fractionne: '', note: '' }
                }
            ]
        }
    };

    function roundMoney(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    function formatMoney(value) {
        var rounded = roundMoney(value || 0);
        var fixed = rounded.toFixed(2);
        var parts = fixed.split('.');
        var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return intPart + ',' + parts[1] + ' €';
    }

    function computeLine(line) {
        var quantite = parseFloat(line.quantite) || 0;
        var prixUnitaireHT = parseFloat(line.prixUnitaireHT) || 0;
        var remisePourcent = parseFloat(line.remisePourcent) || 0;
        var tauxTVA = parseFloat(line.tauxTVA) || 0;
        var brutHT = roundMoney(quantite * prixUnitaireHT);
        var remiseMontant = roundMoney(brutHT * (remisePourcent / 100));
        var netHT = roundMoney(brutHT - remiseMontant);
        var montantTVA = roundMoney(netHT * (tauxTVA / 100));
        var totalTTC = roundMoney(netHT + montantTVA);
        return { brutHT: brutHT, remiseMontant: remiseMontant, netHT: netHT, montantTVA: montantTVA, totalTTC: totalTTC, tauxTVA: tauxTVA };
    }

    function computeDevisTotals(lignes) {
        var totalBrutHT = 0;
        var totalRemises = 0;
        var totalHT = 0;
        var totalTVA = 0;
        var totalTTC = 0;
        var tvaParTaux = {};

        (lignes || []).forEach(function (line) {
            var computed = computeLine(line);
            totalBrutHT = roundMoney(totalBrutHT + computed.brutHT);
            totalRemises = roundMoney(totalRemises + computed.remiseMontant);
            totalHT = roundMoney(totalHT + computed.netHT);
            totalTVA = roundMoney(totalTVA + computed.montantTVA);
            totalTTC = roundMoney(totalTTC + computed.totalTTC);

            var rateKey = String(computed.tauxTVA);
            tvaParTaux[rateKey] = roundMoney((tvaParTaux[rateKey] || 0) + computed.montantTVA);
        });

        return { totalBrutHT: totalBrutHT, totalRemises: totalRemises, totalHT: totalHT, totalTVA: totalTVA, totalTTC: totalTTC, tvaParTaux: tvaParTaux };
    }

    function getActiveVersion(devis) {
        if (!devis) {
            return null;
        }
        var match = devis.versions.filter(function (version) {
            return version.version === devis.versionActive;
        })[0];
        return match || devis.versions[devis.versions.length - 1];
    }

    function computeNextDevisNumero(annee) {
        var maxSeq = 0;
        Object.keys(DEVIS_DETAILS).forEach(function (numero) {
            var match = numero.match(/^DEV-(\d{4})-(\d{5})$/);
            if (match && match[1] === String(annee)) {
                var seq = parseInt(match[2], 10);
                if (seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        });
        var nextSeq = maxSeq + 1;
        var padded = String(nextSeq);
        while (padded.length < 5) {
            padded = '0' + padded;
        }
        return 'DEV-' + annee + '-' + padded;
    }

    window.COCKPIT_COMPANY_SETTINGS = COMPANY_SETTINGS;
    window.COCKPIT_DEVIS_STATUSES = DEVIS_STATUSES;
    window.COCKPIT_DEVIS_DETAILS = DEVIS_DETAILS;
    window.COCKPIT_DEVIS_CALC = {
        roundMoney: roundMoney,
        formatMoney: formatMoney,
        computeLine: computeLine,
        computeDevisTotals: computeDevisTotals,
        getActiveVersion: getActiveVersion,
        computeNextDevisNumero: computeNextDevisNumero,
        snapshotClient: snapshotClient,
        snapshotCompany: snapshotCompany
    };
})();

// Données Facturation / Factures (V0.6.2)
// Réutilise directement COCKPIT_DEVIS_CALC pour tout ce qui est déjà correct :
// roundMoney/formatMoney/computeLine/computeDevisTotals (les lignes de facture
// ont exactement la même forme que les lignes de devis), snapshotClient/
// snapshotCompany. COCKPIT_FACTURE_CALC n'ajoute que le spécifique aux
// factures : paiements, statut affiché calculé, numérotation. FACTURE_DETAILS
// est une source statique en mémoire, comme DEVIS_DETAILS : aucune
// persistance réelle. Le statut affiché sépare volontairement un
// statutEmission explicite (brouillon/emise/annulee) d'un statut de paiement
// calculé (non-payee/partiellement-payee/payee/en-retard), pour ne jamais
// pouvoir afficher un statut de paiement incohérent sur une facture non
// émise.

(function () {
    var devisCalc = window.COCKPIT_DEVIS_CALC;

    var FACTURE_STATUSES = [
        { value: 'brouillon', label: 'Brouillon', badgeClass: 'badge-neutral' },
        { value: 'non-payee', label: 'Émise', badgeClass: 'badge-info' },
        { value: 'partiellement-payee', label: 'Partiellement payée', badgeClass: 'badge-warning' },
        { value: 'payee', label: 'Payée', badgeClass: 'badge-success' },
        { value: 'en-retard', label: 'En retard', badgeClass: 'badge-danger' },
        { value: 'annulee', label: 'Annulée', badgeClass: 'badge-neutral' }
    ];

    var PAYMENT_METHODS = ['Virement bancaire', 'Carte bancaire', 'Chèque', 'Espèces', 'Prélèvement'];

    function parseFrDate(value) {
        if (!value) {
            return null;
        }
        var parts = value.split('/');
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }

    function computePaiements(paiements, totalTTC) {
        var totalPaye = 0;
        (paiements || []).forEach(function (paiement) {
            totalPaye = devisCalc.roundMoney(totalPaye + (parseFloat(paiement.montant) || 0));
        });
        var resteAPayer = devisCalc.roundMoney((totalTTC || 0) - totalPaye);
        var pourcentagePaye = totalTTC ? Math.round((totalPaye / totalTTC) * 100) : 0;
        return { totalPaye: totalPaye, resteAPayer: resteAPayer, pourcentagePaye: pourcentagePaye };
    }

    function computeStatutAffiche(params) {
        if (params.statutEmission === 'brouillon') {
            return 'brouillon';
        }
        if (params.statutEmission === 'annulee') {
            return 'annulee';
        }
        var totals = computePaiements(params.paiements, params.totalTTC);
        if (totals.resteAPayer <= 0) {
            return 'payee';
        }
        var echeance = parseFrDate(params.dateEcheance);
        if (echeance && echeance < new Date()) {
            return 'en-retard';
        }
        if (totals.totalPaye > 0) {
            return 'partiellement-payee';
        }
        return 'non-payee';
    }

    function computeNextFactureNumero(annee) {
        var maxSeq = 0;
        Object.keys(FACTURE_DETAILS).forEach(function (key) {
            var match = key.match(/^FAC-(\d{4})-(\d{5})$/);
            if (match && match[1] === String(annee)) {
                var seq = parseInt(match[2], 10);
                if (seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        });
        var nextSeq = maxSeq + 1;
        var padded = String(nextSeq);
        while (padded.length < 5) {
            padded = '0' + padded;
        }
        return 'FAC-' + annee + '-' + padded;
    }

    var FACTURE_DETAILS = {
        'FAC-2026-00001': {
            numero: 'FAC-2026-00001',
            statutEmission: 'emise',
            dateCreation: '01/07/2026',
            dateEmission: '01/07/2026',
            dateEcheance: '31/07/2026',
            clientSlug: 'sophie-bernard',
            clientSnapshot: devisCalc.snapshotClient('sophie-bernard'),
            companySnapshot: devisCalc.snapshotCompany(),
            lignes: [
                { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 }
            ],
            conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: '', fractionne: '', note: '' },
            paiements: [],
            devisRef: null
        },
        'FAC-2026-00002': {
            numero: 'FAC-2026-00002',
            statutEmission: 'emise',
            dateCreation: '10/06/2026',
            dateEmission: '10/06/2026',
            dateEcheance: '10/07/2026',
            clientSlug: 'atelier-leroy',
            clientSnapshot: devisCalc.snapshotClient('atelier-leroy'),
            companySnapshot: devisCalc.snapshotCompany(),
            lignes: [
                { designation: 'Maintenance mensuelle', description: 'Suivi technique mensuel et mises à jour de sécurité pour un site existant.', quantite: 4, prixUnitaireHT: 250, tauxTVA: 20, remisePourcent: 0 }
            ],
            conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: '', fractionne: '', note: '' },
            paiements: [
                { date: '20/06/2026', montant: 600, mode: 'Virement bancaire', reference: 'VIR-2026-0456', note: '' }
            ],
            devisRef: null
        },
        'FAC-2026-00003': {
            numero: 'FAC-2026-00003',
            statutEmission: 'emise',
            dateCreation: '16/03/2026',
            dateEmission: '16/03/2026',
            dateEcheance: '15/04/2026',
            clientSlug: 'martin-dupont',
            clientSnapshot: { nom: 'Martin Dupont', entreprise: '—', adresse: '12 rue des Artisans, 75011 Paris', telephone: '01 23 45 67 89', email: 'martin.dupont@example.com' },
            companySnapshot: devisCalc.snapshotCompany(),
            lignes: [
                { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 },
                { designation: 'Création site vitrine', description: 'Conception et mise en ligne d\'un site vitrine professionnel clé en main.', quantite: 1, prixUnitaireHT: 1800, tauxTVA: 20, remisePourcent: 10 },
                { designation: 'Maintenance mensuelle', description: 'Suivi technique mensuel et mises à jour de sécurité pour un site existant.', quantite: 3, prixUnitaireHT: 250, tauxTVA: 20, remisePourcent: 0 }
            ],
            conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: 'Acompte de 30 % à la commande (site vitrine)', fractionne: 'Paiement en 3 fois pour la maintenance', note: 'Facturation de la maintenance mensuelle en 3 échéances trimestrielles.' },
            paiements: [
                { date: '20/03/2026', montant: 1122, mode: 'Virement bancaire', reference: 'VIR-2026-0301', note: 'Acompte 30 % à la commande' },
                { date: '10/04/2026', montant: 2622, mode: 'Virement bancaire', reference: 'VIR-2026-0345', note: 'Solde à réception' }
            ],
            devisRef: { numero: 'DEV-2026-00015', version: 3 }
        },
        'FAC-2026-00004': {
            numero: 'FAC-2026-00004',
            statutEmission: 'emise',
            dateCreation: '01/05/2026',
            dateEmission: '01/05/2026',
            dateEcheance: '01/06/2026',
            clientSlug: 'boucherie-morel',
            clientSnapshot: devisCalc.snapshotClient('boucherie-morel'),
            companySnapshot: devisCalc.snapshotCompany(),
            lignes: [
                { designation: 'Kit de démarrage digital', description: 'Kit prêt à l\'emploi pour démarrer sa présence digitale.', quantite: 10, prixUnitaireHT: 129, tauxTVA: 20, remisePourcent: 5 }
            ],
            conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: '', fractionne: '', note: '' },
            paiements: [
                { date: '15/05/2026', montant: 300, mode: 'Chèque', reference: 'CHQ-778812', note: 'Premier versement' }
            ],
            devisRef: null
        },
        'FAC-2026-00005': {
            numero: 'FAC-2026-00005',
            statutEmission: 'annulee',
            dateCreation: '20/05/2026',
            dateEmission: '20/05/2026',
            dateEcheance: '19/06/2026',
            clientSlug: 'techni-bois-sarl',
            clientSnapshot: devisCalc.snapshotClient('techni-bois-sarl'),
            companySnapshot: devisCalc.snapshotCompany(),
            lignes: [
                { designation: 'Formation personnalisée', description: 'Session de formation individuelle adaptée aux besoins du client.', quantite: 2, prixUnitaireHT: 950, tauxTVA: 10, remisePourcent: 0 }
            ],
            conditionsPaiement: { delai: 'Paiement comptant', acompte: '', fractionne: '', note: '' },
            paiements: [],
            devisRef: null,
            noteAnnulation: 'Facture annulée suite à une erreur de saisie, avant tout paiement.'
        },
        'BROUILLON-JULIEN-PETIT': {
            numero: null,
            statutEmission: 'brouillon',
            dateCreation: '08/07/2026',
            dateEmission: null,
            dateEcheance: null,
            clientSlug: 'julien-petit',
            clientSnapshot: devisCalc.snapshotClient('julien-petit'),
            companySnapshot: devisCalc.snapshotCompany(),
            lignes: [
                { designation: 'Audit stratégique', description: 'Diagnostic complet de la situation de l\'entreprise et recommandations stratégiques.', quantite: 1, prixUnitaireHT: 750, tauxTVA: 20, remisePourcent: 0 }
            ],
            conditionsPaiement: { delai: '', acompte: '', fractionne: '', note: '' },
            paiements: [],
            devisRef: null
        }
    };

    window.COCKPIT_FACTURE_STATUSES = FACTURE_STATUSES;
    window.COCKPIT_PAYMENT_METHODS = PAYMENT_METHODS;
    window.COCKPIT_FACTURE_DETAILS = FACTURE_DETAILS;
    window.COCKPIT_FACTURE_CALC = {
        computePaiements: computePaiements,
        computeStatutAffiche: computeStatutAffiche,
        computeNextFactureNumero: computeNextFactureNumero,
        parseDate: parseFrDate
    };
})();

// Statistiques commerciales Facturation (V0.6.4)
// Un seul point de calcul (COCKPIT_FACTURATION_STATS.computeStats()),
// réutilisé par le dashboard et facturation.html, pour ne jamais dupliquer la
// logique d'exclusion des brouillons/factures annulées à plusieurs endroits.
// Règles : le CA facturé/encaissé ne compte que les factures Émises (jamais
// les brouillons, jamais les annulées, dont les paiements ne comptent pas non
// plus) ; le montant moyen devis exclut les devis dont la version active est
// un brouillon ; le taux de transformation ne considère que les devis
// décidés (Accepté ou Refusé), jamais les brouillons/envoyés encore en
// attente.

(function () {
    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var factureCalc = window.COCKPIT_FACTURE_CALC;

    function computeStats() {
        var DEVIS_DETAILS = window.COCKPIT_DEVIS_DETAILS || {};
        var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
        var CLIENT_DETAILS = window.COCKPIT_CLIENT_DETAILS || {};

        var caFacture = 0;
        var caEncaisse = 0;
        var facturesEnRetard = 0;
        var nombreFacturesEmises = 0;
        var topClientsMap = {};
        var prochainesEcheances = [];

        Object.keys(FACTURE_DETAILS).forEach(function (key) {
            var facture = FACTURE_DETAILS[key];
            if (facture.statutEmission !== 'emise') {
                return;
            }

            var totals = devisCalc.computeDevisTotals(facture.lignes);
            var paiementsInfo = factureCalc.computePaiements(facture.paiements, totals.totalTTC);
            var statutAffiche = factureCalc.computeStatutAffiche({
                statutEmission: facture.statutEmission,
                totalTTC: totals.totalTTC,
                paiements: facture.paiements,
                dateEcheance: facture.dateEcheance
            });

            caFacture = devisCalc.roundMoney(caFacture + totals.totalTTC);
            caEncaisse = devisCalc.roundMoney(caEncaisse + paiementsInfo.totalPaye);
            nombreFacturesEmises += 1;

            if (statutAffiche === 'en-retard') {
                facturesEnRetard += 1;
            }

            var clientKey = facture.clientSlug || key;
            var clientNom = (CLIENT_DETAILS[facture.clientSlug] || facture.clientSnapshot || {}).nom || clientKey;
            if (!topClientsMap[clientKey]) {
                topClientsMap[clientKey] = { slug: facture.clientSlug, nom: clientNom, montant: 0 };
            }
            topClientsMap[clientKey].montant = devisCalc.roundMoney(topClientsMap[clientKey].montant + totals.totalTTC);

            if (paiementsInfo.resteAPayer > 0 && facture.dateEcheance) {
                prochainesEcheances.push({
                    numero: facture.numero,
                    key: key,
                    clientNom: clientNom,
                    dateEcheance: facture.dateEcheance,
                    resteAPayer: paiementsInfo.resteAPayer
                });
            }
        });

        var resteAEncaisser = devisCalc.roundMoney(caFacture - caEncaisse);
        var panierMoyenFacture = nombreFacturesEmises ? devisCalc.roundMoney(caFacture / nombreFacturesEmises) : 0;

        var devisAcceptes = 0;
        var devisRefuses = 0;
        var devisEnvoyes = 0;
        var totalMontantDevisHorsBrouillon = 0;
        var nombreDevisHorsBrouillon = 0;

        Object.keys(DEVIS_DETAILS).forEach(function (numero) {
            var devis = DEVIS_DETAILS[numero];
            var activeVersion = devisCalc.getActiveVersion(devis);
            if (!activeVersion) {
                return;
            }
            if (activeVersion.statut === 'accepte') {
                devisAcceptes += 1;
            } else if (activeVersion.statut === 'refuse') {
                devisRefuses += 1;
            } else if (activeVersion.statut === 'envoye') {
                devisEnvoyes += 1;
            }
            if (activeVersion.statut !== 'brouillon') {
                var devisTotals = devisCalc.computeDevisTotals(activeVersion.lignes);
                totalMontantDevisHorsBrouillon = devisCalc.roundMoney(totalMontantDevisHorsBrouillon + devisTotals.totalTTC);
                nombreDevisHorsBrouillon += 1;
            }
        });

        var tauxTransformation = (devisAcceptes + devisRefuses) ? Math.round((devisAcceptes / (devisAcceptes + devisRefuses)) * 100) : 0;
        var montantMoyenDevis = nombreDevisHorsBrouillon ? devisCalc.roundMoney(totalMontantDevisHorsBrouillon / nombreDevisHorsBrouillon) : 0;

        var topClients = Object.keys(topClientsMap).map(function (key) {
            return topClientsMap[key];
        }).sort(function (a, b) {
            return b.montant - a.montant;
        }).slice(0, 3);

        prochainesEcheances.sort(function (a, b) {
            return (factureCalc.parseDate(a.dateEcheance) || 0) - (factureCalc.parseDate(b.dateEcheance) || 0);
        });
        prochainesEcheances = prochainesEcheances.slice(0, 3);

        return {
            caFacture: caFacture,
            caEncaisse: caEncaisse,
            resteAEncaisser: resteAEncaisser,
            facturesEnRetard: facturesEnRetard,
            nombreFacturesEmises: nombreFacturesEmises,
            panierMoyenFacture: panierMoyenFacture,
            devisAcceptes: devisAcceptes,
            devisRefuses: devisRefuses,
            devisEnvoyes: devisEnvoyes,
            tauxTransformation: tauxTransformation,
            montantMoyenDevis: montantMoyenDevis,
            topClients: topClients,
            prochainesEcheances: prochainesEcheances
        };
    }

    window.COCKPIT_FACTURATION_STATS = {
        computeStats: computeStats
    };
})();

// Page Fiche client : fiche CRM complète à partir de données statiques (V0.4.2)
// Le rendu (historique, rendez-vous, notes, documents & facturation) utilise
// CLIENT_DETAILS (ci-dessus) et, depuis la V0.6.4, DEVIS_DETAILS/
// FACTURE_DETAILS pour la section "Documents & facturation" (devis/factures
// réellement liés au client via clientSlug).

(function () {
    var HISTORY_TYPES = {
        'appel-sortant': { label: 'Appel sortant', badgeClass: 'badge-success' },
        'email-envoye': { label: 'E-mail envoyé', badgeClass: 'badge-info' },
        'email-recu': { label: 'E-mail reçu', badgeClass: 'badge-neutral' },
        'rdv-realise': { label: 'Rendez-vous réalisé', badgeClass: 'badge-success' },
        'relance': { label: 'Relance', badgeClass: 'badge-warning' },
        'commentaire-interne': { label: 'Commentaire interne', badgeClass: 'badge-neutral' }
    };

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

    function renderDocuments(documents, slug) {
        var body = document.getElementById('client-documents-body');
        if (!body) {
            return;
        }
        body.innerHTML = '';

        var devisCalc = window.COCKPIT_DEVIS_CALC;
        var factureCalc = window.COCKPIT_FACTURE_CALC;
        var DEVIS_DETAILS = window.COCKPIT_DEVIS_DETAILS || {};
        var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
        var DEVIS_STATUSES = window.COCKPIT_DEVIS_STATUSES || [];
        var FACTURE_STATUSES = window.COCKPIT_FACTURE_STATUSES || [];

        var rows = [];

        // Devis réellement liés à ce client (association sur la version active).
        Object.keys(DEVIS_DETAILS).forEach(function (numero) {
            var devis = DEVIS_DETAILS[numero];
            var activeVersion = devisCalc.getActiveVersion(devis);
            if (!activeVersion || activeVersion.clientSlug !== slug) {
                return;
            }
            var totals = devisCalc.computeDevisTotals(activeVersion.lignes);
            var statusInfo = DEVIS_STATUSES.filter(function (s) { return s.value === activeVersion.statut; })[0];
            rows.push({
                nom: numero + ' (v' + activeVersion.version + ')',
                type: 'Devis',
                date: activeVersion.dateCreation,
                statutLabel: statusInfo ? statusInfo.label : activeVersion.statut,
                badgeClass: statusInfo ? statusInfo.badgeClass : 'badge-neutral',
                montant: devisCalc.formatMoney(totals.totalTTC),
                reste: '—',
                editHref: 'devis-edition.html?devis=' + encodeURIComponent(numero) + '&version=' + activeVersion.version,
                docHref: 'devis-document.html?devis=' + encodeURIComponent(numero) + '&version=' + activeVersion.version
            });
        });

        // Factures réellement liées à ce client.
        Object.keys(FACTURE_DETAILS).forEach(function (key) {
            var facture = FACTURE_DETAILS[key];
            if (facture.clientSlug !== slug) {
                return;
            }
            var totals = devisCalc.computeDevisTotals(facture.lignes);
            var paiementsInfo = factureCalc.computePaiements(facture.paiements, totals.totalTTC);
            var statutAffiche = factureCalc.computeStatutAffiche({
                statutEmission: facture.statutEmission,
                totalTTC: totals.totalTTC,
                paiements: facture.paiements,
                dateEcheance: facture.dateEcheance
            });
            var statusInfo = FACTURE_STATUSES.filter(function (s) { return s.value === statutAffiche; })[0];
            rows.push({
                nom: facture.numero || 'Brouillon sans numéro',
                type: 'Facture',
                date: facture.dateEmission || facture.dateCreation,
                statutLabel: statusInfo ? statusInfo.label : statutAffiche,
                badgeClass: statusInfo ? statusInfo.badgeClass : 'badge-neutral',
                montant: devisCalc.formatMoney(totals.totalTTC),
                reste: facture.statutEmission === 'emise' ? devisCalc.formatMoney(paiementsInfo.resteAPayer) : '—',
                editHref: 'facture-edition.html?facture=' + encodeURIComponent(key),
                docHref: 'facture-document.html?facture=' + encodeURIComponent(key)
            });
        });

        // Anciennes entrées fictives non liées à la facturation (ex. Contrats) :
        // conservées telles quelles, hors périmètre de ce module.
        (documents || []).filter(function (doc) {
            return doc.type !== 'Devis' && doc.type !== 'Facture';
        }).forEach(function (doc) {
            rows.push({
                nom: doc.nom,
                type: doc.type,
                date: doc.date,
                statutLabel: doc.statut,
                badgeClass: doc.badgeClass,
                montant: '—',
                reste: '—',
                legacyDownload: true
            });
        });

        if (rows.length === 0) {
            var emptyRow = document.createElement('tr');
            var emptyCell = document.createElement('td');
            emptyCell.colSpan = 7;
            emptyCell.className = 'empty-state-inline';
            emptyCell.textContent = 'Aucun document pour ce client.';
            emptyRow.appendChild(emptyCell);
            body.appendChild(emptyRow);
            return;
        }

        rows.forEach(function (doc) {
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
            statutBadge.textContent = doc.statutLabel;
            statutCell.appendChild(statutBadge);

            var montantCell = document.createElement('td');
            montantCell.textContent = doc.montant;

            var resteCell = document.createElement('td');
            resteCell.textContent = doc.reste;

            var actionsCell = document.createElement('td');
            if (doc.legacyDownload) {
                var downloadLink = document.createElement('a');
                downloadLink.href = '#';
                downloadLink.className = 'pdf-download btn-wip';
                downloadLink.title = 'Télécharger le PDF';
                downloadLink.setAttribute('aria-label', 'Télécharger le PDF de ' + doc.nom);
                downloadLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span class="pdf-badge">PDF</span>';
                actionsCell.appendChild(downloadLink);
            } else {
                var viewLink = document.createElement('a');
                viewLink.href = doc.editHref;
                viewLink.className = 'btn-table-action';
                viewLink.textContent = 'Voir';
                actionsCell.appendChild(viewLink);

                var docLink = document.createElement('a');
                docLink.href = doc.docHref;
                docLink.className = 'table-action-secondary';
                docLink.textContent = 'Document';
                actionsCell.appendChild(docLink);
            }

            row.appendChild(nomCell);
            row.appendChild(typeCell);
            row.appendChild(dateCell);
            row.appendChild(statutCell);
            row.appendChild(montantCell);
            row.appendChild(resteCell);
            row.appendChild(actionsCell);
            body.appendChild(row);
        });
    }

    function renderClient(slug) {
        var client = (window.COCKPIT_CLIENT_DETAILS || {})[slug];
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
        renderDocuments(client.documents, slug);

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

// Page Facturation : statistiques commerciales (V0.6.4). Bloc simple et
// lisible au-dessus des onglets Devis/Factures, calculé depuis
// COCKPIT_FACTURATION_STATS.computeStats() — pas de graphique, uniquement du
// texte.

(function () {
    var summaryEl = document.getElementById('facturation-stats-summary');
    if (!summaryEl) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var stats = (window.COCKPIT_FACTURATION_STATS || {}).computeStats ? window.COCKPIT_FACTURATION_STATS.computeStats() : null;
    if (!stats || !devisCalc) {
        return;
    }

    function makeStatRow(label, value) {
        var row = document.createElement('div');
        row.className = 'devis-summary-row';
        var labelEl = document.createElement('span');
        labelEl.textContent = label;
        var valueEl = document.createElement('span');
        valueEl.textContent = value;
        row.appendChild(labelEl);
        row.appendChild(valueEl);
        return row;
    }

    summaryEl.appendChild(makeStatRow('CA facturé', devisCalc.formatMoney(stats.caFacture)));
    summaryEl.appendChild(makeStatRow('CA encaissé', devisCalc.formatMoney(stats.caEncaisse)));
    summaryEl.appendChild(makeStatRow('Reste à encaisser', devisCalc.formatMoney(stats.resteAEncaisser)));
    summaryEl.appendChild(makeStatRow('Taux de transformation', stats.tauxTransformation + ' %'));
    summaryEl.appendChild(makeStatRow('Panier moyen facture', devisCalc.formatMoney(stats.panierMoyenFacture)));
    summaryEl.appendChild(makeStatRow('Montant moyen devis', devisCalc.formatMoney(stats.montantMoyenDevis)));

    var topClientsEl = document.getElementById('facturation-top-clients');
    if (topClientsEl) {
        if (stats.topClients.length === 0) {
            topClientsEl.appendChild(makeStatRow('Aucune facture émise pour l\'instant', ''));
        } else {
            stats.topClients.forEach(function (client) {
                topClientsEl.appendChild(makeStatRow(client.nom, devisCalc.formatMoney(client.montant)));
            });
        }
    }

    var echeancesEl = document.getElementById('facturation-echeances');
    if (echeancesEl) {
        if (stats.prochainesEcheances.length === 0) {
            echeancesEl.appendChild(makeStatRow('Aucune échéance en attente', ''));
        } else {
            stats.prochainesEcheances.forEach(function (echeance) {
                echeancesEl.appendChild(makeStatRow(
                    echeance.numero + ' — ' + echeance.clientNom + ' (' + echeance.dateEcheance + ')',
                    devisCalc.formatMoney(echeance.resteAPayer)
                ));
            });
        }
    }
})();

// Page Facturation : bascule d'onglet Devis / Factures (V0.6.2). Affiche/
// masque simplement les deux panneaux ; chaque panneau garde sa propre
// recherche/filtre/pagination, initialisées plus bas.

(function () {
    var tabDevisBtn = document.getElementById('tab-devis-btn');
    var tabFacturesBtn = document.getElementById('tab-factures-btn');
    var devisPanel = document.getElementById('devis-panel');
    var facturesPanel = document.getElementById('factures-panel');

    if (!tabDevisBtn || !tabFacturesBtn) {
        return;
    }

    tabDevisBtn.addEventListener('click', function () {
        tabDevisBtn.classList.add('page-tab-active');
        tabFacturesBtn.classList.remove('page-tab-active');
        devisPanel.style.display = '';
        facturesPanel.style.display = 'none';
    });

    tabFacturesBtn.addEventListener('click', function () {
        tabFacturesBtn.classList.add('page-tab-active');
        tabDevisBtn.classList.remove('page-tab-active');
        facturesPanel.style.display = '';
        devisPanel.style.display = 'none';
    });
})();

// Page Facturation : liste des devis, recherche/filtre/pagination (V0.6.1)
// via COCKPIT_LIST_PAGINATION (V0.5.4). Les lignes du tableau sont écrites en
// dur dans facturation.html (comme pour Clients et Produits/Services) ; cette
// IIFE ne fait que peupler le filtre de statut et déléguer au helper commun.

(function () {
    var table = document.getElementById('devis-table');
    var searchInput = document.getElementById('devis-search');
    var statusFilter = document.getElementById('devis-status-filter');
    var resetButton = document.getElementById('devis-reset-filters');
    var counter = document.getElementById('devis-counter');
    var pageSizeSelect = document.getElementById('devis-page-size');
    var prevButton = document.getElementById('devis-prev-page');
    var nextButton = document.getElementById('devis-next-page');
    var pageIndicator = document.getElementById('devis-page-indicator');

    if (!table || !searchInput || !statusFilter || !counter || !pageSizeSelect) {
        return;
    }

    (window.COCKPIT_DEVIS_STATUSES || []).forEach(function (status) {
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
        labelSingular: 'devis',
        labelPlural: 'devis',
        labelEmpty: 'Aucun devis trouvé',
        matchRow: function (row, searchValue) {
            var matchesSearch = !searchValue || (row.dataset.search || '').indexOf(searchValue) !== -1;
            var matchesStatus = !statusFilter.value || row.dataset.status === statusFilter.value;
            return matchesSearch && matchesStatus;
        }
    });
})();

// Page Facturation : liste des factures, recherche/filtre/pagination
// (V0.6.2). Contrairement à la liste des devis (lignes écrites en dur dans le
// HTML), cette liste est générée dynamiquement depuis FACTURE_DETAILS : le
// statut affiché dépend d'un calcul (paiements + échéance), pas d'une simple
// valeur statique, donc le construire en JS évite tout risque d'incohérence
// entre le HTML et les données.

(function () {
    var tableBody = document.getElementById('factures-table-body');
    var table = document.getElementById('factures-table');
    var emptyEl = document.getElementById('factures-table-empty');
    var searchInput = document.getElementById('factures-search');
    var statusFilter = document.getElementById('factures-status-filter');
    var resetButton = document.getElementById('factures-reset-filters');
    var counter = document.getElementById('factures-counter');
    var pageSizeSelect = document.getElementById('factures-page-size');
    var prevButton = document.getElementById('factures-prev-page');
    var nextButton = document.getElementById('factures-next-page');
    var pageIndicator = document.getElementById('factures-page-indicator');

    if (!tableBody || !searchInput || !statusFilter || !counter || !pageSizeSelect) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var factureCalc = window.COCKPIT_FACTURE_CALC;
    var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
    var FACTURE_STATUSES = window.COCKPIT_FACTURE_STATUSES || [];
    var CLIENT_DETAILS = window.COCKPIT_CLIENT_DETAILS || {};

    FACTURE_STATUSES.forEach(function (status) {
        var option = document.createElement('option');
        option.value = status.value;
        option.textContent = status.label;
        statusFilter.appendChild(option);
    });

    function findStatusInfo(value) {
        return FACTURE_STATUSES.filter(function (status) {
            return status.value === value;
        })[0] || null;
    }

    if (Object.keys(FACTURE_DETAILS).length === 0) {
        table.style.display = 'none';
        emptyEl.style.display = '';
    } else {
        Object.keys(FACTURE_DETAILS).forEach(function (key) {
            var facture = FACTURE_DETAILS[key];
            var totals = devisCalc.computeDevisTotals(facture.lignes);
            var paiementsInfo = factureCalc.computePaiements(facture.paiements, totals.totalTTC);
            var statutAffiche = factureCalc.computeStatutAffiche({
                statutEmission: facture.statutEmission,
                totalTTC: totals.totalTTC,
                paiements: facture.paiements,
                dateEcheance: facture.dateEcheance
            });
            var statusInfo = findStatusInfo(statutAffiche);
            var client = CLIENT_DETAILS[facture.clientSlug] || facture.clientSnapshot || {};
            var numeroLabel = facture.numero || 'Brouillon sans numéro';

            var row = document.createElement('tr');
            row.dataset.status = statutAffiche;
            row.dataset.search = (numeroLabel + ' ' + (client.nom || '')).toLowerCase();

            var cellNumero = document.createElement('td');
            cellNumero.textContent = numeroLabel;
            row.appendChild(cellNumero);

            var cellClient = document.createElement('td');
            cellClient.textContent = client.nom || '—';
            row.appendChild(cellClient);

            var cellTTC = document.createElement('td');
            cellTTC.textContent = devisCalc.formatMoney(totals.totalTTC);
            row.appendChild(cellTTC);

            var cellReste = document.createElement('td');
            cellReste.textContent = facture.statutEmission === 'emise' ? devisCalc.formatMoney(paiementsInfo.resteAPayer) : '—';
            row.appendChild(cellReste);

            var cellStatut = document.createElement('td');
            var badge = document.createElement('span');
            badge.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');
            badge.textContent = statusInfo ? statusInfo.label : statutAffiche;
            cellStatut.appendChild(badge);
            row.appendChild(cellStatut);

            var cellEcheance = document.createElement('td');
            cellEcheance.textContent = facture.dateEcheance || '—';
            row.appendChild(cellEcheance);

            var cellActions = document.createElement('td');
            var link = document.createElement('a');
            link.className = 'btn-table-action';
            link.href = 'facture-edition.html?facture=' + encodeURIComponent(key);
            link.textContent = 'Voir la facture';
            cellActions.appendChild(link);
            row.appendChild(cellActions);

            tableBody.appendChild(row);
        });
    }

    var rows = Array.prototype.slice.call(tableBody.querySelectorAll('tr'));

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
        labelSingular: 'facture',
        labelPlural: 'factures',
        labelEmpty: 'Aucune facture trouvée',
        matchRow: function (row, searchValue) {
            var matchesSearch = !searchValue || (row.dataset.search || '').indexOf(searchValue) !== -1;
            var matchesStatus = !statusFilter.value || row.dataset.status === statusFilter.value;
            return matchesSearch && matchesStatus;
        }
    });
})();

// Page Paramètres entreprise (V0.6.1) : formulaire pré-rempli depuis
// COMPANY_SETTINGS. "Enregistrer" reste en Work in progress, comme partout
// ailleurs dans le projet : aucune persistance réelle.

(function () {
    var nameInput = document.getElementById('company-nom');
    if (!nameInput) {
        return;
    }

    var settings = window.COCKPIT_COMPANY_SETTINGS || {};

    var fields = {
        'company-nom': settings.nom,
        'company-adresse': settings.adresse,
        'company-telephone': settings.telephone,
        'company-email': settings.email,
        'company-site': settings.siteInternet,
        'company-siren': settings.siren,
        'company-siret': settings.siret,
        'company-tva': settings.tva,
        'company-iban': settings.iban,
        'company-bic': settings.bic
    };

    Object.keys(fields).forEach(function (id) {
        var input = document.getElementById(id);
        if (input) {
            input.value = fields[id] || '';
        }
    });

    var mentionsField = document.getElementById('company-mentions');
    if (mentionsField) {
        mentionsField.value = settings.mentionsLegales || '';
    }
})();

// Page Devis — édition (V0.6.1 + correctifs de revue) : consultation,
// création, duplication. Le menu "Enregistrer" (brouillon / version
// définitive) et "Supprimer" (après confirmation) déclenchent uniquement le
// pop-up Work in progress existant : aucune sauvegarde réelle, conformément
// au reste du projet. "Créer une nouvelle version" est en revanche réel mais
// uniquement en mémoire de page : il ouvre un brouillon éditable basé sur la
// dernière version, sans jamais modifier la version d'origine ni persister
// quoi que ce soit. Tout le reste est fonctionnel en direct (recherche
// client, lignes, calculs HT/TVA/TTC/remise, verrouillage, navigation entre
// versions fictives, conditions de paiement).
//
// Le client est toujours une référence vivante vers CLIENT_DETAILS le temps
// de la sélection, mais chaque version conserve un clientSnapshot figé : une
// fois affiché/enregistré (fictivement), il ne change plus si la fiche client
// évolue ensuite. Même logique pour companySnapshot vis-à-vis de
// COMPANY_SETTINGS. Les lignes issues du catalogue sont copiées une bonne
// fois pour toutes dans la ligne : une évolution ultérieure du catalogue ne
// modifie jamais un devis existant.

(function () {
    var contentEl = document.getElementById('devis-content');
    var notFoundEl = document.getElementById('devis-not-found');
    if (!contentEl) {
        return;
    }

    var calc = window.COCKPIT_DEVIS_CALC;
    var DEVIS_DETAILS = window.COCKPIT_DEVIS_DETAILS || {};
    var DEVIS_STATUSES = window.COCKPIT_DEVIS_STATUSES || [];

    var numeroHeadingEl = document.getElementById('devis-numero-heading');
    var versionTagEl = document.getElementById('devis-version-tag');
    var statusBadgeEl = document.getElementById('devis-status-badge');
    var metaEl = document.getElementById('devis-meta');
    var readonlyHintEl = document.getElementById('devis-readonly-hint');
    var versionSwitchEl = document.getElementById('devis-version-switch');
    var lockedBannerEl = document.getElementById('devis-locked-banner');
    var companyContentEl = document.getElementById('devis-company-content');
    var clientContentEl = document.getElementById('devis-client-content');
    var linesBodyEl = document.getElementById('devis-lines-body');
    var linesEmptyEl = document.getElementById('devis-lines-empty');
    var linesActionsEl = document.getElementById('devis-lines-actions');
    var addLineBtn = document.getElementById('devis-add-line-btn');
    var addCatalogBtn = document.getElementById('devis-add-catalog-btn');
    var summaryEl = document.getElementById('devis-summary');
    var paymentTermsEl = document.getElementById('devis-payment-terms');
    var saveMenuEl = document.getElementById('devis-save-menu');
    var saveBtn = document.getElementById('devis-save-btn');
    var saveDropdownEl = document.getElementById('devis-save-dropdown');
    var previewBtn = document.getElementById('devis-preview-btn');
    var previewUnavailableHintEl = document.getElementById('devis-preview-unavailable-hint');
    var duplicateBtn = document.getElementById('devis-duplicate-btn');
    var newVersionBtn = document.getElementById('devis-new-version-btn');
    var convertBtn = document.getElementById('devis-convert-btn');
    var factureRefEl = document.getElementById('devis-facture-ref');
    var deleteBtn = document.getElementById('devis-delete-btn');

    function findLinkedFactureKey() {
        var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
        return Object.keys(FACTURE_DETAILS).filter(function (key) {
            var f = FACTURE_DETAILS[key];
            return f.devisRef && f.devisRef.numero === state.numero && f.devisRef.version === state.version;
        })[0] || null;
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

    function findStatusInfo(value) {
        return DEVIS_STATUSES.filter(function (status) {
            return status.value === value;
        })[0] || null;
    }

    var nextLineId = 1;

    function makeLine(data) {
        return {
            id: nextLineId++,
            designation: data.designation || '',
            description: data.description || '',
            quantite: data.quantite !== undefined ? data.quantite : 1,
            prixUnitaireHT: data.prixUnitaireHT !== undefined ? data.prixUnitaireHT : 0,
            tauxTVA: data.tauxTVA !== undefined ? data.tauxTVA : 20,
            remisePourcent: data.remisePourcent !== undefined ? data.remisePourcent : 0
        };
    }

    function cloneLines(sourceLines) {
        return (sourceLines || []).map(makeLine);
    }

    function cloneConditionsPaiement(source) {
        return {
            delai: (source && source.delai) || '',
            acompte: (source && source.acompte) || '',
            fractionne: (source && source.fractionne) || '',
            note: (source && source.note) || ''
        };
    }

    var state = {
        mode: 'new',
        numero: null,
        version: 1,
        statut: 'brouillon',
        dateCreation: null,
        dateModification: null,
        clientSlug: null,
        clientSnapshot: null,
        companySnapshot: null,
        lines: [],
        conditionsPaiement: null,
        basedOnVersion: null,
        sourceDevis: null,
        viewingVersion: null,
        editable: true
    };

    function loadFromParams() {
        var params = new URLSearchParams(window.location.search);
        var devisParam = params.get('devis');
        var versionParam = params.get('version');
        var duplicateParam = params.get('duplicate');

        if (devisParam) {
            var devis = DEVIS_DETAILS[devisParam];
            if (!devis) {
                return false;
            }
            var versionNumber = versionParam ? parseInt(versionParam, 10) : devis.versionActive;
            var versionData = devis.versions.filter(function (v) {
                return v.version === versionNumber;
            })[0];
            if (!versionData) {
                return false;
            }

            state.mode = 'view';
            state.numero = devis.numero;
            state.version = versionData.version;
            state.statut = versionData.statut;
            state.dateCreation = versionData.dateCreation;
            state.dateModification = versionData.dateModification;
            state.clientSlug = versionData.clientSlug;
            state.clientSnapshot = versionData.clientSnapshot;
            state.companySnapshot = versionData.companySnapshot;
            state.lines = cloneLines(versionData.lignes);
            state.conditionsPaiement = cloneConditionsPaiement(versionData.conditionsPaiement);
            state.basedOnVersion = null;
            state.sourceDevis = devis;
            state.viewingVersion = versionData;
            state.editable = (versionData.version === devis.versionActive) && versionData.statut !== 'accepte';
            return true;
        }

        if (duplicateParam) {
            var sourceDevis = DEVIS_DETAILS[duplicateParam];
            if (!sourceDevis) {
                return false;
            }
            var dupVersionNumber = versionParam ? parseInt(versionParam, 10) : sourceDevis.versionActive;
            var dupVersionData = sourceDevis.versions.filter(function (v) {
                return v.version === dupVersionNumber;
            })[0] || calc.getActiveVersion(sourceDevis);

            state.mode = 'duplicate';
            state.numero = calc.computeNextDevisNumero(new Date().getFullYear());
            state.version = 1;
            state.statut = 'brouillon';
            state.dateCreation = null;
            state.dateModification = null;
            state.clientSlug = dupVersionData.clientSlug;
            state.clientSnapshot = dupVersionData.clientSlug ? calc.snapshotClient(dupVersionData.clientSlug) : null;
            state.companySnapshot = calc.snapshotCompany();
            state.lines = cloneLines(dupVersionData.lignes);
            state.conditionsPaiement = cloneConditionsPaiement(dupVersionData.conditionsPaiement);
            state.basedOnVersion = null;
            state.sourceDevis = null;
            state.viewingVersion = null;
            state.editable = true;
            return true;
        }

        state.mode = 'new';
        state.numero = calc.computeNextDevisNumero(new Date().getFullYear());
        state.version = 1;
        state.statut = 'brouillon';
        state.dateCreation = null;
        state.dateModification = null;
        state.clientSlug = null;
        state.clientSnapshot = null;
        state.companySnapshot = calc.snapshotCompany();
        state.lines = [];
        state.conditionsPaiement = cloneConditionsPaiement(null);
        state.basedOnVersion = null;
        state.sourceDevis = null;
        state.viewingVersion = null;
        state.editable = true;
        return true;
    }

    function renderHeader() {
        numeroHeadingEl.textContent = state.numero;
        versionTagEl.textContent = 'v' + state.version;

        var statusInfo = findStatusInfo(state.statut);
        statusBadgeEl.textContent = statusInfo ? statusInfo.label : state.statut;
        statusBadgeEl.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');

        if (state.mode === 'new-version') {
            metaEl.textContent = 'Nouvelle version v' + state.version + ' en préparation, basée sur la version v' + state.basedOnVersion + ' — non enregistrée.';
        } else if (state.mode !== 'view') {
            metaEl.textContent = state.mode === 'duplicate'
                ? 'Nouveau devis dupliqué, numéro attribué automatiquement à l\'enregistrement.'
                : 'Numéro attribué automatiquement à l\'enregistrement.';
        } else if (state.dateModification && state.dateModification !== state.dateCreation) {
            metaEl.textContent = 'Créé le ' + state.dateCreation + ' · Modifié le ' + state.dateModification;
        } else {
            metaEl.textContent = 'Créé le ' + state.dateCreation;
        }

        lockedBannerEl.style.display = (!state.editable && state.statut === 'accepte') ? '' : 'none';
        readonlyHintEl.style.display = (!state.editable && state.statut !== 'accepte') ? '' : 'none';

        var linkedFactureKey = state.mode === 'view' ? findLinkedFactureKey() : null;
        if (linkedFactureKey) {
            factureRefEl.innerHTML = '';
            factureRefEl.style.display = '';
            var link = document.createElement('a');
            link.href = 'facture-edition.html?facture=' + encodeURIComponent(linkedFactureKey);
            link.textContent = 'Facture associée : ' + (window.COCKPIT_FACTURE_DETAILS[linkedFactureKey].numero || linkedFactureKey);
            factureRefEl.appendChild(link);
        } else {
            factureRefEl.style.display = 'none';
        }
    }

    function renderVersionSwitch() {
        versionSwitchEl.innerHTML = '';
        if (!state.sourceDevis) {
            return;
        }
        var isDraft = state.mode === 'new-version';
        if (state.sourceDevis.versions.length <= 1 && !isDraft) {
            return;
        }
        state.sourceDevis.versions.forEach(function (v) {
            var pill = document.createElement('a');
            pill.className = 'version-pill' + (state.mode === 'view' && v.version === state.version ? ' version-pill-active' : '');
            pill.textContent = 'v' + v.version;
            pill.href = 'devis-edition.html?devis=' + encodeURIComponent(state.numero) + '&version=' + v.version;
            versionSwitchEl.appendChild(pill);
        });
        if (isDraft) {
            var draftPill = makeEl('span', 'version-pill version-pill-active version-pill-draft', 'v' + state.version + ' (brouillon, non enregistré)');
            versionSwitchEl.appendChild(draftPill);
        }
    }

    function renderCompanyParty() {
        var c = state.companySnapshot || {};
        companyContentEl.innerHTML = '';
        companyContentEl.appendChild(makeEl('p', 'document-party-name', c.nom || '—'));
        [c.adresse, c.telephone, c.email, c.siret ? ('SIRET ' + c.siret) : null, c.tva ? ('TVA ' + c.tva) : null].forEach(function (line) {
            if (line) {
                companyContentEl.appendChild(makeEl('p', null, line));
            }
        });
    }

    function renderClientInfoInto(container) {
        container.innerHTML = '';
        var c = state.clientSnapshot;
        if (!c) {
            container.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client sélectionné.'));
            return;
        }
        if (state.clientSlug) {
            var nameLink = document.createElement('a');
            nameLink.className = 'document-party-name document-party-name-link';
            nameLink.href = 'fiche-client.html?client=' + encodeURIComponent(state.clientSlug);
            nameLink.textContent = c.nom || '—';
            container.appendChild(nameLink);
        } else {
            container.appendChild(makeEl('p', 'document-party-name', c.nom || '—'));
        }
        [(c.entreprise && c.entreprise !== '—') ? c.entreprise : null, c.adresse, c.telephone, c.email].forEach(function (line) {
            if (line) {
                container.appendChild(makeEl('p', null, line));
            }
        });
    }

    var clientSearchOutsideClickHandler = null;

    function matchesClientQuery(client, query) {
        var haystack = [client.nom, client.entreprise, client.telephone, client.email, client.adresse]
            .filter(function (value) { return !!value; })
            .join(' ')
            .toLowerCase();
        return haystack.indexOf(query) !== -1;
    }

    function renderClientParty() {
        clientContentEl.innerHTML = '';

        if (clientSearchOutsideClickHandler) {
            document.removeEventListener('click', clientSearchOutsideClickHandler);
            clientSearchOutsideClickHandler = null;
        }

        if (!state.editable) {
            renderClientInfoInto(clientContentEl);
            return;
        }

        var clientDetails = window.COCKPIT_CLIENT_DETAILS || {};

        var searchWrap = document.createElement('div');
        searchWrap.className = 'client-search';

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'modal-input';
        searchInput.placeholder = 'Rechercher un client (nom, société, tél., e-mail, adresse)...';
        searchInput.setAttribute('aria-label', 'Rechercher un client');
        if (state.clientSlug && clientDetails[state.clientSlug]) {
            searchInput.value = clientDetails[state.clientSlug].nom;
        }

        var resultsEl = document.createElement('div');
        resultsEl.className = 'client-search-results';
        resultsEl.style.display = 'none';

        var infoWrap = document.createElement('div');
        infoWrap.style.marginTop = '10px';

        function renderResults() {
            var query = searchInput.value.trim().toLowerCase();
            resultsEl.innerHTML = '';
            if (!query) {
                resultsEl.style.display = 'none';
                return;
            }
            var matches = Object.keys(clientDetails).filter(function (slug) {
                return matchesClientQuery(clientDetails[slug], query);
            });
            if (matches.length === 0) {
                resultsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client trouvé.'));
            } else {
                matches.forEach(function (slug) {
                    var client = clientDetails[slug];
                    var item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'client-search-result-item';
                    var nameEl = makeEl('span', 'client-search-result-name', client.nom + (client.entreprise && client.entreprise !== '—' ? ' — ' + client.entreprise : ''));
                    var detailEl = makeEl('span', 'client-search-result-detail', [client.telephone, client.email, client.adresse].filter(function (v) { return !!v; }).join(' · '));
                    item.appendChild(nameEl);
                    item.appendChild(detailEl);
                    item.addEventListener('click', function () {
                        state.clientSlug = slug;
                        state.clientSnapshot = calc.snapshotClient(slug);
                        searchInput.value = client.nom;
                        resultsEl.innerHTML = '';
                        resultsEl.style.display = 'none';
                        renderClientInfoInto(infoWrap);
                    });
                    resultsEl.appendChild(item);
                });
            }
            resultsEl.style.display = '';
        }

        searchInput.addEventListener('input', renderResults);
        searchInput.addEventListener('focus', renderResults);

        clientSearchOutsideClickHandler = function (evt) {
            if (!searchWrap.contains(evt.target)) {
                resultsEl.style.display = 'none';
            }
        };
        document.addEventListener('click', clientSearchOutsideClickHandler);

        searchWrap.appendChild(searchInput);
        searchWrap.appendChild(resultsEl);

        clientContentEl.appendChild(searchWrap);
        clientContentEl.appendChild(infoWrap);
        renderClientInfoInto(infoWrap);
    }

    function makeInputCell(line, field, type) {
        var td = document.createElement('td');
        var input = document.createElement('input');
        input.type = type;
        if (type === 'number') {
            input.step = 'any';
            input.min = '0';
        }
        input.value = line[field];
        input.addEventListener('input', function () {
            line[field] = type === 'number' ? (parseFloat(input.value) || 0) : input.value;
            var row = input.closest('tr');
            var totalCell = row ? row.querySelector('.line-total-cell') : null;
            if (totalCell) {
                totalCell.textContent = calc.formatMoney(calc.computeLine(line).totalTTC);
            }
            renderSummary();
        });
        td.appendChild(input);
        return td;
    }

    function openDescriptionModal(line, inlineInput) {
        var body = document.createElement('div');
        var textarea = document.createElement('textarea');
        textarea.className = 'line-description-textarea';
        textarea.value = line.description;
        body.appendChild(textarea);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.setAttribute('data-modal-autofocus', 'true');
        saveButton.textContent = 'Valider';
        saveButton.addEventListener('click', function () {
            line.description = textarea.value;
            if (inlineInput) {
                inlineInput.value = textarea.value;
            }
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({
            title: 'Description de la ligne',
            body: body,
            footer: footer
        });
    }

    function makeDescriptionCell(line) {
        var td = document.createElement('td');
        var wrap = document.createElement('div');
        wrap.className = 'line-description-cell';

        var input = document.createElement('input');
        input.type = 'text';
        input.value = line.description;
        input.addEventListener('input', function () {
            line.description = input.value;
        });

        var expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.className = 'line-expand-btn';
        expandBtn.setAttribute('aria-label', 'Agrandir la description');
        expandBtn.title = 'Agrandir la description';
        expandBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>';
        expandBtn.addEventListener('click', function () {
            openDescriptionModal(line, input);
        });

        wrap.appendChild(input);
        wrap.appendChild(expandBtn);
        td.appendChild(wrap);
        return td;
    }

    function renderLines() {
        linesBodyEl.innerHTML = '';
        linesEmptyEl.style.display = state.lines.length === 0 ? '' : 'none';
        linesActionsEl.style.display = state.editable ? '' : 'none';

        state.lines.forEach(function (line) {
            var row = document.createElement('tr');

            if (state.editable) {
                row.appendChild(makeInputCell(line, 'designation', 'text'));
                row.appendChild(makeDescriptionCell(line));
                row.appendChild(makeInputCell(line, 'quantite', 'number'));
                row.appendChild(makeInputCell(line, 'prixUnitaireHT', 'number'));
                row.appendChild(makeInputCell(line, 'tauxTVA', 'number'));
                row.appendChild(makeInputCell(line, 'remisePourcent', 'number'));
            } else {
                [line.designation, line.description, line.quantite, calc.formatMoney(line.prixUnitaireHT), line.tauxTVA + ' %', line.remisePourcent + ' %'].forEach(function (value) {
                    row.appendChild(makeEl('td', null, String(value)));
                });
            }

            var totalCell = makeEl('td', 'line-total-cell', calc.formatMoney(calc.computeLine(line).totalTTC));
            row.appendChild(totalCell);

            var actionCell = document.createElement('td');
            if (state.editable) {
                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'line-remove-btn';
                removeBtn.setAttribute('aria-label', 'Supprimer la ligne');
                removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>';
                removeBtn.addEventListener('click', function () {
                    state.lines = state.lines.filter(function (l) {
                        return l.id !== line.id;
                    });
                    renderLines();
                    renderSummary();
                });
                actionCell.appendChild(removeBtn);
            }
            row.appendChild(actionCell);

            linesBodyEl.appendChild(row);
        });
    }

    function makeSummaryRow(label, value) {
        var row = document.createElement('div');
        row.className = 'devis-summary-row';
        row.appendChild(makeEl('span', null, label));
        row.appendChild(makeEl('span', null, value));
        return row;
    }

    function renderSummary() {
        var totals = calc.computeDevisTotals(state.lines);
        summaryEl.innerHTML = '';

        summaryEl.appendChild(makeSummaryRow('Total HT avant remise', calc.formatMoney(totals.totalBrutHT)));
        summaryEl.appendChild(makeSummaryRow('Remises', (totals.totalRemises > 0 ? '- ' : '') + calc.formatMoney(totals.totalRemises)));
        summaryEl.appendChild(makeSummaryRow('Total HT net', calc.formatMoney(totals.totalHT)));

        Object.keys(totals.tvaParTaux).sort(function (a, b) {
            return parseFloat(a) - parseFloat(b);
        }).forEach(function (rate) {
            summaryEl.appendChild(makeSummaryRow('TVA ' + rate + ' %', calc.formatMoney(totals.tvaParTaux[rate])));
        });

        summaryEl.appendChild(makeSummaryRow('Total TVA', calc.formatMoney(totals.totalTVA)));

        var ttcRow = makeSummaryRow('Total TTC', calc.formatMoney(totals.totalTTC));
        ttcRow.classList.add('devis-summary-row-total');
        summaryEl.appendChild(ttcRow);
    }

    function renderPaymentTerms() {
        paymentTermsEl.innerHTML = '';
        if (!state.conditionsPaiement) {
            state.conditionsPaiement = cloneConditionsPaiement(null);
        }
        var terms = state.conditionsPaiement;

        if (!state.editable) {
            var lines = [
                terms.delai ? ('Délai de paiement : ' + terms.delai) : null,
                terms.acompte ? ('Acompte : ' + terms.acompte) : null,
                terms.fractionne ? ('Paiement fractionné : ' + terms.fractionne) : null,
                terms.note ? ('Note : ' + terms.note) : null
            ].filter(function (line) { return !!line; });

            if (lines.length === 0) {
                paymentTermsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucune condition de paiement renseignée.'));
            } else {
                lines.forEach(function (line) {
                    paymentTermsEl.appendChild(makeEl('p', null, line));
                });
            }
            return;
        }

        function makeField(labelText, field, placeholder) {
            var wrap = document.createElement('div');
            var label = makeEl('label', 'modal-label', labelText);
            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'modal-input';
            input.value = terms[field];
            input.placeholder = placeholder;
            input.addEventListener('input', function () {
                terms[field] = input.value;
            });
            wrap.appendChild(label);
            wrap.appendChild(input);
            return wrap;
        }

        var grid = document.createElement('div');
        grid.className = 'form-grid-2';
        grid.appendChild(makeField('Délai de paiement', 'delai', 'Ex. Paiement à 30 jours'));
        grid.appendChild(makeField('Acompte demandé', 'acompte', 'Ex. Acompte de 30 % à la commande'));
        paymentTermsEl.appendChild(grid);

        paymentTermsEl.appendChild(makeField('Paiement en plusieurs fois', 'fractionne', 'Ex. Paiement en 3 fois'));

        var noteLabel = makeEl('label', 'modal-label', 'Modalités particulières / note libre');
        var noteTextarea = document.createElement('textarea');
        noteTextarea.className = 'modal-textarea';
        noteTextarea.rows = 3;
        noteTextarea.value = terms.note;
        noteTextarea.addEventListener('input', function () {
            terms.note = noteTextarea.value;
        });
        paymentTermsEl.appendChild(noteLabel);
        paymentTermsEl.appendChild(noteTextarea);
    }

    function renderActions() {
        saveMenuEl.style.display = state.editable ? '' : 'none';
        deleteBtn.style.display = (state.mode === 'view' && state.editable) ? '' : 'none';
        duplicateBtn.style.display = (state.mode === 'view') ? '' : 'none';
        newVersionBtn.style.display = (
            state.mode === 'view' &&
            !state.editable &&
            state.statut === 'accepte' &&
            state.sourceDevis &&
            state.viewingVersion.version === state.sourceDevis.versionActive
        ) ? '' : 'none';
        convertBtn.style.display = (
            state.mode === 'view' &&
            state.statut === 'accepte' &&
            !findLinkedFactureKey()
        ) ? '' : 'none';

        if (state.mode === 'view') {
            previewBtn.style.display = '';
            previewBtn.href = 'devis-document.html?devis=' + encodeURIComponent(state.numero) + '&version=' + state.version;
            previewUnavailableHintEl.style.display = 'none';
        } else {
            previewBtn.style.display = 'none';
            previewUnavailableHintEl.style.display = '';
        }
    }

    function matchesProductQuery(item, typeLabel, query) {
        var haystack = [item.nom, item.descriptionCourte, typeLabel, String(item.prixHT), item.statut]
            .filter(function (value) { return !!value; })
            .join(' ')
            .toLowerCase();
        return haystack.indexOf(query) !== -1;
    }

    function openAddFromCatalogModal() {
        var body = document.createElement('div');
        var productDetails = window.COCKPIT_PRODUCT_DETAILS || {};
        var productTypes = window.COCKPIT_PRODUCT_TYPES || [];

        var sellableSlugs = Object.keys(productDetails).filter(function (slug) {
            return productDetails[slug].statut === 'actif';
        });

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'modal-input catalog-search';
        searchInput.placeholder = 'Rechercher un produit ou service (nom, description, catégorie, prix)...';
        searchInput.setAttribute('aria-label', 'Rechercher dans le catalogue');
        searchInput.setAttribute('data-modal-autofocus', 'true');

        var list = document.createElement('div');
        list.className = 'modal-checkbox-list';

        function renderList() {
            var query = searchInput.value.trim().toLowerCase();
            list.innerHTML = '';

            if (sellableSlugs.length === 0) {
                list.appendChild(makeEl('p', 'empty-state-inline', 'Aucun produit ou service Actif dans le catalogue.'));
                return;
            }

            var matches = sellableSlugs.filter(function (slug) {
                var item = productDetails[slug];
                var typeInfo = productTypes.filter(function (t) { return t.value === item.type; })[0];
                return !query || matchesProductQuery(item, typeInfo ? typeInfo.label : item.type, query);
            });

            if (matches.length === 0) {
                list.appendChild(makeEl('p', 'empty-state-inline', 'Aucun résultat pour cette recherche.'));
                return;
            }

            matches.forEach(function (slug) {
                var item = productDetails[slug];
                var typeInfo = productTypes.filter(function (t) { return t.value === item.type; })[0];
                var option = document.createElement('button');
                option.type = 'button';
                option.className = 'catalog-picker-item';
                option.innerHTML = '<span class="catalog-picker-name">' + item.nom + '</span>' +
                    '<span class="badge ' + (typeInfo ? typeInfo.badgeClass : 'badge-neutral') + '">' + (typeInfo ? typeInfo.label : item.type) + '</span>' +
                    '<span class="catalog-picker-price">' + calc.formatMoney(item.prixHT) + ' HT</span>';
                option.addEventListener('click', function () {
                    state.lines.push(makeLine({
                        designation: item.nom,
                        description: item.descriptionCourte,
                        quantite: 1,
                        prixUnitaireHT: item.prixHT,
                        tauxTVA: item.tva,
                        remisePourcent: 0
                    }));
                    window.COCKPIT_MODAL.close();
                    renderLines();
                    renderSummary();
                });
                list.appendChild(option);
            });
        }

        searchInput.addEventListener('input', renderList);

        body.appendChild(searchInput);
        body.appendChild(list);
        renderList();

        window.COCKPIT_MODAL.open({
            title: 'Ajouter depuis le catalogue',
            body: body,
            footer: (function () {
                var cancelButton = document.createElement('button');
                cancelButton.type = 'button';
                cancelButton.className = 'btn-secondary';
                cancelButton.setAttribute('data-modal-close', 'true');
                cancelButton.textContent = 'Fermer';
                var fragment = document.createDocumentFragment();
                fragment.appendChild(cancelButton);
                return fragment;
            })()
        });
    }

    function openDeleteDevisModal() {
        var body = document.createElement('div');
        body.appendChild(makeEl('p', 'modal-text', 'Voulez-vous vraiment supprimer le devis ' + state.numero + ' ?'));
        body.appendChild(makeEl('p', 'modal-hint', 'Cette suppression ne sera pas encore enregistrée.'));

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.setAttribute('data-modal-autofocus', 'true');
        cancelButton.textContent = 'Annuler';

        var confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'btn-danger btn-wip';
        confirmButton.setAttribute('data-modal-close', 'true');
        confirmButton.textContent = 'Supprimer';

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        window.COCKPIT_MODAL.open({
            title: 'Supprimer ce devis ?',
            body: body,
            footer: footer
        });
    }

    function renderAll() {
        renderHeader();
        renderVersionSwitch();
        renderCompanyParty();
        renderClientParty();
        renderLines();
        renderSummary();
        renderPaymentTerms();
        renderActions();
    }

    if (!loadFromParams()) {
        notFoundEl.style.display = '';
        contentEl.style.display = 'none';
    } else {
        notFoundEl.style.display = 'none';
        contentEl.style.display = '';
        renderAll();

        addLineBtn.addEventListener('click', function () {
            state.lines.push(makeLine({}));
            renderLines();
            renderSummary();
        });

        addCatalogBtn.addEventListener('click', openAddFromCatalogModal);

        duplicateBtn.addEventListener('click', function () {
            if (state.mode !== 'view') {
                return;
            }
            window.location.href = 'devis-edition.html?duplicate=' + encodeURIComponent(state.numero) + '&version=' + state.version;
        });

        deleteBtn.addEventListener('click', openDeleteDevisModal);

        convertBtn.addEventListener('click', function () {
            if (state.mode !== 'view' || state.statut !== 'accepte') {
                return;
            }
            window.location.href = 'facture-edition.html?fromDevis=' + encodeURIComponent(state.numero) + '&version=' + state.version;
        });

        newVersionBtn.addEventListener('click', function () {
            if (state.mode !== 'view' || state.statut !== 'accepte' || !state.sourceDevis) {
                return;
            }
            var sourceDevisRef = state.sourceDevis;
            var basedOnVersion = state.viewingVersion;
            var maxVersion = sourceDevisRef.versions.reduce(function (m, v) {
                return Math.max(m, v.version);
            }, 0);

            state.mode = 'new-version';
            state.version = maxVersion + 1;
            state.statut = 'brouillon';
            state.dateCreation = null;
            state.dateModification = null;
            state.clientSlug = basedOnVersion.clientSlug;
            state.clientSnapshot = basedOnVersion.clientSlug ? calc.snapshotClient(basedOnVersion.clientSlug) : basedOnVersion.clientSnapshot;
            state.companySnapshot = calc.snapshotCompany();
            state.lines = cloneLines(basedOnVersion.lignes);
            state.conditionsPaiement = cloneConditionsPaiement(basedOnVersion.conditionsPaiement);
            state.basedOnVersion = basedOnVersion.version;
            state.viewingVersion = null;
            state.editable = true;

            renderAll();
        });

        function closeSaveMenu() {
            saveDropdownEl.style.display = 'none';
            saveBtn.setAttribute('aria-expanded', 'false');
        }

        saveBtn.addEventListener('click', function (evt) {
            evt.stopPropagation();
            var isOpen = saveDropdownEl.style.display !== 'none';
            if (isOpen) {
                closeSaveMenu();
            } else {
                saveDropdownEl.style.display = '';
                saveBtn.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', function (evt) {
            if (!saveMenuEl.contains(evt.target)) {
                closeSaveMenu();
            }
        });

        document.addEventListener('keydown', function (evt) {
            if (evt.key === 'Escape') {
                closeSaveMenu();
            }
        });

        Array.prototype.slice.call(saveDropdownEl.querySelectorAll('.save-menu-item')).forEach(function (item) {
            item.addEventListener('click', closeSaveMenu);
        });
    }
})();

// Page Facture — édition (V0.6.2) : consultation, création manuelle,
// conversion depuis un devis Accepté. Comportements de recherche client/
// catalogue et d'édition de description dupliqués depuis l'IIFE devis-edition
// (choix assumé pour cette version, voir docs/decisions.md — la
// factorisation est notée au backlog plutôt que faite maintenant, pour
// limiter le risque de régression sur les devis déjà validés).
//
// "Émettre la facture" et "Ajouter un paiement" sont des actions réelles en
// mémoire de page (aucune persistance, rien ne survit à un rechargement) :
// l'émission attribue le numéro officiel FAC-AAAA-00001, une date d'émission
// et une échéance, puis verrouille la facture (client, lignes, snapshots et
// conditions de paiement ne sont plus modifiables). Les paiements ne sont
// possibles que sur une facture émise, jamais sur un brouillon ni sur une
// facture annulée, et un paiement qui dépasserait le reste à payer est
// refusé. L'annulation d'une facture déjà émise n'est volontairement pas
// proposée dans cette version (les avoirs sont hors périmètre) : seul un
// brouillon peut être abandonné, en Work in progress.

(function () {
    var contentEl = document.getElementById('facture-content');
    var notFoundEl = document.getElementById('facture-not-found');
    if (!contentEl) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var factureCalc = window.COCKPIT_FACTURE_CALC;
    var DEVIS_DETAILS = window.COCKPIT_DEVIS_DETAILS || {};
    var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
    var FACTURE_STATUSES = window.COCKPIT_FACTURE_STATUSES || [];

    var numeroHeadingEl = document.getElementById('facture-numero-heading');
    var statusBadgeEl = document.getElementById('facture-status-badge');
    var metaEl = document.getElementById('facture-meta');
    var devisRefEl = document.getElementById('facture-devis-ref');
    var lockedBannerEl = document.getElementById('facture-locked-banner');
    var lockedMessageEl = document.getElementById('facture-locked-message');
    var companyContentEl = document.getElementById('facture-company-content');
    var clientContentEl = document.getElementById('facture-client-content');
    var linesBodyEl = document.getElementById('facture-lines-body');
    var linesEmptyEl = document.getElementById('facture-lines-empty');
    var linesActionsEl = document.getElementById('facture-lines-actions');
    var addLineBtn = document.getElementById('facture-add-line-btn');
    var addCatalogBtn = document.getElementById('facture-add-catalog-btn');
    var summaryEl = document.getElementById('facture-summary');
    var paymentTermsEl = document.getElementById('facture-payment-terms');
    var paymentsBodyEl = document.getElementById('facture-payments-body');
    var paymentsEmptyEl = document.getElementById('facture-payments-empty');
    var paymentsActionsEl = document.getElementById('facture-payments-actions');
    var paymentsSummaryEl = document.getElementById('facture-payments-summary');
    var paymentsHintEl = document.getElementById('facture-payments-hint');
    var addPaymentBtn = document.getElementById('facture-add-payment-btn');
    var emitBtn = document.getElementById('facture-emit-btn');
    var saveBtn = document.getElementById('facture-save-btn');
    var deleteBtn = document.getElementById('facture-delete-btn');
    var avoirHintEl = document.getElementById('facture-avoir-hint');
    var previewBtn = document.getElementById('facture-preview-btn');
    var previewUnavailableHintEl = document.getElementById('facture-preview-unavailable-hint');

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

    function findStatusInfo(value) {
        return FACTURE_STATUSES.filter(function (status) {
            return status.value === value;
        })[0] || null;
    }

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function formatDateFr(date) {
        return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + '/' + date.getFullYear();
    }

    function addDaysFr(dateStr, days) {
        var parsed = factureCalc.parseDate(dateStr) || new Date();
        var result = new Date(parsed.getTime());
        result.setDate(result.getDate() + days);
        return formatDateFr(result);
    }

    var nextLineId = 1;

    function makeLine(data) {
        return {
            id: nextLineId++,
            designation: data.designation || '',
            description: data.description || '',
            quantite: data.quantite !== undefined ? data.quantite : 1,
            prixUnitaireHT: data.prixUnitaireHT !== undefined ? data.prixUnitaireHT : 0,
            tauxTVA: data.tauxTVA !== undefined ? data.tauxTVA : 20,
            remisePourcent: data.remisePourcent !== undefined ? data.remisePourcent : 0
        };
    }

    function cloneLines(sourceLines) {
        return (sourceLines || []).map(makeLine);
    }

    function cloneConditionsPaiement(source) {
        return {
            delai: (source && source.delai) || '',
            acompte: (source && source.acompte) || '',
            fractionne: (source && source.fractionne) || '',
            note: (source && source.note) || ''
        };
    }

    function clonePaiements(source) {
        return (source || []).map(function (p) {
            return { date: p.date, montant: p.montant, mode: p.mode, reference: p.reference, note: p.note };
        });
    }

    var state = {
        mode: 'new',
        key: null,
        numero: null,
        statutEmission: 'brouillon',
        dateCreation: null,
        dateEmission: null,
        dateEcheance: null,
        clientSlug: null,
        clientSnapshot: null,
        companySnapshot: null,
        lines: [],
        conditionsPaiement: null,
        paiements: [],
        devisRef: null,
        editable: true
    };

    function loadFromParams() {
        var params = new URLSearchParams(window.location.search);
        var factureParam = params.get('facture');
        var fromDevisParam = params.get('fromDevis');
        var versionParam = params.get('version');

        if (factureParam) {
            var facture = FACTURE_DETAILS[factureParam];
            if (!facture) {
                return false;
            }
            state.mode = 'view';
            state.key = factureParam;
            state.numero = facture.numero;
            state.statutEmission = facture.statutEmission;
            state.dateCreation = facture.dateCreation;
            state.dateEmission = facture.dateEmission;
            state.dateEcheance = facture.dateEcheance;
            state.clientSlug = facture.clientSlug;
            state.clientSnapshot = facture.clientSnapshot;
            state.companySnapshot = facture.companySnapshot;
            state.lines = cloneLines(facture.lignes);
            state.conditionsPaiement = cloneConditionsPaiement(facture.conditionsPaiement);
            state.paiements = clonePaiements(facture.paiements);
            state.devisRef = facture.devisRef;
            state.editable = facture.statutEmission === 'brouillon';
            return true;
        }

        if (fromDevisParam) {
            var devis = DEVIS_DETAILS[fromDevisParam];
            if (!devis) {
                return false;
            }
            var versionNumber = versionParam ? parseInt(versionParam, 10) : devis.versionActive;
            var versionData = devis.versions.filter(function (v) {
                return v.version === versionNumber;
            })[0];
            if (!versionData || versionData.statut !== 'accepte') {
                return false;
            }

            state.mode = 'new';
            state.key = null;
            state.numero = null;
            state.statutEmission = 'brouillon';
            state.dateCreation = formatDateFr(new Date());
            state.dateEmission = null;
            state.dateEcheance = null;
            state.clientSlug = versionData.clientSlug;
            state.clientSnapshot = versionData.clientSnapshot;
            state.companySnapshot = versionData.companySnapshot;
            state.lines = cloneLines(versionData.lignes);
            state.conditionsPaiement = cloneConditionsPaiement(versionData.conditionsPaiement);
            state.paiements = [];
            state.devisRef = { numero: devis.numero, version: versionData.version };
            state.editable = true;
            return true;
        }

        state.mode = 'new';
        state.key = null;
        state.numero = null;
        state.statutEmission = 'brouillon';
        state.dateCreation = formatDateFr(new Date());
        state.dateEmission = null;
        state.dateEcheance = null;
        state.clientSlug = null;
        state.clientSnapshot = null;
        state.companySnapshot = devisCalc.snapshotCompany();
        state.lines = [];
        state.conditionsPaiement = cloneConditionsPaiement(null);
        state.paiements = [];
        state.devisRef = null;
        state.editable = true;
        return true;
    }

    function currentTotalTTC() {
        return devisCalc.computeDevisTotals(state.lines).totalTTC;
    }

    function currentStatutAffiche() {
        return factureCalc.computeStatutAffiche({
            statutEmission: state.statutEmission,
            totalTTC: currentTotalTTC(),
            paiements: state.paiements,
            dateEcheance: state.dateEcheance
        });
    }

    function renderHeader() {
        numeroHeadingEl.textContent = state.numero || 'Brouillon sans numéro';

        var statutAffiche = currentStatutAffiche();
        var statusInfo = findStatusInfo(statutAffiche);
        statusBadgeEl.textContent = statusInfo ? statusInfo.label : statutAffiche;
        statusBadgeEl.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');

        if (state.mode === 'new') {
            metaEl.textContent = 'Numéro attribué automatiquement à l\'émission.';
        } else if (state.statutEmission === 'brouillon') {
            metaEl.textContent = 'Créé le ' + state.dateCreation + ' — non encore émise.';
        } else {
            metaEl.textContent = 'Émise le ' + state.dateEmission + ' · Échéance le ' + state.dateEcheance;
        }

        if (state.devisRef) {
            devisRefEl.innerHTML = '';
            devisRefEl.style.display = '';
            var link = document.createElement('a');
            link.href = 'devis-edition.html?devis=' + encodeURIComponent(state.devisRef.numero) + '&version=' + state.devisRef.version;
            link.textContent = 'Devis source : ' + state.devisRef.numero + ' (v' + state.devisRef.version + ')';
            devisRefEl.appendChild(link);
        } else {
            devisRefEl.style.display = 'none';
        }

        lockedBannerEl.style.display = !state.editable ? '' : 'none';
        if (state.statutEmission === 'annulee') {
            lockedMessageEl.innerHTML = '<strong>Facture annulée.</strong> Cette facture ne peut plus être modifiée.';
        } else {
            lockedMessageEl.innerHTML = '<strong>Facture verrouillée.</strong> Cette facture a été émise et ne peut plus être modifiée.';
        }

        avoirHintEl.style.display = (state.statutEmission === 'emise') ? '' : 'none';
    }

    function renderCompanyParty() {
        var c = state.companySnapshot || {};
        companyContentEl.innerHTML = '';
        companyContentEl.appendChild(makeEl('p', 'document-party-name', c.nom || '—'));
        [c.adresse, c.telephone, c.email, c.siret ? ('SIRET ' + c.siret) : null, c.tva ? ('TVA ' + c.tva) : null].forEach(function (line) {
            if (line) {
                companyContentEl.appendChild(makeEl('p', null, line));
            }
        });
    }

    function renderClientInfoInto(container) {
        container.innerHTML = '';
        var c = state.clientSnapshot;
        if (!c) {
            container.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client sélectionné.'));
            return;
        }
        if (state.clientSlug) {
            var nameLink = document.createElement('a');
            nameLink.className = 'document-party-name document-party-name-link';
            nameLink.href = 'fiche-client.html?client=' + encodeURIComponent(state.clientSlug);
            nameLink.textContent = c.nom || '—';
            container.appendChild(nameLink);
        } else {
            container.appendChild(makeEl('p', 'document-party-name', c.nom || '—'));
        }
        [(c.entreprise && c.entreprise !== '—') ? c.entreprise : null, c.adresse, c.telephone, c.email].forEach(function (line) {
            if (line) {
                container.appendChild(makeEl('p', null, line));
            }
        });
    }

    var clientSearchOutsideClickHandler = null;

    function matchesClientQuery(client, query) {
        var haystack = [client.nom, client.entreprise, client.telephone, client.email, client.adresse]
            .filter(function (value) { return !!value; })
            .join(' ')
            .toLowerCase();
        return haystack.indexOf(query) !== -1;
    }

    function renderClientParty() {
        clientContentEl.innerHTML = '';

        if (clientSearchOutsideClickHandler) {
            document.removeEventListener('click', clientSearchOutsideClickHandler);
            clientSearchOutsideClickHandler = null;
        }

        if (!state.editable) {
            renderClientInfoInto(clientContentEl);
            return;
        }

        var clientDetails = window.COCKPIT_CLIENT_DETAILS || {};

        var searchWrap = document.createElement('div');
        searchWrap.className = 'client-search';

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'modal-input';
        searchInput.placeholder = 'Rechercher un client (nom, société, tél., e-mail, adresse)...';
        searchInput.setAttribute('aria-label', 'Rechercher un client');
        if (state.clientSlug && clientDetails[state.clientSlug]) {
            searchInput.value = clientDetails[state.clientSlug].nom;
        }

        var resultsEl = document.createElement('div');
        resultsEl.className = 'client-search-results';
        resultsEl.style.display = 'none';

        var infoWrap = document.createElement('div');
        infoWrap.style.marginTop = '10px';

        function renderResults() {
            var query = searchInput.value.trim().toLowerCase();
            resultsEl.innerHTML = '';
            if (!query) {
                resultsEl.style.display = 'none';
                return;
            }
            var matches = Object.keys(clientDetails).filter(function (slug) {
                return matchesClientQuery(clientDetails[slug], query);
            });
            if (matches.length === 0) {
                resultsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client trouvé.'));
            } else {
                matches.forEach(function (slug) {
                    var client = clientDetails[slug];
                    var item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'client-search-result-item';
                    var nameEl = makeEl('span', 'client-search-result-name', client.nom + (client.entreprise && client.entreprise !== '—' ? ' — ' + client.entreprise : ''));
                    var detailEl = makeEl('span', 'client-search-result-detail', [client.telephone, client.email, client.adresse].filter(function (v) { return !!v; }).join(' · '));
                    item.appendChild(nameEl);
                    item.appendChild(detailEl);
                    item.addEventListener('click', function () {
                        state.clientSlug = slug;
                        state.clientSnapshot = devisCalc.snapshotClient(slug);
                        searchInput.value = client.nom;
                        resultsEl.innerHTML = '';
                        resultsEl.style.display = 'none';
                        renderClientInfoInto(infoWrap);
                    });
                    resultsEl.appendChild(item);
                });
            }
            resultsEl.style.display = '';
        }

        searchInput.addEventListener('input', renderResults);
        searchInput.addEventListener('focus', renderResults);

        clientSearchOutsideClickHandler = function (evt) {
            if (!searchWrap.contains(evt.target)) {
                resultsEl.style.display = 'none';
            }
        };
        document.addEventListener('click', clientSearchOutsideClickHandler);

        searchWrap.appendChild(searchInput);
        searchWrap.appendChild(resultsEl);

        clientContentEl.appendChild(searchWrap);
        clientContentEl.appendChild(infoWrap);
        renderClientInfoInto(infoWrap);
    }

    function makeInputCell(line, field, type) {
        var td = document.createElement('td');
        var input = document.createElement('input');
        input.type = type;
        if (type === 'number') {
            input.step = 'any';
            input.min = '0';
        }
        input.value = line[field];
        input.addEventListener('input', function () {
            line[field] = type === 'number' ? (parseFloat(input.value) || 0) : input.value;
            var row = input.closest('tr');
            var totalCell = row ? row.querySelector('.line-total-cell') : null;
            if (totalCell) {
                totalCell.textContent = devisCalc.formatMoney(devisCalc.computeLine(line).totalTTC);
            }
            renderSummary();
        });
        td.appendChild(input);
        return td;
    }

    function openDescriptionModal(line, inlineInput) {
        var body = document.createElement('div');
        var textarea = document.createElement('textarea');
        textarea.className = 'line-description-textarea';
        textarea.value = line.description;
        body.appendChild(textarea);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.setAttribute('data-modal-autofocus', 'true');
        saveButton.textContent = 'Valider';
        saveButton.addEventListener('click', function () {
            line.description = textarea.value;
            if (inlineInput) {
                inlineInput.value = textarea.value;
            }
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({
            title: 'Description de la ligne',
            body: body,
            footer: footer
        });
    }

    function makeDescriptionCell(line) {
        var td = document.createElement('td');
        var wrap = document.createElement('div');
        wrap.className = 'line-description-cell';

        var input = document.createElement('input');
        input.type = 'text';
        input.value = line.description;
        input.addEventListener('input', function () {
            line.description = input.value;
        });

        var expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.className = 'line-expand-btn';
        expandBtn.setAttribute('aria-label', 'Agrandir la description');
        expandBtn.title = 'Agrandir la description';
        expandBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>';
        expandBtn.addEventListener('click', function () {
            openDescriptionModal(line, input);
        });

        wrap.appendChild(input);
        wrap.appendChild(expandBtn);
        td.appendChild(wrap);
        return td;
    }

    function renderLines() {
        linesBodyEl.innerHTML = '';
        linesEmptyEl.style.display = state.lines.length === 0 ? '' : 'none';
        linesActionsEl.style.display = state.editable ? '' : 'none';

        state.lines.forEach(function (line) {
            var row = document.createElement('tr');

            if (state.editable) {
                row.appendChild(makeInputCell(line, 'designation', 'text'));
                row.appendChild(makeDescriptionCell(line));
                row.appendChild(makeInputCell(line, 'quantite', 'number'));
                row.appendChild(makeInputCell(line, 'prixUnitaireHT', 'number'));
                row.appendChild(makeInputCell(line, 'tauxTVA', 'number'));
                row.appendChild(makeInputCell(line, 'remisePourcent', 'number'));
            } else {
                [line.designation, line.description, line.quantite, devisCalc.formatMoney(line.prixUnitaireHT), line.tauxTVA + ' %', line.remisePourcent + ' %'].forEach(function (value) {
                    row.appendChild(makeEl('td', null, String(value)));
                });
            }

            var totalCell = makeEl('td', 'line-total-cell', devisCalc.formatMoney(devisCalc.computeLine(line).totalTTC));
            row.appendChild(totalCell);

            var actionCell = document.createElement('td');
            if (state.editable) {
                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'line-remove-btn';
                removeBtn.setAttribute('aria-label', 'Supprimer la ligne');
                removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg>';
                removeBtn.addEventListener('click', function () {
                    state.lines = state.lines.filter(function (l) {
                        return l.id !== line.id;
                    });
                    renderLines();
                    renderSummary();
                });
                actionCell.appendChild(removeBtn);
            }
            row.appendChild(actionCell);

            linesBodyEl.appendChild(row);
        });
    }

    function makeSummaryRow(label, value) {
        var row = document.createElement('div');
        row.className = 'devis-summary-row';
        row.appendChild(makeEl('span', null, label));
        row.appendChild(makeEl('span', null, value));
        return row;
    }

    function renderSummary() {
        var totals = devisCalc.computeDevisTotals(state.lines);
        summaryEl.innerHTML = '';

        summaryEl.appendChild(makeSummaryRow('Total HT avant remise', devisCalc.formatMoney(totals.totalBrutHT)));
        summaryEl.appendChild(makeSummaryRow('Remises', (totals.totalRemises > 0 ? '- ' : '') + devisCalc.formatMoney(totals.totalRemises)));
        summaryEl.appendChild(makeSummaryRow('Total HT net', devisCalc.formatMoney(totals.totalHT)));

        Object.keys(totals.tvaParTaux).sort(function (a, b) {
            return parseFloat(a) - parseFloat(b);
        }).forEach(function (rate) {
            summaryEl.appendChild(makeSummaryRow('TVA ' + rate + ' %', devisCalc.formatMoney(totals.tvaParTaux[rate])));
        });

        summaryEl.appendChild(makeSummaryRow('Total TVA', devisCalc.formatMoney(totals.totalTVA)));

        var ttcRow = makeSummaryRow('Total TTC', devisCalc.formatMoney(totals.totalTTC));
        ttcRow.classList.add('devis-summary-row-total');
        summaryEl.appendChild(ttcRow);

        renderPayments();
        renderHeader();
    }

    function renderPaymentTerms() {
        paymentTermsEl.innerHTML = '';
        if (!state.conditionsPaiement) {
            state.conditionsPaiement = cloneConditionsPaiement(null);
        }
        var terms = state.conditionsPaiement;

        if (!state.editable) {
            var lines = [
                terms.delai ? ('Délai de paiement : ' + terms.delai) : null,
                terms.acompte ? ('Acompte : ' + terms.acompte) : null,
                terms.fractionne ? ('Paiement fractionné : ' + terms.fractionne) : null,
                terms.note ? ('Note : ' + terms.note) : null
            ].filter(function (line) { return !!line; });

            if (lines.length === 0) {
                paymentTermsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucune condition de paiement renseignée.'));
            } else {
                lines.forEach(function (line) {
                    paymentTermsEl.appendChild(makeEl('p', null, line));
                });
            }
            return;
        }

        function makeField(labelText, field, placeholder) {
            var wrap = document.createElement('div');
            var label = makeEl('label', 'modal-label', labelText);
            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'modal-input';
            input.value = terms[field];
            input.placeholder = placeholder;
            input.addEventListener('input', function () {
                terms[field] = input.value;
            });
            wrap.appendChild(label);
            wrap.appendChild(input);
            return wrap;
        }

        var grid = document.createElement('div');
        grid.className = 'form-grid-2';
        grid.appendChild(makeField('Délai de paiement', 'delai', 'Ex. Paiement à 30 jours'));
        grid.appendChild(makeField('Acompte demandé', 'acompte', 'Ex. Acompte de 30 % à la commande'));
        paymentTermsEl.appendChild(grid);

        paymentTermsEl.appendChild(makeField('Paiement en plusieurs fois', 'fractionne', 'Ex. Paiement en 3 fois'));

        var noteLabel = makeEl('label', 'modal-label', 'Modalités particulières / note libre');
        var noteTextarea = document.createElement('textarea');
        noteTextarea.className = 'modal-textarea';
        noteTextarea.rows = 3;
        noteTextarea.value = terms.note;
        noteTextarea.addEventListener('input', function () {
            terms.note = noteTextarea.value;
        });
        paymentTermsEl.appendChild(noteLabel);
        paymentTermsEl.appendChild(noteTextarea);
    }

    function renderPayments() {
        var totals = devisCalc.computeDevisTotals(state.lines);
        var paiementsInfo = factureCalc.computePaiements(state.paiements, totals.totalTTC);

        paymentsBodyEl.innerHTML = '';
        paymentsEmptyEl.style.display = state.paiements.length === 0 ? '' : 'none';

        state.paiements.forEach(function (paiement) {
            var row = document.createElement('tr');
            row.appendChild(makeEl('td', null, paiement.date));
            row.appendChild(makeEl('td', null, devisCalc.formatMoney(paiement.montant)));
            row.appendChild(makeEl('td', null, paiement.mode));
            row.appendChild(makeEl('td', null, paiement.reference || '—'));
            row.appendChild(makeEl('td', null, paiement.note || '—'));
            paymentsBodyEl.appendChild(row);
        });

        paymentsSummaryEl.innerHTML = '';
        if (state.statutEmission === 'emise') {
            paymentsSummaryEl.appendChild(makeSummaryRow('Total payé', devisCalc.formatMoney(paiementsInfo.totalPaye)));
            var resteRow = makeSummaryRow('Reste à payer', devisCalc.formatMoney(paiementsInfo.resteAPayer));
            resteRow.classList.add('devis-summary-row-total');
            paymentsSummaryEl.appendChild(resteRow);
            paymentsSummaryEl.appendChild(makeSummaryRow('Pourcentage payé', paiementsInfo.pourcentagePaye + ' %'));
        }

        var canAddPayment = state.statutEmission === 'emise';
        paymentsActionsEl.style.display = canAddPayment ? '' : 'none';
        if (canAddPayment) {
            paymentsHintEl.style.display = 'none';
        } else {
            paymentsHintEl.style.display = '';
            paymentsHintEl.textContent = state.statutEmission === 'brouillon'
                ? 'Les paiements ne peuvent être ajoutés qu\'après émission de la facture.'
                : 'Cette facture est annulée : aucun paiement ne peut y être ajouté.';
        }
    }

    function renderActions() {
        emitBtn.style.display = state.statutEmission === 'brouillon' ? '' : 'none';
        saveBtn.style.display = state.statutEmission === 'brouillon' ? '' : 'none';
        deleteBtn.style.display = state.statutEmission === 'brouillon' ? '' : 'none';

        if (state.mode === 'view') {
            previewBtn.style.display = '';
            previewBtn.href = 'facture-document.html?facture=' + encodeURIComponent(state.key);
            previewUnavailableHintEl.style.display = 'none';
        } else {
            previewBtn.style.display = 'none';
            previewUnavailableHintEl.style.display = '';
        }
    }

    function openAddFromCatalogModal() {
        var body = document.createElement('div');
        var productDetails = window.COCKPIT_PRODUCT_DETAILS || {};
        var productTypes = window.COCKPIT_PRODUCT_TYPES || [];

        var sellableSlugs = Object.keys(productDetails).filter(function (slug) {
            return productDetails[slug].statut === 'actif';
        });

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'modal-input catalog-search';
        searchInput.placeholder = 'Rechercher un produit ou service (nom, description, catégorie, prix)...';
        searchInput.setAttribute('aria-label', 'Rechercher dans le catalogue');
        searchInput.setAttribute('data-modal-autofocus', 'true');

        var list = document.createElement('div');
        list.className = 'modal-checkbox-list';

        function matchesProductQuery(item, typeLabel, query) {
            var haystack = [item.nom, item.descriptionCourte, typeLabel, String(item.prixHT), item.statut]
                .filter(function (value) { return !!value; })
                .join(' ')
                .toLowerCase();
            return haystack.indexOf(query) !== -1;
        }

        function renderList() {
            var query = searchInput.value.trim().toLowerCase();
            list.innerHTML = '';

            if (sellableSlugs.length === 0) {
                list.appendChild(makeEl('p', 'empty-state-inline', 'Aucun produit ou service Actif dans le catalogue.'));
                return;
            }

            var matches = sellableSlugs.filter(function (slug) {
                var item = productDetails[slug];
                var typeInfo = productTypes.filter(function (t) { return t.value === item.type; })[0];
                return !query || matchesProductQuery(item, typeInfo ? typeInfo.label : item.type, query);
            });

            if (matches.length === 0) {
                list.appendChild(makeEl('p', 'empty-state-inline', 'Aucun résultat pour cette recherche.'));
                return;
            }

            matches.forEach(function (slug) {
                var item = productDetails[slug];
                var typeInfo = productTypes.filter(function (t) { return t.value === item.type; })[0];
                var option = document.createElement('button');
                option.type = 'button';
                option.className = 'catalog-picker-item';
                option.innerHTML = '<span class="catalog-picker-name">' + item.nom + '</span>' +
                    '<span class="badge ' + (typeInfo ? typeInfo.badgeClass : 'badge-neutral') + '">' + (typeInfo ? typeInfo.label : item.type) + '</span>' +
                    '<span class="catalog-picker-price">' + devisCalc.formatMoney(item.prixHT) + ' HT</span>';
                option.addEventListener('click', function () {
                    state.lines.push(makeLine({
                        designation: item.nom,
                        description: item.descriptionCourte,
                        quantite: 1,
                        prixUnitaireHT: item.prixHT,
                        tauxTVA: item.tva,
                        remisePourcent: 0
                    }));
                    window.COCKPIT_MODAL.close();
                    renderLines();
                    renderSummary();
                });
                list.appendChild(option);
            });
        }

        searchInput.addEventListener('input', renderList);

        body.appendChild(searchInput);
        body.appendChild(list);
        renderList();

        window.COCKPIT_MODAL.open({
            title: 'Ajouter depuis le catalogue',
            body: body,
            footer: (function () {
                var cancelButton = document.createElement('button');
                cancelButton.type = 'button';
                cancelButton.className = 'btn-secondary';
                cancelButton.setAttribute('data-modal-close', 'true');
                cancelButton.textContent = 'Fermer';
                var fragment = document.createDocumentFragment();
                fragment.appendChild(cancelButton);
                return fragment;
            })()
        });
    }

    function openAddPaymentModal() {
        var body = document.createElement('div');
        var errorEl = makeEl('p', 'modal-hint', '');
        errorEl.style.color = 'var(--color-danger)';
        errorEl.style.display = 'none';

        var dateInput = document.createElement('input');
        dateInput.type = 'text';
        dateInput.className = 'modal-input';
        dateInput.value = formatDateFr(new Date());
        dateInput.setAttribute('data-modal-autofocus', 'true');

        var montantInput = document.createElement('input');
        montantInput.type = 'number';
        montantInput.step = 'any';
        montantInput.min = '0';
        montantInput.className = 'modal-input';

        var modeSelect = document.createElement('select');
        modeSelect.className = 'modal-select';
        (window.COCKPIT_PAYMENT_METHODS || []).forEach(function (method) {
            var option = document.createElement('option');
            option.value = method;
            option.textContent = method;
            modeSelect.appendChild(option);
        });

        var referenceInput = document.createElement('input');
        referenceInput.type = 'text';
        referenceInput.className = 'modal-input';

        var noteInput = document.createElement('textarea');
        noteInput.className = 'modal-textarea';
        noteInput.rows = 2;

        [
            ['Date', dateInput],
            ['Montant', montantInput],
            ['Mode de paiement', modeSelect],
            ['Référence', referenceInput],
            ['Note (facultatif)', noteInput]
        ].forEach(function (pair) {
            body.appendChild(makeEl('label', 'modal-label', pair[0]));
            body.appendChild(pair[1]);
        });
        body.appendChild(errorEl);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'btn-primary';
        confirmButton.textContent = 'Ajouter le paiement';
        confirmButton.addEventListener('click', function () {
            var montant = parseFloat(montantInput.value) || 0;
            var totals = devisCalc.computeDevisTotals(state.lines);
            var paiementsInfo = factureCalc.computePaiements(state.paiements, totals.totalTTC);

            if (montant <= 0) {
                errorEl.textContent = 'Merci de saisir un montant supérieur à 0.';
                errorEl.style.display = '';
                return;
            }
            if (montant > paiementsInfo.resteAPayer + 0.001) {
                errorEl.textContent = 'Ce montant dépasse le reste à payer (' + devisCalc.formatMoney(paiementsInfo.resteAPayer) + ').';
                errorEl.style.display = '';
                return;
            }

            state.paiements.push({
                date: dateInput.value,
                montant: montant,
                mode: modeSelect.value,
                reference: referenceInput.value,
                note: noteInput.value
            });
            window.COCKPIT_MODAL.close();
            renderPayments();
            renderHeader();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        window.COCKPIT_MODAL.open({
            title: 'Ajouter un paiement',
            body: body,
            footer: footer
        });
    }

    function renderAll() {
        renderHeader();
        renderCompanyParty();
        renderClientParty();
        renderLines();
        renderSummary();
        renderPaymentTerms();
        renderActions();
    }

    if (!loadFromParams()) {
        notFoundEl.style.display = '';
        contentEl.style.display = 'none';
    } else {
        notFoundEl.style.display = 'none';
        contentEl.style.display = '';
        renderAll();

        addLineBtn.addEventListener('click', function () {
            state.lines.push(makeLine({}));
            renderLines();
            renderSummary();
        });

        addCatalogBtn.addEventListener('click', openAddFromCatalogModal);

        addPaymentBtn.addEventListener('click', openAddPaymentModal);

        emitBtn.addEventListener('click', function () {
            if (state.statutEmission !== 'brouillon') {
                return;
            }
            var joursEcheance = {
                'Paiement comptant': 0,
                'Paiement à réception': 0,
                'Paiement à 15 jours': 15,
                'Paiement à 30 jours': 30
            };
            var jours = state.conditionsPaiement && joursEcheance[state.conditionsPaiement.delai] !== undefined
                ? joursEcheance[state.conditionsPaiement.delai]
                : 30;

            state.numero = factureCalc.computeNextFactureNumero(new Date().getFullYear());
            state.statutEmission = 'emise';
            state.dateEmission = formatDateFr(new Date());
            state.dateEcheance = addDaysFr(state.dateEmission, jours);
            state.editable = false;

            renderAll();
        });
    }
})();

// Page Document devis (V0.6.3) : rendu imprimable en lecture seule d'un
// devis existant (?devis=NUMERO&version=N). Réutilise exactement les mêmes
// données et fonctions de calcul que l'éditeur (COCKPIT_DEVIS_DETAILS /
// COCKPIT_DEVIS_CALC), sans aucun recalcul indépendant. Le bouton "Imprimer /
// Enregistrer en PDF" se contente d'appeler window.print() : aucune
// bibliothèque PDF, le navigateur propose nativement "Enregistrer en PDF"
// comme destination d'impression (voir css/print.css pour la mise en page
// d'impression). Disponible uniquement pour un devis déjà présent dans les
// données (y compris un brouillon fictif ou une ancienne version) : un devis
// en cours de frappe non enregistré n'a pas de page document (pas de
// mécanisme de stockage temporaire, conformément à l'absence de persistance
// du projet).

(function () {
    var contentEl = document.getElementById('devis-doc-content');
    var notFoundEl = document.getElementById('devis-doc-not-found');
    if (!contentEl) {
        return;
    }

    var calc = window.COCKPIT_DEVIS_CALC;
    var DEVIS_DETAILS = window.COCKPIT_DEVIS_DETAILS || {};
    var DEVIS_STATUSES = window.COCKPIT_DEVIS_STATUSES || [];

    var backLink = document.getElementById('devis-doc-back-link');
    var printBtn = document.getElementById('devis-doc-print-btn');
    var bannerEl = document.getElementById('devis-doc-banner');
    var numeroEl = document.getElementById('devis-doc-numero');
    var versionTagEl = document.getElementById('devis-doc-version-tag');
    var statusBadgeEl = document.getElementById('devis-doc-status-badge');
    var metaEl = document.getElementById('devis-doc-meta');
    var companyEl = document.getElementById('devis-doc-company');
    var clientEl = document.getElementById('devis-doc-client');
    var linesBodyEl = document.getElementById('devis-doc-lines-body');
    var summaryEl = document.getElementById('devis-doc-summary');
    var paymentTermsEl = document.getElementById('devis-doc-payment-terms');
    var legalEl = document.getElementById('devis-doc-legal');
    var companySignatureEl = document.getElementById('devis-doc-company-signature');

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

    function findStatusInfo(value) {
        return DEVIS_STATUSES.filter(function (status) {
            return status.value === value;
        })[0] || null;
    }

    function addBanner(html) {
        var banner = document.createElement('div');
        banner.className = 'construction-banner';
        var icon = document.createElement('span');
        icon.className = 'construction-banner-icon';
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
        var p = document.createElement('p');
        p.innerHTML = html;
        banner.appendChild(icon);
        banner.appendChild(p);
        bannerEl.appendChild(banner);
    }

    var params = new URLSearchParams(window.location.search);
    var devisParam = params.get('devis');
    var versionParam = params.get('version');

    var devis = devisParam ? DEVIS_DETAILS[devisParam] : null;
    var versionNumber = versionParam ? parseInt(versionParam, 10) : (devis ? devis.versionActive : null);
    var versionData = devis ? devis.versions.filter(function (v) {
        return v.version === versionNumber;
    })[0] : null;

    if (!devis || !versionData) {
        notFoundEl.style.display = '';
        contentEl.style.display = 'none';
        return;
    }

    notFoundEl.style.display = 'none';
    contentEl.style.display = '';

    backLink.href = 'devis-edition.html?devis=' + encodeURIComponent(devis.numero) + '&version=' + versionData.version;
    printBtn.addEventListener('click', function () {
        window.print();
    });

    if (versionData.statut === 'brouillon') {
        addBanner('<strong>Brouillon.</strong> Ce document est un brouillon, non contractuel.');
    }
    if (versionData.version !== devis.versionActive) {
        addBanner('<strong>Version historique.</strong> Cette version n\'est plus la version active du devis.');
    }

    numeroEl.textContent = devis.numero;
    versionTagEl.textContent = 'v' + versionData.version;
    var statusInfo = findStatusInfo(versionData.statut);
    statusBadgeEl.textContent = statusInfo ? statusInfo.label : versionData.statut;
    statusBadgeEl.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');
    metaEl.textContent = 'Créé le ' + versionData.dateCreation +
        (versionData.dateModification && versionData.dateModification !== versionData.dateCreation ? ' · Modifié le ' + versionData.dateModification : '');

    var c = versionData.companySnapshot || {};
    companyEl.appendChild(makeEl('p', 'document-party-name', c.nom || '—'));
    [c.adresse, c.telephone, c.email, c.siret ? ('SIRET ' + c.siret) : null, c.tva ? ('TVA ' + c.tva) : null].forEach(function (line) {
        if (line) {
            companyEl.appendChild(makeEl('p', null, line));
        }
    });
    companySignatureEl.appendChild(makeEl('p', null, c.nom || ''));

    var cl = versionData.clientSnapshot;
    if (!cl) {
        clientEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client renseigné.'));
    } else {
        if (versionData.clientSlug) {
            var clientNameLink = document.createElement('a');
            clientNameLink.className = 'document-party-name document-party-name-link';
            clientNameLink.href = 'fiche-client.html?client=' + encodeURIComponent(versionData.clientSlug);
            clientNameLink.textContent = cl.nom || '—';
            clientEl.appendChild(clientNameLink);
        } else {
            clientEl.appendChild(makeEl('p', 'document-party-name', cl.nom || '—'));
        }
        [(cl.entreprise && cl.entreprise !== '—') ? cl.entreprise : null, cl.adresse, cl.telephone, cl.email].forEach(function (line) {
            if (line) {
                clientEl.appendChild(makeEl('p', null, line));
            }
        });
    }

    versionData.lignes.forEach(function (line) {
        var row = document.createElement('tr');
        [line.designation, line.description, line.quantite, calc.formatMoney(line.prixUnitaireHT), line.tauxTVA + ' %', line.remisePourcent + ' %'].forEach(function (value) {
            row.appendChild(makeEl('td', null, String(value)));
        });
        row.appendChild(makeEl('td', 'line-total-cell', calc.formatMoney(calc.computeLine(line).totalTTC)));
        linesBodyEl.appendChild(row);
    });

    function makeSummaryRow(label, value) {
        var row = document.createElement('div');
        row.className = 'devis-summary-row';
        row.appendChild(makeEl('span', null, label));
        row.appendChild(makeEl('span', null, value));
        return row;
    }

    var totals = calc.computeDevisTotals(versionData.lignes);
    summaryEl.appendChild(makeSummaryRow('Total HT avant remise', calc.formatMoney(totals.totalBrutHT)));
    summaryEl.appendChild(makeSummaryRow('Remises', (totals.totalRemises > 0 ? '- ' : '') + calc.formatMoney(totals.totalRemises)));
    summaryEl.appendChild(makeSummaryRow('Total HT net', calc.formatMoney(totals.totalHT)));
    Object.keys(totals.tvaParTaux).sort(function (a, b) {
        return parseFloat(a) - parseFloat(b);
    }).forEach(function (rate) {
        summaryEl.appendChild(makeSummaryRow('TVA ' + rate + ' %', calc.formatMoney(totals.tvaParTaux[rate])));
    });
    summaryEl.appendChild(makeSummaryRow('Total TVA', calc.formatMoney(totals.totalTVA)));
    var ttcRow = makeSummaryRow('Total TTC', calc.formatMoney(totals.totalTTC));
    ttcRow.classList.add('devis-summary-row-total');
    summaryEl.appendChild(ttcRow);

    var terms = versionData.conditionsPaiement || {};
    var termLines = [
        terms.delai ? ('Délai de paiement : ' + terms.delai) : null,
        terms.acompte ? ('Acompte : ' + terms.acompte) : null,
        terms.fractionne ? ('Paiement fractionné : ' + terms.fractionne) : null,
        terms.note ? ('Note : ' + terms.note) : null
    ].filter(function (line) { return !!line; });
    if (termLines.length === 0) {
        paymentTermsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucune condition de paiement renseignée.'));
    } else {
        termLines.forEach(function (line) {
            paymentTermsEl.appendChild(makeEl('p', null, line));
        });
    }

    var companySettings = window.COCKPIT_COMPANY_SETTINGS || {};
    legalEl.textContent = companySettings.mentionsLegales || '';
})();

// Page Document facture (V0.6.3) : rendu imprimable en lecture seule d'une
// facture existante (?facture=KEY). Même principe que le document devis :
// aucun recalcul indépendant, réutilise COCKPIT_FACTURE_DETAILS/
// COCKPIT_FACTURE_CALC/COCKPIT_DEVIS_CALC, disponible uniquement pour une
// facture déjà présente dans les données (y compris le brouillon fictif),
// jamais pour une facture en cours de frappe non enregistrée.

(function () {
    var contentEl = document.getElementById('facture-doc-content');
    var notFoundEl = document.getElementById('facture-doc-not-found');
    if (!contentEl) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var factureCalc = window.COCKPIT_FACTURE_CALC;
    var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
    var FACTURE_STATUSES = window.COCKPIT_FACTURE_STATUSES || [];

    var backLink = document.getElementById('facture-doc-back-link');
    var printBtn = document.getElementById('facture-doc-print-btn');
    var bannerEl = document.getElementById('facture-doc-banner');
    var numeroEl = document.getElementById('facture-doc-numero');
    var statusBadgeEl = document.getElementById('facture-doc-status-badge');
    var metaEl = document.getElementById('facture-doc-meta');
    var devisRefEl = document.getElementById('facture-doc-devis-ref');
    var companyEl = document.getElementById('facture-doc-company');
    var clientEl = document.getElementById('facture-doc-client');
    var linesBodyEl = document.getElementById('facture-doc-lines-body');
    var summaryEl = document.getElementById('facture-doc-summary');
    var paymentTermsEl = document.getElementById('facture-doc-payment-terms');
    var paymentsSectionEl = document.getElementById('facture-doc-payments-section');
    var paymentsBodyEl = document.getElementById('facture-doc-payments-body');
    var paymentsEmptyEl = document.getElementById('facture-doc-payments-empty');
    var paymentsSummaryEl = document.getElementById('facture-doc-payments-summary');
    var legalEl = document.getElementById('facture-doc-legal');

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

    function findStatusInfo(value) {
        return FACTURE_STATUSES.filter(function (status) {
            return status.value === value;
        })[0] || null;
    }

    function addBanner(html) {
        var banner = document.createElement('div');
        banner.className = 'construction-banner';
        var icon = document.createElement('span');
        icon.className = 'construction-banner-icon';
        icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
        var p = document.createElement('p');
        p.innerHTML = html;
        banner.appendChild(icon);
        banner.appendChild(p);
        bannerEl.appendChild(banner);
    }

    function makeSummaryRow(label, value) {
        var row = document.createElement('div');
        row.className = 'devis-summary-row';
        row.appendChild(makeEl('span', null, label));
        row.appendChild(makeEl('span', null, value));
        return row;
    }

    var params = new URLSearchParams(window.location.search);
    var factureParam = params.get('facture');
    var facture = factureParam ? FACTURE_DETAILS[factureParam] : null;

    if (!facture) {
        notFoundEl.style.display = '';
        contentEl.style.display = 'none';
        return;
    }

    notFoundEl.style.display = 'none';
    contentEl.style.display = '';

    backLink.href = 'facture-edition.html?facture=' + encodeURIComponent(factureParam);
    printBtn.addEventListener('click', function () {
        window.print();
    });

    if (facture.statutEmission === 'brouillon') {
        addBanner('<strong>Brouillon.</strong> Ce document est un aperçu de brouillon, non une facture officielle.');
    }
    if (facture.statutEmission === 'annulee') {
        addBanner('<strong>Facture annulée.</strong> Ce document n\'a plus de valeur commerciale.');
    }

    numeroEl.textContent = facture.numero || 'Brouillon sans numéro';

    var totals = devisCalc.computeDevisTotals(facture.lignes);
    var statutAffiche = factureCalc.computeStatutAffiche({
        statutEmission: facture.statutEmission,
        totalTTC: totals.totalTTC,
        paiements: facture.paiements,
        dateEcheance: facture.dateEcheance
    });
    var statusInfo = findStatusInfo(statutAffiche);
    statusBadgeEl.textContent = statusInfo ? statusInfo.label : statutAffiche;
    statusBadgeEl.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');

    if (facture.statutEmission === 'brouillon') {
        metaEl.textContent = 'Créé le ' + facture.dateCreation + ' — non encore émise.';
    } else {
        metaEl.textContent = 'Émise le ' + facture.dateEmission + ' · Échéance le ' + facture.dateEcheance;
    }

    if (facture.devisRef) {
        devisRefEl.style.display = '';
        var link = document.createElement('a');
        link.href = 'devis-document.html?devis=' + encodeURIComponent(facture.devisRef.numero) + '&version=' + facture.devisRef.version;
        link.textContent = 'Devis source : ' + facture.devisRef.numero + ' (v' + facture.devisRef.version + ')';
        devisRefEl.appendChild(link);
    }

    var c = facture.companySnapshot || {};
    companyEl.appendChild(makeEl('p', 'document-party-name', c.nom || '—'));
    [c.adresse, c.telephone, c.email, c.siret ? ('SIRET ' + c.siret) : null, c.tva ? ('TVA ' + c.tva) : null].forEach(function (line) {
        if (line) {
            companyEl.appendChild(makeEl('p', null, line));
        }
    });

    var cl = facture.clientSnapshot;
    if (!cl) {
        clientEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client renseigné.'));
    } else {
        if (facture.clientSlug) {
            var clientNameLink = document.createElement('a');
            clientNameLink.className = 'document-party-name document-party-name-link';
            clientNameLink.href = 'fiche-client.html?client=' + encodeURIComponent(facture.clientSlug);
            clientNameLink.textContent = cl.nom || '—';
            clientEl.appendChild(clientNameLink);
        } else {
            clientEl.appendChild(makeEl('p', 'document-party-name', cl.nom || '—'));
        }
        [(cl.entreprise && cl.entreprise !== '—') ? cl.entreprise : null, cl.adresse, cl.telephone, cl.email].forEach(function (line) {
            if (line) {
                clientEl.appendChild(makeEl('p', null, line));
            }
        });
    }

    facture.lignes.forEach(function (line) {
        var row = document.createElement('tr');
        [line.designation, line.description, line.quantite, devisCalc.formatMoney(line.prixUnitaireHT), line.tauxTVA + ' %', line.remisePourcent + ' %'].forEach(function (value) {
            row.appendChild(makeEl('td', null, String(value)));
        });
        row.appendChild(makeEl('td', 'line-total-cell', devisCalc.formatMoney(devisCalc.computeLine(line).totalTTC)));
        linesBodyEl.appendChild(row);
    });

    summaryEl.appendChild(makeSummaryRow('Total HT avant remise', devisCalc.formatMoney(totals.totalBrutHT)));
    summaryEl.appendChild(makeSummaryRow('Remises', (totals.totalRemises > 0 ? '- ' : '') + devisCalc.formatMoney(totals.totalRemises)));
    summaryEl.appendChild(makeSummaryRow('Total HT net', devisCalc.formatMoney(totals.totalHT)));
    Object.keys(totals.tvaParTaux).sort(function (a, b) {
        return parseFloat(a) - parseFloat(b);
    }).forEach(function (rate) {
        summaryEl.appendChild(makeSummaryRow('TVA ' + rate + ' %', devisCalc.formatMoney(totals.tvaParTaux[rate])));
    });
    summaryEl.appendChild(makeSummaryRow('Total TVA', devisCalc.formatMoney(totals.totalTVA)));
    var ttcRow = makeSummaryRow('Total TTC', devisCalc.formatMoney(totals.totalTTC));
    ttcRow.classList.add('devis-summary-row-total');
    summaryEl.appendChild(ttcRow);

    var terms = facture.conditionsPaiement || {};
    var termLines = [
        terms.delai ? ('Délai de paiement : ' + terms.delai) : null,
        terms.acompte ? ('Acompte : ' + terms.acompte) : null,
        terms.fractionne ? ('Paiement fractionné : ' + terms.fractionne) : null,
        terms.note ? ('Note : ' + terms.note) : null
    ].filter(function (line) { return !!line; });
    if (termLines.length === 0) {
        paymentTermsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucune condition de paiement renseignée.'));
    } else {
        termLines.forEach(function (line) {
            paymentTermsEl.appendChild(makeEl('p', null, line));
        });
    }

    if (facture.statutEmission !== 'brouillon') {
        paymentsSectionEl.style.display = '';
        paymentsEmptyEl.style.display = (facture.paiements || []).length === 0 ? '' : 'none';

        (facture.paiements || []).forEach(function (paiement) {
            var row = document.createElement('tr');
            row.appendChild(makeEl('td', null, paiement.date));
            row.appendChild(makeEl('td', null, devisCalc.formatMoney(paiement.montant)));
            row.appendChild(makeEl('td', null, paiement.mode));
            row.appendChild(makeEl('td', null, paiement.reference || '—'));
            row.appendChild(makeEl('td', null, paiement.note || '—'));
            paymentsBodyEl.appendChild(row);
        });

        if (facture.statutEmission === 'emise') {
            var paiementsInfo = factureCalc.computePaiements(facture.paiements, totals.totalTTC);
            paymentsSummaryEl.appendChild(makeSummaryRow('Total payé', devisCalc.formatMoney(paiementsInfo.totalPaye)));
            var resteRow = makeSummaryRow('Reste à payer', devisCalc.formatMoney(paiementsInfo.resteAPayer));
            resteRow.classList.add('devis-summary-row-total');
            paymentsSummaryEl.appendChild(resteRow);
            paymentsSummaryEl.appendChild(makeSummaryRow('Pourcentage payé', paiementsInfo.pourcentagePaye + ' %'));
        }
    }

    var companySettings = window.COCKPIT_COMPANY_SETTINGS || {};
    legalEl.textContent = companySettings.mentionsLegales || '';
})();

// Page Tableau de bord : bloc "Aperçu Facturation" (V0.6.4). Liste compacte
// et en lecture seule, calculée depuis COCKPIT_FACTURATION_STATS.computeStats() —
// volontairement pas une nouvelle grosse carte KPI, pour ne pas empiéter sur
// les futurs modules Trésorerie/Finance (V0.7/V0.9) ni refondre le tableau
// de bord existant. La carte favorite "Devis envoyés", jusqu'ici statique,
// devient réelle au passage.

(function () {
    var statsEl = document.getElementById('dashboard-facturation-stats');
    if (!statsEl) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var stats = (window.COCKPIT_FACTURATION_STATS || {}).computeStats ? window.COCKPIT_FACTURATION_STATS.computeStats() : null;
    if (!stats || !devisCalc) {
        return;
    }

    function makeStatRow(label, value) {
        var row = document.createElement('div');
        row.className = 'devis-summary-row';
        var labelEl = document.createElement('span');
        labelEl.textContent = label;
        var valueEl = document.createElement('span');
        valueEl.textContent = value;
        row.appendChild(labelEl);
        row.appendChild(valueEl);
        return row;
    }

    statsEl.appendChild(makeStatRow('Facturé', devisCalc.formatMoney(stats.caFacture)));
    statsEl.appendChild(makeStatRow('Encaissé', devisCalc.formatMoney(stats.caEncaisse)));
    statsEl.appendChild(makeStatRow('Reste à encaisser', devisCalc.formatMoney(stats.resteAEncaisser)));
    statsEl.appendChild(makeStatRow('Factures en retard', String(stats.facturesEnRetard)));
    statsEl.appendChild(makeStatRow('Devis en attente', String(stats.devisEnvoyes)));
    var tauxRow = makeStatRow('Taux de transformation', stats.tauxTransformation + ' %');
    tauxRow.classList.add('devis-summary-row-total');
    statsEl.appendChild(tauxRow);

    var devisEnvoyesValueEl = document.getElementById('dashboard-devis-envoyes-value');
    if (devisEnvoyesValueEl) {
        devisEnvoyesValueEl.textContent = String(stats.devisEnvoyes);
    }
})();
