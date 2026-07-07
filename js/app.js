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

// Page Clients : recherche, filtre par statut et compteur dynamique (V0.4.1)
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

    if (!table || !searchInput || !statusFilter || !counter) {
        return;
    }

    CLIENT_STATUSES.forEach(function (status) {
        var option = document.createElement('option');
        option.value = status.value;
        option.textContent = status.label;
        statusFilter.appendChild(option);
    });

    var rows = table.querySelectorAll('tbody tr');
    var totalCount = rows.length;

    function updateCounter(visibleCount) {
        var suffix = visibleCount > 1 ? 's' : '';
        counter.textContent = visibleCount + ' client' + suffix + ' affiché' + suffix + ' sur ' + totalCount;
    }

    function applyFilters() {
        var searchValue = searchInput.value.trim().toLowerCase();
        var statusValue = statusFilter.value;
        var visibleCount = 0;

        rows.forEach(function (row) {
            var matchesSearch = !searchValue || (row.dataset.search || '').indexOf(searchValue) !== -1;
            var matchesStatus = !statusValue || row.dataset.status === statusValue;
            var visible = matchesSearch && matchesStatus;
            row.style.display = visible ? '' : 'none';
            if (visible) {
                visibleCount++;
            }
        });

        updateCounter(visibleCount);
    }

    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    if (resetButton) {
        resetButton.addEventListener('click', function () {
            searchInput.value = '';
            statusFilter.value = '';
            applyFilters();
        });
    }

    applyFilters();
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

    function clientStatusInfo(statusValue) {
        var statuses = window.COCKPIT_CLIENT_STATUSES || [];
        for (var i = 0; i < statuses.length; i++) {
            if (statuses[i].value === statusValue) {
                return statuses[i];
            }
        }
        return null;
    }

    function renderNotes(notes) {
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

            var content = document.createElement('p');
            content.className = 'note-content';
            content.textContent = note.contenu;

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

            card.appendChild(content);
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

    function renderAppointments(appointments) {
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
            item.href = 'agenda.html' + (appointment.id ? '?rdv=' + encodeURIComponent(appointment.id) : '');

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
            statusEl.className = 'badge ' + statusInfo.badgeClass;
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

        renderNotes(client.notes);
        renderHistory(client.historique);
        renderAppointments(client.rendezVous);
        renderDocuments(client.documents);
    }

    var params = new URLSearchParams(window.location.search);
    renderClient(params.get('client'));
})();
