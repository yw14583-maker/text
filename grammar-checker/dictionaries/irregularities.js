/* dictionaries/irregularities.js
 * 不规则动词/名词形式表，以及词形还原（-ing / -ed / 复数 / 三单）工具函数。
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var dict = GC.dict = GC.dict || {};
  var morph = GC.morph = {};

  // 过去分词（用于 PERF/TEN，含与原形同形者）
  dict.IRREG_PP = {been:1,seen:1,gone:1,done:1,met:1,taken:1,written:1,broken:1,chosen:1,spoken:1,fell:1,known:1,driven:1,eaten:1,run:1,come:1,become:1,found:1,held:1,kept:1,left:1,made:1,said:1,told:1,thought:1,shown:1,built:1,bought:1,caught:1,bring:1,brought:1,felt:1,heard:1,hit:1,understood:1,put:1,read:1,risen:1,sent:1,sung:1,stood:1,taught:1,won:1};
  // 一般现在时第三单的不规则形式
  dict.IRREG_S3 = {be:'is',have:'has',has:'has',do:'does',does:'does',go:'goes',watch:'watches',teach:'teaches',reach:'reaches',catch:'catches',pass:'passes',fix:'fixes',box:'boxes'};
  // 复数谓语还原为原形的不规则映射
  dict.IRREG_BASE = {is:'be',are:'be',was:'be',were:'be',has:'have',does:'do'};

  // 形式与单数相同（或非 -s 结尾）的复数名词，避免误判
  dict.IRREG_PLURAL = {people:1,children:1,men:1,women:1,feet:1,teeth:1,mice:1,geese:1,sheep:1,fish:1,deer:1,series:1,species:1,criteria:1,data:1,phenomena:1,media:1,police:1,staff:1,cattle:1,offspring:1};
  dict.PLURAL_IRREG = {person:'people',child:'children',man:'men',woman:'women',tooth:'teeth',foot:'feet',mouse:'mice',goose:'geese'};

  // 简单过去式 ≠ 过去分词 的不规则动词（有同形者不入表，避免误报）
  dict.PAST_TO_PP = {went:'gone',saw:'seen',did:'done',took:'taken',came:'come',gave:'given',ate:'eaten',wrote:'written',spoke:'spoken',broke:'broken',chose:'chosen',drove:'driven',ran:'run',swam:'swum',flew:'flown',threw:'thrown',wore:'worn',knew:'known',grew:'grown',drew:'drawn',fell:'fallen',rose:'risen',began:'begun',drank:'drunk',sang:'sung',forgot:'forgotten',froze:'frozen',hid:'hidden',rode:'ridden',rang:'rung',stole:'stolen',woke:'woken',bore:'borne',shook:'shaken',tore:'torn'};
  // 简单过去式 → 原形（TEN-005 / VERB-004 等，保持与既有词表逐项一致）
  dict.PAST_BASE = {went:'go',saw:'see',had:'have',did:'do',was:'be',were:'be',made:'make',took:'take',came:'come',got:'get',gave:'give',said:'say',told:'tell',thought:'think',found:'find',left:'leave',met:'meet',knew:'know',became:'become',held:'hold',kept:'keep',built:'build',bought:'buy',caught:'catch',taught:'teach',won:'win',broke:'break',wrote:'write',read:'read',ran:'run',felt:'feel',heard:'hear',sent:'send',put:'put',stood:'stand',understood:'understand',drove:'drive',ate:'eat',spoke:'speak',chose:'choose',brought:'bring',spent:'spend',showed:'show',slept:'sleep',drank:'drink',swam:'swim',drew:'draw',flew:'fly',threw:'throw',wore:'wear'};
  // 动词原形 → 过去分词（只收原形与过去分词不同的词）
  dict.PP_FROM_BASE = {show:'shown',prove:'proven',write:'written',send:'sent',take:'taken',give:'given',make:'made',do:'done',see:'seen',find:'found',hold:'held',know:'known',break:'broken',choose:'chosen',drive:'driven',eat:'eaten',forget:'forgotten',freeze:'frozen',hide:'hidden',ride:'ridden',ring:'rung',speak:'spoken',steal:'stolen',swim:'swum',throw:'thrown',wear:'worn',wake:'woken',begin:'begun',drink:'drunk',sing:'sung',go:'gone',lie:'lain'};

  // 后接不定式(to do)的常见动词：漏 to 时报错
  dict.TO_VERBS = {want:1,hope:1,decide:1,plan:1,expect:1,agree:1,refuse:1,pretend:1,offer:1,learn:1,manage:1,choose:1,afford:1,attempt:1,intend:1,deserve:1,promise:1};
  // 动名词还原为原形时的补 e 例外
  dict.GERUND_E = {mak:'make',tak:'take',us:'use',writ:'write',driv:'drive',hav:'have',giv:'give',com:'come',bec:'become',mov:'move',choos:'choose',los:'lose',car:'care',shar:'share',hop:'hope',danc:'dance',fac:'face',decid:'decide',improv:'improve',includ:'include',provid:'provide',achiev:'achieve',compar:'compare',creat:'create',increas:'increase',reduc:'reduce',produc:'produce',introduc:'introduce',agre:'agree',manag:'manage',prepar:'prepare',explor:'explore',requir:'require',deserv:'deserve',refus:'refuse',pretend:'pretend',arriv:'arrive',advanc:'advance',merg:'merge',revers:'reverse',combin:'combine',emphasiz:'emphasize',criticiz:'criticize',recogniz:'recognize',realiz:'realize',summariz:'summarize',organiz:'organize',minimiz:'minimize',analyz:'analyze',paralyz:'paralyze'};

  // ---------------- 词形工具 ----------------
  morph.pluralize = function (w) {
    if (dict.PLURAL_IRREG[w]) return dict.PLURAL_IRREG[w];
    if (/(s|x|z|ch|sh)$/i.test(w)) return w + 'es';
    if (/[^aeiou]y$/i.test(w)) return w.slice(0, -1) + 'ies';
    if (/fe$/i.test(w)) return w.slice(0, -2) + 'ves';
    if (/f$/i.test(w)) return w.slice(0, -1) + 'ves';
    return w + 's';
  };
  morph.nounSingular = function (w) {
    for (var k in dict.PLURAL_IRREG) { if (dict.PLURAL_IRREG[k] === w) return k; }
    if (/ies$/i.test(w)) return w.slice(0, -3) + 'y';
    if (/(ches|shes|xes|zes|sses)$/i.test(w)) return w.slice(0, -2);
    if (/s$/i.test(w)) return w.slice(0, -1);
    return w;
  };
  morph.gerund = function (w) {
    if (/[^aeiou]e$/i.test(w)) return w.slice(0, -1) + 'ing';
    if (/^(run|sit|get|put|begin|stop|swim|plan|drop|refer|prefer|occur|admit|permit)$/i.test(w)) return w + w.slice(-1) + 'ing';
    return w + 'ing';
  };
  morph.deGerund = function (w) {
    if (!/ing$/i.test(w)) return w; var s = w.slice(0, -3);
    if (/([bcdfgklmnprtvz])\1$/i.test(s)) return s.slice(0, -1);
    if (dict.GERUND_E[s]) return dict.GERUND_E[s];
    if (/i$/i.test(s)) return s.slice(0, -1) + 'y';
    return s;
  };
  morph.baseFromEd = function (w) {
    if (!/ed$/i.test(w)) return w; var s = w.slice(0, -2);
    if (/([bcdfgklmnprtvz])\1$/i.test(s)) return s.slice(0, -1);
    if (dict.GERUND_E[s]) return dict.GERUND_E[s];
    if (/i$/i.test(s)) return s.slice(0, -1) + 'y';
    return s;
  };
  morph.thirdBase = function (w) {
    if (w === 'goes') return 'go';
    if (w === 'does') return 'do';
    if (w === 'has') return 'have';
    if (w === 'is') return 'be';
    if (/ies$/i.test(w)) return w.slice(0, -3) + 'y';
    if (/(ches|shes|sses|xes|zes|oes)$/i.test(w)) return w.slice(0, -2);
    return w.replace(/s$/i, '');
  };
})(typeof window !== 'undefined' ? window : null);
