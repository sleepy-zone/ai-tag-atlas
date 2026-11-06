/**
 * Clarity 埋点（和 ai-ref-library-cn 同一个项目）
 *
 * - 只接 Microsoft Clarity，不接 GA4
 * - 本地 / file:// 不加载，避免测试流量污染线上数据
 * - 业务事件走 window.track(name, params)，同时写入 window.__trackLog 便于调试
 */
(function () {
  'use strict';

  var PROJECT_ID = 'r1wmvdsf4a';
  var host = location.hostname;
  var local = location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '::1';

  var TAGS = ['lib', 'type', 'value', 'label', 'mode', 'action', 'trigger', 'id', 'q', 'cat', 'count', 'recipe'];

  window.__trackLog = [];
  function log(name, params) {
    var rec = { t: Date.now(), name: name, params: params || {} };
    window.__trackLog.push(rec);
    if (window.__trackLog.length > 200) window.__trackLog.shift();
    if (window.__trackDebug) console.log('[track]', name, rec.params);
  }

  window.track = function (name, params) {
    try {
      log(name, params);
      if (local || typeof window.clarity !== 'function') return;
      window.clarity('event', name);
      var p = params || {};
      TAGS.forEach(function (key) {
        var value = p[key];
        if (value === undefined || value === null || value === '') return;
        window.clarity('set', key, String(value).slice(0, 60));
      });
    } catch (e) { /* 埋点不能影响主流程 */ }
  };

  if (local) return;

  (function (c, l, a, r, i) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    var t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    var y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', PROJECT_ID);
})();
