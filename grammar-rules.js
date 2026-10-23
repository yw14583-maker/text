/* 英文启发式语法模块（ART/TEN/SVA）
 * 依赖 text-pos.js 提供的 window.nlp（compromise 内置 POS 标注）。
 * 暴露 window.GrammarRules.runAll(text) ->
 *   [{ruleId, category, confidence, start, end, errorText, message, suggestion}]
 * 置信度：high=判错扣分；mid=「疑似」仅提示；low=仅写作建议不判错。
 */
(function (global) {
  'use strict';
  if (!global) return;

  var GC = global.GrammarChecker;
  if (!GC || !GC.pipeline) throw new Error('GrammarChecker 核心层未加载：请先引入 grammar-checker/ 下的 dictionaries 与 core 脚本');
  var D = GC.dict, T = GC.tok, M = GC.morph;
  var addIssue = GC.pipeline.addIssue, register = GC.pipeline.register;

  // ---- 词表别名（已迁移至 grammar-checker/dictionaries/）----
  var UNCOUNTABLE = D.UNCOUNTABLE, PLURAL_OK = D.PLURAL_OK, NOUN_STRICT = D.NOUN_STRICT,
      EACH_NOUN = D.EACH_NOUN, PHYS_S = D.PHYS_S, NOUN_SKIP = D.NOUN_SKIP, MEASURE_WORDS = D.MEASURE_WORDS,
      UNIQUE_NOUNS = D.UNIQUE_NOUNS, NOUN_VERB_HOMO = D.NOUN_VERB_HOMO, ABSTRACT_NOUN = D.ABSTRACT_NOUN,
      COLLECTIVE = D.COLLECTIVE, SPORTS = D.SPORTS, ORDINALS = D.ORDINALS,
      COUNTRY_OK = D.COUNTRY_OK, THE_OK = D.THE_OK, GEO_THE = D.GEO_THE, COMMON_NOUN_WHITELIST = D.COMMON_NOUN_WHITELIST,
      SOUND_AN = D.SOUND_AN, SOUND_A = D.SOUND_A,
      MODALS = D.MODALS, DETERMINERS = D.DETERMINERS, POSSESSIVE = D.POSSESSIVE, POSS_DET = D.POSS_DET,
      CENTRAL_DET = D.CENTRAL_DET, INDEF = D.INDEF, INTERJECTION = D.INTERJECTION, INNER_WORDS = D.INNER_WORDS,
      COMPARATIVE = D.COMPARATIVE, SUPERLATIVE = D.SUPERLATIVE, REDUNDANT = D.REDUNDANT,
      PREPS = D.PREPS, V_PREP_RULE = D.V_PREP_RULE, N_PREP_RULE = D.N_PREP_RULE, ADJ_PREP_ERR = D.ADJ_PREP_ERR,
      IRREG_PP = D.IRREG_PP, IRREG_S3 = D.IRREG_S3, IRREG_BASE = D.IRREG_BASE,
      IRREG_PLURAL = D.IRREG_PLURAL, PLURAL_IRREG = D.PLURAL_IRREG,
      PAST_TO_PP = D.PAST_TO_PP, PAST_BASE = D.PAST_BASE, PP_FROM_BASE = D.PP_FROM_BASE,
      TO_VERBS = D.TO_VERBS, GERUND_E = D.GERUND_E;

  // ---- 核心层助手别名（已迁移至 grammar-checker/core/tokenizer.js）----
  var tokenize = T.tokenize, hasTag = T.hasTag, hasAnyTag = T.hasAnyTag, isNoun = T.isNoun,
      isProperNoun = T.isProperNoun, isPlural = T.isPlural, isSingular = T.isSingular,
      looksPlural = T.looksPlural, isCountPlural = T.isCountPlural, finCount = T.finCount,
      isFiniteVerb = T.isFiniteVerb, plainFinite = T.plainFinite, hasClause = T.hasClause,
      tok = T.tok, prevNonEmpty = T.prevNonEmpty, prevIdx = T.prevIdx, nextReal = T.nextReal,
      isDeterminer = T.isDeterminer, isPPObject = T.isPPObject,
      classifySubject = T.classifySubject, subjectBefore = T.subjectBefore, verbBlocked = T.verbBlocked;
  var gerund = M.gerund, deGerund = M.deGerund, baseFromEd = M.baseFromEd,
      pluralize = M.pluralize, nounSingular = M.nounSingular, thirdBase = M.thirdBase;
  // ---------------- 性能辅助：位置查询（替代 text.slice(0, x) + 正则 / 线性扫 tokens） ----------------
  // 背景：原实现大量使用「text.slice(0, pos) 后跑 /[.!?]\s*$/ 之类正则」判断 token 是否位于句首，
  // 以及「for 全表扫描 tokens 找某个 start 之后的 token」。这两种写法在每个 token / 每个逗号上
  // 都会复制一遍前缀文本或扫一遍 token 数组，长文本下整体退化为 O(n²)。
  // 以下 helper 与原写法逐字符等价（见各函数注释），但均为 O(1)~O(log n) 且不产生中间大字符串。
  var WS_RE = /\s/;

  // 等价于 pos === 0 || /[.!?]\s*$/.test(text.slice(0, pos))：
  // 从 pos 向前跳过空白，首个非空白字符为 . ! ? 即视为句首。
  function isSentenceStart(text, pos) {
    if (pos === 0) return true;
    if (pos < 0 || pos > text.length) return false;
    var p = pos - 1;
    while (p >= 0 && WS_RE.test(text.charAt(p))) p--;
    if (p < 0) return false;
    var c = text.charAt(p);
    return c === '.' || c === '!' || c === '?';
  }

  // 等价于 /,\s*$/.test(text.slice(0, pos))：向前跳过空白后判断是否为逗号。
  function prevIsComma(text, pos) {
    var p = pos - 1;
    while (p >= 0 && WS_RE.test(text.charAt(p))) p--;
    return p >= 0 && text.charAt(p) === ',';
  }

  // 等价于 (text.slice(0, pos).match(/([A-Za-z.]+)$/) || ['', ''])[1]：
  // 取 pos 之前紧邻的 [A-Za-z.] 字符 run（供 PUNC-004 提取句点前的单词）。
  function trailingWordBefore(text, pos) {
    var end = pos;
    while (end > 0) {
      var c = text.charAt(end - 1);
      if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '.') end--;
      else break;
    }
    return text.slice(end, pos);
  }

  // 等价于 text.slice(pos).match(/^(\s*)(.)/) 后取 m[2]：
  // 返回 pos 之后首个非空白字符；若其后全是空白，返回最后一个空白字符
  // （原正则 \s* 贪婪失败后会回溯匹配到一个空白字符，此细节必须保留：
  //  否则「句末仅余空格的介词」的 PREP-001 判定会发生变化）；无剩余字符返回 ''。
  function nextCharAfter(text, pos) {
    var last = '';
    for (var p = pos; p < text.length; p++) {
      var c = text.charAt(p);
      if (!WS_RE.test(c)) return c;
      last = c;
    }
    return last;
  }

  // tokens 按 start 升序（分词器从左到右顺序产出，正常恒为 true）。
  // 用 WeakMap 以数组长度为指纹缓存校验结论，避免每次调用重复 O(n) 校验。
  var _sortedCache = (typeof WeakMap === 'function') ? new WeakMap() : null;
  function checkSorted(tokens) {
    for (var i = 1; i < tokens.length; i++) {
      if (tokens[i - 1].start > tokens[i].start) return false;
    }
    return true;
  }
  function tokensSorted(tokens) {
    if (!_sortedCache) return checkSorted(tokens);
    var c = _sortedCache.get(tokens);
    if (!c || c.len !== tokens.length) {
      c = { len: tokens.length, sorted: checkSorted(tokens) };
      _sortedCache.set(tokens, c);
    }
    return c.sorted;
  }
  // 首个 start >= pos 的 token 下标，无则 -1（二分查找；极端乱序输入时退化为线性扫描，结果不变）
  function firstIdxAtOrAfter(tokens, pos) {
    if (!tokensSorted(tokens)) {
      for (var i = 0; i < tokens.length; i++) if (tokens[i].start >= pos) return i;
      return -1;
    }
    var lo = 0, hi = tokens.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (tokens[mid].start < pos) lo = mid + 1; else hi = mid; }
    return lo < tokens.length ? lo : -1;
  }
  // 首个 start > pos 的 token 下标，无则 -1
  function firstIdxAfter(tokens, pos) {
    if (!tokensSorted(tokens)) {
      for (var i = 0; i < tokens.length; i++) if (tokens[i].start > pos) return i;
      return -1;
    }
    var lo = 0, hi = tokens.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (tokens[mid].start <= pos) lo = mid + 1; else hi = mid; }
    return lo < tokens.length ? lo : -1;
  }

  // ---------------- 主谓一致 ----------------
  // 注：原 nextHeadNoun() 定义后从未被调用（死代码），已移除
  function runSva(tokens, text, issues) {
    var n = tokens.length;
    // SVA-004 不定代词 + 复数谓语
    for (var i = 0; i < n; i++) {
      if (!INDEF[tokens[i].text]) continue;
      var v = tok(tokens, i + 1);
      if (v && (/^(are|were)$/.test(v.text))) addIssue(issues, { ruleId:'SVA-004', category:'sva', confidence:'high', start:tokens[i].start, end:v.end, errorText:text.slice(tokens[i].start, v.end), message:'everyone/nobody 等不定代词作主语，谓语动词用单数', suggestion:v.text==='are'?'is':'was' });
    }
    // SVA-005 There be 就近原则（含 A and B 并列主语、跳过介词短语宾语）
    for (var tb = 0; tb < n; tb++) {
      if (tokens[tb].text !== 'there') continue;
      var be = tok(tokens, tb + 1);
      if (!be || (be.text !== 'is' && be.text !== 'are')) continue;
      var plu = false, kb = tb + 2;
      for (; kb < n; kb++) {
        var tbx = tokens[kb];
        if (!tbx.text) continue;
        if (hasTag(tbx, 'Preposition') || PREPS[tbx.text]) break; // 进入介词短语 → 已越过主语中心词
        // "a lot of / a number of + 名词" → 中心词在被 of 限定的名词上（须先于词性跳过判断，lot 常被误标 Adverb）
        if (MEASURE_WORDS[tbx.text] && tokens[kb + 1] && tokens[kb + 1].text === 'of' && tokens[kb - 1] && /^(a|an)$/.test(tokens[kb - 1].text)) { kb++; continue; }
        if (isDeterminer(tbx) || hasAnyTag(tbx, ['Adjective', 'Adverb']) || /^\d+$/.test(tbx.text) || hasAnyTag(tbx, ['Number', 'Value', 'Cardinal'])) continue;
        if (/^(many|few|several|most|some|any|all|both|lots|plenty|numbers|dozens|no|each|every)$/.test(tbx.text)) continue;
        if (isNoun(tbx) || hasAnyTag(tbx, ['Pronoun'])) {
          plu = isPlural(tbx) || IRREG_PLURAL[tbx.text] || looksPlural(tbx.text) || /^(they|we|these|those)$/.test(tbx.text);
        }
        break; // 只取 be 之后的首个名词中心词，避免被后置介词短语里的名词干扰
      }
      var want = plu ? 'are' : 'is';
      if (be.text !== want) addIssue(issues, { ruleId:'SVA-005', category:'sva', confidence:'high', start:tokens[tb].start, end:tokens[tb].end + 20, errorText:text.slice(tokens[tb].start, Math.min(tokens[tb].end + 25, text.length)), message:'There be 中主语' + (plu ? '为复数，be 动词应用复数(are)' : '为单数，be 动词应用单数(is)'), suggestion:'There ' + want + ' …' });
    }
    // SVA-006 s 结尾单数名词 + are
    for (var s6 = 0; s6 + 1 < n; s6++) {
      if (PHYS_S.test(tokens[s6].text) && tokens[s6 + 1].text === 'are') addIssue(issues, { ruleId:'SVA-006', category:'sva', confidence:'high', start:tokens[s6].start, end:tokens[s6 + 1].end, errorText:tokens[s6].raw + ' ' + tokens[s6 + 1].raw, message:'news/physics 等虽以 s 结尾但为单数名词，谓语用单数(is)', suggestion:tokens[s6].raw + ' is' });
    }
    // SVA-003 插入语干扰：head, insert..., are/were
    var m3 = /([A-Za-z]+)\s*,\s*(?:together with|along with|as well as|including)\s+[^,]+,\s*(are|were)\b/gi;
    var m3r;
    while ((m3r = m3.exec(text)) !== null) {
      var head3 = m3r[1].toLowerCase();
      var verb3 = (m3r[2] || '').toLowerCase();
      var headPlur = /[sx]$/.test(head3) || head3 === 'they' || head3 === 'we' || head3 === 'these' || head3 === 'those';
      var sug3 = '';
      if (headPlur && (verb3 === 'is' || verb3 === 'was')) sug3 = verb3 === 'is' ? 'are' : 'were';
      else if (!headPlur && (verb3 === 'are' || verb3 === 'were')) sug3 = verb3 === 'are' ? 'is' : 'was';
      if (!sug3) continue; // 动词与真正主语一致，不报
      addIssue(issues, { ruleId:'SVA-003', category:'sva', confidence:'mid', start:m3r.index, end:m3r.index + m3r[0].length, errorText:m3r[0], message:'together with/along with/as well as 属插入语，谓语单复数由真正主语（' + head3 + '）决定', suggestion:sug3 });
    }
    // SVA-007 either...or / neither...nor 就近
    var m7 = /((?:neither|either)\s+\w+\s+(?:nor|or)\s+)(\w+)\s+(is|are|was|were)/i;
    var m7r = m7.exec(text);
    if (m7r) {
      var near = m7r[2].toLowerCase(), nearW = m7r[3].toLowerCase();
      var nearPlural = /[sx]$/.test(near) || near === 'they' || near === 'we';
      if (nearPlural && (nearW === 'is' || nearW === 'was')) addIssue(issues, { ruleId:'SVA-007', category:'sva', confidence:'mid', start:m7r.index, end:m7r.index + m7r[0].length, errorText:m7r[0], message:'neither...nor/either...or 遵循就近原则，谓语随离动词更近的主语（' + near + '）用复数', suggestion:nearW === 'is' ? 'are' : 'were' });
      if (!nearPlural && (nearW === 'are' || nearW === 'were')) addIssue(issues, { ruleId:'SVA-007', category:'sva', confidence:'mid', start:m7r.index, end:m7r.index + m7r[0].length, errorText:m7r[0], message:'neither...nor/either...or 遵循就近原则，谓语随离动词更近的主语（' + near + '）用单数', suggestion:nearW === 'are' ? 'is' : 'were' });
    }
    // SVA-001/002 一般现在时主谓一致
    for (var v = 0; v < n; v++) {
      var tv = tokens[v];
      if (!tv.text) continue; // 跳过缩写产生的空 token（it's / they're 等）
      if (MODALS[tv.text]) continue;
      if (PREPS[tv.text] || hasTag(tv, 'Preposition')) continue; // 介词不做谓语（防 compromise 误标 in/on...）
      if (hasAnyTag(tv, ['Noun'])) continue; // 名词同形词（points/route/step/particulate…）不作谓语
      if (!hasTag(tv, 'PresentTense') && !hasTag(tv, 'Verb')) continue;
      if (hasTag(tv, 'PastTense') || hasTag(tv, 'Gerund')) continue;
      var pv = tok(tokens, v - 1), nxv = tok(tokens, v + 1);
      if (pv && (hasTag(pv, 'Gerund') || /^(has|have|had|be|been|being|am|is|are|was|were|do|does|did|will|would|can|could|may|might|must|should|shall)$/i.test(pv.text))) continue; // 助动词/情态/动名词后接的动词不作主谓判定
      if (nxv && !/^(that|which|who|whom|whose|and|or|but)$/.test(nxv.text) && !hasAnyTag(nxv, ['Verb']) && (hasAnyTag(nxv, ['Noun']) || hasTag(nxv, 'Preposition') || PREPS[nxv.text])) continue; // 后接名词/介词 → 非谓语
      if (prevIsComma(text, tv.start)) continue; // 逗号后 → 前句谓语，交由 RUN-001（原为 /,\s*$/.test(text.slice(0, tv.start))）
      var coord = false, coordIdx = -1;
      for (var cc = v - 1; cc >= Math.max(0, v - 5); cc--) {
        var tc = tokens[cc];
        if (tc.sentence !== tv.sentence) break; // 不跨句扫描（上一句的 and/but 不得影响本句判定）
        if (tc.text === 'and' || tc.text === 'or' || tc.text === 'but') { coord = true; coordIdx = cc; break; }
        if (tc.text === ',' || tc.text === ';' || hasAnyTag(tc, ['Verb'])) break;
      }
      var listCtx = false, segStart = tv.start;
      for (var lc = v - 1; lc >= Math.max(0, v - 2); lc--) {
        if (tokens[lc].sentence !== tv.sentence) break;
        var between = text.slice(tokens[lc].end, segStart);
        if (/[,;]/.test(between) || /^[,;]$/.test(tokens[lc].text) || tokens[lc].text === 'and' || tokens[lc].text === 'or') { listCtx = true; break; }
        segStart = tokens[lc].start;
      }
      var sb = subjectBefore(tokens, v, text);
      if (!sb) continue;
      var pronSubj = /^(i|you|he|she|it|we|they)$/.test(sb.name);
      // 并列连词位于主语之前（…, but they is …）时，该主语并非并列主语，仍需判定一致性
      if (listCtx && !(pronSubj && coord)) continue; // 并列/列表中的成分，非谓语
      if (coord && !pronSubj) {
        var leftC = tok(tokens, coordIdx - 1);
        // 连词左侧为名词（X and Y are 型并列主语）→ 不判；左侧为副词/形容词（more and more people）→ 仍需判定
        if (leftC && hasAnyTag(leftC, ['Noun', 'Pronoun']) && !hasAnyTag(leftC, ['Adverb', 'Adjective'])) continue;
      }
      var wv = tv.text;
      if (hasTag(tv, 'Auxiliary') && !/^(is|are|was|were|has|have)$/i.test(wv)) continue; // got 等助动词不参与 +s/es 一致判定
      // 1) be/have 助动词主谓一致（吸收 Gemini 亮点：独立分支，比通用 +s/es 更稳）
      if (/^(is|are|was|were|has|have)$/i.test(wv)) {
        if (PHYS_S.test(sb.name) || INDEF[sb.name]) continue; // 这二者交给 SVA-006 / SVA-004
        var bmap = {};
        if (sb.plural) bmap = {is:'are',was:'were',has:'have'};
        else if (sb.third) bmap = {are:'is',were:'was',have:'has'};
        if (bmap[wv]) {
          addIssue(issues, { ruleId: sb.plural ? 'SVA-002' : 'SVA-001', category:'sva', confidence:'high', start:tv.start, end:tv.end, errorText:tv.raw, message:'『' + sb.name + '』' + (sb.plural ? '是复数主语，谓语要用复数形式' : '是第三人称单数主语，谓语要用单数形式'), suggestion:bmap[wv] });
        }
        continue;
      }
      var hasS = /[sx]$/i.test(wv);
      if (sb.third && !sb.plural && !hasS && !/^(is|has|does|am|was|are|were|have|do)$/i.test(wv)) {
        addIssue(issues, { ruleId:'SVA-001', category:'sva', confidence:'high', start:tv.start, end:tv.end, errorText:tv.raw, message:'一般现在时第三人称单数主语 "' + sb.name + '" 后，动词要加 s/es', suggestion:singularize(tv) });
      } else if (sb.plural && hasS && !/^(is|has|does|are|were)$/i.test(wv)) {
        addIssue(issues, { ruleId:'SVA-002', category:'sva', confidence:'high', start:tv.start, end:tv.end, errorText:tv.raw, message:'复数主语的一般现在时谓语动词不需要加 s/es', suggestion:pluralStrip(tv) });
      }
    }
    // SVA-008 集合名词（低，仅建议）：仅当其后直接跟 be 动词时才提示
    for (var c = 0; c + 1 < n; c++) {
      if (!COLLECTIVE[tokens[c].text]) continue;
      var vc = tokens[c + 1];
      if (!/^(are|were)$/.test(vc.text)) continue; // is/was 属正常用法，不提示
      addIssue(issues, { ruleId:'SVA-008', category:'sva', confidence:'low', start:tokens[c].start, end:tokens[c].end, errorText:tokens[c].raw, message:'集合名词 ' + tokens[c].raw + '：强调整体用单数(is)，强调成员用复数(are)，按语义选择', suggestion:'is / are 视语义而定' });
      break;
    }
  }

  function singularize(t) { var w = t.text; if (IRREG_S3[w]) return IRREG_S3[w]; if (/[sx]$/i.test(w) || /ch$|sh$|o$/i.test(w)) return w + 'es'; if (/[bcdfghjklmnpqrstvwxz]y$/i.test(w)) return w.slice(0, -1) + 'ies'; return w + 's'; }
  function pluralStrip(t) { var w = t.text.toLowerCase(); var base = IRREG_BASE[w]; if (base) return base; if (/ies$/i.test(w)) return w.slice(0, -3) + 'y'; if (/ches$|shes$|xes$|zes$|sses$/i.test(w)) return w.slice(0, -2); return w.replace(/s$/i, ''); }

  // VERB-001/002 be 动词搭配错误：be + 动词原形 / be + been
  function runVerb(tokens, text, issues) {
    for (var i = 0; i + 1 < tokens.length; i++) {
      var curr = tokens[i], next = tokens[i + 1];
      if (!/^(am|is|are|was|were)$/i.test(curr.text)) continue;
      // VERB-002: be + been（was/were/is/are been 均为错误，完成时须 has/have/had been）
      if (next.text === 'been') {
        addIssue(issues, { ruleId:'VERB-002', category:'verb', confidence:'high', start:curr.start, end:next.end, errorText:text.slice(curr.start, next.end), message:'am/is/are/was/were 不能与 been 连用，完成时请用 has/have/had been', suggestion:'has been / had been' });
        continue;
      }
      // VERB-001: be + 动词原形（Bare Infinitive），如 I am agree / He is go
      if (hasTag(next, 'Infinitive') && !hasAnyTag(next, ['Gerund', 'Adjective', 'PastTense']) && !PREPS[next.text]) {
        addIssue(issues, { ruleId:'VERB-001', category:'verb', confidence:'high', start:curr.start, end:next.end, errorText:text.slice(curr.start, next.end), message:'be 动词不能直接接动词原形，应改用实义动词或 be 的正确形式（be doing / be + 形容词）', suggestion:curr.raw + ' ' + next.raw + ' → ' + next.raw });
      }
    }
  }

  // VERB-004 情态动词后误用非原形（过去式 / 第三人称单数）
  function runModal(tokens, text, issues) {
    for (var i = 0; i + 1 < tokens.length; i++) {
      var t = tokens[i], nx = tokens[i + 1];
      if (!MODALS[t.text] && !hasTag(t, 'Modal')) continue;
      if (!hasTag(nx, 'Verb') || hasTag(nx, 'Gerund')) continue; // 情态+-ing 由 NF-002 处理
      var irrPast = PAST_BASE[nx.text] && PAST_BASE[nx.text] !== nx.text; // 排除 read/put 等同形词
      var isPast = hasTag(nx, 'PastTense') && (irrPast || /ed$/i.test(nx.text));
      // 情态后基形会被标为 Infinitive；无该标签的现在时即为第三人称单数（can went / should goes）
      var is3rd = !isPast && hasTag(nx, 'PresentTense') && !hasTag(nx, 'Infinitive');
      if (!isPast && !is3rd) continue;
      var base = isPast ? (PAST_BASE[nx.text] || baseFromEd(nx.text)) : thirdBase(nx.text);
      addIssue(issues, { ruleId:'VERB-004', category:'verb', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'情态动词 "' + t.raw + '" 后必须接动词原形，"' + nx.raw + '" 是' + (isPast ? '过去式' : '第三人称单数') + '形式', suggestion:t.raw + ' ' + base });
    }
  }

  // NOUN-001 不可数名词误用复数形式（informations / advices / equipments ...）
  function runNoun(tokens, text, issues) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], w = t.text;
      if (!/s$/i.test(w) || PLURAL_OK[w]) continue;
      var base = w.replace(/s$/i, '');
      if (!UNCOUNTABLE[base] || base === 'news') continue;
      var nounOnly = hasTag(t, 'Noun') && !hasAnyTag(t, ['Verb']);
      if (!nounOnly && !NOUN_STRICT[base]) continue; // 排除 works/progresses 等动词；无动词用法的错形仍需判出
      addIssue(issues, { ruleId:'NOUN-001', category:'noun', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'"' + base + '" 是不可数名词，不能使用复数形式', suggestion:base });
    }
  }

  // NOUN-002 数词(>1)后误用单数可数名词（two book / three day）
  var NUM_WORDS = {two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  var NUM_SCALE = {hundred:1,thousand:1,million:1,billion:1,dozen:1,percent:1};
  // 常作前置定语、后接另一名词的名词，避免 “ten percentage points” 误判
  var MODIFIER_NOUN = {percentage:1,percent:1,average:1,total:1,kind:1,type:1,sort:1};
  // 数词后可 legitimately 接单数的计量/时间缩写与单位（3 p.m. / 10 a.m. / 5 kg），NOUN-002 放行
  var UNIT_ABBR = {kg:1,g:1,mg:1,cm:1,mm:1,km:1,m:1,ml:1,l:1,lb:1,oz:1,ft:1,yd:1,mi:1,min:1,sec:1,hr:1,hz:1,khz:1,mhz:1,gb:1,mb:1,kb:1,pm:1,am:1,c:1,'°c':1,'°f':1};
  // 形式与单数相同（或非 -s 结尾）的复数名词，避免误判
  function runNum(tokens, text, issues) {
    for (var i = 0; i + 1 < tokens.length; i++) {
      var t = tokens[i], nx = tokens[i + 1];
      var val = NUM_WORDS[t.text];
      if (val === undefined) { if (/^\d+$/.test(t.text)) val = parseInt(t.text, 10); else continue; }
      if (val <= 1) continue;
      if (NUM_SCALE[nx.text] || NUM_WORDS[nx.text] !== undefined || /^\d+$/.test(nx.text)) continue;
      // 数词后不可能接裸动词，故把与动词同形的单数名词（book/cook/box 等）也计入
      var nounish = hasTag(nx, 'Noun') || hasTag(nx, 'Infinitive');
      if (!nounish || hasAnyTag(nx, ['Pronoun']) || hasTag(nx, 'Plural') || isProperNoun(nx)) continue;
      if (/^\s*-/.test(text.slice(nx.end))) continue; // 连字符复合词的左半（16 expert-curated）
      var nx2 = tokens[i + 2];
      if (nx2 && hasTag(nx2, 'Noun')) continue; // 名词作定语（ten carbon risk / 146 survey samples）
      if (MODIFIER_NOUN[nx.text] || IRREG_PLURAL[nx.text] || UNCOUNTABLE[nx.text] || PHYS_S.test(nx.text) || looksPlural(nx.text)) continue;
      if (UNIT_ABBR[nx.text] || (/^[a-z]{1,2}\.?[a-z]?\.?$/.test(nx.text) && nx.text.length <= 4 && /\./.test(nx.raw))) continue; // 3 p.m. / 10 a.m. / etc.
      addIssue(issues, { ruleId:'NOUN-002', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'数词“' + t.raw + '”后应接可数名词复数，"' + nx.raw + '" 是单数形式', suggestion:t.raw + ' ' + pluralize(nx.text) });
    }
  }

  // NF-001~004 非谓语动词：介词后接原形 / 情态后接 -ing 或 to / 漏 to / 多余 to
  // 介词后应接 -ing 的常见动词原形（compromise 常把 learn/improve 等标成名词，故用词表兜底）
  var VERB_AFTER_PREP = {learn:1,improve:1,reduce:1,increase:1,decrease:1,solve:1,achieve:1,avoid:1,consider:1,understand:1,explain:1,describe:1,analyze:1,analyse:1,build:1,create:1,develop:1,provide:1,explore:1,examine:1,investigate:1,respond:1,adapt:1,prevent:1,protect:1,promote:1,recover:1,replace:1,survive:1,validate:1,verify:1,perform:1,introduce:1,discuss:1,mention:1,argue:1,claim:1};
  function runNonfin(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 0; i + 1 < n; i++) {
      var t = tokens[i], nx = tokens[i + 1];
      // NF-001 介词(+非to)后接动词原形 → 应用 -ing（排除关系代词/代词被误标为介词）
      if ((hasTag(t, 'Preposition') || PREPS[t.text]) && t.text !== 'to' && !MODALS[t.text] && !hasAnyTag(t, ['Pronoun']) && !/^(who|whom|whose|which|that)$/.test(t.text)) {
        if (hasTag(nx, 'Infinitive') && (!hasAnyTag(nx, ['Noun', 'Adjective']) || (hasAnyTag(nx, ['Verb']) && !hasAnyTag(nx, ['Adjective']) && tokens[i + 2] && hasAnyTag(tokens[i + 2], ['Noun', 'ProperNoun'])))) {
          addIssue(issues, { ruleId:'NF-001', category:'nonfinite', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'介词后应接动名词(-ing)，不能接动词原形', suggestion:t.raw + ' ' + gerund(nx.text) });
        } else if (VERB_AFTER_PREP[nx.text] && !hasAnyTag(nx, ['Gerund']) && tokens[i + 2] && hasAnyTag(tokens[i + 2], ['Noun', 'ProperNoun']) && !hasAnyTag(tokens[i + 2], ['Verb']) && !hasTag(tokens[i + 2], 'Plural') && !looksPlural(tokens[i + 2].text)) {
          addIssue(issues, { ruleId:'NF-001', category:'nonfinite', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'介词后应接动名词(-ing)，不能接动词原形', suggestion:t.raw + ' ' + gerund(nx.text) });
        }
      }
      // NF-002 情态动词后接 -ing 或 to do（排除 do/does/did，避免 "do shopping" 误判）
      if (MODALS[t.text] && !/^(do|does|did)$/.test(t.text)) {
        if (hasTag(nx, 'Gerund')) addIssue(issues, { ruleId:'NF-002', category:'nonfinite', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'情态动词后接动词原形，不用 -ing', suggestion:t.raw + ' ' + deGerund(nx.text) });
        if (nx.text === 'to' && tokens[i + 2] && hasTag(tokens[i + 2], 'Infinitive')) addIssue(issues, { ruleId:'NF-002', category:'nonfinite', confidence:'high', start:t.start, end:tokens[i + 2].end, errorText:text.slice(t.start, tokens[i + 2].end), message:'情态动词后直接用动词原形，不加 to', suggestion:t.raw + ' ' + tokens[i + 2].raw });
      }
      // NF-003 后接不定式的动词漏 to（含 -ed 变形）
      if (hasTag(t, 'Verb') && !MODALS[t.text]) {
        var tvBase = TO_VERBS[t.text] ? t.text : baseFromEd(t.text);
        if (TO_VERBS[tvBase] && hasTag(nx, 'Infinitive') && !hasAnyTag(nx, ['Noun', 'Adjective'])) {
          addIssue(issues, { ruleId:'NF-003', category:'nonfinite', confidence:'high', start:nx.start, end:nx.end, errorText:nx.raw, message:'"' + t.raw + '" 后接动词应用不定式，需要 to', suggestion:'to ' + nx.raw });
        }
      }
    }
    // NF-007 in order to + 动名词 → 应用动词原形
    for (var o7 = 0; o7 + 3 < n; o7++) {
      if (tokens[o7].text !== 'in' || tokens[o7 + 1].text !== 'order' || tokens[o7 + 2].text !== 'to') continue;
      var g7 = tokens[o7 + 3];
      if (!g7.text || !hasTag(g7, 'Gerund')) continue;
      addIssue(issues, { ruleId:'NF-007', category:'nonfinite', confidence:'high', start:tokens[o7].start, end:g7.end, errorText:text.slice(tokens[o7].start, g7.end), message:'"in order to" 后应接动词原形，不能用 -ing', suggestion:'in order to ' + deGerund(g7.text) });
    }
    // NF-004 make/let + 代词宾语 + to + 动词 → 去掉 to（仅限代词宾语，避免 "make a decision to go" 误判）
    for (var k = 0; k + 2 < n; k++) {
      if (!/^(make|made|let)$/.test(tokens[k].text)) continue;
      var m = k + 1;
      if (!hasTag(tokens[m], 'Pronoun') || tokens[m].text === 'it') continue;
      if (tokens[m + 1] && tokens[m + 1].text === 'to' && tokens[m + 2] && hasTag(tokens[m + 2], 'Infinitive')) {
        addIssue(issues, { ruleId:'NF-004', category:'nonfinite', confidence:'high', start:tokens[m + 1].start, end:tokens[m + 1].end, errorText:tokens[m + 1].raw, message:'make/let 后接动词原形，不加 to', suggestion:'去掉 to' });
      }
    }
  }

  // COLL-001~003 固定搭配：动词+介词、名词+介词、冗余连接
  function runColl(tokens, text, issues) {
    for (var i = 0; i + 1 < tokens.length; i++) {
      var w1 = tokens[i].text, w2 = tokens[i + 1].text;
      var ge = baseFromEd(w1);
      var cands = [w1]; if (/s$/i.test(w1)) cands.push(w1.slice(0, -1)); if (ge !== w1) cands.push(ge);
      var rep = null, isV = false, matched = false;
      for (var ci = 0; ci < cands.length; ci++) {
        var kk = cands[ci] + ' ' + w2;
        if (Object.prototype.hasOwnProperty.call(V_PREP_RULE, kk)) { isV = true; matched = true; rep = V_PREP_RULE[kk]; break; }
        if (Object.prototype.hasOwnProperty.call(N_PREP_RULE, kk)) { matched = true; rep = N_PREP_RULE[kk]; break; }
      }
      if (!matched) continue;
      if (isV) addIssue(issues, { ruleId:'COLL-001', category:'collocation', confidence:'high', start:tokens[i].start, end:tokens[i + 1].end, errorText:text.slice(tokens[i].start, tokens[i + 1].end), message:'固定搭配：' + tokens[i].raw + ' 不与 ' + tokens[i + 1].raw + ' 连用', suggestion:rep ? tokens[i].raw + ' ' + rep : tokens[i].raw + '（去掉 ' + tokens[i + 1].raw + '）' });
      else addIssue(issues, { ruleId:'COLL-002', category:'collocation', confidence:'mid', start:tokens[i].start, end:tokens[i + 1].end, errorText:text.slice(tokens[i].start, tokens[i + 1].end), message:'固定搭配：' + tokens[i].raw + ' 后常用介词 ' + rep, suggestion:tokens[i].raw + ' ' + rep });
    }
    var mr;
    // COLL-003 冗余：despite of / although…but / because…so
    var reDes = /\bdespite\s+of\b/gi;
    while ((mr = reDes.exec(text)) !== null) addIssue(issues, { ruleId:'COLL-003', category:'collocation', confidence:'high', start:mr.index, end:mr.index + mr[0].length, errorText:mr[0], message:'despite 后不加 of（或改用 in spite of）', suggestion:'despite' });
    var reBut = /\b(?:although|though)\b([^.;!?]*?)\bbut\b/gi;
    while ((mr = reBut.exec(text)) !== null) { var bi = mr.index + mr[0].toLowerCase().lastIndexOf('but'); addIssue(issues, { ruleId:'COLL-003', category:'collocation', confidence:'mid', start:bi, end:bi + 3, errorText:'but', message:'although/though 与 but 不能同时使用，去掉 but', suggestion:'去掉 but' }); }
    var reSo = /\bbecause\b([^.;!?]*?)\bso\b/gi;
    while ((mr = reSo.exec(text)) !== null) { var si = mr.index + mr[0].toLowerCase().lastIndexOf('so'); addIssue(issues, { ruleId:'COLL-003', category:'collocation', confidence:'mid', start:si, end:si + 2, errorText:'so', message:'because 与 so 不能同时使用，去掉 so', suggestion:'去掉 so' }); }
  }

  // CONF-001~005 易混词：its/it's、their/there/they're、then/than、affect/effect、weather/whether
  function runConfuse(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 0; i < n; i++) {
      var t = tokens[i], w = t.text, prev = i > 0 ? tokens[i - 1] : null, nx = nextReal(tokens, i);
      // its → it's（后接冠词/be动词/动名词/程度副词时）
      if (w === 'its' && nx) {
        if (isDeterminer(nx) || hasTag(nx, 'Gerund') || /^(is|are|was|were|has|have|had)$/.test(nx.text) || (/^(very|really|quite|so|too|also|just|still)$/.test(nx.text)))
          addIssue(issues, { ruleId:'CONF-001', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'its 是物主代词，此处应为 it\'s（it is / it has 的缩写）', suggestion:"it's" });
      }
      // it's → its（后接名词，或后接非谓语/非助词的实义动词，如 it's tail）
      if (w === "it's" && nx) {
        var itsNoun = hasTag(nx, 'Noun') && !hasAnyTag(nx, ['Verb', 'Pronoun']);
        var itsVerb = hasTag(nx, 'Verb') && !hasTag(nx, 'Gerund') && !hasTag(nx, 'PastTense') && !/^(is|are|am|was|were|has|have|had|do|does|did|can|could|may|might|must|shall|should|will|would|be)$/.test(nx.text);
        // 介词 + it's + 形容词/分词 + 名词（in it's refined state）→ 属物主结构
        var n3 = null;
        for (var z3 = i + 1; z3 < n; z3++) { if (tokens[z3].text && tokens[z3] !== nx) { n3 = tokens[z3]; break; } }
        var itsPoss = !!(prev && (hasTag(prev, 'Preposition') || PREPS[prev.text]) && hasAnyTag(nx, ['Adjective', 'Adverb', 'PastTense', 'Participle', 'PastPart']) && !hasTag(nx, 'Gerund') && n3 && hasTag(n3, 'Noun'));
        if (itsNoun || itsVerb || itsPoss)
          addIssue(issues, { ruleId:'CONF-001', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'it\'s 是 it is 的缩写，此处表示所属应用 its', suggestion:'its' });
      }
      // their → there / they're
      if (w === 'their' && nx) {
        if (/^(is|are|was|were)$/.test(nx.text)) addIssue(issues, { ruleId:'CONF-002', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'their 是物主代词，there is/are 表存在，此处应为 there', suggestion:'there' });
        else if (hasTag(nx, 'Gerund')) addIssue(issues, { ruleId:'CONF-002', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'此处可能应为 they\'re（they are）', suggestion:"they're" });
      }
      // then → than（前为比较级，允许中间隔一个形容词/副词，如 more positive then）
      if (w === 'then') {
        var cmp = false;
        for (var lt = 1; lt <= 3; lt++) {
          var tlb = tok(tokens, i - lt);
          if (!tlb) break;
          if (COMPARATIVE[tlb.text]) { cmp = true; break; }
          if (hasAnyTag(tlb, ['Adjective', 'Adverb']) && !hasAnyTag(tlb, ['Noun'])) continue; // 只允许隔形容词/副词
          break;
        }
        if (cmp) addIssue(issues, { ruleId:'CONF-003', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'比较级后应用 than 表示比较，不能用 then', suggestion:'than' });
      }
      // than → then（前为 and/but/or，表时间）
      if (w === 'than' && prev && /^(and|but|or)$/.test(prev.text))
        addIssue(issues, { ruleId:'CONF-003', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'此处表时间先后，应用 then 而非 than', suggestion:'then' });
      // affect → effect（前为限定词/物主代词，作名词）
      if (w === 'affect' && prev && (isDeterminer(prev) || hasAnyTag(prev, ['Possessive'])))
        addIssue(issues, { ruleId:'CONF-004', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'affect 是动词，名词“影响/效果”应为 effect', suggestion:'effect' });
      // weather → whether（后接主语+谓语的小句：not sure weather he will come）
      if (w === 'weather') {
        if (tokens[i + 1] && tokens[i + 1].text === 'or' && tokens[i + 2] && tokens[i + 2].text === 'not')
          addIssue(issues, { ruleId:'CONF-005', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'weather 是名词“天气”，表示“是否”应用 whether', suggestion:'whether' });
        else if (nx && /^(i|he|she|it|we|they|you|the|this|these|that|those)$/.test(nx.text) && tokens[i + 2] && (hasAnyTag(tokens[i + 2], ['Verb']) || /^(will|would|can|could|is|are|was|were|has|have|had)$/.test(tokens[i + 2].text)))
          addIssue(issues, { ruleId:'CONF-005', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'weather 是名词“天气”，表示“是否”应用 whether', suggestion:'whether' });
        else if (nx && nx.text === 'to' && tokens[i + 2] && hasTag(tokens[i + 2], 'Infinitive'))
          addIssue(issues, { ruleId:'CONF-005', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'weather 是名词“天气”，表示“是否”应用 whether', suggestion:'whether' });
      }
      // CONF-009 Comparing with → Compared with（句首）
      if (w === 'comparing' && nx && /^(with|to)$/.test(nx.text)) {
        var atS9 = isSentenceStart(text, t.start) || prevIsComma(text, t.start);
        if (atS9) addIssue(issues, { ruleId:'CONF-009', category:'confusable', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'句首表"与…相比"应用过去分词 Compared with/to（Comparing 需自带宾语）', suggestion:'Compared ' + nx.raw });
      }
      // whether → weather（前为限定词，作名词“天气”）
      if (w === 'whether' && prev && isDeterminer(prev))
        addIssue(issues, { ruleId:'CONF-005', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'whether 是连词“是否”，此处指“天气”应用 weather', suggestion:'weather' });
    }
  }

  // CMP 双重比较级/最高级；QUA 数量词误用
  function runComp(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 0; i + 1 < n; i++) {
      var t = tokens[i], w = t.text, nx = tokens[i + 1], n2 = tokens[i + 2];
      if (w === 'more' && COMPARATIVE[nx.text]) addIssue(issues, { ruleId:'CMP-001', category:'comparative', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + nx.raw + '" 已是比较级，前面不能再用 more', suggestion:nx.raw });
      else if (w === 'most' && SUPERLATIVE[nx.text]) addIssue(issues, { ruleId:'CMP-001', category:'comparative', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + nx.raw + '" 已是最高级，前面不能再用 most', suggestion:nx.raw });
      if (w === 'less' && isCountPlural(nx)) addIssue(issues, { ruleId:'QUA-001', category:'quantifier', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'less 修饰不可数名词，可数名词复数应用 fewer', suggestion:'fewer ' + nx.raw });
      if (w === 'much' && isCountPlural(nx)) addIssue(issues, { ruleId:'QUA-002', category:'quantifier', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'much 修饰不可数名词，可数名词复数应用 many', suggestion:'many ' + nx.raw });
      if (w === 'many' && UNCOUNTABLE[nx.text]) addIssue(issues, { ruleId:'QUA-003', category:'quantifier', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'many 修饰可数名词复数，不可数名词应用 much', suggestion:'much ' + nx.raw });
      if (w === 'amount' && nx.text === 'of' && n2 && isCountPlural(n2)) addIssue(issues, { ruleId:'QUA-004', category:'quantifier', confidence:'mid', start:t.start, end:n2.end, errorText:text.slice(t.start, n2.end), message:'amount of 接不可数名词；可数名词复数应用 number of', suggestion:'number of ' + n2.raw });
      if (w === 'number' && nx.text === 'of' && n2 && UNCOUNTABLE[n2.text]) addIssue(issues, { ruleId:'QUA-004', category:'quantifier', confidence:'mid', start:t.start, end:n2.end, errorText:text.slice(t.start, n2.end), message:'number of 接可数名词复数；不可数名词应用 amount of', suggestion:'amount of ' + n2.raw });
    }
  }

  // TNS-001 主将从现；TNS-002 虚拟语气
  function runClause(tokens, text, issues) {
    var mr;
    var reWill = /\b(if|when|until|unless|as soon as)\b([^,.;!?]*?)\bwill\b/gi;
    while ((mr = reWill.exec(text)) !== null) { var wi = mr.index + mr[0].toLowerCase().lastIndexOf('will'); addIssue(issues, { ruleId:'TNS-001', category:'tense', confidence:'mid', start:wi, end:wi + 4, errorText:'will', message:'时间/条件状语从句中不用将来时，应用一般现在时（主将从现）', suggestion:'去掉 will（用一般现在时）' }); }
    var reYou = /\bif\s+i\s+was\s+you\b/gi;
    while ((mr = reYou.exec(text)) !== null) addIssue(issues, { ruleId:'TNS-002', category:'tense', confidence:'high', start:mr.index, end:mr.index + mr[0].length, errorText:mr[0], message:'虚拟语气 "If I were you" 用 were，不用 was', suggestion:'if I were you' });
    var reWish = /\b(wish|as if|if only)\b([^.;!?]*?)\b(he|she|it|i)\s+was\b/gi;
    while ((mr = reWish.exec(text)) !== null) { var wi2 = mr.index + mr[0].toLowerCase().lastIndexOf('was'); addIssue(issues, { ruleId:'TNS-002', category:'tense', confidence:'mid', start:wi2, end:wi2 + 3, errorText:'was', message:'wish / as if 后表虚拟，应用 were 而非 was', suggestion:'were' }); }
  }

  // RED-001 语义重复（冗余）
  function runRed(tokens, text, issues) {
    for (var i = 0; i + 1 < tokens.length; i++) {
      if (!tokens[i].text) continue;
      var w1 = tokens[i].text, w2 = tokens[i + 1].text, ge = baseFromEd(w1);
      var key = Object.prototype.hasOwnProperty.call(REDUNDANT, w1 + ' ' + w2) ? (w1 + ' ' + w2) : (ge !== w1 && Object.prototype.hasOwnProperty.call(REDUNDANT, ge + ' ' + w2) ? ge + ' ' + w2 : null);
      if (!key) continue;
      addIssue(issues, { ruleId:'RED-001', category:'redundancy', confidence: key.indexOf('together') !== -1 ? 'mid' : 'high', start:tokens[i].start, end:tokens[i + 1].end, errorText:text.slice(tokens[i].start, tokens[i + 1].end), message:'语义重复："' + tokens[i].raw + ' ' + tokens[i + 1].raw + '" 表意冗余，保留一词即可', suggestion:REDUNDANT[key] });
    }
  }

  // CLA-001 非限制性定语从句用 that；CLA-002 关系代词作主语时谓语与先行词一致；CLA-003 指人先行词 + which
  var HUMAN_NOUN = {person:1,people:1,student:1,students:1,teacher:1,teachers:1,researcher:1,researchers:1,respondent:1,respondents:1,participant:1,participants:1,author:1,authors:1,worker:1,workers:1,child:1,children:1,man:1,men:1,woman:1,women:1,user:1,users:1,customer:1,customers:1,patient:1,patients:1,farmer:1,farmers:1,volunteer:1,volunteers:1,colleague:1,colleagues:1,employee:1,employees:1,engineer:1,engineers:1,nurse:1,nurses:1,driver:1,drivers:1,reader:1,readers:1,viewer:1,viewers:1};
  function runRel(tokens, text, issues) {
    var n = tokens.length;
    // CLA-001 逗号 + that + 实义动词 → 非限制性从句应用 which/who（逗号非 token，用文本正则定位）
    var reT = /,\s*that\b/gi, mm;
    while ((mm = reT.exec(text)) !== null) {
      var afterPos = mm.index + mm[0].length;
      var zi = firstIdxAtOrAfter(tokens, afterPos); // tokens 按 start 升序，二分查找替代原线性全表扫描
      var vt = zi >= 0 ? tokens[zi] : null;
      if (vt && hasTag(vt, 'Verb') && !/^(is|are|was|were)$/.test(vt.text))
        addIssue(issues, { ruleId:'CLA-001', category:'relative', confidence:'mid', start:mm.index, end:vt.end, errorText:text.slice(mm.index, vt.end), message:'非限制性定语从句用 which/who，不用 that', suggestion:'which / who' });
    }
    for (var i = 0; i < n; i++) {
      // CLA-003 指人先行词 + which → 应用 who/that（须在 CLA-002 分支之前判定，避免被其 continue 跳过）
      if (tokens[i].text === 'which' && i > 0) {
        var ant3 = tokens[i - 1], v3 = tokens[i + 1];
        if (HUMAN_NOUN[ant3.text] && v3 && hasAnyTag(v3, ['Verb']) && !hasAnyTag(v3, ['Noun'])) {
          addIssue(issues, { ruleId:'CLA-003', category:'relative', confidence:'high', start:tokens[i].start, end:tokens[i].end, errorText:tokens[i].raw, message:'先行词 "' + ant3.raw + '" 指人，关系代词应用 who（或 that），不用 which', suggestion:'who' });
        }
      }
      // CLA-002 关系代词作主语（其后直接跟动词）→ 谓语须与先行词一致
      if (/^(who|which|that)$/.test(tokens[i].text) && i > 0) {
        var ant = tokens[i - 1], vx = tokens[i + 1];
        if (!(hasAnyTag(ant, ['Noun', 'Pronoun']) || /^(those|these)$/.test(ant.text)) || !vx || !hasTag(vx, 'Verb')) continue;
        if (MODALS[vx.text]) continue; // 情态动词不随主语变位（that can ...）
        if (hasTag(vx, 'PastTense') || hasTag(vx, 'Gerund')) continue;
        var antPl = isPlural(ant) || /^(those|these|they|we|people)$/.test(ant.text);
        var vSing = /[sx]$/i.test(vx.text) || /^(is|has|does|was)$/.test(vx.text);
        // vx 实为从句主语而非谓语时（that people learn…），不判一致
        if (IRREG_PLURAL[vx.text] || (tokens[i + 2] && hasAnyTag(tokens[i + 2], ['Verb']) && !hasAnyTag(tokens[i + 2], ['Noun']))) continue;
        if (antPl && vSing) addIssue(issues, { ruleId:'CLA-002', category:'relative', confidence:'high', start:vx.start, end:vx.end, errorText:vx.raw, message:'定语从句谓语与先行词 "' + ant.raw + '"（复数）不一致，应用复数谓语', suggestion:pluralStrip(vx) });
        else if (!antPl && !vSing && !/^(are|were|have|do)$/.test(vx.text)) addIssue(issues, { ruleId:'CLA-002', category:'relative', confidence:'high', start:vx.start, end:vx.end, errorText:vx.raw, message:'定语从句谓语与先行词 "' + ant.raw + '"（单数）不一致，应用单数谓语', suggestion:singularize(vx) });
      }
      // 注：原实现在此处又重复了一遍循环开头的 CLA-003 判定（条件完全相同，
      // 会因 addIssue 前的重复匹配而多报一次），属复制残留，已移除；判定以循环开头的版本为准。
    }
  }

  // RUN-001 逗号拼接：两个完整从句仅用逗号连接
  function runRun(tokens, text, issues) {
    var CONJ = /^(and|but|or|so|yet|for|nor|which|who|whom|whose|that|because|although|though|since|while|when|if|unless|until|after|before|as|however|therefore|thus|moreover|nevertheless|furthermore|meanwhile|instead|otherwise|then|also|besides)$/;
    var reC = /,/g, m;
    // 性能：原实现对每个逗号都做 4 次 text.lastIndexOf（各自回扫到句首），长文本下退化为
    // O(逗号数 × 文本长)。改为一次 O(L) 预处理出全部句读符位置，每个逗号 O(log L) 二分查找，
    // 结果与原 Math.max(lastIndexOf…)+1 表达式完全一致。
    var endPos = [];
    for (var ep = 0; ep < text.length; ep++) {
      var ec = text.charAt(ep);
      if (ec === '.' || ec === '!' || ec === '?' || ec === ';' || ec === ':') endPos.push(ep);
    }
    function lastEndBefore(cpos) {
      var lo = 0, hi = endPos.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (endPos[mid] < cpos) lo = mid + 1; else hi = mid; }
      return lo > 0 ? endPos[lo - 1] + 1 : 0;
    }
    while ((m = reC.exec(text)) !== null) {
      var cpos = m.index;
      if (/[0-9]/.test(text.charAt(cpos - 1)) && /[0-9]/.test(text.charAt(cpos + 1))) continue; // 数字千分位逗号（23,391）
      var a = lastEndBefore(cpos);
      var j = firstIdxAfter(tokens, cpos); // 二分查找首个 start > cpos 的 token（原为线性全表扫描）
      if (j < 0) continue;
      var tk = tokens[j];
      if (CONJ.test(tk.text)) continue; // 逗号后是连词/关系词/过渡词 → 正常
      if (/^\s*["“']/.test(text.slice(cpos + 1))) continue; // 逗号后是引语（said, "The …"）→ 正常
      if (/^(which|who|whom|whose|that)$/.test(tk.text)) continue; // 关系从句
      if (!(isDeterminer(tk) || hasAnyTag(tk, ['Pronoun', 'Noun']))) continue; // 逗号后须是新从句主语
      // some of which / most of them 等非限制性补充语，逗号合法
      if (/^(some|most|many|all|none|each|both|either|neither|several|few|one|two|such|other|others)$/.test(tk.text)) { var t2o = tok(tokens, j + 1); if (t2o && t2o.text === 'of') continue; }
      if (!hasClause(tokens, a, cpos)) {
        // 前段为"助动词 + -ed"构成的谓词（has changed / was introduced），且逗号后为代词主语时，仍判为逗号拼接；
        // 后段为名词列表/同位语（fuel treatments… / a standard that…）时不判
        var auxEd = false;
        var aeFrom = firstIdxAtOrAfter(tokens, a); // 只需扫描 [a, cpos) 区间，原实现每个逗号都全表扫描 tokens
        for (var ae = aeFrom; ae >= 0 && ae < j; ae++) {
          var tae = tokens[ae];
          if (tae.start < a || tae.start >= cpos) continue;
          if (!hasTag(tae, 'PastTense') || !/ed$/i.test(tae.text)) continue;
          var pae = ae > 0 ? tokens[ae - 1] : null;
          if (pae && /^(has|have|had|is|are|was|were|be|been)$/i.test(pae.text)) { auxEd = true; break; }
        }
        if (!auxEd || !/^(it|they|he|she|we|i|you|this|these|those)$/.test(tk.text)) continue;
      }
      var jp = firstIdxAtOrAfter(tokens, a); // 同上，二分查找替代线性全表扫描
      if (jp >= 0 && /^(because|although|though|whereas|since|while|when|if|unless|until|as|that|which|who|whom|whose|whoever|whenever|wherever|even)$/.test(tokens[jp].text)) continue; // 前段为从句，逗号合法
      var afterFin = false;
      for (var k = j; k < tokens.length && k < j + 5; k++) { if (plainFinite(tokens[k])) { afterFin = true; break; } }
      if (!afterFin) continue;
      addIssue(issues, { ruleId:'RUN-001', category:'run-on', confidence:'mid', start:cpos, end:cpos + 1, errorText:',', message:'逗号拼接：两个完整句子不能仅用逗号连接，应用句号/分号或加连词', suggestion:'改用句号或分号，或加 and/but' });
    }
  }

  // FRAG-001 残句：以从属连词开头却无主句
  function runFrag(tokens, text, issues) {
    var reS = /[^.!?]+[.!?]+|[^.!?]+$/g, m;
    while ((m = reS.exec(text)) !== null) {
      var sStart = m.index, sEnd = m.index + m[0].length, s = m[0];
      var words = (s.match(/[A-Za-z']+/g) || []).map(function (w) { return w.toLowerCase(); });
      if (words.length < 3) continue;
      var head = words[0];
      var isSub = /^(because|although|though|whereas|since|while|unless|until|when|whenever|wherever|if)$/.test(head) || (head === 'even' && words[1] === 'though');
      if (!isSub) continue;
      if (head === 'because' && words[1] === 'of') continue; // because of 是介词短语
      if (head === 'since' && /\bsince\s+\d/i.test(s)) continue; // since + 年份 = 介词短语，非从句
      if (s.indexOf(',') !== -1) continue; // 有逗号，通常已含主句
      var fin = 0;
      var kFrom = firstIdxAtOrAfter(tokens, sStart), kTo = firstIdxAtOrAfter(tokens, sEnd); // 原实现每句都全表扫描 tokens 统计谓语，改为只扫本句区间
      for (var k = kFrom; k >= 0 && k < kTo; k++) {
        var tk = tokens[k];
        if (tk.start < sStart || tk.start >= sEnd) continue;
        if (hasTag(tk, 'Verb') && (hasTag(tk, 'PresentTense') || hasTag(tk, 'PastTense')) && !hasTag(tk, 'Gerund')) fin++;
      }
      if (fin >= 2) continue; // 已含主句（从句动词 + 主句动词）
      addIssue(issues, { ruleId:'FRAG-001', category:'fragment', confidence:'high', start:sStart, end:sEnd, errorText:s.trim().slice(0, 40), message:'该句以从属连词（' + head + '）开头却缺少主句，属残句，需补出完整主句', suggestion:'补出主句，或与上一句合并' });
    }
  }

  // FRAG-002/PREP-001 悬空介词：句末介词后无宾语，且前为限定词/量词或名词（残缺名词短语）
  var STRAND_QUANT = {some:1,any:1,all:1,both:1,most:1,many:1,few:1,several:1,each:1,every:1,none:1,half:1,another:1,other:1,such:1,more:1,less:1,fewer:1,enough:1,plenty:1};
  function runPrep(tokens, text, issues) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (!(hasTag(t, 'Preposition') || PREPS[t.text])) continue;
      // 介词后必须没有宾语：跳过空白后应直接是句末标点或文本结尾
      var nextCh = nextCharAfter(text, t.end); // 与原 /^(\s*)(.)/ 取 m[2] 等价（含全空白时回溯匹配空格的细节），但不再 slice 后半文本
      if (nextCh && !/[.!?;:]/.test(nextCh)) continue;
      // 疑问句句末介词合法（What are you looking at?），跳过
      if (/^\s*\?/.test(text.slice(t.end))) continue;
      // 仅当介词前是限定词/量词或名词时判为残缺名词短语，避开合法的“介词悬空”（the book I was looking for）
      var prev = i > 0 ? tokens[i - 1] : null;
      if (!prev) continue;
      if (!(isDeterminer(prev) || STRAND_QUANT[prev.text] || hasAnyTag(prev, ['Noun']))) continue;
      addIssue(issues, { ruleId:'PREP-001', category:'preposition', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'介词 "' + t.raw + '" 后缺少宾语，疑似句子被截断或搭配不完整', suggestion:'补出 ' + t.raw + ' 后的宾语（名词/代词/动名词）' });
    }
  }

  // NOUN-003/004、NF-005、PERF-001、CMP-001(词性标签)、CONF-006、COLL-004 补充规则
  var GERUND_VERBS = {enjoy:1,finish:1,avoid:1,mind:1,deny:1,admit:1,risk:1,practise:1,resent:1,quit:1,resist:1,dislike:1,detest:1,postpone:1,keep:1,imagine:1,escape:1,miss:1,mention:1,recall:1,tolerate:1,fancy:1};
  // 简单过去式 ≠ 过去分词 的不规则动词（有同形者不入表，避免误报）
  function runExtra(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 0; i < n; i++) {
      var t = tokens[i], w = t.text, nx = tok(tokens, i + 1);
      // NOUN-003 each/every/either/neither + 复数可数名词
      if (/^(each|every|either|neither)$/.test(w) && nx && hasTag(nx, 'Noun') && (hasTag(nx, 'Plural') || looksPlural(nx.text)) && !UNCOUNTABLE[nx.text] && !PHYS_S.test(nx.text)) {
        addIssue(issues, { ruleId:'NOUN-003', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'each/every/either/neither 后接单数可数名词，不能用复数', suggestion:w + ' ' + nounSingular(nx.text) });
      }
      if (/^(each|every|either|neither)$/.test(w) && nx && EACH_NOUN[nx.text]) {
        addIssue(issues, { ruleId:'NOUN-003', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'each/every 不能直接修饰不可数名词 "' + nx.raw + '"', suggestion:'改用 all / a piece of 等' });
      }
      // NOUN-004 one/all/most… + of + the/my/these + 单数可数名词
      if (/^(one|all|most|some|many|few|several|both|half|none|each|either|neither)$/.test(w) && nx && nx.text === 'of') {
        var d4 = tok(tokens, i + 2), n4 = tok(tokens, i + 3);
        if (d4 && n4 && isDeterminer(d4) && hasTag(n4, 'Noun') && !hasTag(n4, 'Plural') && !looksPlural(n4.text) && !UNCOUNTABLE[n4.text] && !isProperNoun(n4)) {
          addIssue(issues, { ruleId:'NOUN-004', category:'noun', confidence:'high', start:t.start, end:n4.end, errorText:text.slice(t.start, n4.end), message:'"' + w + ' of ..." 后应接复数名词，"' + n4.raw + '" 是单数', suggestion:w + ' of ' + d4.raw + ' ' + pluralize(n4.text) });
        }
      }
      // NF-005 后接动名词的动词误用不定式（enjoy to do 等）
      if (nx && nx.text === 'to' && tokens[i + 2]) {
        var vb5 = baseFromEd(w);
        if ((GERUND_VERBS[w] || GERUND_VERBS[vb5]) && !hasAnyTag(t, ['Noun'])) {
          var inf5 = tokens[i + 2];
          if (hasTag(inf5, 'Infinitive') && !hasAnyTag(inf5, ['Noun', 'Adjective', 'Gerund'])) {
            addIssue(issues, { ruleId:'NF-005', category:'nonfinite', confidence:'high', start:t.start, end:inf5.end, errorText:text.slice(t.start, inf5.end), message:'"' + t.raw + '" 后应接动名词(-ing)，不用不定式', suggestion:t.raw + ' ' + gerund(inf5.text) });
          }
        }
      }
      // PERF-001 完成时(has/have/had) + 简单过去式
      if (/^(has|have|had)$/i.test(w)) {
        var k1 = i + 1;
        if (tokens[k1] && /^(not|never|already|just|also|only|even|ever|still)$/i.test(tokens[k1].text)) k1++;
        var pp = tok(tokens, k1);
        if (pp && PAST_TO_PP[pp.text]) {
          addIssue(issues, { ruleId:'PERF-001', category:'verb', confidence:'high', start:t.start, end:pp.end, errorText:text.slice(t.start, pp.end), message:'完成时(has/have/had)后要用过去分词，不能接简单过去式 "' + pp.raw + '"', suggestion:t.raw + ' ' + PAST_TO_PP[pp.text] });
        }
      }
      // CMP-001 词性标签法：most + 最高级 / more + 比较级
      if (nx && ((w === 'most' && hasTag(nx, 'Superlative')) || (w === 'more' && hasTag(nx, 'Comparative')))) {
        addIssue(issues, { ruleId:'CMP-001', category:'comparative', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + nx.raw + '" 已是' + (w === 'most' ? '最高级' : '比较级') + '，前面不能再用 ' + w, suggestion:nx.raw });
      }
      // CONF-006 advice 误作动词 / loose 误作动词
      if (w === 'advice') {
        var pv6 = prevNonEmpty(tokens, i);
        if (pv6 && /^(i|we|they|he|she|you)$/.test(pv6.text)) addIssue(issues, { ruleId:'CONF-006', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'advice 是名词，动词“建议”应为 advise', suggestion:'advise' });
      }
      if (w === 'loose') {
        var pv7 = prevNonEmpty(tokens, i);
        if ((pv7 && (MODALS[pv7.text] || pv7.text === 'to')) || (nx && /^(it|them|the|his|her|their|its|my|your|our)$/.test(nx.text))) addIssue(issues, { ruleId:'CONF-006', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'loose 是形容词“松的”，动词“丢失”应为 lose', suggestion:'lose' });
      }
      // COLL-004 suggest/recommend sb to do
      var wb4 = baseFromEd(w);
      if ((w === 'suggest' || wb4 === 'suggest' || w === 'recommend' || wb4 === 'recommend') && nx && hasAnyTag(nx, ['Pronoun', 'Noun']) && !hasAnyTag(nx, ['Verb']) && tokens[i + 2] && tokens[i + 2].text === 'to') {
        addIssue(issues, { ruleId:'COLL-004', category:'collocation', confidence:'mid', start:t.start, end:tokens[i + 2].end, errorText:text.slice(t.start, tokens[i + 2].end), message:'suggest 后不接“某人 to do”，应用 suggest doing 或 suggest that sb (should) do', suggestion:'suggest doing / suggest that sb (should) do' });
      }
    }
  }

  // QUA-005/NF-006/DET-001/NEG-001/CONF-007/COLL-005 补充规则二
  function runExtra2(tokens, text, issues) {
    var n = tokens.length;
    // NEG-001 双重否定（含缩写与 "did not" 分开写两种形式）
    var reNeg = /\b(?:don't|doesn't|didn't|won't|can't|couldn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|wouldn't|shouldn't|(?:do|does|did|is|are|was|were|have|has|had|can|could|will|would|should|must|might|shall)\s+not)\b[^.;!?]{0,20}\b(no|nothing|nobody|nowhere|none)\b/gi, mn;
    while ((mn = reNeg.exec(text)) !== null) {
      var pos = mn.index + mn[0].toLowerCase().lastIndexOf(mn[1].toLowerCase());
      addIssue(issues, { ruleId:'NEG-001', category:'negation', confidence:'mid', start:mn.index, end:pos + mn[1].length, errorText:mn[0], message:'双重否定：否定词 + "' + mn[1] + '" 表意重复，应用 any/anything/anybody，或去掉一个否定词', suggestion:'改用 any / anything / anybody' });
    }
    for (var i = 0; i < n; i++) {
      var t = tokens[i], w = t.text, nx = tok(tokens, i + 1); // pv 仅 form 分支用到，改为按需计算，省去每个 token 一次回扫
      // QUA-005 some/most/many/few/several/none/either/neither + the → 缺 of
      if (/^(some|most|many|few|several|none)$/.test(w) && nx && nx.text === 'the') {
        addIssue(issues, { ruleId:'QUA-005', category:'quantifier', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + w + ' the" 之间缺少 of，应用 "' + w + ' of the"', suggestion:w + ' of the' });
      }
      // NF-006 for to do
      if (w === 'for' && nx && nx.text === 'to' && tokens[i + 2] && hasTag(tokens[i + 2], 'Infinitive')) {
        addIssue(issues, { ruleId:'NF-006', category:'nonfinite', confidence:'high', start:t.start, end:tokens[i + 2].end, errorText:text.slice(t.start, tokens[i + 2].end), message:'"for to do" 属错误结构，应用 "to do" 或 "for doing"', suggestion:tokens[i + 2].raw + ' / for ' + gerund(tokens[i + 2].text) });
      }
      // DET-001 so a/an → such a/an
      if (w === 'so' && nx && /^(a|an)$/.test(nx.text)) {
        addIssue(issues, { ruleId:'DET-001', category:'article', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"so a/an ..." 应改用 "such a/an ..."', suggestion:'such ' + nx.raw });
      }
      // CONF-007 易混词/拼写
      if (MODALS[w] && nx && nx.text === 'of') {
        addIssue(issues, { ruleId:'CONF-007', category:'confusable', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'情态动词后应为 have，"' + w + ' of" 是常见拼写错误', suggestion:w + ' have' });
      }
      if (w === 'alot') {
        addIssue(issues, { ruleId:'CONF-007', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'"alot" 应分开写作 "a lot"', suggestion:'a lot' });
      }
      if (w === 'your' && nx && (hasTag(nx, 'Gerund') || (hasAnyTag(nx, ['Verb']) && !hasAnyTag(nx, ['Noun'])))) {
        addIssue(issues, { ruleId:'CONF-007', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'your 是物主代词，此处应为 you\'re（you are）', suggestion:"you're" });
      }
      if (w === 'principle' && nx && hasAnyTag(nx, ['Noun'])) {
        addIssue(issues, { ruleId:'CONF-007', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'principle 是名词“原则”，形容词“主要的”应为 principal', suggestion:'principal' });
      }
      if (w === 'beside' && /^\s*,/.test(text.slice(t.end))) {
        addIssue(issues, { ruleId:'CONF-007', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'beside 是介词“在…旁边”，表“此外”应为 besides', suggestion:'besides' });
      }
      if (w === 'form') {
        var pv = prevNonEmpty(tokens, i);
        if (pv && /^(different|difference|away|apart|far|distinct)$/.test(pv.text) && !(nx && nx.text === 'of')) {
          addIssue(issues, { ruleId:'CONF-007', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'"different form" 应为 different from', suggestion:'from' });
        }
      }
      // COLL-005 prefer ... than（rather than 除外）
      if (w === 'prefer' || baseFromEd(w) === 'prefer') {
        for (var q5 = i + 1; q5 < Math.min(i + 7, n); q5++) {
          if (/^[,.;!?]$/.test(tokens[q5].text)) break;
          if (tokens[q5].text !== 'than') continue;
          if (tokens[q5 - 1] && tokens[q5 - 1].text === 'rather') break;
          addIssue(issues, { ruleId:'COLL-005', category:'collocation', confidence:'mid', start:t.start, end:tokens[q5].end, errorText:text.slice(t.start, tokens[q5].end), message:'prefer 表示“更喜欢”时用 prefer A to B 或 rather than，不用 than', suggestion:'prefer A to B' });
          break;
        }
      }
      // CONF-008 弱信号易混词（高精度上下文限定）
      if (w === 'through' && isSentenceStart(text, t.start) && nx && (hasAnyTag(nx, ['Pronoun']) || (hasAnyTag(nx, ['Noun']) && !isDeterminer(nx))) && tokens[i + 2] && hasAnyTag(tokens[i + 2], ['Verb'])) {
        addIssue(issues, { ruleId:'CONF-008', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'句首表“虽然”应用 though，而非 through', suggestion:'Though' });
      }
      if (w === 'accept' && nx && nx.text === 'for') {
        addIssue(issues, { ruleId:'CONF-008', category:'confusable', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'accept 是动词“接受”，表“除…之外”应为 except', suggestion:'except for' });
      }
      if (w === 'quiet' && nx && /^(a|an)$/.test(nx.text)) {
        addIssue(issues, { ruleId:'CONF-008', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'quiet 是形容词“安静的”，副词“相当”应为 quite', suggestion:'quite' });
      }
      if (w === 'lose' && pv && /^(is|are|was|were|be|been|am)$/i.test(pv.text)) {
        addIssue(issues, { ruleId:'CONF-008', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'lose 是动词“丢失”，形容词“松的”应为 loose', suggestion:'loose' });
      }
      if (w === 'too' && nx && hasTag(nx, 'Infinitive') && !hasAnyTag(nx, ['Noun', 'Adjective'])) {
        addIssue(issues, { ruleId:'CONF-008', category:'confusable', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'too 是副词“太”，此处不定式符号应为 to', suggestion:'to ' + nx.raw });
      }
      if (w === 'to' && nx && hasAnyTag(nx, ['Adjective']) && tokens[i + 2] && tokens[i + 2].text === 'to') {
        addIssue(issues, { ruleId:'CONF-008', category:'confusable', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"to + 形容词 + to" 的第一个 to 应为 too（太…以致不能）', suggestion:'too ' + nx.raw });
      }
    }
  }

  // FRAG-002 句子缺谓语；FRAG-003 句末为连接词/关系词（残句）
  var CONNECT_END = {and:1,or:1,but:1,so:1,because:1,although:1,though:1,that:1,which:1,who:1,whom:1,whose:1,if:1,than:1,as:1};
  function runFrag2(tokens, text, issues) {
    var n = tokens.length, i = 0;
    while (i < n) {
      var sid = tokens[i].sentence, group = [];
      while (i < n && tokens[i].sentence === sid) { group.push(tokens[i]); i++; }
      var words = group.filter(function (t) { return t.text; });
      if (words.length < 3) continue;
      // 含中文字符的句子：分词/标注不可靠（中英混排会把英文词并进中文 token），不判残句
      var segStart = words[0].start, segEnd = words[words.length - 1].end;
      if (/[\u4e00-\u9fff\uff00-\uffef]/.test(text.slice(segStart, segEnd))) continue;
      var hasPred = false;
      for (var k = 0; k < words.length; k++) {
        var tk = words[k];
        if (MODALS[tk.text] || /^(am|is|are|was|were|be|been|being|have|has|had)$/.test(tk.text)) { hasPred = true; break; }
        if (hasAnyTag(tk, ['Verb']) && hasAnyTag(tk, ['PastTense', 'PresentTense', 'Infinitive', 'Modal'])) { hasPred = true; break; }
        if (/(ed|s)$/i.test(tk.text) && tk.text.length > 2) { hasPred = true; break; } // rose/degrees/species 常被误标名词，避免误判残句
      }
      if (!hasPred) {
        var f = words[0], lw = words[words.length - 1];
        addIssue(issues, { ruleId:'FRAG-002', category:'fragment', confidence:'mid', start:f.start, end:lw.end, errorText:text.slice(f.start, lw.end).slice(0, 40), message:'该句缺少谓语动词，可能为残句', suggestion:'补出谓语动词' });
      }
      var lastW = words[words.length - 1];
      if (CONNECT_END[lastW.text]) {
        addIssue(issues, { ruleId:'FRAG-003', category:'fragment', confidence:'mid', start:lastW.start, end:lastW.end, errorText:lastW.raw, message:'句末为连接词/关系词 "' + lastW.raw + '"，句子结构不完整', suggestion:'补全从句，或删除该词' });
      }
    }
  }

  // 动词专项：PASS-001 被动/be+过去式；STATIVE-001 状态动词进行时；COP-001 系动词+副词；
  // AUX-001~003 助动词；CAUS-001~003 使役动词
  var MODAL_SET = {can:1,could:1,may:1,might:1,must:1,shall:1,should:1,will:1,would:1};
  var AUX_SET = {do:1,does:1,did:1,have:1,has:1,had:1,be:1,am:1,is:1,are:1,was:1,were:1,been:1,being:1};
  var STATIVE = {know:1,believe:1,understand:1,want:1,like:1,need:1,prefer:1,own:1,belong:1,hate:1,love:1,remember:1,mean:1,realize:1,recognise:1,recognize:1,doubt:1,suppose:1,contain:1,consist:1,depend:1};
  var LINK_VERB = {seem:1,seems:1,seemed:1,taste:1,tastes:1,tasted:1,smell:1,smells:1,smelt:1,sound:1,sounds:1,sounded:1,become:1,becomes:1,became:1,appear:1,appears:1,appeared:1,remain:1,remains:1,remained:1,stay:1,stays:1,stayed:1,grow:1,grows:1,grew:1,turn:1,turns:1,turned:1};
  var CAUSE_VERB = {make:1,makes:1,made:1,let:1,lets:1,have:1,has:1,had:1};
  var OBJ_PRON = {me:1,him:1,her:1,them:1,us:1,you:1,it:1};
  // 不及物动词各形式（用于 PASS-002：不能用于被动）
  var INTRANS = {happen:1,happens:1,happened:1,occur:1,occurs:1,occurred:1,arise:1,arises:1,arose:1,arisen:1,die:1,dies:1,died:1,appear:1,appears:1,appeared:1,arrive:1,arrives:1,arrived:1,exist:1,exists:1,existed:1,belong:1,belongs:1,belonged:1,emerge:1,emerges:1,emerged:1,vanish:1,vanishes:1,vanished:1,collapse:1,collapses:1,collapsed:1,consist:1,consists:1,consisted:1,seem:1,seems:1,seemed:1,fall:1,falls:1,fell:1,rise:1,rises:1,rose:1,come:1,comes:1,came:1,tumble:1,tumbles:1,tumbled:1,depart:1,departs:1,departed:1};
  // 动词原形 → 过去分词（用于 PASS-003；只收原形与过去分词不同的词）
  function ingBase(w) {
    if (!/ing$/i.test(w)) return '';
    var s = w.slice(0, -3), c = [s, s + 'e'];
    if (s.length > 2 && s[s.length - 1] === s[s.length - 2]) c.push(s.slice(0, -1));
    if (typeof GERUND_E !== 'undefined' && GERUND_E[s]) return GERUND_E[s];
    for (var k = 0; k < c.length; k++) { if (STATIVE[c[k]]) return c[k]; }
    return s;
  }
  function runVerb2(tokens, text, issues) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], w = t.text, nx = tok(tokens, i + 1);
      // PASS-001 be / get + 简单过去式 → 应为过去分词
      if (/^(am|is|are|was|were|be|been|being|get|gets|got)$/i.test(w) && nx && PAST_TO_PP[nx.text]) {
        addIssue(issues, { ruleId:'PASS-001', category:'verb', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'被动语态要用过去分词，不能接简单过去式 "' + nx.raw + '"', suggestion:w + ' ' + PAST_TO_PP[nx.text] });
      }
      // PASS-002 不及物动词误用被动（was happened / is consisted of …）
      if (/^(am|is|are|was|were|be|been|being)$/i.test(w) && nx && INTRANS[nx.text]) {
        addIssue(issues, { ruleId:'PASS-002', category:'verb', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + nx.raw + '" 是不及物动词，不能用于被动语态，应用主动语态', suggestion:nx.raw + '（去掉 be 动词）' });
      }
      // PASS-003 be + 动词原形误用（compromise 常把 show/use 等标为名词，VERB-001 会漏）
      if (/^(am|is|are|was|were|be|been|being)$/i.test(w) && nx && PP_FROM_BASE[nx.text] && !hasTag(nx, 'Infinitive')) {
        addIssue(issues, { ruleId:'PASS-003', category:'verb', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'被动语态应用过去分词，动词原形 "' + nx.raw + '" 后面不能直接跟 be', suggestion:w + ' ' + PP_FROM_BASE[nx.text] });
      }
      // STATIVE-001 be + 状态动词 -ing
      if (/^(am|is|are|was|were)$/i.test(w) && nx && /ing$/i.test(nx.text)) {
        var b1 = ingBase(nx.text);
        if (STATIVE[b1]) {
          addIssue(issues, { ruleId:'STATIVE-001', category:'verb', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + b1 + '" 是状态动词，一般不用进行时，应改用一般现在时', suggestion:'改用一般现在时' });
        }
      }
      // COP-001 系动词 + 副词 → 应用形容词（后接分词/形容词时副词修饰的是后者，属正常用法）
      if (LINK_VERB[w] && nx && hasTag(nx, 'Adverb') && /ly$/i.test(nx.text)) {
        var nn1 = tok(tokens, i + 2);
        if (!(nn1 && hasAnyTag(nn1, ['Adjective', 'PastTense', 'Gerund']) && !hasAnyTag(nn1, ['Noun']))) {
          addIssue(issues, { ruleId:'COP-001', category:'copula', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'系动词 "' + t.raw + '" 后应接形容词作表语，不用副词 "' + nx.raw + '"', suggestion:t.raw + ' + 形容词' });
        }
      }
      // AUX-001 have/has 主谓一致
      if (w === 'have' || w === 'has') {
        var pi = prevIdx(tokens, i), subj = pi >= 0 ? tokens[pi] : null, pj = pi >= 0 ? prevIdx(tokens, pi) : -1, before = pj >= 0 ? tokens[pj] : null;
        var guarded = before && (MODAL_SET[before.text] || AUX_SET[before.text]);
        if (!guarded && subj && /^(he|she|it)$/.test(subj.text) && w === 'have') {
          addIssue(issues, { ruleId:'AUX-001', category:'auxiliary', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'主语 "' + subj.raw + '" 是第三人称单数，应用 has', suggestion:'has' });
        }
        if (!guarded && subj && /^(i|you|we|they)$/.test(subj.text) && w === 'has') {
          addIssue(issues, { ruleId:'AUX-001', category:'auxiliary', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'主语 "' + subj.raw + '" 应用 have', suggestion:'have' });
        }
      }
      // AUX-002 do/does/did (+ not) 后接非原形
      if (/^(do|does|did)$/.test(w)) {
        var k2 = i + 1;
        if (tokens[k2] && tokens[k2].text === 'not') k2++;
        var t2 = tok(tokens, k2);
        if (t2 && t2.text !== w && !hasAnyTag(t2, ['Noun']) && (PAST_TO_PP[t2.text] || (hasTag(t2, 'PresentTense') && /[^s]s$/i.test(t2.text)))) {
          addIssue(issues, { ruleId:'AUX-002', category:'auxiliary', confidence:'high', start:t.start, end:t2.end, errorText:text.slice(t.start, t2.end), message:'助动词 do/does/did 后必须接动词原形，不能用过去式或第三人称单数', suggestion:w + ' + 动词原形' });
        }
      }
      // AUX-003 情态动词连用
      if (MODAL_SET[w] && nx && MODAL_SET[nx.text]) {
        addIssue(issues, { ruleId:'AUX-003', category:'auxiliary', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'情态动词不能连用，"' + w + ' ' + nx.raw + '" 应只保留一个', suggestion:'只保留一个情态动词' });
      }
      // CAUS-001~003 使役动词 + 宾语代词
      if (CAUSE_VERB[w] && nx && OBJ_PRON[nx.text]) {
        var after = tok(tokens, i + 2);
        if (after && after.text === 'to' && tokens[i + 3] && hasTag(tokens[i + 3], 'Infinitive') && !hasAnyTag(tokens[i + 3], ['Noun', 'Adjective'])) {
          addIssue(issues, { ruleId:'CAUS-001', category:'causative', confidence:'high', start:t.start, end:tokens[i + 3].end, errorText:text.slice(t.start, tokens[i + 3].end), message:'使役动词 ' + t.raw + ' + 宾语后接动词原形，不加 to', suggestion:t.raw + ' ' + nx.raw + ' ' + tokens[i + 3].raw });
        } else if (after) {
          if (PAST_TO_PP[after.text] || (hasTag(after, 'PresentTense') && /[^s]s$/i.test(after.text) && !hasAnyTag(after, ['Noun']))) {
            addIssue(issues, { ruleId:'CAUS-002', category:'causative', confidence:'high', start:t.start, end:after.end, errorText:text.slice(t.start, after.end), message:'使役动词 ' + t.raw + ' + 宾语后接动词原形', suggestion:t.raw + ' ' + nx.raw + ' + 动词原形' });
          } else if (hasTag(after, 'Gerund') && /^(make|makes|made|let|lets)$/.test(w)) {
            addIssue(issues, { ruleId:'CAUS-002', category:'causative', confidence:'high', start:t.start, end:after.end, errorText:text.slice(t.start, after.end), message:'make/let + 宾语后接动词原形，不用 -ing', suggestion:t.raw + ' ' + nx.raw + ' + 动词原形' });
          }
        }
      }
      // CAUS-003 get + 宾语 + 原形 → 应加 to
      if (/^(get|gets|got)$/.test(w) && nx && OBJ_PRON[nx.text]) {
        var after3 = tok(tokens, i + 2);
        if (after3 && after3.text !== 'to' && hasTag(after3, 'Infinitive') && !hasAnyTag(after3, ['Noun', 'Adjective'])) {
          addIssue(issues, { ruleId:'CAUS-003', category:'causative', confidence:'high', start:t.start, end:after3.end, errorText:text.slice(t.start, after3.end), message:'get + 宾语应接带 to 的不定式（get sb to do）', suggestion:t.raw + ' ' + nx.raw + ' to ' + after3.raw });
        }
      }
    }
  }

  // PUNC-001~006 英文标点：全角标点、标点后/前空格、句末缺空格、重复标点、括号空格
  var CJK_PUNC = /[，。、；：？！（）《》「」『』【】]/g;
  var ABBR_SET = {eg:1,ie:1,etc:1,vs:1,no:1,fig:1,ref:1,al:1,us:1,uk:1,st:1,dr:1,mr:1,mrs:1,ms:1,prof:1,vol:1,pp:1,ed:1,eds:1,ca:1,cf:1,approx:1,incl:1,min:1,max:1,jan:1,feb:1,mar:1,apr:1,jun:1,jul:1,aug:1,sep:1,sept:1,oct:1,nov:1,dec:1,ltd:1,inc:1,univ:1};
  function runPunc(tokens, text, issues) {
    var m;
    // PUNC-001 全角中文标点
    CJK_PUNC.lastIndex = 0;
    while ((m = CJK_PUNC.exec(text)) !== null) {
      // 注：原实现有一行 if (m.index === CJK_PUNC.lastIndex) CJK_PUNC.lastIndex++;
      // 对单字符匹配永为假（exec 后 lastIndex 恒为 index+1），属死代码，已移除
      addIssue(issues, { ruleId:'PUNC-001', category:'punctuation', confidence:'mid', start:m.index, end:m.index + 1, errorText:m[0], message:'英文写作应使用半角标点，"' + m[0] + '" 是全角中文标点', suggestion:'改用半角标点' });
    }
    // PUNC-002 逗号/分号/冒号后缺空格
    var re2 = /([,;:])(?=[A-Za-z0-9])/g;
    while ((m = re2.exec(text)) !== null) {
      var p2 = m.index;
      if (/\d/.test(text.charAt(p2 - 1)) && /\d/.test(text.charAt(p2 + 1))) continue; // 1,000 千分位
      addIssue(issues, { ruleId:'PUNC-002', category:'punctuation', confidence:'high', start:p2, end:p2 + 1, errorText:m[1], message:'"' + m[1] + '" 后应有一个空格', suggestion:m[1] + ' ' });
    }
    // PUNC-003 标点前多余空格
    var re3 = /([ \t]+)([,.;:!?])/g;
    while ((m = re3.exec(text)) !== null) {
      addIssue(issues, { ruleId:'PUNC-003', category:'punctuation', confidence:'high', start:m.index, end:m.index + m[0].length, errorText:m[0], message:'标点 "' + m[2] + '" 前不应有空格', suggestion:m[2] });
    }
    // PUNC-004 句号后缺空格（排除小数、缩写、首字母缩写）
    var re4 = /\.(?=[A-Z])/g;
    while ((m = re4.exec(text)) !== null) {
      var p4 = m.index;
      if (/\d/.test(text.charAt(p4 - 1))) continue;
      var w4 = trailingWordBefore(text, p4); // 原写法每处「句点+大写」都 slice 整个前缀再正则匹配，改为向左扫描
      var lw = w4.replace(/\./g, '').toLowerCase();
      if (ABBR_SET[lw] || lw.length < 2) continue;
      addIssue(issues, { ruleId:'PUNC-004', category:'punctuation', confidence:'mid', start:p4, end:p4 + 1, errorText:'.', message:'句号后应有一个空格再开始下一句', suggestion:'. ' });
    }
    // PUNC-005 重复标点
    var re5 = /([,;:])\1+|([!?])\2+|(?<!\.)\.\.(?!\.)/g;
    while ((m = re5.exec(text)) !== null) {
      addIssue(issues, { ruleId:'PUNC-005', category:'punctuation', confidence:'mid', start:m.index, end:m.index + m[0].length, errorText:m[0], message:'标点重复："' + m[0] + '"', suggestion:'保留一个标点' });
    }
    // PUNC-006 括号两侧空格
    var re6 = /([A-Za-z])\(|\(\s/g;
    while ((m = re6.exec(text)) !== null) {
      addIssue(issues, { ruleId:'PUNC-006', category:'punctuation', confidence:'mid', start:m.index, end:m.index + m[0].length, errorText:m[0], message:m[0].indexOf('(') === 0 ? '左括号后不应有空格' : '英文左括号前应有一个空格', suggestion:'( 与内容之间加空格' });
    }
    // PUNC-007 两句黏连：小写词后直接跟大写句首词，且中间只有空白（缺句号）
    var SENT_STARTER = {a:1,an:1,the:1,this:1,these:1,those:1,it:1,we:1,they:1,i:1,he:1,she:1,our:1,its:1,his:1,their:1,there:1,such:1,many:1,most:1,some:1,both:1,each:1,one:1,two:1,also:1,however:1,moreover:1,therefore:1,thus:1,although:1,though:1,while:1,because:1,after:1,before:1,when:1,if:1,as:1,in:1,on:1,at:1,for:1,by:1,from:1,first:1,second:1,finally:1,overall:1,additionally:1,despite:1,more:1,other:1,another:1,data:1,result:1,results:1,recently:1,currently:1,unlike:1,compared:1};
    for (var p7 = 1; p7 + 1 < tokens.length; p7++) {
      var wa = tokens[p7], wb = tokens[p7 + 1];
      if (!wa.text || !wb.text) continue; // 不要求同句：缺句号时 compromise 常自行切成两句
      if (!/^[A-Za-z0-9][A-Za-z0-9.'’°-]*$/.test(wa.raw)) continue; // 前词须为普通词或数字（含 1.5°C 这类）
      if (isProperNoun(wa)) continue;                        // 专名（国名/月份等）不判
      if (!/^[A-Z][a-z]+$/.test(wb.raw)) continue;          // 后词须为「首字母大写 + 其余小写」
      if (!SENT_STARTER[wb.text]) continue;
      if (!/^\s+$/.test(text.slice(wa.end, wb.start))) continue; // 中间只能有空白，排除冒号/引号/缩写点
      // 大写词后须紧接限定词/名词/代词/形容词或谓语（即确实在起新句）
      var t7 = tokens[p7 + 2], ok7 = false;
      if (t7 && t7.text) {
        ok7 = hasAnyTag(t7, ['Noun', 'Pronoun', 'Determiner', 'Adjective', 'Number', 'Value', 'Cardinal', 'PresentTense', 'PastTense', 'Modal', 'Infinitive', 'Superlative', 'Comparative']) || /^(is|are|was|were|has|have|had|will|would|can|could|should|may|might|must|do|does|did|be)$/i.test(t7.text);
        if (ok7 && isProperNoun(t7)) ok7 = false; // 标题式专名（the film The Matrix）不判
      }
      if (!ok7) continue;
      addIssue(issues, { ruleId:'PUNC-007', category:'punctuation', confidence:'mid', start:wa.start, end:wb.end, errorText:text.slice(wa.start, wb.end), message:'"' + wa.raw + '" 与 "' + wb.raw + '" 之间缺少句号，两句被黏连成一句', suggestion:'在 "' + wa.raw + '" 后补句号' });
    }
  }

  // EMP-001~005 强调句（It is/was … that/who）与句首否定/only 的部分倒装
  var NEG_ADV = {never:1,seldom:1,rarely:1,hardly:1,scarcely:1,little:1,nowhere:1};
  var ONLY_ADV = {then:1,when:1,later:1,once:1,afterwards:1,recently:1};
  var PAST_TIME = {yesterday:1,last:1,ago:1,formerly:1};
  var CONNECT_SET = /^(that|who|which|where|when|why|how|whom)$/;
  function runEmp(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 0; i < n; i++) {
      var w = tokens[i].text, nx = tok(tokens, i + 1);
      // 强调句结构：It is/was …
      if (w === 'it' && nx && /^(is|was)$/i.test(nx.text)) {
        var sid0 = tokens[i].sentence;
        var k = i + 2, person = false, prep = false, whichTok = null;
        for (var j = k; j < Math.min(k + 5, n); j++) {
          var tj = tokens[j];
          if (tj.sentence !== sid0) break;
          if (tj.text === 'which') { whichTok = tj; break; }
          if (CONNECT_SET.test(tj.text)) break;
          if (hasAnyTag(tj, ['ProperNoun']) || /^(i|you|he|she|we|they)$/.test(tj.text)) person = true;
          if (hasAnyTag(tj, ['Preposition']) || PREPS[tj.text]) prep = true;
        }
        // EMP-001 指人应用 who/that；状语焦点应用 that
        if (whichTok && person) addIssue(issues, { ruleId:'EMP-001', category:'emphatic', confidence:'high', start:whichTok.start, end:whichTok.end, errorText:whichTok.raw, message:'强调句中先行词指人时应用 who/that，不用 which', suggestion:'who / that' });
        else if (whichTok && prep) addIssue(issues, { ruleId:'EMP-001', category:'emphatic', confidence:'mid', start:whichTok.start, end:whichTok.end, errorText:whichTok.raw, message:'强调句中被强调部分是时间/地点等状语时应用 that，不用 which', suggestion:'that' });
        // EMP-002 缺少连接词 that/who（只在同一句内扫描；遇不定式补语即停）
        var seenNP = false, conn = false, vTok = null;
        for (var j2 = k; j2 < Math.min(k + 7, n); j2++) {
          var t2 = tokens[j2];
          if (t2.sentence !== sid0) break;
          if (t2.text === 'to' || hasTag(t2, 'Infinitive')) break;
          if (CONNECT_SET.test(t2.text)) { conn = true; break; }
          if (isDeterminer(t2) || hasAnyTag(t2, ['Noun', 'ProperNoun', 'Number', 'Adjective', 'Preposition']) || PREPS[t2.text]) { seenNP = true; continue; }
          if (MODALS[t2.text] || /^(am|is|are|was|were|have|has|had|do|does|did)$/.test(t2.text)) { vTok = t2; break; }
          if (hasAnyTag(t2, ['Verb']) && !hasTag(t2, 'Gerund')) { vTok = t2; break; }
        }
        if (!conn && seenNP && vTok) addIssue(issues, { ruleId:'EMP-002', category:'emphatic', confidence:'mid', start:tokens[i].start, end:vTok.end, errorText:text.slice(tokens[i].start, vTok.end).slice(0, 40), message:'强调句 It is/was … that/who … 缺少连接词', suggestion:'在从句谓语前补 that / who' });
        // EMP-003 仅在 It is + 过去时间副词时提示（It was 与 not until 均不判）
        if (/^is$/i.test(nx.text)) {
          var q3 = i + 2;
          if (tokens[q3] && tokens[q3].text === 'not') q3++;
          var t3 = tok(tokens, q3);
          if (t3 && PAST_TIME[t3.text]) {
            addIssue(issues, { ruleId:'EMP-003', category:'emphatic', confidence:'mid', start:tokens[i].start, end:nx.end, errorText:nx.raw, message:'强调过去的时间/事件应用 It was … that …，不用 It is', suggestion:'was' });
          }
        }
      }
      // EMP-004 句首否定副词 / only + 状语 → 主句部分倒装
      var atStart = isSentenceStart(text, tokens[i].start);
      if (atStart && (NEG_ADV[w] || w === 'only')) {
        var s = i + 1;
        if (w === 'only') {
          if (!(tokens[s] && hasAnyTag(tokens[s], ['Adverb']) && ONLY_ADV[tokens[s].text])) continue;
          s++;
        }
        var subj = tokens[s];
        if (subj && (hasAnyTag(subj, ['Pronoun']) || hasAnyTag(subj, ['Noun'])) && !hasAnyTag(subj, ['Verb'])) {
          var vv = tok(tokens, s + 1);
          if (vv && (MODALS[vv.text] || AUX_SET[vv.text] || hasAnyTag(vv, ['Verb']))) {
            addIssue(issues, { ruleId:'EMP-004', category:'inversion', confidence:'high', start:tokens[i].start, end:subj.end, errorText:text.slice(tokens[i].start, subj.end), message:'否定词/only 置于句首时主句要部分倒装（助动词提到主语前）', suggestion:w + ' + 助动词 + 主语' });
          }
        }
      }
      // EMP-005 the reason (… 从句 …) is because
      if (w === 'because') {
        var pv1 = prevIdx(tokens, i);
        if (pv1 >= 0 && /^(is|was)$/i.test(tokens[pv1].text)) {
          for (var rb = pv1 - 1; rb >= Math.max(0, pv1 - 8); rb--) {
            var tb = tokens[rb];
            if (tb.sentence !== tokens[i].sentence) break;
            if (tb.text === 'that' || tb.text === 'which') break;
            if (tb.text === 'reason') {
              addIssue(issues, { ruleId:'EMP-005', category:'emphatic', confidence:'high', start:tb.start, end:tokens[i].end, errorText:text.slice(tb.start, tokens[i].end), message:'"the reason … is because" 冗余，应用 "the reason … is that"', suggestion:'that' });
              break;
            }
          }
        }
      }
    }
  }

  // SVA-009~012 主谓一致补充：of 短语中心词、定语从句隔开、以 -s 结尾的国名
  var QUANT_SING_HEAD = {amount:1,list:1,series:1,kind:1,type:1,sort:1,sum:1};
  var QUANT_PLURAL_HEAD = {lot:1,lots:1,variety:1,couple:1,handful:1,majority:1,minority:1,rest:1,plenty:1};
  function svaVerbKind(tk) {
    if (!tk) return '';
    if (/^(is|was|has|does)$/i.test(tk.text)) return 'sing';
    if (/^(are|were|have|do)$/i.test(tk.text)) return 'plural';
    if (!hasAnyTag(tk, ['Verb']) || hasAnyTag(tk, ['Gerund', 'Infinitive'])) return '';
    if (hasTag(tk, 'PastTense') || /ed$/i.test(tk.text)) return ''; // 过去式无 -s 一致问题
    return /[^s]s$/i.test(tk.text) ? 'sing' : 'plural';
  }
  function headPlural(t) { return (isPlural(t) || hasTag(t, 'Plural') || looksPlural(t.text) || IRREG_PLURAL[t.text]) ? true : false; }
  function verbKindText(v) {
    v = v.toLowerCase();
    if (/^(is|was|has|does)$/.test(v)) return 'sing';
    if (/^(are|were|have|do)$/.test(v)) return 'plural';
    if (/ed$/.test(v)) return '';
    return /[^s]s$/.test(v) ? 'sing' : 'plural';
  }
  function headPluralText(h) {
    h = h.toLowerCase();
    if (IRREG_PLURAL[h]) return true;
    if (PHYS_S.test(h)) return false;
    if (/(ss|us|is|ics)$/.test(h)) return false;
    return /[^s]s$/.test(h);
  }
  function runSva2(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 1; i < n; i++) {
      if (tokens[i].text !== 'of') continue;
      var h = null, hIdx = -1;
      for (var a = i - 1; a >= Math.max(0, i - 4); a--) {
        var ta = tokens[a];
        if (hasAnyTag(ta, ['Noun', 'ProperNoun'])) { h = ta; hIdx = a; break; }
        if (isDeterminer(ta) || hasAnyTag(ta, ['Adjective', 'Adverb'])) continue;
        break;
      }
      if (!h) continue;
      var j = i + 1, obj = null;
      for (; j < Math.min(i + 5, n); j++) {
        var tj = tokens[j];
        if (tj.sentence !== h.sentence) break;
        if (isDeterminer(tj) || hasAnyTag(tj, ['Adjective'])) continue;
        if (hasAnyTag(tj, ['Noun', 'ProperNoun'])) obj = tj;
        break;
      }
      if (!obj) continue;
      var v = null;
      for (var k = j + 1; k < Math.min(j + 3, n); k++) {
        var tk = tokens[k];
        if (tk.sentence !== h.sentence) break;
        if (MODALS[tk.text]) break;
        v = tk; break;
      }
      if (!v) continue;
      var hw = h.text;
      // 限定词须跳过形容词/副词再取（a large number of / a small amount of）
      var det = '';
      for (var a9 = hIdx - 1; a9 >= Math.max(0, hIdx - 3); a9--) {
        if (hasAnyTag(tokens[a9], ['Adjective', 'Adverb'])) continue;
        det = tokens[a9].text; break;
      }
      var preHead = null;
      for (var a3 = hIdx - 1; a3 >= Math.max(0, hIdx - 3); a3--) {
        if (hasAnyTag(tokens[a3], ['Adjective', 'Adverb'])) continue;
        preHead = tokens[a3]; break;
      }
      var expPlural;
      if (hw === 'number') expPlural = /^(a|an)$/i.test(det) ? true : false;
      else if (QUANT_SING_HEAD[hw] || PHYS_S.test(hw)) expPlural = false;
      else if (QUANT_PLURAL_HEAD[hw]) { if (/^(a|an)$/i.test(det)) expPlural = true; else continue; }
      else {
        // 中心词必须由限定词/物主代词直接限定；"with higher level of education were" 这类 PP 内的 of 短语不判
        if (!(preHead && (isDeterminer(preHead) || hasAnyTag(preHead, ['Possessive'])))) continue;
        expPlural = headPlural(h);
      }
      if (UNCOUNTABLE[obj.text]) expPlural = false;
      var kind = svaVerbKind(v);
      if (!kind || (kind === 'plural') === expPlural) continue;
      addIssue(issues, { ruleId:'SVA-009', category:'sva', confidence:'mid', start:v.start, end:v.end, errorText:v.raw, message:'主语中心词是 "' + h.raw + '"（' + (expPlural ? '复数' : '单数') + '），谓语应与之保持一致', suggestion:expPlural ? '改用复数谓语' : '改用单数谓语' });
    }
    // SVA-011 定语从句隔开的主谓一致（逗号不是 token，故基于文本匹配）
    var re11 = /([A-Za-z]+)\s*,\s*(?:which|who|whose)\b[^,.;!?]{0,60},\s*([A-Za-z]+)/g, m11;
    while ((m11 = re11.exec(text)) !== null) {
      var headW = m11[1], verbW = m11[2], kind3 = verbKindText(verbW);
      if (!kind3) continue;
      var plu3 = headPluralText(headW);
      if ((kind3 === 'plural') === plu3) continue;
      var vPos = m11.index + m11[0].lastIndexOf(verbW);
      // 该位置必须是主句谓语：其后应直接接宾语（限定词/代词/专有名词）或结束，排除并列列表（drive, roll, and swim）
      var rest = text.slice(vPos + verbW.length);
      var mm2 = rest.match(/^\s*([A-Za-z]+)/);
      if (mm2 && /ly$/.test(mm2[1])) mm2 = rest.slice(mm2[0].length).match(/^\s*([A-Za-z]+)/);
      var nxt = mm2 ? mm2[1] : '';
      var okNext = /^(a|an|the|this|that|these|those|its|their|his|her|our|your|my|no|not|more|less|fewer|such|another|each|every|both|all|some|many|most|it|them|him|us|me|you)$/i.test(nxt) || /^[A-Z]/.test(nxt);
      if (!okNext && !/^\s*[.;!?]/.test(rest)) continue;
      addIssue(issues, { ruleId:'SVA-011', category:'sva', confidence:'mid', start:vPos, end:vPos + verbW.length, errorText:verbW, message:'主语 "' + headW + '" 被定语从句隔开，谓语应保持' + (plu3 ? '复数' : '单数') + '一致', suggestion:plu3 ? '改用复数谓语' : '改用单数谓语' });
    }
    // SVA-013 each/one/either/neither + of + 复数名词 → 谓语用单数
    for (var q = 0; q + 4 < n; q++) {
      if (!/^(each|one|either|neither)$/.test(tokens[q].text)) continue;
      if (tokens[q + 1].text !== 'of') continue;
      var vq = tok(tokens, q + 4);
      if (!vq || svaVerbKind(vq) !== 'plural') continue;
      addIssue(issues, { ruleId:'SVA-013', category:'sva', confidence:'high', start:vq.start, end:vq.end, errorText:vq.raw, message:'"' + tokens[q].text + ' of …" 的中心词为单数，谓语应用单数形式', suggestion:'改用单数谓语' });
    }
    // SVA-012 以 -s 结尾的国名/机构名视为单数
    for (var i3 = 0; i3 + 2 < n; i3++) {
      if (!/^united$/i.test(tokens[i3].text)) continue;
      if (!/^(states|nations|kingdom)$/i.test(tokens[i3 + 1].text)) continue;
      var v3 = tok(tokens, i3 + 2);
      if (v3 && /^(are|were)$/.test(v3.text)) addIssue(issues, { ruleId:'SVA-012', category:'sva', confidence:'high', start:tokens[i3].start, end:v3.end, errorText:text.slice(tokens[i3].start, v3.end), message:'the United States/Nations 视为单数，谓语应用 is/was', suggestion:'is' });
    }
  }

  // DET-002/003 限定词搭配；INTJ-001 口语叹词
  function runDet(tokens, text, issues) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], w = t.text, wl = w.toLowerCase(), nx = tok(tokens, i + 1);
      if (!nx) continue;
      // DET-002 两个限定词连用（the my / my the / a my …）
      if (CENTRAL_DET[wl] && POSS_DET[nx.text]) {
        addIssue(issues, { ruleId:'DET-002', category:'determiner', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'限定词不能连用："' + w + ' ' + nx.raw + '"，只保留一个', suggestion:'删掉 "' + w + '" 或 "' + nx.raw + '"' });
      } else if (POSS_DET[wl] && CENTRAL_DET[nx.text]) {
        addIssue(issues, { ruleId:'DET-002', category:'determiner', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'限定词不能连用："' + w + ' ' + nx.raw + '"，只保留一个', suggestion:'删掉 "' + w + '" 或 "' + nx.raw + '"' });
      }
      // DET-003 another + 复数/不可数
      if (wl === 'another' && (hasTag(nx, 'Plural') || looksPlural(nx.text) || IRREG_PLURAL[nx.text])) {
        addIssue(issues, { ruleId:'DET-003', category:'determiner', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'another 后应接单数可数名词，不能接复数 "' + nx.raw + '"', suggestion:'another ' + nounSingular(nx.text) });
      } else if (wl === 'another' && EACH_NOUN[nx.text]) {
        addIssue(issues, { ruleId:'DET-003', category:'determiner', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'another 不能直接修饰不可数名词 "' + nx.raw + '"', suggestion:'another piece of ' + nx.raw + ' / more ' + nx.raw });
      }
      // INTJ-001 学术写作中的口语叹词
      var atStart = isSentenceStart(text, t.start);
      if (atStart && INTERJECTION[wl]) {
        addIssue(issues, { ruleId:'INTJ-001', category:'interjection', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'学术写作中不宜使用口语叹词 "' + t.raw + '"，应删除', suggestion:'删除该叹词' });
      }
    }
  }

  // CONJ-002/003 连词；ADV-001~003 副词
  var CONJ_ADV = {however:1,therefore:1,moreover:1,furthermore:1,nevertheless:1,nonetheless:1,consequently:1,additionally:1,meanwhile:1,otherwise:1,instead:1,similarly:1,conversely:1,accordingly:1};
  var ADJ_ADV = {good:1,quick:1,slow:1,careful:1,quiet:1,sudden:1,serious:1,real:1,exact:1,clear:1,correct:1,different:1,easy:1,loud:1,soft:1,beautiful:1,polite:1,rude:1,honest:1,brave:1,foolish:1,safe:1,dangerous:1,cheerful:1,happy:1,firm:1,strong:1,weak:1,tight:1,loose:1};
  // 副词形式不是简单加 -ly 的形容词
  var ADJ_ADV_FIX = {good:'well'};
  function runConjAdv(tokens, text, issues) {
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], w = t.text, wl = w.toLowerCase(), nx = tok(tokens, i + 1);
      var atStart = isSentenceStart(text, t.start);
      // 句首 But/And/So 属可接受写法（参考范文亦有），不判定
      // CONJ-002 like → such as（列举）
      if (wl === 'like' && nx && nx.text !== 'to' && hasAnyTag(nx, ['Noun']) && !hasAnyTag(nx, ['Verb'])) {
        var pv2 = prevNonEmpty(tokens, i);
        if (pv2 && (hasAnyTag(pv2, ['Noun', 'Adjective']) || pv2.text === ',')) {
          addIssue(issues, { ruleId:'CONJ-002', category:'conjunction', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'正式写作中列举应用 "such as"，不用 "like"', suggestion:'such as' });
        }
      }
      // CONJ-003 because + 名词短语 → because of
      if (wl === 'because' && nx && isDeterminer(nx)) {
        var n3 = tok(tokens, i + 2);
        if (n3 && hasAnyTag(n3, ['Noun'])) {
          var after3 = tok(tokens, i + 3);
          var isClause = after3 && (hasAnyTag(after3, ['Verb']) || MODALS[after3.text] || /^(that|which|who|whom|whose)$/.test(after3.text) || /^(is|are|was|were|be|been|being|am|has|have|had|do|does|did)$/i.test(after3.text));
          if (!isClause) addIssue(issues, { ruleId:'CONJ-003', category:'conjunction', confidence:'mid', start:t.start, end:n3.end, errorText:text.slice(t.start, n3.end), message:'because 后接名词短语时应加 of（because of）', suggestion:'because of' });
        }
      }
      // ADV-001 动词 + 形容词（应用副词）
      if ((ADJ_ADV[wl] || ADJ_ADV_FIX[wl]) && !(nx && hasAnyTag(nx, ['Noun']) && !hasAnyTag(nx, ['Pronoun']))) {
        var pv3 = prevNonEmpty(tokens, i), pvl = pv3 ? pv3.text.toLowerCase() : '';
        var isLink = pv3 && (LINK_VERB[pvl] || /^(is|are|was|were|be|been|being|am|get|gets|got|look|looks|looked|feel|feels|felt|make|makes|made)$/.test(pvl));
        if (pv3 && !isLink && hasAnyTag(pv3, ['Verb']) && !hasTag(pv3, 'Copula')) {
          addIssue(issues, { ruleId:'ADV-001', category:'adverb', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'修饰动词应用副词，不用形容词 "' + t.raw + '"', suggestion:ADJ_ADV_FIX[wl] || (t.raw + 'ly') });
        }
      }
      // ADV-002 very 直接修饰动词
      if (wl === 'very' && nx && hasAnyTag(nx, ['Verb']) && !hasAnyTag(nx, ['Adjective', 'Adverb'])) {
        addIssue(issues, { ruleId:'ADV-002', category:'adverb', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'very 不能直接修饰动词，应用 "very much" 或 "really"', suggestion:'…… very much / really ' + nx.raw });
      }
      // ADV-003 句首连接副词后缺逗号
      if (atStart && CONJ_ADV[wl] && nx) {
        var rest = text.slice(t.end);
        var concessive = /^(much|many|long|far|often|hard|well|deep)$/.test(nx.text);
        if (!/^\s*,/.test(rest) && !concessive && !(wl === 'instead' && nx.text === 'of')) {
          addIssue(issues, { ruleId:'ADV-003', category:'adverb', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'句首连接副词 "' + t.raw + '" 后通常应加逗号', suggestion:t.raw + ',' });
        }
      }
    }
  }

  // PRON-001/002 代词；ADJ-001~003 形容词
  var PERSON_NOUN = {student:1,students:1,researcher:1,researchers:1,respondent:1,respondents:1,participant:1,participants:1,people:1,person:1,persons:1,author:1,authors:1,worker:1,workers:1,child:1,children:1,teacher:1,teachers:1,consumer:1,consumers:1,scholar:1,scholars:1,scientist:1,scientists:1,reviewer:1,reviewers:1,reader:1,readers:1,farmer:1,farmers:1,dweller:1,dwellers:1,citizen:1,citizens:1,employee:1,employees:1,visitor:1,visitors:1,user:1,users:1,manager:1,managers:1,nurse:1,nurses:1,doctor:1,doctors:1};
  var ED_ADJ = {interested:1,excited:1,surprised:1,confused:1,disappointed:1,worried:1,satisfied:1,bored:1,tired:1,frightened:1,amazed:1,shocked:1,motivated:1,encouraged:1,inspired:1,embarrassed:1};
  var ING_ADJ = {interesting:1,exciting:1,surprising:1,confusing:1,disappointing:1,worrying:1,satisfying:1,boring:1,tiring:1,frightening:1,amazing:1,shocking:1,motivating:1,encouraging:1,inspiring:1,embarrassing:1};
  function runPronAdj(tokens, text, issues) {
    // PRON-001 句首宾格代词作主语
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], w = t.text, wl = w.toLowerCase(), nx = tok(tokens, i + 1);
      var atStart = isSentenceStart(text, t.start);
      if (atStart && /^(me|him|her|us|them)$/.test(wl) && nx && (nx.text === 'and' || hasAnyTag(nx, ['Verb']) || MODALS[nx.text])) {
        addIssue(issues, { ruleId:'PRON-001', category:'pronoun', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'句首作主语应用主格代词（I/he/she/we/they），不能用宾格 "' + wl + '"', suggestion:'改用 I / he / she / we / they' });
      }
      // ADJ-001 be + -ed 分词形容词，但主语为非人事物 → 应用 -ing 形式
      if (/^(am|is|are|was|were)$/i.test(w) && nx && ED_ADJ[nx.text]) {
        var subj2 = null;
        for (var b2 = i - 1; b2 >= Math.max(0, i - 3); b2--) {
          var tb = tokens[b2];
          if (isDeterminer(tb) || hasAnyTag(tb, ['Adjective', 'Adverb', 'Possessive'])) continue;
          subj2 = tb; break;
        }
        var sl = subj2 ? subj2.text.toLowerCase() : '';
        if (subj2 && !hasAnyTag(subj2, ['Pronoun']) && !PERSON_NOUN[sl]) {
          addIssue(issues, { ruleId:'ADJ-001', category:'adjective', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'主语是非人事物，表语应用 -ing 形式（"' + nx.raw + '" → ' + nx.text.replace(/ed$/i, 'ing') + '）', suggestion:w + ' ' + nx.text.replace(/ed$/i, 'ing') });
        }
      }
      // ADJ-002 enough + 形容词（语序错误）
      if (wl === 'enough' && nx && hasAnyTag(nx, ['Adjective'])) {
        addIssue(issues, { ruleId:'ADJ-002', category:'adjective', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'enough 应放在形容词之后（形容词 + enough）', suggestion:nx.raw + ' enough' });
      }
      // ADJ-003 very + 比较级
      if (wl === 'very' && nx && (hasTag(nx, 'Comparative') || COMPARATIVE[nx.text]) && nx.text !== 'other') {
        addIssue(issues, { ruleId:'ADJ-003', category:'adjective', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'very 不能修饰比较级，应用 much / far / a lot + 比较级', suggestion:'much ' + nx.raw });
      }
      // ADJ-004 人物主语 + be + -ing 形容词 + 介词 → 应用 -ed 形式
      if (/^(am|is|are|was|were)$/i.test(w) && nx && ING_ADJ[nx.text]) {
        var n3a = tok(tokens, i + 2);
        if (n3a && /^(in|about|with|by|at)$/.test(n3a.text)) {
          var subj3 = null;
          for (var b3 = i - 1; b3 >= Math.max(0, i - 3); b3--) {
            var tb3 = tokens[b3];
            if (isDeterminer(tb3) || hasAnyTag(tb3, ['Adjective', 'Adverb', 'Possessive'])) continue;
            subj3 = tb3; break;
          }
          var sl3 = subj3 ? subj3.text.toLowerCase() : '';
          if (subj3 && (hasAnyTag(subj3, ['Pronoun']) || PERSON_NOUN[sl3])) {
            addIssue(issues, { ruleId:'ADJ-004', category:'adjective', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'人物作主语时表语应用 -ed 形式（"' + nx.raw + '" → ' + nx.text.replace(/ing$/i, 'ed') + '）', suggestion:w + ' ' + nx.text.replace(/ing$/i, 'ed') });
          }
        }
      }
      // PRON-003 介词后误用主格代词
      var pv4 = prevNonEmpty(tokens, i);
      if (pv4 && /^(to|for|with|from|of|at|about|into|through|without|against|among|between)$/.test(pv4.text) && /^(i|he|she|we|they)$/.test(wl)) {
        var isClauseStart = nx && (hasAnyTag(nx, ['Verb']) || MODALS[nx.text] || /^(am|is|are|was|were)$/i.test(nx.text));
        if (!isClauseStart) {
          addIssue(issues, { ruleId:'PRON-003', category:'pronoun', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'介词后应用宾格代词，不能用主格 "' + wl + '"', suggestion:{i:'me',he:'him',she:'her',we:'us',they:'them'}[wl] });
        }
      }
    }
    // PRON-002 between you and I → me
    var reP2 = /\b[Bb]etween\s+[A-Za-z]+\s+and\s+I\b/g, mP2;
    while ((mP2 = reP2.exec(text)) !== null) {
      addIssue(issues, { ruleId:'PRON-002', category:'pronoun', confidence:'high', start:mP2.index, end:mP2.index + mP2[0].length, errorText:mP2[0], message:'介词 between 后应用宾格代词，不能用主格 I', suggestion:'between … and me' });
    }
  }

  // ---------------- 介词（PREP）+ 名词（NOUN）补充规则 ----------------
  var WEEKDAYS = {monday:1,tuesday:1,wednesday:1,thursday:1,friday:1,saturday:1,sunday:1};
  var DAY_PARTS = {morning:1,afternoon:1,evening:1};
  var SEASONS = {summer:1,winter:1,spring:1,autumn:1,fall:1};
  var DURATION_UNITS = {year:1,years:1,month:1,months:1,week:1,weeks:1,day:1,days:1,hour:1,hours:1,decade:1,decades:1,century:1,centuries:1};
  // 形容词/副词 + 误用介词（正确形式在值中）：词表已迁移至 dictionaries/prepositions.js，
  // 原此处又本地重复定义了一份同名 var（会覆盖文件头部的 D.ADJ_PREP_ERR 别名，
  // 虽然当前内容一致，但属迁移残留），已移除，统一以词典为唯一来源
  // 兼作可数用的物质名词，many/few 不判错
  var MASS_SKIP = {fish:1,chicken:1,meat:1,beef:1,pork:1,rain:1,snow:1};
  // 不规则复数但仍属可数名词，much/less 判定时不放行
  var COUNT_IRREG = {people:1,children:1,men:1,women:1,feet:1,teeth:1,mice:1,geese:1,criteria:1,phenomena:1};
  // 形似复数（-s 结尾）实为单数的词，this + 复数 不判错
  var S_PLURAL_SKIP = {means:1,gas:1,plus:1,chaos:1};
  // 严格意义的可数复数名词（用于判断 much/less/amount of 的误用）
  function pluralNounish(t) {
    if (UNCOUNTABLE[t.text] || PLURAL_OK[t.text] || PHYS_S.test(t.text) || S_PLURAL_SKIP[t.text]) return false;
    if (IRREG_PLURAL[t.text]) return !!COUNT_IRREG[t.text];
    return !hasTag(t, 'Singular') && looksPlural(t.text);
  }
  function strictPluralTok(t) { return hasAnyTag(t, ['Noun']) && pluralNounish(t); }
  // 动词补语起始词：若形似复数的词后接这些词，说明它是第三人称单数动词而非名词
  var VB_COMPLEMENT_START = /^(to|not|a|an|the|it|them|him|her|us|me|you|this|that|these|those|will|would|can|could|may|might|must|should|shall|be|been|being|is|are|was|were|do|does|did|has|have|had)$/;
  // be/助动词 + 形似复数的词（compromise 常把复数名词标成动词，如 less reports）：
  // 前置为 be/助动词且后接非动词补语时，按复数名词处理
  function beatPlural(t, pv, nx2) {
    return !!pv && /^(are|is|were|was|have|has|had|do|does|did|there)$/.test(pv.text) && pluralNounish(t) && !VB_COMPLEMENT_START.test(nx2 ? nx2.text : '');
  }
  // 严格意义的单数可数名词（用于判断 these/those 的误用；按词形而非词性标签判断）
  function singularCountTok(t) {
    if (UNCOUNTABLE[t.text] || PLURAL_OK[t.text] || IRREG_PLURAL[t.text]) return false;
    if (isProperNoun(t) || NOUN_VERB_HOMO[t.text]) return false;
    if (NUM_WORDS[t.text] !== undefined || /^\d+$/.test(t.text)) return false; // these two / those three
    if (!hasTag(t, 'Noun')) return false;
    return !looksPlural(t.text);
  }
  function runPrepNoun(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 0; i < n; i++) {
      var t = tokens[i], w = t.text, nx = tok(tokens, i + 1), n2 = tok(tokens, i + 2), n3 = tok(tokens, i + 3);
      var pv9 = prevNonEmpty(tokens, i);
      // PREP-002 时间/季节/年份介词误用
      if (w === 'on' && nx && nx.text === 'the' && n2 && DAY_PARTS[n2.text] && !(n3 && n3.text === 'of')) {
        addIssue(issues, { ruleId:'PREP-002', category:'preposition', confidence:'high', start:t.start, end:n2.end, errorText:text.slice(t.start, n2.end), message:'泛指"在早上/下午/晚上"用 in，不用 on（"on the morning of + 具体日期"除外）', suggestion:'in the ' + n2.raw });
      }
      if (w === 'at' && nx && nx.text === 'the' && n2 && DAY_PARTS[n2.text]) {
        addIssue(issues, { ruleId:'PREP-002', category:'preposition', confidence:'high', start:t.start, end:n2.end, errorText:text.slice(t.start, n2.end), message:'"at the ' + n2.text + '" 应用 in the ' + n2.text + '（at 用于具体时刻）', suggestion:'in the ' + n2.raw });
      }
      if (w === 'in' && nx && (WEEKDAYS[nx.text] || nx.text === 'weekend' || (nx.text === 'the' && n2 && n2.text === 'weekend'))) {
        var dEnd = nx.text === 'the' ? n2 : nx;
        addIssue(issues, { ruleId:'PREP-002', category:'preposition', confidence:'high', start:t.start, end:dEnd.end, errorText:text.slice(t.start, dEnd.end), message:'星期与周末用 on（英式也可用 at the weekend），不能用 in', suggestion:'on ' + dEnd.raw.replace(/^the\s+/i, 'the ') });
      }
      if ((w === 'on' || w === 'at') && nx && SEASONS[nx.text]) {
        addIssue(issues, { ruleId:'PREP-002', category:'preposition', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'季节前用 in（"in summer"），不用 ' + w, suggestion:'in ' + nx.raw });
      }
      if ((w === 'on' || w === 'at') && nx && /^(1[6-9]|20)\d{2}$/.test(nx.text)) {
        addIssue(issues, { ruleId:'PREP-002', category:'preposition', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'年份前用 in（"in 2019"），不用 ' + w, suggestion:'in ' + nx.raw });
      }
      // PREP-003 despite of → despite
      if (w === 'despite' && nx && nx.text === 'of') {
        addIssue(issues, { ruleId:'PREP-003', category:'preposition', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'despite 本身即介词，后面不加 of（"despite of" 是错误形式）', suggestion:'despite' });
      }
      // PREP-004 according 后缺 to
      if (w === 'according' && nx && nx.text !== 'to') {
        addIssue(issues, { ruleId:'PREP-004', category:'preposition', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'"according" 不能单独作介词，应用 according to', suggestion:'according to' });
      }
      // PREP-005 since + 时间段 → for
      if (w === 'since') {
        var d5 = null, d5i = -1;
        for (var q5 = i + 1; q5 <= i + 3 && q5 < n; q5++) {
          var t5 = tokens[q5];
          if (DURATION_UNITS[t5.text]) { d5 = t5; d5i = q5; break; }
          if (/^\d+$/.test(t5.text) || NUM_WORDS[t5.text] !== undefined || /^(a|an|the|several|many|few|couple|of|about|over|almost|nearly)$/.test(t5.text)) continue;
          break;
        }
        var a5 = d5i >= 0 ? tok(tokens, d5i + 1) : null;
        if (d5 && !(a5 && a5.text === 'ago')) {
          addIssue(issues, { ruleId:'PREP-005', category:'preposition', confidence:'high', start:t.start, end:d5.end, errorText:text.slice(t.start, d5.end), message:'since 后接时间点，表示一段时间应用 for', suggestion:'for ' + d5.raw });
        }
      }
      // PREP-006 固定短语误用介词
      if (w === 'in' && nx && nx.text === 'the' && n2 && n2.text === 'other' && n3 && n3.text === 'hand') {
        addIssue(issues, { ruleId:'PREP-006', category:'preposition', confidence:'high', start:t.start, end:n3.end, errorText:text.slice(t.start, n3.end), message:'固定短语应为 "on the other hand"', suggestion:'on the other hand' });
      }
      if (w === 'in' && nx && nx.text === 'the' && n2 && n2.text === 'internet') {
        addIssue(issues, { ruleId:'PREP-006', category:'preposition', confidence:'high', start:t.start, end:n2.end, errorText:text.slice(t.start, n2.end), message:'网络空间用介词 on："on the Internet"', suggestion:'on the ' + n2.raw });
      }
      // PREP-007 形容词/副词 + 误用介词
      if (nx && ADJ_PREP_ERR[w + ' ' + nx.text]) {
        addIssue(issues, { ruleId:'PREP-007', category:'preposition', confidence:'mid', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + t.raw + '" 不与 ' + nx.raw + ' 搭配，应用 ' + ADJ_PREP_ERR[w + ' ' + nx.text], suggestion:t.raw + ' ' + ADJ_PREP_ERR[w + ' ' + nx.text] });
      }
      // NOUN-005 数量词与名词可数性不一致
      if (/^(many|few)$/.test(w) && nx && UNCOUNTABLE[nx.text] && !PLURAL_OK[nx.text] && !hasTag(nx, 'Plural') && !looksPlural(nx.text) && !IRREG_PLURAL[nx.text] && !MASS_SKIP[nx.text]) {
        var fix5 = w === 'many' ? 'much' : 'little';
        addIssue(issues, { ruleId:'NOUN-005', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + nx.raw + '" 是不可数名词，不能用 ' + w + ' 修饰', suggestion:fix5 + ' ' + nx.raw });
      }
      if (w === 'much' && nx && (strictPluralTok(nx) || beatPlural(nx, pv9, n2))) {
        addIssue(issues, { ruleId:'NOUN-005', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'可数复数名词用 many 修饰，不能用 much', suggestion:'many ' + nx.raw });
      }
      if (w === 'less' && nx && (strictPluralTok(nx) || beatPlural(nx, pv9, n2))) {
        addIssue(issues, { ruleId:'NOUN-005', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'可数名词用 fewer 表示"更少"，less 用于不可数名词', suggestion:'fewer ' + nx.raw });
      }
      if (/^amounts?$/.test(w) && nx && nx.text === 'of' && n2 && strictPluralTok(n2)) {
        addIssue(issues, { ruleId:'NOUN-005', category:'noun', confidence:'mid', start:t.start, end:n2.end, errorText:text.slice(t.start, n2.end), message:'可数名词用 a number of，a large amount of 用于不可数名词', suggestion:'number of ' + n2.raw });
      }
      if (w === 'number' && nx && nx.text === 'of' && n2 && UNCOUNTABLE[n2.text] && !PLURAL_OK[n2.text] && !looksPlural(n2.text)) {
        addIssue(issues, { ruleId:'NOUN-005', category:'noun', confidence:'mid', start:t.start, end:n2.end, errorText:text.slice(t.start, n2.end), message:'不可数名词用 an amount of，a number of 用于可数复数名词', suggestion:'amount of ' + n2.raw });
      }
      // COLL-006 pay attention on → to
      if (w === 'on' && pv9 && pv9.text === 'attention') {
        var ai9 = -1;
        for (var az9 = i - 1; az9 >= 0; az9--) { if (tokens[az9].text) { ai9 = az9; break; } }
        var av9 = ai9 > 0 ? tokens[ai9 - 1] : null;
        if (av9 && /^(pay|pays|paid|paying)$/.test(av9.text)) {
          addIssue(issues, { ruleId:'COLL-006', category:'collocation', confidence:'high', start:av9.start, end:nx.end, errorText:text.slice(av9.start, nx.end), message:'固定搭配：pay attention 后应用介词 to', suggestion:'pay attention to' });
        }
      }
      // COLL-007 be worth to do → worth doing
      if (w === 'worth' && nx && nx.text === 'to') {
        addIssue(issues, { ruleId:'COLL-007', category:'collocation', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'worth 后接动词应用动名词(-ing)，不用不定式', suggestion:'worth doing / worth being done' });
      }
      // THERE-001 there be + 名词短语 + 谓语动词（缺 that/who/which）
      if (w === 'there' && nx && /^(is|are|was|were)$/i.test(nx.text)) {
        var sawNp9 = false, vHit9 = null;
        for (var k9 = i + 2; k9 < Math.min(i + 10, n); k9++) {
          var t9 = tokens[k9];
          if (!t9.text) continue;
          if (t9.sentence !== tokens[i].sentence) break;
          if (/^(that|which|who|whom|whose|when|where|and|or|but|because|although)$/.test(t9.text)) break; // 已有连接词 → 正常
          if (isDeterminer(t9) || hasAnyTag(t9, ['Adjective', 'Adverb', 'Number', 'Value', 'Cardinal', 'Comparative', 'Superlative', 'Possessive'])) continue;
          if (hasAnyTag(t9, ['Pronoun'])) { if (!sawNp9) sawNp9 = true; break; } // 代词作主语后须跟谓语，另由其他规则处理
          if (hasAnyTag(t9, ['Noun']) && !hasAnyTag(t9, ['Verb'])) { sawNp9 = true; continue; }
          if (sawNp9 && hasAnyTag(t9, ['PresentTense', 'PastTense', 'Verb']) && !hasTag(t9, 'Gerund') && !MODALS[t9.text]) vHit9 = t9;
          break;
        }
        if (vHit9) addIssue(issues, { ruleId:'THERE-001', category:'fragment', confidence:'high', start:t.start, end:vHit9.end, errorText:text.slice(t.start, vHit9.end).slice(0, 48), message:'"there be + 名词 + 谓语"缺少连接词，应用 "there be + 名词 + who/that + 谓语"，或改用 "Many people think …"', suggestion:'补 who/that，或改为 "' + (nx.text === 'is' || nx.text === 'was' ? 'Someone' : 'Many people') + ' …"' });
      }
      // NOUN-006 指示词与名词单复数不一致
      if (/^(these|those)$/.test(w) && nx && singularCountTok(nx) && !(n2 && hasAnyTag(n2, ['Noun']) && !hasAnyTag(n2, ['Verb', 'Auxiliary', 'Copula']))) {
        addIssue(issues, { ruleId:'NOUN-006', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'"' + w + '" 后接单数名词不通，应改用 ' + (w === 'these' ? 'this' : 'that'), suggestion:(w === 'these' ? 'this ' : 'that ') + nx.raw });
      }
      if (w === 'this' && nx && pluralNounish(nx) && (hasAnyTag(nx, ['Noun']) || hasTag(nx, 'PresentTense')) && n2 && /^(are|were|have|do|had|can|could|will|would|should|may|might|must)$/.test(n2.text)) {
        addIssue(issues, { ruleId:'NOUN-006', category:'noun', confidence:'high', start:t.start, end:nx.end, errorText:text.slice(t.start, nx.end), message:'复数名词前应用 these，不能用 this', suggestion:'these ' + nx.raw });
      }
    }
  }

  // ---- 规则注册（顺序与既有流水线完全一致）----
  register(runSva); register(runVerb); register(runModal); register(runNoun); register(runNum);
  register(runNonfin); register(runColl); register(runConfuse); register(runComp); register(runClause);
  register(runRed); register(runRel); register(runRun); register(runFrag); register(runPrep);
  register(runExtra); register(runExtra2); register(runFrag2); register(runVerb2); register(runPunc);
  register(runEmp); register(runSva2); register(runDet); register(runConjAdv); register(runPronAdj);
  register(runPrepNoun);

  // 对外 API：app.js 仍调用 window.GrammarRules.runAll
  global.GrammarRules = { runAll: GC.pipeline.runAll, tokenize: GC.tok.tokenize };

})(typeof window !== 'undefined' ? window : null);