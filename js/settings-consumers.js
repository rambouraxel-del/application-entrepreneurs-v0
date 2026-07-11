// Consommateurs des paramètres V0.11 : adaptateurs de compatibilité et
// application progressive aux pages existantes, sans réécrire les snapshots.
(function () {
    'use strict';
    var store = window.COCKPIT_SETTINGS;
    if (!store) return;
    var applying = false;

    function badgeClass(color) {
        return 'badge-' + (['neutral','info','warning','success','danger'].indexOf(color) !== -1 ? color : 'neutral');
    }
    function dispatch(node, type) {
        if (!node) return;
        try { node.dispatchEvent(new Event(type || 'change', { bubbles: true })); } catch (ignore) {}
    }
    function setSelect(id, value) {
        var node = document.getElementById(id);
        if (!node || value === undefined || value === null) return;
        var exists = Array.prototype.some.call(node.options || [], function (option) { return String(option.value) === String(value); });
        if (!exists) return;
        if (String(node.value) !== String(value)) { node.value = value; dispatch(node); }
    }
    function currentName() {
        var p = store.getSection('profile'), d = store.getSection('demo');
        return d.enabled ? (d.firstName + ' ' + d.lastName).trim() : (p.firstName + ' ' + p.lastName).trim();
    }
    function applyAppearance() {
        var a = store.getSection('appearance'), root = document.documentElement;
        root.setAttribute('data-cockpit-density', a.density || 'comfortable');
        root.setAttribute('data-cockpit-accent', a.accent || 'blue');
        root.setAttribute('data-cockpit-currency-decimals', a.currencyDecimals ? 'on' : 'off');
    }
    function applyProfile() {
        var p = store.getSection('profile'), d = store.getSection('demo');
        var first = d.enabled ? d.firstName : p.firstName;
        var greeting = document.getElementById('dashboard-greeting-title');
        if (greeting) greeting.textContent = 'Bonjour, ' + (first || 'vous') + ' !';
        var detail = document.getElementById('settings-compte-detail');
        if (detail) detail.textContent = currentName() + ' · ' + (p.jobTitle || 'Utilisateur');
        document.querySelectorAll('[data-cockpit-current-user]').forEach(function (node) { node.textContent = currentName() || 'Vous'; });
    }
    function applyCompany() {
        var c = store.getSection('company'), b = store.getSection('billing');
        var legacy = window.COCKPIT_COMPANY_SETTINGS;
        if (legacy) {
            legacy.nom = c.legalName || c.tradeName; legacy.adresse = c.address; legacy.telephone = c.phone;
            legacy.email = c.email; legacy.siteInternet = c.website; legacy.siren = c.siren; legacy.siret = c.siret;
            legacy.tva = c.vatNumber; legacy.iban = c.iban; legacy.bic = c.bic;
            legacy.mentionsLegales = [c.legalNotice, b.latePenaltyText, b.collectionFee ? ('Indemnité forfaitaire : ' + b.collectionFee + ' €.') : '', b.legalNotice].filter(Boolean).join(' ');
        }
        if (window.COCKPIT_DEVIS_CALC) {
            window.COCKPIT_DEVIS_CALC.snapshotCompany = function () {
                var company = store.getSection('company'), billing = store.getSection('billing');
                return {
                    nom: company.legalName || company.tradeName, adresse: company.address, telephone: company.phone,
                    email: company.email, siret: company.siret, tva: company.vatNumber,
                    iban: billing.showBankDetails ? company.iban : '', bic: billing.showBankDetails ? company.bic : '',
                    siteInternet: company.website, footerText: billing.footerText || company.footerText,
                    signatureText: billing.quoteSignature || company.signatureText
                };
            };
        }
    }
    function formatNextNumber(prefix, includeYear, year, counter) {
        var parts = [String(prefix || '').replace(/[^A-Za-z0-9_-]/g, '').toUpperCase() || 'DOC'];
        if (includeYear) parts.push(String(year));
        parts.push(String(counter).padStart(5, '0'));
        return parts.join('-');
    }
    function nextCounter(source, minimum) {
        var max = Math.max(0, Number(minimum || 1) - 1);
        Object.keys(source || {}).forEach(function (key) {
            var match = String(key).match(/(\d{3,})$/);
            if (match) max = Math.max(max, Number(match[1]));
        });
        return max + 1;
    }
    function applyBilling() {
        var billing = store.getSection('billing'), appearance = store.getSection('appearance');
        var calc = window.COCKPIT_DEVIS_CALC;
        if (calc) {
            calc.computeNextDevisNumero = function (year) {
                return formatNextNumber(billing.quotePrefix, billing.includeYear, year, nextCounter(window.COCKPIT_DEVIS_DETAILS, billing.startingCounter));
            };
            calc.formatMoney = function (value) {
                var decimals = appearance.currencyDecimals ? 2 : 0;
                return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value) || 0);
            };
        }
        if (window.COCKPIT_FACTURE_CALC) {
            window.COCKPIT_FACTURE_CALC.computeNextFactureNumero = function (year) {
                return formatNextNumber(billing.invoicePrefix, billing.includeYear, year, nextCounter(window.COCKPIT_FACTURE_DETAILS, billing.startingCounter));
            };
        }
        window.COCKPIT_BILLING_DEFAULTS = {
            quoteValidityDays: billing.quoteValidityDays, paymentDays: billing.defaultPaymentDays,
            depositPercent: billing.defaultDepositPercent, maxDiscountPercent: billing.indicativeMaxDiscountPercent,
            defaultVat: billing.defaultVat, paymentMethods: billing.acceptedPaymentMethods.slice(),
            legalNotice: billing.legalNotice, footerText: billing.footerText
        };
    }
    function replaceOptions(select, items, emptyLabel) {
        if (!select) return;
        var current = select.value;
        select.innerHTML = '';
        if (emptyLabel) { var empty = document.createElement('option'); empty.value = ''; empty.textContent = emptyLabel; select.appendChild(empty); }
        items.filter(function (item) { return item.active !== false; }).sort(function (a,b) { return (a.order || 0) - (b.order || 0); }).forEach(function (item) {
            var option = document.createElement('option'); option.value = item.legacyId || item.id; option.textContent = item.label; select.appendChild(option);
        });
        if (Array.prototype.some.call(select.options, function (option) { return option.value === current; })) select.value = current;
    }
    function applyDashboard() {
        var d = store.getSection('dashboard');
        var periodMap = { month:'mois', '30d':'30j', quarter:'trimestre', custom:'custom' };
        setSelect('dashboard-period-select', periodMap[d.defaultPeriod] || d.defaultPeriod);
        var start = document.getElementById('dashboard-period-custom-start'), end = document.getElementById('dashboard-period-custom-end');
        if (start && d.customPeriodStart) start.value = d.customPeriodStart;
        if (end && d.customPeriodEnd) end.value = d.customPeriodEnd;
        setSelect('dashboard-chart-period-select', String(d.chartMonths));
        document.querySelectorAll('#dashboard-chart-indicators-dropdown input[type="checkbox"]').forEach(function (box) {
            box.checked = box.value === d.chartIndicator;
            dispatch(box);
        });
        var completedTab = document.querySelector('#todo-filter-tabs [data-filter="terminees"]');
        if (completedTab) completedTab.style.display = d.showCompletedTasks ? '' : 'none';
        limitAlertList(document.getElementById('dashboard-alerts-list'), d.maxAlerts);
    }
    function limitAlertList(list, max) {
        if (!list) return;
        Array.prototype.forEach.call(list.children, function (item, index) { item.style.display = index < Math.max(1, Number(max) || 4) ? '' : 'none'; });
    }
    function applyAgenda() {
        var a = store.getSection('agenda');
        var viewMap = { day:'jour', week:'semaine', month:'mois', list:'liste' };
        var viewButton = document.querySelector('#agenda-view-tabs [data-view="' + (viewMap[a.defaultView] || a.defaultView) + '"]');
        if (viewButton && !viewButton.classList.contains('page-tab-active')) viewButton.click();
        setSelect('agenda-page-size', String(store.getSection('appearance').defaultPageSize || 5));
        replaceOptions(document.getElementById('rdv-form-statut'), a.statuses, null);
        window.COCKPIT_AGENDA_SETTINGS = {
            startTime:a.startTime,endTime:a.endTime,slotMinutes:a.slotMinutes,defaultDurationMinutes:a.defaultDurationMinutes,
            workingDays:a.workingDays.slice(),showWeekends:a.showWeekends,initialStatus:a.initialStatus,
            statuses:clone(a.statuses),outsideWorkingHoursAlwaysVisible:true
        };
    }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function applyTreasury() {
        var t = store.getSection('treasury');
        var map = { '30d':'30', '60d':'60', '90d':'90', 'end-month':'30', 'end-next-month':'60' };
        setSelect('tresorerie-period-select', map[t.projectionMode] || map[t.defaultHorizon] || '30');
        window.COCKPIT_TREASURY_SETTINGS = clone(t);
        var chargesBody = document.getElementById('tresorerie-charges-body');
        if (chargesBody) Array.prototype.forEach.call(chargesBody.children, function (row) {
            var text = row.textContent.toLowerCase();
            if (!t.showRealized && /réalis/.test(text)) row.style.display = 'none';
            if (!t.showForecast && /prévu|venir/.test(text)) row.style.display = 'none';
        });
    }
    function applyAnalytics() {
        var a = store.getSection('analytics');
        var tabMap = { overview:'vue-ensemble', commercial:'commercial', clients:'clients', activity:'activite', treasury:'tresorerie' };
        var button = document.querySelector('#analyses-tabs [data-tab="' + (tabMap[a.defaultTab] || a.defaultTab) + '"]');
        if (button && !button.classList.contains('page-tab-active')) button.click();
        var periodMap = { month:'mois', quarter:'trimestre', year:'annee', '30d':'mois', custom:'tout' };
        setSelect('analyses-period-select', periodMap[a.defaultPeriod] || a.defaultPeriod);
        var chartIds = ['analyses-vue-devis-donut','tresorerie-chart-container','dashboard-chart-container'];
        chartIds.forEach(function (id) { var node=document.getElementById(id); if(node && node.closest('.dashboard-block')) node.closest('.dashboard-block').style.display = a.showCharts ? '' : 'none'; });
        document.querySelectorAll('.analyses-funnel').forEach(function (node) { node.style.display = a.showFunnels ? '' : 'none'; });
        var topBody = document.getElementById('analyses-vue-top-clients-body');
        if (topBody) Array.prototype.forEach.call(topBody.children, function (row,index) { row.style.display=index<Number(a.rankingClientCount||5)?'':'none'; });
    }
    function applyPageSizes() {
        var appearance = store.getSection('appearance'), clients = store.getSection('clients'), products = store.getSection('products');
        setSelect('clients-page-size', String(clients.pageSize || appearance.defaultPageSize));
        setSelect('products-page-size', String(products.pageSize || appearance.defaultPageSize));
        ['devis-page-size','factures-page-size','agenda-page-size'].forEach(function(id){setSelect(id,String(appearance.defaultPageSize));});
    }
    function applyAll() {
        if (applying) return;
        applying = true;
        try {
            applyAppearance(); applyProfile(); applyCompany(); applyBilling(); applyDashboard(); applyAgenda(); applyTreasury(); applyAnalytics(); applyPageSizes();
        } finally { applying = false; }
    }
    applyAppearance();
    document.addEventListener('DOMContentLoaded', function () {
        applyAll();
        ['dashboard-alerts-list','tresorerie-alertes-list','analyses-vue-top-clients-body','tresorerie-charges-body'].forEach(function (id) {
            var node=document.getElementById(id); if(node && window.MutationObserver) new MutationObserver(applyAll).observe(node,{childList:true,subtree:true});
        });
    });
    window.addEventListener('load', applyAll);
    store.subscribe(applyAll);
    window.COCKPIT_SETTINGS_RUNTIME = { apply:applyAll, badgeClass:badgeClass, get:function(section){return store.getSection(section);}, currentUserName:currentName };
})();
