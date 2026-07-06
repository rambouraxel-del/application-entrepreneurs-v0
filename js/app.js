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
