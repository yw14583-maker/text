const PROFILE_CONFIG =Object.freeze({
        major:"工业设计",
        className: "25-1",
        name: "吴嘉俊"
    });
    const questions = [
        {
            id: 1,
            title: "1: 多地形自适应机器人",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Robotic locomotion through active and passive morphological adaptation in extreme outdoor environments, based on the Chinese outline below. Cover all the points in your own words.\n背景：机器人在复杂环境中的灵活性仍不及动物，多数依赖复杂传感系统(sensing systems)，限制了其应用。\n目的：提出一种能主动改变外形以适配环境的机器人，提升复杂地形通过能力。\n方法：开发可在扁平(flat)与圆形形态间切换的机器人，实现驾驶、滚动与游泳多模式运动。\n结果：在4.5公里跨山区、水域与城市道路的测试中，该机器人在灵活性、能耗与可靠性上均优于传统机器人。\n结论：此类机器人有望用于环境监测、灾害响应(disaster response)与行星探测(planetary exploration)。",
            abstract: "Robots have made great progress in moving around, but they are still not as flexible and quick as animals when moving through complex environments. This limits their use in places where they could be very helpful. Most robots depend on complex sensing systems to understand their surroundings. A better approach is to let robots change their body shape to fit the environment. In this study, we developed a robot that can actively change its shape. It can switch between a flat form and a round form, which allows it to drive, roll, and swim across different types of ground. The robot does not need many sensors because its flexible body can naturally adapt to the environment. We tested the robot on a 4.5-kilometer path across mountains, water, and city streets. It performed better than traditional robots in terms of flexibility, energy use, and reliability. This kind of robot could be useful for many tasks, such as monitoring the environment, responding to disasters, and exploring other planets.",
            keywords: "robot; complex environment; shape change; multi-terrain movement; flexible body;"
        },
        {
            id: 2,
            title: "2: 上海市垃圾分类",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on The Effectiveness of the Garbage Classification Regulation in Shanghai, based on the Chinese outline below. Cover all the points in your own words.\n背景：垃圾分类(garbage classification)是环境保护的重要组成部分，但其法规实施效果尚不明确。\n目的：探究上海市现行垃圾分类法规的实施效果。\n方法：于2015年5月对上海市居民与环卫工人开展问卷调查(n=300)，并对部分小区居民与垃圾处理站环卫工人进行实地访谈。\n结果：尽管大多数受访者知晓垃圾分类的益处，但是仅有31%的受访者已养成良好的垃圾分类习惯，主要原因在于公众对环境保护意识的缺乏。",
            abstract: "Garbage classification, a significant part of environment protection, has drawn increasing attention of both the public and the government. In order to explore the effectiveness of the current regulation on garbage classification in Shanghai, a survey via questionnaires (n=300) was conducted in May,2015 among residents and sanitation workers in Shanghai on their awareness of and attitudes toward garbage classification. An interview was also conducted in some housing estates and garbage management stations. The study reveals that despite most respondents’ awareness of the benefits of garbage classification,only 31% of them have formed such a good habit. Lack of the awareness of environment protection is the primary reason for the gap. Respondents’ poor knowledge of the garbage management and classification is also to blame.",
            keywords: "urban domestic garbage; garbage regulation; garbage classification; Shanghai"
        },
        {
            id: 3,
            title: "3: 早课与学生学业成果",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Early morning university classes are associated with impaired sleep and academic performance, based on the Chinese outline below. Cover all the points in your own words.\n背景：上课出勤与充足睡眠对学生的学业成功至关重要。\n目的：检验清晨上课是否与较低出勤率、较短睡眠及较差学业表现相关。\n方法：分析23,391名学生Wi-Fi连接日志(Wi-Fi connection logs)、39,458名学生系统登录与181名学生活动记录仪(actigraphy)数据及33,818名学生成绩。\n结果：8:00课程出勤率低10个百分点；清晨上课组的夜间睡眠时长比晚课组短一小时；学生每周参加清晨课程的天数与其平均绩点呈负相关。\n结论：清晨上课与学习成效之间存在关联。",
            abstract: "Attending classes and sleeping well are important for students’ academic success. Here, we tested whether early morning classes are associated with lower attendance, shorter sleep and poorer academic achievement by analyzing university students’ digital traces. Wi-Fi connection logs in 23,391 students revealed that lecture attendance was about ten percentage points lower for classes at 08:00 compared with later start times. Diurnal patterns of Learning Management System logins in 39,458 students and actigraphy data in 181 students demonstrated that nocturnal sleep was an hour shorter for early classes because students woke up earlier than usual. Analyses of grades in 33,818 students showed that the number of days per week they had morning classes was negatively correlated with grade point average. These findings suggest concerning associations between early morning classes and learning outcomes.",
            keywords: "University students; Morning classes; Class attendance; Sleep duration; Academic performance"
        },
        {
            id: 4,
            title: "4: 气候变化与物种灭绝",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Climate change extinctions, based on the Chinese outline below. Cover all the points in your own words.\n背景：气候变化预计对生物多样性(biodiversity)造成不可逆的影响，但其具体风险究竟有多大，长期以来难以准确预判。\n目的：研究团队尝试对全球范围内气候变化导致的物种灭绝风险进行定量测算。\n方法：整合485项研究与超500万条预测数据，开展全球荟萃分析(meta-analysis)。\n结果：升温超过1.5℃时，物种灭绝加速；温室气体高排放情景下约三分之一物种受到威胁；两栖动物与山地、岛屿、淡水物种风险最高。\n结论：除控制温室气体外，明确优先保护物种是维系生物多样性的关键。",
            abstract: "Climate change is expected to cause irreversible changes to biodiversity, but predicting those risks remains uncertain. I synthesized 485 studies and more than 5 million projections to produce a quantitative global assessment of climate change extinctions. With increased certainty, this meta-analysis suggests that extinctions will accelerate rapidly if global temperatures exceed 1.5°C. The highest-emission scenario would threaten approximately one-third of species, globally. Amphibians; species from mountain, island, and freshwater ecosystems; and species inhabiting South America, Australia, and New Zealand face the greatest threats. In line with predictions, climate change has contributed to an increasing proportion of observed global extinctions since 1970. Besides limiting greenhouse gases, pinpointing which species to protect first will be critical for preserving biodiversity until anthropogenic climate change is halted and reversed.",
            keywords: "climate change; biodiversity; species extinction; meta-analysis; global warming; endangered species"
        },
        {
            id: 5,
            title: "5: 长江禁渔与生物多样性修复",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Fishing ban halts seven decades of biodiversity decline in the Yangtze River, based on the Chinese outline below. Cover all the points in your own words.\n背景：自20世纪50年代起，中国经济的快速发展引发了前所未有的淡水生物多样性(freshwater biodiversity)危机。\n目的：评估2021年长江禁渔令(fishing ban)这一大规模保护行动的有效性。\n方法：对比禁渔前后(2018至2023)长江干流鱼类群落(fish communities)状况。\n结果：七十年的生物多样性衰退态势已得到遏制，鱼类生物量(fish biomass)、个体健康状况与物种多样性得到改善，受威胁物种初步恢复。\n结论：大规模的保护行动能够遏制长江流域生物多样性的丧失，为其他大型河流的生物多样性的恢复带来了希望。",
            abstract: "China’s rapid economic development has triggered an unparalleled freshwater biodiversity crisis since the 1950s. To restore fisheries resources, the Yangtze River Fishing Ban was implemented in 2021 to cease all basin-wide commercial fishing. We evaluate the effectiveness of this large-scale conservation action by assessing fish communities across main-stem habitats before and after the ban (2018 to 2023). The seven-decadal biodiversity loss was halted with improvements in fish biomass, body condition, species diversity, and initial recovery of threatened species. Eliminating fishing pressure was likely key to this recovery, in addition to actions targeting water quality improvement, hydrological and riparian habitat restoration, and vessel traffic reduction. Ambitious conservation actions can halt biodiversity loss in the Yangtze River, bringing hope for biodiversity recovery in other large rivers.",
            keywords: "Yangtze river; fishing ban; biodiversity recovery; fish community; freshwater ecosystem; ecological conservation"
        },
        {
            id: 6,
            title: "6: 全球肥胖问题",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Obesity rise plateaus in developed nations and accelerates in developing nations, based on the Chinese outline below. Cover all the points in your own words.\n背景：过去全球肥胖报告普遍依赖长期比较，缺乏对动态变化的详细分析，这导致了对肥胖趋势过于简化的认识。\n目的：分析1980至2024年全球肥胖群体变化趋势及其驱动因素。\n方法：基于4,050项人群研究、2.32亿受试者的身高、体重数据开展趋势分析。\n结果：高收入国家儿童青少年肥胖率在90年代放缓并进入平台期(plateau)，2000年后略有下降；中低收入国家持续上升。\n结论：全球肥胖趋势呈现显著差异，根源在于食物获取与消费环节存在社会、经济及技术条件的不同，欠发达地区亟需制定针对性的政策加以干预。",
            abstract: "Global obesity reports usually rely on long-term comparisons and lack detailed dynamic analysis. Based on height and weight data from 232 million participants across 4,050 population-based studies, this study analyzed global obesity trends from 1980 to 2024. In high-income countries, the rising obesity rate among children and adolescents slowed in the 1990s and later plateaued, with slight declines observed after 2000. Adult obesity growth followed a similar but delayed slowing trend. Obesity prevalence continues to rise or remain high in most low- and middle-income countries. The distinct global obesity trends are driven by social, economic and technological differences related to food access and consumption, indicating targeted policy interventions are essential for less developed regions.",
            keywords: "obesity; prevalence trend; global population; high-income countries; policy intervention"
        },
        {
            id: 7,
            title: "7: 自然绘画的疗愈体验设计",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on When Darkness Brings Light: Framing Healing Experience through Nature Paintings to Stimulate Negative and Positive Emotions, based on the Chinese outline below. Cover all the points in your own words.\n背景：自然风景画能引发丰富多样的情绪，但它能否用于心理疗愈，目前研究还很少。\n目的：探讨引导式艺术治疗对情绪改善的效果：通过让受试者观看自然风景画，激发其负面与正面两类情绪体验，进而考察这种体验能否支持心理疗愈。\n方法：基于外化技术(externalization technique)，采用16幅专家精选画作实施引导式艺术治疗(art therapy)，开展在线实验。\n结果：治疗后情绪显著改善，低心理韧性( resilience)群体改善幅度更大；定性分析提炼出六个创伤体验主题与七个疗愈体验主题。\n结论：在整合多元疗愈路径的基础上，提出概念框架(conceptual framework)，为设计个性化疗愈体验提供参考。",
            abstract: "Nature paintings can provoke dynamic emotional experiences. However, their therapeutic potential beyond merely inducing positive emotions remains underexplored. Informed by the externalization technique from post-trauma therapy, we stimulate both negative and positive emotional experiences through visual engagement with nature paintings. Further, we investigate their potential in supporting healing, along with the influence of personal traits and the severity of illness. Using 16 expert-curated paintings depicting distinctive emotions, we take a guided art therapy approach. Participants reflected on past illnesses and imagined healing journeys using negative and positive paintings of their choice, respectively. The result of an online experiment yielded significant mood enhancement after the guided art therapy, with the effect being significantly stronger in the lower resilience group. Qualitative analysis revealed six themes that conceptualize individuals’ traumatic experiences and seven themes for healing experiences. The severity of illness influenced which of these themes were dominant in art-induced healing experiences. Integrating diverse pathways to healing, we introduce a conceptual framework and discuss design implications for creating personalized healing experiences.",
            keywords: "nature paintings; art therapy; emotional experience; healing; resilience"
        },
        {
            id: 8,
            title: "8: 语言多样性的兴衰",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on The rise and fall of language diversity through the Holocene, based on the Chinese outline below. Cover all the points in your own words.\n背景：语言多样性的形成因素关乎人类历史、文化与认知的理解。\n目的：探究全球语言多样性的演变轨迹及其驱动因素。\n方法：结合统计建模与社会计算建模进行模拟分析。\n结果：人口的繁衍与增长，带来了语言种类的日益繁盛。然而，语言多样性的大幅减少并非始于近代殖民扩张( colonial expansion)时期，而是在多民族帝国(multinational empires)首次伴随其语言与文化向外扩张之时便已开始。\n结论：语言多样性的流失在塑造语言与文化多样性中的作用远超预期。",
            abstract: "Characterizing the factors that have shaped linguistic diversity is fundamental for understanding human history, culture, and cognition. In this study, we combined statistical and social computational modeling to model trajectories of global linguistic diversity. Before the onset of plant and animal domestication, the number of languages was smaller than it is today. Subsequent increases in global population precipitated increased linguistic diversity. We uncovered a linguistic “golden age” with tens of thousands of languages 3000 to 1000 years ago. Great loss of linguistic diversity did not begin with recent colonial expansion but as multinational empires first spread along with their languages and cultures. Thus, extinction has likely played a much greater role in shaping linguistic and cultural diversity than previously thought.",
            keywords: "linguistic diversity, language extinction, ethnographic data, computational modeling"
        },
        {
            id: 9,
            title: "9: 牛磺酸缺乏与衰老",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Taurine deficiency as a driver of aging, based on the Chinese outline below. Cover all the points in your own words.\n背景：衰老与循环血液中多种分子(molecule)水平的变化有关，但其中一些变化的具体分子身份或生物学意义尚不明确。\n目的：探究牛磺酸(taurine)浓度下降是否为衰老的驱动因素。\n方法：首先在小鼠、猴子和人类中检测牛磺酸浓度随年龄的变化；随后对中年小鼠进行牛磺酸补充，评估其骨骼、肌肉、大脑、免疫等多项健康指标，并在人类中分析牛磺酸水平与疾病及运动的关系。\n结果：牛磺酸(taurine)浓度随年龄增长而下降；补充牛磺酸可延长小鼠的健康寿命和预期寿命，猴子也获得健康收益，中年小鼠多项身体机能明显改善；人类中牛磺酸水平越低，患年龄相关疾病越多，耐力运动后浓度则会升高。\n结论：牛磺酸(taurine)缺乏可能是衰老的一个驱动因素，但要证实它是否同样导致人类衰老，还需开展长期、严格对照的人体补充试验。",
            abstract: "Aging is associated with changes in circulating levels of various molecules, some of which remain undefined. We find that concentrations of circulating taurine decline with aging in mice, monkeys, and humans. A reversal of this decline through taurine supplementation increased the health span and life span in mice and health span in monkeys. We, therefore, investigated the health of taurine-fed middle-aged mice and found an improved functioning of bone, muscle, brain, fat and immune system, indicating an overall improvement in health. In humans, lower taurine concentrations correlated with several age-related diseases and taurine concentrations increased after acute endurance exercise. Thus, taurine deficiency may be a driver of aging because its reversal increases health span in worms, rodents, and primates and life span in worms and rodents. To test whether taurine deficiency is a driver of aging in humans as well, long-term, well-controlled taurine supplementation trials are needed.",
            keywords: "taurine, aging, health span, life span, age-related diseases"
        },
        {
            id: 10,
            title: "10: 智能美学设计",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Designing Aesthetics of Intelligence, based on the Chinese outline below. Cover all the points in your own words.\n背景：设计与美学始终与新兴技术(emerging technology)相伴发展。\n目的：探讨人工智能如何与设计及美学产生关联，并提出指导原则。\n方法：通过设计典范案例，追溯外观、交互与转化三波设计美学浪潮中的审美历程。\n结果：由此引出第四波“智能美学”(aesthetics of intelligence)。\n结论：提出五项原则，为智能时代提供美学指南(aesthetic compass)。",
            abstract: "Design and aesthetics have always been in a relationship with emerging technology and materials, as each advancement in technology offered and required new opportunities for design and aesthetics. In this piece I want to offer my perspective on how Artificial Intelligence and its technologies can relate to design and aesthetics. Through design exemplars, I will trace my own journey and aesthetic values across three previous waves of design aesthetics: appearance, interaction, and transformation, to arrive at a fourth wave of \"aesthetics of intelligence.\" I will propose five principles that might help to offer an aesthetic compass for navigating these challenging times.",
            keywords: "artificial Intelligence; design aesthetics; aesthetics of intelligence; interaction design, transformation"
        },
        {
            id: 11,
            title: "11: 旅游地碳排放",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on A Framework to Help Destinations Manage Carbon Risk from Aviation, based on the Chinese outline below. Cover all the points in your own words.\n背景： 全球旅游业蓬勃发展，航空旅行需求持续增长，但旅客出行产生的碳足迹使目的地在吸引更多游客时面临更加复杂的决策难题。\n目的： 评估旅客往返目的地所蕴含的碳风险，帮助目的地认识其在经济、金融、社会和环境成本方面的绝对风险与相对风险。\n方法： 采用以需求为导向的分析思路，提出十项碳风险指标，并选取四个机场作为案例进行对比评估。\n结果： 生成了碳相关、旅客相关和航线相关指标的全球基准，列出了受碳风险影响最大的目的地名单，揭示了旅客规模、地理位置、航线网络及出行行为等因素对风险暴露程度的差异化影响。\n结论：为目的地应对碳风险提供针对性建议。",
            abstract: "Global tourism is booming, and so is demand for air travel. Recognizing that travelers come with a carbon footprint increases the complexity of decision-making for destinations that seek to attract more visitors. The carbon risk inherent in travel to and from a destination could be substantial but current approaches of accounting and lack of transparent data impede a full understanding of exposure and trends. This research therefore takes a demand-focused approach and proposes ten carbon risk indicators that help destinations assess their absolute and relative risk to the economic, financial, social, and environmental costs of carbon. The analysis generates global benchmarks for carbon-, passenger- and itinerary-related indicators, and presents a list of most exposed destinations, approximated by departure airports. A comparative assessment of four airports highlights how differences in passenger volumes, geography, route network and travel behaviour by markets influence exposure. Recommendations for destinations are provided.",
            keywords: "carbon risk; aviation destinations; indicators; itineraries; emissions"
        },
        {
            id: 12,
            title: "12: 智能可穿戴设备",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Health Monitoring Through Wearable Technologies for Older Adults: Smart Wearables Acceptance Model, based on the Chinese outline below. Cover all the points in your own words.\n背景：当前，人口老龄化趋势日益加剧，老年人医疗与长期照护需求持续增长，给社会带来了沉重负担。\n目的：探究老年人接受智能可穿戴系统(smart wearable systems)的影响因素。\n方法：运用结构方程模型(structural equation modeling)构建接受模型，采集146名60岁及以上成年人的问卷样本进行了验证。\n结果：感知有用性、系统兼容性、便利条件以及自我健康评价均对老年人的使用意愿具有显著正向影响。\n结论：为提升老年人技术接受度提供实践启示。",
            abstract: "In the context of a fast aging population, widespread usage of smart wearable systems can alleviate the social burden caused by the increasing need of older adults for healthcare and assistance. To facilitate and encourage the use of smart wearable systems among older adults, this study investigated the factors that contribute to the acceptance of such systems, and smart wearables acceptance model for older adults was developed using structural equation modeling. The model was validated using 146 survey samples collected from adults aged 60 years and above. The results indicated that perceived usefulness, compatibility, facilitating conditions, and self-reported health status significantly and positively affect older adults’ intention to use such technologies. Useful implications and insights were provided to future researchers and practitioners to enhance older adults’ acceptance of smart wearable systems.",
            keywords: "smart wearable systems; health monitoring; telehealth; older adults; technology acceptance"
        },
        {
            id: 13,
            title: "13: 转基因食品调查",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on A Survey of College Students’ Attitudes Toward GM Foods, based on the Chinese outline below. Cover all the points in your own words.\n背景：生物技术已用于食品生产，但可能影响人体健康。\n目的：了解大学生对转基因食品(genetically modified foods)的接受度及其态度是否因产品而异。\n方法：对复旦大学与同济大学210名不同背景学生开展问卷调查。\n结果：有无生物或医学背景的学生，态度差异显著。就产品接受度而言，不同产品存在差异，口味与健康是关键考量因素，价格同样影响购买意愿。",
            abstract: "Biotechnology has now been used in food production. But it might impact human health negatively. Consumers’ attitudes toward GM (genetically modified) foods are important for policy makers. The paper attempts to find to which extent college students will accept GM foods and whether their attitudes toward GM foods are product-specific or not. A survey was conducted in a total of 210 students with different academic backgrounds at Fudan University and Tongji University. The result shows that there is a great difference between the attitudes toward GM foods of students with or without an academic background of biology and medicine. It also suggests that the acceptance of GM foods is product-specific and that taste and health are two factors affecting college students’ choice. Price is also a factor which influences students’ willingness to purchase GM foods.",
            keywords: "GM foods, college students, attitudes"
        },
        {
            id: 14,
            title: "14: 表情符号在健康信息设计中的应用",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Visual-Textual Integration: Emoji as a Supplement in Health Information Design, based on the Chinese outline below. Cover all the points in your own words.\n背景：表情符号（emoji）日益普及，在健康信息传播中受关注。\n目的：探索表情符号在健康信息中的使用模式及其作为视觉语言（visual language）的潜力。\n方法：组织焦点小组（focus group）并开展设计实验，构建69个健康主题表情符号微数据库。\n结果：提出表情符号数量、使用频率与布局建议，并考察其与文字整合的指称维度。\n结论：为视觉健康传播领域提供了细致的理论洞见(theoretical insights)，并为信息设计实践提供了现实指导意义。",
            abstract: "The growing popularity of emoji has drawn attention to social media interactions, including within the context of health information. This study explored and analyzed the usage patterns of emoji in relation to health information by arranging a focus group and conducting a design experiment. To this end, we created a micro-database of 69 health-themed emoji representing various parts of speech; specifically, they could function as nouns, verbs, and adjectives simultaneously. An information design experiment was conducted to investigate how emoji could be used as a visual language to assist in the design and communication of health information. Our analysis yielded several important findings, including (1) recommendations regarding the quantity, frequency, and placement of emoji in health information; (2) an examination of the denotative aspects of emoji-word integration in visual language. This study constitutes a first step in understanding the design application paradigms of emoji in health communication and provides detailed theoretical insights into visual health communication as well as practical implications for information design.",
            keywords: "emoji; health information; visual language; health communication; information design"
        },
        {
            id: 15,
            title: "15: 精制糖对身体健康的影响",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Sugar: Friend or Foe, based on the Chinese outline below. Cover all the points in your own words.\n背景：糖广泛存在于现代饮食中，过量摄入成为健康隐患。\n目的：探讨糖尤其是精制糖 (refined sugar)的摄入究竟是健康风险还是对人体有益。\n方法：追溯糖在人类饮食中的起源，并结合多项科学研究审视其营养特性(nutritional properties)。\n结果：精制糖引发消费恶性循环( vicious cycle)，并导致一系列健康问题与疾病发生。\n结论：建议每个人反思自身饮食状况，必要时减少糖摄入以维持健康生活。",
            abstract: "This paper investigates whether sugar, especially refined sugar so prevalent in food nowadays, is more of a health risk than a health benefit. Sugar can be found, both naturally and artificially, in almost all aspects of the modern diet, and the over-consumption of sugar is a cause for concern in the modern world. The paper examines the origins of sugar in the human diet and then considers some of the nutritional properties of sugar. Based on the conclusions of various scientific research papers, it is argued that sugar, especially in its refined state, is responsible for creating a vicious cycle of consumption and a range of disturbing conditions and illnesses. The paper concludes by strongly suggesting that everybody should reflect on their diet and, if need be, reduce their sugar intake in order to maintain a healthy life.",
            keywords: "sugar; refined sugar; over-consumption; diet; health risk; nutritional properties"
        },
        {
            id: 16,
            title: "16: 大学生就业体验",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on How College Students Experience Work: Implications for Policy and Practice Development, based on the Chinese outline below. Cover all the points in your own words.\n背景：大学生职场体验项目现状有待评估与改进。\n目的：了解大学生职场体验项目现状，并提出优化建议。\n方法：采用问卷调查法，面向在校大学生及2015届毕业生发放问卷，共回收有效问卷1,459份。\n结果：满意度因薪酬与合同有无而显著不同，工作类型随参与期限变化。学生呼吁提高待遇、消除歧视并加强安全防护。\n结论：需建立制度性保障措施(institutional protection)以优化未来职场体验项目。",
            abstract: "The purpose of this study is to determine the status of work experience programs of college students and to suggest a measure for the future improvement of the work experience. A survey was conducted to the currently enrolled students of college and universities and those who graduated in 2015, and 1,459 respondents were collected and analyzed. These college students who had work experiences showed significant differences in satisfaction according to the absence or presence of salaries and written employment contracts, and they also displayed differences in terms of the types of jobs they performed depending on the participation period. Also they called for improvement of salaries, discriminative treatment and safety of work experience programs. In order to improve future work experience programs, it is necessary to establish institutional protection measures by reflecting those demands.",
            keywords: "work experience programs; college students; satisfaction; institutional protection; employment contracts"
        },
        {
            id: 17,
            title: "17: 消费者对转基因食品的态度",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Consumer Attitudes Towards Genetically Modified Foods in Sweden, based on the Chinese outline below. Cover all the points in your own words.\n目的：调查瑞典消费者对转基因食品的态度及影响因素。\n方法：向全国2,000名18至65岁居民邮寄问卷，回收786份。\n结果：多数瑞典人对转基因食品持负面态度。男性、年轻人和学历高的人接受度更高。公众的主要顾虑在于道德层面，“好吃”或“便宜”并不足以促使他们购买；但若转基因食品有利于环保或健康，购买意愿则会明显提升。",
            abstract: "The present study reports attitudes towards genetically modified (GM) foods among Swedish consumers. A random nation-wide sample of 2,000 addresses, aged 18-65 years, were mailed a questionnaire and 786 responded. Most of these consumers were rather negative about GM foods. However, males, younger respondents and those with higher level of education were more positive than were females, older respondents and those with lower level of education. A majority of the consumers had moral and ethical doubts about eating GM foods and did not perceive attributes like better taste or lower price as beneficial enough to persuade them to purchase GM foods. However, tangible benefits, like being better for the environment or healthier, seemed to increase willingness to purchase GM foods.",
            keywords: "genetically modified (GM) foods, consumer attitudes, Swedish consumers, willingness to purchase, moral and ethical doubts, tangible benefits"
        },
        {
            id: 18,
            title: "18: 野火损害与森林可燃物处理",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Wildfire damages and the cost-effective role of forest fuel treatments, based on the Chinese outline below. Cover all the points in your own words.\n背景：野火是21世纪最紧迫的环境挑战之一，长达一个世纪的灭火政策（fire suppression policies）导致森林可燃物不断积累。\n目的：评估可燃物处理在降低野火风险方面的成本效益。\n方法：整合美国西部有关野火、可燃物处理、灭火投入及灾害损失的高分辨率数据，采用准实验设计(quasi-experimental design)进行评估。\n结果：可燃物处理抑制了野火蔓延，降低了火势强度，避免了约28亿美元损失，每投入1美元可带来3.73美元的预期收益。\n结论：可燃物处理投入具有重要价值，研究为充分发挥其效能提供了指导。",
            abstract: "Wildfires are among the most pressing environmental challenges of the 21st century, intensified by the accumulation of forest fuels after a century of fire suppression policies. Although fuel-reduction treatments are a primary tool for reducing wildfire risk, they remain underutilized, partly owing to limited evidence of their economic value. In this study, we integrated high-resolution data on wildfires, fuel treatments, suppression effort, and damages across the Western United States to assess their cost-effectiveness. Using a quasi-experimental design, we found that fuel treatments reduced wildfire spread and severity, avoiding an estimated $2.8 billion in damages by limiting structure loss, cutting carbon dioxide emissions, and lowering fine particulate matter (PM2.5) exposure. Each dollar invested yielded $3.73 in expected benefits. Our findings demonstrate the value of fuel treatment investments and offer guidance for maximizing their effectiveness.",
            keywords: "wildfire; fuel treatment; cost-effectiveness; carbon dioxide emissions; PM2.5"
        },
        {
            id: 19,
            title: "19: 入侵物种对全球环境的影响",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Invasive species ’environmental impacts are more severe in the Global South, based on the Chinese outline below. Cover all the points in your own words.\n背景：外来入侵物种（invasive alien species, IAS）是生物多样性的主要威胁，但其影响的分布格局尚不清楚。\n目的：揭示外来入侵物种对全球环境影响的真实分布格局。\n方法：利用新建立的全球标准化影响测量数据库，计算各国的平均影响严重程度。\n结果：尽管全球北方的报告数量是南方国家的两倍多，全球南方所受影响的严重程度反而更高，治理薄弱和管理能力有限是主要原因。\n结论：经济增长迅速但治理薄弱的新兴经济体尤其脆弱，应引导各方关注真正最受威胁的地区。",
            abstract: "Invasive alien species (IAS) are a major threat to biodiversity, yet their impact distribution remains poorly understood. Global biodiversity assessments suggest the highest impacts in wealthy countries of the Global North, but this is only inferred from IAS numbers, reflecting research bias. Using a new global database of standardized impact measures, we calculated average impact severity per country and found that it is higher in the Global South despite more than twice as many reports in the Global North. Weak governance and limited management capacity are the main drivers of high impact severity. Emerging economies with rapid economic growth but poor governance are particularly vulnerable. Failure to recognize the Global South as facing the highest IAS impacts diverts attention away from the most threatened regions.",
            keywords: "invasive alien species; biodiversity; Global South; governance; impact severity"
        },
        {
            id: 20,
            title: "20: 大语言模型的临床推理表现",
            directions: "Writing\nDirections: Write an English abstract of 120 to 150 words for a research article on Performance of a large language model on the reasoning tasks of a physician, based on the Chinese outline below. Cover all the points in your own words.\n背景：65多年前，复杂的临床诊断推理(clinical diagnostic reasoning)病例即被引入，作为评估专家级医学计算系统的金标准，并沿用至今。\n目的：评估大语言模型(LLM)在临床推理任务上的表现。\n方法：在五项实验中以数百名医师的表现为基线进行评估，并在一家大型三级学术医学中心的急诊室开展比较研究。\n结果：大语言模型(LLM)在所有实验中均优于医师基线，且较此前几代AI临床决策支持系统有明显提升。\n结论：大语言模型(LLM)已超越大多数临床推理基准，当务之急是开展前瞻性试验(prospective trials)。",
            abstract: "More than 65 years ago, complex clinical diagnostic reasoning cases were introduced as the gold standard for the evaluation of expert medical computing systems, a standard that has held ever since. In this study, we report the results of a physician evaluation of a large language model (LLM) on challenging clinical cases across five experiments with a baseline of hundreds of physicians. We then report a real-world study comparing human expert and artificial intelligence (AI) second opinions in randomly selected patients in the emergency room of a major tertiary academic medical center. In all experiments, the LLM outperformed physician baselines and displayed continued improvement from prior generations of AI clinical decision support. Our study suggests that LLMs have eclipsed most benchmarks of clinical reasoning, motivating the urgent need for prospective trials.",
            keywords: "large language model; clinical reasoning; diagnostic reasoning; artificial intelligence; emergency room"
        }
    ];

    let currentIndex = -1;
    let timerInterval = null;
    let timeLeft = 20 * 60; 

    const STORAGE_KEY = "englishAbstractAnswers_v1";

    let savedAnswers ={};

    try {savedAnswers = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    }
    catch(e){
        savedAnswers ={};
    }

    
    window.onload = function() {
        const select = document.getElementById('questionSelect');
        questions.forEach((q, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.innerText = q.title;
            select.appendChild(opt);
        });
        drawRandomQuestion();
    };
    
    function renderProfile(){
        document.querySelector(".profile-major").textContent = PROFILE_CONFIG.major;
        document.querySelector(".profile-class").textContent = PROFILE_CONFIG.className;
        document.querySelector(".profile-name").textContent = PROFILE_CONFIG.name;
    }
    
    document.addEventListener("DOMContentLoaded",renderProfile);

    function saveCurrentAnswer(){
        if (currentIndex <0)return;

        const answer = document.getElementById("userAnswer").value;
        const questionId = questions[currentIndex].id;

        savedAnswers[questionId]=answer;
        
        try{localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(savedAnswers)
        );
        }catch(e){
            console.error("defeat",e)
        }

    }
    function displayQuestion(index) {
        currentIndex = index;
        const q = questions[currentIndex];

        document.getElementById('qTitle').innerText = q.title;
        document.getElementById('qDirections').innerText = q.directions;
        document.getElementById('qAbstract').innerText = q.abstract;
        document.getElementById('qKeywords').innerText = q.keywords;

        document.getElementById('userAnswer').value =savedAnswers[q.id]|| '';
        
        updateWordCount();
        document.getElementById('answerBox').classList.remove('show');
        document.getElementById('scorePanel').classList.remove('show');
        document.getElementById('questionCard').classList.add('active');
        document.getElementById('questionSelect').value = index;

        resetTimer();
    }

    function drawRandomQuestion() {
        const randomIndex = Math.floor(Math.random() * questions.length);
        displayQuestion(randomIndex);
    }

    function prevQuestion() {
        let index = currentIndex - 1;
        if (index < 0) index = questions.length - 1;
        displayQuestion(index);
    }

    function nextQuestion() {
        let index = currentIndex + 1;
        if (index >= questions.length) index = 0;
        displayQuestion(index);
    }

    function selectQuestion(val) {
        if (val !== "") {
            displayQuestion(parseInt(val));
        }
    }

    function updateWordCount() {
        const text = document.getElementById('userAnswer').value.trim();
        const words = text === '' ? [] : text.split(/\s+/);
        const count = words.length;
        
        const display = document.getElementById('wordCountDisplay');
        display.innerText = `单词数: ${count} 词`;
        
        if (count >= 120 && count <= 150) {
            display.style.color = '#27ae60';
        } else {
            display.style.color = '#e67e22';
        }
    }

    function clearAnswer() {
        document.getElementById('userAnswer').value = '';
        saveCurrentAnswer();
        updateWordCount();
    }

    function toggleAnswer() {
        document.getElementById('answerBox').classList.toggle('show');
    }


    const STOPWORDS = new Set(("the a an and or but of to in on for with at by from as is are was were be been being have has had do does did we our this that these those it its they their he she you your his her not no than then so such more most other into over under between about through during before after up down out off again once here there when where why how all any both each few some own same only very can will just should now also may might must would could which who whom whose what if because while although however therefore thus via per vs etc").split(" "));

    const COMMON_VERBS = new Set(("go goes went come came make made take took get got give gave show showed find found use used develop developed test tested study studied analyze analyzed examine examined investigate investigated report reported suggest suggested indicate indicated reveal revealed demonstrate demonstrated present presented propose proposed describe described provide provided include included increase increased decrease decreased reduce reduced improve improved affect affected influence influenced cause caused lead led result resulted remain remained appear appeared seem seemed become became help helped allow allowed enable enabled perform performed conduct conducted collect collected compare compared assess assessed evaluate evaluated measure measured observe observed identify identified determine determined explore explored exist existed change changed grow grew decline declined rise rose fall fell reach reached exceed exceeded threaten threatened halt halted recover recovered support supported reflect reflected").split(" "));

    const VERB_CLUE = /(s|es|ed|d|ing)$/;
    const AUX_RE = /^(is|are|was|were|be|been|being|has|have|had|do|does|did|will|would|can|could|may|might|must|shall|should)$/;

    function escapeHtml(s){
        return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function hasVerb(words){
        return words.some(w => AUX_RE.test(w) || COMMON_VERBS.has(w) || VERB_CLUE.test(w));
    }


    function checkGrammarIssues(text){
        const issues = [];

        // 汉字检测：摘要须用英文撰写，汉字过多直接判 0 分
        const cjkCount = (text.match(/[一-鿿]/g) || []).length;
        if (cjkCount >= 20) {
            issues.push({level:25, msg:`检测到 ${cjkCount} 个汉字，摘要必须用英文撰写，语法项不得分`});
            return issues;
        } else if (cjkCount > 0) {
            issues.push({level:5, msg:`文中混入 ${cjkCount} 个汉字，请改为英文表达`});
        }

        const zhPunc = text.match(/[，。；：！？（）【】“”‘’]/g);
        if (zhPunc) issues.push({level:3, msg:`使用了中文标点（${[...new Set(zhPunc)].join(' ')}），英文写作请用半角标点`});

        if (/[a-zA-Z],[a-zA-Z]/.test(text)) issues.push({level:2, msg:'存在逗号后缺少空格的情况（如 "May,2015"）'});

        const rep = text.match(/\b([A-Za-z]+)\s+\1\b/gi);
        if (rep) issues.push({level:3, msg:`疑似重复单词：${[...new Set(rep.map(s=>s.toLowerCase()))].join(', ')}`});

        if (/\bi\b/.test(text)) issues.push({level:2, msg:'第一人称 "I" 必须大写'});

        if ((text.match(/\(/g)||[]).length !== (text.match(/\)/g)||[]).length) issues.push({level:2, msg:'圆括号未配对'});

        // a / an 误用（含 hour、university 等常见例外）
        const anSound = ['hour','honest','honor','honour','heir'];
        const aSound  = ['university','unique','united','uniform','universal','user','european','one','once','ufo'];
        const anRe = /\b(a|an)\s+([A-Za-z]+)/gi;
        let m;
        while ((m = anRe.exec(text)) !== null){
            const art = m[1].toLowerCase(), w = m[2].toLowerCase();
            const vowelSound = /^[aeiou]/.test(w) ? !aSound.includes(w) : anSound.includes(w);
            if (art === 'a'  &&  vowelSound) issues.push({level:2, msg:`冠词误用："a ${m[2]}" 应为 "an ${m[2]}"`});
            if (art === 'an' && !vowelSound) issues.push({level:2, msg:`冠词误用："an ${m[2]}" 应为 "a ${m[2]}"`});
        }

        const raw = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [];
        const sentences = raw.map(s=>s.trim()).filter(s=>s.length>0);
        if (sentences.length < 4) issues.push({level:1, msg:`句子数量偏少（${sentences.length} 句），摘要一般为 4~8 句`});
        sentences.forEach((s, i)=>{
            if (/^[\d\s'"()\]]+$/.test(s)) return;           
            const label = `第 ${i+1} 句`;
            if (/^[a-z]/.test(s)) issues.push({level:3, msg:`${label}句首字母未大写："${s.slice(0,24)}…"`});
            if (!/[.!?]["')\]]*$/.test(s)) issues.push({level:2, msg:`${label}结尾缺少句点`});
            const words = (s.match(/[A-Za-z'-]+/g) || []).map(w=>w.toLowerCase());
            if (words.length === 0) return;
            if (words.length <= 3) issues.push({level:1, msg:`${label}过短（${words.length} 词），可能是残句`});
            else if (!hasVerb(words)) issues.push({level:2, msg:`${label}可能缺少谓语动词`});
        });

        return issues;
    }

 
    function keywordHit(text, kw){
        const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = kw.trim().toLowerCase().split(/\s+/).map(esc);
        parts[parts.length-1] += "(?:'s|s|es|ed|d|ing)?";
        return new RegExp("\\b" + parts.join("[\\s\\-]+") + "\\b").test(text.toLowerCase());
    }

  
    function contentWordSet(text){
        const set = new Set();
        (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).forEach(w=>{ if(!STOPWORDS.has(w)) set.add(w); });
        return set;
    }

    function wordInSet(set, w){
        const forms = [w, w+'s', w+'es', w.replace(/s$/,''), w.replace(/es$/,''), w.replace(/ies$/,'y'), w.replace(/(ing|ed|d)$/,'')];
        return forms.some(f => f && set.has(f));
    }

    function fillColor(ratio){
        return ratio >= 0.8 ? '#27ae60' : ratio >= 0.5 ? '#e67e22' : '#e74c3c';
    }

    function scoreAnswer(){
        const panel = document.getElementById('scorePanel');
        const text = document.getElementById('userAnswer').value.trim();
        if (currentIndex < 0) return;
        if (!text){
            panel.innerHTML = '<div class="score-empty">请先输入内容再评分。</div>';
            panel.classList.add('show');
            return;
        }
        const q = questions[currentIndex];

        // 1. 内容覆盖（30 分）
        const kws = q.keywords.split(/[;,，；]/).map(s=>s.trim()).filter(Boolean);
        const missed = kws.filter(k => !keywordHit(text, k));
        const kwScore = kws.length ? Math.round((kws.length - missed.length) / kws.length * 30) : 30;

        
        const issues = checkGrammarIssues(text);
        const grScore = Math.max(0, 25 - issues.reduce((a,i)=>a+i.level, 0));

       
        const refWords = contentWordSet(q.abstract);
        const userWords = contentWordSet(text);
        let hit = 0;
        userWords.forEach(w => { if (wordInSet(refWords, w)) hit++; });
        const recall = refWords.size ? hit / refWords.size : 0;
        const simScore = Math.min(25, Math.round(recall / 0.5 * 25));

      
        const wc = text.split(/\s+/).length;
        let wcScore, wcMsg;
        if (wc >= 120 && wc <= 150)              { wcScore = 20; wcMsg = '词数达标'; }
        else if ((wc>=100 && wc<120) || (wc>150 && wc<=170)) { wcScore = 15; wcMsg = `词数 ${wc}，略偏离 120-150`; }
        else if ((wc>=80  && wc<100) || (wc>170 && wc<=190)) { wcScore = 10; wcMsg = `词数 ${wc}，偏离目标区间较多`; }
        else                                       { wcScore = Math.max(0, Math.round(wc/120*10)); wcMsg = `词数 ${wc}，严重不足或超出`; }

        renderScorePanel(panel, {
            total: kwScore + grScore + simScore + wcScore,
            kwScore, missed, grScore, issues, simScore, recall, wcScore, wcMsg
        });
    }

    function renderScorePanel(panel, r){
        const grade = r.total >= 85 ? '优秀' : r.total >= 70 ? '良好' : r.total >= 60 ? '及格' : '需要努力';
        const rows = [
            {label:'内容覆盖（30）',  score:r.kwScore,  max:30, tip: r.missed.length ? '未覆盖关键词：<span class="score-missed">'+r.missed.map(escapeHtml).join('、')+'</span>' : '关键词全部覆盖'},
            {label:'语法正确性（25）', score:r.grScore,  max:25, tip: r.issues.length ? r.issues.length + ' 处待改进（见下方列表）' : '未发现明显语法问题'},
            {label:'表达贴近度（25）', score:r.simScore, max:25, tip: '与参考答案的内容词重合率约 ' + Math.round(r.recall*100) + '%'},
            {label:'词数（20）',      score:r.wcScore,  max:20, tip: r.wcMsg}
        ];
        let html = '<div class="score-total">' + r.total + ' / 100</div><div class="score-grade">' + grade + '（启发式评分，仅供参考）</div>';
        rows.forEach(row => {
            const ratio = row.score / row.max;
            html += '<div class="score-row"><span class="score-label">' + row.label + '</span>'
                  + '<div class="score-bar"><div class="score-fill" style="width:' + Math.round(ratio*100) + '%;background:' + fillColor(ratio) + '"></div></div>'
                  + '<span class="score-val">' + row.score + '</span></div>'
                  + '<div class="score-tip">' + row.tip + '</div>';
        });
        if (r.issues.length){
            html += '<ul class="score-issues">';
            r.issues.forEach(i => { html += '<li class="' + (i.level >= 3 ? 'err' : 'warnx') + '">' + escapeHtml(i.msg) + '</li>'; });
            html += '</ul>';
        }
        panel.innerHTML = html;
        panel.classList.add('show');
    }

   
    function resetTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        timeLeft = 20 * 60;
        updateTimerDisplay();
    }

    function toggleTimer() {
        if (timerInterval) {          
            clearInterval(timerInterval);
            timerInterval = null;
            return;
        }
        if (timeLeft <= 0) return;    
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerInterval = null;
                alert("时间到！请检查并核对答案。");
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('timerDisplay').innerText = `${m}:${s}`;
    }
