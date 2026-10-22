/* dictionaries/prepositions.js
 * 介词表、固定搭配白名单与介词搭配纠错表。
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var dict = GC.dict = GC.dict || {};

  // 常用介词（含兼作介词的高频词）
  dict.PREPS = {of:1,in:1,on:1,at:1,by:1,for:1,with:1,about:1,from:1,into:1,after:1,before:1,between:1,under:1,during:1,through:1,without:1,along:1,across:1,among:1,against:1,around:1,over:1,up:1,down:1,as:1,than:1};

  // 固定搭配：错误搭配 → 正确形式（'' 表示去掉该介词）
  dict.V_PREP_RULE = {'depend of':'on','reply of':'to','arrive to':'at','discuss about':'','emphasize on':'','marry with':'','mention about':''};
  dict.N_PREP_RULE = {'solution of':'to','reason of':'for','answer of':'to','key of':'to'};

  // 常见固定搭配白名单：落在命中区间内的规则判定一律放行，避免把地道搭配误判为错误
  dict.FIXED_PHRASES = [
    'used to', 'be used to', 'get used to',
    'take effect', 'takes effect', 'took effect', 'taking effect', 'taken effect',
    'come into effect', 'came into effect', 'bring into effect', 'in effect',
    'into account', 'take into account', 'takes into account', 'took into account', 'taking into account', 'taken into account',
    'account for', 'accounts for', 'accounted for', 'accounting for',
    'take part in', 'took part in', 'takes part in', 'taking part in',
    'take place', 'took place', 'takes place', 'taking place',
    'make progress', 'made progress', 'makes progress', 'making progress',
    'play a role in', 'plays a role in', 'played a role in', 'playing a role in', 'play an important role in',
    'pay attention to', 'pays attention to', 'paid attention to', 'paying attention to',
    'in terms of', 'in addition to', 'in spite of', 'in contrast to', 'in line with',
    'in general', 'in particular', 'in fact', 'in advance', 'in short', 'in brief',
    'at present', 'at least', 'at most', 'at the same time',
    'on average', 'on the other hand', 'on the whole', 'on behalf of',
    'by contrast', 'by means of', 'by no means',
    'as a result of', 'as a whole', 'as well as', 'as a matter of fact',
    'for example', 'for instance', 'for the sake of',
    'due to', 'owing to', 'thanks to', 'according to', 'regardless of',
    'apart from', 'instead of', 'rather than', 'in case of', 'in favor of',
    'with regard to', 'with respect to', 'in accordance with', 'in relation to',
    'be based on', 'is based on', 'are based on', 'was based on', 'were based on',
    'be related to', 'is related to', 'are related to',
    'be consistent with', 'is consistent with', 'are consistent with',
    'be responsible for', 'is responsible for', 'are responsible for',
    'be interested in', 'is interested in', 'are interested in',
    'be capable of', 'is capable of', 'are capable of',
    'be likely to', 'is likely to', 'are likely to',
    'be applied to', 'is applied to', 'are applied to',
    'be committed to', 'is committed to', 'are committed to',
    'look forward to', 'looks forward to', 'looking forward to', 'looked forward to',
    'succeed in', 'succeeds in', 'succeeded in',
    'carry out', 'carried out', 'carries out', 'carrying out',
    'focus on', 'focuses on', 'focused on', 'focusing on',
    'refer to', 'refers to', 'referred to', 'referring to',
    'lead to', 'leads to', 'led to', 'leading to',
    'result in', 'results in', 'resulted in', 'resulting in',
    'contribute to', 'contributes to', 'contributed to', 'contributing to',
    'depend on', 'depends on', 'depended on', 'depending on',
    'rely on', 'relies on', 'relied on', 'relying on',
    'lie in', 'lies in', 'lay in',
    'such as', 'so that', 'no doubt', 'no longer', 'no matter'
  ];

  // 形容词/副词 + 误用介词（PREP-007）：错误 → 正确介词
  dict.ADJ_PREP_ERR = {
    'interested on':'in','interested at':'in','interested about':'in','interested for':'in',
    'afraid from':'of','afraid with':'of','responsible of':'for','aware about':'of','capable to':'of',
    'regardless to':'of','regarding to':'regarding'
  };
})(typeof window !== 'undefined' ? window : null);
