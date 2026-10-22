/* core/proofreader.js
 * Proofreader 范式试验引擎（与既有 pipeline 并行、互不影响）。
 *
 * 设计要点：
 *   - token 规则：{ kind:'token', id, when(t, r), check(t, r, issues) }
 *       按 token 顺序逐词派发，只有 when 为真的规则才执行 check。
 *   - once 规则：{ kind:'once', id, phase:'before'|'after', check(r, issues) }
 *       用于必须整段文本扫描的规则（标点、跨词模式）——因为 compromise 的 token 流里没有逗号/句号。
 *
 * 对外：window.StaticGrammarChecker.lint(text) -> issues[]
 *   issues 结构与 window.GrammarRules.runAll 完全一致，便于直接对照。
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker;
  if (!GC || !GC.tok || !GC.protect) throw new Error('Proofreader 依赖 GrammarChecker 核心层（tokenizer/protector）');

  var T = GC.tok, P = GC.protect;

  // ---------------- 阅读器：把"当前词 + 上下文"封装给规则 ----------------
  function Proofreader(tokens, text) {
    this.tokens = tokens;
    this.text = text;
    this.cursor = 0;
    this.issues = [];
    this._sid = -1;
    this._sentRange = null;
  }

  Proofreader.prototype = {
    current: function () { return this.tokens[this.cursor]; },
    prev: function (n) { return T.tok(this.tokens, this.cursor - (n || 1)); },
    next: function (n) { return T.tok(this.tokens, this.cursor + (n || 1)); },
    at: function (i) { return T.tok(this.tokens, i); },

    // 当前 token 所在句的 token 区间 [from, to)
    sentenceRange: function () {
      var cur = this.current();
      if (!cur) return [0, 0];
      if (this._sid === cur.sentence && this._sentRange) return this._sentRange;
      var from = this.cursor, to = this.cursor;
      while (from > 0 && this.tokens[from - 1].sentence === cur.sentence) from--;
      while (to + 1 < this.tokens.length && this.tokens[to + 1].sentence === cur.sentence) to++;
      this._sid = cur.sentence;
      this._sentRange = [from, to + 1];
      return this._sentRange;
    },

    textBefore: function (tok, len) { return this.text.slice(Math.max(0, tok.start - (len || 40)), tok.start); },
    textAfter: function (tok, len) { return this.text.slice(tok.end, tok.end + (len || 40)); },

    // 统一的输出口：白名单过滤 + 同规则同位置去重（与 pipeline.addIssue 语义一致）
    emit: function (o) {
      var exempt = o.category === 'sva' || o.category === 'auxiliary';
      if (!exempt && P.isProtected(o.start || 0, o.end || 0)) return;
      for (var i = 0; i < this.issues.length; i++) {
        if (this.issues[i].ruleId === o.ruleId && this.issues[i].start === (o.start || 0) && this.issues[i].end === (o.end || 0)) return;
      }
      this.issues.push({
        start: o.start || 0,
        end: o.end || 0,
        errorText: o.errorText || '',
        message: o.message,
        suggestion: o.suggestion || '',
        ruleId: o.ruleId,
        category: o.category,
        confidence: o.confidence
      });
    },

    run: function (rules) {
      var i, r;

      // 1) 前置一次性扫描
      for (i = 0; i < rules.length; i++) {
        r = rules[i];
        if (r.kind === 'once' && r.phase === 'before') r.check(this, this.issues);
      }

      // 2) 逐 token 派发（只有 when 命中的规则才执行）
      var len = this.tokens.length;
      for (this.cursor = 0; this.cursor < len; this.cursor++) {
        var token = this.tokens[this.cursor];
        if (!token.text) continue; // 缩写产生的空 token
        for (i = 0; i < rules.length; i++) {
          r = rules[i];
          if (r.kind !== 'token') continue;
          if (r.when && !r.when(token, this)) continue;
          r.check(token, this, this.issues);
        }
      }

      // 3) 收尾一次性扫描
      for (i = 0; i < rules.length; i++) {
        r = rules[i];
        if (r.kind === 'once' && r.phase === 'after') r.check(this, this.issues);
      }

      return this.issues;
    }
  };

  // ---------------- 规则注册表 ----------------
  var Registry = {
    rules: [],
    register: function (ruleDef) {
      if (!ruleDef || !ruleDef.check) throw new Error('规则必须提供 check()');
      if (!ruleDef.kind) ruleDef.kind = 'token';
      if (ruleDef.kind === 'once' && !ruleDef.phase) ruleDef.phase = 'after';
      this.rules.push(ruleDef);
      return ruleDef;
    },
    clear: function () { this.rules = []; },
    ids: function () { return this.rules.map(function (r) { return r.id || '(anonymous)'; }); }
  };

  function lint(text, rules) {
    if (!text) return [];
    var tokens = T.tokenize(text);
    P.buildProtectRanges(text);
    var reader = new Proofreader(tokens, text);
    return reader.run(rules || Registry.rules);
  }

  GC.Proofreader = Proofreader;
  GC.registry = Registry;
  global.StaticGrammarChecker = {
    lint: lint,
    register: function (def) { return Registry.register(def); },
    rules: Registry.rules
  };
})(typeof window !== 'undefined' ? window : null);
