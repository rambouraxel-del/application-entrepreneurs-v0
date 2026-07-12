// Correctif V0.12.1 — fiabilise le survol des points des graphiques du dashboard.
(function () {
    'use strict';

    function pointFromEvent(event) {
        var target = event.target;
        return target && typeof target.closest === 'function'
            ? target.closest('.dashboard-chart-point')
            : null;
    }

    function emit(point, type) {
        if (point) {
            point.dispatchEvent(new Event(type, { bubbles: false }));
        }
    }

    function bindContainer(container) {
        if (!container || container.dataset.chartTooltipFallback === '1') {
            return;
        }
        container.dataset.chartTooltipFallback = '1';

        container.addEventListener('pointerover', function (event) {
            emit(pointFromEvent(event), 'mouseenter');
        });
        container.addEventListener('pointerout', function (event) {
            emit(pointFromEvent(event), 'mouseleave');
        });
        container.addEventListener('pointerdown', function (event) {
            emit(pointFromEvent(event), 'mouseenter');
        });
    }

    function init() {
        bindContainer(document.getElementById('dashboard-chart-container'));
        bindContainer(document.getElementById('dashboard-activity-chart-container'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
