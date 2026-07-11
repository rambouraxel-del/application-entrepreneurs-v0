// Référentiels configurables V0.11 : une source, valeurs historiques préservées.
(function () {
    'use strict';
    var store = window.COCKPIT_SETTINGS;
    if (!store) return;

    function badgeClass(color) { return 'badge-' + (['neutral','info','warning','success','danger'].indexOf(color) !== -1 ? color : 'neutral'); }
    function active(list) { return (list || []).filter(function (item) { return item.active !== false; }).sort(function (a,b) { return (a.order||0)-(b.order||0); }); }
    function valueOf(item) { return item.legacyId || item.id; }
    function intercept(name, builder) {
        var value = window[name];
        function enhance(list) {
            if (!Array.isArray(list)) return list;
            var configured = builder(), existing = {};
            list.forEach(function (item) { existing[item.value] = item; });
            list.splice(0, list.length);
            configured.forEach(function (item) { list.push(item); });
            Object.keys(existing).forEach(function (key) {
                if (!list.some(function (item) { return item.value === key; })) list.push(existing[key]);
            });
            return list;
        }
        try {
            Object.defineProperty(window, name, { configurable:true, enumerable:true, get:function(){return value;}, set:function(next){value=enhance(next);} });
            if (value) value=enhance(value);
        } catch (error) { if (value) window[name]=enhance(value); }
    }
    function configuredAndUsed(list,used){return (list||[]).filter(function(item){return item.active!==false||used.indexOf(item.id)!==-1||(item.legacyId&&used.indexOf(item.legacyId)!==-1);}).sort(function(a,b){return (a.order||0)-(b.order||0);});}
    function clientStatuses() { var used=Object.keys(window.COCKPIT_CLIENT_DETAILS||{}).map(function(k){return window.COCKPIT_CLIENT_DETAILS[k].statut;});return configuredAndUsed(store.getSection('clients').statuses,used).map(function(item){return {value:item.id,label:item.label+(item.active===false?' (désactivé)':''),badgeClass:badgeClass(item.color)};}); }
    function productTypes() { var used=Object.keys(window.COCKPIT_PRODUCT_DETAILS||{}).map(function(k){return window.COCKPIT_PRODUCT_DETAILS[k].type;});return configuredAndUsed(store.getSection('products').types,used).map(function(item){return {value:item.id,label:item.label+(item.active===false?' (désactivé)':''),badgeClass:badgeClass(item.color)};}); }
    function productStatuses() { var used=Object.keys(window.COCKPIT_PRODUCT_DETAILS||{}).map(function(k){return window.COCKPIT_PRODUCT_DETAILS[k].statut;});return configuredAndUsed(store.getSection('products').statuses,used).map(function(item){return {value:item.id,label:item.label+(item.active===false?' (désactivé)':''),badgeClass:badgeClass(item.color)};}); }
    function rdvStatuses() { var used=Object.keys(window.COCKPIT_RDV_DETAILS||{}).map(function(k){return window.COCKPIT_RDV_DETAILS[k].statut;});return configuredAndUsed(store.getSection('agenda').statuses,used).map(function(item){return {value:valueOf(item),label:item.label+(item.active===false?' (désactivé)':''),badgeClass:badgeClass(item.color)};}); }
    function paymentTerms() {
        var terms=store.getSection('products').paymentTerms;
        return terms.map(function(label){return {value:String(label).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),label:label};});
    }

    intercept('COCKPIT_CLIENT_STATUSES', clientStatuses);
    intercept('COCKPIT_PRODUCT_TYPES', productTypes);
    intercept('COCKPIT_PRODUCT_STATUSES', productStatuses);
    intercept('COCKPIT_RDV_STATUSES', rdvStatuses);
    intercept('COCKPIT_PRODUCT_PAYMENT_MODALITIES', paymentTerms);

    function usedValues(selector, attribute) {
        var result=[];document.querySelectorAll(selector).forEach(function(node){var value=node.getAttribute(attribute);if(value&&result.indexOf(value)===-1)result.push(value);});return result;
    }
    function rebuildSelect(select, configured, emptyLabel, used) {
        if(!select)return;var previous=select.value,byValue={};configured.forEach(function(item){byValue[valueOf(item)]=item;byValue[item.id]=item;});var values=active(configured).map(valueOf);(used||[]).forEach(function(value){if(values.indexOf(value)===-1)values.push(value);});select.innerHTML='';if(emptyLabel){var e=document.createElement('option');e.value='';e.textContent=emptyLabel;select.appendChild(e);}values.forEach(function(value){var item=byValue[value],o=document.createElement('option');o.value=value;o.textContent=item?item.label+(item.active===false?' (désactivé)':''):value+' (valeur existante)';select.appendChild(o);});if(Array.prototype.some.call(select.options,function(o){return o.value===previous;}))select.value=previous;
    }
    function updateBadges(rows, attribute, cellIndex, list) {
        var map={};list.forEach(function(item){map[item.id]=item;if(item.legacyId)map[item.legacyId]=item;});Array.prototype.forEach.call(rows||[],function(row){var item=map[row.getAttribute(attribute)],badge=row.cells&&row.cells[cellIndex]&&row.cells[cellIndex].querySelector('.badge');if(item&&badge){badge.textContent=item.label;badge.className='badge '+badgeClass(item.color);}});
    }
    function applyClients() {
        var c=store.getSection('clients'),rows=document.querySelectorAll('#clients-table tbody tr');
        rebuildSelect(document.getElementById('clients-status-filter'),c.statuses,'Tous les statuts',usedValues('#clients-table tbody tr','data-status'));
        updateBadges(rows,'data-status',5,c.statuses);
    }
    function applyProducts() {
        var p=store.getSection('products'),rows=document.querySelectorAll('#products-table tbody tr');
        rebuildSelect(document.getElementById('products-type-filter'),p.types,'Tous les types',usedValues('#products-table tbody tr','data-type'));
        rebuildSelect(document.getElementById('products-status-filter'),p.statuses,'Tous les statuts',usedValues('#products-table tbody tr','data-status'));
        updateBadges(rows,'data-type',1,p.types);updateBadges(rows,'data-status',4,p.statuses);
    }
    function applyGlobals() {
        if(window.COCKPIT_CLIENT_STATUSES){var arr=window.COCKPIT_CLIENT_STATUSES;arr.splice(0,arr.length);clientStatuses().forEach(function(x){arr.push(x);});}
        if(window.COCKPIT_PRODUCT_TYPES){var types=window.COCKPIT_PRODUCT_TYPES;types.splice(0,types.length);productTypes().forEach(function(x){types.push(x);});}
        if(window.COCKPIT_PRODUCT_STATUSES){var stats=window.COCKPIT_PRODUCT_STATUSES;stats.splice(0,stats.length);productStatuses().forEach(function(x){stats.push(x);});}
        if(window.COCKPIT_RDV_STATUSES){var rdv=window.COCKPIT_RDV_STATUSES;rdv.splice(0,rdv.length);rdvStatuses().forEach(function(x){rdv.push(x);});}
    }
    function apply(){applyGlobals();applyClients();applyProducts();}
    document.addEventListener('DOMContentLoaded',apply);window.addEventListener('load',apply);store.subscribe(apply);
    window.COCKPIT_SETTINGS_REFERENTIALS={apply:apply,clientStatuses:clientStatuses,productTypes:productTypes,productStatuses:productStatuses,rdvStatuses:rdvStatuses};
})();
