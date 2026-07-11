// Cockpit Entrepreneur — V0.11
// Store local versionné : configuration seulement, jamais les données métier.
(function () {
    'use strict';

    var STORAGE_KEY = 'cockpit.settings.v1';
    var defaults = window.COCKPIT_SETTINGS_DEFAULTS;
    var listeners = [];
    var current;
    var REFERENCE_KEYS = ['id', 'legacyId', 'label', 'color', 'active', 'order'];

    if (!defaults) throw new Error('COCKPIT_SETTINGS_DEFAULTS doit être chargé avant settings-store.js');

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
    function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
    function slug(value) {
        var text = String(value || '').normalize ? String(value || '').normalize('NFD') : String(value || '');
        return text.replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'valeur';
    }
    function coercePrimitive(value, template) {
        if (typeof template === 'boolean') return value === true || value === 'true';
        if (typeof template === 'number') {
            var n = Number(value);
            return Number.isFinite(n) ? n : template;
        }
        if (typeof template === 'string') return value === null || value === undefined ? template : String(value).slice(0, 5000);
        return clone(template);
    }
    function isReferenceTemplate(template) {
        return Array.isArray(template) && template.length && isPlainObject(template[0]) && own(template[0], 'id') && own(template[0], 'order');
    }
    function sanitizeReferenceItem(value, strict, path, errors) {
        var item = isPlainObject(value) ? value : {};
        if (strict && !isPlainObject(value)) errors.push(path + ' doit être un objet.');
        if (strict) Object.keys(item).forEach(function (key) {
            if (REFERENCE_KEYS.indexOf(key) === -1) errors.push('Propriété inconnue refusée : ' + path + '.' + key);
        });
        var result = {
            id: own(item, 'id') ? String(item.id).slice(0, 80) : '',
            label: own(item, 'label') ? String(item.label).slice(0, 120) : '',
            color: own(item, 'color') ? String(item.color).slice(0, 30) : 'neutral',
            active: item.active !== false,
            order: Number.isFinite(Number(item.order)) ? Number(item.order) : 0
        };
        if (own(item, 'legacyId') && item.legacyId !== null && item.legacyId !== '') result.legacyId = String(item.legacyId).slice(0, 80);
        return result;
    }
    function sanitizeArray(value, template, strict, path, errors) {
        if (!Array.isArray(value)) {
            if (strict) errors.push(path + ' doit être un tableau.');
            return clone(template);
        }
        if (isReferenceTemplate(template)) return value.slice(0, 100).map(function (item, index) { return sanitizeReferenceItem(item, strict, path + '[' + index + ']', errors); });
        if (template.length === 0) {
            return value.slice(0, 100).map(function (item, index) {
                if (typeof item === 'string') return item.slice(0, 200);
                if (isPlainObject(item)) {
                    var safe = {};
                    Object.keys(item).forEach(function (key) {
                        if (REFERENCE_KEYS.indexOf(key) !== -1) safe[key] = item[key];
                        else if (strict) errors.push('Propriété inconnue refusée : ' + path + '[' + index + '].' + key);
                    });
                    return safe;
                }
                if (strict) errors.push(path + '[' + index + '] possède un type incompatible.');
                return String(item).slice(0, 200);
            });
        }
        var itemTemplate = template[0];
        return value.slice(0, 100).map(function (item, index) {
            if (isPlainObject(itemTemplate)) return sanitizeObject(item, itemTemplate, strict, path + '[' + index + ']', errors);
            return coercePrimitive(item, itemTemplate);
        });
    }
    function sanitizeObject(value, template, strict, path, errors) {
        var source = isPlainObject(value) ? value : {};
        if (strict && !isPlainObject(value)) errors.push((path || 'La racine') + ' doit être un objet.');
        if (strict) Object.keys(source).forEach(function (key) {
            if (!own(template, key)) errors.push('Propriété inconnue refusée : ' + (path ? path + '.' : '') + key);
        });
        var output = {};
        Object.keys(template).forEach(function (key) {
            var childPath = path ? path + '.' + key : key;
            var proposed = own(source, key) ? source[key] : template[key];
            if (Array.isArray(template[key])) output[key] = sanitizeArray(proposed, template[key], strict, childPath, errors);
            else if (isPlainObject(template[key])) output[key] = sanitizeObject(proposed, template[key], strict, childPath, errors);
            else output[key] = coercePrimitive(proposed, template[key]);
        });
        return output;
    }
    function makeUniqueId(base, reserved) {
        var root = slug(base), candidate = root, sequence = 2;
        while (reserved[candidate]) candidate = root + '-' + sequence++;
        reserved[candidate] = true;
        return candidate;
    }
    function normalizeReferenceList(list, strict, path, errors) {
        var normalized = (list || []).map(clone);
        var legacyReserved = {};
        normalized.forEach(function (item) {
            if (!item.legacyId) return;
            var legacy = slug(item.legacyId);
            if (legacyReserved[legacy]) {
                if (strict) errors.push('legacyId dupliqué dans ' + path + ' : ' + legacy);
                delete item.legacyId;
            } else {
                legacyReserved[legacy] = true;
                item.legacyId = legacy;
            }
        });
        var ids = {};
        normalized.forEach(function (item, index) {
            var proposed = slug(item.id || item.label || ('valeur-' + (index + 1)));
            if (legacyReserved[proposed] || ids[proposed]) {
                if (strict && item.id) errors.push('Identifiant en collision dans ' + path + ' : ' + proposed);
                proposed = makeUniqueId(proposed, Object.assign({}, legacyReserved, ids));
            }
            ids[proposed] = true;
            item.id = proposed;
            item.label = String(item.label || proposed).slice(0, 120);
            item.color = ['neutral', 'info', 'success', 'warning', 'danger'].indexOf(item.color) !== -1 ? item.color : 'neutral';
            item.active = item.active !== false;
            item.order = index + 1;
        });
        return normalized;
    }
    function normalizeCollections(config, strict, errors) {
        ['clients', 'agenda', 'products', 'treasury'].forEach(function (sectionName) {
            var section = config[sectionName] || {};
            Object.keys(section).forEach(function (key) {
                var list = section[key];
                if (!Array.isArray(list) || !list.length || !isPlainObject(list[0]) || !own(list[0], 'order')) return;
                section[key] = normalizeReferenceList(list, strict, sectionName + '.' + key, errors || []);
            });
        });
        return config;
    }
    function migrateAgendaStatusCompatibility(config) {
        if (!isPlainObject(config) || !isPlainObject(config.agenda) || !Array.isArray(config.agenda.statuses)) return config;
        var agenda = config.agenda;
        var statuses = agenda.statuses;
        var oldNoFollowUpWasCancelled = false;

        statuses.forEach(function (item) {
            if (!isPlainObject(item)) return;
            var id = String(item.id || '');
            var legacyId = String(item.legacyId || '');
            var label = String(item.label || '');
            var isNoFollowUp = id === 'no-follow-up' || id === 'sans-suite' || id === 'sans_suite' ||
                legacyId === 'sans-suite' || legacyId === 'sans_suite' ||
                (id === 'cancelled' && /sans\s*suite/i.test(label));

            if (isNoFollowUp) {
                if (id === 'cancelled') oldNoFollowUpWasCancelled = true;
                item.id = 'no-follow-up';
                item.legacyId = 'sans_suite';
                if (!item.label) item.label = 'Sans suite';
            } else if (id === 'annule' || legacyId === 'annule') {
                item.id = 'cancelled';
                item.legacyId = 'annule';
                if (!item.label) item.label = 'Annulé';
            }
        });

        var seen = {};
        statuses = statuses.filter(function (item) {
            if (!isPlainObject(item)) return true;
            var token = item.legacyId === 'annule' || item.id === 'annule' || item.id === 'cancelled' ? 'annule' :
                item.legacyId === 'sans_suite' || item.legacyId === 'sans-suite' || item.id === 'sans_suite' || item.id === 'sans-suite' || item.id === 'no-follow-up' ? 'sans_suite' : '';
            if (!token) return true;
            if (seen[token]) return false;
            seen[token] = true;
            return true;
        });

        function defaultStatus(legacyId) {
            return clone(defaults.agenda.statuses.filter(function (item) { return item.legacyId === legacyId; })[0]);
        }
        if (!seen.annule) {
            var noFollowUpIndex = statuses.findIndex(function (item) { return isPlainObject(item) && item.legacyId === 'sans_suite'; });
            var cancelled = defaultStatus('annule');
            if (noFollowUpIndex >= 0) statuses.splice(noFollowUpIndex, 0, cancelled);
            else statuses.push(cancelled);
        }
        if (!seen.sans_suite) statuses.push(defaultStatus('sans_suite'));

        agenda.statuses = statuses;
        if (agenda.initialStatus === 'sans-suite' || agenda.initialStatus === 'sans_suite') agenda.initialStatus = 'no-follow-up';
        else if (agenda.initialStatus === 'annule') agenda.initialStatus = 'cancelled';
        else if (agenda.initialStatus === 'cancelled' && oldNoFollowUpWasCancelled) agenda.initialStatus = 'no-follow-up';
        return config;
    }
    function migrate(raw) {
        if (!isPlainObject(raw)) return clone(defaults);
        var version = Number(raw.schemaVersion || 0);
        if (version > Number(defaults.schemaVersion)) throw new Error('Version locale plus récente que celle prise en charge.');
        var migrated = clone(raw);
        if (version < 1) migrated.schemaVersion = 1;
        if (version < 2) migrated.schemaVersion = 2;
        return migrateAgendaStatusCompatibility(migrated);
    }
    function load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return clone(defaults);
            return normalizeCollections(sanitizeObject(migrate(JSON.parse(raw)), defaults, false, '', []), false, []);
        } catch (error) {
            console.warn('[Cockpit Settings] Configuration locale illisible ou incompatible, valeurs par défaut utilisées.', error);
            return clone(defaults);
        }
    }
    function persist(next, source) {
        current = normalizeCollections(sanitizeObject(migrateAgendaStatusCompatibility(clone(next)), defaults, false, '', []), false, []);
        current.schemaVersion = defaults.schemaVersion;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        listeners.slice().forEach(function (listener) { try { listener(clone(current), source || 'update'); } catch (error) { console.error(error); } });
        try { window.dispatchEvent(new CustomEvent('cockpit:settings-changed', { detail: { source: source || 'update', settings: clone(current) } })); } catch (ignore) {}
        return clone(current);
    }
    function get() { return clone(current); }
    function getSection(name) { if (!own(defaults, name) || name === 'schemaVersion') return null; return clone(current[name]); }
    function updateSection(name, values) {
        if (!own(defaults, name) || name === 'schemaVersion') throw new Error('Section de paramètres inconnue : ' + name);
        var errors = [], sanitized = sanitizeObject(values, defaults[name], true, name, errors), next = clone(current);
        next[name] = sanitized;
        normalizeCollections(next, true, errors);
        if (errors.length) throw new Error(errors.join('\n'));
        return persist(next, 'section:' + name);
    }
    function resetSection(name) {
        if (!own(defaults, name) || name === 'schemaVersion') throw new Error('Section de paramètres inconnue : ' + name);
        var next = clone(current); next[name] = clone(defaults[name]); return persist(next, 'reset:' + name);
    }
    function resetAll() { return persist(clone(defaults), 'reset:all'); }
    function unwrap(data) { return isPlainObject(data) && isPlainObject(data.settings) ? data.settings : data; }
    function flatten(value, prefix, result) {
        result = result || {};
        if (Array.isArray(value)) result[prefix] = clone(value);
        else if (isPlainObject(value)) Object.keys(value).forEach(function (key) { flatten(value[key], prefix ? prefix + '.' + key : key, result); });
        else result[prefix] = value;
        return result;
    }
    function summarizeImport(rawInput, normalized) {
        var raw = unwrap(rawInput), before = current, changedSections = [], changes = [], additions = [], resets = [];
        Object.keys(defaults).forEach(function (section) {
            if (section === 'schemaVersion') return;
            if (JSON.stringify(before[section]) !== JSON.stringify(normalized[section])) changedSections.push(section);
            if (!own(raw, section) && JSON.stringify(before[section]) !== JSON.stringify(defaults[section])) resets.push(section);
        });
        var a = flatten(before, '', {}), b = flatten(normalized, '', {});
        Object.keys(b).forEach(function (path) {
            if (path === 'schemaVersion' || JSON.stringify(a[path]) === JSON.stringify(b[path])) return;
            if (Array.isArray(b[path])) {
                var oldIds = (a[path] || []).filter(isPlainObject).map(function (item) { return item.id; });
                (b[path] || []).filter(isPlainObject).forEach(function (item) { if (oldIds.indexOf(item.id) === -1) additions.push(path + ' : ' + (item.label || item.id)); });
                changes.push(path + ' : ' + (a[path] || []).length + ' → ' + b[path].length + ' valeur(s)');
            } else changes.push(path + ' : ' + JSON.stringify(a[path]) + ' → ' + JSON.stringify(b[path]));
        });
        return { sections: changedSections, changes: changes.slice(0, 20), additions: additions.slice(0, 20), resets: resets };
    }
    function validateImport(data) {
        var raw = unwrap(data), errors = [];
        if (!isPlainObject(raw)) return { valid: false, errors: ['Le fichier doit contenir un objet JSON de configuration.'], normalized: null, summary: null };
        if (own(raw, 'schemaVersion') && !Number.isFinite(Number(raw.schemaVersion))) errors.push('schemaVersion doit être numérique.');
        if (Number(raw.schemaVersion || 0) > Number(defaults.schemaVersion)) errors.push('Version de schéma plus récente que celle prise en charge.');
        var normalized = sanitizeObject(migrate(raw), defaults, true, '', errors);
        normalized.schemaVersion = defaults.schemaVersion;
        normalizeCollections(normalized, true, errors);
        return { valid: errors.length === 0, errors: errors, normalized: normalized, summary: errors.length ? null : summarizeImport(data, normalized) };
    }
    function importConfig(data) { var check = validateImport(data); if (!check.valid) throw new Error(check.errors.join('\n')); return persist(check.normalized, 'import'); }
    function exportConfig() {
        return JSON.stringify({ schemaVersion: defaults.schemaVersion, exportedAt: new Date().toISOString(), application: 'Cockpit Entrepreneur', note: 'Configuration locale uniquement. Les données métier ne sont pas incluses.', settings: get() }, null, 2);
    }
    function loadDemo() { var next = clone(current); next.demo = clone(defaults.demo); next.demo.enabled = true; return persist(next, 'demo:enable'); }
    function disableDemo() { var next = clone(current); next.demo.enabled = false; return persist(next, 'demo:disable'); }
    function createReferenceId(label, list) {
        var reserved = {};
        (list || []).forEach(function (item) { if (item.id) reserved[slug(item.id)] = true; if (item.legacyId) reserved[slug(item.legacyId)] = true; });
        return makeUniqueId(label, reserved);
    }
    function subscribe(listener) {
        if (typeof listener !== 'function') return function () {};
        listeners.push(listener);
        return function () { listeners = listeners.filter(function (entry) { return entry !== listener; }); };
    }

    current = load();
    window.COCKPIT_SETTINGS = {
        STORAGE_KEY: STORAGE_KEY, get: get, getSection: getSection, updateSection: updateSection,
        resetSection: resetSection, resetAll: resetAll, exportConfig: exportConfig,
        importConfig: importConfig, validateImport: validateImport, loadDemo: loadDemo,
        disableDemo: disableDemo, createReferenceId: createReferenceId, subscribe: subscribe,
        getDefaults: function () { return clone(defaults); }, getSchemaVersion: function () { return defaults.schemaVersion; },
        __test: { migrate: migrate, normalizeReferenceList: function (list) { return normalizeReferenceList(list, false, 'test', []); }, slug: slug }
    };
})();
