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
                    conditionsPaiement: { delai: 'Paiement à réception', acompte: '', fractionne: '', note: '' },
                    rdvRef: { id: 'rdv-0001' }
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
                    conditionsPaiement: { delai: 'Paiement à 30 jours', acompte: 'Acompte de 30 % à la commande (site vitrine)', fractionne: 'Paiement en 3 fois pour la maintenance', note: 'Facturation de la maintenance mensuelle en 3 échéances trimestrielles.' },
                    rdvRef: { id: 'rdv-0004' }
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

// Données Agenda commercial (V0.7)
// Un rendez-vous (RDV_DETAILS) porte l'identité, une section "Préparation
// commerciale" (contexte, proposition, prix cible/mini, arguments,
// objections, prochaines étapes), un suivi "Communication client" et un
// historique des changements importants. Positionné après les blocs
// Devis/Factures car la création du devis brouillon lié à un RDV a besoin de
// COCKPIT_DEVIS_CALC et COCKPIT_FACTURE_DETAILS (vérification qu'un devis n'a
// jamais été converti en facture avant d'autoriser sa suppression).
//
// Règle centrale validée : un rendez-vous commercial est associé à un devis
// brouillon (auto-créé). Ce devis brouillon ne peut être supprimé que s'il
// est encore à statut brouillon, en une seule version, et jamais converti en
// facture — sinon aucune suppression n'est proposée, pour ne jamais ouvrir de
// suppression générale des devis dans l'application.
(function () {
    var RDV_STATUSES = [
        { value: 'prevu', label: 'Prévu', badgeClass: 'badge-neutral' },
        { value: 'confirme', label: 'Confirmé', badgeClass: 'badge-info' },
        { value: 'reporte', label: 'Reporté', badgeClass: 'badge-warning' },
        { value: 'realise', label: 'Réalisé', badgeClass: 'badge-success' },
        { value: 'annule', label: 'Annulé', badgeClass: 'badge-danger' },
        { value: 'sans_suite', label: 'Sans suite', badgeClass: 'badge-neutral' }
    ];

    var RDV_PRIORITES = [
        { value: 'basse', label: 'Basse', badgeClass: 'badge-neutral' },
        { value: 'normale', label: 'Normale', badgeClass: 'badge-info' },
        { value: 'haute', label: 'Haute', badgeClass: 'badge-danger' }
    ];

    var RDV_OPPORTUNITES = [
        { value: 'faible', label: 'Faible', badgeClass: 'badge-neutral' },
        { value: 'moyen', label: 'Moyen', badgeClass: 'badge-warning' },
        { value: 'fort', label: 'Fort', badgeClass: 'badge-success' }
    ];

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function formatDateFr(date) {
        return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + '/' + date.getFullYear();
    }

    function parseDateFr(value) {
        if (!value) {
            return null;
        }
        var parts = value.split('/');
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }

    function computeNextRdvId() {
        var maxSeq = 0;
        Object.keys(RDV_DETAILS).forEach(function (id) {
            var seq = parseInt(id.replace('rdv-', ''), 10);
            if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
            }
        });
        var padded = String(maxSeq + 1);
        while (padded.length < 4) {
            padded = '0' + padded;
        }
        return 'rdv-' + padded;
    }

    function pushHistorique(rdv, type, description) {
        var now = new Date();
        rdv.historique.push({
            date: formatDateFr(now),
            heure: pad2(now.getHours()) + ':' + pad2(now.getMinutes()),
            auteur: 'Vous',
            type: type,
            description: description
        });
    }

    function creerDevisBrouillonPourRdv(rdv) {
        var devisCalc = window.COCKPIT_DEVIS_CALC;
        var DEVIS_DETAILS = window.COCKPIT_DEVIS_DETAILS;
        var numero = devisCalc.computeNextDevisNumero(new Date().getFullYear());
        var aujourdhui = formatDateFr(new Date());
        DEVIS_DETAILS[numero] = {
            numero: numero,
            versionActive: 1,
            versions: [{
                version: 1,
                statut: 'brouillon',
                dateCreation: aujourdhui,
                dateModification: aujourdhui,
                clientSlug: rdv.clientSlug,
                clientSnapshot: devisCalc.snapshotClient(rdv.clientSlug),
                companySnapshot: devisCalc.snapshotCompany(),
                lignes: [],
                conditionsPaiement: { delai: '', acompte: '', fractionne: '', note: '' },
                rdvRef: { id: rdv.id }
            }]
        };
        rdv.devisRef = { numero: numero, version: 1 };
        pushHistorique(rdv, 'devis', 'Devis brouillon ' + numero + ' créé automatiquement.');
        return numero;
    }

    function trouverDevisLie(rdv) {
        if (!rdv.devisRef) {
            return null;
        }
        var DEVIS_DETAILS = window.COCKPIT_DEVIS_DETAILS || {};
        return DEVIS_DETAILS[rdv.devisRef.numero] || null;
    }

    function peutSupprimerDevisBrouillonLie(rdv) {
        var devis = trouverDevisLie(rdv);
        if (!devis || devis.versions.length !== 1) {
            return false;
        }
        if (devis.versions[0].statut !== 'brouillon') {
            return false;
        }
        var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
        var dejaConvertiEnFacture = Object.keys(FACTURE_DETAILS).some(function (key) {
            var f = FACTURE_DETAILS[key];
            return f.devisRef && f.devisRef.numero === devis.numero;
        });
        return !dejaConvertiEnFacture;
    }

    function appliquerPropositionCommerciale(rdv) {
        var proposition = rdv.propositionCommerciale;
        if (!proposition || !proposition.produits || proposition.produits.length === 0) {
            return false;
        }
        if (!peutSupprimerDevisBrouillonLie(rdv)) {
            // Devis introuvable, déjà envoyé/accepté/refusé, ou déjà converti en
            // facture : on ne réécrit jamais un devis qui n'est plus un simple
            // brouillon lié à ce RDV.
            return false;
        }
        var devis = trouverDevisLie(rdv);
        var PRODUCT_DETAILS = window.COCKPIT_PRODUCT_DETAILS || {};
        var remisePourcent = proposition.remiseMaxPourcent || 0;
        var lignes = proposition.produits.map(function (p) {
            var product = PRODUCT_DETAILS[p.slug];
            if (!product) {
                return null;
            }
            return {
                designation: product.nom,
                description: product.descriptionCourte || '',
                quantite: p.quantite,
                prixUnitaireHT: product.prixHT,
                tauxTVA: product.tva,
                remisePourcent: remisePourcent
            };
        }).filter(function (l) {
            return !!l;
        });
        if (lignes.length === 0) {
            return false;
        }
        var versionActive = devis.versions[devis.versions.length - 1];
        versionActive.lignes = lignes;
        versionActive.dateModification = formatDateFr(new Date());
        return true;
    }

    function supprimerDevisBrouillonLie(rdv) {
        if (!peutSupprimerDevisBrouillonLie(rdv)) {
            return false;
        }
        var numero = rdv.devisRef.numero;
        delete window.COCKPIT_DEVIS_DETAILS[numero];
        rdv.devisRef = null;
        pushHistorique(rdv, 'devis', 'Devis brouillon ' + numero + ' supprimé.');
        return true;
    }

    function transformerDevisBrouillonEnClassique(rdv) {
        var devis = trouverDevisLie(rdv);
        if (!devis) {
            return false;
        }
        var versionActive = devis.versions[devis.versions.length - 1];
        if (versionActive.statut !== 'brouillon') {
            return false;
        }
        versionActive.statut = 'envoye';
        versionActive.dateModification = formatDateFr(new Date());
        pushHistorique(rdv, 'devis', 'Devis ' + devis.numero + ' transformé en devis classique (envoyé).');
        return true;
    }

    function compterReports(rdv) {
        return (rdv.historique || []).filter(function (event) {
            return event.type === 'report';
        }).length;
    }

    function estReportePlusieursFois(rdv) {
        return compterReports(rdv) >= 2;
    }

    function snapshotClient(slug) {
        return (window.COCKPIT_DEVIS_CALC || {}).snapshotClient ? window.COCKPIT_DEVIS_CALC.snapshotClient(slug) : null;
    }

    var RDV_DETAILS = {
        'rdv-0001': {
            id: 'rdv-0001',
            titre: 'Point de suivi mensuel',
            date: '09/07/2026',
            heureDebut: '09:30',
            heureFin: '10:15',
            clientSlug: 'julien-petit',
            lieu: 'Visioconférence',
            statut: 'prevu',
            priorite: 'normale',
            opportunite: 'moyen',
            montantPotentiel: 750,
            notesInternes: 'Client suivi régulièrement, apprécie les points courts.',
            preparation: {
                contexteBesoin: 'Julien souhaite faire le point sur l\'avancement de l\'audit stratégique et évoquer une éventuelle suite.',
                notesDiverses: 'Prévoir de partager le calendrier prévisionnel des prochaines étapes.',
                propositionEnvisagee: 'Poursuite de l\'accompagnement avec un forfait de suivi mensuel.',
                prixCible: 900,
                prixMinimum: 700,
                argumentsCommerciaux: 'Résultats déjà obtenus sur le premier audit ; disponibilité immédiate.',
                objectionsPossibles: 'Budget serré ce trimestre.',
                prochainesEtapes: 'Envoyer une proposition chiffrée sous 48h si accord de principe.'
            },
            communication: {
                confirme: false,
                rappelsEffectues: 1,
                relances: 0,
                dateDerniereCommunication: '07/07/2026',
                prochaineCommunicationPrevue: '09/07/2026',
                commentaireSuivi: 'Rappel téléphonique effectué pour confirmer la disponibilité.'
            },
            devisRef: { numero: 'DEV-2026-00011', version: 1 },
            historique: [
                { date: '05/07/2026', heure: '10:00', auteur: 'Vous', type: 'creation', description: 'Rendez-vous créé, devis brouillon DEV-2026-00011 associé automatiquement.' },
                { date: '07/07/2026', heure: '11:20', auteur: 'Vous', type: 'communication', description: 'Rappel téléphonique effectué.' }
            ]
        },
        'rdv-0002': {
            id: 'rdv-0002',
            titre: 'Présentation site vitrine',
            date: '11/07/2026',
            heureDebut: '14:00',
            heureFin: '15:00',
            clientSlug: 'atelier-leroy',
            lieu: 'Chez le client',
            statut: 'confirme',
            priorite: 'haute',
            opportunite: 'fort',
            montantPotentiel: 2200,
            notesInternes: 'Décideur unique, prêt à avancer rapidement si le rendu visuel convainc.',
            preparation: {
                contexteBesoin: 'Refonte complète du site vitrine, forte attente sur le rendu mobile.',
                notesDiverses: 'Apporter des exemples de réalisations similaires en atelier/artisanat.',
                propositionEnvisagee: 'Site vitrine + maintenance mensuelle, sur le même modèle que le devis DEV-2026-00012 déjà envoyé.',
                prixCible: 2400,
                prixMinimum: 1900,
                argumentsCommerciaux: 'Portfolio de sites similaires ; maintenance incluse la première année.',
                objectionsPossibles: 'Délai de livraison jugé long par le client.',
                prochainesEtapes: 'Confirmer le rétroplanning de livraison lors du rendez-vous.'
            },
            communication: {
                confirme: true,
                rappelsEffectues: 1,
                relances: 1,
                dateDerniereCommunication: '08/07/2026',
                prochaineCommunicationPrevue: '11/07/2026',
                commentaireSuivi: 'Confirmation reçue par email, aucune relance supplémentaire nécessaire.'
            },
            devisRef: null,
            historique: [
                { date: '28/06/2026', heure: '09:15', auteur: 'Vous', type: 'creation', description: 'Rendez-vous créé.' },
                { date: '05/07/2026', heure: '16:40', auteur: 'Vous', type: 'communication', description: 'Relance envoyée par email pour confirmer la disponibilité.' },
                { date: '08/07/2026', heure: '09:05', auteur: 'Vous', type: 'communication', description: 'Rendez-vous confirmé par le client.' }
            ]
        },
        'rdv-0003': {
            id: 'rdv-0003',
            titre: 'Renégociation contrat annuel',
            date: '16/07/2026',
            heureDebut: '11:00',
            heureFin: '11:45',
            clientSlug: 'boucherie-morel',
            lieu: 'Téléphone',
            statut: 'reporte',
            priorite: 'normale',
            opportunite: 'moyen',
            montantPotentiel: 1500,
            notesInternes: 'Client difficile à joindre, déjà reporté deux fois.',
            preparation: {
                contexteBesoin: 'Renouvellement du contrat de maintenance digitale à des conditions à redéfinir.',
                notesDiverses: '',
                propositionEnvisagee: 'Reconduction avec ajustement tarifaire modéré.',
                prixCible: 1600,
                prixMinimum: 1300,
                argumentsCommerciaux: 'Historique de collaboration sans incident depuis 2 ans.',
                objectionsPossibles: 'Le client évoque la concurrence sur le prix.',
                prochainesEtapes: 'Reconfirmer une date ferme par téléphone.'
            },
            communication: {
                confirme: false,
                rappelsEffectues: 2,
                relances: 2,
                dateDerniereCommunication: '08/07/2026',
                prochaineCommunicationPrevue: '14/07/2026',
                commentaireSuivi: 'Le client demande à reporter une nouvelle fois, en attente de confirmation d\'une nouvelle date.'
            },
            devisRef: null,
            historique: [
                { date: '20/06/2026', heure: '08:30', auteur: 'Vous', type: 'creation', description: 'Rendez-vous créé pour le 30/06/2026.' },
                { date: '29/06/2026', heure: '17:00', auteur: 'Vous', type: 'report', description: 'Rendez-vous reporté du 30/06/2026 au 08/07/2026 à la demande du client.' },
                { date: '07/07/2026', heure: '18:10', auteur: 'Vous', type: 'report', description: 'Rendez-vous reporté une seconde fois du 08/07/2026 au 16/07/2026.' }
            ]
        },
        'rdv-0004': {
            id: 'rdv-0004',
            titre: 'Signature devis site vitrine + audit',
            date: '15/03/2026',
            heureDebut: '10:00',
            heureFin: '11:00',
            clientSlug: 'martin-dupont',
            lieu: 'Chez le client',
            statut: 'realise',
            priorite: 'haute',
            opportunite: 'fort',
            montantPotentiel: 3744,
            notesInternes: 'Rendez-vous concluant, devis accepté sur place.',
            preparation: {
                contexteBesoin: 'Audit stratégique déjà réalisé, extension vers un site vitrine et de la maintenance.',
                notesDiverses: '',
                propositionEnvisagee: 'Offre combinée audit + site vitrine + maintenance (voir devis DEV-2026-00015).',
                prixCible: 3800,
                prixMinimum: 3400,
                argumentsCommerciaux: 'Résultats concrets du premier audit, offre packagée avantageuse.',
                objectionsPossibles: 'Aucune objection majeure rencontrée.',
                prochainesEtapes: 'Facturation selon l\'acompte prévu au devis.'
            },
            communication: {
                confirme: true,
                rappelsEffectues: 1,
                relances: 0,
                dateDerniereCommunication: '15/03/2026',
                prochaineCommunicationPrevue: null,
                commentaireSuivi: 'Rendez-vous réalisé, devis signé sur place.'
            },
            devisRef: { numero: 'DEV-2026-00015', version: 3 },
            historique: [
                { date: '10/03/2026', heure: '09:00', auteur: 'Vous', type: 'creation', description: 'Rendez-vous créé, devis brouillon associé.' },
                { date: '15/03/2026', heure: '11:05', auteur: 'Vous', type: 'devis', description: 'Devis DEV-2026-00015 (v3) accepté par le client, converti en facture FAC-2026-00003.' },
                { date: '15/03/2026', heure: '11:10', auteur: 'Vous', type: 'statut', description: 'Rendez-vous marqué comme réalisé.' }
            ]
        },
        'rdv-0005': {
            id: 'rdv-0005',
            titre: 'Découverte besoin formation',
            date: '20/06/2026',
            heureDebut: '15:30',
            heureFin: '16:00',
            clientSlug: 'sophie-bernard',
            lieu: 'Visioconférence',
            statut: 'sans_suite',
            priorite: 'basse',
            opportunite: 'faible',
            montantPotentiel: 950,
            notesInternes: 'Besoin finalement pris en charge en interne par le client.',
            preparation: {
                contexteBesoin: 'Formation de l\'équipe interne sur un nouvel outil.',
                notesDiverses: '',
                propositionEnvisagee: 'Session de formation personnalisée.',
                prixCible: 1000,
                prixMinimum: 800,
                argumentsCommerciaux: 'Disponibilité rapide, formation sur-mesure.',
                objectionsPossibles: 'Le client hésite à externaliser la formation.',
                prochainesEtapes: 'Aucune, projet abandonné côté client.'
            },
            communication: {
                confirme: true,
                rappelsEffectues: 1,
                relances: 1,
                dateDerniereCommunication: '22/06/2026',
                prochaineCommunicationPrevue: null,
                commentaireSuivi: 'Le client a annoncé traiter le besoin en interne, sans suite de notre côté.'
            },
            devisRef: null,
            historique: [
                { date: '15/06/2026', heure: '14:00', auteur: 'Vous', type: 'creation', description: 'Rendez-vous créé, devis brouillon associé automatiquement.' },
                { date: '20/06/2026', heure: '16:05', auteur: 'Vous', type: 'devis', description: 'Devis brouillon supprimé, le rendez-vous n\'a mené à aucune proposition.' },
                { date: '22/06/2026', heure: '09:30', auteur: 'Vous', type: 'statut', description: 'Rendez-vous marqué sans suite.' }
            ]
        },
        'rdv-0006': {
            id: 'rdv-0006',
            titre: 'Premier rendez-vous découverte',
            date: '10/07/2026',
            heureDebut: '11:00',
            heureFin: '11:30',
            clientSlug: 'techni-bois-sarl',
            lieu: 'Chez le client',
            statut: 'prevu',
            priorite: 'normale',
            opportunite: 'moyen',
            montantPotentiel: 1200,
            notesInternes: 'Premier contact, à confirmer.',
            preparation: {
                contexteBesoin: 'Besoin encore mal défini, à qualifier lors du rendez-vous.',
                notesDiverses: 'Client rencontré lors d\'un salon professionnel.',
                propositionEnvisagee: 'À définir selon les besoins exprimés.',
                prixCible: null,
                prixMinimum: null,
                argumentsCommerciaux: '',
                objectionsPossibles: '',
                prochainesEtapes: 'Qualifier le besoin et proposer un devis si pertinent.'
            },
            communication: {
                confirme: false,
                rappelsEffectues: 0,
                relances: 0,
                dateDerniereCommunication: null,
                prochaineCommunicationPrevue: '09/07/2026',
                commentaireSuivi: 'Confirmation du rendez-vous à obtenir avant le 09/07.'
            },
            devisRef: null,
            historique: [
                { date: '03/07/2026', heure: '10:00', auteur: 'Vous', type: 'creation', description: 'Rendez-vous créé.' }
            ]
        }
    };

    window.COCKPIT_RDV_STATUSES = RDV_STATUSES;
    window.COCKPIT_RDV_PRIORITES = RDV_PRIORITES;
    window.COCKPIT_RDV_OPPORTUNITES = RDV_OPPORTUNITES;
    window.COCKPIT_RDV_DETAILS = RDV_DETAILS;
    function computeDashboardStats() {
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var rdvList = Object.keys(RDV_DETAILS).map(function (id) {
            return RDV_DETAILS[id];
        });

        var actifs = rdvList.filter(function (rdv) {
            return rdv.statut !== 'realise' && rdv.statut !== 'annule' && rdv.statut !== 'sans_suite';
        });

        var rdvAujourdhui = actifs.filter(function (rdv) {
            var d = parseDateFr(rdv.date);
            return d && d.getTime() === today.getTime();
        }).sort(function (a, b) {
            return (a.heureDebut || '').localeCompare(b.heureDebut || '');
        });

        var rdvProchains = actifs.filter(function (rdv) {
            var d = parseDateFr(rdv.date);
            return d && d.getTime() > today.getTime();
        }).sort(function (a, b) {
            return parseDateFr(a.date) - parseDateFr(b.date);
        }).slice(0, 5);

        var rdvNonConfirmes = actifs.filter(function (rdv) {
            return !rdv.communication.confirme;
        });

        var rdvReportes = rdvList.filter(function (rdv) {
            return rdv.statut === 'reporte';
        });

        var rdvDevisBrouillonEnAttente = rdvList.filter(function (rdv) {
            var devis = trouverDevisLie(rdv);
            return !!(devis && devis.versions[devis.versions.length - 1].statut === 'brouillon');
        });

        var rdvReportesPlusieurs = rdvList.filter(function (rdv) {
            return estReportePlusieursFois(rdv);
        });

        return {
            rdvAujourdhui: rdvAujourdhui,
            rdvProchains: rdvProchains,
            rdvNonConfirmes: rdvNonConfirmes,
            rdvReportes: rdvReportes,
            rdvDevisBrouillonEnAttente: rdvDevisBrouillonEnAttente,
            rdvReportesPlusieurs: rdvReportesPlusieurs
        };
    }

    window.COCKPIT_AGENDA_CALC = {
        formatDateFr: formatDateFr,
        parseDateFr: parseDateFr,
        computeNextRdvId: computeNextRdvId,
        pushHistorique: pushHistorique,
        creerDevisBrouillonPourRdv: creerDevisBrouillonPourRdv,
        trouverDevisLie: trouverDevisLie,
        peutSupprimerDevisBrouillonLie: peutSupprimerDevisBrouillonLie,
        supprimerDevisBrouillonLie: supprimerDevisBrouillonLie,
        transformerDevisBrouillonEnClassique: transformerDevisBrouillonEnClassique,
        appliquerPropositionCommerciale: appliquerPropositionCommerciale,
        compterReports: compterReports,
        estReportePlusieursFois: estReportePlusieursFois,
        snapshotClient: snapshotClient,
        computeDashboardStats: computeDashboardStats
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

// Données Trésorerie (V0.8). Outil simple de pilotage du cash, pas une
// comptabilité complète : réutilise directement FACTURE_DETAILS/DEVIS_CALC/
// FACTURE_CALC/FACTURATION_STATS pour tout ce qui vient de la facturation
// (encaissements attendus, factures en retard, paiements déjà reçus), et
// n'ajoute que le spécifique trésorerie : opérations manuelles (charges
// prévues, encaissements/décaissements hors facturation), solde estimé/
// prévisionnel, alertes. TRESORERIE_OPERATIONS est une source statique en
// mémoire, comme le reste de l'application : aucune persistance réelle,
// "Ajouter une opération" modifie l'objet en mémoire de la page courante.
// SOLDE_INITIAL représente une trésorerie de départ fictive (hors montants
// déjà suivis par la Facturation), nécessaire pour obtenir un solde estimé
// cohérent sans reconstruire un historique bancaire complet (hors périmètre
// V0.8, cf. "rapprochement bancaire" explicitement exclu).

(function () {
    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var factureCalc = window.COCKPIT_FACTURE_CALC;

    var TRESORERIE_CATEGORIES = [
        { value: 'loyer', label: 'Loyer' },
        { value: 'fournisseur', label: 'Fournisseur' },
        { value: 'abonnement', label: 'Abonnement' },
        { value: 'salaires', label: 'Salaires' },
        { value: 'impots', label: 'Impôts / taxes' },
        { value: 'remboursement', label: 'Remboursement' },
        { value: 'autre', label: 'Autre' }
    ];

    var TRESORERIE_STATUSES = [
        { value: 'prevu', label: 'Prévu', badgeClass: 'badge-info' },
        { value: 'realise', label: 'Réalisé', badgeClass: 'badge-success' },
        { value: 'en-retard', label: 'En retard', badgeClass: 'badge-danger' },
        { value: 'annule', label: 'Annulé', badgeClass: 'badge-neutral' }
    ];

    var SOLDE_INITIAL = 5250;

    var TRESORERIE_OPERATIONS = {
        'OP-0001': { id: 'OP-0001', type: 'decaissement', libelle: 'Loyer — Bureaux', categorie: 'loyer', montant: 1850, date: '10/07/2026', statut: 'prevu', notes: 'Bail mensuel juillet', recurrence: 'mensuelle' },
        'OP-0002': { id: 'OP-0002', type: 'decaissement', libelle: 'Fournisseur — Matériel Pro', categorie: 'fournisseur', montant: 3120, date: '15/07/2026', statut: 'prevu', notes: 'Facture FR-45231', recurrence: 'aucune' },
        'OP-0003': { id: 'OP-0003', type: 'decaissement', libelle: 'Salaires — Équipe', categorie: 'salaires', montant: 6750, date: '20/07/2026', statut: 'prevu', notes: 'Paie mensuelle', recurrence: 'mensuelle' },
        'OP-0004': { id: 'OP-0004', type: 'decaissement', libelle: 'Abonnement — Logiciel', categorie: 'abonnement', montant: 79, date: '22/07/2026', statut: 'prevu', notes: 'Outil de gestion', recurrence: 'mensuelle' },
        'OP-0005': { id: 'OP-0005', type: 'decaissement', libelle: 'Impôts — TVA', categorie: 'impots', montant: 2340, date: '31/07/2026', statut: 'prevu', notes: 'Déclaration TVA trimestrielle', recurrence: 'trimestrielle' },
        'OP-0006': { id: 'OP-0006', type: 'decaissement', libelle: 'Loyer — Bureaux', categorie: 'loyer', montant: 1850, date: '10/06/2026', statut: 'realise', notes: 'Bail mensuel juin', recurrence: 'mensuelle' }
    };

    function labelForCategorie(value) {
        var found = TRESORERIE_CATEGORIES.filter(function (c) { return c.value === value; })[0];
        return found ? found.label : 'Autre';
    }

    function labelForStatut(value) {
        var found = TRESORERIE_STATUSES.filter(function (s) { return s.value === value; })[0];
        return found || null;
    }

    function computeNextOperationId() {
        var maxSeq = 0;
        Object.keys(TRESORERIE_OPERATIONS).forEach(function (key) {
            var match = key.match(/^OP-(\d{4,})$/);
            if (match) {
                var seq = parseInt(match[1], 10);
                if (seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        });
        var nextSeq = maxSeq + 1;
        var padded = String(nextSeq);
        while (padded.length < 4) {
            padded = '0' + padded;
        }
        return 'OP-' + padded;
    }

    function parseDate(value) {
        return factureCalc.parseDate(value);
    }

    function addDaysLocal(date, n) {
        var d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function computePaiementsRecus() {
        var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
        var total = 0;
        Object.keys(FACTURE_DETAILS).forEach(function (key) {
            (FACTURE_DETAILS[key].paiements || []).forEach(function (p) {
                total = devisCalc.roundMoney(total + (parseFloat(p.montant) || 0));
            });
        });
        return total;
    }

    function computeOperationsRealisees(type) {
        var total = 0;
        Object.keys(TRESORERIE_OPERATIONS).forEach(function (key) {
            var op = TRESORERIE_OPERATIONS[key];
            if (op.type === type && op.statut === 'realise') {
                total = devisCalc.roundMoney(total + (parseFloat(op.montant) || 0));
            }
        });
        return total;
    }

    function computeSoldeEstime() {
        return devisCalc.roundMoney(SOLDE_INITIAL + computePaiementsRecus() - computeOperationsRealisees('decaissement') + computeOperationsRealisees('encaissement'));
    }

    function getFacturesAEncaisser() {
        var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
        var CLIENT_DETAILS = window.COCKPIT_CLIENT_DETAILS || {};
        var result = [];
        Object.keys(FACTURE_DETAILS).forEach(function (key) {
            var facture = FACTURE_DETAILS[key];
            if (facture.statutEmission !== 'emise') {
                return;
            }
            var totals = devisCalc.computeDevisTotals(facture.lignes);
            var paiementsInfo = factureCalc.computePaiements(facture.paiements, totals.totalTTC);
            if (paiementsInfo.resteAPayer <= 0) {
                return;
            }
            var statutAffiche = factureCalc.computeStatutAffiche({
                statutEmission: facture.statutEmission,
                totalTTC: totals.totalTTC,
                paiements: facture.paiements,
                dateEcheance: facture.dateEcheance
            });
            var statutTresorerie = statutAffiche === 'en-retard' ? 'en-retard' : (paiementsInfo.totalPaye > 0 ? 'partiellement-payee' : 'a-venir');
            result.push({
                key: key,
                numero: facture.numero || key,
                clientSlug: facture.clientSlug,
                clientNom: (CLIENT_DETAILS[facture.clientSlug] || facture.clientSnapshot || {}).nom || facture.clientSlug || '—',
                dateEcheance: facture.dateEcheance,
                resteAPayer: paiementsInfo.resteAPayer,
                statut: statutTresorerie
            });
        });
        result.sort(function (a, b) {
            return (parseDate(a.dateEcheance) || 0) - (parseDate(b.dateEcheance) || 0);
        });
        return result;
    }

    function getChargesPrevues() {
        return Object.keys(TRESORERIE_OPERATIONS).map(function (key) {
            return TRESORERIE_OPERATIONS[key];
        }).filter(function (op) {
            return op.type === 'decaissement' && op.statut !== 'annule';
        }).sort(function (a, b) {
            return (parseDate(a.date) || 0) - (parseDate(b.date) || 0);
        });
    }

    function getMouvements(periodEnd) {
        var mouvements = [];

        getFacturesAEncaisser().forEach(function (f) {
            mouvements.push({
                date: f.dateEcheance,
                libelle: 'Règlement facture ' + f.numero,
                categorie: 'Client : ' + f.clientNom,
                montant: f.resteAPayer,
                type: 'encaissement',
                statut: f.statut === 'en-retard' ? 'en-retard' : 'prevu',
                lien: { type: 'facture', key: f.key }
            });
        });

        Object.keys(TRESORERIE_OPERATIONS).forEach(function (key) {
            var op = TRESORERIE_OPERATIONS[key];
            if (op.statut === 'annule') {
                return;
            }
            mouvements.push({
                date: op.date,
                libelle: op.libelle,
                categorie: labelForCategorie(op.categorie),
                montant: op.montant,
                type: op.type,
                statut: op.statut,
                lien: null
            });
        });

        mouvements.sort(function (a, b) {
            return (parseDate(a.date) || 0) - (parseDate(b.date) || 0);
        });

        if (periodEnd) {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            mouvements = mouvements.filter(function (m) {
                var d = parseDate(m.date);
                return d && d >= today && d <= periodEnd;
            });
        }

        return mouvements;
    }

    function computeAlertes(ctx) {
        var alertes = [];

        if (ctx.facturationStats.facturesEnRetard > 0) {
            var montantRetard = ctx.facturesAEncaisser.filter(function (f) {
                return f.statut === 'en-retard';
            }).reduce(function (sum, f) {
                return devisCalc.roundMoney(sum + f.resteAPayer);
            }, 0);
            alertes.push({
                niveau: 'critical',
                titre: ctx.facturationStats.facturesEnRetard + ' facture(s) en retard',
                sousTexte: 'Montant total : ' + devisCalc.formatMoney(montantRetard),
                lien: 'facturation.html'
            });
        }

        var dansUneSemaine = addDaysLocal(ctx.today, 7);
        var chargeSemaine = ctx.chargesAVenir.filter(function (op) {
            var d = parseDate(op.date);
            return d && d <= dansUneSemaine;
        }).sort(function (a, b) {
            return (parseDate(a.date) || 0) - (parseDate(b.date) || 0);
        })[0];
        if (chargeSemaine) {
            alertes.push({
                niveau: 'warning',
                titre: chargeSemaine.libelle + ' à payer cette semaine',
                sousTexte: 'Échéance le ' + chargeSemaine.date + ' — ' + devisCalc.formatMoney(chargeSemaine.montant),
                lien: 'tresorerie.html'
            });
        }

        if (ctx.soldePrevisionnel < ctx.soldeEstime * 0.3 || ctx.soldePrevisionnel < 1000) {
            alertes.push({
                niveau: 'warning',
                titre: 'Risque de tension de trésorerie',
                sousTexte: 'Solde prévisionnel bas sur la période sélectionnée',
                lien: 'tresorerie.html'
            });
        }

        var grosseFacture = ctx.facturesAEncaisser.filter(function (f) {
            return f.resteAPayer >= 2000;
        }).sort(function (a, b) {
            return b.resteAPayer - a.resteAPayer;
        })[0];
        if (grosseFacture) {
            alertes.push({
                niveau: 'info',
                titre: 'Encaissement important attendu',
                sousTexte: grosseFacture.numero + ' — ' + devisCalc.formatMoney(grosseFacture.resteAPayer),
                lien: 'facturation.html'
            });
        }

        return alertes;
    }

    function computeSerie(soldeDepart, mouvements, today, periodEnd) {
        var points = [{ date: new Date(today), solde: soldeDepart, mouvementPrincipal: null }];
        var running = soldeDepart;
        var cursor = new Date(today);

        while (cursor < periodEnd) {
            var previous = new Date(cursor);
            cursor = addDaysLocal(cursor, 7);
            if (cursor > periodEnd) {
                cursor = new Date(periodEnd);
            }
            var mouvementPrincipal = null;
            mouvements.forEach(function (m) {
                var d = parseDate(m.date);
                if (!d || d <= previous || d > cursor) {
                    return;
                }
                running = devisCalc.roundMoney(running + (m.type === 'encaissement' ? m.montant : -m.montant));
                if (!mouvementPrincipal || m.montant > mouvementPrincipal.montant) {
                    mouvementPrincipal = m;
                }
            });
            points.push({ date: new Date(cursor), solde: running, mouvementPrincipal: mouvementPrincipal });
            if (cursor.getTime() === periodEnd.getTime()) {
                break;
            }
        }

        return points;
    }

    function computeSnapshot(periodDays) {
        periodDays = periodDays || 30;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var periodEnd = addDaysLocal(today, periodDays);

        var facturationStats = (window.COCKPIT_FACTURATION_STATS || {}).computeStats
            ? window.COCKPIT_FACTURATION_STATS.computeStats()
            : { resteAEncaisser: 0, facturesEnRetard: 0 };

        var soldeEstime = computeSoldeEstime();
        var aEncaisser = facturationStats.resteAEncaisser;

        var chargesPrevues = getChargesPrevues();
        var chargesAVenir = chargesPrevues.filter(function (op) {
            var d = parseDate(op.date);
            return op.statut === 'prevu' && d && d >= today && d <= periodEnd;
        });
        var aDecaisser = 0;
        chargesAVenir.forEach(function (op) {
            aDecaisser = devisCalc.roundMoney(aDecaisser + op.montant);
        });

        var soldePrevisionnel = devisCalc.roundMoney(soldeEstime + aEncaisser - aDecaisser);

        var facturesAEncaisser = getFacturesAEncaisser();
        var mouvements = getMouvements(periodEnd);

        var alertes = computeAlertes({
            soldeEstime: soldeEstime,
            soldePrevisionnel: soldePrevisionnel,
            facturesAEncaisser: facturesAEncaisser,
            chargesAVenir: chargesAVenir,
            facturationStats: facturationStats,
            today: today
        });

        var serie = computeSerie(soldeEstime, mouvements, today, periodEnd);

        return {
            today: today,
            periodEnd: periodEnd,
            soldeEstime: soldeEstime,
            aEncaisser: aEncaisser,
            aDecaisser: aDecaisser,
            soldePrevisionnel: soldePrevisionnel,
            mouvements: mouvements,
            facturesAEncaisser: facturesAEncaisser,
            chargesPrevues: chargesPrevues,
            chargesAVenir: chargesAVenir,
            alertes: alertes,
            serie: serie
        };
    }

    function addOperation(data) {
        var id = computeNextOperationId();
        TRESORERIE_OPERATIONS[id] = {
            id: id,
            type: data.type,
            libelle: data.libelle,
            categorie: data.categorie,
            montant: parseFloat(data.montant) || 0,
            date: data.date,
            statut: data.statut || 'prevu',
            notes: data.notes || '',
            recurrence: data.recurrence || 'aucune'
        };
        return TRESORERIE_OPERATIONS[id];
    }

    window.COCKPIT_TRESORERIE_CATEGORIES = TRESORERIE_CATEGORIES;
    window.COCKPIT_TRESORERIE_STATUSES = TRESORERIE_STATUSES;
    window.COCKPIT_TRESORERIE_OPERATIONS = TRESORERIE_OPERATIONS;
    window.COCKPIT_TRESORERIE_CALC = {
        computeSnapshot: computeSnapshot,
        getFacturesAEncaisser: getFacturesAEncaisser,
        getChargesPrevues: getChargesPrevues,
        addOperation: addOperation,
        labelForCategorie: labelForCategorie,
        labelForStatut: labelForStatut,
        parseDate: parseDate
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
        if (rdvId) {
            return 'fiche-rdv.html?rdv=' + encodeURIComponent(rdvId);
        }
        return slug ? 'agenda.html?client=' + encodeURIComponent(slug) : 'agenda.html';
    }

    function buildFacturationHref(slug) {
        return slug ? 'facturation.html?from=fiche-client&client=' + encodeURIComponent(slug) : 'facturation.html';
    }

    function renderAppointments(slug) {
        var list = document.getElementById('client-appointments-list');
        if (!list) {
            return;
        }
        list.innerHTML = '';

        var RDV_DETAILS = window.COCKPIT_RDV_DETAILS || {};
        var RDV_STATUSES = window.COCKPIT_RDV_STATUSES || [];
        var agendaCalc = window.COCKPIT_AGENDA_CALC || {};

        var appointments = Object.keys(RDV_DETAILS).map(function (id) {
            return RDV_DETAILS[id];
        }).filter(function (rdv) {
            return rdv.clientSlug === slug;
        }).sort(function (a, b) {
            var dateA = agendaCalc.parseDateFr ? agendaCalc.parseDateFr(a.date) : null;
            var dateB = agendaCalc.parseDateFr ? agendaCalc.parseDateFr(b.date) : null;
            return (dateA ? dateA.getTime() : 0) - (dateB ? dateB.getTime() : 0);
        });

        if (appointments.length === 0) {
            var empty = document.createElement('p');
            empty.className = 'empty-state-inline';
            empty.textContent = 'Aucun rendez-vous pour ce client.';
            list.appendChild(empty);
            return;
        }

        appointments.slice(0, 3).forEach(function (rdv) {
            var statusInfo = RDV_STATUSES.filter(function (s) { return s.value === rdv.statut; })[0];

            var item = document.createElement('a');
            item.className = 'appointment-item appointment-item-link';
            item.href = buildAgendaHref(rdv.id, slug);

            var infoEl = document.createElement('div');
            infoEl.className = 'appointment-info';

            var dateEl = document.createElement('p');
            dateEl.className = 'appointment-date';
            dateEl.textContent = rdv.date + ' · ' + rdv.heureDebut;

            var objetEl = document.createElement('p');
            objetEl.className = 'appointment-objet';
            objetEl.textContent = rdv.titre;

            var lieuEl = document.createElement('p');
            lieuEl.className = 'appointment-lieu';
            lieuEl.textContent = rdv.lieu;

            infoEl.appendChild(dateEl);
            infoEl.appendChild(objetEl);
            infoEl.appendChild(lieuEl);

            var statusEl = document.createElement('span');
            statusEl.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');
            statusEl.textContent = statusInfo ? statusInfo.label : rdv.statut;

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
        renderAppointments(slug);
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
                var fallbackClientSlug = params.get('client');
                if (!fallbackClientSlug) {
                    return false;
                }
                // Le devis brouillon a été créé en mémoire de page depuis une fiche
                // rendez-vous (V0.7) puis perdu lors d'un rechargement/nouvel onglet
                // (aucune persistance réelle dans l'application). Plutôt qu'un
                // "Document introuvable" trompeur, on rouvre un brouillon neuf déjà
                // rattaché au bon client, cohérent avec ce que l'utilisateur attend.
                state.mode = 'new';
                state.numero = calc.computeNextDevisNumero(new Date().getFullYear());
                state.version = 1;
                state.statut = 'brouillon';
                state.dateCreation = null;
                state.dateModification = null;
                state.clientSlug = fallbackClientSlug;
                state.clientSnapshot = calc.snapshotClient(fallbackClientSlug);
                state.companySnapshot = calc.snapshotCompany();
                state.lines = [];
                state.conditionsPaiement = cloneConditionsPaiement(null);
                state.basedOnVersion = null;
                state.sourceDevis = null;
                state.viewingVersion = null;
                state.editable = true;
                state.recreatedFromRdv = true;
                return true;
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
        } else if (state.recreatedFromRdv) {
            metaEl.textContent = 'Le brouillon créé depuis le rendez-vous n\'a pas survécu au rechargement (aucune persistance) — un nouveau brouillon est proposé pour ce client.';
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
        if (state.viewingVersion && state.viewingVersion.rdvRef) {
            var rdvLink = document.createElement('a');
            rdvLink.className = 'table-action-secondary';
            rdvLink.style.display = 'inline-block';
            rdvLink.style.marginTop = '6px';
            rdvLink.href = 'fiche-rdv.html?rdv=' + encodeURIComponent(state.viewingVersion.rdvRef.id);
            rdvLink.textContent = 'Voir le rendez-vous lié';
            container.appendChild(rdvLink);
        }
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

// Page Tableau de bord : bloc "Aperçu Trésorerie" (V0.8). Même principe que
// "Aperçu Facturation" ci-dessus : liste compacte en lecture seule, calculée
// depuis COCKPIT_TRESORERIE_CALC.computeSnapshot() (fenêtre de 30 jours par
// défaut, cohérente avec tresorerie.html). La carte KPI "Trésorerie
// disponible", jusqu'ici statique, reflète désormais le vrai solde estimé.

(function () {
    var statsEl = document.getElementById('dashboard-tresorerie-stats');
    if (!statsEl) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var calc = window.COCKPIT_TRESORERIE_CALC;
    var snapshot = calc && calc.computeSnapshot ? calc.computeSnapshot(30) : null;
    if (!snapshot || !devisCalc) {
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

    statsEl.appendChild(makeStatRow('Solde estimé', devisCalc.formatMoney(snapshot.soldeEstime)));
    statsEl.appendChild(makeStatRow('À encaisser', devisCalc.formatMoney(snapshot.aEncaisser)));
    statsEl.appendChild(makeStatRow('À décaisser', devisCalc.formatMoney(snapshot.aDecaisser)));
    var previsionnelRow = makeStatRow('Solde prévisionnel (30 j)', devisCalc.formatMoney(snapshot.soldePrevisionnel));
    previsionnelRow.classList.add('devis-summary-row-total');
    statsEl.appendChild(previsionnelRow);

    var alerteRow = makeStatRow('Alerte principale', snapshot.alertes.length > 0 ? snapshot.alertes[0].titre : 'Aucune alerte');
    statsEl.appendChild(alerteRow);

    var soldeKpiEl = document.getElementById('dashboard-tresorerie-solde');
    if (soldeKpiEl) {
        soldeKpiEl.textContent = devisCalc.formatMoney(snapshot.soldeEstime);
    }
})();

// Page Tableau de bord : bloc "Agenda commercial" réel (V0.7). Remplace
// l'ancienne liste statique "Agenda du jour" par un rendu calculé depuis
// COCKPIT_AGENDA_CALC.computeDashboardStats() : rendez-vous du jour (liste),
// puis prochains rendez-vous / non confirmés / reportés / devis brouillon en
// attente / reportés plusieurs fois (compteurs), sans redesign du dashboard.

(function () {
    var todayListEl = document.getElementById('dashboard-agenda-today');
    var statsEl = document.getElementById('dashboard-agenda-stats');
    if (!todayListEl || !statsEl) {
        return;
    }

    var agendaCalc = window.COCKPIT_AGENDA_CALC || {};
    var stats = agendaCalc.computeDashboardStats ? agendaCalc.computeDashboardStats() : null;
    if (!stats) {
        return;
    }

    var CLASS_CYCLE = ['agenda-item-a', 'agenda-item-b', 'agenda-item-c'];

    if (stats.rdvAujourdhui.length === 0) {
        var emptyItem = document.createElement('li');
        emptyItem.className = 'agenda-item-a';
        emptyItem.textContent = 'Aucun rendez-vous prévu aujourd\'hui.';
        todayListEl.appendChild(emptyItem);
    } else {
        stats.rdvAujourdhui.forEach(function (rdv, index) {
            var item = document.createElement('li');
            item.className = CLASS_CYCLE[index % CLASS_CYCLE.length];
            var timeEl = document.createElement('span');
            timeEl.className = 'agenda-time';
            timeEl.textContent = rdv.heureDebut || '—';
            item.appendChild(timeEl);
            item.appendChild(document.createTextNode(rdv.titre));
            todayListEl.appendChild(item);
        });
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

    statsEl.appendChild(makeStatRow('Prochains rendez-vous', String(stats.rdvProchains.length)));
    statsEl.appendChild(makeStatRow('Non confirmés', String(stats.rdvNonConfirmes.length)));
    statsEl.appendChild(makeStatRow('Reportés', String(stats.rdvReportes.length)));
    statsEl.appendChild(makeStatRow('Devis brouillon en attente', String(stats.rdvDevisBrouillonEnAttente.length)));
    if (stats.rdvReportesPlusieurs.length > 0) {
        var alertRow = makeStatRow('Reportés plusieurs fois', String(stats.rdvReportesPlusieurs.length));
        alertRow.classList.add('devis-summary-row-total');
        statsEl.appendChild(alertRow);
    }
})();

// Page Agenda : vues calendrier Jour/Semaine/Mois (V0.7.1, correctif
// d'ergonomie). Semaine est la vue par défaut ; la vue Liste existante
// (recherche/filtre/pagination, IIFE suivante) devient une vue secondaire
// parmi d'autres, accessible via l'onglet "Liste". Les rendez-vous sont lus
// directement depuis COCKPIT_RDV_DETAILS. Grille calculée par positionnement
// absolu (1 minute = 1px), sans bibliothèque de calendrier externe. La plage
// horaire par défaut (07h-20h) s'élargit automatiquement si un rendez-vous
// affiché tombe hors de cette plage, pour qu'aucun rendez-vous ne soit jamais
// masqué ou coupé.

(function () {
    var tabsEl = document.getElementById('agenda-view-tabs');
    var dayGridEl = document.getElementById('calendar-day-grid');
    if (!tabsEl || !dayGridEl) {
        return;
    }

    var agendaCalc = window.COCKPIT_AGENDA_CALC || {};
    var RDV_STATUSES = window.COCKPIT_RDV_STATUSES || [];
    var CLIENT_DETAILS = window.COCKPIT_CLIENT_DETAILS || {};

    var navToolbarEl = document.getElementById('calendar-nav-toolbar');
    var panels = {
        jour: document.getElementById('view-panel-jour'),
        semaine: document.getElementById('view-panel-semaine'),
        mois: document.getElementById('view-panel-mois'),
        liste: document.getElementById('view-panel-liste')
    };
    var weekGridEl = document.getElementById('calendar-week-grid');
    var monthGridEl = document.getElementById('calendar-month-grid');
    var prevBtn = document.getElementById('calendar-prev-btn');
    var nextBtn = document.getElementById('calendar-next-btn');
    var todayBtn = document.getElementById('calendar-today-btn');
    var datePickerEl = document.getElementById('calendar-date-picker');
    var weekSelectEl = document.getElementById('calendar-week-select');
    var weekYearSelectEl = document.getElementById('calendar-week-year-select');
    var monthSelectEl = document.getElementById('calendar-month-select');
    var monthYearSelectEl = document.getElementById('calendar-month-year-select');
    var daySummaryStatsEl = document.getElementById('calendar-day-summary-stats');
    var daySummaryListsEl = document.getElementById('calendar-day-summary-lists');

    var DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    var MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    var DEFAULT_START_HOUR = 7;
    var DEFAULT_END_HOUR = 20;
    var PX_PER_MIN = 1;
    var STATUS_TO_EVENT_CLASS = {
        'badge-neutral': 'calendar-event-neutral',
        'badge-info': 'calendar-event-info',
        'badge-warning': 'calendar-event-warning',
        'badge-success': 'calendar-event-success',
        'badge-danger': 'calendar-event-danger'
    };
    var STATUS_TO_MONTH_CLASS = {
        'badge-neutral': 'calendar-month-event-neutral',
        'badge-info': 'calendar-month-event-info',
        'badge-warning': 'calendar-month-event-warning',
        'badge-success': 'calendar-month-event-success',
        'badge-danger': 'calendar-month-event-danger'
    };

    var activeView = 'semaine';
    var refDate = new Date();
    refDate.setHours(0, 0, 0, 0);

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function formatDateFr(date) {
        return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + '/' + date.getFullYear();
    }

    function toISODate(date) {
        return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    function fromISODate(value) {
        if (!value) {
            return null;
        }
        var parts = value.split('-');
        if (parts.length !== 3) {
            return null;
        }
        var year = parseInt(parts[0], 10);
        // Garde-fou contre la saisie clavier incomplète du champ année d'un
        // <input type="date"> natif (ex. "0026"/"19XX" avant que les 4 chiffres
        // ne soient tapés) : une année hors d'une plage raisonnable est ignorée
        // plutôt que d'appliquer une date visiblement erronée.
        if (isNaN(year) || year < 2000 || year > 2099) {
            return null;
        }
        var d = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return isNaN(d.getTime()) ? null : d;
    }

    function sameDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function addDays(date, n) {
        var d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    }

    function addMonths(date, n) {
        var d = new Date(date);
        d.setMonth(d.getMonth() + n);
        return d;
    }

    function startOfWeek(date) {
        var d = new Date(date);
        var dow = d.getDay();
        var offset = dow === 0 ? -6 : 1 - dow;
        d.setDate(d.getDate() + offset);
        return d;
    }

    function getISOWeekAndYear(date) {
        var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { week: week, year: d.getUTCFullYear() };
    }

    function dateFromISOWeek(week, year) {
        var jan4 = new Date(year, 0, 4);
        var dayNum = jan4.getDay() || 7;
        var monday = new Date(jan4);
        monday.setDate(jan4.getDate() - dayNum + 1 + (week - 1) * 7);
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    function parseHM(value) {
        if (!value) {
            return null;
        }
        var parts = value.split(':');
        var hours = parseInt(parts[0], 10);
        var minutes = parseInt(parts[1], 10);
        if (isNaN(hours)) {
            return null;
        }
        return hours * 60 + (isNaN(minutes) ? 0 : minutes);
    }

    function getAllRdvs() {
        var RDV_DETAILS = window.COCKPIT_RDV_DETAILS || {};
        return Object.keys(RDV_DETAILS).map(function (id) {
            return RDV_DETAILS[id];
        });
    }

    function rdvsForDay(dateObj) {
        return getAllRdvs().filter(function (rdv) {
            var d = agendaCalc.parseDateFr ? agendaCalc.parseDateFr(rdv.date) : null;
            return d && sameDay(d, dateObj);
        }).sort(function (a, b) {
            return (parseHM(a.heureDebut) || 0) - (parseHM(b.heureDebut) || 0);
        });
    }

    function badgeInfo(list, value) {
        return list.filter(function (item) { return item.value === value; })[0] || null;
    }

    function clientName(slug) {
        return slug && CLIENT_DETAILS[slug] ? CLIENT_DETAILS[slug].nom : null;
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

    function computeRange(days) {
        var startHour = DEFAULT_START_HOUR;
        var endHour = DEFAULT_END_HOUR;
        days.forEach(function (day) {
            rdvsForDay(day).forEach(function (rdv) {
                var start = parseHM(rdv.heureDebut);
                var end = parseHM(rdv.heureFin) || (start !== null ? start + 30 : null);
                if (start !== null) {
                    startHour = Math.min(startHour, Math.floor(start / 60));
                }
                if (end !== null) {
                    endHour = Math.max(endHour, Math.ceil(end / 60));
                }
            });
        });
        return { startHour: startHour, endHour: endHour };
    }

    function rdvTooltip(rdv) {
        var statutInfo = badgeInfo(RDV_STATUSES, rdv.statut);
        var lines = [
            rdv.titre || 'Rendez-vous',
            (rdv.heureDebut || '—') + (rdv.heureFin ? ' – ' + rdv.heureFin : ''),
            clientName(rdv.clientSlug) || 'Aucun client associé',
            rdv.lieu || '',
            'Statut : ' + (statutInfo ? statutInfo.label : rdv.statut)
        ];
        return lines.filter(function (l) { return !!l; }).join('\n');
    }

    function buildEventCard(rdv, compact) {
        var link = document.createElement('a');
        var statutInfo = badgeInfo(RDV_STATUSES, rdv.statut);
        var statusClass = statutInfo ? (STATUS_TO_EVENT_CLASS[statutInfo.badgeClass] || 'calendar-event-neutral') : 'calendar-event-neutral';
        link.className = 'calendar-event ' + statusClass;
        link.href = 'fiche-rdv.html?rdv=' + encodeURIComponent(rdv.id);
        link.target = '_blank';
        link.title = rdvTooltip(rdv);

        var topRow = makeEl('span', 'calendar-event-top');
        topRow.appendChild(makeEl('span', 'calendar-event-priority-dot ' + statusClass));
        topRow.appendChild(makeEl('span', 'calendar-event-time', (rdv.heureDebut || '—') + (rdv.heureFin ? '–' + rdv.heureFin : '')));
        link.appendChild(topRow);

        link.appendChild(makeEl('span', 'calendar-event-title', rdv.titre || 'Rendez-vous'));

        var clientNom = clientName(rdv.clientSlug);
        if (clientNom && !compact) {
            link.appendChild(makeEl('span', 'calendar-event-client', clientNom));
        }

        return link;
    }

    function renderTimeColumn(container, startHour, endHour, totalHeight) {
        var col = makeEl('div', 'calendar-time-col');
        col.style.height = totalHeight + 'px';
        for (var h = startHour; h <= endHour; h++) {
            var label = makeEl('span', 'calendar-time-label', pad2(h) + ':00');
            label.style.top = ((h - startHour) * 60 * PX_PER_MIN) + 'px';
            col.appendChild(label);
        }
        container.appendChild(col);
    }

    function renderDayColumn(container, dateObj, startHour, totalHeight, isToday) {
        var col = makeEl('div', 'calendar-day-col' + (isToday ? ' calendar-day-col-today' : ''));
        col.style.height = totalHeight + 'px';
        rdvsForDay(dateObj).forEach(function (rdv) {
            var start = parseHM(rdv.heureDebut);
            if (start === null) {
                return;
            }
            var end = parseHM(rdv.heureFin) || (start + 30);
            var height = Math.max(34, (end - start) * PX_PER_MIN);
            var card = buildEventCard(rdv, height < 46);
            card.style.top = ((start - startHour * 60) * PX_PER_MIN) + 'px';
            card.style.height = height + 'px';
            col.appendChild(card);
        });
        container.appendChild(col);
    }

    function renderSemaine() {
        weekGridEl.innerHTML = '';
        var monday = startOfWeek(refDate);
        var days = [];
        for (var i = 0; i < 7; i++) {
            days.push(addDays(monday, i));
        }
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        weekGridEl.appendChild(makeEl('div', 'calendar-head-cell-empty'));
        days.forEach(function (day) {
            var isToday = sameDay(day, today);
            var cell = makeEl('div', 'calendar-head-cell' + (isToday ? ' calendar-head-cell-today' : ''), DAY_NAMES[(day.getDay() + 6) % 7] + ' ' + pad2(day.getDate()) + '/' + pad2(day.getMonth() + 1));
            weekGridEl.appendChild(cell);
        });

        var range = computeRange(days);
        var totalHeight = (range.endHour - range.startHour) * 60 * PX_PER_MIN;

        renderTimeColumn(weekGridEl, range.startHour, range.endHour, totalHeight);
        days.forEach(function (day) {
            renderDayColumn(weekGridEl, day, range.startHour, totalHeight, sameDay(day, today));
        });
    }

    function renderJour() {
        dayGridEl.innerHTML = '';
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var isToday = sameDay(refDate, today);

        dayGridEl.appendChild(makeEl('div', 'calendar-head-cell-empty'));
        dayGridEl.appendChild(makeEl('div', 'calendar-head-cell' + (isToday ? ' calendar-head-cell-today' : ''), DAY_NAMES[(refDate.getDay() + 6) % 7] + ' ' + formatDateFr(refDate)));

        var range = computeRange([refDate]);
        var totalHeight = (range.endHour - range.startHour) * 60 * PX_PER_MIN;

        renderTimeColumn(dayGridEl, range.startHour, range.endHour, totalHeight);
        renderDayColumn(dayGridEl, refDate, range.startHour, totalHeight, isToday);

        renderDaySummary();
    }

    function makeSummaryRow(label, value) {
        var row = makeEl('div', 'calendar-day-summary-row');
        row.appendChild(makeEl('span', 'calendar-day-summary-label', label));
        row.appendChild(makeEl('span', 'calendar-day-summary-value', value));
        return row;
    }

    function renderDaySummary() {
        if (!daySummaryStatsEl || !daySummaryListsEl) {
            return;
        }
        daySummaryStatsEl.innerHTML = '';
        daySummaryListsEl.innerHTML = '';

        var dayRdvs = rdvsForDay(refDate);
        var nonConfirmes = dayRdvs.filter(function (rdv) {
            return !rdv.communication.confirme && rdv.statut !== 'realise' && rdv.statut !== 'annule' && rdv.statut !== 'sans_suite';
        }).length;
        var devisBrouillon = dayRdvs.filter(function (rdv) {
            var devis = agendaCalc.trouverDevisLie ? agendaCalc.trouverDevisLie(rdv) : null;
            return !!(devis && devis.versions[devis.versions.length - 1].statut === 'brouillon');
        }).length;

        daySummaryStatsEl.appendChild(makeSummaryRow('RDV ce jour', String(dayRdvs.length)));
        daySummaryStatsEl.appendChild(makeSummaryRow('Non confirmés', String(nonConfirmes)));
        daySummaryStatsEl.appendChild(makeSummaryRow('Devis brouillon en attente', String(devisBrouillon)));

        var stats = agendaCalc.computeDashboardStats ? agendaCalc.computeDashboardStats() : null;
        daySummaryListsEl.appendChild(makeEl('h3', null, 'Prochains rendez-vous'));
        if (!stats || stats.rdvProchains.length === 0) {
            daySummaryListsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun rendez-vous à venir.'));
        } else {
            var list = makeEl('div', 'calendar-day-summary-list');
            stats.rdvProchains.slice(0, 3).forEach(function (rdv) {
                var item = document.createElement('a');
                item.className = 'calendar-day-summary-item';
                item.href = 'fiche-rdv.html?rdv=' + encodeURIComponent(rdv.id);
                item.target = '_blank';
                item.textContent = rdv.date + ' · ' + (rdv.heureDebut || '—') + ' — ' + (rdv.titre || 'Rendez-vous');
                list.appendChild(item);
            });
            daySummaryListsEl.appendChild(list);
        }
    }

    function renderMois() {
        monthGridEl.innerHTML = '';
        var firstOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        var gridStart = startOfWeek(firstOfMonth);
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        DAY_NAMES.forEach(function (name) {
            monthGridEl.appendChild(makeEl('div', 'calendar-head-cell', name));
        });

        for (var i = 0; i < 42; i++) {
            (function (day) {
                var isOutside = day.getMonth() !== refDate.getMonth();
                var isToday = sameDay(day, today);
                var cell = makeEl('div', 'calendar-month-cell' + (isOutside ? ' calendar-month-cell-outside' : '') + (isToday ? ' calendar-month-cell-today' : ''));
                cell.appendChild(makeEl('div', 'calendar-month-day-number', String(day.getDate())));

                var dayRdvs = rdvsForDay(day);
                dayRdvs.slice(0, 3).forEach(function (rdv) {
                    var statutInfo = badgeInfo(RDV_STATUSES, rdv.statut);
                    var monthClass = statutInfo ? (STATUS_TO_MONTH_CLASS[statutInfo.badgeClass] || 'calendar-month-event-neutral') : 'calendar-month-event-neutral';
                    var link = document.createElement('a');
                    link.className = 'calendar-month-event ' + monthClass;
                    link.href = 'fiche-rdv.html?rdv=' + encodeURIComponent(rdv.id);
                    link.target = '_blank';
                    link.title = rdvTooltip(rdv);
                    link.textContent = (rdv.heureDebut ? rdv.heureDebut + ' ' : '') + (rdv.titre || 'Rendez-vous');
                    link.addEventListener('click', function (evt) {
                        evt.stopPropagation();
                    });
                    cell.appendChild(link);
                });
                if (dayRdvs.length > 3) {
                    cell.appendChild(makeEl('span', 'calendar-month-more', '+ ' + (dayRdvs.length - 3) + ' autre(s)'));
                }

                cell.addEventListener('click', function () {
                    refDate = new Date(day);
                    setActiveView('jour');
                });

                monthGridEl.appendChild(cell);
            })(addDays(gridStart, i));
        }
    }

    function populateWeekSelectors() {
        var isoInfo = getISOWeekAndYear(refDate);
        weekYearSelectEl.innerHTML = '';
        for (var y = isoInfo.year - 2; y <= isoInfo.year + 2; y++) {
            var yOption = document.createElement('option');
            yOption.value = String(y);
            yOption.textContent = String(y);
            if (y === isoInfo.year) {
                yOption.selected = true;
            }
            weekYearSelectEl.appendChild(yOption);
        }

        weekSelectEl.innerHTML = '';
        for (var w = 1; w <= 53; w++) {
            var monday = dateFromISOWeek(w, isoInfo.year);
            var option = document.createElement('option');
            option.value = String(w);
            option.textContent = 'Semaine ' + w + ' — du ' + formatDateFr(monday) + ' au ' + formatDateFr(addDays(monday, 6));
            if (w === isoInfo.week) {
                option.selected = true;
            }
            weekSelectEl.appendChild(option);
        }
    }

    function populateMonthSelectors() {
        monthYearSelectEl.innerHTML = '';
        for (var y = refDate.getFullYear() - 2; y <= refDate.getFullYear() + 2; y++) {
            var yOption = document.createElement('option');
            yOption.value = String(y);
            yOption.textContent = String(y);
            if (y === refDate.getFullYear()) {
                yOption.selected = true;
            }
            monthYearSelectEl.appendChild(yOption);
        }

        monthSelectEl.innerHTML = '';
        MONTH_NAMES.forEach(function (name, index) {
            var option = document.createElement('option');
            option.value = String(index);
            option.textContent = name;
            if (index === refDate.getMonth()) {
                option.selected = true;
            }
            monthSelectEl.appendChild(option);
        });
    }

    function renderActiveView() {
        datePickerEl.value = toISODate(refDate);
        if (activeView === 'semaine') {
            populateWeekSelectors();
            renderSemaine();
        } else if (activeView === 'jour') {
            renderJour();
        } else if (activeView === 'mois') {
            populateMonthSelectors();
            renderMois();
        }
    }

    function setActiveView(view) {
        activeView = view;
        Array.prototype.forEach.call(tabsEl.querySelectorAll('.page-tab'), function (tab) {
            tab.classList.toggle('page-tab-active', tab.dataset.view === view);
        });
        Object.keys(panels).forEach(function (key) {
            if (panels[key]) {
                panels[key].style.display = key === view ? '' : 'none';
            }
        });
        navToolbarEl.style.display = view === 'liste' ? 'none' : '';
        weekSelectEl.style.display = view === 'semaine' ? '' : 'none';
        weekYearSelectEl.style.display = view === 'semaine' ? '' : 'none';
        monthSelectEl.style.display = view === 'mois' ? '' : 'none';
        monthYearSelectEl.style.display = view === 'mois' ? '' : 'none';
        if (view !== 'liste') {
            renderActiveView();
        }
    }

    Array.prototype.forEach.call(tabsEl.querySelectorAll('.page-tab'), function (tab) {
        tab.addEventListener('click', function () {
            setActiveView(tab.dataset.view);
        });
    });

    prevBtn.addEventListener('click', function () {
        if (activeView === 'jour') {
            refDate = addDays(refDate, -1);
        } else if (activeView === 'mois') {
            refDate = addMonths(refDate, -1);
        } else {
            refDate = addDays(refDate, -7);
        }
        renderActiveView();
    });

    nextBtn.addEventListener('click', function () {
        if (activeView === 'jour') {
            refDate = addDays(refDate, 1);
        } else if (activeView === 'mois') {
            refDate = addMonths(refDate, 1);
        } else {
            refDate = addDays(refDate, 7);
        }
        renderActiveView();
    });

    todayBtn.addEventListener('click', function () {
        refDate = new Date();
        refDate.setHours(0, 0, 0, 0);
        renderActiveView();
    });

    datePickerEl.addEventListener('change', function () {
        var parsed = fromISODate(datePickerEl.value);
        if (parsed) {
            refDate = parsed;
            renderActiveView();
        } else {
            // Valeur incomplète ou hors plage (ex. année à 2 chiffres) : on
            // revient à la date active plutôt que de laisser un champ invalide.
            datePickerEl.value = toISODate(refDate);
        }
    });

    function goToSelectedWeek() {
        var week = parseInt(weekSelectEl.value, 10);
        var year = parseInt(weekYearSelectEl.value, 10);
        if (!isNaN(week) && !isNaN(year)) {
            refDate = dateFromISOWeek(week, year);
            renderActiveView();
        }
    }
    weekSelectEl.addEventListener('change', goToSelectedWeek);
    weekYearSelectEl.addEventListener('change', function () {
        var isoInfo = getISOWeekAndYear(refDate);
        refDate = dateFromISOWeek(isoInfo.week, parseInt(weekYearSelectEl.value, 10));
        renderActiveView();
    });

    function goToSelectedMonth() {
        var month = parseInt(monthSelectEl.value, 10);
        var year = parseInt(monthYearSelectEl.value, 10);
        if (!isNaN(month) && !isNaN(year)) {
            refDate = new Date(year, month, 1);
            renderActiveView();
        }
    }
    monthSelectEl.addEventListener('change', goToSelectedMonth);
    monthYearSelectEl.addEventListener('change', goToSelectedMonth);

    setActiveView('semaine');
})();

// Page Agenda : liste des rendez-vous commerciaux, recherche/filtre/
// pagination (V0.7) via COCKPIT_LIST_PAGINATION (V0.5.4) — même principe que
// Clients/Produits/Devis/Factures : les lignes du tableau sont écrites en dur
// dans agenda.html, cette IIFE calcule seulement les attributs de filtre
// relatifs à la date (aujourd'hui / cette semaine, par rapport à la date du
// jour réelle) puis délègue au helper commun. Le paramètre ?client=slug
// (venant du bloc "Rendez-vous liés" de la fiche client) pré-remplit la
// recherche sur ce client.

(function () {
    var table = document.getElementById('agenda-table');
    var searchInput = document.getElementById('agenda-search');
    var filterSelect = document.getElementById('agenda-filter');
    var resetButton = document.getElementById('agenda-reset-filters');
    var counter = document.getElementById('agenda-counter');
    var pageSizeSelect = document.getElementById('agenda-page-size');
    var prevButton = document.getElementById('agenda-prev-page');
    var nextButton = document.getElementById('agenda-next-page');
    var pageIndicator = document.getElementById('agenda-page-indicator');

    if (!table || !searchInput || !filterSelect || !counter || !pageSizeSelect) {
        return;
    }

    var agendaCalc = window.COCKPIT_AGENDA_CALC || {};
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dayOfWeek = today.getDay();
    var mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    var monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    rows.forEach(function (row) {
        var rowDate = agendaCalc.parseDateFr ? agendaCalc.parseDateFr(row.dataset.date) : null;
        row.dataset.isToday = (rowDate && rowDate.getTime() === today.getTime()) ? '1' : '0';
        row.dataset.isWeek = (rowDate && rowDate >= monday && rowDate <= sunday) ? '1' : '0';
    });

    var params = new URLSearchParams(window.location.search);
    var clientParam = params.get('client');
    if (clientParam) {
        var client = (window.COCKPIT_CLIENT_DETAILS || {})[clientParam];
        searchInput.value = client ? client.nom : clientParam;
    }

    window.COCKPIT_LIST_PAGINATION.init({
        rows: rows,
        searchInput: searchInput,
        filterSelects: [filterSelect],
        resetButton: resetButton,
        counterEl: counter,
        pageSizeSelect: pageSizeSelect,
        prevButton: prevButton,
        nextButton: nextButton,
        pageIndicatorEl: pageIndicator,
        labelSingular: 'rendez-vous',
        labelPlural: 'rendez-vous',
        labelEmpty: 'Aucun rendez-vous trouvé',
        matchRow: function (row, searchValue) {
            var matchesSearch = !searchValue || (row.dataset.search || '').indexOf(searchValue) !== -1;
            var filterValue = filterSelect.value;
            var matchesFilter = true;
            if (filterValue === 'aujourd-hui') {
                matchesFilter = row.dataset.isToday === '1';
            } else if (filterValue === 'cette-semaine') {
                matchesFilter = row.dataset.isWeek === '1';
            } else if (filterValue === 'a-confirmer') {
                matchesFilter = row.dataset.confirmation === 'a-confirmer';
            } else if (filterValue) {
                matchesFilter = row.dataset.status === filterValue;
            }
            return matchesSearch && matchesFilter;
        }
    });
})();

// Page Fiche rendez-vous (V0.7) : création, consultation et modification d'un
// rendez-vous commercial. Sur le même principe que devis-edition.html : mode
// 'new' (aucun ?rdv=) ou 'view' (?rdv=ID). En mode 'view', les actions
// (modales d'édition, actions rapides, devis lié) s'appliquent directement à
// l'objet partagé COCKPIT_RDV_DETAILS[id] : réelles en mémoire de page, comme
// partout ailleurs dans l'application — rien ne survit à un rechargement.
// Règle centrale : un rendez-vous commercial est associé à un devis
// brouillon, auto-créé à la création du rendez-vous dès qu'un client est
// renseigné (sinon un bouton très visible propose de le créer dès qu'un
// client est associé).

(function () {
    var contentEl = document.getElementById('rdv-content');
    var notFoundEl = document.getElementById('rdv-not-found');
    if (!contentEl || !notFoundEl) {
        return;
    }

    var agendaCalc = window.COCKPIT_AGENDA_CALC || {};
    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var RDV_STATUSES = window.COCKPIT_RDV_STATUSES || [];
    var RDV_PRIORITES = window.COCKPIT_RDV_PRIORITES || [];
    var RDV_OPPORTUNITES = window.COCKPIT_RDV_OPPORTUNITES || [];
    var CLIENT_DETAILS = window.COCKPIT_CLIENT_DETAILS || {};
    var DEVIS_STATUSES = window.COCKPIT_DEVIS_STATUSES || [];

    var RDV_HISTORY_TYPES = {
        creation: { label: 'Création', badgeClass: 'badge-neutral' },
        statut: { label: 'Statut', badgeClass: 'badge-info' },
        report: { label: 'Report', badgeClass: 'badge-warning' },
        devis: { label: 'Devis', badgeClass: 'badge-success' },
        communication: { label: 'Communication', badgeClass: 'badge-info' },
        preparation: { label: 'Préparation', badgeClass: 'badge-neutral' },
        modification: { label: 'Modification', badgeClass: 'badge-neutral' }
    };

    var LIEU_FORMATS = [
        { value: 'visio', label: 'Visio' },
        { value: 'sur-place', label: 'Sur place' },
        { value: 'bureau', label: 'Au bureau' },
        { value: 'telephonique', label: 'Téléphonique' },
        { value: 'autre', label: 'Autre' }
    ];
    var LIEU_LEGACY_MAP = {
        'Visioconférence': 'visio',
        'Chez le client': 'sur-place',
        'Téléphone': 'telephonique',
        'Bureau': 'bureau'
    };
    var LIEU_PRECISION_FORMATS = { visio: true, 'sur-place': true, autre: true };

    function parseLieuForEdit(value) {
        if (!value) {
            return { format: 'visio', precision: '' };
        }
        var mapped = LIEU_LEGACY_MAP[value];
        if (mapped) {
            return { format: mapped, precision: '' };
        }
        return { format: 'autre', precision: value };
    }

    function buildLieuValue(format, precision) {
        var info = LIEU_FORMATS.filter(function (f) { return f.value === format; })[0];
        var label = info ? info.label : 'Autre';
        if (format === 'autre') {
            return precision.trim() || 'Autre';
        }
        return precision.trim() ? (label + ' — ' + precision.trim()) : label;
    }

    function buildTimeOptions() {
        var options = [];
        for (var h = 7; h <= 21; h++) {
            for (var m = 0; m < 60; m += 15) {
                if (h === 21 && m > 0) {
                    break;
                }
                options.push(pad2(h) + ':' + pad2(m));
            }
        }
        return options;
    }

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function toISODateRdv(dateFr) {
        var d = agendaCalc.parseDateFr ? agendaCalc.parseDateFr(dateFr) : null;
        if (!d) {
            return '';
        }
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }

    function fromISODateRdv(value) {
        if (!value) {
            return '';
        }
        var parts = value.split('-');
        if (parts.length !== 3) {
            return '';
        }
        var year = parseInt(parts[0], 10);
        // Même garde-fou que sur l'agenda : ignore une année incomplète/hors
        // plage plutôt que d'enregistrer une date visiblement erronée.
        if (isNaN(year) || year < 2000 || year > 2099) {
            return '';
        }
        return pad2(parseInt(parts[2], 10)) + '/' + pad2(parseInt(parts[1], 10)) + '/' + year;
    }

    var clientSearchOutsideClickHandler = null;

    var mode = 'view';
    var rdv = null;

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

    function findInfo(list, value) {
        return list.filter(function (item) {
            return item.value === value;
        })[0] || null;
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = (value === '' || value === null || value === undefined) ? '—' : value;
        }
    }

    function makeLabel(text, forId) {
        var label = document.createElement('label');
        label.className = 'modal-label';
        label.textContent = text;
        if (forId) {
            label.setAttribute('for', forId);
        }
        return label;
    }

    function defaultRdv() {
        return {
            id: null,
            titre: '',
            date: '',
            heureDebut: '',
            heureFin: '',
            clientSlug: null,
            lieu: '',
            statut: 'prevu',
            priorite: 'normale',
            opportunite: 'moyen',
            montantPotentiel: null,
            notesInternes: '',
            preparation: {
                contexteBesoin: '', notesDiverses: '', propositionEnvisagee: '',
                prixCible: null, prixMinimum: null,
                argumentsCommerciaux: '', objectionsPossibles: '', prochainesEtapes: ''
            },
            communication: {
                confirme: false, rappelsEffectues: 0, relances: 0,
                dateDerniereCommunication: null, prochaineCommunicationPrevue: null, commentaireSuivi: ''
            },
            propositionCommerciale: { produits: [], remiseMaxPourcent: 0 },
            devisRef: null,
            historique: []
        };
    }

    function loadFromParams() {
        var params = new URLSearchParams(window.location.search);
        var rdvParam = params.get('rdv');
        if (rdvParam) {
            var existing = (window.COCKPIT_RDV_DETAILS || {})[rdvParam];
            if (!existing) {
                return false;
            }
            mode = 'view';
            rdv = existing;
            return true;
        }
        mode = 'new';
        rdv = defaultRdv();
        return true;
    }

    var titreHeadingEl = document.getElementById('rdv-titre-heading');
    var statusBadgeEl = document.getElementById('rdv-status-badge');
    var prioriteBadgeEl = document.getElementById('rdv-priorite-badge');
    var opportuniteBadgeEl = document.getElementById('rdv-opportunite-badge');
    var clientLinkEl = document.getElementById('rdv-client-link');
    var datetimeEl = document.getElementById('rdv-datetime');
    var lieuEl = document.getElementById('rdv-lieu');
    var montantPotentielEl = document.getElementById('rdv-montant-potentiel');
    var notesInternesEl = document.getElementById('rdv-notes-internes');
    var createBtn = document.getElementById('rdv-create-btn');
    var editHeaderBtn = document.getElementById('rdv-edit-header-btn');
    var deleteBtn = document.getElementById('rdv-delete-btn');
    var pdfBtn = document.getElementById('rdv-pdf-btn');

    function renderHeader() {
        titreHeadingEl.textContent = rdv.titre || 'Nouveau rendez-vous';

        var statusInfo = findInfo(RDV_STATUSES, rdv.statut);
        statusBadgeEl.textContent = statusInfo ? statusInfo.label : rdv.statut;
        statusBadgeEl.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');
        statusBadgeEl.style.display = mode === 'new' ? 'none' : '';

        var prioriteInfo = findInfo(RDV_PRIORITES, rdv.priorite);
        prioriteBadgeEl.textContent = prioriteInfo ? prioriteInfo.label : rdv.priorite;
        prioriteBadgeEl.className = 'badge ' + (prioriteInfo ? prioriteInfo.badgeClass : 'badge-neutral');
        prioriteBadgeEl.style.display = mode === 'new' ? 'none' : '';

        var opportuniteInfo = findInfo(RDV_OPPORTUNITES, rdv.opportunite);
        opportuniteBadgeEl.textContent = opportuniteInfo ? opportuniteInfo.label : rdv.opportunite;
        opportuniteBadgeEl.className = 'badge ' + (opportuniteInfo ? opportuniteInfo.badgeClass : 'badge-neutral');
        opportuniteBadgeEl.style.display = mode === 'new' ? 'none' : '';

        var reportedBadge = document.getElementById('rdv-reported-badge');
        if (mode === 'view' && agendaCalc.estReportePlusieursFois && agendaCalc.estReportePlusieursFois(rdv)) {
            var reportedText = 'Reporté ' + agendaCalc.compterReports(rdv) + ' fois';
            if (!reportedBadge) {
                reportedBadge = makeEl('span', 'badge badge-warning', reportedText);
                reportedBadge.id = 'rdv-reported-badge';
                statusBadgeEl.parentNode.appendChild(reportedBadge);
            } else {
                reportedBadge.textContent = reportedText;
            }
        } else if (reportedBadge) {
            reportedBadge.remove();
        }

        if (rdv.clientSlug && CLIENT_DETAILS[rdv.clientSlug]) {
            clientLinkEl.textContent = CLIENT_DETAILS[rdv.clientSlug].nom;
            clientLinkEl.href = 'fiche-client.html?client=' + encodeURIComponent(rdv.clientSlug);
        } else {
            clientLinkEl.textContent = 'Aucun client associé';
            clientLinkEl.href = '#';
        }

        datetimeEl.textContent = rdv.date
            ? (rdv.date + (rdv.heureDebut ? ' · ' + rdv.heureDebut + (rdv.heureFin ? '–' + rdv.heureFin : '') : ''))
            : '—';
        lieuEl.textContent = rdv.lieu || '—';
        montantPotentielEl.textContent = (rdv.montantPotentiel !== null && rdv.montantPotentiel !== undefined && devisCalc)
            ? devisCalc.formatMoney(rdv.montantPotentiel) : '—';
        notesInternesEl.textContent = rdv.notesInternes || '—';

        createBtn.style.display = mode === 'new' ? '' : 'none';
        editHeaderBtn.style.display = mode === 'new' ? 'none' : '';
        deleteBtn.style.display = mode === 'new' ? 'none' : '';
        pdfBtn.style.display = mode === 'new' ? 'none' : '';
        if (mode === 'view') {
            pdfBtn.href = 'rdv-document.html?rdv=' + encodeURIComponent(rdv.id);
        }
    }

    function renderPreparation() {
        setText('prep-contexte', rdv.preparation.contexteBesoin);
        setText('prep-notes', rdv.preparation.notesDiverses);
        setText('prep-proposition', rdv.preparation.propositionEnvisagee);
        setText('prep-prix-cible', (rdv.preparation.prixCible !== null && rdv.preparation.prixCible !== undefined)
            ? devisCalc.formatMoney(rdv.preparation.prixCible) : null);
        setText('prep-prix-minimum', (rdv.preparation.prixMinimum !== null && rdv.preparation.prixMinimum !== undefined)
            ? devisCalc.formatMoney(rdv.preparation.prixMinimum) : null);
        var margeValue = (rdv.preparation.prixCible !== null && rdv.preparation.prixCible !== undefined &&
            rdv.preparation.prixMinimum !== null && rdv.preparation.prixMinimum !== undefined)
            ? devisCalc.formatMoney(rdv.preparation.prixCible - rdv.preparation.prixMinimum) : null;
        setText('prep-marge', margeValue);
        setText('prep-arguments', rdv.preparation.argumentsCommerciaux);
        setText('prep-objections', rdv.preparation.objectionsPossibles);
        setText('prep-etapes', rdv.preparation.prochainesEtapes);
    }

    function renderCommunication() {
        setText('comm-confirme', rdv.communication.confirme ? 'Confirmé' : 'À confirmer');
        setText('comm-rappels', String(rdv.communication.rappelsEffectues || 0));
        setText('comm-relances', String(rdv.communication.relances || 0));
        setText('comm-derniere', rdv.communication.dateDerniereCommunication);
        setText('comm-prochaine', rdv.communication.prochaineCommunicationPrevue);
        setText('comm-commentaire', rdv.communication.commentaireSuivi);
    }

    function renderHistorique() {
        var list = document.getElementById('rdv-history-list');
        list.innerHTML = '';
        var events = (rdv.historique || []).slice().reverse();
        if (events.length === 0) {
            list.appendChild(makeEl('p', 'empty-state-inline', 'Aucun historique pour ce rendez-vous.'));
            return;
        }
        events.forEach(function (event) {
            var typeInfo = RDV_HISTORY_TYPES[event.type] || { label: event.type, badgeClass: 'badge-neutral' };
            var item = makeEl('div', 'history-item');
            item.appendChild(makeEl('div', 'history-date', event.date + ' · ' + event.heure));
            item.appendChild(makeEl('span', 'badge ' + typeInfo.badgeClass, typeInfo.label));
            item.appendChild(makeEl('p', 'history-resume', event.description));
            item.appendChild(makeEl('span', 'history-author', event.auteur));
            list.appendChild(item);
        });
    }

    function findLinkedFactureKey(numero) {
        var FACTURE_DETAILS = window.COCKPIT_FACTURE_DETAILS || {};
        return Object.keys(FACTURE_DETAILS).filter(function (key) {
            var f = FACTURE_DETAILS[key];
            return f.devisRef && f.devisRef.numero === numero;
        })[0] || null;
    }

    function openDeleteDevisBrouillonModal() {
        var body = makeEl('p', 'modal-text', 'Voulez-vous vraiment supprimer ce devis brouillon ? Cette action ne peut pas être annulée.');

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.setAttribute('data-modal-autofocus', 'true');
        cancelButton.textContent = 'Annuler';

        var confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'btn-danger';
        confirmButton.setAttribute('data-modal-close', 'true');
        confirmButton.textContent = 'Supprimer';
        confirmButton.addEventListener('click', function () {
            agendaCalc.supprimerDevisBrouillonLie(rdv);
            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        window.COCKPIT_MODAL.open({ title: 'Supprimer le devis brouillon', body: body, footer: footer });
    }

    function openMissingClientModal() {
        var body = makeEl('p', 'modal-text', 'Associez un client à ce rendez-vous avant de créer le devis brouillon lié.');
        var closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-secondary';
        closeButton.setAttribute('data-modal-close', 'true');
        closeButton.setAttribute('data-modal-autofocus', 'true');
        closeButton.textContent = 'Fermer';
        window.COCKPIT_MODAL.open({ title: 'Client requis', body: body, footer: closeButton });
    }

    function renderDevisLie() {
        var container = document.getElementById('rdv-devis-content');
        container.innerHTML = '';

        if (mode === 'new') {
            container.appendChild(makeEl('p', 'empty-state-inline', 'Le devis brouillon lié sera proposé une fois le rendez-vous créé.'));
            return;
        }

        var devis = agendaCalc.trouverDevisLie(rdv);

        if (!devis) {
            container.appendChild(makeEl('p', 'empty-state-inline', 'Aucun devis lié à ce rendez-vous pour le moment.'));
            var createDevisBtn = document.createElement('button');
            createDevisBtn.type = 'button';
            createDevisBtn.className = 'btn-primary';
            createDevisBtn.textContent = 'Créer le devis brouillon lié';
            createDevisBtn.addEventListener('click', function () {
                if (!rdv.clientSlug) {
                    openMissingClientModal();
                    return;
                }
                agendaCalc.creerDevisBrouillonPourRdv(rdv);
                renderAll();
            });
            container.appendChild(createDevisBtn);
            return;
        }

        var versionActive = devis.versions[devis.versions.length - 1];
        var totals = devisCalc.computeDevisTotals(versionActive.lignes);
        var statusInfo = findInfo(DEVIS_STATUSES, versionActive.statut);

        var summary = makeEl('div', 'devis-summary');
        var row1 = makeEl('div', 'devis-summary-row');
        row1.appendChild(makeEl('span', null, 'Devis'));
        var numeroWrap = document.createElement('span');
        numeroWrap.appendChild(document.createTextNode(devis.numero + ' '));
        numeroWrap.appendChild(makeEl('span', 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral'), statusInfo ? statusInfo.label : versionActive.statut));
        row1.appendChild(numeroWrap);
        summary.appendChild(row1);

        var row2 = makeEl('div', 'devis-summary-row');
        row2.appendChild(makeEl('span', null, 'Montant TTC'));
        row2.appendChild(makeEl('span', null, devisCalc.formatMoney(totals.totalTTC)));
        summary.appendChild(row2);
        container.appendChild(summary);

        var actions = makeEl('div', 'page-toolbar');
        actions.style.justifyContent = 'flex-start';

        var viewLink = document.createElement('a');
        viewLink.className = 'btn-table-action';
        viewLink.textContent = 'Voir le devis';
        viewLink.target = '_blank';
        viewLink.href = 'devis-edition.html?devis=' + encodeURIComponent(devis.numero) + '&version=' + versionActive.version +
            (rdv.clientSlug ? '&client=' + encodeURIComponent(rdv.clientSlug) : '');
        actions.appendChild(viewLink);

        var docLink = document.createElement('a');
        docLink.className = 'table-action-secondary';
        docLink.textContent = 'Aperçu / imprimer';
        docLink.target = '_blank';
        docLink.href = 'devis-document.html?devis=' + encodeURIComponent(devis.numero) + '&version=' + versionActive.version;
        actions.appendChild(docLink);

        var factureKey = findLinkedFactureKey(devis.numero);
        if (factureKey) {
            var factureLink = document.createElement('a');
            factureLink.className = 'table-action-secondary';
            factureLink.textContent = 'Voir la facture';
            factureLink.target = '_blank';
            factureLink.href = 'facture-edition.html?facture=' + encodeURIComponent(factureKey);
            actions.appendChild(factureLink);
        } else if (agendaCalc.peutSupprimerDevisBrouillonLie(rdv)) {
            var deleteDevisBtn = document.createElement('button');
            deleteDevisBtn.type = 'button';
            deleteDevisBtn.className = 'btn-danger';
            deleteDevisBtn.textContent = 'Supprimer le devis brouillon';
            deleteDevisBtn.addEventListener('click', openDeleteDevisBrouillonModal);
            actions.appendChild(deleteDevisBtn);
        }

        container.appendChild(actions);
    }

    function renderAll() {
        renderHeader();
        renderPreparation();
        renderCommunication();
        renderHistorique();
        renderDevisLie();
    }

    function openEditHeaderModal() {
        var body = document.createElement('div');
        var lieuParsed = parseLieuForEdit(rdv.lieu);
        var timeOptions = buildTimeOptions();
        var proposition = rdv.propositionCommerciale || { produits: [], remiseMaxPourcent: 0 };
        var selectedProductState = {};
        proposition.produits.forEach(function (p) {
            selectedProductState[p.slug] = p.quantite;
        });

        if (clientSearchOutsideClickHandler) {
            document.removeEventListener('click', clientSearchOutsideClickHandler);
            clientSearchOutsideClickHandler = null;
        }

        // --- Section 1 : Informations du rendez-vous ---
        var infoSection = makeEl('div', 'modal-section');
        infoSection.appendChild(makeEl('p', 'document-section-title', 'Informations du rendez-vous'));

        infoSection.appendChild(makeLabel('Titre', 'rdv-form-titre'));
        var titreInput = document.createElement('input');
        titreInput.type = 'text';
        titreInput.id = 'rdv-form-titre';
        titreInput.className = 'modal-input';
        titreInput.value = rdv.titre || '';
        infoSection.appendChild(titreInput);

        var grid = makeEl('div', 'form-grid-2');
        var dateWrap = document.createElement('div');
        dateWrap.appendChild(makeLabel('Date', 'rdv-form-date'));
        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'rdv-form-date';
        dateInput.className = 'modal-input';
        dateInput.min = '2000-01-01';
        dateInput.max = '2099-12-31';
        dateInput.value = toISODateRdv(rdv.date);
        dateWrap.appendChild(dateInput);
        grid.appendChild(dateWrap);

        var lieuWrap = document.createElement('div');
        lieuWrap.appendChild(makeLabel('Lieu / format', 'rdv-form-lieu'));
        var lieuSelect = document.createElement('select');
        lieuSelect.id = 'rdv-form-lieu';
        lieuSelect.className = 'modal-select';
        LIEU_FORMATS.forEach(function (f) {
            var option = document.createElement('option');
            option.value = f.value;
            option.textContent = f.label;
            if (f.value === lieuParsed.format) {
                option.selected = true;
            }
            lieuSelect.appendChild(option);
        });
        lieuWrap.appendChild(lieuSelect);
        grid.appendChild(lieuWrap);
        infoSection.appendChild(grid);

        var precisionWrap = document.createElement('div');
        precisionWrap.style.marginTop = '10px';
        precisionWrap.appendChild(makeLabel('Précision du lieu (adresse, lien visio...)', 'rdv-form-lieu-precision'));
        var precisionInput = document.createElement('input');
        precisionInput.type = 'text';
        precisionInput.id = 'rdv-form-lieu-precision';
        precisionInput.className = 'modal-input';
        precisionInput.value = lieuParsed.precision || '';
        precisionWrap.appendChild(precisionInput);
        infoSection.appendChild(precisionWrap);

        function updatePrecisionVisibility() {
            precisionWrap.style.display = LIEU_PRECISION_FORMATS[lieuSelect.value] ? '' : 'none';
        }
        lieuSelect.addEventListener('change', updatePrecisionVisibility);
        updatePrecisionVisibility();

        var grid2 = makeEl('div', 'form-grid-2');
        grid2.style.marginTop = '10px';
        var debutWrap = document.createElement('div');
        debutWrap.appendChild(makeLabel('Heure de début', 'rdv-form-heure-debut'));
        var debutSelect = document.createElement('select');
        debutSelect.id = 'rdv-form-heure-debut';
        debutSelect.className = 'modal-select';
        var debutOptions = timeOptions.slice();
        if (rdv.heureDebut && debutOptions.indexOf(rdv.heureDebut) === -1) {
            debutOptions.push(rdv.heureDebut);
            debutOptions.sort();
        }
        debutOptions.forEach(function (t) {
            var option = document.createElement('option');
            option.value = t;
            option.textContent = t;
            if (t === rdv.heureDebut) {
                option.selected = true;
            }
            debutSelect.appendChild(option);
        });
        debutWrap.appendChild(debutSelect);
        grid2.appendChild(debutWrap);

        var finWrap = document.createElement('div');
        finWrap.appendChild(makeLabel('Heure de fin', 'rdv-form-heure-fin'));
        var finSelect = document.createElement('select');
        finSelect.id = 'rdv-form-heure-fin';
        finSelect.className = 'modal-select';
        var finOptions = timeOptions.slice();
        if (rdv.heureFin && finOptions.indexOf(rdv.heureFin) === -1) {
            finOptions.push(rdv.heureFin);
            finOptions.sort();
        }
        finOptions.forEach(function (t) {
            var option = document.createElement('option');
            option.value = t;
            option.textContent = t;
            if (t === rdv.heureFin) {
                option.selected = true;
            }
            finSelect.appendChild(option);
        });
        finWrap.appendChild(finSelect);
        grid2.appendChild(finWrap);
        infoSection.appendChild(grid2);

        var grid3 = makeEl('div', 'form-grid-2');
        grid3.style.marginTop = '10px';
        var prioriteWrap = document.createElement('div');
        prioriteWrap.appendChild(makeLabel('Priorité', 'rdv-form-priorite'));
        var prioriteSelect = document.createElement('select');
        prioriteSelect.id = 'rdv-form-priorite';
        prioriteSelect.className = 'modal-select';
        RDV_PRIORITES.forEach(function (p) {
            var option = document.createElement('option');
            option.value = p.value;
            option.textContent = p.label;
            if (p.value === rdv.priorite) {
                option.selected = true;
            }
            prioriteSelect.appendChild(option);
        });
        prioriteWrap.appendChild(prioriteSelect);
        grid3.appendChild(prioriteWrap);

        var opportuniteWrap = document.createElement('div');
        opportuniteWrap.appendChild(makeLabel('Opportunité', 'rdv-form-opportunite'));
        var opportuniteSelect = document.createElement('select');
        opportuniteSelect.id = 'rdv-form-opportunite';
        opportuniteSelect.className = 'modal-select';
        RDV_OPPORTUNITES.forEach(function (o) {
            var option = document.createElement('option');
            option.value = o.value;
            option.textContent = o.label;
            if (o.value === rdv.opportunite) {
                option.selected = true;
            }
            opportuniteSelect.appendChild(option);
        });
        opportuniteWrap.appendChild(opportuniteSelect);
        grid3.appendChild(opportuniteWrap);
        infoSection.appendChild(grid3);

        body.appendChild(infoSection);

        // --- Section 2 : Client ---
        var clientSection = makeEl('div', 'modal-section');
        clientSection.appendChild(makeEl('p', 'document-section-title', 'Client'));

        var searchWrap = document.createElement('div');
        searchWrap.className = 'client-search';

        var clientSearchInput = document.createElement('input');
        clientSearchInput.type = 'text';
        clientSearchInput.className = 'modal-input';
        clientSearchInput.placeholder = 'Rechercher un client (nom, société, tél., e-mail, adresse)...';
        clientSearchInput.setAttribute('aria-label', 'Rechercher un client');

        var selectedClientSlug = rdv.clientSlug || null;
        if (selectedClientSlug && CLIENT_DETAILS[selectedClientSlug]) {
            clientSearchInput.value = CLIENT_DETAILS[selectedClientSlug].nom;
        }

        var resultsEl = document.createElement('div');
        resultsEl.className = 'client-search-results';
        resultsEl.style.display = 'none';

        var selectedClientInfoEl = document.createElement('div');
        selectedClientInfoEl.style.marginTop = '8px';

        function renderSelectedClientInfo() {
            selectedClientInfoEl.innerHTML = '';
            if (!selectedClientSlug || !CLIENT_DETAILS[selectedClientSlug]) {
                selectedClientInfoEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client sélectionné.'));
                return;
            }
            var c = CLIENT_DETAILS[selectedClientSlug];
            selectedClientInfoEl.appendChild(makeEl('p', 'document-party-name', c.nom));
            [(c.entreprise && c.entreprise !== '—') ? c.entreprise : null, c.adresse, c.telephone, c.email].forEach(function (line) {
                if (line) {
                    selectedClientInfoEl.appendChild(makeEl('p', null, line));
                }
            });
        }

        function matchesQuery(client, query) {
            var haystack = [client.nom, client.entreprise, client.telephone, client.email, client.adresse]
                .filter(function (v) { return !!v; }).join(' ').toLowerCase();
            return haystack.indexOf(query) !== -1;
        }

        function renderClientResults() {
            var query = clientSearchInput.value.trim().toLowerCase();
            resultsEl.innerHTML = '';
            if (!query) {
                resultsEl.style.display = 'none';
                return;
            }
            var matches = Object.keys(CLIENT_DETAILS).filter(function (slug) {
                return matchesQuery(CLIENT_DETAILS[slug], query);
            });
            if (matches.length === 0) {
                resultsEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client trouvé.'));
            } else {
                matches.forEach(function (slug) {
                    var client = CLIENT_DETAILS[slug];
                    var item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'client-search-result-item';
                    item.appendChild(makeEl('span', 'client-search-result-name', client.nom + (client.entreprise && client.entreprise !== '—' ? ' — ' + client.entreprise : '')));
                    item.appendChild(makeEl('span', 'client-search-result-detail', [client.telephone, client.email, client.adresse].filter(function (v) { return !!v; }).join(' · ')));
                    item.addEventListener('click', function () {
                        selectedClientSlug = slug;
                        clientSearchInput.value = client.nom;
                        resultsEl.innerHTML = '';
                        resultsEl.style.display = 'none';
                        renderSelectedClientInfo();
                    });
                    resultsEl.appendChild(item);
                });
            }
            resultsEl.style.display = '';
        }

        clientSearchInput.addEventListener('input', renderClientResults);
        clientSearchInput.addEventListener('focus', renderClientResults);

        clientSearchOutsideClickHandler = function (evt) {
            if (!searchWrap.contains(evt.target)) {
                resultsEl.style.display = 'none';
            }
        };
        document.addEventListener('click', clientSearchOutsideClickHandler);

        searchWrap.appendChild(clientSearchInput);
        searchWrap.appendChild(resultsEl);
        clientSection.appendChild(searchWrap);
        clientSection.appendChild(selectedClientInfoEl);
        renderSelectedClientInfo();

        body.appendChild(clientSection);

        // --- Section 3 : Proposition commerciale ---
        var propositionSection = makeEl('div', 'modal-section');
        propositionSection.appendChild(makeEl('p', 'document-section-title', 'Proposition commerciale'));

        propositionSection.appendChild(makeLabel('Montant potentiel estimé (€)', 'rdv-form-montant'));
        var montantInput = document.createElement('input');
        montantInput.type = 'number';
        montantInput.id = 'rdv-form-montant';
        montantInput.className = 'modal-input';
        montantInput.value = (rdv.montantPotentiel !== null && rdv.montantPotentiel !== undefined) ? rdv.montantPotentiel : '';
        propositionSection.appendChild(montantInput);

        var productsLabel = makeEl('p', 'modal-label', 'Produits / services à proposer');
        productsLabel.style.marginTop = '12px';
        propositionSection.appendChild(productsLabel);

        var productDetails = window.COCKPIT_PRODUCT_DETAILS || {};
        var activeSlugs = Object.keys(productDetails).filter(function (slug) {
            return productDetails[slug].statut === 'actif';
        });

        var summaryEl = makeEl('div', 'proposition-summary');

        var remiseWrap = document.createElement('div');
        remiseWrap.style.marginTop = '10px';
        remiseWrap.appendChild(makeLabel('Remise maximum acceptée (%)', 'rdv-form-remise'));
        var remiseInput = document.createElement('input');
        remiseInput.type = 'number';
        remiseInput.id = 'rdv-form-remise';
        remiseInput.className = 'modal-input';
        remiseInput.min = '0';
        remiseInput.max = '100';
        remiseInput.value = proposition.remiseMaxPourcent || 0;
        remiseWrap.appendChild(remiseInput);

        if (activeSlugs.length === 0) {
            propositionSection.appendChild(makeEl('p', 'empty-state-inline', 'Aucun produit/service actif dans le catalogue.'));
        } else {
            var productsListEl = document.createElement('div');
            activeSlugs.forEach(function (slug) {
                var product = productDetails[slug];
                var row = makeEl('div', 'proposition-product-row');
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !!selectedProductState[slug];
                var qtyInput = document.createElement('input');
                qtyInput.type = 'number';
                qtyInput.className = 'proposition-product-qty';
                qtyInput.min = '1';
                qtyInput.value = selectedProductState[slug] || 1;
                qtyInput.disabled = !checkbox.checked;

                checkbox.addEventListener('change', function () {
                    qtyInput.disabled = !checkbox.checked;
                    if (checkbox.checked) {
                        selectedProductState[slug] = parseInt(qtyInput.value, 10) || 1;
                    } else {
                        delete selectedProductState[slug];
                    }
                    recomputeProposition();
                });
                qtyInput.addEventListener('input', function () {
                    if (checkbox.checked) {
                        selectedProductState[slug] = parseInt(qtyInput.value, 10) || 1;
                        recomputeProposition();
                    }
                });

                row.appendChild(checkbox);
                row.appendChild(makeEl('span', 'proposition-product-name', product.nom + ' — ' + devisCalc.formatMoney(product.prixHT) + ' HT'));
                row.appendChild(qtyInput);
                productsListEl.appendChild(row);
            });
            propositionSection.appendChild(productsListEl);
        }

        propositionSection.appendChild(remiseWrap);
        propositionSection.appendChild(summaryEl);

        var useAmountBtn = document.createElement('button');
        useAmountBtn.type = 'button';
        useAmountBtn.className = 'btn-secondary';
        useAmountBtn.style.marginTop = '10px';
        useAmountBtn.textContent = 'Utiliser ce montant comme montant potentiel estimé';
        propositionSection.appendChild(useAmountBtn);

        var lastComputedTotal = null;

        function recomputeProposition() {
            var remisePourcent = Math.max(0, Math.min(100, parseFloat(remiseInput.value) || 0));

            var lignes = Object.keys(selectedProductState).map(function (slug) {
                var product = productDetails[slug];
                return {
                    designation: product.nom,
                    quantite: selectedProductState[slug],
                    prixUnitaireHT: product.prixHT,
                    tauxTVA: product.tva,
                    remisePourcent: remisePourcent
                };
            });

            summaryEl.innerHTML = '';
            if (lignes.length === 0) {
                summaryEl.appendChild(makeEl('p', 'empty-state-inline', 'Sélectionnez un ou plusieurs produits/services pour estimer un montant.'));
                lastComputedTotal = null;
                return;
            }

            var totals = devisCalc.computeDevisTotals(lignes);
            function addRow(label, value) {
                var row = makeEl('div', 'devis-summary-row');
                row.appendChild(makeEl('span', null, label));
                row.appendChild(makeEl('span', null, value));
                summaryEl.appendChild(row);
            }
            // Mêmes libellés et même logique que le récapitulatif devis/facture
            // (COCKPIT_DEVIS_CALC.computeDevisTotals) : TVA toujours affichée,
            // par ligne selon le taux propre à chaque produit/service — aucune
            // condition d'assujettissement de l'entreprise, cohérent avec le
            // fonctionnement existant des devis et factures.
            addRow('Total HT avant remise', devisCalc.formatMoney(totals.totalBrutHT));
            addRow('Remises', (totals.totalRemises > 0 ? '- ' : '') + devisCalc.formatMoney(totals.totalRemises));
            addRow('Total HT net', devisCalc.formatMoney(totals.totalHT));
            addRow('Total TVA', devisCalc.formatMoney(totals.totalTVA));
            var ttcRow = makeEl('div', 'devis-summary-row devis-summary-row-total');
            ttcRow.appendChild(makeEl('span', null, 'Total TTC'));
            ttcRow.appendChild(makeEl('span', null, devisCalc.formatMoney(totals.totalTTC)));
            summaryEl.appendChild(ttcRow);
            lastComputedTotal = totals.totalTTC;
        }

        remiseInput.addEventListener('input', recomputeProposition);
        useAmountBtn.addEventListener('click', function () {
            if (lastComputedTotal !== null) {
                montantInput.value = lastComputedTotal;
            }
        });
        recomputeProposition();

        body.appendChild(propositionSection);

        // --- Section 4 : Notes ---
        var notesSection = makeEl('div', 'modal-section');
        notesSection.appendChild(makeEl('p', 'document-section-title', 'Notes'));
        notesSection.appendChild(makeLabel('Notes internes', 'rdv-form-notes'));
        var notesTextarea = document.createElement('textarea');
        notesTextarea.id = 'rdv-form-notes';
        notesTextarea.className = 'modal-textarea';
        notesTextarea.rows = 3;
        notesTextarea.value = rdv.notesInternes || '';
        notesSection.appendChild(notesTextarea);
        body.appendChild(notesSection);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.textContent = mode === 'new' ? 'Créer le rendez-vous' : 'Enregistrer';

        saveButton.addEventListener('click', function () {
            var oldDate = rdv.date;
            var oldHeureDebut = rdv.heureDebut;
            var oldHeureFin = rdv.heureFin;
            var oldStatut = rdv.statut;
            var wasNew = mode === 'new';

            rdv.titre = titreInput.value.trim() || 'Rendez-vous sans titre';
            rdv.date = fromISODateRdv(dateInput.value) || rdv.date;
            rdv.heureDebut = debutSelect.value;
            rdv.heureFin = finSelect.value;
            rdv.lieu = buildLieuValue(lieuSelect.value, precisionInput.value);
            rdv.clientSlug = selectedClientSlug;
            rdv.priorite = prioriteSelect.value;
            rdv.opportunite = opportuniteSelect.value;
            var montantValue = parseFloat(montantInput.value);
            rdv.montantPotentiel = isNaN(montantValue) ? null : montantValue;
            rdv.notesInternes = notesTextarea.value.trim();
            rdv.propositionCommerciale = {
                produits: Object.keys(selectedProductState).map(function (slug) {
                    return { slug: slug, quantite: selectedProductState[slug] };
                }),
                remiseMaxPourcent: Math.max(0, Math.min(100, parseFloat(remiseInput.value) || 0))
            };

            if (wasNew) {
                rdv.id = agendaCalc.computeNextRdvId();
                window.COCKPIT_RDV_DETAILS[rdv.id] = rdv;
                agendaCalc.pushHistorique(rdv, 'creation', 'Rendez-vous créé.');
                if (rdv.clientSlug) {
                    agendaCalc.creerDevisBrouillonPourRdv(rdv);
                }
                mode = 'view';
            } else {
                if (oldDate !== rdv.date) {
                    agendaCalc.pushHistorique(rdv, 'modification', 'Date modifiée de ' + (oldDate || '—') + ' à ' + (rdv.date || '—') + '.');
                }
                if (oldHeureDebut !== rdv.heureDebut || oldHeureFin !== rdv.heureFin) {
                    agendaCalc.pushHistorique(rdv, 'modification', 'Horaire modifié.');
                }
                if (oldStatut !== rdv.statut) {
                    agendaCalc.pushHistorique(rdv, 'statut', 'Statut modifié.');
                }
            }

            if (agendaCalc.appliquerPropositionCommerciale && agendaCalc.appliquerPropositionCommerciale(rdv)) {
                agendaCalc.pushHistorique(rdv, 'devis', 'Devis brouillon mis à jour depuis la proposition commerciale du rendez-vous.');
            }

            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({
            title: mode === 'new' ? 'Créer un rendez-vous' : 'Modifier les informations',
            body: body,
            footer: footer
        });
    }

    function addModalTextarea(body, labelText, id, value, rows) {
        body.appendChild(makeLabel(labelText, id));
        var textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.className = 'modal-textarea';
        textarea.rows = rows || 2;
        textarea.value = value || '';
        body.appendChild(textarea);
        return textarea;
    }

    function openEditPreparationModal() {
        var body = document.createElement('div');

        var contexteTa = addModalTextarea(body, 'Contexte du besoin', 'prep-form-contexte', rdv.preparation.contexteBesoin, 2);
        var notesTa = addModalTextarea(body, 'Notes diverses', 'prep-form-notes', rdv.preparation.notesDiverses, 2);
        var propositionTa = addModalTextarea(body, 'Proposition envisagée', 'prep-form-proposition', rdv.preparation.propositionEnvisagee, 2);

        var grid = makeEl('div', 'form-grid-2');
        var prixCibleWrap = document.createElement('div');
        prixCibleWrap.appendChild(makeLabel('Prix cible (€)', 'prep-form-prix-cible'));
        var prixCibleInput = document.createElement('input');
        prixCibleInput.type = 'number';
        prixCibleInput.id = 'prep-form-prix-cible';
        prixCibleInput.className = 'modal-input';
        prixCibleInput.value = (rdv.preparation.prixCible !== null && rdv.preparation.prixCible !== undefined) ? rdv.preparation.prixCible : '';
        prixCibleWrap.appendChild(prixCibleInput);
        grid.appendChild(prixCibleWrap);

        var prixMinWrap = document.createElement('div');
        prixMinWrap.appendChild(makeLabel('Prix minimum acceptable (€)', 'prep-form-prix-min'));
        var prixMinInput = document.createElement('input');
        prixMinInput.type = 'number';
        prixMinInput.id = 'prep-form-prix-min';
        prixMinInput.className = 'modal-input';
        prixMinInput.value = (rdv.preparation.prixMinimum !== null && rdv.preparation.prixMinimum !== undefined) ? rdv.preparation.prixMinimum : '';
        prixMinWrap.appendChild(prixMinInput);
        grid.appendChild(prixMinWrap);
        body.appendChild(grid);

        var argumentsTa = addModalTextarea(body, 'Arguments commerciaux', 'prep-form-arguments', rdv.preparation.argumentsCommerciaux, 2);
        var objectionsTa = addModalTextarea(body, 'Objections possibles', 'prep-form-objections', rdv.preparation.objectionsPossibles, 2);
        var etapesTa = addModalTextarea(body, 'Prochaines étapes prévues', 'prep-form-etapes', rdv.preparation.prochainesEtapes, 2);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.textContent = 'Enregistrer';
        saveButton.addEventListener('click', function () {
            rdv.preparation.contexteBesoin = contexteTa.value.trim();
            rdv.preparation.notesDiverses = notesTa.value.trim();
            rdv.preparation.propositionEnvisagee = propositionTa.value.trim();
            var prixCibleValue = parseFloat(prixCibleInput.value);
            rdv.preparation.prixCible = isNaN(prixCibleValue) ? null : prixCibleValue;
            var prixMinValue = parseFloat(prixMinInput.value);
            rdv.preparation.prixMinimum = isNaN(prixMinValue) ? null : prixMinValue;
            rdv.preparation.argumentsCommerciaux = argumentsTa.value.trim();
            rdv.preparation.objectionsPossibles = objectionsTa.value.trim();
            rdv.preparation.prochainesEtapes = etapesTa.value.trim();
            agendaCalc.pushHistorique(rdv, 'preparation', 'Préparation commerciale mise à jour.');
            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({ title: 'Modifier la préparation commerciale', body: body, footer: footer });
    }

    function openEditCommunicationModal() {
        var body = document.createElement('div');

        var confirmeLabel = document.createElement('label');
        confirmeLabel.className = 'modal-checkbox-item';
        var confirmeCheckbox = document.createElement('input');
        confirmeCheckbox.type = 'checkbox';
        confirmeCheckbox.checked = !!rdv.communication.confirme;
        confirmeLabel.appendChild(confirmeCheckbox);
        confirmeLabel.appendChild(document.createTextNode('Rendez-vous confirmé'));
        body.appendChild(confirmeLabel);

        var grid = makeEl('div', 'form-grid-2');
        var rappelsWrap = document.createElement('div');
        rappelsWrap.appendChild(makeLabel('Rappels effectués', 'comm-form-rappels'));
        var rappelsInput = document.createElement('input');
        rappelsInput.type = 'number';
        rappelsInput.id = 'comm-form-rappels';
        rappelsInput.className = 'modal-input';
        rappelsInput.value = rdv.communication.rappelsEffectues || 0;
        rappelsWrap.appendChild(rappelsInput);
        grid.appendChild(rappelsWrap);

        var relancesWrap = document.createElement('div');
        relancesWrap.appendChild(makeLabel('Relances', 'comm-form-relances'));
        var relancesInput = document.createElement('input');
        relancesInput.type = 'number';
        relancesInput.id = 'comm-form-relances';
        relancesInput.className = 'modal-input';
        relancesInput.value = rdv.communication.relances || 0;
        relancesWrap.appendChild(relancesInput);
        grid.appendChild(relancesWrap);
        body.appendChild(grid);

        var grid2 = makeEl('div', 'form-grid-2');
        var derniereWrap = document.createElement('div');
        derniereWrap.appendChild(makeLabel('Dernière communication (JJ/MM/AAAA)', 'comm-form-derniere'));
        var derniereInput = document.createElement('input');
        derniereInput.type = 'text';
        derniereInput.id = 'comm-form-derniere';
        derniereInput.className = 'modal-input';
        derniereInput.placeholder = 'JJ/MM/AAAA';
        derniereInput.value = rdv.communication.dateDerniereCommunication || '';
        derniereWrap.appendChild(derniereInput);
        grid2.appendChild(derniereWrap);

        var prochaineWrap = document.createElement('div');
        prochaineWrap.appendChild(makeLabel('Prochaine communication prévue (JJ/MM/AAAA)', 'comm-form-prochaine'));
        var prochaineInput = document.createElement('input');
        prochaineInput.type = 'text';
        prochaineInput.id = 'comm-form-prochaine';
        prochaineInput.className = 'modal-input';
        prochaineInput.placeholder = 'JJ/MM/AAAA';
        prochaineInput.value = rdv.communication.prochaineCommunicationPrevue || '';
        prochaineWrap.appendChild(prochaineInput);
        grid2.appendChild(prochaineWrap);
        body.appendChild(grid2);

        var commentaireTa = addModalTextarea(body, 'Commentaire de suivi', 'comm-form-commentaire', rdv.communication.commentaireSuivi, 3);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.textContent = 'Enregistrer';
        saveButton.addEventListener('click', function () {
            rdv.communication.confirme = confirmeCheckbox.checked;
            var rappelsValue = parseInt(rappelsInput.value, 10);
            rdv.communication.rappelsEffectues = isNaN(rappelsValue) ? 0 : rappelsValue;
            var relancesValue = parseInt(relancesInput.value, 10);
            rdv.communication.relances = isNaN(relancesValue) ? 0 : relancesValue;
            rdv.communication.dateDerniereCommunication = derniereInput.value.trim() || null;
            rdv.communication.prochaineCommunicationPrevue = prochaineInput.value.trim() || null;
            rdv.communication.commentaireSuivi = commentaireTa.value.trim();
            agendaCalc.pushHistorique(rdv, 'communication', 'Suivi de communication mis à jour.');
            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({ title: 'Modifier le suivi de communication', body: body, footer: footer });
    }

    function openReporterModal() {
        var body = document.createElement('div');
        body.appendChild(makeLabel('Nouvelle date (JJ/MM/AAAA)', 'rdv-form-report-date'));
        var dateInput = document.createElement('input');
        dateInput.type = 'text';
        dateInput.id = 'rdv-form-report-date';
        dateInput.className = 'modal-input';
        dateInput.placeholder = 'JJ/MM/AAAA';
        body.appendChild(dateInput);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'btn-primary';
        confirmButton.setAttribute('data-modal-close', 'true');
        confirmButton.textContent = 'Reporter';
        confirmButton.addEventListener('click', function () {
            var newDate = dateInput.value.trim();
            if (!newDate) {
                return;
            }
            var oldDate = rdv.date;
            rdv.date = newDate;
            rdv.statut = 'reporte';
            rdv.communication.confirme = false;
            agendaCalc.pushHistorique(rdv, 'report', 'Rendez-vous reporté du ' + (oldDate || '—') + ' au ' + newDate + '.');
            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        window.COCKPIT_MODAL.open({ title: 'Reporter le rendez-vous', body: body, footer: footer });
    }

    function openStatutModal() {
        var body = document.createElement('div');

        var currentInfo = findInfo(RDV_STATUSES, rdv.statut);
        var currentLine = makeEl('p', 'modal-text');
        currentLine.appendChild(document.createTextNode('Statut actuel : '));
        currentLine.appendChild(makeEl('span', 'badge ' + (currentInfo ? currentInfo.badgeClass : 'badge-neutral'), currentInfo ? currentInfo.label : rdv.statut));
        body.appendChild(currentLine);

        body.appendChild(makeLabel('Nouveau statut', 'rdv-form-statut'));
        var select = document.createElement('select');
        select.id = 'rdv-form-statut';
        select.className = 'table-select modal-select';
        select.setAttribute('data-modal-autofocus', 'true');
        RDV_STATUSES.forEach(function (s) {
            var option = document.createElement('option');
            option.value = s.value;
            option.textContent = s.label;
            if (s.value === rdv.statut) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        body.appendChild(select);
        body.appendChild(makeEl('p', 'modal-hint', 'Choisir "Reporté" ouvrira ensuite la saisie de la nouvelle date.'));

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.textContent = 'Enregistrer';
        saveButton.addEventListener('click', function () {
            var newValue = select.value;
            if (newValue === rdv.statut) {
                return;
            }
            if (newValue === 'reporte') {
                openReporterModal();
                return;
            }
            var newInfo = findInfo(RDV_STATUSES, newValue);
            rdv.statut = newValue;
            if (newValue === 'confirme') {
                rdv.communication.confirme = true;
            }
            agendaCalc.pushHistorique(rdv, 'statut', 'Statut modifié de "' + (currentInfo ? currentInfo.label : rdv.statut) + '" à "' + (newInfo ? newInfo.label : newValue) + '".');
            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({ title: 'Modifier le statut', body: body, footer: footer });
    }

    function openPrioriteModal() {
        var body = document.createElement('div');

        var currentInfo = findInfo(RDV_PRIORITES, rdv.priorite);
        var currentLine = makeEl('p', 'modal-text');
        currentLine.appendChild(document.createTextNode('Priorité actuelle : '));
        currentLine.appendChild(makeEl('span', 'badge ' + (currentInfo ? currentInfo.badgeClass : 'badge-neutral'), currentInfo ? currentInfo.label : rdv.priorite));
        body.appendChild(currentLine);

        body.appendChild(makeLabel('Nouvelle priorité', 'rdv-form-priorite-select'));
        var select = document.createElement('select');
        select.id = 'rdv-form-priorite-select';
        select.className = 'table-select modal-select';
        select.setAttribute('data-modal-autofocus', 'true');
        RDV_PRIORITES.forEach(function (p) {
            var option = document.createElement('option');
            option.value = p.value;
            option.textContent = p.label;
            if (p.value === rdv.priorite) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        body.appendChild(select);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.textContent = 'Enregistrer';
        saveButton.addEventListener('click', function () {
            var newValue = select.value;
            if (newValue === rdv.priorite) {
                return;
            }
            var newInfo = findInfo(RDV_PRIORITES, newValue);
            rdv.priorite = newValue;
            agendaCalc.pushHistorique(rdv, 'modification', 'Priorité modifiée de "' + (currentInfo ? currentInfo.label : rdv.priorite) + '" à "' + (newInfo ? newInfo.label : newValue) + '".');
            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({ title: 'Modifier la priorité', body: body, footer: footer });
    }

    function openOpportuniteModal() {
        var body = document.createElement('div');

        var currentInfo = findInfo(RDV_OPPORTUNITES, rdv.opportunite);
        var currentLine = makeEl('p', 'modal-text');
        currentLine.appendChild(document.createTextNode('Opportunité actuelle : '));
        currentLine.appendChild(makeEl('span', 'badge ' + (currentInfo ? currentInfo.badgeClass : 'badge-neutral'), currentInfo ? currentInfo.label : rdv.opportunite));
        body.appendChild(currentLine);

        body.appendChild(makeLabel('Nouvelle opportunité', 'rdv-form-opportunite-select'));
        var select = document.createElement('select');
        select.id = 'rdv-form-opportunite-select';
        select.className = 'table-select modal-select';
        select.setAttribute('data-modal-autofocus', 'true');
        RDV_OPPORTUNITES.forEach(function (o) {
            var option = document.createElement('option');
            option.value = o.value;
            option.textContent = o.label;
            if (o.value === rdv.opportunite) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        body.appendChild(select);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.setAttribute('data-modal-close', 'true');
        saveButton.textContent = 'Enregistrer';
        saveButton.addEventListener('click', function () {
            var newValue = select.value;
            if (newValue === rdv.opportunite) {
                return;
            }
            var newInfo = findInfo(RDV_OPPORTUNITES, newValue);
            rdv.opportunite = newValue;
            agendaCalc.pushHistorique(rdv, 'modification', 'Opportunité modifiée de "' + (currentInfo ? currentInfo.label : rdv.opportunite) + '" à "' + (newInfo ? newInfo.label : newValue) + '".');
            renderAll();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({ title: 'Modifier l\'opportunité', body: body, footer: footer });
    }

    function openDeleteRdvModal() {
        var body = makeEl('p', 'modal-text', 'Voulez-vous vraiment supprimer ce rendez-vous ? Cette action ne peut pas être annulée.');

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.setAttribute('data-modal-autofocus', 'true');
        cancelButton.textContent = 'Annuler';

        var confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'btn-danger';
        confirmButton.setAttribute('data-modal-close', 'true');
        confirmButton.textContent = 'Supprimer';
        confirmButton.addEventListener('click', function () {
            delete window.COCKPIT_RDV_DETAILS[rdv.id];
            window.location.href = 'agenda.html';
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);

        window.COCKPIT_MODAL.open({ title: 'Supprimer le rendez-vous', body: body, footer: footer });
    }

    if (!loadFromParams()) {
        notFoundEl.style.display = '';
        contentEl.style.display = 'none';
    } else {
        notFoundEl.style.display = 'none';
        contentEl.style.display = '';
        renderAll();

        editHeaderBtn.addEventListener('click', openEditHeaderModal);
        createBtn.addEventListener('click', openEditHeaderModal);
        deleteBtn.addEventListener('click', openDeleteRdvModal);

        document.getElementById('rdv-edit-preparation-btn').addEventListener('click', openEditPreparationModal);
        document.getElementById('rdv-edit-communication-btn').addEventListener('click', openEditCommunicationModal);

        document.getElementById('rdv-action-relance').addEventListener('click', function () {
            rdv.communication.relances = (rdv.communication.relances || 0) + 1;
            rdv.communication.dateDerniereCommunication = agendaCalc.formatDateFr(new Date());
            agendaCalc.pushHistorique(rdv, 'communication', 'Relance effectuée.');
            renderAll();
        });

        statusBadgeEl.addEventListener('click', openStatutModal);
        prioriteBadgeEl.addEventListener('click', openPrioriteModal);
        opportuniteBadgeEl.addEventListener('click', openOpportuniteModal);
    }
})();

// Page Document RDV (V0.7) : export imprimable en lecture seule de la fiche
// de préparation commerciale d'un rendez-vous (?rdv=ID). Même principe que
// les documents devis/facture (V0.6.3) : lecture seule, aucun recalcul
// indépendant, impression via window.print(), sans bibliothèque PDF.

(function () {
    var notFoundEl = document.getElementById('rdv-doc-not-found');
    var contentEl = document.getElementById('rdv-doc-content');
    if (!notFoundEl || !contentEl) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var agendaCalc = window.COCKPIT_AGENDA_CALC || {};
    var RDV_STATUSES = window.COCKPIT_RDV_STATUSES || [];
    var CLIENT_DETAILS = window.COCKPIT_CLIENT_DETAILS || {};

    var backLink = document.getElementById('rdv-doc-back-link');
    var printBtn = document.getElementById('rdv-doc-print-btn');

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

    function makeInfoItem(label, value) {
        var item = makeEl('div', 'info-item');
        item.appendChild(makeEl('span', 'info-label', label));
        item.appendChild(makeEl('span', 'info-value', (value === null || value === undefined || value === '') ? '—' : value));
        return item;
    }

    var params = new URLSearchParams(window.location.search);
    var rdvParam = params.get('rdv');
    var rdv = rdvParam ? (window.COCKPIT_RDV_DETAILS || {})[rdvParam] : null;

    if (!rdv) {
        notFoundEl.style.display = '';
        contentEl.style.display = 'none';
        return;
    }

    notFoundEl.style.display = 'none';
    contentEl.style.display = '';

    backLink.href = 'fiche-rdv.html?rdv=' + encodeURIComponent(rdv.id);
    printBtn.addEventListener('click', function () {
        window.print();
    });

    document.getElementById('rdv-doc-titre').textContent = rdv.titre || '—';

    var statusInfo = RDV_STATUSES.filter(function (s) { return s.value === rdv.statut; })[0];
    var statusBadgeEl = document.getElementById('rdv-doc-status-badge');
    statusBadgeEl.textContent = statusInfo ? statusInfo.label : rdv.statut;
    statusBadgeEl.className = 'badge ' + (statusInfo ? statusInfo.badgeClass : 'badge-neutral');

    document.getElementById('rdv-doc-meta').textContent = 'Document généré le ' + (agendaCalc.formatDateFr ? agendaCalc.formatDateFr(new Date()) : '—');

    var rdvInfoEl = document.getElementById('rdv-doc-rdv-info');
    rdvInfoEl.appendChild(makeInfoItem('Date', rdv.date));
    rdvInfoEl.appendChild(makeInfoItem('Horaire', rdv.heureDebut ? (rdv.heureDebut + (rdv.heureFin ? ' – ' + rdv.heureFin : '')) : null));
    rdvInfoEl.appendChild(makeInfoItem('Lieu / format', rdv.lieu));
    rdvInfoEl.appendChild(makeInfoItem('Montant potentiel estimé', (rdv.montantPotentiel !== null && rdv.montantPotentiel !== undefined) ? devisCalc.formatMoney(rdv.montantPotentiel) : null));

    var clientEl = document.getElementById('rdv-doc-client');
    var client = rdv.clientSlug ? CLIENT_DETAILS[rdv.clientSlug] : null;
    if (client) {
        clientEl.appendChild(makeEl('p', 'document-party-name', client.nom));
        if (client.entreprise && client.entreprise !== '—') {
            clientEl.appendChild(makeEl('p', null, client.entreprise));
        }
        clientEl.appendChild(makeEl('p', null, client.telephone || '—'));
        clientEl.appendChild(makeEl('p', null, client.email || '—'));
        clientEl.appendChild(makeEl('p', null, client.adresse || '—'));
    } else {
        clientEl.appendChild(makeEl('p', 'empty-state-inline', 'Aucun client associé.'));
    }

    document.getElementById('rdv-doc-contexte').textContent = rdv.preparation.contexteBesoin || '—';
    document.getElementById('rdv-doc-proposition').textContent = rdv.preparation.propositionEnvisagee || '—';

    var prixInfoEl = document.getElementById('rdv-doc-prix-info');
    prixInfoEl.appendChild(makeInfoItem('Prix cible', (rdv.preparation.prixCible !== null && rdv.preparation.prixCible !== undefined) ? devisCalc.formatMoney(rdv.preparation.prixCible) : null));
    prixInfoEl.appendChild(makeInfoItem('Prix minimum acceptable', (rdv.preparation.prixMinimum !== null && rdv.preparation.prixMinimum !== undefined) ? devisCalc.formatMoney(rdv.preparation.prixMinimum) : null));
    var margeValue = (rdv.preparation.prixCible !== null && rdv.preparation.prixCible !== undefined &&
        rdv.preparation.prixMinimum !== null && rdv.preparation.prixMinimum !== undefined)
        ? devisCalc.formatMoney(rdv.preparation.prixCible - rdv.preparation.prixMinimum) : null;
    prixInfoEl.appendChild(makeInfoItem('Marge de négociation', margeValue));

    document.getElementById('rdv-doc-arguments').textContent = rdv.preparation.argumentsCommerciaux || '—';
    document.getElementById('rdv-doc-objections').textContent = rdv.preparation.objectionsPossibles || '—';

    var commEl = document.getElementById('rdv-doc-communication');
    commEl.appendChild(makeInfoItem('Confirmation', rdv.communication.confirme ? 'Confirmé' : 'À confirmer'));
    commEl.appendChild(makeInfoItem('Dernière communication', rdv.communication.dateDerniereCommunication));
    commEl.appendChild(makeInfoItem('Prochaine communication prévue', rdv.communication.prochaineCommunicationPrevue));
    commEl.appendChild(makeInfoItem('Commentaire de suivi', rdv.communication.commentaireSuivi));

    document.getElementById('rdv-doc-legal').textContent = 'Document interne de préparation commerciale — usage interne, non contractuel.';
})();

// Page Trésorerie : outil simple de pilotage du cash (V0.8). KPI, prochains
// mouvements, charges prévues, factures à encaisser, graphique de projection
// et alertes calculés depuis COCKPIT_TRESORERIE_CALC.computeSnapshot(), qui
// réutilise lui-même COCKPIT_FACTURATION_STATS/FACTURE_DETAILS pour rester
// cohérent avec la Facturation. "Ajouter une opération" modifie
// COCKPIT_TRESORERIE_OPERATIONS en mémoire (aucune persistance), comme
// partout ailleurs dans l'application.

(function () {
    var soldeEl = document.getElementById('tresorerie-kpi-solde');
    if (!soldeEl) {
        return;
    }

    var devisCalc = window.COCKPIT_DEVIS_CALC;
    var calc = window.COCKPIT_TRESORERIE_CALC;
    var CATEGORIES = window.COCKPIT_TRESORERIE_CATEGORIES || [];
    var STATUSES = window.COCKPIT_TRESORERIE_STATUSES || [];

    var MONTH_ABBR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

    var FACTURE_STATUT_INFO = {
        'a-venir': { label: 'À venir', badgeClass: 'badge-info' },
        'en-retard': { label: 'En retard', badgeClass: 'badge-danger' },
        'partiellement-payee': { label: 'Partiellement payé', badgeClass: 'badge-warning' }
    };

    var periodSelectEl = document.getElementById('tresorerie-period-select');
    var mouvementsListEl = document.getElementById('tresorerie-mouvements-list');
    var mouvementsEmptyEl = document.getElementById('tresorerie-mouvements-empty');
    var chargesBodyEl = document.getElementById('tresorerie-charges-body');
    var chargesEmptyEl = document.getElementById('tresorerie-charges-empty');
    var facturesBodyEl = document.getElementById('tresorerie-factures-body');
    var facturesEmptyEl = document.getElementById('tresorerie-factures-empty');
    var alertesListEl = document.getElementById('tresorerie-alertes-list');
    var alertesEmptyEl = document.getElementById('tresorerie-alertes-empty');
    var chartContainerEl = document.getElementById('tresorerie-chart-container');
    var chartRangeEl = document.getElementById('tresorerie-chart-range');
    var addOperationBtn = document.getElementById('tresorerie-add-operation-btn');

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function toISODate(date) {
        return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    function fromISODate(value) {
        if (!value) {
            return null;
        }
        var parts = value.split('-');
        if (parts.length !== 3) {
            return null;
        }
        var year = parseInt(parts[0], 10);
        if (isNaN(year) || year < 2000 || year > 2099) {
            return null;
        }
        var d = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return isNaN(d.getTime()) ? null : d;
    }

    function formatDateFr(date) {
        return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + '/' + date.getFullYear();
    }

    function formatShortDate(frDateStr) {
        var d = calc.parseDate(frDateStr);
        if (!d) {
            return { day: '—', month: '' };
        }
        return { day: pad2(d.getDate()), month: MONTH_ABBR[d.getMonth()] };
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

    function statutBadge(value) {
        var info = STATUSES.filter(function (s) { return s.value === value; })[0];
        var badge = makeEl('span', 'badge ' + (info ? info.badgeClass : 'badge-neutral'), info ? info.label : value);
        return badge;
    }

    function buildTimelineItem(mouvement) {
        var isLien = !!mouvement.lien;
        var item = document.createElement(isLien ? 'a' : 'div');
        item.className = 'tresorerie-timeline-item';
        if (isLien && mouvement.lien.type === 'facture') {
            item.href = 'facture-edition.html?facture=' + encodeURIComponent(mouvement.lien.key);
            item.target = '_blank';
            item.rel = 'noopener noreferrer';
        }

        var shortDate = formatShortDate(mouvement.date);
        var dateEl = makeEl('div', 'tresorerie-timeline-date');
        dateEl.appendChild(makeEl('strong', null, shortDate.day));
        dateEl.appendChild(makeEl('span', null, shortDate.month));
        item.appendChild(dateEl);

        var isEncaissement = mouvement.type === 'encaissement';
        var iconEl = makeEl('span', 'tresorerie-flow-icon ' + (isEncaissement ? 'tresorerie-flow-icon-in' : 'tresorerie-flow-icon-out'));
        iconEl.innerHTML = isEncaissement
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 19 19 12"></polyline></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>';
        item.appendChild(iconEl);

        var bodyEl = makeEl('div', 'tresorerie-timeline-body');
        bodyEl.appendChild(makeEl('p', 'tresorerie-timeline-title', mouvement.libelle));
        bodyEl.appendChild(makeEl('p', 'tresorerie-timeline-sub', mouvement.categorie));
        item.appendChild(bodyEl);

        var amountEl = makeEl('span', 'tresorerie-timeline-amount ' + (isEncaissement ? 'tresorerie-amount-in' : 'tresorerie-amount-out'),
            (isEncaissement ? '+ ' : '- ') + devisCalc.formatMoney(mouvement.montant));
        item.appendChild(amountEl);

        var statusWrap = makeEl('span', 'tresorerie-timeline-status');
        statusWrap.appendChild(statutBadge(mouvement.statut));
        item.appendChild(statusWrap);

        return item;
    }

    function renderMouvements(snapshot) {
        mouvementsListEl.innerHTML = '';
        if (snapshot.mouvements.length === 0) {
            mouvementsEmptyEl.style.display = '';
            return;
        }
        mouvementsEmptyEl.style.display = 'none';
        snapshot.mouvements.forEach(function (m) {
            mouvementsListEl.appendChild(buildTimelineItem(m));
        });
    }

    function renderCharges(snapshot) {
        chargesBodyEl.innerHTML = '';
        if (snapshot.chargesPrevues.length === 0) {
            chargesEmptyEl.style.display = '';
            return;
        }
        chargesEmptyEl.style.display = 'none';
        snapshot.chargesPrevues.forEach(function (op) {
            var row = document.createElement('tr');
            row.appendChild(makeEl('td', null, calc.labelForCategorie(op.categorie)));
            row.appendChild(makeEl('td', null, op.libelle));
            row.appendChild(makeEl('td', null, op.date));
            row.appendChild(makeEl('td', 'amount-cell', devisCalc.formatMoney(op.montant)));
            var statutCell = document.createElement('td');
            statutCell.appendChild(statutBadge(op.statut));
            row.appendChild(statutCell);
            chargesBodyEl.appendChild(row);
        });
    }

    function renderFactures(snapshot) {
        facturesBodyEl.innerHTML = '';
        if (snapshot.facturesAEncaisser.length === 0) {
            facturesEmptyEl.style.display = '';
            return;
        }
        facturesEmptyEl.style.display = 'none';
        snapshot.facturesAEncaisser.forEach(function (f) {
            var row = document.createElement('tr');

            var numeroCell = document.createElement('td');
            numeroCell.className = 'nowrap-cell';
            var factureLink = document.createElement('a');
            factureLink.href = 'facture-edition.html?facture=' + encodeURIComponent(f.key);
            factureLink.target = '_blank';
            factureLink.rel = 'noopener noreferrer';
            factureLink.textContent = f.numero;
            numeroCell.appendChild(factureLink);
            row.appendChild(numeroCell);

            var clientCell = document.createElement('td');
            if (f.clientSlug) {
                var link = document.createElement('a');
                link.href = 'fiche-client.html?client=' + encodeURIComponent(f.clientSlug);
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = f.clientNom;
                clientCell.appendChild(link);
            } else {
                clientCell.textContent = f.clientNom;
            }
            row.appendChild(clientCell);
            row.appendChild(makeEl('td', null, f.dateEcheance || '—'));
            row.appendChild(makeEl('td', 'amount-cell', devisCalc.formatMoney(f.resteAPayer)));
            var statutCell = document.createElement('td');
            var info = FACTURE_STATUT_INFO[f.statut];
            statutCell.appendChild(makeEl('span', 'badge ' + (info ? info.badgeClass : 'badge-neutral'), info ? info.label : f.statut));
            row.appendChild(statutCell);
            facturesBodyEl.appendChild(row);
        });
    }

    function renderAlertes(snapshot) {
        alertesListEl.innerHTML = '';
        if (snapshot.alertes.length === 0) {
            alertesEmptyEl.style.display = '';
            return;
        }
        alertesEmptyEl.style.display = 'none';
        var ICONS = {
            critical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        var CLASS_MAP = { critical: 'alert-critical', warning: 'alert-warning', info: 'alert-info' };
        snapshot.alertes.forEach(function (alerte) {
            var li = document.createElement('li');
            var link = document.createElement('a');
            link.className = 'alert-item ' + (CLASS_MAP[alerte.niveau] || 'alert-info');
            link.href = alerte.lien || '#';
            var iconEl = makeEl('span', 'alert-icon');
            iconEl.innerHTML = ICONS[alerte.niveau] || ICONS.info;
            link.appendChild(iconEl);
            var bodyEl = makeEl('div', 'alert-item-body');
            bodyEl.appendChild(makeEl('p', 'alert-item-title', alerte.titre));
            bodyEl.appendChild(makeEl('p', 'alert-item-subtext', alerte.sousTexte));
            link.appendChild(bodyEl);
            var chevronEl = makeEl('span', 'alert-chevron');
            chevronEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
            link.appendChild(chevronEl);
            li.appendChild(link);
            alertesListEl.appendChild(li);
        });
    }

    function soldeStatusClass(value) {
        if (value > 0) {
            return 'status-positive';
        }
        if (value < 0) {
            return 'status-negative';
        }
        return 'status-neutral';
    }

    function renderChart(snapshot) {
        var points = snapshot.serie;
        chartContainerEl.innerHTML = '';
        if (points.length < 2) {
            chartContainerEl.appendChild(makeEl('p', 'empty-state-inline', 'Pas assez de données pour tracer une projection.'));
            return;
        }

        var values = points.map(function (p) { return p.solde; });
        var minValue = Math.min.apply(null, values.concat([0]));
        var maxValue = Math.max.apply(null, values);
        if (maxValue === minValue) {
            maxValue = minValue + 1;
        }
        var width = 640;
        var height = 220;
        var leftMargin = 12;
        var rightPad = 12;
        var topMargin = 16;
        var bottomMargin = 30;
        var plotWidth = width - leftMargin - rightPad;

        function xFor(index) {
            return leftMargin + (index / (points.length - 1)) * plotWidth;
        }
        function yFor(value) {
            var ratio = (value - minValue) / (maxValue - minValue);
            return height - bottomMargin - ratio * (height - topMargin - bottomMargin);
        }

        var coords = points.map(function (p, index) {
            return xFor(index) + ',' + yFor(p.solde);
        });
        var linePoints = coords.join(' ');
        var fillPoints = coords.join(' ') + ' ' + xFor(points.length - 1) + ',' + (height - bottomMargin) + ' ' + xFor(0) + ',' + (height - bottomMargin);

        var TICK_COUNT = 3;
        var gridlines = '';
        for (var i = 0; i <= TICK_COUNT; i++) {
            var tickValue = minValue + (maxValue - minValue) * (i / TICK_COUNT);
            var tickY = yFor(tickValue);
            gridlines += '<line x1="' + leftMargin + '" y1="' + tickY + '" x2="' + (width - rightPad) + '" y2="' + tickY + '" stroke="#eef0f4" stroke-width="1"></line>';
        }

        var circles = points.map(function (p, index) {
            return '<circle class="tresorerie-chart-point" data-point-index="' + index + '" cx="' + xFor(index) + '" cy="' + yFor(p.solde) + '" r="5" fill="#4f46e5"></circle>';
        }).join('');

        var zeroLine = (minValue < 0 && maxValue > 0)
            ? '<line x1="' + leftMargin + '" y1="' + yFor(0) + '" x2="' + (width - rightPad) + '" y2="' + yFor(0) + '" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"></line>'
            : '';

        var svgWrap = document.createElement('div');
        svgWrap.innerHTML = '<svg class="chart-container tresorerie-chart" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet">' +
            '<defs><linearGradient id="tresorerieChartFill" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#4f46e5" stop-opacity="0.25"></stop>' +
            '<stop offset="100%" stop-color="#4f46e5" stop-opacity="0"></stop>' +
            '</linearGradient></defs>' +
            gridlines +
            zeroLine +
            '<polygon points="' + fillPoints + '" fill="url(#tresorerieChartFill)"></polygon>' +
            '<polyline points="' + linePoints + '" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
            circles +
            '</svg>';
        var svgEl = svgWrap.firstChild;
        chartContainerEl.appendChild(svgEl);

        var labels = makeEl('div', 'chart-labels');
        points.forEach(function (p) {
            labels.appendChild(makeEl('span', null, pad2(p.date.getDate()) + '/' + pad2(p.date.getMonth() + 1)));
        });
        chartContainerEl.appendChild(labels);

        chartRangeEl.textContent = formatDateFr(snapshot.today) + ' → ' + formatDateFr(snapshot.periodEnd);

        var tooltipEl = makeEl('div', 'tresorerie-chart-tooltip');
        tooltipEl.style.display = 'none';
        chartContainerEl.appendChild(tooltipEl);

        function showTooltip(circleEl, point) {
            tooltipEl.innerHTML = '';
            tooltipEl.appendChild(makeEl('p', 'tresorerie-chart-tooltip-date', formatDateFr(point.date)));
            tooltipEl.appendChild(makeEl('p', 'tresorerie-chart-tooltip-solde ' + soldeStatusClass(point.solde), devisCalc.formatMoney(point.solde)));
            if (point.mouvementPrincipal) {
                var mvt = point.mouvementPrincipal;
                tooltipEl.appendChild(makeEl('p', 'tresorerie-chart-tooltip-mvt', mvt.libelle + ' (' + (mvt.type === 'encaissement' ? '+ ' : '- ') + devisCalc.formatMoney(mvt.montant) + ')'));
            }

            var containerRect = chartContainerEl.getBoundingClientRect();
            var circleRect = circleEl.getBoundingClientRect();
            var left = circleRect.left - containerRect.left + circleRect.width / 2;
            var top = circleRect.top - containerRect.top;
            tooltipEl.style.left = left + 'px';
            tooltipEl.style.top = top + 'px';
            tooltipEl.style.display = '';
        }

        function hideTooltip() {
            tooltipEl.style.display = 'none';
        }

        Array.prototype.forEach.call(svgEl.querySelectorAll('.tresorerie-chart-point'), function (circleEl) {
            var index = parseInt(circleEl.getAttribute('data-point-index'), 10);
            var point = points[index];
            circleEl.addEventListener('mouseenter', function () { showTooltip(circleEl, point); });
            circleEl.addEventListener('mouseleave', hideTooltip);
        });
    }

    function render() {
        var periodDays = parseInt(periodSelectEl.value, 10) || 30;
        var snapshot = calc.computeSnapshot(periodDays);

        document.getElementById('tresorerie-kpi-solde').textContent = devisCalc.formatMoney(snapshot.soldeEstime);
        document.getElementById('tresorerie-kpi-solde-variation').textContent = 'trésorerie actuellement disponible';

        document.getElementById('tresorerie-kpi-encaisser').textContent = devisCalc.formatMoney(snapshot.aEncaisser);
        document.getElementById('tresorerie-kpi-encaisser-detail').textContent = snapshot.facturesAEncaisser.length + ' facture(s)';

        document.getElementById('tresorerie-kpi-decaisser').textContent = devisCalc.formatMoney(snapshot.aDecaisser);
        document.getElementById('tresorerie-kpi-decaisser-detail').textContent = snapshot.chargesAVenir.length + ' charge(s) prévue(s)';

        var previsionnelEl = document.getElementById('tresorerie-kpi-previsionnel');
        previsionnelEl.textContent = devisCalc.formatMoney(snapshot.soldePrevisionnel);
        var previsionnelDetailEl = document.getElementById('tresorerie-kpi-previsionnel-detail');
        previsionnelDetailEl.textContent = 'au ' + formatDateFr(snapshot.periodEnd);
        previsionnelDetailEl.className = 'kpi-variation ' + (snapshot.soldePrevisionnel < snapshot.soldeEstime ? 'status-negative' : 'status-positive');

        renderMouvements(snapshot);
        renderCharges(snapshot);
        renderFactures(snapshot);
        renderAlertes(snapshot);
        renderChart(snapshot);
    }

    function openAddOperationModal() {
        var body = document.createElement('div');

        var typeWrap = document.createElement('div');
        typeWrap.appendChild(makeEl('label', 'modal-label', 'Type'));
        var typeSelect = document.createElement('select');
        typeSelect.className = 'modal-select';
        [['encaissement', 'Encaissement'], ['decaissement', 'Décaissement']].forEach(function (pair) {
            var option = document.createElement('option');
            option.value = pair[0];
            option.textContent = pair[1];
            typeSelect.appendChild(option);
        });
        typeSelect.value = 'decaissement';
        typeWrap.appendChild(typeSelect);
        body.appendChild(typeWrap);

        body.appendChild(makeEl('label', 'modal-label', 'Libellé'));
        var libelleInput = document.createElement('input');
        libelleInput.type = 'text';
        libelleInput.className = 'modal-input';
        libelleInput.placeholder = 'Ex. Loyer — Bureaux';
        body.appendChild(libelleInput);

        var grid = makeEl('div', 'form-grid-2');
        grid.style.marginTop = '10px';

        var categorieWrap = document.createElement('div');
        categorieWrap.appendChild(makeEl('label', 'modal-label', 'Catégorie'));
        var categorieSelect = document.createElement('select');
        categorieSelect.className = 'modal-select';
        CATEGORIES.forEach(function (c) {
            var option = document.createElement('option');
            option.value = c.value;
            option.textContent = c.label;
            categorieSelect.appendChild(option);
        });
        categorieWrap.appendChild(categorieSelect);
        grid.appendChild(categorieWrap);

        var montantWrap = document.createElement('div');
        montantWrap.appendChild(makeEl('label', 'modal-label', 'Montant (€)'));
        var montantInput = document.createElement('input');
        montantInput.type = 'number';
        montantInput.min = '0';
        montantInput.step = '0.01';
        montantInput.className = 'modal-input';
        montantWrap.appendChild(montantInput);
        grid.appendChild(montantWrap);
        body.appendChild(grid);

        var grid2 = makeEl('div', 'form-grid-2');
        grid2.style.marginTop = '10px';

        var dateWrap = document.createElement('div');
        dateWrap.appendChild(makeEl('label', 'modal-label', 'Date prévue'));
        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'modal-input';
        dateInput.min = '2000-01-01';
        dateInput.max = '2099-12-31';
        dateInput.value = toISODate(new Date());
        dateWrap.appendChild(dateInput);
        grid2.appendChild(dateWrap);

        var statutWrap = document.createElement('div');
        statutWrap.appendChild(makeEl('label', 'modal-label', 'Statut'));
        var statutSelect = document.createElement('select');
        statutSelect.className = 'modal-select';
        [['prevu', 'Prévu'], ['realise', 'Réalisé'], ['annule', 'Annulé']].forEach(function (pair) {
            var option = document.createElement('option');
            option.value = pair[0];
            option.textContent = pair[1];
            statutSelect.appendChild(option);
        });
        statutWrap.appendChild(statutSelect);
        grid2.appendChild(statutWrap);
        body.appendChild(grid2);

        var recurrenceWrap = document.createElement('div');
        recurrenceWrap.style.marginTop = '10px';
        recurrenceWrap.appendChild(makeEl('label', 'modal-label', 'Récurrence'));
        var recurrenceSelect = document.createElement('select');
        recurrenceSelect.className = 'modal-select';
        [['aucune', 'Aucune'], ['mensuelle', 'Mensuelle'], ['trimestrielle', 'Trimestrielle'], ['annuelle', 'Annuelle']].forEach(function (pair) {
            var option = document.createElement('option');
            option.value = pair[0];
            option.textContent = pair[1];
            recurrenceSelect.appendChild(option);
        });
        recurrenceWrap.appendChild(recurrenceSelect);
        body.appendChild(recurrenceWrap);

        var notesWrap = document.createElement('div');
        notesWrap.style.marginTop = '10px';
        notesWrap.appendChild(makeEl('label', 'modal-label', 'Notes'));
        var notesTextarea = document.createElement('textarea');
        notesTextarea.className = 'modal-textarea';
        notesTextarea.rows = 2;
        notesWrap.appendChild(notesTextarea);
        body.appendChild(notesWrap);

        var errorEl = makeEl('p', 'modal-hint');
        errorEl.style.color = 'var(--color-danger)';
        errorEl.style.display = 'none';
        body.appendChild(errorEl);

        var cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.setAttribute('data-modal-close', 'true');
        cancelButton.textContent = 'Annuler';

        var saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'btn-primary';
        saveButton.textContent = 'Enregistrer';

        saveButton.addEventListener('click', function () {
            var libelle = libelleInput.value.trim();
            var montant = parseFloat(montantInput.value);
            var date = fromISODate(dateInput.value);

            if (!libelle || !montant || montant <= 0 || !date) {
                errorEl.textContent = 'Merci de renseigner un libellé, un montant positif et une date valide.';
                errorEl.style.display = '';
                return;
            }

            calc.addOperation({
                type: typeSelect.value,
                libelle: libelle,
                categorie: categorieSelect.value,
                montant: montant,
                date: formatDateFr(date),
                statut: statutSelect.value,
                notes: notesTextarea.value.trim(),
                recurrence: recurrenceSelect.value
            });

            window.COCKPIT_MODAL.close();
            render();
        });

        var footer = document.createDocumentFragment();
        footer.appendChild(cancelButton);
        footer.appendChild(saveButton);

        window.COCKPIT_MODAL.open({
            title: 'Ajouter une opération',
            body: body,
            footer: footer
        });
    }

    periodSelectEl.addEventListener('change', render);
    addOperationBtn.addEventListener('click', openAddOperationModal);

    render();
})();
