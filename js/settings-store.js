// Cockpit Entrepreneur — V0.11
// Store local versionné des paramètres. Les données métier ne sont jamais incluses.
(function () {
    'use strict';

    var STORAGE_KEY = 'cockpit.settings.v1';
    var defaults = window.COCKPIT_SETTINGS_DEFAULTS;
    var listeners = [];
    var current;

    if (!defaults) {
        throw new Error('COCKPIT_SETTINGS_DEFAULTS doit être chargé avant settings-store.js');
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function coercePrimitive(value, template) {
        if (typeof template === 'boolean') {
            return value === true || value === 'true';
        }
        if (typeof template === 'number') {
            var number = Number(value);
            return Number.isFinite(number) ? number : template;
        }
        if (typeof template === 'string') {
            return value === null || value === undefined ? template : String(value).slice(0, 5000);
        }
        return clone(template);
    }

    function sanitizeArray(value, template, strict, path, errors) {
        if (!Array.isArray(value)) {
            if (strict) errors.push(path + ' doit être un tableau.');
            return clone(template);
        }
        if (template.length === 0) {
            return value.slice(0, 100).map(function (item) {
                if (typeof item === 'string') return item.slice(0, 200);
                if (isPlainObject(item)) {
                    var safe = {};
                    ['id', 'label', 'color', 'active', 'order', 'legacyId'].forEach(function (key) {
                        if (Object.prototype.hasOwnProperty.call(item, key)) safe[key] = item[key];
                    });
                    return safe;
                }
                return item;
            });
        }
        var itemTemplate = template[0];
        return value.slice(0, 100).map(function (item, index) {
            if (isPlainObject(itemTemplate)) {
                return sanitizeObject(item, itemTemplate, strict, path + '[' + index + ']', errors);
            }
            return coercePrimitive(item, itemTemplate);
        });
    }

    function sanitizeObject(value, template, strict, path, errors) {
        var source = isPlainObject(value) ? value : {};
        if (strict && !isPlainObject(value)) errors.push(path + ' doit être un objet.');
        if (strict) {
            Object.keys(source).forEach(function (key) {
                if (!Object.prototype.hasOwnProperty.call(template, key)) {
                    errors.push('Propriété inconnue refusée : ' + (path ? path + '.' : '') + key);
                }
            });
        }
        var output = {};
        Object.keys(template).forEach(function (key) {
            var childPath = path ? path + '.' + key : key;
            var proposed = Object.prototype.hasOwnProperty.call(source, key) ? source[key] : template[key];
            if (Array.isArray(template[key])) {
                output[key] = sanitizeArray(proposed, template[key], strict, childPath, errors);
            } else if (isPlainObject(template[key])) {
                output[key] = sanitizeObject(proposed, template[key], strict, childPath, errors);
            } else {
                output[key] = coercePrimitive(proposed, template[key]);
            }
        });
        return output;
    }

    function normalizeCollections(config) {
        ['clients', 'agenda', 'products', 'treasury'].forEach(function (sectionName) {
            var section = config[sectionName] || {};
            Object.keys(section).forEach(function (key) {
                var list = section[key];
                if (!Array.isArray(list) || !list.length || !isPlainObject(list[0]) || !Object.prototype.hasOwnProperty.call(list[0], 'order')) return;
                list.forEach(function (item, index) {
                    item.id = String(item.id || ('item-' + (index + 1))).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
                    item.label = String(item.label || item.id).slice(0, 120);
                    item.color = String(item.color || 'neutral');
                    item.active = item.active !== false;
                    item.order = index + 1;
                });
            });
        });
        return config;
    }

    function migrate(raw) {
        if (!isPlainObject(raw)) return clone(defaults);
        var migrated = clone(raw);
        if (!migrated.schemaVersion || migrated.schemaVersion < 1) {
            migrated.schemaVersion = 1;
        }
        return migrated;
    }

    function load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return clone(defaults);
            return normalizeCollections(sanitizeObject(migrate(JSON.parse(raw)), defaults, false, '', []));
        } catch (error) {
            console.warn('[Cockpit Settings] Configuration locale illisible, valeurs par défaut restaurées.', error);
            return clone(defaults);
        }
    }

    function persist(next, source) {
        current = normalizeCollections(sanitizeObject(next, defaults, false, '', []));
        current.schemaVersion = defaults.schemaVersion;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        listeners.slice().forEach(function (listener) {
            try { listener(clone(current), source || 'update'); } catch (error) { console.error(error); }
        });
        try {
            window.dispatchEvent(new CustomEvent('cockpit:settings-changed', { detail: { source: source || 'update', settings: clone(current) } }));
        } catch (ignore) {}
        return clone(current);
    }

    function get() {
        return clone(current);
    }

    function getSection(name) {
        if (!Object.prototype.hasOwnProperty.call(defaults, name) || name === 'schemaVersion') return null;
        return clone(current[name]);
    }

    function updateSection(name, values) {
        if (!Object.prototype.hasOwnProperty.call(defaults, name) || name === 'schemaVersion') {
            throw new Error('Section de paramètres inconnue : ' + name);
        }
        var errors = [];
        var sanitized = sanitizeObject(values, defaults[name], true, name, errors);
        if (errors.length) throw new Error(errors.join('\n'));
        var next = clone(current);
        next[name] = sanitized;
        return persist(next, 'section:' + name);
    }

    function resetSection(name) {
        if (!Object.prototype.hasOwnProperty.call(defaults, name) || name === 'schemaVersion') {
            throw new Error('Section de paramètres inconnue : ' + name);
        }
        var next = clone(current);
        next[name] = clone(defaults[name]);
        return persist(next, 'reset:' + name);
    }

    function resetAll() {
        return persist(clone(defaults), 'reset:all');
    }

    function validateImport(data) {
        var errors = [];
        if (!isPlainObject(data)) return { valid: false, errors: ['Le fichier doit contenir un objet JSON.'], normalized: null };
        if (data.schemaVersion && Number(data.schemaVersion) > Number(defaults.schemaVersion)) {
            errors.push('Version de schéma plus récente que celle prise en charge.');
        }
        var normalized = sanitizeObject(data, defaults, true, '', errors);
        normalized.schemaVersion = defaults.schemaVersion;
        return { valid: errors.length === 0, errors: errors, normalized: normalizeCollections(normalized) };
    }

    function importConfig(data) {
        var check = validateImport(data);
        if (!check.valid) throw new Error(check.errors.join('\n'));
        return persist(check.normalized, 'import');
    }

    function exportConfig() {
        return JSON.stringify({
            schemaVersion: defaults.schemaVersion,
            exportedAt: new Date().toISOString(),
            application: 'Cockpit Entrepreneur',
            note: 'Configuration locale uniquement. Les données métier ne sont pas incluses.',
            settings: get()
        }, null, 2);
    }

    function importExportEnvelope(data) {
        if (isPlainObject(data) && isPlainObject(data.settings)) return importConfig(data.settings);
        return importConfig(data);
    }

    function loadDemo() {
        var next = clone(defaults);
        next.demo.enabled = true;
        return persist(next, 'demo');
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') return function () {};
        listeners.push(listener);
        return function () {
            listeners = listeners.filter(function (entry) { return entry !== listener; });
        };
    }

    current = load();

    window.COCKPIT_SETTINGS = {
        STORAGE_KEY: STORAGE_KEY,
        get: get,
        getSection: getSection,
        updateSection: updateSection,
        resetSection: resetSection,
        resetAll: resetAll,
        exportConfig: exportConfig,
        importConfig: importExportEnvelope,
        validateImport: function (data) {
            return validateImport(isPlainObject(data) && isPlainObject(data.settings) ? data.settings : data);
        },
        loadDemo: loadDemo,
        subscribe: subscribe,
        getDefaults: function () { return clone(defaults); },
        getSchemaVersion: function () { return defaults.schemaVersion; }
    };
})();
