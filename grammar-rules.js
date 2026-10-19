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
  // 可数名词复数：带 Plural 标签且非不可数/s 结尾单数
  function isCountPlural(t) { return hasTag(t, 'Plural') && !UNCOUNTABLE[t.text] && !PHYS_S.test(t.text); }

  var UNCOUNTABLE = {water:1,milk:1,juice:1,oil:1,rice:1,bread:1,sugar:1,salt:1,food:1,money:1,information:1,knowledge:1,advice:1,research:1,evidence:1,progress:1,news:1,furniture:1,equipment:1,baggage:1,luggage:1,traffic:1,weather:1,work:1,software:1,pollution:1,nature:1,literature:1,music:1,education:1,math:1,mathematics:1,physics:1,behaviour:1,behavior:1,'homework':1,'meat':1,'beef':1,'pork':1,'chicken':1,'fish':1,'toast':1,noise:1,damage:1,feedback:1,transport:1,transportation:1,accommodation:1,advertising:1,employment:1,rain:1,snow:1,warmth:1,darkness:1,oxygen:1,hydrogen:1};
  // a/an 之后不应误判为缺限定词单数名词的词（代词宾格、地点/时间副词、指示词等）
  var NOUN_SKIP = {him:1,her:1,them:1,us:1,me:1,you:1,here:1,there:1,now:1,then:1,it:1,this:1,that:1,these:1,those:1,each:1,every:1};
  var MEASURE_WORDS = {cup:1,glass:1,piece:1,bottle:1,box:1,group:1,lot:1,number:1,variety:1,range:1,kind:1,type:1,bit:1,loaf:1,slice:1,bowl:1,bag:1,packet:1,pair:1,set:1,liter:1,litre:1,kilo:1,grain:1,drop:1};
  var UNIQUE_NOUNS = {sun:1,moon:1,world:1,internet:1};
  var COUNTRY_OK = {'united states':1,'united kingdom':1,us:1,usa:1,uk:1};
  // 官方/惯用名称本就带 the（避免 ART-006 误判）
  var THE_OK = {netherlands:1,philippines:1,maldives:1,seychelles:1,bahamas:1,alps:1,andes:1,himalayas:1,rockies:1};
  // 「the + 名词」为正常用法、但常被 compromise 误标为专有名词的词，ART-006 放行
  var COMMON_NOUN_WHITELIST = {police:1,government:1,public:1,staff:1,audience:1,crew:1,masses:1,majority:1};
  var INDEF = {everyone:1,everybody:1,someone:1,somebody:1,anyone:1,anybody:1,nobody:1,nothing:1,everything:1};
  var COLLECTIVE = {family:1,team:1,class:1,group:1,committee:1,staff:1,audience:1,government:1,public:1,crew:1};
  var ORDINALS = {first:1,second:1,third:1,fourth:1,fifth:1,sixth:1,seventh:1,eighth:1,ninth:1,tenth:1};
  var SPORTS = {football:1,basketball:1,soccer:1,baseball:1,tennis:1,golf:1,chess:1,volleyball:1,badminton:1,swimming:1,skiing:1,hockey:1,rugby:1,cricket:1};
  // 不可数名词的复数形式在特定语境下合法，NOUN-001 放行
  var PLURAL_OK = {waters:1,oils:1,foods:1,sugars:1,salts:1,moneys:1,monies:1,works:1,behaviours:1,behaviors:1,maths:1,peoples:1,fishes:1};
  // 本身无动词用法、复数形式必错的不可数名词（即使被误标为 Verb 也判错）
  var NOUN_STRICT = {information:1,advice:1,equipment:1,knowledge:1,furniture:1,baggage:1,luggage:1,software:1,homework:1,pollution:1};
  // 后接不定式(to do)的常见动词：漏 to 时报错
  var TO_VERBS = {want:1,hope:1,decide:1,plan:1,expect:1,agree:1,refuse:1,pretend:1,offer:1,learn:1,manage:1,choose:1,afford:1,attempt:1,intend:1,deserve:1,promise:1};
  // 动名词还原为原形时的补 e 例外
  var GERUND_E = {mak:'make',tak:'take',us:'use',writ:'write',driv:'drive',hav:'have',giv:'give',com:'come',bec:'become',mov:'move',choos:'choose',los:'lose',car:'care',shar:'share',hop:'hope',danc:'dance',fac:'face',decid:'decide',improv:'improve',includ:'include',provid:'provide',achiev:'achieve',compar:'compare',creat:'create',increas:'increase',reduc:'reduce',produc:'produce',introduc:'introduce',agre:'agree',manag:'manage',prepar:'prepare',explor:'explore',requir:'require',deserv:'deserve',refus:'refuse',pretend:'pretend',arriv:'arrive',advanc:'advance',merg:'merge',revers:'reverse',combin:'combine'};
  // 固定搭配：错误搭配 → 正确形式（'' 表示去掉该介词）
  var V_PREP_RULE = {'depend of':'on','reply of':'to','arrive to':'at','discuss about':'','emphasize on':''};
  var N_PREP_RULE = {'solution of':'to','reason of':'for','answer of':'to','key of':'to'};
  // 比较级词表：其后的 then 应为 than
  var COMPARATIVE = {more:1,less:1,fewer:1,greater:1,higher:1,lower:1,bigger:1,smaller:1,better:1,worse:1,other:1,rather:1,earlier:1,later:1,longer:1,shorter:1,larger:1,faster:1,slower:1,older:1,younger:1,easier:1,stronger:1,weaker:1,cheaper:1,richer:1,poorer:1,harsher:1,harder:1,deeper:1,wider:1,heavier:1,closer:1,nicer:1,safer:1};
  // 最高级词表：其前的 most 冗余
  var SUPERLATIVE = {best:1,worst:1,fastest:1,biggest:1,smallest:1,largest:1,highest:1,lowest:1,greatest:1,easiest:1,hardest:1,strongest:1,cheapest:1,richest:1,poorest:1,oldest:1,youngest:1,longest:1,shortest:1,earliest:1,latest:1,deepest:1,widest:1,heaviest:1,closest:1,nicest:1,safest:1};
  // 语义重复（冗余）搭配：错误 → 精简后
  var REDUNDANT = {'repeat again':'repeat','return back':'return','advance forward':'advance','past history':'history','new innovation':'innovation','free gift':'gift','basic fundamentals':'fundamentals','unexpected surprise':'surprise','reverse back':'reverse','merge together':'merge','still remains':'remains','mutual cooperation':'cooperation','repeat once again':'repeat'};
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
      if (t.text === 'there') continue; // 存在句 there 非真正主语
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
      if (!isNoun(t) || isProperNoun(t) || hasAnyTag(t, ['Pronoun'])) continue;
      if (isPlural(t)) continue;
      if (UNCOUNTABLE[t.text]) continue;
      if (NOUN_SKIP[t.text]) continue;
      var prev = tok(tokens, k - 1);
      if (!prev) continue;
      if (isDeterminer(prev)) continue;
      // 触发条件：前一词为动词或介词（宾语/介词短语位置，避免主语位置误报）
      if (!hasAnyTag(prev, ['Verb']) && !hasTag(prev, 'Preposition')) continue;
      if (/^(school|bed|work|home|hospital|prison|church|foot|hand|heart|top|bottom|breakfast|lunch|dinner|once|twice|night|sunday|monday|tuesday|wednesday|thursday|friday|saturday|january|february|march|april|june|july|august|september|october|november|december)$/.test(t.text)) continue;
      if (SPORTS[t.text]) continue; // play football/basketball 等运动名词不加冠词
      // 习语局部上下文放行（go to school / at home / by bus ...）
      var ctx = text.slice(Math.max(0, t.start - 18), t.end + 4).toLowerCase();
      if (/(go to school|go to work|go to bed|at home|at work|by bus|by car|by train|by plane|by bike|to school|to work|in bed|at night|on foot|at lunch|take part|took part|take care|took care|pay attention|played?\s+(football|basketball|soccer|baseball|tennis|golf|chess|volleyball|badminton))/i.test(ctx)) continue;
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
      if (COMMON_NOUN_WHITELIST[nm.text]) continue; // the police/government/public... 属正常用法，放行
      if (hasTag(nm, 'Organization')) continue; // 机构/组织名词（company/university...）被误标专有，放行
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
    // SVA-005 There be 就近原则（含 A and B 并列主语、跳过介词短语宾语）
    for (var tb = 0; tb < n; tb++) {
      if (tokens[tb].text !== 'there') continue;
      var be = tok(tokens, tb + 1);
      if (!be || (be.text !== 'is' && be.text !== 'are')) continue;
      var plu = false, kb = tb + 2;
      for (; kb < Math.min(tb + 12, n); kb++) {
        var tbx = tokens[kb];
        if (tbx.text === '.' || tbx.text === ';' || tbx.text === '!') break;
        if (hasTag(tbx, 'Preposition') || PREPS[tbx.text]) { while (kb + 1 < n && (isDeterminer(tokens[kb + 1]) || isNoun(tokens[kb + 1]) || /^\d+$/.test(tokens[kb + 1].text) || hasAnyTag(tokens[kb + 1], ['Number', 'Value', 'Cardinal']))) kb++; continue; }
        if (isDeterminer(tbx) || /^\d+$/.test(tbx.text) || hasAnyTag(tbx, ['Number', 'Value', 'Cardinal'])) continue;
        if ((isNoun(tbx) || looksPlural(tbx.text)) && (isPlural(tbx) || looksPlural(tbx.text))) plu = true;
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
  function gerund(w) { if (/[^aeiou]e$/i.test(w)) return w.slice(0, -1) + 'ing'; if (/^(run|sit|get|put|begin|stop|swim|plan|drop|refer|prefer|occur|admit|permit)$/i.test(w)) return w + w.slice(-1) + 'ing'; return w + 'ing'; }
  function deGerund(w) { if (!/ing$/i.test(w)) return w; var s = w.slice(0, -3); if (/([bcdfgklmnprstvz])\1$/i.test(s)) return s.slice(0, -1); if (GERUND_E[s]) return GERUND_E[s]; if (/i$/i.test(s)) return s.slice(0, -1) + 'y'; return s; }
  function baseFromEd(w) { if (!/ed$/i.test(w)) return w; var s = w.slice(0, -2); if (/([bcdfgklmnprstvz])\1$/i.test(s)) return s.slice(0, -1); if (GERUND_E[s]) return GERUND_E[s]; if (/i$/i.test(s)) return s.slice(0, -1) + 'y'; return s; }

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

  // NF-001~004 非谓语动词：介词后接原形 / 情态后接 -ing 或 to / 漏 to / 多余 to
  function runNonfin(tokens, text, issues) {
    var n = tokens.length;
    for (var i = 0; i + 1 < n; i++) {
      var t = tokens[i], nx = tokens[i + 1];
      // NF-001 介词(+非to)后接动词原形 → 应用 -ing
      if ((hasTag(t, 'Preposition') || PREPS[t.text]) && t.text !== 'to' && !MODALS[t.text]) {
        if (hasTag(nx, 'Infinitive') && !hasAnyTag(nx, ['Noun', 'Adjective'])) {
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
  function nextReal(tokens, i) { for (var j = i + 1; j < tokens.length; j++) if (tokens[j].text) return tokens[j]; return null; }
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
        if (itsNoun || itsVerb)
          addIssue(issues, { ruleId:'CONF-001', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'it\'s 是 it is 的缩写，此处表示所属应用 its', suggestion:'its' });
      }
      // their → there / they're
      if (w === 'their' && nx) {
        if (/^(is|are|was|were)$/.test(nx.text)) addIssue(issues, { ruleId:'CONF-002', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'their 是物主代词，there is/are 表存在，此处应为 there', suggestion:'there' });
        else if (hasTag(nx, 'Gerund')) addIssue(issues, { ruleId:'CONF-002', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'【疑似】此处可能应为 they\'re（they are）', suggestion:"they're" });
      }
      // then → than（前为比较级）
      if (w === 'then' && prev && COMPARATIVE[prev.text])
        addIssue(issues, { ruleId:'CONF-003', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'比较级后应用 than 表示比较，不能用 then', suggestion:'than' });
      // than → then（前为 and/but/or，表时间）
      if (w === 'than' && prev && /^(and|but|or)$/.test(prev.text))
        addIssue(issues, { ruleId:'CONF-003', category:'confusable', confidence:'mid', start:t.start, end:t.end, errorText:t.raw, message:'【疑似】此处表时间先后，应用 then 而非 than', suggestion:'then' });
      // affect → effect（前为限定词/物主代词，作名词）
      if (w === 'affect' && prev && (isDeterminer(prev) || hasAnyTag(prev, ['Possessive'])))
        addIssue(issues, { ruleId:'CONF-004', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'affect 是动词，名词“影响/效果”应为 effect', suggestion:'effect' });
      // weather → whether
      if (w === 'weather') {
        if (tokens[i + 1] && tokens[i + 1].text === 'or' && tokens[i + 2] && tokens[i + 2].text === 'not')
          addIssue(issues, { ruleId:'CONF-005', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'weather 是名词“天气”，表示“是否”应用 whether', suggestion:'whether' });
        else if (nx && nx.text === 'to' && tokens[i + 2] && hasTag(tokens[i + 2], 'Infinitive'))
          addIssue(issues, { ruleId:'CONF-005', category:'confusable', confidence:'high', start:t.start, end:t.end, errorText:t.raw, message:'weather 是名词“天气”，表示“是否”应用 whether', suggestion:'whether' });
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
    while ((mr = reWill.exec(text)) !== null) { var wi = mr.index + mr[0].toLowerCase().lastIndexOf('will'); addIssue(issues, { ruleId:'TNS-001', category:'tense', confidence:'mid', start:wi, end:wi + 4, errorText:'will', message:'【疑似】时间/条件状语从句中不用将来时，应用一般现在时（主将从现）', suggestion:'去掉 will（用一般现在时）' }); }
    var reYou = /\bif\s+i\s+was\s+you\b/gi;
    while ((mr = reYou.exec(text)) !== null) addIssue(issues, { ruleId:'TNS-002', category:'tense', confidence:'high', start:mr.index, end:mr.index + mr[0].length, errorText:mr[0], message:'虚拟语气 "If I were you" 用 were，不用 was', suggestion:'if I were you' });
    var reWish = /\b(wish|as if|if only)\b([^.;!?]*?)\b(he|she|it|i)\s+was\b/gi;
    while ((mr = reWish.exec(text)) !== null) { var wi2 = mr.index + mr[0].toLowerCase().lastIndexOf('was'); addIssue(issues, { ruleId:'TNS-002', category:'tense', confidence:'mid', start:wi2, end:wi2 + 3, errorText:'was', message:'【疑似】wish / as if 后表虚拟，应用 were 而非 was', suggestion:'were' }); }
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

  function runAll(text) {
    if (!text) return [];
    var tokens = tokenize(text);
    var issues = [];
    runArt(tokens, text, issues);
    if (tokens.some(function (t) { return /[a-z]/i.test(t.text); })) {
      runTen(tokens, text, issues);
      runSva(tokens, text, issues);
      runVerb(tokens, text, issues);
      runNoun(tokens, text, issues);
      runNonfin(tokens, text, issues);
      runColl(tokens, text, issues);
      runConfuse(tokens, text, issues);
      runComp(tokens, text, issues);
      runClause(tokens, text, issues);
      runRed(tokens, text, issues);
    }
    return issues;
  }

  global.GrammarRules = { runAll: runAll, tokenize: tokenize };
})(typeof window !== 'undefined' ? window : null);