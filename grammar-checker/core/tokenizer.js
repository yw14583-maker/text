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

  // ---------------- 性能辅助 ----------------
  // subjectBefore/hasClause 原实现对每个候选主语/每次调用都 slice 文本前缀或全表扫描 tokens，
  // 长文本下退化为 O(n²)。以下 helper 与原写法等价但为 O(1)~O(log n)。
  var WS_RE = /\s/;
  // 等价于 /[([]\s*$/.test(text.slice(0, pos))：向前跳过空白后是 ( 或 [
  function prevIsParen(text, pos) {
    var p = pos - 1;
    while (p >= 0 && WS_RE.test(text.charAt(p))) p--;
    return p >= 0 && (text.charAt(p) === '(' || text.charAt(p) === '[');
  }
  // tokens 按 start 升序（分词器顺序产出，正常恒为 true）。以数组长度为指纹缓存校验结论。
  var _sortedCache = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function tokensSorted(tokens) {
    if (!_sortedCache) {
      for (var i = 1; i < tokens.length; i++) if (tokens[i - 1].start > tokens[i].start) return false;
      return true;
    }
    var c = _sortedCache.get(tokens);
    if (!c || c.len !== tokens.length) {
      var s = true;
      for (var j = 1; j < tokens.length; j++) { if (tokens[j - 1].start > tokens[j].start) { s = false; break; } }
      c = { len: tokens.length, sorted: s };
      _sortedCache.set(tokens, c);
    }
    return c.sorted;
  }
  // 首个 start >= pos 的 token 下标，无则 -1（仅在校验为升序后使用）
  function firstIdxAtOrAfter(tokens, pos) {
    var lo = 0, hi = tokens.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (tokens[mid].start < pos) lo = mid + 1; else hi = mid; }
    return lo < tokens.length ? lo : -1;
  }

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
    var sorted = tokensSorted(tokens);
    var i = sorted ? firstIdxAtOrAfter(tokens, a) : 0; // 升序时二分定位区间起点，替代原每次调用全表扫描
    for (; i >= 0 && i < tokens.length; i++) {
      var t = tokens[i];
      if (sorted) { if (t.start >= b) break; }          // 升序：越过区间右端即可退出
      else if (t.start < a || t.start >= b) continue;   // 极端乱序输入：保持原全表扫描语义
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

  // ---- subjectBefore / verbBlocked 的预计算索引（按 tokens 数组缓存，WeakMap + 长度指纹）----
  // 背景：这两个函数原来对每个动词候选都从 idx-1 一路回扫到句首（跨句/边界词才停）。
  // 当句子很长且缺少边界词 token 时（逗号不是 token！单个长句可达数万 token），
  // 整体退化为 O(动词数 × 句长)。下面把「左边界 / 区间内是否有情态动词 / 是否有关系代词 /
  // 左侧最近的判定词」预计算成有序表，查询降为 O(log n) 或 O(1)，语义与原循环逐字符等价。
  var _sbCache = (typeof WeakMap === 'function') ? new WeakMap() : null;
  var SB_BOUNDARY = {',':1,';':1,'.':1,'and':1,'or':1,'but':1,'then':1,'to':1};
  var SB_REL = /^(who|whom|whose|which|that)$/;
  var VB_BOUNDARY = {',':1,';':1,'.':1,'and':1,'or':1,'but':1};
  var VB_FREQ = {not:1,also:1,always:1,often:1,never:1,usually:1,however:1};

  function sbIndex(tokens) {
    if (!_sbCache) return null;
    var c = _sbCache.get(tokens);
    if (c && c.len === tokens.length) return c;
    var n = tokens.length, lb = new Array(n), stopIdx = new Array(n), modal = [], rel = [];
    var sStart = 0, bnd = -1, mono = true, lastSid = null;
    for (var i = 0; i < n; i++) {
      var t = tokens[i];
      if (lastSid !== null && t.sentence < lastSid) mono = false; // 句号非递减假设被破坏 → 弃用快速路径
      lastSid = t.sentence;
      if (i > 0 && t.sentence !== tokens[i - 1].sentence) { sStart = i; bnd = -1; } // 边界不跨句
      lb[i] = bnd >= 0 ? Math.max(sStart, bnd + 1) : sStart;
      // stopIdx[i]：原第一循环对动词 i 回扫时的「停下位置」（边界词 / 上一句末 token / 句首）。
      // 原第三循环引用了第一循环残留的 var t（跨语句作用域），其文本必须是该停下位置的 token。
      stopIdx[i] = bnd >= 0 ? bnd : (sStart > 0 ? sStart - 1 : 0);
      var w = t.text;
      if (SB_BOUNDARY[w]) bnd = i;
      if (dict.MODALS[w]) modal.push(i);
      if (SB_REL.test(w)) rel.push(i);
    }
    c = { len: n, lb: lb, stopIdx: stopIdx, modal: modal, rel: rel, usable: mono };
    _sbCache.set(tokens, c);
    return c;
  }
  // 升序数组中是否存在落在 [lo, hi) 的元素
  function hasInRange(arr, lo, hi) {
    var l = 0, r = arr.length;
    while (l < r) { var m = (l + r) >> 1; if (arr[m] < lo) l = m + 1; else r = m; }
    return l < arr.length && arr[l] < hi;
  }
  // verbBlocked 预计算：prevDecide[i] = i 左侧最近的「判定词」下标（副词/频率词/限定词 不参与判定），无则 -1
  function vbIndex(tokens) {
    if (!_vbCache) return null;
    var c = _vbCache.get(tokens);
    if (c && c.len === tokens.length) return c;
    var n = tokens.length, prevDecide = new Array(n), last = -1;
    for (var i = 0; i < n; i++) {
      prevDecide[i] = last;
      var t = tokens[i], w = t.text;
      // 情态动词/to 永远是「判定词」（返回 true），任何情况下都不能被跳过；边界词同理（返回 false）
      var skip = !VB_BOUNDARY[w] && !dict.MODALS[w] && w !== 'to' && (hasAnyTag(t, ['Adverb']) || VB_FREQ[w] || isDeterminer(t));
      if (!skip) last = i;
    }
    c = { len: n, prevDecide: prevDecide };
    _vbCache.set(tokens, c);
    return c;
  }
  var _vbCache = (typeof WeakMap === 'function') ? new WeakMap() : null;

  // 取动词左边最近的主体（跳过副词/限定词/介词短语宾语）；若跨过定语从句则取从句先行词
  function subjectBefore(tokens, idx, text) {
    var sid = tokens[idx] ? tokens[idx].sentence : 0;
    var lo = 0; // 左边界
    var staleIsNot = false; // 原第三循环里引用的 t.text==='not'（第一循环残留的 var t，见下方注释）
    var c = sbIndex(tokens);
    if (c && c.usable) {
      lo = c.lb[idx] || 0;
      // 原第一循环：[lo, idx) 内出现情态动词 → 主语判定不可靠
      if (hasInRange(c.modal, lo, idx)) return null;
      // 原第二循环：[lo, idx) 内出现关系代词 → 不可靠
      if (hasInRange(c.rel, lo, idx)) return null;
      // 原第一循环以 var t 记录回扫停下位置的 token，第三循环的 t.text==='not' 读的是这个残留值
      staleIsNot = tokens[c.stopIdx[idx]].text === 'not';
    } else {
      var t;
      for (var k = idx - 1; k >= 0; k--) {
        t = tokens[k];
        if (t.sentence !== sid) { lo = k + 1; break; } // 跨句 → 只在当前句内找主语，避免取到上一句的名词
        if (t.text === ',' || t.text === ';' || t.text === '.' || t.text === 'and' || t.text === 'or' || t.text === 'but' || t.text === 'then' || t.text === 'to') { lo = k + 1; break; }
        if (dict.MODALS[t.text]) return null;
        lo = k;
      }
      // 若区间内含关系代词 → 主语判定不可靠，跳过
      for (var q = idx - 1; q >= lo; q--) {
        if (/^(who|whom|whose|which|that)$/.test(tokens[q].text)) return null;
      }
      staleIsNot = t ? t.text === 'not' : false;
    }
    var skippedPPObj = false;
    for (var r = idx - 1; r >= lo; r--) {
      var tt = tokens[r];
      if (tt.sentence !== sid) break;
      if (text && prevIsParen(text, tt.start)) continue; // 括号内的缩写（如 (IAS)）不作主语（原实现每次候选都 slice 整个文本前缀跑正则）
      if (hasAnyTag(tt, ['Adverb'])) continue;
      if (tt.text === 'there') continue;
      if (staleIsNot || tt.text === 'also' || tt.text === 'always' || tt.text === 'often' || tt.text === 'never' || tt.text === 'usually' || tt.text === 'however') continue;
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
    var c = vbIndex(tokens);
    if (c) {
      // 等价于原回扫：左侧最近的判定词是情态动词或 to → true；其余（含边界词）→ false
      var k = c.prevDecide[idx];
      if (k < 0) return false;
      var w = tokens[k].text;
      return !!dict.MODALS[w] || w === 'to';
    }
    for (var k2 = idx - 1; k2 >= 0; k2--) {
      var t = tokens[k2];
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
