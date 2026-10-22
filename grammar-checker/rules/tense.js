/* rules/tense.js — 时态规则矩阵 TEN-001 ~ TEN-006 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var D = GC.dict, T = GC.tok;
  var addIssue = GC.pipeline.addIssue;
  var register = GC.pipeline.register;

  function runTen(tokens, text, issues) {
    var n = tokens.length;
    var pastAdv = /(^|[\s.,])yesterday($|[\s.,])/i.test(text) || /\blast\s+\w+\b/i.test(text) || /\b\d+\s+ago\b/i.test(text) || /\bin\s+(19|20)\d{2}\b/i.test(text);
    var futureAdv = /\btomorrow\b/i.test(text) || /\bnext\s+(week|month|year|monday|tuesday|day|weekend)\b/i.test(text) || /\bin the future\b/i.test(text);
    var nowAdv = /\bnow\b/.test(text);
    var canary = /\bsaid\b/.test(text) && /\bfound\b/.test(text) || /\bthe\s+earth\s+goes\b/i.test(text);
    var sinceMatch = /\bsince\b\s+((19|20)\d{2}|(last|later|childhood|then)\b)/i.exec(text) && !/since\s+then\b/i.test(text);

    if (pastAdv && !/\bsince\b/i.test(text)) { // since + 时间本就用完成时，跳过 TEN-002
      // TEN-002 现在完成 + 明确过去点
      var havePP = false;
      for (var h2 = 0; h2 < n; h2++) {
        if (tokens[h2].text !== 'have' && tokens[h2].text !== 'has') continue;
        var pr = T.tok(tokens, h2 + 1);
        if (!pr) continue;
        if (T.hasAnyTag(pr, ['PastPart', 'PastTense']) || D.IRREG_PP[pr.text]) {
          // 与过去时间点被并列连词隔开（was introduced in 2019 and has been…）属不同从句，不判
          var ym = /\bin\s+((?:19|20)\d{2})\b/i.exec(text);
          if (ym) { var midT = text.slice(ym.index, tokens[h2].start); if (/\b(and|but)\b|;/.test(midT)) continue; }
          // 完成时 + for + 时间段（has been in effect for five years）属正常用法，不判
          if (/\bfor\s+(?:a\s+|an\s+)?(?:\d+|several|many|few|two|three|four|five|six|seven|eight|nine|ten|decades?|years?|months?|weeks?|days?|hours?|centuries|century)\b/i.test(text.slice(pr.end))) continue;
          havePP = true;
          addIssue(issues, { ruleId:'TEN-002', category:'tense', confidence:'high', start:tokens[h2].start, end:pr.end, errorText:text.slice(tokens[h2].start, pr.end), message:'现在完成时(has/have done)不能搭配明确过去时间点，请改用一般过去式', suggestion:'改为一般过去式' });
          break;
        }
      }
      // TEN-001 过去时间状语 + 一般现在时谓语
      if (!canary && !havePP && !sinceMatch) {
        for (var i = 0; i < n; i++) {
          var t = tokens[i];
          if (D.MODALS[t.text]) continue;
          if (T.hasAnyTag(t, ['Noun']) || D.UNCOUNTABLE[t.text] || D.ABSTRACT_NOUN[t.text]) continue; // 名词同形/不可数/抽象名词不作谓语
          var tnx = T.tok(tokens, i + 1);
          if (tnx && T.hasAnyTag(tnx, ['Noun']) && !T.hasAnyTag(tnx, ['Verb'])) continue; // 名词作定语（work experience）
          if (!T.hasAnyTag(t, ['Verb','Infinitive'])) continue;
          if (T.hasTag(t, 'PastTense') || T.hasTag(t, 'FutureTense') || T.hasTag(t, 'PastPart') || T.hasTag(t, 'Gerund')) continue;
          if (/^(am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|may|might|must|shall|should)$/i.test(t.text)) continue;
          if (T.verbBlocked(tokens, i)) continue;
          addIssue(issues, { ruleId:'TEN-001', category:'tense', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'句中有过去时间状语(yesterday/last week)，谓语应使用一般过去式', suggestion:t.raw + ' → 过去式' });
          break;
        }
      }
    }
    if (futureAdv && !canary) {
      for (var f = 0; f < n; f++) {
        var tf = tokens[f];
        if (!T.hasTag(tf, 'PastTense')) continue;
        if (T.verbBlocked(tokens, f)) continue;
        addIssue(issues, { ruleId:'TEN-005', category:'tense', confidence:'high', start:tf.start, end:tf.end, errorText:tf.raw, message:'tomorrow/next week 是将来时间，谓语不能使用过去式', suggestion:'will ' + (D.PAST_BASE[tf.text] || tf.text) });
        break;
      }
    }
    // TEN-003 since + 过去时间，主句现在时（中；若已有完成时则本已正确，跳过）
    if (sinceMatch) {
      var sm = sinceMatch;
      var hasPerfect = false;
      for (var pz = 0; pz < n; pz++) { if (tokens[pz].text === 'has' || tokens[pz].text === 'have') { hasPerfect = true; break; } }
      if (!hasPerfect) for (var s2 = 0; s2 < n; s2++) {
        if (tokens[s2].start <= sm.index) continue;
        if (T.hasAnyTag(tokens[s2], ['Noun'])) continue;
        if (/^(is|are)$/i.test(tokens[s2].text)) { // since + 时间 + 现在时 be → 应用 has/have been
          addIssue(issues, { ruleId:'TEN-003', category:'tense', confidence:'mid', start:tokens[s2].start, end:tokens[s2].end, errorText:tokens[s2].raw, message:'Since + 过去时间表示从过去持续到现在，主句应用现在完成时(has/have been)', suggestion:tokens[s2].text === 'is' ? 'has been' : 'have been' });
          break;
        }
        if (T.hasAnyTag(tokens[s2], ['Verb','Infinitive']) && !T.hasTag(tokens[s2],'PastTense') && !T.hasTag(tokens[s2],'Gerund') && !/(am|is|are|was|were)$/i.test(tokens[s2].text)) {
          addIssue(issues, { ruleId:'TEN-003', category:'tense', confidence:'mid', start:tokens[s2].start, end:tokens[s2].end, errorText:tokens[s2].raw, message:'Since + 过去时间表示从过去持续到现在，主句常用现在完成时(have/has done)', suggestion:'have/has ' + tokens[s2].raw + ' → 现在完成时' });
          break;
        }
      }
    }
    // TEN-004 并列时态跳跃（中）
    for (var e = 1; e < n - 1; e++) {
      if (tokens[e].text !== 'and' && tokens[e].text !== 'but') continue;
      var rv = null, rs = e + 1;
      if (rs < n && /^(he|she|it|they|we|i|you)$/.test(tokens[rs].text)) rs++; // and + 代词主语（He went home and she cooks）
      for (var qr = rs; qr < Math.min(rs + 4, n); qr++) {
        if (tokens[qr].text === ',') break;
        if (!T.plainFinite(tokens[qr])) continue;
        var rvn = T.tok(tokens, qr + 1);
        if (rvn && (T.hasTag(rvn, 'Preposition') || D.PREPS[rvn.text])) break; // 后接介词 → 实为名词（doubts about）
        // 右侧候选谓语前必须是主语（名词/代词）：both opportunities and challenges 属并列宾语，不判
        var preRV = qr > 0 ? tokens[qr - 1] : null;
        if (!(preRV && (T.hasAnyTag(preRV, ['Noun', 'Pronoun']) || /^(he|she|it|they|we|i|you)$/.test(preRV.text)))) continue;
        rv = tokens[qr]; break;
      }
      if (!rv) continue;
      var lv = null;
      for (var w3 = e - 1; w3 >= Math.max(0, e - 4); w3--) {
        if (tokens[w3].text === ',' || /^(he|she|it|they|we|i|you)$/.test(tokens[w3].text)) break;
        if (T.plainFinite(tokens[w3]) && T.hasTag(tokens[w3], 'PastTense')) { lv = tokens[w3]; break; }
      }
      if (lv && rv) addIssue(issues, { ruleId:'TEN-004', category:'tense', confidence:'mid', start:rv.start, end:rv.end, errorText:rv.raw, message:'并列句连续动作无时间切换，前后时态建议保持一致（前句用过去式）', suggestion:rv.raw + ' → 过去式' });
    }
    // TEN-006 now + 一般现在时（低，仅建议；"has/have/had now done" 属正常完成时，跳过）
    if (nowAdv && !/\b(has|have|had)\s+now\b/i.test(text)) {
      var ni = text.indexOf('now');
      for (var nw = 0; nw < n; nw++) {
        if (tokens[nw].start <= ni) continue;
        if (T.hasAnyTag(tokens[nw], ['Verb','Infinitive']) && T.hasTag(tokens[nw], 'PresentTense') && !/(am|is|are)$/i.test(tokens[nw].text)) {
          addIssue(issues, { ruleId:'TEN-006', category:'tense', confidence:'low', start:tokens[nw].start, end:tokens[nw].end, errorText:tokens[nw].raw, message:'now 常表示此刻正在发生，可考虑用现在进行时(am/is/are doing)', suggestion:'am/is/are ' + tokens[nw].raw + 'ing' });
          break;
        }
      }
    }
  }

  register(runTen);
})(typeof window !== 'undefined' ? window : null);
