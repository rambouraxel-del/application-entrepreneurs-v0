// Référentiels et alertes configurables — V0.11.3.
(function () {
    'use strict';
    var store = window.COCKPIT_SETTINGS;
    if (!store) return;
    var renderingAlerts = false;

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function badgeClass(color) {
        return 'badge-' + (['neutral','info','warning','success','danger'].indexOf(color) !== -1 ? color : 'neutral');
    }
    function activeSorted(list) {
        return (list || []).filter(function (item) { return item.active !== false; }).sort(function (a,b) { return (a.order || 0) - (b.order || 0); });
    }
    function usedValues(selector, attribute) {
        var result = [];
        document.querySelectorAll(selector).forEach(function (node) {
            var value = node.getAttribute(attribute);
            if (value && result.indexOf(value) === -1) result.push(value);
        });
        return result;
    }
    function rebuildSelect(select, list, emptyLabel, used) {
        if (!select) return;
        var previous = select.value;
        var byId = {};
        (list || []).forEach(function (item) { byId[item.id] = item; if (item.legacyId) byId[item.legacyId] = item; });
        var values = activeSorted(list).map(function (item) { return item.legacyId || item.id; });
        (used || []).forEach(function (value) { if (values.indexOf(value) === -1) values.push(value); });
        select.innerHTML = '';
        if (emptyLabel) { var empty = document.createElement('option'); empty.value = ''; empty.textContent = emptyLabel; select.appendChild(empty); }
        values.forEach(function (value) {
            var item = byId[value], option = document.createElement('option');
            option.value = value;
            option.textContent = item ? item.label + (item.active === false ? ' (désactivé)' : '') : value + ' (valeur existante)';
            select.appendChild(option);
        });
        if (Array.prototype.some.call(select.options, function (option) { return option.value === previous; })) select.value = previous;
    }
    function updateBadges(rows, attribute, cellIndex, list) {
        var byId = {};
        (list || []).forEach(function (item) { byId[item.id] = item; if (item.legacyId) byId[item.legacyId] = item; });
        Array.prototype.forEach.call(rows || [], function (row) {
            var value = row.getAttribute(attribute), item = byId[value];
            if (!item || !row.cells || !row.cells[cellIndex]) return;
            var badge = row.cells[cellIndex].querySelector('.badge');
            if (badge) { badge.textContent = item.label; badge.className = 'badge ' + badgeClass(item.color); }
        });
    }
    function applyClients() {
        var c = store.getSection('clients');
        window.COCKPIT_CLIENT_DEFAULTS = clone(c);
        if (window.COCKPIT_CLIENT_STATUSES) {
            window.COCKPIT_CLIENT_STATUSES.splice(0, window.COCKPIT_CLIENT_STATUSES.length);
            activeSorted(c.statuses).forEach(function (item) { window.COCKPIT_CLIENT_STATUSES.push({ value:item.id, label:item.label, badgeClass:badgeClass(item.color) }); });
        }
        var rows = document.querySelectorAll('#clients-table tbody tr');
        rebuildSelect(document.getElementById('clients-status-filter'), c.statuses, 'Tous les statuts', usedValues('#clients-table tbody tr','data-status'));
        updateBadges(rows, 'data-status', 2, c.statuses);
    }
    function applyProducts() {
        var p = store.getSection('products');
        window.COCKPIT_PRODUCT_DEFAULTS = clone(p);
        if (window.COCKPIT_PRODUCT_TYPES) {
            window.COCKPIT_PRODUCT_TYPES.splice(0, window.COCKPIT_PRODUCT_TYPES.length);
            activeSorted(p.types).forEach(function (item) { window.COCKPIT_PRODUCT_TYPES.push({ value:item.id, label:item.label, badgeClass:badgeClass(item.color) }); });
        }
        if (window.COCKPIT_PRODUCT_STATUSES) {
            window.COCKPIT_PRODUCT_STATUSES.splice(0, window.COCKPIT_PRODUCT_STATUSES.length);
            activeSorted(p.statuses).forEach(function (item) { window.COCKPIT_PRODUCT_STATUSES.push({ value:item.id, label:item.label, badgeClass:badgeClass(item.color) }); });
        }
        var rows = document.querySelectorAll('#products-table tbody tr');
        rebuildSelect(document.getElementById('products-type-filter'), p.types, 'Tous les types', usedValues('#products-table tbody tr','data-type'));
        rebuildSelect(document.getElementById('products-status-filter'), p.statuses, 'Tous les statuts', usedValues('#products-table tbody tr','data-status'));
        updateBadges(rows, 'data-type', 1, p.types);
        updateBadges(rows, 'data-status', 4, p.statuses);
    }
    function applyAgendaStatuses() {
        var a = store.getSection('agenda');
        window.COCKPIT_APPOINTMENT_DEFAULTS = clone(a);
        if (window.COCKPIT_RDV_STATUSES) {
            window.COCKPIT_RDV_STATUSES.splice(0, window.COCKPIT_RDV_STATUSES.length);
            activeSorted(a.statuses).forEach(function (item) { window.COCKPIT_RDV_STATUSES.push({ value:item.legacyId || item.id, label:item.label, badgeClass:badgeClass(item.color) }); });
        }
    }
    function parseFr(value) {
        if (!value) return null;
        var p = String(value).split('/');
        if (p.length !== 3) return null;
        var date = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
        date.setHours(0,0,0,0);
        return isNaN(date.getTime()) ? null : date;
    }
    function daysBetween(a,b) { return Math.floor((b.getTime() - a.getTime()) / 86400000); }
    function today() { var d=new Date();d.setHours(0,0,0,0);return d; }
    function buildAlerts() {
        var config = store.getSection('alerts'), dashboard = store.getSection('dashboard'), alerts = [], now = today();
        window.COCKPIT_ALERT_CONFIG = clone(config);

        if (config.overdueInvoice.enabled && window.COCKPIT_FACTURE_DETAILS && window.COCKPIT_FACTURE_CALC && window.COCKPIT_DEVIS_CALC) {
            Object.keys(window.COCKPIT_FACTURE_DETAILS).forEach(function (key) {
                var invoice = window.COCKPIT_FACTURE_DETAILS[key];
                if (invoice.statutEmission !== 'emise') return;
                var totals = window.COCKPIT_DEVIS_CALC.computeDevisTotals(invoice.lignes || []);
                var status = window.COCKPIT_FACTURE_CALC.computeStatutAffiche({ statutEmission:invoice.statutEmission, paiements:invoice.paiements || [], totalTTC:totals.totalTTC, dateEcheance:invoice.dateEcheance });
                if (status === 'en-retard') alerts.push({ type:'invoice', level:'danger', text:'Facture ' + (invoice.numero || key) + ' en retard.', href:'facture-edition.html?facture=' + encodeURIComponent(key) });
            });
        }
        if (config.quoteNoReply.enabled && window.COCKPIT_DEVIS_DETAILS) {
            Object.keys(window.COCKPIT_DEVIS_DETAILS).forEach(function (key) {
                var quote = window.COCKPIT_DEVIS_DETAILS[key];
                var version = window.COCKPIT_DEVIS_CALC && window.COCKPIT_DEVIS_CALC.getActiveVersion ? window.COCKPIT_DEVIS_CALC.getActiveVersion(quote) : quote.versions && quote.versions[quote.versions.length-1];
                if (!version || version.statut !== 'envoye') return;
                var sent = parseFr(version.dateModification || version.dateCreation);
                if (sent && daysBetween(sent,now) >= Number(config.quoteNoReply.days || 7)) alerts.push({ type:'quote', level:'warning', text:'Devis ' + key + ' sans réponse depuis ' + daysBetween(sent,now) + ' jours.', href:'devis-edition.html?devis=' + encodeURIComponent(key) });
            });
        }
        if (window.COCKPIT_RDV_DETAILS) {
            Object.keys(window.COCKPIT_RDV_DETAILS).forEach(function (key) {
                var rdv = window.COCKPIT_RDV_DETAILS[key], date = parseFr(rdv.date), until = date ? daysBetween(now,date) : null;
                if (config.unconfirmedAppointment.enabled && !(rdv.communication && rdv.communication.confirme) && ['prevu','planned'].indexOf(rdv.statut) !== -1 && until !== null && until <= Number(config.unconfirmedAppointment.days || 2) && until >= 0) alerts.push({ type:'appointment', level:'warning', text:'Rendez-vous « ' + rdv.titre + ' » à confirmer.', href:'fiche-rdv.html?rdv=' + encodeURIComponent(key) });
                var reports = (rdv.historique || []).filter(function (entry) { return entry.type === 'report'; }).length;
                if (config.repeatedPostponement.enabled && reports >= Number(config.repeatedPostponement.count || 2)) alerts.push({ type:'postponement', level:'warning', text:'Rendez-vous « ' + rdv.titre + ' » reporté ' + reports + ' fois.', href:'fiche-rdv.html?rdv=' + encodeURIComponent(key) });
            });
        }
        var cashText = document.getElementById('tresorerie-kpi-previsionnel') || document.getElementById('tresorerie-kpi-solde');
        if (config.lowCash.enabled && cashText) {
            var cash = Number(cashText.textContent.replace(/[^0-9,-]/g,'').replace(',','.'));
            if (Number.isFinite(cash) && cash < Number(config.lowCash.amount || 0)) alerts.push({ type:'cash', level:'danger', text:'Trésorerie prévisionnelle sous le seuil de ' + config.lowCash.amount + ' €.', href:'tresorerie.html' });
        }
        if (config.lateGoal.enabled && window.COCKPIT_FACTURATION_STATS && window.COCKPIT_FACTURATION_STATS.computeStats) {
            var stats = window.COCKPIT_FACTURATION_STATS.computeStats(), goal = Number(dashboard.revenueGoal || 0), completion = goal ? Math.round((Number(stats.caFacture || 0) / goal) * 100) : 100;
            if (completion < Number(config.lateGoal.completionPercent || 70)) alerts.push({ type:'goal', level:'warning', text:'Objectif de CA réalisé à ' + completion + ' %.', href:'dashboard.html' });
        }
        return alerts;
    }
    function generatedItem(alert) {
        var li = document.createElement('li');
        li.className = 'settings-generated-alert';
        li.setAttribute('data-settings-alert-type', alert.type);
        li.style.cssText = 'padding:10px 12px;margin-bottom:8px;border:1px solid #e1e5ec;border-left:4px solid ' + (alert.level === 'danger' ? '#c7443e' : '#d79120') + ';border-radius:8px;background:#fff;list-style:none;';
        var link = document.createElement('a'); link.href = alert.href || '#'; link.textContent = alert.text; link.style.cssText='color:inherit;text-decoration:none;font-weight:600;'; li.appendChild(link);
        return li;
    }
    function renderAlerts() {
        if (renderingAlerts) return;
        renderingAlerts = true;
        try {
            var alerts = buildAlerts(), max = Number(store.getSection('dashboard').maxAlerts || 4);
            ['dashboard-alerts-list','tresorerie-alertes-list','analyses-alertes-principales'].forEach(function (id) {
                var list = document.getElementById(id); if (!list) return;
                list.querySelectorAll('.settings-generated-alert').forEach(function (node) { node.remove(); });
                alerts.slice(0,max).reverse().forEach(function (alert) { list.insertBefore(generatedItem(alert), list.firstChild); });
                Array.prototype.forEach.call(list.children, function (item,index) { item.style.display = index < max ? '' : 'none'; });
                var empty = document.getElementById(id === 'dashboard-alerts-list' ? 'dashboard-alerts-empty' : id === 'tresorerie-alertes-list' ? 'tresorerie-alertes-empty' : 'analyses-alertes-empty');
                if (empty) empty.style.display = list.children.length ? 'none' : '';
            });
        } finally { renderingAlerts = false; }
    }
    function apply() { applyClients(); applyProducts(); applyAgendaStatuses(); renderAlerts(); }
    document.addEventListener('DOMContentLoaded', apply);
    window.addEventListener('load', apply);
    store.subscribe(apply);
})();
