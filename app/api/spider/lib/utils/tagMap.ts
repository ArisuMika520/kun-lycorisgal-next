
export const TagMap: Record<string, string> = {
    // Tech / System
    "ADV": "ADV",
    "NVL": "NVL",
    "Visual Novel": "视觉小说",
    "Kinetic Novel": "电子小说",
    "Multiple Endings": "多结局",
    "One True End": "单线结局",
    "No Sexual Content": "全年龄",
    "Voice": "语音",
    "Full Voice": "全语音",
    "Partially Voiced": "部分语音",

    // Content / Genre
    "Romance": "恋爱",
    "Pure Love Story": "纯爱",
    "Comedy": "喜剧",
    "Drama": "剧情",
    "Science Fiction": "科幻",
    "Fantasy": "奇幻",
    "School": "校园",
    "School Life": "校园生活",
    "Action": "动作",
    "Horror": "恐怖",
    "Mystery": "悬疑",
    "Thriller": "惊悚",
    "Adventure": "冒险",

    // Heroine Archetypes
    "Male Protagonist": "男主人公",
    "Female Protagonist": "女主人公",
    "Student": "学生",
    "Maid": "女仆",
    "Tsundere": "傲娇",
    "Kuudere": "三无",
    "Yandere": "病娇",
    "Loli": "萝莉",
    "Loli Heroine": "萝莉女主角",
    "Imouto": "妹",
    "Onee-san": "姐",
    "Osananajimi": "幼驯染",
    "Childhood Friend": "青梅竹马",

    // Setting
    "Summer": "夏天",
    "Winter": "冬天",
    "Future": "未来",
    "Past": "过去",
    "Fantasy World": "异世界",

    // NSFW (examples)
    "Sexual Content": "性内容",
    "Nukige": "拔作",
    "Nakige": "泣系",
    "Utsuge": "郁系",

    // Specifics from user examples
    "Post Apocalyptic Earth": "后启示录",
    "Artificial Intelligence": "人工智能",
    "Robot": "机器人",
    "Robot Heroine": "机器人女主角",
    "Android": "仿生人",
    "Cyborg": "赛博格",
    "High School Student Protagonist": "高中生主角",
    "Natural Disaster": "自然灾害",
    "Flooding": "洪水",
    "Ship": "船",
    "Submarine": "潜水艇",
    "Treasure Hunting": "寻宝",
    "Dying Heroine": "女主身患绝症",
    "Terminal Illness": "绝症",
    "Crippled Protagonist": "残疾主角",
    "Disable Protagonist": "残疾主角",
    "Pretending Heroine": "伪装女主",
    "Genius Protagonist": "天才主角"
};

export function translateTag(englishTag: string): string {
    return TagMap[englishTag] || englishTag;
}
