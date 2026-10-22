/* dictionaries/uncountables.js
 * 不可数名词、可数性特例、冠词专名白名单与封闭类功能词表。
 * 所有表挂在 window.GrammarChecker.dict 下，供核心层与各规则文件共享。
 */
(function (global) {
  'use strict';
  if (!global) return;
  var GC = global.GrammarChecker = global.GrammarChecker || {};
  var dict = GC.dict = GC.dict || {};

  // ---------------- 可数性 ----------------
  dict.UNCOUNTABLE = {water:1,milk:1,juice:1,oil:1,rice:1,bread:1,sugar:1,salt:1,food:1,money:1,information:1,knowledge:1,advice:1,research:1,evidence:1,progress:1,news:1,furniture:1,equipment:1,baggage:1,luggage:1,traffic:1,weather:1,work:1,software:1,pollution:1,nature:1,literature:1,music:1,education:1,math:1,mathematics:1,physics:1,behaviour:1,behavior:1,'homework':1,'meat':1,'beef':1,'pork':1,'chicken':1,'fish':1,'toast':1,noise:1,damage:1,feedback:1,transport:1,transportation:1,accommodation:1,advertising:1,employment:1,rain:1,snow:1,warmth:1,darkness:1,oxygen:1,hydrogen:1,training:1,housework:1,machinery:1,scenery:1,poetry:1,merchandise:1,offspring:1,cattle:1,rubbish:1,garbage:1,funding:1};
  // 不可数名词的复数形式在特定语境下合法，NOUN-001 放行
  dict.PLURAL_OK = {waters:1,oils:1,foods:1,sugars:1,salts:1,moneys:1,monies:1,works:1,behaviours:1,behaviors:1,maths:1,peoples:1,fishes:1,damages:1};
  // 本身无动词用法、复数形式必错的不可数名词（即使被误标为 Verb 也判错）
  dict.NOUN_STRICT = {information:1,advice:1,equipment:1,knowledge:1,furniture:1,baggage:1,luggage:1,software:1,homework:1,pollution:1};
  // each/every 等不可直接修饰的不可数抽象名词
  dict.EACH_NOUN = {information:1,advice:1,knowledge:1,research:1,evidence:1,progress:1,equipment:1,furniture:1,homework:1,news:1,feedback:1};
  // 以 s 结尾但为单数的学科/疾病名
  dict.PHYS_S = /^(news|maths|math|mathematics|physics|economics|ethics|statistics|politics|linguistics|electronics|genetics|athletics|gymnastics|measles|rabies)$/;
  // a/an 之后不应误判为缺限定词单数名词的词（代词宾格、地点/时间副词、指示词等）
  dict.NOUN_SKIP = {him:1,her:1,them:1,us:1,me:1,you:1,here:1,there:1,now:1,then:1,it:1,this:1,that:1,these:1,those:1,each:1,every:1};
  dict.MEASURE_WORDS = {cup:1,glass:1,piece:1,bottle:1,box:1,group:1,lot:1,number:1,variety:1,range:1,kind:1,type:1,bit:1,loaf:1,slice:1,bowl:1,bag:1,packet:1,pair:1,set:1,liter:1,litre:1,kilo:1,grain:1,drop:1};
  dict.UNIQUE_NOUNS = {sun:1,moon:1,world:1,internet:1};
  // 名词/动词同形且易歧义的词，ART-002（缺冠词）不判定
  dict.NOUN_VERB_HOMO = {rise:1,fall:1,grow:1,matter:1,help:1,hope:1,change:1,remain:1,differ:1,increase:1,decrease:1,decline:1,report:1,study:1,work:1,damage:1,rose:1,risen:1,fell:1,fallen:1,grew:1,grown:1,drew:1,drawn:1,threw:1,thrown:1};
  // 抽象/物质名词：单数形式前常无需冠词，ART-002 放行
  dict.ABSTRACT_NOUN = {attention:1,influence:1,health:1,hope:1,biodiversity:1,moral:1,importance:1,significance:1,awareness:1,success:1,failure:1,quality:1,safety:1,growth:1,development:1,access:1,support:1,control:1,responsibility:1,pressure:1,exposure:1};
  // 集合名词（SVA-008）
  dict.COLLECTIVE = {family:1,team:1,class:1,group:1,committee:1,staff:1,audience:1,government:1,public:1,crew:1};

  // ---------------- 冠词 a/an 发音例外 ----------------
  dict.SOUND_AN = {hour:1,honest:1,honor:1,honour:1,heir:1};
  dict.SOUND_A = {university:1,unique:1,united:1,uniform:1,universal:1,user:1,european:1,one:1,once:1,useful:1,union:1,unit:1,use:1};

  // ---------------- 专有名词 / the 白名单（ART-005/006）----------------
  dict.COUNTRY_OK = {'united states':1,'united kingdom':1,us:1,usa:1,uk:1};
  // 官方/惯用名称本就带 the（避免 ART-006 误判）
  dict.THE_OK = {netherlands:1,philippines:1,maldives:1,seychelles:1,bahamas:1,alps:1,andes:1,himalayas:1,rockies:1};
  // 本就该带 the 的专有名称特征词（河流/海洋/山脉/方位/共和国等），ART-006 放行
  dict.GEO_THE = {river:1,rivers:1,ocean:1,oceans:1,sea:1,seas:1,gulf:1,bay:1,strait:1,canal:1,lake:1,lakes:1,mountain:1,mountains:1,desert:1,valley:1,coast:1,peninsula:1,island:1,islands:1,republic:1,kingdom:1,union:1,federation:1,emirates:1,states:1,region:1,north:1,south:1,east:1,west:1,hague:1,earth:1};
  // 「the + 名词」为正常用法、但常被 compromise 误标为专有名词的词，ART-006 放行
  dict.COMMON_NOUN_WHITELIST = {police:1,government:1,public:1,staff:1,audience:1,crew:1,masses:1,majority:1,company:1,team:1,model:1,method:1,approach:1,study:1,paper:1,article:1,report:1,result:1,data:1,analysis:1,survey:1,system:1,project:1,university:1,college:1,school:1,hospital:1,city:1,country:1,world:1,internet:1,market:1,industry:1,technology:1,energy:1,health:1,table:1,figure:1,chapter:1,students:1,teacher:1,teachers:1,researcher:1,researchers:1,participants:1,respondents:1,author:1,authors:1,journal:1,bank:1,firm:1,sector:1,group:1,region:1};
  dict.ORDINALS = {first:1,second:1,third:1,fourth:1,fifth:1,sixth:1,seventh:1,eighth:1,ninth:1,tenth:1};
  dict.SPORTS = {football:1,basketball:1,soccer:1,baseball:1,tennis:1,golf:1,chess:1,volleyball:1,badminton:1,swimming:1,skiing:1,hockey:1,rugby:1,cricket:1};

  // ---------------- 封闭类功能词 ----------------
  dict.MODALS = {can:1,could:1,may:1,might:1,must:1,shall:1,should:1,will:1,would:1,wo:1,'won\'t':1,cannot:1,do:1,does:1,did:1};
  dict.DETERMINERS = {the:1,a:1,an:1,this:1,that:1,these:1,those:1,my:1,your:1,his:1,her:1,its:1,our:1,their:1,some:1,any:1,each:1,every:1,no:1,both:1,all:1,several:1,'another':1,'other':1};
  dict.POSSESSIVE = {my:1,your:1,his:1,her:1,its:1,our:1,their:1,whose:1};
  // 限定词（含物主代词）：二者不能连用
  dict.POSS_DET = {my:1,your:1,his:1,her:1,its:1,our:1,their:1};
  dict.CENTRAL_DET = {the:1,a:1,an:1,this:1,these:1,those:1,some:1,any:1,no:1,every:1,each:1,another:1,neither:1,either:1};
  dict.INDEF = {everyone:1,everybody:1,someone:1,somebody:1,anyone:1,anybody:1,nobody:1,nothing:1,everything:1};
  // 口语叹词（学术写作不宜）
  dict.INTERJECTION = {oh:1,wow:1,oops:1,whoa:1,yay:1,hurrah:1,hooray:1,gosh:1,gee:1,ouch:1,yikes:1,hmm:1,uh:1,um:1,hey:1,yeah:1,yep:1,nope:1,hi:1};
  dict.INNER_WORDS = {'together with':1,'along with':1,'as well as':1,including:1};

  // ---------------- 比较 / 冗余 ----------------
  // 比较级词表：其后的 then 应为 than
  dict.COMPARATIVE = {more:1,less:1,fewer:1,greater:1,higher:1,lower:1,bigger:1,smaller:1,better:1,worse:1,other:1,rather:1,earlier:1,later:1,longer:1,shorter:1,larger:1,faster:1,slower:1,older:1,younger:1,easier:1,stronger:1,weaker:1,cheaper:1,richer:1,poorer:1,harsher:1,harder:1,deeper:1,wider:1,heavier:1,closer:1,nicer:1,safer:1};
  // 最高级词表：其前的 most 冗余
  dict.SUPERLATIVE = {best:1,worst:1,fastest:1,biggest:1,smallest:1,largest:1,highest:1,lowest:1,greatest:1,easiest:1,hardest:1,strongest:1,cheapest:1,richest:1,poorest:1,oldest:1,youngest:1,longest:1,shortest:1,earliest:1,latest:1,deepest:1,widest:1,heaviest:1,closest:1,nicest:1,safest:1};
  // 语义重复（冗余）搭配：错误 → 精简后
  dict.REDUNDANT = {'repeat again':'repeat','return back':'return','advance forward':'advance','past history':'history','new innovation':'innovation','free gift':'gift','basic fundamentals':'fundamentals','unexpected surprise':'surprise','reverse back':'reverse','merge together':'merge','still remains':'remains','mutual cooperation':'cooperation','repeat once again':'repeat'};
})(typeof window !== 'undefined' ? window : null);
