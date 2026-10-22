/* core/tokenizer.js
 * 分词 + POS 标签适配层：把 compromise 的输出统一成 {text, raw, start, end, tags, sentence}，
 * 并提供各规则共用的词性/句法判定助手。
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var dict = GC.dict = GC.dict || {};
  var tok = GC.tok = {};

  // ---------------- 标签判定 ----------------
  function hasTag(t, tag) { return t.tags.indexOf(tag) !== -1; }
  function hasAnyTag(t, list) { for (var i = 0; i < list.length; i++) if (t.tags.indexOf(list[i]) !== -1) return true; return false; }
  function isNoun(t) { return hasAnyTag(t, ['Noun']); }
  function isProperNoun(t) { return hasTag(t, 'ProperNoun'); }
  function isPlural(t) { return hasTag(t, 'Plural'); }
  function isSingular(t) { return hasTag(t, 'Singular'); }
  // 复数后缀启发式：s/x 结尾且非常见单数名词/不可数名词，视为复数
  function looksPlural(w) {
    w = (w || '').toLowerCase();
    if (!/[sx]$/i.test(w)) return false;
    if (dict.PHYS_S.test(w)) return false;
    if (dict.UNCOUNTABLE[w]) return false;
    return true;
  }
  // 可数名词复数：带 Plural 标签且非不可数/s 结尾单数
  function isCountPlural(t) { return hasTag(t, 'Plural') && !dict.UNCOUNTABLE[t.text] && !dict.PHYS_S.test(t.text); }
  // 统计 [a,b) 字符区间内的有限谓语（一般现在/过去，非动名词）数量
  function finCount(tokens, a, b) {
    var c = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.start < a || t.start >= b) continue;
      if (hasTag(t, 'Verb') && (hasTag(t, 'PresentTense') || hasTag(t, 'PastTense')) && !hasTag(t, 'Gerund')) c++;
    }
    return c;
  }
  function isFiniteVerb(t) { return hasTag(t, 'Verb') && (hasTag(t, 'PresentTense') || hasTag(t, 'PastTense')) && !hasTag(t, 'Gerund'); }
  // 更严格的"有限实义动词"：排除分词/形容词式的 -ed/-ing、动名词、不定式与名词同形词
  function plainFinite(t) {
    return hasTag(t, 'Verb') && (hasTag(t, 'PresentTense') || hasTag(t, 'PastTense'))
      && !hasAnyTag(t, ['Gerund', 'PastPart', 'Participle', 'Infinitive', 'Noun'])
      && !/(ed|ing)$/i.test(t.text);
  }
  // [a,b) 区间内是否构成"主语 + 有限谓词"的独立从句
  function hasClause(tokens, a, b) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.start < a || t.start >= b) continue;
      if (!plainFinite(t)) continue;
      for (var q = i - 1; q >= 0; q--) {
        var p = tokens[q];
        if (p.start < a) break;
        if (hasAnyTag(p, ['Noun', 'Pronoun']) && !hasAnyTag(p, ['Verb'])) return true;
        if (p.text === ',' || p.text === ';') break;
      }
    }
    return false;
  }

  // ---------------- 分词 ----------------
  function tokenize(text) {
    var out = [];
    if (!global.nlp) {
      var re = /[A-Za-z'-]+/g, m;
      while ((m = re.exec(text)) !== null) {
        out.push({ text: m[0].toLowerCase(), raw: m[0], start: m.index, end: m.index + m[0].length, tags: [], sentence: 0 });
      }
      return out;
    }
    var json = global.nlp(text).json({ terms: true, tags: true, offset: true });
    var s = -1;
    (json || []).forEach(function (sent) {
      s++;
      (sent.terms || []).forEach(function (t) {
        var st = 0, ln = (t.text || '').length;
        if (t.offset) { st = Array.isArray(t.offset) ? t.offset[0] : (t.offset.start || 0); ln = Array.isArray(t.offset) ? t.offset[1] : (t.offset.length || 0); }
        var raw = text.slice(st, st + ln);
        out.push({ text: raw.toLowerCase(), raw: raw, start: st, end: st + ln, tags: t.tags || [], sentence: s });
      });
    });
    return out;
  }
  function tokAt(tokens, i) { return i >= 0 && i < tokens.length ? tokens[i] : null; }
  function prevNonEmpty(tokens, i) { for (var k = i - 1; k >= 0; k--) { if (tokens[k].text) return tokens[k]; } return null; }
  function prevIdx(tokens, i) { for (var k = i - 1; k >= 0; k--) { if (tokens[k].text) return k; } return -1; }
  function nextReal(tokens, i) { for (var j = i + 1; j < tokens.length; j++) if (tokens[j].text) return tokens[j]; return null; }

  function isDeterminer(t) { return dict.DETERMINERS[t.text] || hasTag(t, 'Determiner'); }

  // 判断 tokens[k] 是否是介词短语的宾语（向左越过限定词能找到介词）
  function isPPObject(tokens, k) {
    for (var j = k - 1; j >= Math.max(0, k - 3); j--) {
      var t = tokens[j];
      if (hasTag(t, 'Preposition') || dict.PREPS[t.text]) return true;
      if (isDeterminer(t) || hasAnyTag(t, ['Number', 'Value', 'Cardinal', 'Adjective'])) continue;
      break;
    }
    return false;
  }

  // 主语词性判定
  function classifySubject(t) {
    var w = t.text;
    if (hasTag(t, 'Gerund')) return null; // 动名词短语作主语时单复数判定不可靠
    if (w === 'he' || w === 'she' || w === 'it') return { plural: false, third: true, name: w };
    if (w === 'they' || w === 'we' || w === 'those' || w === 'these') return { plural: true, third: false, name: w };
    if (w === 'i' || w === 'you') return null; // 非三单，不判定
    if (isNoun(t) && (!isProperNoun(t) || dict.IRREG_PLURAL[w] || looksPlural(w))) {
      var p = isPlural(t) || dict.IRREG_PLURAL[w] || (looksPlural(w) && !hasTag(t, 'Singular'));
      return { plural: p, third: !p, name: w };
    }
    return null;
  }

  // 取动词左边最近的主体（跳过副词/限定词/介词短语宾语）；若跨过定语从句则取从句先行词
  function subjectBefore(tokens, idx, text) {
    var sid = tokens[idx] ? tokens[idx].sentence : 0;
    var lo = 0; // 左边界
    for (var k = idx - 1; k >= 0; k--) {
      var t = tokens[k];
      if (t.sentence !== sid) { lo = k + 1; break; } // 跨句 → 只在当前句内找主语，避免取到上一句的名词
      if (t.text === ',' || t.text === ';' || t.text === '.' || t.text === 'and' || t.text === 'or' || t.text === 'but' || t.text === 'then' || t.text === 'to') { lo = k + 1; break; }
      if (dict.MODALS[t.text]) return null;
      lo = k;
    }
    // 若区间内含关系代词 → 主语判定不可靠，跳过
    for (var q = idx - 1; q >= lo; q--) {
      if (/^(who|whom|whose|which|that)$/.test(tokens[q].text)) return null;
    }
    var skippedPPObj = false;
    for (var r = idx - 1; r >= lo; r--) {
      var tt = tokens[r];
      if (tt.sentence !== sid) break;
      if (text && /[([]\s*$/.test(text.slice(0, tt.start))) continue; // 括号内的缩写（如 (IAS)）不作主语
      if (hasAnyTag(tt, ['Adverb'])) continue;
      if (tt.text === 'there') continue;
      if (t.text === 'not' || tt.text === 'also' || tt.text === 'always' || tt.text === 'often' || tt.text === 'never' || tt.text === 'usually' || tt.text === 'however') continue;
      if (isDeterminer(tt)) { if (skippedPPObj) continue; return null; } // 已越过 PP 宾语时，其限定词可跳过（the results of the experiment is）
      if (hasTag(tt, 'Preposition') || dict.PREPS[tt.text]) { if (skippedPPObj) continue; return null; } // 已越过 PP 宾语时继续向左找中心词
      var cl = classifySubject(tt);
      if (cl) {
        if (isPPObject(tokens, r)) { skippedPPObj = true; continue; }
        // 越过 of 短语宾语后找到的中心词：仅当其为复数时才作为主语，单数中心词（a large number of X were）属正常用法
        if (skippedPPObj && !cl.plural) return null;
        // 候选主语前若出现谓词（they had morning classes was…）→ 真正主语为更左的中心词，单复数不可判
        for (var g2 = r - 1; g2 >= Math.max(lo, r - 5); g2--) {
          var tg = tokens[g2];
          if (hasAnyTag(tg, ['Gerund', 'Verb']) || /^(am|is|are|was|were|be|been|being|do|does|did|have|has|had|will|would|can|could|may|might|must|should|shall)$/.test(tg.text)) return null;
          if (isDeterminer(tg) || hasAnyTag(tg, ['Adjective', 'Adverb', 'Noun', 'Number', 'Value', 'Cardinal'])) continue;
          break;
        }
        return cl;
      }
    }
    return null;
  }

  // 判断动词是否处于不该判错的位子（情态动词/to 之后）。true=跳过不判
  function verbBlocked(tokens, idx) {
    for (var k = idx - 1; k >= 0; k--) {
      var t = tokens[k];
      if (t.text === ',' || t.text === ';' || t.text === '.' || t.text === 'and' || t.text === 'or' || t.text === 'but') return false; // 子句边界→主谓完整，可判
      if (dict.MODALS[t.text] || t.text === 'to') return true;          // 情态动词/to 表原形，不判
      if (hasAnyTag(t, ['Adverb'])) continue;
      if (t.text === 'not' || t.text === 'also' || t.text === 'always' || t.text === 'often' || t.text === 'never' || t.text === 'usually' || t.text === 'however') continue;
      if (isDeterminer(t)) continue;
      return false;                                                 // 已见主体/其它词，可判
    }
    return false;
  }

  // ---------------- 导出 ----------------
  tok.tokenize = tokenize;
  tok.hasTag = hasTag;
  tok.hasAnyTag = hasAnyTag;
  tok.isNoun = isNoun;
  tok.isProperNoun = isProperNoun;
  tok.isPlural = isPlural;
  tok.isSingular = isSingular;
  tok.looksPlural = looksPlural;
  tok.isCountPlural = isCountPlural;
  tok.finCount = finCount;
  tok.isFiniteVerb = isFiniteVerb;
  tok.plainFinite = plainFinite;
  tok.hasClause = hasClause;
  tok.tok = tokAt;
  tok.prevNonEmpty = prevNonEmpty;
  tok.prevIdx = prevIdx;
  tok.nextReal = nextReal;
  tok.isDeterminer = isDeterminer;
  tok.isPPObject = isPPObject;
  tok.classifySubject = classifySubject;
  tok.subjectBefore = subjectBefore;
  tok.verbBlocked = verbBlocked;
})(typeof window !== 'undefined' ? window : null);
