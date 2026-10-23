/* core/pipeline.js
 * 规则调度与流水线引擎：
 *   - register(fn, {always}) 注册规则；按注册顺序执行
 *   - addIssue 统一出口（白名单过滤 + 同规则同位置去重）
 *   - runAll(text) 对外 API，保持 window.GrammarRules.runAll 兼容
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var tok = GC.tok || {};
  var protect = GC.protect || {};
  var pipeline = GC.pipeline = {};

  var RULES = [];

  // always:true → 即使文本不含拉丁字母也执行（ART 类规则原本无条件运行）
  function register(fn, opts) {
    RULES.push({ fn: fn, always: !!(opts && opts.always) });
  }

  // 去重索引：以 issues 数组为键缓存 "ruleId@start:end" 集合。
  // 原实现每次 addIssue 都线性扫描已累计的问题列表，问题量大时整体为 O(I²)；
  // 改为 O(1) 查找（语义完全一致：同规则同位置只保留第一条）。
  var dedupIndex = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function alreadySeen(issues, key) {
    if (!dedupIndex) { // 无 WeakMap 的老环境退化为原线性扫描
      for (var i = 0; i < issues.length; i++) {
        if (issues[i].ruleId + '@' + issues[i].start + ':' + issues[i].end === key) return true;
      }
      return false;
    }
    var set = dedupIndex.get(issues);
    if (!set) { set = (typeof Set === 'function') ? new Set() : {}; dedupIndex.set(issues, set); }
    if (typeof Set === 'function' && set instanceof Set) { if (set.has(key)) return true; set.add(key); return false; }
    if (set[key]) return true; // 对象模拟 Set；key 含 '@' 不会撞上原型属性
    set[key] = 1;
    return false;
  }
  function addIssue(issues, o) {
    // 固定搭配白名单：命中区间内一律放行；但主谓一致/助动词类规则的落点是动词本身，
    // 会被 "is consistent with" 这类短语整体吞掉，故这两类不过白名单
    var exempt = o.category === 'sva' || o.category === 'auxiliary';
    if (!exempt && protect.isProtected(o.start || 0, o.end || 0)) return;
    // 仅去掉同一规则在同一位置的重复提示；同一规则在不同位置可分别报出
    if (alreadySeen(issues, o.ruleId + '@' + (o.start || 0) + ':' + (o.end || 0))) return;
    issues.push({
      start: o.start || 0,
      end: o.end || 0,
      errorText: o.errorText || '',
      message: o.message,
      suggestion: o.suggestion || '',
      ruleId: o.ruleId,
      category: o.category,
      confidence: o.confidence
    });
  }

  function runAll(text) {
    if (!text) return [];
    var tokens = tok.tokenize(text);
    protect.buildProtectRanges(text); // 先标记固定搭配区间，供各规则放行
    var issues = [];
    var hasLatin = tokens.some(function (t) { return /[a-z]/i.test(t.text); });
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      if (!r.always && !hasLatin) continue;
      r.fn(tokens, text, issues);
    }
    return issues;
  }

  pipeline.register = register;
  pipeline.addIssue = addIssue;
  pipeline.runAll = runAll;
  pipeline.ruleCount = function () { return RULES.length; };
  pipeline.ruleIds = function () { return RULES.map(function (r) { return r.name; }); };
})(typeof window !== 'undefined' ? window : null);
