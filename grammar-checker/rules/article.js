/* rules/article.js — 冠词规则矩阵 ART-001 ~ ART-007 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var D = GC.dict, T = GC.tok;
  var addIssue = GC.pipeline.addIssue;
  var register = GC.pipeline.register;

  function vowelSound(w) { if (D.SOUND_AN[w]) return true; if (D.SOUND_A[w]) return false; return /^[aeiou]/i.test(w); }

  function runArt(tokens, text, issues) {
    var n = tokens.length;
    // ART-001 a/an 发音
    for (var i = 0; i < n; i++) {
      var art = tokens[i].text;
      if (art !== 'a' && art !== 'an') continue;
      var nx = T.tok(tokens, i + 1);
      if (!nx || !/[A-Za-z]/.test(nx.text)) continue;
      var needAn = vowelSound(nx.text);
      if (art === 'a' && needAn) addIssue(issues, { ruleId:'ART-001', category:'article', confidence:'high', start:tokens[i].start, end:nx.end, errorText:text.slice(tokens[i].start, nx.end), message:'a/an 由后面单词发音首音决定：元音音素开头用 an', suggestion:'an ' + nx.raw });
      else if (art === 'an' && !needAn && !/^[a-z]/i.test(nx.text)) continue;
      else if (art === 'an' && !needAn) addIssue(issues, { ruleId:'ART-001', category:'article', confidence:'high', start:tokens[i].start, end:nx.end, errorText:text.slice(tokens[i].start, nx.end), message:'a/an 由后面单词发音首音决定：辅音音素开头用 a', suggestion:'a ' + nx.raw });
    }
    // ART-003 a/an + 不可数/复数
    for (var j = 0; j < n; j++) {
      if (tokens[j].text !== 'a' && tokens[j].text !== 'an') continue;
      var na = T.tok(tokens, j + 1);
      if (!na || !/[A-Za-z]/.test(na.text)) continue;
      var n2 = T.tok(tokens, j + 2);
      if (na.text === 'of' || (D.MEASURE_WORDS[na.text] && n2 && n2.text === 'of')) continue;
      if (n2 && T.hasAnyTag(n2, ['Noun', 'Adjective']) && !T.hasAnyTag(n2, ['Verb'])) continue; // 名词/形容词作定语：an information design experiment、a focus group
      if (D.UNCOUNTABLE[na.text]) addIssue(issues, { ruleId:'ART-003', category:'article', confidence:'high', start:tokens[j].start, end:na.end, errorText:text.slice(tokens[j].start,na.end), message:'a/an 只能修饰单数可数名词，"' + na.raw + '" 是不可数名词', suggestion:na.raw });
      else if ((T.isPlural(na) || (T.isNoun(na) && T.looksPlural(na.text))) && !T.hasTag(na, 'Singular')) addIssue(issues, { ruleId:'ART-003', category:'article', confidence:'high', start:tokens[j].start, end:na.end, errorText:text.slice(tokens[j].start,na.end), message:'a/an 只能修饰单数可数名词，复数名词不能直接加 a/an', suggestion:na.raw });
    }
    // ART-002 单数可数名词缺限定词（仅限"有限实义动词 + 裸单数名词"的高置信宾语位置）
    for (var k = 1; k < n; k++) {
      var t = tokens[k];
      if (!T.isNoun(t) || T.isProperNoun(t)) continue;
      if (T.hasAnyTag(t, ['Pronoun', 'Possessive']) || D.POSSESSIVE[t.text]) continue; // their/its/my 等
      if (T.isPlural(t) || T.hasTag(t, 'Uncountable')) continue;
      if (T.isDeterminer(t) || D.UNCOUNTABLE[t.text] || D.NOUN_SKIP[t.text] || D.ABSTRACT_NOUN[t.text]) continue;
      var prev = T.tok(tokens, k - 1);
      if (!prev) continue;
      if (prev.sentence !== t.sentence) continue; // 跨句的词不作谓语（多篇拼接时曾误报句首名词）
      if (T.isDeterminer(prev) || T.hasAnyTag(prev, ['Possessive', 'Pronoun'])) continue;
      // 必须是有限实义动词；排除 be 动词与分词/形容词式的 -ed/-ing、动名词、不定式
      if (!(T.hasAnyTag(prev, ['Verb']) && (T.hasTag(prev, 'PresentTense') || T.hasTag(prev, 'PastTense')))) continue;
      if (T.hasAnyTag(prev, ['Noun', 'Pronoun'])) continue; // prev 同时可作名词（prices rise）→ 视为主语，不判为谓语后缺冠词
      if (T.hasAnyTag(prev, ['Gerund', 'Infinitive', 'Participle']) || T.hasTag(prev, 'Copula')) continue;
      if (/(ed|ing)$/i.test(prev.text)) continue;
      if (D.MODALS[prev.text] || /^(do|does|did|be|am|is|are|was|were|will|might|being|been)$/i.test(prev.text)) continue; // 纯助动词/情态后接的是动词（have/has/had 可作实义动词，不排除）
      if (D.NOUN_VERB_HOMO[t.text]) continue; // 名词/动词同形词（rise/fall/matter…）歧义过大，不在此规则判定
      var nxn = T.tok(tokens, k + 1);
      if (T.hasAnyTag(t, 'Verb') && nxn && T.hasTag(nxn, 'Adverb')) continue; // "动词 + 副词"（rise sharply）
      if (nxn && T.hasAnyTag(nxn, ['Noun', 'ProperNoun']) && !T.hasAnyTag(nxn, ['Verb'])) continue; // 名词作定语（climate change）
      if (/^(school|bed|work|home|hospital|prison|church|foot|hand|heart|top|bottom|breakfast|lunch|dinner|once|twice|night|sunday|monday|tuesday|wednesday|thursday|friday|saturday|january|february|march|april|june|july|august|september|october|november|december)$/.test(t.text)) continue;
      if (D.SPORTS[t.text]) continue; // play football/basketball 等运动名词不加冠词
      // 习语局部上下文放行（go to school / at home / by bus ...）
      var ctx = text.slice(Math.max(0, t.start - 18), t.end + 4).toLowerCase();
      if (/(go to school|go to work|go to bed|at home|at work|by bus|by car|by train|by plane|by bike|to school|to work|in bed|at night|on foot|at lunch|take part|took part|take care|took care|pay attention|played?\s+(football|basketball|soccer|baseball|tennis|golf|chess|volleyball|badminton))/i.test(ctx)) continue;
      addIssue(issues, { ruleId:'ART-002', category:'article', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'单数可数名词 "' + t.raw + '" 前需要冠词(a/an/the)或限定词', suggestion:'the/a ' + t.raw });
    }
    // ART-004 抽象固定搭配误用 the（仅限「介词 + the + 名词」这一泛指框架，避免 the work/the room 这类确指被误报）
    for (var a4 = 1; a4 < n; a4++) {
      if (tokens[a4 - 1].text !== 'the') continue;
      if (!/^(school|bed|work|hospital|prison|church|home|college|university)$/.test(tokens[a4].text)) continue;
      if (!D.PREPS[tokens[a4 - 2] ? tokens[a4 - 2].text : '']) continue;
      var nx4 = T.tok(tokens, a4 + 1);
      if (nx4 && /[A-Za-z]/.test(nx4.text) && T.hasAnyTag(nx4, ['Noun', 'Adjective']) && !T.hasAnyTag(nx4, ['Verb'])) continue; // 名词作定语
      addIssue(issues, { ruleId:'ART-004', category:'article', confidence:'mid', start:tokens[a4 - 1].start, end:tokens[a4].end, errorText:text.slice(tokens[a4 - 1].start, tokens[a4].end), message:'抽象固定搭配（上学/住院等）表泛指时不加 the；确指某建筑物实体才加 the', suggestion:'去掉 the' });
    }
    // ART-005 独一无二名词缺 the
    for (var u = 0; u < n; u++) {
      if (!D.UNIQUE_NOUNS[tokens[u].text]) continue;
      if (text.charAt(tokens[u].start - 1) === '-' || text.charAt(tokens[u].end) === '-') continue; // real-world 等复合词
      var pb = T.tok(tokens, u - 1);
      var pt = pb ? pb.text : '';
      if (pt === 'the' || pt === 'a' || pt === 'an') continue; // 仅确指限定词放行；in/of/on world 仍应加 the
      var pb2 = T.tok(tokens, u - 2);
      if (pb && pb2 && T.hasAnyTag(pb, ['Adjective', 'Adverb']) && T.isDeterminer(pb2)) continue; // the modern world
      addIssue(issues, { ruleId:'ART-005', category:'article', confidence:'high', start:tokens[u].start, end:tokens[u].end, errorText:tokens[u].raw, message:'sun/moon/world/internet 等独一无二事物前需加定冠词 the', suggestion:'the ' + tokens[u].raw });
    }
    // ART-006 专有名词错误加 the
    for (var p = 0; p + 1 < n; p++) {
      if (tokens[p].text !== 'the') continue;
      var nm = tokens[p + 1];
      if (D.COMMON_NOUN_WHITELIST[nm.text]) continue; // the police/government/public... 属正常用法，放行
      if (T.hasTag(nm, 'Organization')) continue; // 机构/组织名词（company/university...）被误标专有，放行
      if (!T.isProperNoun(nm)) continue;
      // 收集连续专有名词（最多 3 个）构成名称短语：United States / Yangtze River / Global South
      var ph = [nm.text], phEnd = nm.end;
      for (var q = p + 2; q < n && ph.length < 3; q++) {
        if (!T.isProperNoun(tokens[q])) break;
        ph.push(tokens[q].text); phEnd = tokens[q].end;
      }
      var phStr = ph.join(' ');
      if (D.COUNTRY_OK[nm.text] || D.COUNTRY_OK[phStr] || D.THE_OK[nm.text] || D.THE_OK[phStr]) continue;
      var geoT = false;
      for (var g = 0; g < ph.length; g++) if (D.GEO_THE[ph[g]]) { geoT = true; break; }
      if (geoT) continue; // 河/海/山脉/方位/共和国等本就用 the，放行
      if (D.PHYS_S.test(nm.text) || D.UNCOUNTABLE[nm.text]) continue; // news/physics 等常见专有误标放行
      addIssue(issues, { ruleId:'ART-006', category:'article', confidence:'high', start:tokens[p].start, end:phEnd, errorText:text.slice(tokens[p].start, phEnd), message:'人名/单个国家名称前不加 the，应直接写 "' + phStr + '"', suggestion:phStr });
    }
    // ART-007 序数词缺 the（中）
    for (var o = 1; o < n; o++) {
      if (!D.ORDINALS[tokens[o].text]) continue;
      var po = T.tok(tokens, o - 1);
      if (po && T.isDeterminer(po)) continue;
      var no = T.tok(tokens, o + 1);
      if (no && T.hasAnyTag(no, ['Noun']) && !T.hasTag(no, 'Plural')) addIssue(issues, { ruleId:'ART-007', category:'article', confidence:'mid', start:tokens[o].start, end:tokens[o].end, errorText:tokens[o].raw, message:'序数词表顺序“第…”时一般加 the（"a first" 表“又一次”除外）', suggestion:'the ' + tokens[o].raw });
    }
  }

  register(runArt, { always: true });
})(typeof window !== 'undefined' ? window : null);
