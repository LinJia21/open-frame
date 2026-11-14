import type { UiLanguage } from "@/lib/i18n/ui-language";

type Script = "zh" | "zh-Hant" | "en";

function script(language: UiLanguage): Script {
  if (language === "zh" || language === "zh-Hant") return language;
  return "en";
}

export interface SubpageCopy {
  search: {
    lead: string;
    points: string[];
    title: string;
    hint: (count: number) => string;
    emptyQueryTitle: string;
    emptyQueryBody: string;
    searching: string;
    searchingBody: string;
    noSourcesTitle: string;
    noSources: string;
    chooseSources: string;
    failedTitle: string;
    failed: string;
    retry: string;
    noLeadsTitle: string;
    noLeads: string;
    resultCount: (count: number) => string;
    untitled: string;
    preparedTitle: string;
    preparedBody: string;
    openPrepared: string;
    backHome: string;
  };
  forYou: {
    lead: string;
    points: string[];
    title: string;
    badge: string;
    honesty: string;
    emptyTitle: string;
    emptyBody: string;
    chooseSources: string;
    followedTitle: string;
    groupTitle: string;
    groupBody: string;
    matchedTitle: string;
    matchedEmptyTitle: string;
    matchedEmptyBody: string;
    openStory: string;
  };
  locate: {
    lead: string;
    points: string[];
    title: string;
    badge: string;
    honesty: string;
    allRegions: string;
    sourcesTitle: string;
    storiesTitle: string;
    emptyStoriesTitle: string;
    emptyStoriesBody: string;
    follow: string;
    following: string;
    openSource: string;
    back: string;
  };
  story: {
    lead: string;
    points: string[];
    noAnalysisTitle: string;
    noAnalysisBody: string;
    openPerspectives: string;
    openEvidence: string;
    openReport: string;
    excerptLabel: string;
    noExcerpt: string;
    fixtureNote: string;
    demoNote: string;
    demoButton: string;
    demoWorking: string;
    sample: string;
    demo: string;
    layout: string;
    demoMark: string;
    noSource: string;
    heat: string;
    heatMissing: string;
    verify: string;
    verifyOpen: string;
    verifyLayout: string;
    imageNote: string;
    backHome: string;
    leadKicker: string;
    leadNote: string;
    saveTitle: string;
    saveBody: string;
    saveButton: string;
    saving: string;
    saved: string;
    saveSkipped: string;
    openSource: string;
    external: string;
  };
  source: {
    lead: string;
    points: string[];
    storiesTitle: string;
    emptyTitle: string;
    emptyBody: string;
    notACrawl: string;
    localOnly: string;
    officialRss: string;
    googleRss: string;
    follow: string;
    following: string;
    backSubscribe: string;
    openStory: string;
  };
  libraryItem: {
    lead: string;
    points: string[];
    loading: string;
    missingTitle: string;
    missingBody: string;
    capNotice: string;
    overCap: string;
    noText: string;
    analyze: string;
    analyzing: string;
    analyzeNote: string;
    noRemove: string;
    backLibrary: string;
    retry: string;
    readFailed: string;
    testFixture: string;
  };
  importPage: {
    lead: string;
    points: string[];
    title: string;
    rules: string[];
    label: string;
    submit: string;
    pending: string;
    successTitle: string;
    successBody: (created: number, updated: number) => string;
    openItem: string;
    fillRejected: string;
    rejectedHint: string;
    backLibrary: string;
    emptyLibrary: string;
  };
  briefings: {
    lead: string;
    points: string[];
    title: string;
    fixturesTitle: string;
    localTitle: string;
    localEmptyTitle: string;
    localEmptyBody: string;
    open: string;
    errorTitle: string;
    errorBody: string;
    retry: string;
    prepared: string;
    generic: string;
    backLibrary: string;
  };
  shared: {
    imageNote: string;
    heat: string;
    heatMissing: string;
    sample: string;
    demo: string;
    layout: string;
    noSource: string;
    openStory: string;
    allBriefings: string;
  };
}

const zh: SubpageCopy = {
  search: {
    lead: "搜索提交后打开这一页。结果只来自已关注来源的标题。",
    points: ["不搜资料库。", "不抓正文。", "没有关注来源时，这一页会请你先去订阅页选择。"],
    title: "搜索结果",
    hint: (count) => `只搜索已关注的 ${count} 个来源的标题，不搜资料库，也不抓正文。`,
    emptyQueryTitle: "先写一个标题里的词",
    emptyQueryBody: "提交后才会查询已关注来源的标题。空白不会被当成一次搜索。",
    searching: "正在搜索已关注的来源",
    searchingBody: "只比对这些来源列表里的标题。不抓正文，也不写入资料库。",
    noSourcesTitle: "还没有关注来源",
    noSources: "搜索只读订阅页里选中的来源。现在一个都没有选中，所以没有标题可以比。",
    chooseSources: "去选择来源",
    failedTitle: "这次没有取到结果",
    failed: "来源列表没有返回。没有写入资料库，也没有抓正文。可以再试一次。",
    retry: "再搜索一次",
    noLeadsTitle: "没有匹配的标题",
    noLeads: "已关注来源的标题里没有这个词。搜索不会自动改写错字，也没有去抓正文。",
    resultCount: (count) => `标题匹配 ${count} 条。这些是来源列表里的标题，不是正文，也没有写入资料库。`,
    untitled: "无标题",
    preparedTitle: "这个词对得上已准备的简报",
    preparedBody: "下面这条是仓库里预生成的简报，不是这次搜索写出来的。标题结果仍然只来自已关注来源。",
    openPrepared: "打开已准备的简报",
    backHome: "返回首页",
  },
  forYou: {
    lead: "For You 把这台浏览器里已关注的来源，和仓库里的预生成示例放在一起。",
    points: ["不是实时个性化。", "不是模型推荐。", "没有关注来源时，这里不展示示例列表。"],
    title: "For You",
    badge: "原型 · 预生成分组",
    honesty: "这是按你在这台浏览器里关注的来源整理的预生成示例，不是实时个性化，也不是模型推荐。",
    emptyTitle: "还没有关注来源",
    emptyBody: "For You 只在你选过来源之后，才列出预生成示例。现在没有选中任何来源。",
    chooseSources: "去订阅页选择来源",
    followedTitle: "你在这台浏览器里关注的来源",
    groupTitle: "预生成示例",
    groupBody: "这三张是首页上的示例卡，按你已经关注来源这件事放在这里。它们不是根据你的阅读计算出来的推荐。",
    matchedTitle: "和已关注来源对得上的夹具标题",
    matchedEmptyTitle: "这些来源在这套演示里没有对上的标题",
    matchedEmptyBody: "夹具里的报道大多不属于这 20 个来源。没有对上时，这里保持空白，不会编一条当地或推荐新闻。",
    openStory: "打开这篇",
  },
  locate: {
    lead: "Locate 按订阅页已有的地区浏览来源，以及夹具里对得上的标题。",
    points: ["不读取设备位置。", "不编造附近的新闻。", "某个地区没有夹具标题时，来源列表仍在，标题区会说明是空的。"],
    title: "Locate",
    badge: "地区浏览",
    honesty: "这是按地区浏览已有来源和夹具标题。不请求定位，也没有附近的实时新闻。",
    allRegions: "全部地区",
    sourcesTitle: "这个地区的来源",
    storiesTitle: "对得上的夹具标题",
    emptyStoriesTitle: "这个地区在演示集里没有标题",
    emptyStoriesBody: "来源可以打开、可以关注。没有夹具标题时，这里不会补一条当地新闻。",
    follow: "关注",
    following: "已关注",
    openSource: "打开来源",
    back: "返回地区列表",
  },
  story: {
    lead: "这一页只展示夹具里已经有的标题、摘要和摘录。",
    points: ["不抓全文。", "有简报时进入观点、证据核查和研究报告。", "没有简报时不会编一份分析。"],
    noAnalysisTitle: "这份样本没有分析页",
    noAnalysisBody: "仓库没有为这条样本准备观点、证据核查或研究报告。下面的操作只会走到已经存在的演示入口。",
    openPerspectives: "观点",
    openEvidence: "证据核查",
    openReport: "研究报告",
    excerptLabel: "夹具摘录",
    noExcerpt: "夹具没有保存这段正文。这一页不会补写。",
    fixtureNote: "摘要和摘录来自夹具，不是这次打开页面时抓取的全文。",
    demoNote: "用现有演示方式，从这条标题打开一份预生成简报。对不上已准备题目时，得到的是标明过的通用演示，不是对这条标题的分析。",
    demoButton: "用演示方式打开分析",
    demoWorking: "正在打开预生成简报…",
    sample: "示例",
    demo: "虚构",
    layout: "虚构布局样例",
    demoMark: "DEMO",
    noSource: "无来源 · 无日期",
    heat: "热度",
    heatMissing: "暂无数据",
    verify: "核实",
    verifyOpen: "未判断整件事",
    verifyLayout: "不适用",
    imageNote: "公开授权的主题配图，不是这篇报道的原图。",
    backHome: "返回首页",
    leadKicker: "标题线索",
    leadNote: "这条只有已关注来源列表里的标题。没有抓正文，没有分析页，也没有写入资料库。",
    saveTitle: "存进资料库",
    saveBody: "只保存这个标题和链接，完整度为只有标题。不会抓正文，也不能单独拿去分析。",
    saveButton: "保存这个标题",
    saving: "正在保存",
    saved: "已写入资料库。",
    saveSkipped: "这条没有可保存的公开链接，所以不能写入资料库。",
    openSource: "打开来源",
    external: "来源列表里的链接",
  },
  source: {
    lead: "这一页是订阅目录里的一个来源，外加夹具里对得上的标题。",
    points: ["关注状态只留在这台浏览器。", "不会去抓该来源的 RSS。", "演示集里没有标题时，页面会直接说没有。"],
    storiesTitle: "演示集里的标题",
    emptyTitle: "这套演示里没有这个来源的标题",
    emptyBody: "目录里有这个来源，但准备好的夹具没有对上它的报道。这里不会假装抓过 RSS。",
    notACrawl: "这一页不抓取 RSS，也不更新标题。",
    localOnly: "关注只保存在当前浏览器，不上传，也不是正式订阅。",
    officialRss: "官方 RSS",
    googleRss: "Google RSS",
    follow: "关注",
    following: "已关注",
    backSubscribe: "返回订阅",
    openStory: "打开这篇",
  },
  libraryItem: {
    lead: "这一页阅读一条已经保存在资料库里的文字。",
    points: ["资料库不是首页新闻流。", "分析只纳入前 2000 字。", "这一页不能删除单条资料。"],
    loading: "正在读取这条已保存资料…",
    missingTitle: "资料库里没有这一条",
    missingBody: "它可能还没导入，或本机的资料库是空的。可以回到资料库，或打开导入页。",
    capNotice: "每篇分析只纳入已保存文本的前 2000 字。超出部分未纳入分析。不能据此推断完整原文缺乏证据。",
    overCap: "这篇超过 2000 字。阅读页仍显示已保存的文字；分析不会使用超出的部分。",
    noText: "这条只保存了标题，没有摘要或正文。",
    analyze: "用演示方式打开分析",
    analyzing: "正在打开预生成简报…",
    analyzeNote: "这会按现有演示方式打开一份预生成简报，不是对这篇已保存文字的实时模型分析。要分析已保存资料，仍在资料库里选择，并且需要 Cursor 提供方。",
    noRemove: "这一页不能删除单条资料。",
    backLibrary: "返回资料库",
    retry: "再读一次",
    readFailed: "这次没有读到这条资料。",
    testFixture: "测试样本，不是已保存的历史报道",
  },
  importPage: {
    lead: "导入页只接收你已经拿到的 JSON。它不会打开链接，也不会把首页新闻写进资料库。",
    points: ["example.com 会被拒绝。", "成功、格式错误和空库都留在这一页。", "资料库一开始是空的。"],
    title: "导入已保存的文字",
    rules: [
      "每条需要事件名、媒体名、标题和公开 https 链接。",
      "正文、摘要没有就填 null，不要为了凑样本编造。",
      "example.com、*.example、*.test、*.invalid 会被拒绝。",
      "完整度必须和实际文字一致：全文要有正文，只有摘要时正文为 null，只有标题时不能带摘要或正文。",
    ],
    label: "JSON",
    submit: "保存导入",
    pending: "正在保存",
    successTitle: "已经写入本机资料库",
    successBody: (created, updated) => `新增 ${created} 条，更新 ${updated} 条。没有打开这些链接。`,
    openItem: "打开这条",
    fillRejected: "填入会被拒绝的 example.com 示例",
    rejectedHint: "docs/corpus-import.example.json 使用保留域名。填入后提交，会看到拒绝，不会出现导入成功。",
    backLibrary: "返回资料库",
    emptyLibrary: "资料库现在是空的。导入一条你已经保存的文字后，才会出现在列表里。",
  },
  briefings: {
    lead: "这里列出仓库里的两份预生成简报，以及这台机器上后来保存的运行。",
    points: ["每一行打开现有的观点、证据核查和研究报告。", "清空本机存储后，只剩下预生成简报。", "列表不会调用模型。"],
    title: "简报",
    fixturesTitle: "已准备的简报",
    localTitle: "本机保存的运行",
    localEmptyTitle: "本机还没有保存的运行",
    localEmptyBody: "清空或尚未写入 data/store/analyses.json 时，这里是空的。上面的预生成简报不受影响。",
    open: "打开",
    errorTitle: "这次没有读到简报列表",
    errorBody: "本机文件可能损坏。预生成简报的地址仍然可以从首页示例进去。",
    retry: "再读一次",
    prepared: "预生成",
    generic: "通用演示",
    backLibrary: "返回资料库",
  },
  shared: {
    imageNote: "公开授权的主题配图，不是这篇报道的原图。",
    heat: "热度",
    heatMissing: "暂无数据",
    sample: "示例",
    demo: "虚构",
    layout: "虚构布局样例",
    noSource: "无来源 · 无日期",
    openStory: "打开这篇",
    allBriefings: "全部简报",
  },
};

const hant: SubpageCopy = {
  search: {
    lead: "搜索提交後打開這一頁。結果只來自已關注來源的標題。",
    points: ["不搜資料庫。", "不抓正文。", "沒有關注來源時，這一頁會請你先去訂閱頁選擇。"],
    title: "搜索結果",
    hint: (count) => `只搜索已關注的 ${count} 個來源的標題，不搜資料庫，也不抓正文。`,
    emptyQueryTitle: "先寫一個標題裡的詞",
    emptyQueryBody: "提交後才會查詢已關注來源的標題。空白不會被當成一次搜索。",
    searching: "正在搜索已關注的來源",
    searchingBody: "只比對這些來源列表裡的標題。不抓正文，也不寫入資料庫。",
    noSourcesTitle: "還沒有關注來源",
    noSources: "搜索只讀訂閱頁裡選中的來源。現在一個都沒有選中，所以沒有標題可以比。",
    chooseSources: "去選擇來源",
    failedTitle: "這次沒有取到結果",
    failed: "來源列表沒有返回。沒有寫入資料庫，也沒有抓正文。可以再試一次。",
    retry: "再搜索一次",
    noLeadsTitle: "沒有匹配的標題",
    noLeads: "已關注來源的標題裡沒有這個詞。搜索不會自動改寫錯字，也沒有去抓正文。",
    resultCount: (count) => `標題匹配 ${count} 條。這些是來源列表裡的標題，不是正文，也沒有寫入資料庫。`,
    untitled: "無標題",
    preparedTitle: "這個詞對得上已準備的簡報",
    preparedBody: "下面這條是倉庫裡預生成的簡報，不是這次搜索寫出來的。標題結果仍然只來自已關注來源。",
    openPrepared: "打開已準備的簡報",
    backHome: "返回首頁",
  },
  forYou: {
    lead: "For You 把這台瀏覽器裡已關注的來源，和倉庫裡的預生成示例放在一起。",
    points: ["不是即時個性化。", "不是模型推薦。", "沒有關注來源時，這裡不展示示例列表。"],
    title: "For You",
    badge: "原型 · 預生成分組",
    honesty: "這是按你在這台瀏覽器裡關注的來源整理的預生成示例，不是即時個性化，也不是模型推薦。",
    emptyTitle: "還沒有關注來源",
    emptyBody: "For You 只在你選過來源之後，才列出預生成示例。現在沒有選中任何來源。",
    chooseSources: "去訂閱頁選擇來源",
    followedTitle: "你在這台瀏覽器裡關注的來源",
    groupTitle: "預生成示例",
    groupBody: "這三張是首頁上的示例卡，按你已經關注來源這件事放在這裡。它們不是根據你的閱讀計算出來的推薦。",
    matchedTitle: "和已關注來源對得上的夾具標題",
    matchedEmptyTitle: "這些來源在這套演示裡沒有對上的標題",
    matchedEmptyBody: "夾具裡的報導大多不屬於這 20 個來源。沒有對上時，這裡保持空白，不會編一條當地或推薦新聞。",
    openStory: "打開這篇",
  },
  locate: {
    lead: "Locate 按訂閱頁已有的地區瀏覽來源，以及夾具裡對得上的標題。",
    points: ["不讀取裝置位置。", "不編造附近的新聞。", "某個地區沒有夾具標題時，來源列表仍在，標題區會說明是空的。"],
    title: "Locate",
    badge: "地區瀏覽",
    honesty: "這是按地區瀏覽已有來源和夾具標題。不請求定位，也沒有附近的即時新聞。",
    allRegions: "全部地區",
    sourcesTitle: "這個地區的來源",
    storiesTitle: "對得上的夾具標題",
    emptyStoriesTitle: "這個地區在演示集裡沒有標題",
    emptyStoriesBody: "來源可以打開、可以關注。沒有夾具標題時，這裡不會補一條當地新聞。",
    follow: "關注",
    following: "已關注",
    openSource: "打開來源",
    back: "返回地區列表",
  },
  story: {
    lead: "這一頁只展示夾具裡已經有的標題、摘要和摘錄。",
    points: ["不抓全文。", "有簡報時進入觀點、證據核查和研究報告。", "沒有簡報時不會編一份分析。"],
    noAnalysisTitle: "這份樣本沒有分析頁",
    noAnalysisBody: "倉庫沒有為這條樣本準備觀點、證據核查或研究報告。下面的操作只會走到已經存在的演示入口。",
    openPerspectives: "觀點",
    openEvidence: "證據核查",
    openReport: "研究報告",
    excerptLabel: "夾具摘錄",
    noExcerpt: "夾具沒有保存這段正文。這一頁不會補寫。",
    fixtureNote: "摘要和摘錄來自夾具，不是這次打開頁面時抓取的全文。",
    demoNote: "用現有演示方式，從這條標題打開一份預生成簡報。對不上已準備題目時，得到的是標明過的通用演示，不是對這條標題的分析。",
    demoButton: "用演示方式打開分析",
    demoWorking: "正在打開預生成簡報…",
    sample: "示例",
    demo: "虛構",
    layout: "虛構佈局樣例",
    demoMark: "DEMO",
    noSource: "無來源 · 無日期",
    heat: "熱度",
    heatMissing: "暫無數據",
    verify: "核實",
    verifyOpen: "未判斷整件事",
    verifyLayout: "不適用",
    imageNote: "公開授權的主題配圖，不是這篇報導的原圖。",
    backHome: "返回首頁",
    leadKicker: "標題線索",
    leadNote: "這條只有已關注來源列表裡的標題。沒有抓正文，沒有分析頁，也沒有寫入資料庫。",
    saveTitle: "存進資料庫",
    saveBody: "只保存這個標題和連結，完整度為只有標題。不會抓正文，也不能單獨拿去分析。",
    saveButton: "保存這個標題",
    saving: "正在保存",
    saved: "已寫入資料庫。",
    saveSkipped: "這條沒有可保存的公開連結，所以不能寫入資料庫。",
    openSource: "打開來源",
    external: "來源列表裡的連結",
  },
  source: {
    lead: "這一頁是訂閱目錄裡的一個來源，外加夾具裡對得上的標題。",
    points: ["關注狀態只留在這台瀏覽器。", "不會去抓該來源的 RSS。", "演示集裡沒有標題時，頁面會直接說沒有。"],
    storiesTitle: "演示集裡的標題",
    emptyTitle: "這套演示裡沒有這個來源的標題",
    emptyBody: "目錄裡有這個來源，但準備好的夾具沒有對上它的報導。這裡不會假裝抓過 RSS。",
    notACrawl: "這一頁不抓取 RSS，也不更新標題。",
    localOnly: "關注只保存在當前瀏覽器，不上傳，也不是正式訂閱。",
    officialRss: "官方 RSS",
    googleRss: "Google RSS",
    follow: "關注",
    following: "已關注",
    backSubscribe: "返回訂閱",
    openStory: "打開這篇",
  },
  libraryItem: {
    lead: "這一頁閱讀一條已經保存在資料庫裡的文字。",
    points: ["資料庫不是首頁新聞流。", "分析只納入前 2000 字。", "這一頁不能刪除單條資料。"],
    loading: "正在讀取這條已保存資料…",
    missingTitle: "資料庫裡沒有這一條",
    missingBody: "它可能還沒導入，或本機的資料庫是空的。可以回到資料庫，或打開導入頁。",
    capNotice: "每篇分析只納入已保存文本的前 2000 字。超出部分未納入分析。不能據此推斷完整原文缺乏證據。",
    overCap: "這篇超過 2000 字。閱讀頁仍顯示已保存的文字；分析不會使用超出的部分。",
    noText: "這條只保存了標題，沒有摘要或正文。",
    analyze: "用演示方式打開分析",
    analyzing: "正在打開預生成簡報…",
    analyzeNote: "這會按現有演示方式打開一份預生成簡報，不是對這篇已保存文字的即時模型分析。要分析已保存資料，仍在資料庫裡選擇，並且需要 Cursor 提供方。",
    noRemove: "這一頁不能刪除單條資料。",
    backLibrary: "返回資料庫",
    retry: "再讀一次",
    readFailed: "這次沒有讀到這條資料。",
    testFixture: "測試樣本，不是已保存的歷史報導",
  },
  importPage: {
    lead: "導入頁只接收你已經拿到的 JSON。它不會打開連結，也不會把首頁新聞寫進資料庫。",
    points: ["example.com 會被拒絕。", "成功、格式錯誤和空庫都留在這一頁。", "資料庫一開始是空的。"],
    title: "導入已保存的文字",
    rules: [
      "每條需要事件名、媒體名、標題和公開 https 連結。",
      "正文、摘要沒有就填 null，不要為了湊樣本編造。",
      "example.com、*.example、*.test、*.invalid 會被拒絕。",
      "完整度必須和實際文字一致：全文要有正文，只有摘要時正文為 null，只有標題時不能帶摘要或正文。",
    ],
    label: "JSON",
    submit: "保存導入",
    pending: "正在保存",
    successTitle: "已經寫入本機資料庫",
    successBody: (created, updated) => `新增 ${created} 條，更新 ${updated} 條。沒有打開這些連結。`,
    openItem: "打開這條",
    fillRejected: "填入會被拒絕的 example.com 示例",
    rejectedHint: "docs/corpus-import.example.json 使用保留域名。填入後提交，會看到拒絕，不會出現導入成功。",
    backLibrary: "返回資料庫",
    emptyLibrary: "資料庫現在是空的。導入一條你已經保存的文字後，才會出現在列表裡。",
  },
  briefings: {
    lead: "這裡列出倉庫裡的兩份預生成簡報，以及這台機器上後來保存的運行。",
    points: ["每一行打開現有的觀點、證據核查和研究報告。", "清空本機存儲後，只剩下預生成簡報。", "列表不會呼叫模型。"],
    title: "簡報",
    fixturesTitle: "已準備的簡報",
    localTitle: "本機保存的運行",
    localEmptyTitle: "本機還沒有保存的運行",
    localEmptyBody: "清空或尚未寫入 data/store/analyses.json 時，這裡是空的。上面的預生成簡報不受影響。",
    open: "打開",
    errorTitle: "這次沒有讀到簡報列表",
    errorBody: "本機檔案可能損壞。預生成簡報的地址仍然可以從首頁示例進去。",
    retry: "再讀一次",
    prepared: "預生成",
    generic: "通用演示",
    backLibrary: "返回資料庫",
  },
  shared: {
    imageNote: "公開授權的主題配圖，不是這篇報導的原圖。",
    heat: "熱度",
    heatMissing: "暫無數據",
    sample: "示例",
    demo: "虛構",
    layout: "虛構佈局樣例",
    noSource: "無來源 · 無日期",
    openStory: "打開這篇",
    allBriefings: "全部簡報",
  },
};

const en: SubpageCopy = {
  search: {
    lead: "Submitting a search opens this page. Results are titles from followed sources only.",
    points: ["The library is not searched.", "Article text is not fetched.", "With no followed sources, this page asks you to choose some first."],
    title: "Search results",
    hint: (count) => `Searching titles from the ${count} sources you follow. The library is not searched and articles are not fetched.`,
    emptyQueryTitle: "Enter a word from a title",
    emptyQueryBody: "A search runs only after you submit. A blank box is not a search.",
    searching: "Searching followed sources",
    searchingBody: "This compares titles in those source lists. It does not fetch articles or save them to the library.",
    noSourcesTitle: "No sources followed",
    noSources: "Search only reads the sources selected on Subscribe. None are selected, so there are no titles to compare.",
    chooseSources: "Choose sources",
    failedTitle: "This search did not return",
    failed: "The source lists did not come back. Nothing was saved, and no article was fetched. You can try again.",
    retry: "Search again",
    noLeadsTitle: "No matching titles",
    noLeads: "None of the followed sources have this in a title. The query is not rewritten, and article text was not fetched.",
    resultCount: (count) => `${count} title matches. These are titles from the source lists, not articles, and they were not saved to the library.`,
    untitled: "Untitled",
    preparedTitle: "This matches a prepared briefing",
    preparedBody: "The card below is a pre-generated briefing from the repository. This search did not write it. Title matches still come only from followed sources.",
    openPrepared: "Open the prepared briefing",
    backHome: "Back to home",
  },
  forYou: {
    lead: "For You groups the sources followed in this browser with the repository’s pre-generated samples.",
    points: ["Not live personalization.", "Not a model recommendation.", "With no followed sources, the sample list stays hidden."],
    title: "For You",
    badge: "Prototype · pre-generated grouping",
    honesty: "This is a pre-generated grouping of samples beside the sources you follow in this browser. It is not live personalization and not a model recommendation.",
    emptyTitle: "No sources followed",
    emptyBody: "For You lists the pre-generated samples only after you follow at least one source. None are selected.",
    chooseSources: "Choose sources on Subscribe",
    followedTitle: "Sources followed in this browser",
    groupTitle: "Pre-generated samples",
    groupBody: "These three cards are the home samples, shown because you follow sources. They are not recommendations computed from your reading.",
    matchedTitle: "Fixture titles that match a followed source",
    matchedEmptyTitle: "None of these sources have a title in this demo set",
    matchedEmptyBody: "Most fixture articles are not from these 20 sources. When none match, this section stays empty. No local or recommended story is invented.",
    openStory: "Open story",
  },
  locate: {
    lead: "Locate browses the regions already on Subscribe, plus any fixture titles that match.",
    points: ["Device location is not read.", "Nearby news is not invented.", "A region with no fixture titles still lists its sources and says the title list is empty."],
    title: "Locate",
    badge: "Region browsing",
    honesty: "This browses available sources and fixture titles by region. It does not ask for your location and it has no live nearby news.",
    allRegions: "All regions",
    sourcesTitle: "Sources in this region",
    storiesTitle: "Matching fixture titles",
    emptyStoriesTitle: "No titles for this region in the demo set",
    emptyStoriesBody: "You can open and follow the sources. With no fixture title, this page does not add a local story.",
    follow: "Follow",
    following: "Following",
    openSource: "Open source",
    back: "All regions",
  },
  story: {
    lead: "This page shows only the title, summary, and excerpt already in the fixture.",
    points: ["Full text is not fetched.", "A briefing opens Perspectives, Evidence, and the Research Report.", "Without a briefing, no analysis is invented."],
    noAnalysisTitle: "This sample has no analysis page",
    noAnalysisBody: "The repository has no perspectives, evidence audit, or research report for this sample. The actions below only open demos that already exist.",
    openPerspectives: "Perspectives",
    openEvidence: "Evidence audit",
    openReport: "Research report",
    excerptLabel: "Fixture excerpt",
    noExcerpt: "The fixture did not keep this text. This page does not fill it in.",
    fixtureNote: "The summary and excerpt come from the fixture. They were not fetched when this page opened.",
    demoNote: "This opens a pre-generated briefing from the title, using the existing demo path. If the title is not a prepared topic, the result is a labeled generic demo, not an analysis of this title.",
    demoButton: "Open a demo analysis",
    demoWorking: "Opening a pre-generated briefing…",
    sample: "Sample",
    demo: "Fictional",
    layout: "Fictional layout sample",
    demoMark: "DEMO",
    noSource: "No source · no date",
    heat: "Heat",
    heatMissing: "No data yet",
    verify: "Check",
    verifyOpen: "No verdict on the whole event",
    verifyLayout: "Not applicable",
    imageNote: "Openly licensed thematic photo, not a picture from this article.",
    backHome: "Back to home",
    leadKicker: "Title lead",
    leadNote: "This is only a title from a followed source list. The article was not fetched, there is no analysis page, and it was not saved to the library.",
    saveTitle: "Save to the library",
    saveBody: "Only this title and link are saved, marked title only. The article is not fetched and cannot be analyzed on its own.",
    saveButton: "Save this title",
    saving: "Saving",
    saved: "Saved to the library.",
    saveSkipped: "There is no public link to store, so this cannot be saved to the library.",
    openSource: "Open source",
    external: "Link from the source list",
  },
  source: {
    lead: "This page is one source from the subscribe catalog, plus any fixture titles that match it.",
    points: ["Follow state stays in this browser.", "This page does not fetch that source’s RSS.", "If the demo set has no title, the page says so."],
    storiesTitle: "Titles in this demo set",
    emptyTitle: "No titles for this source in the demo set",
    emptyBody: "The catalog includes this source, but the prepared fixtures have no matching article. This page does not pretend to crawl RSS.",
    notACrawl: "This page does not fetch RSS and does not refresh titles.",
    localOnly: "Following stays in this browser. It is not uploaded and it is not a formal subscription.",
    officialRss: "Official RSS",
    googleRss: "Google RSS",
    follow: "Follow",
    following: "Following",
    backSubscribe: "Back to Subscribe",
    openStory: "Open story",
  },
  libraryItem: {
    lead: "This page reads one text item already saved in the library.",
    points: ["The library is not the home feed.", "Analysis includes only the first 2000 characters.", "This page cannot delete one item."],
    loading: "Reading this saved item…",
    missingTitle: "This item is not in the library",
    missingBody: "It may not have been imported, or the local library is empty. Go back to the library, or open import.",
    capNotice: "Each analysis includes only the first 2000 characters of saved text. The rest is not included, and that cutoff is not evidence about the rest of the original.",
    overCap: "This item is longer than 2000 characters. The reader still shows the saved text. Analysis does not use the rest.",
    noText: "Only the title was saved. There is no summary or body.",
    analyze: "Open a demo analysis",
    analyzing: "Opening a pre-generated briefing…",
    analyzeNote: "This opens a pre-generated briefing through the existing demo path. It is not a live-model analysis of this saved text. Analyzing saved materials stays on the library, and needs the Cursor provider.",
    noRemove: "This page cannot delete a single item.",
    backLibrary: "Back to the library",
    retry: "Read again",
    readFailed: "This item could not be read.",
    testFixture: "Test fixture, not a saved historical article",
  },
  importPage: {
    lead: "Import accepts JSON you already have. It does not open links, and it does not copy the home feed into the library.",
    points: ["example.com is rejected.", "Success, validation errors, and an empty library all stay on this page.", "The library starts empty."],
    title: "Import saved text",
    rules: [
      "Each item needs an event, an outlet, a title, and a public https link.",
      "Leave body or summary null when you do not have that text. Do not invent it.",
      "example.com, *.example, *.test, and *.invalid are rejected.",
      "Completeness must match the text: full text needs a body, summary only needs a null body, and title only cannot include a summary or body.",
    ],
    label: "JSON",
    submit: "Save import",
    pending: "Saving",
    successTitle: "Saved on this machine",
    successBody: (created, updated) => `${created} added, ${updated} updated. Those links were not opened.`,
    openItem: "Open item",
    fillRejected: "Fill the example.com sample that is rejected",
    rejectedHint: "docs/corpus-import.example.json uses a reserved host. Submit it and the import is refused. It does not succeed.",
    backLibrary: "Back to the library",
    emptyLibrary: "The library is empty. A list appears only after you import text you already saved.",
  },
  briefings: {
    lead: "This list is the two pre-generated briefings in the repository, plus runs saved on this machine.",
    points: ["Each row opens the existing perspectives, evidence, and report tabs.", "After the local store is cleared, only the pre-generated briefings remain.", "The list does not call a model."],
    title: "Briefings",
    fixturesTitle: "Prepared briefings",
    localTitle: "Runs saved on this machine",
    localEmptyTitle: "No runs saved on this machine",
    localEmptyBody: "When data/store/analyses.json is missing or empty, this section is empty. The prepared briefings above stay.",
    open: "Open",
    errorTitle: "The briefing list could not be read",
    errorBody: "The local file may be damaged. The prepared briefings can still be opened from the home samples.",
    retry: "Read again",
    prepared: "Pre-generated",
    generic: "Generic demo",
    backLibrary: "Back to the library",
  },
  shared: {
    imageNote: "Openly licensed thematic photo, not a picture from this article.",
    heat: "Heat",
    heatMissing: "No data yet",
    sample: "Sample",
    demo: "Fictional",
    layout: "Fictional layout sample",
    noSource: "No source · no date",
    openStory: "Open story",
    allBriefings: "All briefings",
  },
};

const COPY: Record<Script, SubpageCopy> = { zh, "zh-Hant": hant, en };

export function subpageCopy(language: UiLanguage): SubpageCopy {
  return COPY[script(language)];
}
