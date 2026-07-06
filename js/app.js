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
        { value: 'prospect', label: 'Prospect' },
        { value: 'client-actif', label: 'Client actif' },
        { value: 'a-relancer', label: 'À relancer' },
        { value: 'inactif', label: 'Inactif' },
        { value: 'fidele', label: 'Fidèle' },
        { value: 'litige', label: 'Litige' }
    ];

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

// Page Fiche client : affichage du nom déduit du paramètre d'URL ?client=... (V0.4.1)
// Le contenu de la fiche reste générique/factice ; seul le nom et les initiales
// varient selon le client pour préparer la fiche réelle en V0.4.2.

(function () {
    var nameEl = document.getElementById('client-identity-name');
    var avatarEl = document.getElementById('client-identity-initials');

    if (!nameEl) {
        return;
    }

    var params = new URLSearchParams(window.location.search);
    var slug = params.get('client');

    if (!slug) {
        return;
    }

    var words = slug.split('-').filter(function (word) {
        return word.length > 0;
    });

    if (words.length === 0) {
        return;
    }

    var displayName = words.map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');

    nameEl.textContent = displayName;

    if (avatarEl) {
        var initials = words.slice(0, 2).map(function (word) {
            return word.charAt(0).toUpperCase();
        }).join('');
        avatarEl.textContent = initials || '?';
    }
})();
