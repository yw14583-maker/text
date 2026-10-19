/* 英文启发式语法模块（ART/TEN/SVA）
 * 依赖 text-pos.js 提供的 window.nlp（compromise 内置 POS 标注）。
 * 暴露 window.GrammarRules.runAll(text) ->
 *   [{ruleId, category, confidence, start, end, errorText, message, suggestion}]
 * 置信度：high=判错扣分；mid=「疑似」仅提示；low=仅写作建议不判错。
 */
(function (global) {
  'use strict';
  if (!global) return;

  function hasTag(t, tag) { return t.tags.indexOf(tag) !== -1; }
  function hasAnyTag(t, list) { for (var i = 0; i < list.length; i++) if (t.tags.indexOf(list[i]) !== -1) return true; return false; }
  function isNoun(t) { return hasAnyTag(t, ['Noun']); }
  function isProperNoun(t) { return hasTag(t, 'ProperNoun'); }
  function isPlural(t) { return hasTag(t, 'Plural'); }
  function isSingular(t) { return hasTag(t, 'Singular'); }
  // 复数后缀启发式：s/x 结尾且非常见单数名词/不可数名词，视为复数
  function looksPlural(w) { w = (w || '').toLowerCase(); if (!/[sx]$/i.test(w)) return false; if (PHYS_S.test(w)) return false; if (UNCOUNTABLE[w]) return false; return true; }

  var UNCOUNTABLE = {water:1,milk:1,juice:1,oil:1,rice:1,bread:1,sugar:1,salt:1,food:1,money:1,information:1,knowledge:1,advice:1,research:1,evidence:1,progress:1,news:1,furniture:1,equipment:1,baggage:1,luggage:1,traffic:1,weather:1,work:1,software:1,pollution:1,nature:1,literature:1,music:1,education:1,math:1,mathematics:1,physics:1,behaviour:1,behavior:1,'homework':1,'meat':1,'beef':1,'pork':1,'chicken':1,'fish':1,'toast':1};
  // a/an 之后不应误判为缺限定词单数名词的词（代词宾格、地点/时间副词、指示词等）
  var NOUN_SKIP = {him:1,her:1,them:1,us:1,me:1,you:1,here:1,there:1,now:1,then:1,it:1,this:1,that:1,these:1,those:1,each:1,every:1};
  var MEASURE_WORDS = {cup:1,glass:1,piece:1,bottle:1,box:1,group:1,lot:1,number:1,variety:1,range:1,kind:1,type:1,bit:1,loaf:1,slice:1,bowl:1,bag:1,packet:1,pair:1,set:1,liter:1,litre:1,kilo:1,grain:1,drop:1};
  var UNIQUE_NOUNS = {sun:1,moon:1,world:1,internet:1};
  var COUNTRY_OK = {'united states':1,'united kingdom':1,us:1,usa:1,uk:1};
  // 官方/惯用名称本就带 the（避免 ART-006 误判）
  var THE_OK = {netherlands:1,philippines:1,maldives:1,seychelles:1,bahamas:1,alps:1,andes:1,himalayas:1,rockies:1};
  var INDEF = {everyone:1,everybody:1,someone:1,somebody:1,anyone:1,anybody:1,nobody:1,nothing:1,everything:1};
  var COLLECTIVE = {family:1,team:1,class:1,group:1,committee:1,staff:1,audience:1,government:1,public:1,crew:1};
  var ORDINALS = {first:1,second:1,third:1,fourth:1,fifth:1,sixth:1,seventh:1,eighth:1,ninth:1,tenth:1};
  var SPORTS = {football:1,basketball:1,soccer:1,baseball:1,tennis:1,golf:1,chess:1,volleyball:1,badminton:1,swimming:1,skiing:1,hockey:1,rugby:1,cricket:1};
  var PHYS_S = /^(news|maths|math|physics|economics|ethics|statistics|politics|linguistics|electronics)$/;
  var SOUND_AN = {hour:1,honest:1,honor:1,honour:1,heir:1};
  var SOUND_A = {university:1,unique:1,united:1,uniform:1,universal:1,user:1,european:1,one:1,once:1,useful:1,union:1,unit:1,use:1};
  var MODALS = {can:1,could:1,may:1,might:1,must:1,shall:1,should:1,will:1,would:1,wo:1,'won\'t':1,cannot:1,do:1,does:1,did:1};
  var IRREG_PP = {been:1,seen:1,gone:1,done:1,met:1,taken:1,written:1,broken:1,chosen:1,spoken:1,fell:1,known:1,driven:1,eaten:1,run:1,come:1,become:1,found:1,held:1,kept:1,left:1,made:1,said:1,told:1,thought:1,shown:1,built:1,bought:1,caught:1,bring:1,brought:1,felt:1,heard:1,hit:1,understood:1,put:1,read:1,risen:1,sent:1,sung:1,stood:1,taught:1,won:1,been:1};
  // 一般现在时第三单的不规则形式
  var IRREG_S3 = {be:'is',have:'has',has:'has',do:'does',does:'does',go:'goes',watch:'watches',teach:'teaches',reach:'reaches',catch:'catches',pass:'passes',fix:'fixes',box:'boxes'};
  // 复数谓语还原为原形的不规则映射
  var IRREG_BASE = {is:'be',are:'be',was:'be',were:'be',has:'have',does:'do'};
  var INNER_WORDS = {'together with':1,'along with':1,'as well as':1,including:1};
  var DETERMINERS = {the:1,a:1,an:1,this:1,that:1,these:1,those:1,my:1,your:1,his:1,her:1,its:1,our:1,their:1,some:1,any:1,each:1,every:1,no:1,both:1,all:1,several:1,'another':1,'other':1};

  function vowelSound(w) { if (SOUND_AN[w]) return true; if (SOUND_A[w]) return false; return /^[aeiou]/i.test(w); }

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

  function tok(tokens, i) { return i >= 0 && i < tokens.length ? tokens[i] : null; }
  function addIssue(issues, o) {
    // 仅去掉同一规则在同一位置的重复提示；同一规则在不同位置可分别报出
    for (var i = 0; i < issues.length; i++) {
      if (issues[i].ruleId === o.ruleId && issues[i].start === (o.start || 0) && issues[i].end === (o.end || 0)) return;
    }
    issues.push({ start: o.start || 0, end: o.end || 0, errorText: o.errorText || '', message: o.message, suggestion: o.suggestion || '', ruleId: o.ruleId, category: o.category, confidence: o.confidence });
  }
  // 主语词性判定
  function classifySubject(t) {
    var w = t.text;
    if (w === 'he' || w === 'she' || w === 'it') return { plural: false, third: true, name: w };
    if (w === 'they' || w === 'we') return { plural: true, third: false, name: w };
    if (w === 'i' || w === 'you') return null; // 非三单，不判定
    if (isNoun(t) && !isProperNoun(t)) { var p = isPlural(t); return { plural: p, third: !p, name: w }; }
    return null;
  }
  var PREPS = {of:1,in:1,on:1,at:1,by:1,for:1,with:1,about:1,from:1,into:1,after:1,before:1,between:1,under:1,during:1,through:1,without:1,along:1,across:1,among:1,against:1,around:1,over:1,up:1,down:1,as:1,than:1};
  // 判断 tokens[k] 是否是介词短语的宾语（向左越过限定词能找到介词）
  function isPPObject(tokens, k) {
    for (var j = k - 1; j >= Math.max(0, k - 3); j--) {
      var t = tokens[j];
      if (hasTag(t, 'Preposition') || PREPS[t.text]) return true;
      if (hasTag(t, 'Determiner')) continue;
      break;
    }
    return false;
  }
  // 取动词左边最近的主体（跳过副词/限定词/介词短语宾语），遇 modal/连接词返回 null
  function subjectBefore(tokens, idx) {
    for (var k = idx - 1; k >= 0; k--) {
      var t = tokens[k];
      if (t.text === ',' || t.text === ';' || t.text === '.' || t.text === 'and' || t.text === 'or' || t.text === 'but' || t.text === 'then' || t.text === 'to') return null;
      if (MODALS[t.text]) return null;
      if (hasAnyTag(t, ['Adverb'])) continue;
      if (t.text === 'not' || t.text === 'also' || t.text === 'always' || t.text === 'often' || t.text === 'never' || t.text === 'usually' || t.text === 'however') continue;
      if (isDeterminer(t)) continue;
      var cl = classifySubject(t);
      if (cl) { if (isPPObject(tokens, k)) continue; return cl; }
    }
    return null;
  }
  function isDeterminer(t) { return DETERMINERS[t.text] || hasTag(t, 'Determiner'); }
  // 判断动词是否处于不该判错的位子（情态动词/to 之后）。true=跳过不判
  function verbBlocked(tokens, idx) {
    for (var k = idx - 1; k >= 0; k--) {
      var t = tokens[k];
      if (t.text === ',' || t.text === ';' || t.text === '.' || t.text === 'and' || t.text === 'or' || t.text === 'but') return false; // 子句边界→主谓完整，可判
      if (MODALS[t.text] || t.text === 'to') return true;          // 情态动词/to 表原形，不判
      if (hasAnyTag(t, ['Adverb'])) continue;
      if (t.text === 'not' || t.text === 'also' || t.text === 'always' || t.text === 'often' || t.text === 'never' || t.text === 'usually' || t.text === 'however') continue;
      if (isDeterminer(t)) continue;
      return false;                                                 // 已见主体/其它词，可判
    }
    return false;
  }

  // ---------------- 冠词 ----------------
  function runArt(tokens, text, issues) {
    var n = tokens.length;
    // ART-001 a/an 发音
    for (var i = 0; i < n; i++) {
      var art = tokens[i].text;
      if (art !== 'a' && art !== 'an') continue;
      var nx = tok(tokens, i + 1);
      if (!nx || !/[A-Za-z]/.test(nx.text)) continue;
      var needAn = vowelSound(nx.text);
      if (art === 'a' && needAn) addIssue(issues, { ruleId:'ART-001', category:'article', confidence:'high', start:tokens[i].start, end:nx.end, errorText:text.slice(tokens[i].start, nx.end), message:'a/an 由后面单词发音首音决定：元音音素开头用 an', suggestion:'an ' + nx.raw });
      else if (art === 'an' && !needAn && !/^[a-z]/i.test(nx.text)) continue;
      else if (art === 'an' && !needAn) addIssue(issues, { ruleId:'ART-001', category:'article', confidence:'high', start:tokens[i].start, end:nx.end, errorText:text.slice(tokens[i].start, nx.end), message:'a/an 由后面单词发音首音决定：辅音音素开头用 a', suggestion:'a ' + nx.raw });
    }
    // ART-003 a/an + 不可数/复数
    for (var j = 0; j < n; j++) {
      if (tokens[j].text !== 'a' && tokens[j].text !== 'an') continue;
      var na = tok(tokens, j + 1);
      if (!na || !/[A-Za-z]/.test(na.text)) continue;
      var n2 = tok(tokens, j + 2);
      if (na.text === 'of' || (MEASURE_WORDS[na.text] && n2 && n2.text === 'of')) continue;
      if (UNCOUNTABLE[na.text]) addIssue(issues, { ruleId:'ART-003', category:'article', confidence:'high', start:tokens[j].start, end:na.end, errorText:text.slice(tokens[j].start,na.end), message:'a/an 只能修饰单数可数名词，"' + na.raw + '" 是不可数名词', suggestion:na.raw });
      else if (isPlural(na) || (isNoun(na) && looksPlural(na.text))) addIssue(issues, { ruleId:'ART-003', category:'article', confidence:'high', start:tokens[j].start, end:na.end, errorText:text.slice(tokens[j].start,na.end), message:'a/an 只能修饰单数可数名词，复数名词不能直接加 a/an', suggestion:na.raw });
    }
    // ART-002 单数可数名词缺限定词（保守）
    for (var k = 1; k < n; k++) {
      var t = tokens[k];
      if (!isNoun(t) || isProperNoun(t)) continue;
      if (isPlural(t)) continue;
      if (UNCOUNTABLE[t.text]) continue;
      if (NOUN_SKIP[t.text]) continue;
      var prev = tok(tokens, k - 1);
      if (!prev) continue;
      if (isDeterminer(prev)) continue;
      // 触发条件：前一词为动词或介词（宾语/介词短语位置，避免主语位置误报）
      if (!hasAnyTag(prev, ['Verb']) && !hasTag(prev, 'Preposition')) continue;
      if (/^(school|bed|work|home|hospital|prison|church|foot|hand|heart|top|bottom|breakfast|lunch|dinner|once|twice|night)$/.test(t.text)) continue;
      if (SPORTS[t.text]) continue; // play football/basketball 等运动名词不加冠词
      // 习语局部上下文放行（go to school / at home / by bus ...）
      var ctx = text.slice(Math.max(0, t.start - 18), t.end + 4).toLowerCase();
      if (/(go to school|go to work|go to bed|at home|at work|by bus|by car|by train|by plane|by bike|to school|to work|in bed|at night|on foot|at lunch|played?\s+(football|basketball|soccer|baseball|tennis|golf|chess|volleyball|badminton))/i.test(ctx)) continue;
      addIssue(issues, { ruleId:'ART-002', category:'article', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'单数可数名词 "' + t.raw + '" 前需要冠词(a/an/the)或限定词', suggestion:'the/a ' + t.raw });
    }
    // ART-004 抽象固定搭配误用 the（中）
    var m4 = /\b(the\s*(school|bed|work|hospital|prison|church|home))\b/gi;
    var m4r;
    while ((m4r = m4.exec(text)) !== null) {
      addIssue(issues, { ruleId:'ART-004', category:'article', confidence:'mid', start:m4r.index, end:m4r.index+m4r[0].length, errorText:m4r[0], message:'抽象固定搭配（上学/住院等）表泛指时不加 the；确指某建筑物实体才加 the', suggestion:'去掉 the' });
    }
    // ART-005 独一无二名词缺 the
    for (var u = 0; u < n; u++) {
      if (!UNIQUE_NOUNS[tokens[u].text]) continue;
      var pb = tok(tokens, u - 1);
      var pt = pb ? pb.text : '';
      if (pt === 'the' || pt === 'a' || pt === 'an') continue; // 仅确指限定词放行；in/of/on world 仍应加 the
      addIssue(issues, { ruleId:'ART-005', category:'article', confidence:'high', start:tokens[u].start, end:tokens[u].end, errorText:tokens[u].raw, message:'sun/moon/world/internet 等独一无二事物前需加定冠词 the', suggestion:'the ' + tokens[u].raw });
    }
    // ART-006 专有名词错误加 the
    for (var p = 0; p + 1 < n; p++) {
      if (tokens[p].text !== 'the') continue;
      var nm = tokens[p + 1];
      if (!isProperNoun(nm)) continue;
      if (COUNTRY_OK[nm.text]) continue;
      if (THE_OK[nm.text]) continue; // 官方名称本就带 the（Netherlands/Philippines 等）
      if (PHYS_S.test(nm.text) || UNCOUNTABLE[nm.text]) continue; // news/physics 等常见专有误标放行
      addIssue(issues, { ruleId:'ART-006', category:'article', confidence:'high', start:tokens[p].start, end:nm.end, errorText:text.slice(tokens[p].start, nm.end), message:'人名/单个国家名称前不加 the，应直接写 "' + nm.raw + '"', suggestion:nm.raw });
    }
    // ART-007 序数词缺 the（中）
    for (var o = 1; o < n; o++) {
      if (!ORDINALS[tokens[o].text]) continue;
      var po = tok(tokens, o - 1);
      if (po && isDeterminer(po)) continue;
      var no = tok(tokens, o + 1);
      if (no && hasAnyTag(no, ['Noun'])) addIssue(issues, { ruleId:'ART-007', category:'article', confidence:'mid', start:tokens[o].start, end:tokens[o].end, errorText:tokens[o].raw, message:'序数词表顺序“第…”时一般加 the（"a first" 表“又一次”除外）', suggestion:'the ' + tokens[o].raw });
    }
  }

  // ---------------- 时态 ----------------
  function runTen(tokens, text, issues) {
    var n = tokens.length;
    var pastAdv = /(^|[\s.,])yesterday($|[\s.,])/.test(text) || /\blast\s+\w+\b/.test(text) || /\b\d+\s+ago\b/.test(text) || /\b(19|20)\d{2}\b/.test(text);
    var futureAdv = /\btomorrow\b/.test(text) || /\bnext\s+(week|month|year|monday|tuesday|day|weekend)\b/.test(text) || /\bin the future\b/.test(text);
    var nowAdv = /\bnow\b/.test(text);
    var canary = /\bsaid\b/.test(text) && /\bfound\b/.test(text) || /\bthe\s+earth\s+goes\b/i.test(text);
    var sinceMatch = /\bsince\b\s+((19|20)\d{2}|(last|later|childhood|then)\b)/i.exec(text) && !/since\s+then\b/i.test(text);

    if (pastAdv) {
      // TEN-002 现在完成 + 明确过去点
      var havePP = false;
      for (var h2 = 0; h2 < n; h2++) {
        if (tokens[h2].text !== 'have' && tokens[h2].text !== 'has') continue;
        var pr = tok(tokens, h2 + 1);
        if (!pr) continue;
        if (hasAnyTag(pr, ['PastPart', 'PastTense']) || IRREG_PP[pr.text]) {
          havePP = true;
          addIssue(issues, { ruleId:'TEN-002', category:'tense', confidence:'high', start:tokens[h2].start, end:pr.end, errorText:text.slice(tokens[h2].start, pr.end), message:'现在完成时(has/have done)不能搭配明确过去时间点，请改用一般过去式', suggestion:'改为一般过去式' });
          break;
        }
      }
      // TEN-001 过去时间状语 + 一般现在时谓语
      if (!canary && !havePP && !sinceMatch) {
        for (var i = 0; i < n; i++) {
          var t = tokens[i];
          if (MODALS[t.text]) continue;
          if (!hasAnyTag(t, ['Verb','Infinitive'])) continue;
          if (hasTag(t, 'PastTense') || hasTag(t, 'FutureTense') || hasTag(t, 'PastPart') || hasTag(t, 'Gerund')) continue;
          if (/^(am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|may|might|must|shall|should)$/i.test(t.text)) continue;
          if (verbBlocked(tokens, i)) continue;
          addIssue(issues, { ruleId:'TEN-001', category:'tense', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'句中有过去时间状语(yesterday/last week)，谓语应使用一般过去式', suggestion:t.raw + ' → 过去式' });
          break;
        }
      }
    }
    if (futureAdv && !canary) {
      for (var f = 0; f < n; f++) {
        var tf = tokens[f];
        if (!hasTag(tf, 'PastTense')) continue;
        if (verbBlocked(tokens, f)) continue;
        addIssue(issues, { ruleId:'TEN-005', category:'tense', confidence:'high', start:tf.start, end:tf.end, errorText:tf.raw, message:'tomorrow/next week 是将来时间，谓语不能使用过去式', suggestion:'will ' + (PAST_BASE[tf.text] || tf.text) });
        break;
      }
    }
    // TEN-003 since + 过去时间，主句现在时（中）
    if (sinceMatch) {
      var sm = sinceMatch;
      for (var s2 = 0; s2 < n; s2++) {
        if (tokens[s2].start <= sm.index) continue;
        if (hasAnyTag(tokens[s2], ['Verb','Infinitive']) && !hasTag(tokens[s2],'PastTense') && !/(am|is|are|was|were)$/i.test(tokens[s2].text)) {
          addIssue(issues, { ruleId:'TEN-003', category:'tense', confidence:'mid', start:tokens[s2].start, end:tokens[s2].end, errorText:tokens[s2].raw, message:'Since + 过去时间表示从过去持续到现在，主句常用现在完成时(have/has done)', suggestion:'have/has ' + tokens[s2].raw + ' → 现在完成时' });
          break;
        }
      }
    }
    // TEN-004 并列时态跳跃（中）
    for (var e = 1; e < n - 1; e++) {
      if (tokens[e].text !== 'and' && tokens[e].text !== 'but') continue;
      var rv = null;
      for (var qr = e + 1; qr < Math.min(e + 4, n); qr++) {
        if (/^(he|she|it|they|we|i|you)$/.test(tokens[qr].text) || tokens[qr].text === ',') break;
        if (hasTag(tokens[qr], 'PresentTense')) { rv = tokens[qr]; break; }
      }
      if (!rv) continue;
      var lv = null;
      for (var w3 = e - 1; w3 >= Math.max(0, e - 4); w3--) {
        if (tokens[w3].text === ',' || /^(he|she|it|they|we|i|you)$/.test(tokens[w3].text)) break;
        if (hasTag(tokens[w3], 'PastTense')) { lv = tokens[w3]; break; }
      }
      if (lv && rv) addIssue(issues, { ruleId:'TEN-004', category:'tense', confidence:'mid', start:rv.start, end:rv.end, errorText:rv.raw, message:'并列句连续动作无时间切换，前后时态建议保持一致（前句用过去式）', suggestion:rv.raw + ' → 过去式' });
    }
    // TEN-006 now + 一般现在时（低，仅建议）
    if (nowAdv) {
      var ni = text.indexOf('now');
      for (var nw = 0; nw < n; nw++) {
        if (tokens[nw].start <= ni) continue;
        if (hasAnyTag(tokens[nw], ['Verb','Infinitive']) && hasTag(tokens[nw], 'PresentTense') && !/(am|is|are)$/i.test(tokens[nw].text)) {
          addIssue(issues, { ruleId:'TEN-006', category:'tense', confidence:'low', start:tokens[nw].start, end:tokens[nw].end, errorText:tokens[nw].raw, message:'now 常表示此刻正在发生，可考虑用现在进行时(am/is/are doing)', suggestion:'am/is/are ' + tokens[nw].raw + 'ing' });
          break;
        }
      }
    }
  }

  // ---------------- 主谓一致 ----------------
  function nextHeadNoun(tokens, start) {
    for (var k = start; k < Math.min(start + 3, tokens.length); k++) {
      if (isNoun(tokens[k]) || INDEF[tokens[k].text]) return tokens[k];
    }
    return null;
  }
  function runSva(tokens, text, issues) {
    var n = tokens.length;
    // SVA-004 不定代词 + 复数谓语
    for (var i = 0; i < n; i++) {
      if (!INDEF[tokens[i].text]) continue;
      var v = tok(tokens, i + 1);
      if (v && (/^(are|were)$/.test(v.text))) addIssue(issues, { ruleId:'SVA-004', category:'sva', confidence:'high', start:tokens[i].start, end:v.end, errorText:text.slice(tokens[i].start, v.end), message:'everyone/nobody 等不定代词作主语，谓语动词用单数', suggestion:v.text==='are'?'is':'was' });
    }
    // SVA-005 There be 就近原则
    for (var tb = 0; tb < n; tb++) {
      if (tokens[tb].text !== 'there') continue;
      var be = tok(tokens, tb + 1);
      if (!be || (be.text !== 'is' && be.text !== 'are')) continue;
      var h = nextHeadNoun(tokens, tb + 2);
      if (!h) continue;
      if (be.text === 'is' && isPlural(h)) addIssue(issues, { ruleId:'SVA-005', category:'sva', confidence:'high', start:tokens[tb].start, end:tokens[tb].end + 20, errorText:text.slice(tokens[tb].start, Math.min(tokens[tb].end + 25, text.length)), message:'There be 遵循就近原则：紧接的是一个复数名词，be 动词应用复数(are)', suggestion:'There are …' });
      else if (be.text === 'are' && !isPlural(h)) addIssue(issues, { ruleId:'SVA-005', category:'sva', confidence:'high', start:tokens[tb].start, end:tokens[tb].end + 20, errorText:text.slice(tokens[tb].start, Math.min(tokens[tb].end + 25, text.length)), message:'There be 遵循就近原则：紧接的是一个单数名词，be 动词应用单数(is)', suggestion:'There is …' });
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
      if (MODALS[tv.text]) continue;
      if (!hasTag(tv, 'PresentTense') && !hasTag(tv, 'Verb')) continue;
      if (hasTag(tv, 'PastTense') || hasTag(tv, 'Gerund')) continue;
      var sb = subjectBefore(tokens, v);
      if (!sb) continue;
      var wv = tv.text;
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
    // SVA-008 集合名词（低，仅建议）
    for (var c = 0; c < n; c++) {
      if (COLLECTIVE[tokens[c].text]) { addIssue(issues, { ruleId:'SVA-008', category:'sva', confidence:'low', start:tokens[c].start, end:tokens[c].end, errorText:tokens[c].raw, message:'集合名词 ' + tokens[c].raw + '：强调整体用单数(is)，强调成员用复数(are)，按语义选择', suggestion:'is / are 视语义而定' }); break; }
    }
  }

  var PAST_BASE = {went:'go',saw:'see',had:'have',did:'do',was:'be',were:'be',made:'make',took:'take',came:'come',got:'get',gave:'give',said:'say',told:'tell',thought:'think',found:'find',left:'leave',met:'meet',knew:'know',became:'become',held:'hold',kept:'keep',built:'build',bought:'buy',caught:'catch',taught:'teach',won:'win',broke:'break',wrote:'write',read:'read',ran:'run',felt:'feel',heard:'hear',sent:'send',put:'put',stood:'stand',understood:'understand',drove:'drive',ate:'eat',spoke:'speak',chose:'choose',brought:'bring',spent:'spend',showed:'show',slept:'sleep',drank:'drink',swam:'swim',drew:'draw',flew:'fly',threw:'throw',wore:'wear'};
  function singularize(t) { var w = t.text; if (IRREG_S3[w]) return IRREG_S3[w]; if (/[sx]$/i.test(w) || /ch$|sh$|o$/i.test(w)) return w + 'es'; if (/[bcdfghjklmnpqrstvwxz]y$/i.test(w)) return w.slice(0, -1) + 'ies'; return w + 's'; }
  function pluralStrip(t) { var w = t.text.toLowerCase(); var base = IRREG_BASE[w]; if (base) return base; if (/ies$/i.test(w)) return w.slice(0, -3) + 'y'; if (/ches$|shes$|xes$|zes$|sses$/i.test(w)) return w.slice(0, -2); return w.replace(/s$/i, ''); }

  function runAll(text) {
    if (!text) return [];
    var tokens = tokenize(text);
    var issues = [];
    runArt(tokens, text, issues);
    if (tokens.some(function (t) { return /[a-z]/i.test(t.text); })) {
      runTen(tokens, text, issues);
      runSva(tokens, text, issues);
    }
    return issues;
  }

  global.GrammarRules = { runAll: runAll, tokenize: tokenize };
})(typeof window !== 'undefined' ? window : null);