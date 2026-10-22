/* core/protector.js
 * 固定搭配与白名单区间过滤：把 FIXED_PHRASES 在文本中的命中区间预先标出，
 * 规则输出若完全落在这些区间内则放行（sva / auxiliary 类例外，见 pipeline.addIssue）。
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var dict = GC.dict = GC.dict || {};
  var protect = GC.protect = {};

  var PROTECT_RANGES = [];

  function buildProtectRanges(text) {
    PROTECT_RANGES = [];
    var list = dict.FIXED_PHRASES || [];
    for (var i = 0; i < list.length; i++) {
      var words = list[i].split(/\s+/).map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
      var re = new RegExp('\\b' + words.join('[\\s\\-]+') + '\\b', 'gi');
      var m;
      while ((m = re.exec(text)) !== null) {
        PROTECT_RANGES.push([m.index, m.index + m[0].length]);
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
  // 仅当问题区间完全落在固定搭配区间内才放行（避免 "is depend" 这类相邻错误被短语白名单连带屏蔽）
  function isProtected(a, b) {
    for (var i = 0; i < PROTECT_RANGES.length; i++) {
      var r = PROTECT_RANGES[i];
      if (a >= r[0] && b <= r[1]) return true;
    }
    return false;
  }

  protect.buildProtectRanges = buildProtectRanges;
  protect.isProtected = isProtected;
  protect.ranges = function () { return PROTECT_RANGES; };
})(typeof window !== 'undefined' ? window : null);
