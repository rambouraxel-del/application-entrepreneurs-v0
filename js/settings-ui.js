// Centre de paramètres V0.11.1 — interface corrective, claire et entièrement manipulable.
(function () {
    'use strict';

    var S = window.COCKPIT_SETTINGS;
    var C = window.COCKPIT_SETTINGS_CATALOG;
    var $ = function (id) { return document.getElementById(id); };
    var out = $('settings-section-content');
    if (!S || !C || !out) return;

    C.sections.data.title = 'Maintenance de l’application';
    C.sections.data.description = 'Videz les fichiers temporaires ou restaurez uniquement les préférences d’affichage.';
    C.sections.security.description = '';

    var sec = 'home';
    var draft = null;
    var originalDraft = null;
    var dirty = false;
    var highlight = '';

    var T = $('settings-section-title');
    var D = $('settings-section-description');
    var A = $('settings-section-actions');
    var SAVE = $('settings-save');
    var RESET = $('settings-reset-section');
    var BADGE = $('settings-dirty-badge');
    var VALID = $('settings-validation-summary');
    var SEARCH = $('settings-search');
    var RESULTS = $('settings-search-results');
    var OVER = $('settings-modal-overlay');
    var MT = $('settings-modal-title');
    var MB = $('settings-modal-body');
    var MF = $('settings-modal-footer');
    var TOAST = $('settings-toast');

    var colorChoices = [
        ['neutral', 'Neutre'],
        ['info', 'Bleu'],
        ['success', 'Vert'],
        ['warning', 'Orange'],
        ['danger', 'Rouge']
    ];

    var choicesByKey = {
        density: [['comfortable', 'Confortable'], ['compact', 'Compacte']],
        defaultPageSize: [[5, '5'], [10, '10'], [25, '25']],
        pageSize: [[5, '5'], [10, '10'], [25, '25']],
        accent: [['blue', 'Bleu'], ['green', 'Vert'], ['purple', 'Violet'], ['orange', 'Orange'], ['slate', 'Ardoise']],
        defaultPeriod: [['month', 'Mois'], ['30d', '30 jours'], ['quarter', 'Trimestre'], ['custom', 'Personnalisée']],
        cashHorizon: [['end-month', 'Fin du mois'], ['end-next-month', 'Fin du mois suivant'], ['30d', '30 jours'], ['60d', '60 jours'], ['90d', '90 jours']],
        defaultHorizon: [['end-month', 'Fin du mois'], ['end-next-month', 'Fin du mois suivant'], ['30d', '30 jours'], ['60d', '60 jours'], ['90d', '90 jours']],
        chartMonths: [[6, '6 mois'], [12, '12 mois']],
        chartIndicator: [['ca_facture', 'CA facturé'], ['encaisse', 'Encaissé'], ['solde_net', 'Solde net']],
        defaultView: [['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois'], ['list', 'Liste']],
        slotMinutes: [[15, '15'], [30, '30'], [60, '60']],
        defaultDurationMinutes: [[15, '15'], [30, '30'], [60, '60'], [90, '90'], [120, '120']],
        defaultTab: [['overview', 'Vue d’ensemble'], ['commercial', 'Commercial'], ['clients', 'Clients'], ['activity', 'Activité'], ['treasury', 'Trésorerie']],
        currency: [['EUR', 'EUR — euro']]
    };

    var choicesByPath = {
        'profile.language': [['fr', 'Français'], ['en', 'Anglais'], ['nl', 'Néerlandais']],
        'profile.dateFormat': [['DD/MM/YYYY', 'JJ/MM/AAAA'], ['MM/DD/YYYY', 'MM/JJ/AAAA'], ['YYYY-MM-DD', 'AAAA-MM-JJ']],
        'appearance.dateFormat': [['DD/MM/YYYY', 'JJ/MM/AAAA'], ['MM/DD/YYYY', 'MM/JJ/AAAA'], ['YYYY-MM-DD', 'AAAA-MM-JJ']],
        'profile.timezone': [['Europe/Paris', 'Europe / Paris'], ['Europe/Brussels', 'Europe / Bruxelles'], ['Europe/Amsterdam', 'Europe / Amsterdam'], ['Europe/London', 'Europe / Londres'], ['UTC', 'UTC']],
        'company.legalForm': [['EI', 'Entreprise individuelle'], ['EURL', 'EURL'], ['SARL', 'SARL'], ['SASU', 'SASU'], ['SAS', 'SAS'], ['SA', 'SA'], ['Association', 'Association']],
        'company.vatRegime': [['reel-normal', 'Régime réel normal'], ['reel-simplifie', 'Régime réel simplifié'], ['franchise-base', 'Franchise en base'], ['exonere', 'Exonéré']],
        'appearance.weekStartsOn': weekDayChoices(),
        'agenda.weekStartsOn': weekDayChoices(),
        'products.defaultUnit': [['unite', 'Unité'], ['heure', 'Heure'], ['jour', 'Jour'], ['forfait', 'Forfait'], ['mois', 'Mois']],
        'treasury.projectionMode': [['30d', '30 jours'], ['60d', '60 jours'], ['90d', '90 jours'], ['end-month', 'Fin du mois']]
    };

    var multiple = {
        visibleFields: [['name', 'Nom'], ['company', 'Entreprise'], ['phone', 'Téléphone'], ['email', 'E-mail'], ['lastContact', 'Dernier contact'], ['status', 'Statut']],
        workingDays: weekDayChoices(),
        visibleIndicators: [['revenue', 'CA'], ['collected', 'Encaissé'], ['cash', 'Trésorerie'], ['conversion', 'Conversion'], ['topClients', 'Top clients']]
    };

    function weekDayChoices() {
        return [
            ['monday', 'Lundi'], ['tuesday', 'Mardi'], ['wednesday', 'Mercredi'],
            ['thursday', 'Jeudi'], ['friday', 'Vendredi'], ['saturday', 'Samedi'], ['sunday', 'Dimanche']
        ];
    }

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function e(value) {
        return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
        });
    }
    function g(object, path) {
        return path.split('.').reduce(function (value, key) { return value == null ? value : value[key]; }, object);
    }
    function put(object, path, value) {
        var keys = path.split('.');
        var cursor = object;
        keys.forEach(function (key, index) {
            if (index === keys.length - 1) cursor[key] = value;
            else {
                cursor[key] = cursor[key] || {};
                cursor = cursor[key];
            }
        });
    }
    function pathFor(prefix, key) { return prefix ? prefix + '.' + key : key; }

    function clean() {
        dirty = false;
        SAVE.disabled = true;
        BADGE.hidden = true;
        VALID.hidden = true;
    }
    function changed() {
        dirty = true;
        SAVE.disabled = false;
        BADGE.hidden = false;
        VALID.hidden = true;
    }
    function toast(message, error) {
        TOAST.textContent = message;
        TOAST.classList.toggle('settings-toast-error', !!error);
        TOAST.hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(function () { TOAST.hidden = true; }, 3000);
    }
    function closeModal() { OVER.hidden = true; }
    function modal(title, body, buttons) {
        MT.textContent = title;
        MB.innerHTML = body;
        MF.innerHTML = '';
        buttons.forEach(function (button) {
            var node = document.createElement('button');
            node.type = 'button';
            node.className = button.main ? 'btn-primary' : 'btn-secondary';
            node.textContent = button.text;
            node.onclick = button.fn;
            MF.appendChild(node);
        });
        OVER.hidden = false;
    }

    $('settings-modal-close').onclick = closeModal;
    OVER.onclick = function (event) { if (event.target === OVER) closeModal(); };

    function reconcileDefaultPageSizeOnce() {
        var marker = 'cockpit.settings.v0.11.1.page-size-reconciled';
        if (localStorage.getItem(marker)) return;
        try {
            var defaults = S.getDefaults();
            var appearance = S.getSection('appearance');
            ['clients', 'products'].forEach(function (sectionName) {
                var section = S.getSection(sectionName);
                if (section && section.pageSize === defaults[sectionName].pageSize && section.pageSize !== appearance.defaultPageSize) {
                    section.pageSize = appearance.defaultPageSize;
                    S.updateSection(sectionName, section);
                }
            });
            localStorage.setItem(marker, '1');
        } catch (error) {
            console.warn('[Cockpit Settings] Réconciliation de pagination impossible.', error);
        }
    }

    function home() {
        var settings = S.get();
        var periodLabels = { month: 'Mois en cours', '30d': '30 derniers jours', quarter: 'Trimestre', custom: 'Personnalisée' };
        var horizonLabels = { 'end-month': 'Fin du mois', 'end-next-month': 'Fin du mois suivant', '30d': '30 jours', '60d': '60 jours', '90d': '90 jours' };
        var viewLabels = { day: 'Jour', week: 'Semaine', month: 'Mois', list: 'Liste' };
        var profile = settings.demo.enabled ? 'Démo : ' + settings.demo.firstName + ' ' + settings.demo.lastName : settings.profile.firstName + ' ' + settings.profile.lastName;
        var cards = [
            ['Entreprise active', settings.company.tradeName || settings.company.legalName, 'company'],
            ['Profil actif', profile, 'profile'],
            ['Objectif mensuel', settings.dashboard.revenueGoal + ' €', 'dashboard'],
            ['Période de pilotage', periodLabels[settings.dashboard.defaultPeriod], 'dashboard'],
            ['Horizon de trésorerie', horizonLabels[settings.dashboard.cashHorizon], 'dashboard'],
            ['Devise', settings.appearance.currency, 'appearance'],
            ['TVA par défaut', settings.billing.defaultVat + ' %', 'billing'],
            ['Vue Agenda', viewLabels[settings.agenda.defaultView], 'agenda'],
            ['Préfixes', settings.billing.quotePrefix + ' / ' + settings.billing.invoicePrefix, 'billing']
        ];
        out.innerHTML = '<div class="settings-home-grid">' + cards.map(function (card) {
            return '<article class="settings-summary-card"><span>' + e(card[0]) + '</span><strong>' + e(card[1] || 'À compléter') + '</strong><a href="#' + card[2] + '">Modifier</a></article>';
        }).join('') + '</div>';

        var required = [
            ['profile.firstName', 'Prénom', 'profile'], ['profile.lastName', 'Nom', 'profile'], ['profile.email', 'E-mail profil', 'profile'],
            ['company.tradeName', 'Nom commercial', 'company'], ['company.legalName', 'Raison sociale', 'company'], ['company.address', 'Adresse', 'company'],
            ['company.email', 'E-mail entreprise', 'company'], ['company.siret', 'SIRET', 'company'], ['company.vatNumber', 'Numéro de TVA', 'company'],
            ['billing.quotePrefix', 'Préfixe Devis', 'billing'], ['billing.invoicePrefix', 'Préfixe Facture', 'billing']
        ];
        var missing = required.filter(function (item) { return !g(settings, item[0]); });
        out.innerHTML += '<section class="settings-form-card settings-home-missing"><h3>Informations essentielles</h3>' +
            (missing.length ? '<ul>' + missing.map(function (item) {
                return '<li><a href="#' + item[2] + '" data-highlight="' + item[0].split('.').slice(1).join('.') + '">' + e(item[1]) + '</a></li>';
            }).join('') + '</ul>' : '<p class="settings-readonly">Toutes les informations essentielles sont renseignées.</p>') +
            '</section>';
    }

    function getChoices(path, key) {
        if (choicesByPath[sec + '.' + path]) return choicesByPath[sec + '.' + path];
        if (choicesByKey[key]) return choicesByKey[key];
        if (key === 'initialStatus') {
            var statuses = draft.statuses || [];
            return statuses.filter(function (item) { return item.active !== false; }).map(function (item) { return [item.id, item.label]; });
        }
        return null;
    }

    function getMultipleChoices(path, key) {
        if (multiple[key]) return multiple[key];
        if (key === 'quoteAllowedStatuses') {
            return (draft.statuses || []).map(function (item) { return [item.id, item.label]; });
        }
        return null;
    }

    function renderColorPicker(path, index, selected) {
        return '<div class="settings-color-picker" role="group" aria-label="Couleur du badge">' + colorChoices.map(function (choice) {
            var active = choice[0] === selected;
            return '<button type="button" class="settings-color-choice settings-color-' + choice[0] + (active ? ' is-selected' : '') + '" data-reference-color="' + e(path) + '" data-index="' + index + '" data-color="' + choice[0] + '" aria-pressed="' + (active ? 'true' : 'false') + '"><span class="settings-color-dot"></span><span>' + e(choice[1]) + '</span></button>';
        }).join('') + '</div>';
    }

    function renderReferenceList(path, items) {
        var label = C.label(path.split('.').pop());
        return '<div class="settings-field settings-field-full" data-setting-anchor="' + e(path) + '">' +
            '<div class="settings-list-toolbar"><span class="settings-field-label">' + e(label) + '</span><button type="button" class="btn-secondary" data-reference-add="' + e(path) + '">Ajouter</button></div>' +
            '<div class="settings-list">' + items.map(function (item, index) {
                return '<div class="settings-reference-row' + (item.active === false ? ' settings-list-row-disabled' : '') + '" data-reference-row="' + e(path) + '" data-index="' + index + '">' +
                    '<div class="settings-reference-main"><span class="settings-badge-preview settings-color-' + e(item.color || 'neutral') + '">' + e(item.label) + '</span>' +
                    '<label class="settings-inline-toggle"><input type="checkbox" data-reference-active="' + e(path) + '" data-index="' + index + '"' + (item.active !== false ? ' checked' : '') + '> Actif</label></div>' +
                    renderColorPicker(path, index, item.color || 'neutral') +
                    '<div class="settings-reference-actions"><button type="button" class="settings-action-btn" data-reference-rename="' + e(path) + '" data-index="' + index + '">Renommer</button><button type="button" class="settings-action-btn settings-action-danger" data-reference-delete="' + e(path) + '" data-index="' + index + '">Supprimer</button><button type="button" class="settings-icon-btn" data-reference-up="' + e(path) + '" data-index="' + index + '" aria-label="Monter">↑</button><button type="button" class="settings-icon-btn" data-reference-down="' + e(path) + '" data-index="' + index + '" aria-label="Descendre">↓</button></div>' +
                '</div>';
            }).join('') + '</div></div>';
    }

    function renderStringList(path, values) {
        var label = C.label(path.split('.').pop());
        return '<div class="settings-field settings-field-full" data-setting-anchor="' + e(path) + '">' +
            '<div class="settings-list-toolbar"><span class="settings-field-label">' + e(label) + '</span><button type="button" class="btn-secondary" data-string-add="' + e(path) + '">Ajouter</button></div>' +
            '<div class="settings-list">' + values.map(function (value, index) {
                return '<div class="settings-option-row"><span class="settings-option-label">' + e(value) + '</span><div class="settings-reference-actions"><button type="button" class="settings-action-btn" data-string-rename="' + e(path) + '" data-index="' + index + '">Renommer</button><button type="button" class="settings-action-btn settings-action-danger" data-string-delete="' + e(path) + '" data-index="' + index + '">Supprimer</button><button type="button" class="settings-icon-btn" data-string-up="' + e(path) + '" data-index="' + index + '" aria-label="Monter">↑</button><button type="button" class="settings-icon-btn" data-string-down="' + e(path) + '" data-index="' + index + '" aria-label="Descendre">↓</button></div></div>';
            }).join('') + '</div></div>';
    }

    function renderField(path, key, value) {
        if (sec === 'clients' && path === 'customFields') return '';

        if (Array.isArray(value)) {
            if (value.length && typeof value[0] === 'object') return renderReferenceList(path, value);
            var checks = getMultipleChoices(path, key);
            if (checks) {
                return '<div class="settings-field settings-field-full" data-setting-anchor="' + e(path) + '"><label>' + e(C.label(key)) + '</label><div class="settings-checkbox-grid">' + checks.map(function (option) {
                    return '<label><input type="checkbox" data-array-path="' + e(path) + '" value="' + e(option[0]) + '"' + (value.indexOf(option[0]) >= 0 ? ' checked' : '') + '> ' + e(option[1]) + '</label>';
                }).join('') + '</div></div>';
            }
            return renderStringList(path, value);
        }

        if (value && typeof value === 'object') {
            return '<div class="settings-field settings-field-full settings-subsection-title"><strong>' + e(C.label(key)) + '</strong></div>' + render(value, path);
        }

        if (typeof value === 'boolean') {
            return '<div class="settings-field" data-setting-anchor="' + e(path) + '"><label class="settings-toggle"><input type="checkbox" data-path="' + e(path) + '"' + (value ? ' checked' : '') + '><span>' + e(C.label(key)) + '</span></label></div>';
        }

        var choices = getChoices(path, key);
        var control;
        if (choices) {
            control = '<select data-path="' + e(path) + '">' + choices.map(function (option) {
                return '<option value="' + e(option[0]) + '"' + (String(option[0]) === String(value) ? ' selected' : '') + '>' + e(option[1]) + '</option>';
            }).join('') + '</select>';
        } else if (typeof value === 'number') {
            control = '<input type="number" data-path="' + e(path) + '" value="' + e(value) + '">';
        } else {
            var type = /Time$/.test(key) ? 'time' : /Date$/.test(key) || /Start$/.test(key) || /End$/.test(key) ? 'date' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : key === 'logoUrl' ? 'url' : 'text';
            control = '<input type="' + type + '" data-path="' + e(path) + '" value="' + e(value) + '">';
        }
        return '<div class="settings-field" data-setting-anchor="' + e(path) + '"><label>' + e(C.label(key)) + '</label>' + control + '</div>';
    }

    function render(object, prefix) {
        return Object.keys(object).map(function (key) {
            var path = pathFor(prefix, key);
            return renderField(path, key, object[key]);
        }).join('');
    }

    function form() {
        out.innerHTML = '<div class="settings-form-grid"><section class="settings-form-card"><p class="settings-card-hint">Tous les réglages ci-dessous peuvent être modifiés et enregistrés.</p><div class="settings-card-grid">' + render(draft, '') + '</div></section></div>';
        bindForm();
        if (highlight) {
            var node = out.querySelector('[data-setting-anchor="' + highlight + '"]');
            if (node) {
                node.classList.add('settings-highlight');
                node.scrollIntoView({ block: 'center' });
            }
            highlight = '';
        }
    }

    function bindForm() {
        out.querySelectorAll('[data-path]').forEach(function (node) {
            node.onchange = node.oninput = function () {
                var value = node.type === 'checkbox' ? node.checked : node.type === 'number' ? Number(node.value) : node.value;
                put(draft, node.dataset.path, value);
                changed();
            };
        });
        out.querySelectorAll('[data-array-path]').forEach(function (node) {
            node.onchange = function () {
                var path = node.dataset.arrayPath;
                var values = Array.prototype.map.call(out.querySelectorAll('[data-array-path="' + path + '"]:checked'), function (input) { return input.value; });
                put(draft, path, values);
                changed();
            };
        });
        bindListActions();
    }

    function moveItem(path, index, delta) {
        var list = g(draft, path);
        var target = index + delta;
        if (!list || target < 0 || target >= list.length) return;
        var item = list[index];
        list[index] = list[target];
        list[target] = item;
        list.forEach(function (entry, i) { if (entry && typeof entry === 'object') entry.order = i + 1; });
        changed();
        form();
    }

    function editListValue(title, currentValue, onSave) {
        modal(title, '<label class="settings-modal-field">Libellé<input id="settings-modal-value" type="text" value="' + e(currentValue || '') + '" placeholder="Saisissez un libellé"></label>', [
            { text: 'Annuler', fn: closeModal },
            { text: 'Enregistrer', main: true, fn: function () {
                var value = $('settings-modal-value').value.trim();
                if (!value) return;
                onSave(value);
                closeModal();
                changed();
                form();
            } }
        ]);
        setTimeout(function () { var input = $('settings-modal-value'); if (input) { input.focus(); input.select(); } }, 0);
    }

    function confirmDelete(label, onConfirm) {
        modal('Supprimer « ' + label + ' »', '<p>Cette option sera retirée de la liste.</p>', [
            { text: 'Annuler', fn: closeModal },
            { text: 'Supprimer', main: true, fn: function () { onConfirm(); closeModal(); changed(); form(); } }
        ]);
    }

    function bindListActions() {
        out.querySelectorAll('[data-reference-color]').forEach(function (button) {
            button.onclick = function () {
                var list = g(draft, button.dataset.referenceColor);
                list[Number(button.dataset.index)].color = button.dataset.color;
                changed();
                form();
            };
        });
        out.querySelectorAll('[data-reference-active]').forEach(function (input) {
            input.onchange = function () {
                g(draft, input.dataset.referenceActive)[Number(input.dataset.index)].active = input.checked;
                changed();
                form();
            };
        });
        out.querySelectorAll('[data-reference-add]').forEach(function (button) {
            button.onclick = function () {
                var path = button.dataset.referenceAdd;
                editListValue('Ajouter une option', '', function (value) {
                    var list = g(draft, path);
                    list.push({ id: S.createReferenceId(value, list), label: value, color: 'neutral', active: true, order: list.length + 1 });
                });
            };
        });
        out.querySelectorAll('[data-reference-rename]').forEach(function (button) {
            button.onclick = function () {
                var path = button.dataset.referenceRename;
                var item = g(draft, path)[Number(button.dataset.index)];
                editListValue('Renommer une option', item.label, function (value) { item.label = value; });
            };
        });
        out.querySelectorAll('[data-reference-delete]').forEach(function (button) {
            button.onclick = function () {
                var path = button.dataset.referenceDelete;
                var list = g(draft, path);
                var index = Number(button.dataset.index);
                confirmDelete(list[index].label, function () {
                    list.splice(index, 1);
                    list.forEach(function (item, i) { item.order = i + 1; });
                });
            };
        });
        out.querySelectorAll('[data-reference-up]').forEach(function (button) { button.onclick = function () { moveItem(button.dataset.referenceUp, Number(button.dataset.index), -1); }; });
        out.querySelectorAll('[data-reference-down]').forEach(function (button) { button.onclick = function () { moveItem(button.dataset.referenceDown, Number(button.dataset.index), 1); }; });

        out.querySelectorAll('[data-string-add]').forEach(function (button) {
            button.onclick = function () {
                var path = button.dataset.stringAdd;
                editListValue('Ajouter une option', '', function (value) { g(draft, path).push(value); });
            };
        });
        out.querySelectorAll('[data-string-rename]').forEach(function (button) {
            button.onclick = function () {
                var path = button.dataset.stringRename;
                var list = g(draft, path);
                var index = Number(button.dataset.index);
                editListValue('Renommer une option', list[index], function (value) { list[index] = value; });
            };
        });
        out.querySelectorAll('[data-string-delete]').forEach(function (button) {
            button.onclick = function () {
                var path = button.dataset.stringDelete;
                var list = g(draft, path);
                var index = Number(button.dataset.index);
                confirmDelete(list[index], function () { list.splice(index, 1); });
            };
        });
        out.querySelectorAll('[data-string-up]').forEach(function (button) { button.onclick = function () { moveItem(button.dataset.stringUp, Number(button.dataset.index), -1); }; });
        out.querySelectorAll('[data-string-down]').forEach(function (button) { button.onclick = function () { moveItem(button.dataset.stringDown, Number(button.dataset.index), 1); }; });
    }

    function dataPage() {
        out.innerHTML = '<div class="settings-data-actions">' +
            '<article class="settings-data-card"><h3>Vider le cache</h3><p>Supprime les fichiers temporaires sans effacer vos paramètres ni vos données.</p><button id="settings-clear-cache" class="btn-secondary">Vider le cache</button></article>' +
            '<article class="settings-data-card"><h3>Réinitialiser l’affichage</h3><p>Restaure la densité, la pagination, les formats visuels et la couleur d’accent.</p><button id="settings-reset-display" class="btn-secondary">Réinitialiser les préférences d’affichage</button></article>' +
            '</div>';

        $('settings-clear-cache').onclick = function () {
            var work = [];
            try { sessionStorage.clear(); } catch (ignore) {}
            if (window.caches && caches.keys) {
                work.push(caches.keys().then(function (keys) { return Promise.all(keys.map(function (key) { return caches.delete(key); })); }));
            }
            Promise.all(work).then(function () { toast('Cache vidé'); }).catch(function () { toast('Le cache n’a pas pu être entièrement vidé', true); });
        };
        $('settings-reset-display').onclick = function () {
            modal('Réinitialiser les préférences d’affichage', '<p>La densité, la pagination et les autres préférences visuelles seront restaurées.</p>', [
                { text: 'Annuler', fn: closeModal },
                { text: 'Réinitialiser', main: true, fn: function () {
                    S.resetSection('appearance');
                    var appearance = S.getSection('appearance');
                    ['clients', 'products'].forEach(function (sectionName) {
                        var section = S.getSection(sectionName);
                        section.pageSize = appearance.defaultPageSize;
                        S.updateSection(sectionName, section);
                    });
                    closeModal();
                    toast('Préférences d’affichage réinitialisées');
                } }
            ]);
        };
    }

    function security() {
        out.innerHTML = '';
    }

    function validate() {
        var errors = [];
        if (sec === 'profile' && (!draft.firstName || !draft.lastName)) errors.push('Prénom et nom requis');
        if (sec === 'company' && (!draft.tradeName || !draft.legalName)) errors.push('Entreprise incomplète');
        if (sec === 'agenda' && draft.startTime >= draft.endTime) errors.push('Horaires invalides');
        if (sec === 'dashboard' && draft.defaultPeriod === 'custom' && (!draft.customPeriodStart || !draft.customPeriodEnd)) errors.push('Dates personnalisées requises');
        return errors;
    }

    function syncGlobalPageSize(size) {
        ['clients', 'products'].forEach(function (sectionName) {
            var section = S.getSection(sectionName);
            if (!section) return;
            section.pageSize = Number(size);
            S.updateSection(sectionName, section);
        });
    }

    function saveNow() {
        var errors = validate();
        if (errors.length) {
            VALID.innerHTML = '<ul>' + errors.map(function (error) { return '<li>' + e(error) + '</li>'; }).join('') + '</ul>';
            VALID.hidden = false;
            return;
        }
        try {
            S.updateSection(sec, draft);
            if (sec === 'appearance' && originalDraft && Number(originalDraft.defaultPageSize) !== Number(draft.defaultPageSize)) {
                syncGlobalPageSize(draft.defaultPageSize);
            }
            draft = S.getSection(sec);
            originalDraft = clone(draft);
            clean();
            toast('Paramètres enregistrés');
            form();
        } catch (error) {
            toast(error.message, true);
        }
    }

    function resetNow() {
        modal('Réinitialiser la section', '<p>Restaurer les valeurs par défaut de cette section ?</p>', [
            { text: 'Annuler', fn: closeModal },
            { text: 'Confirmer', main: true, fn: function () {
                S.resetSection(sec);
                draft = S.getSection(sec);
                originalDraft = clone(draft);
                clean();
                closeModal();
                form();
            } }
        ]);
    }

    function nav(target, force) {
        if (dirty && !force) {
            modal('Modifications non enregistrées', '<p>Quitter sans enregistrer ?</p>', [
                { text: 'Rester', fn: closeModal },
                { text: 'Quitter', main: true, fn: function () { dirty = false; closeModal(); nav(target, true); } }
            ]);
            return;
        }
        sec = C.sections[target] ? target : 'home';
        location.hash = sec;
        document.querySelectorAll('[data-section-link]').forEach(function (link) {
            link.classList.toggle('settings-nav-active', link.dataset.sectionLink === sec);
        });
        T.textContent = C.sections[sec].title;
        D.textContent = C.sections[sec].description;
        A.style.display = ['home', 'data', 'security'].indexOf(sec) < 0 ? '' : 'none';
        clean();
        if (sec === 'home') home();
        else if (sec === 'data') dataPage();
        else if (sec === 'security') security();
        else {
            draft = S.getSection(sec);
            originalDraft = clone(draft);
            form();
        }
    }

    document.querySelectorAll('[data-section-link]').forEach(function (link) {
        link.onclick = function (event) { event.preventDefault(); nav(link.dataset.sectionLink); };
    });
    out.onclick = function (event) {
        var link = event.target.closest('a[href^="#"]');
        if (!link) return;
        event.preventDefault();
        highlight = link.dataset.highlight || '';
        nav(link.getAttribute('href').slice(1));
    };
    SAVE.onclick = saveNow;
    RESET.onclick = resetNow;

    SEARCH.oninput = function () {
        var query = SEARCH.value.trim();
        if (!query) { RESULTS.hidden = true; return; }
        var found = C.search(query, S.getDefaults()).filter(function (item) {
            return !(item.section === 'clients' && item.path === 'customFields');
        }).slice(0, 12);
        RESULTS.innerHTML = found.length ? found.map(function (item, index) {
            return '<button type="button" class="settings-search-result" data-index="' + index + '"><strong>' + e(item.label) + '</strong><span>' + e(C.sections[item.section].title) + '</span></button>';
        }).join('') : '<div class="settings-readonly">Aucun résultat</div>';
        RESULTS.hidden = false;
        RESULTS.querySelectorAll('[data-index]').forEach(function (button) {
            button.onclick = function () {
                var item = found[Number(button.dataset.index)];
                highlight = item.path;
                SEARCH.value = '';
                RESULTS.hidden = true;
                nav(item.section);
            };
        });
    };

    window.addEventListener('hashchange', function () {
        var hash = location.hash.slice(1) || 'home';
        if (hash !== sec) nav(hash);
    });
    window.addEventListener('beforeunload', function (event) {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = '';
    });

    window.COCKPIT_SETTINGS_UI_TEST = {
        search: function (query) { return C.search(query, S.getDefaults()); },
        colors: colorChoices.map(function (item) { return item[0]; })
    };

    reconcileDefaultPageSizeOnce();
    nav(location.hash.slice(1) || 'home', true);
})();
