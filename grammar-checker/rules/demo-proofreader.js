/* rules/demo-proofreader.js
 * Proofreader 范式示范规则（仅用于试验对照，不参与线上查错流水线）。
 * 特意同时包含两类形态，用来验证派发能力：
 *   - token 规则：ART-001 / NOUN-003 / ADV-002
 *   - once 规则：PUNC-001 / NEG-001（必须整段扫描，因为逗号句号不是 token）
 * 这些规则的判定逻辑与现有 grammar-checker 中的同名规则逐字对应，便于结果对照。
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker;
  if (!GC || !GC.registry) return; // 未加载 proofreader.js 时静默跳过
  var D = GC.dict, T = GC.tok, R = GC.registry;

  function vowelSound(w) { if (D.SOUND_AN[w]) return true; if (D.SOUND_A[w]) return false; return /^[aeiou]/i.test(w); }

  // ---- ART-001 a/an 由发音决定 ----
  R.register({
    id: 'ART-001',
    category: 'article',
    confidence: 'high',
    when: function (t) { return t.text === 'a' || t.text === 'an'; },
    check: function (t, r, issues) {
      var nx = r.next(1);
      if (!nx || !/[A-Za-z]/.test(nx.text)) return;
      var needAn = vowelSound(nx.text);
      if (t.text === 'a' && needAn) {
        r.emit({ ruleId:'ART-001', category:'article', confidence:'high', start:t.start, end:nx.end,
          errorText:r.text.slice(t.start, nx.end), message:'a/an 由后面单词发音首音决定：元音音素开头用 an', suggestion:'an ' + nx.raw });
      } else if (t.text === 'an' && !needAn) {
        r.emit({ ruleId:'ART-001', category:'article', confidence:'high', start:t.start, end:nx.end,
          errorText:r.text.slice(t.start, nx.end), message:'a/an 由后面单词发音首音决定：辅音音素开头用 a', suggestion:'a ' + nx.raw });
      }
    }
  });

  // ---- NOUN-003 each/every/either/neither + 复数 或 + 不可数名词 ----
  R.register({
    id: 'NOUN-003',
    category: 'noun',
    when: function (t) { return /^(each|every|either|neither)$/.test(t.text); },
    check: function (t, r, issues) {
      var nx = r.next(1);
      if (!nx) return;
      if (T.hasTag(nx, 'Noun') && (T.hasTag(nx, 'Plural') || T.looksPlural(nx.text))
          && !D.UNCOUNTABLE[nx.text] && !D.PHYS_S.test(nx.text)) {
        r.emit({ ruleId:'NOUN-003', category:'noun', confidence:'high', start:t.start, end:nx.end,
          errorText:r.text.slice(t.start, nx.end), message:'each/every/either/neither 后接单数可数名词，不能用复数', suggestion:t.text + ' ' + GC.morph.nounSingular(nx.text) });
      }
      if (D.EACH_NOUN[nx.text]) {
        r.emit({ ruleId:'NOUN-003', category:'noun', confidence:'high', start:t.start, end:nx.end,
          errorText:r.text.slice(t.start, nx.end), message:'each/every 不能直接修饰不可数名词 "' + nx.raw + '"', suggestion:'改用 all / a piece of 等' });
      }
    }
  });

  // ---- ADV-002 very 直接修饰动词 ----
  R.register({
    id: 'ADV-002',
    category: 'adverb',
    when: function (t) { return t.text === 'very'; },
    check: function (t, r, issues) {
      var nx = r.next(1);
      if (!nx) return;
      if (T.hasAnyTag(nx, ['Verb']) && !T.hasAnyTag(nx, ['Adjective', 'Adverb'])) {
        r.emit({ ruleId:'ADV-002', category:'adverb', confidence:'high', start:t.start, end:nx.end,
          errorText:r.text.slice(t.start, nx.end), message:'very 不能直接修饰动词，应用 "very much" 或 "really"', suggestion:'…… very much / really ' + nx.raw });
      }
    }
  });

  // ---- PUNC-001 全角标点（整段扫描）----
  var CJK_PUNC = /[，。、；：？！（）《》「」『』【】]/g;
  R.register({
    id: 'PUNC-001',
    kind: 'once',
    phase: 'after',
    category: 'punctuation',
    check: function (r, issues) {
      CJK_PUNC.lastIndex = 0;
      var m;
      while ((m = CJK_PUNC.exec(r.text)) !== null) {
        if (m.index === CJK_PUNC.lastIndex) CJK_PUNC.lastIndex++;
        r.emit({ ruleId:'PUNC-001', category:'punctuation', confidence:'mid', start:m.index, end:m.index + 1,
          errorText:m[0], message:'英文写作应使用半角标点，"' + m[0] + '" 是全角中文标点', suggestion:'改用半角标点' });
      }
    }
  });

  // ---- NEG-001 双重否定（整段扫描）----
  var RE_NEG = /\b(?:don't|doesn't|didn't|won't|can't|couldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|wouldn't|shouldn't|(?:do|does|did|is|are|was|were|have|has|had|can|could|will|would|should|must|might|shall)\s+not)\b[^.;!?]{0,20}\b(no|nothing|nobody|nowhere|none)\b/gi;
  R.register({
    id: 'NEG-001',
    kind: 'once',
    phase: 'after',
    category: 'negation',
    check: function (r, issues) {
      RE_NEG.lastIndex = 0;
      var m;
      while ((m = RE_NEG.exec(r.text)) !== null) {
        var pos = m.index + m[0].toLowerCase().lastIndexOf(m[1].toLowerCase());
        r.emit({ ruleId:'NEG-001', category:'negation', confidence:'mid', start:m.index, end:pos + m[1].length,
          errorText:m[0], message:'双重否定：否定词 + "' + m[1] + '" 表意重复，应用 any/anything/anybody，或去掉一个否定词', suggestion:'改用 any / anything / anybody' });
      }
    }
  });
})(typeof window !== 'undefined' ? window : null);
