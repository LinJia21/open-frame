import type { HomeEventCard } from "@/lib/home/feed";
import type { UiLanguage } from "@/lib/i18n/ui-language";

type PageScript = "zh" | "zh-Hant" | "en";

function script(language: UiLanguage): PageScript {
  if (language === "zh" || language === "zh-Hant") return language;
  return "en";
}

export interface FrameCopy {
  lead: string;
  points: string[];
}

export interface ClosedPlan {
  name: string;
  blurb: string;
  benefits: string[];
}

export interface SubscribeCopy extends FrameCopy {
  title: string;
  badge: string;
  intro: string;
  unpriced: string;
  cta: string;
  noCharge: string;
  footnote: string;
  plans: ClosedPlan[];
}

export interface MeCopy extends FrameCopy {
  title: string;
  name: string;
  badge: string;
  intro: string;
  settings: string;
  settingsHint: string;
  settingsState: string;
  account: string;
  accountHint: string;
  accountState: string;
  login: string;
  loginHint: string;
}

const subscribe: Record<PageScript, SubscribeCopy> = {
  zh: {
    lead: "订阅是一张还不能用的方案页。没有价格，也不会扣款。",
    points: ["按钮是停用的。", "不会创建订单。", "不会出现购买成功。"],
    title: "订阅",
    badge: "尚未开通",
    intro: "订阅还没开通。下面的方案只是页面样子，现在不能购买。",
    unpriced: "未定价",
    cta: "尚未开通",
    noCharge: "没有可支付的价格，也不会扣款。",
    footnote: "这些按钮点不了。这里不会创建订单，也不会显示购买成功。",
    plans: [
      {
        name: "阅读",
        blurb: "留给以后的阅读记录。现在没有这份清单。",
        benefits: ["不解锁首页上已经能看的示例", "不保存关注", "不收费"],
      },
      {
        name: "研究",
        blurb: "留给以后的导出说明。示例报告的导出仍在报告页，不经过这里。",
        benefits: ["不增加新的分析", "不调用模型", "不收费"],
      },
      {
        name: "存档",
        blurb: "留给以后的个人存档。现在没有账号可以挂上。",
        benefits: ["不创建账号", "不保存付款方式", "不收费"],
      },
    ],
  },
  "zh-Hant": {
    lead: "訂閱是一張還不能用的方案頁。沒有價格，也不會扣款。",
    points: ["按鈕是停用的。", "不會建立訂單。", "不會出現購買成功。"],
    title: "訂閱",
    badge: "尚未開通",
    intro: "訂閱還沒開通。下面的方案只是頁面樣子，現在不能購買。",
    unpriced: "未定價",
    cta: "尚未開通",
    noCharge: "沒有可支付的價格，也不會扣款。",
    footnote: "這些按鈕點不了。這裡不會建立訂單，也不會顯示購買成功。",
    plans: [
      {
        name: "閱讀",
        blurb: "留給以後的閱讀記錄。現在沒有這份清單。",
        benefits: ["不解鎖首頁上已經能看的示例", "不保存關注", "不收費"],
      },
      {
        name: "研究",
        blurb: "留給以後的導出說明。示例報告的導出仍在報告頁，不經過這裡。",
        benefits: ["不增加新的分析", "不呼叫模型", "不收費"],
      },
      {
        name: "存檔",
        blurb: "留給以後的個人存檔。現在沒有帳號可以掛上。",
        benefits: ["不建立帳號", "不保存付款方式", "不收費"],
      },
    ],
  },
  en: {
    lead: "Subscribe is a plan screen that is not open. There is no price and nothing is charged.",
    points: ["The buttons are off.", "No order is created.", "A purchase cannot succeed here."],
    title: "Subscribe",
    badge: "Not open",
    intro: "Subscribe is not open. The plans below are the screen only. Nothing can be bought.",
    unpriced: "Unpriced",
    cta: "Not open",
    noCharge: "There is no payable price, and nothing is charged.",
    footnote: "These buttons do nothing. This page does not create an order or show a successful purchase.",
    plans: [
      {
        name: "Reading",
        blurb: "Reserved for a later reading list. There is no list now.",
        benefits: ["Does not unlock the samples already on Home", "Does not save follows", "No charge"],
      },
      {
        name: "Research",
        blurb: "Reserved for a later export note. Sample report export stays on the report page.",
        benefits: ["Does not add an analysis", "Does not call a model", "No charge"],
      },
      {
        name: "Archive",
        blurb: "Reserved for a later personal archive. There is no account to attach.",
        benefits: ["Does not create an account", "Does not store a payment method", "No charge"],
      },
    ],
  },
};

const me: Record<PageScript, MeCopy> = {
  zh: {
    lead: "我的是个人入口。账号和登录还没开通。设置可以打开。",
    points: ["没有账号。", "登录按钮是停用的。", "设置仍在单独的页面。"],
    title: "我的",
    name: "未登录",
    badge: "尚未开通",
    intro: "这里还没有账号。登录是停用的，不会出现登录成功。",
    settings: "设置",
    settingsHint: "提供方说明，以及首页示例的范围",
    settingsState: "可打开",
    account: "账号",
    accountHint: "没有个人资料，也没有头像",
    accountState: "尚未开通",
    login: "登录",
    loginHint: "不会连接账号服务",
  },
  "zh-Hant": {
    lead: "我的是個人入口。帳號和登入還沒開通。設定可以打開。",
    points: ["沒有帳號。", "登入按鈕是停用的。", "設定仍在單獨的頁面。"],
    title: "我的",
    name: "未登入",
    badge: "尚未開通",
    intro: "這裡還沒有帳號。登入是停用的，不會出現登入成功。",
    settings: "設定",
    settingsHint: "提供方說明，以及首頁示例的範圍",
    settingsState: "可打開",
    account: "帳號",
    accountHint: "沒有個人資料，也沒有頭像",
    accountState: "尚未開通",
    login: "登入",
    loginHint: "不會連接帳號服務",
  },
  en: {
    lead: "Me is the profile entry. Account and sign-in are not open. Settings can be opened.",
    points: ["There is no account.", "Sign-in is off.", "Settings stays on its own page."],
    title: "Me",
    name: "Not signed in",
    badge: "Not open",
    intro: "There is no account here. Sign-in is off, so it cannot succeed.",
    settings: "Settings",
    settingsHint: "Provider note and the scope of the home samples",
    settingsState: "Open",
    account: "Account",
    accountHint: "No profile and no portrait",
    accountState: "Not open",
    login: "Sign in",
    loginHint: "Does not contact an account service",
  },
};

export function subscribeCopy(language: UiLanguage): SubscribeCopy {
  return subscribe[script(language)];
}

export function meCopy(language: UiLanguage): MeCopy {
  return me[script(language)];
}

export function libraryFrame(language: UiLanguage): FrameCopy & { title: string; intro: string } {
  if (language === "zh-Hant") {
    return {
      lead: "資料庫只處理已經保存的文字：導入、檢索和分析都不搜尋首頁的新聞來源。",
      points: ["預設沒有歷史記錄，這裡不會填入假列表。", "演示模式不會假裝已經接上即時模型。", "首頁搜索讀的是訂閱裡選中的來源，不會把結果存進這裡。"],
      title: "已保存的歷史資料",
      intro: "每篇分析只納入已保存文本的前 2000 字。超出部分未納入分析。不能據此推斷完整原文缺乏證據。",
    };
  }
  if (language === "zh") {
    return {
      lead: "资料库只处理已经保存的文字：导入、检索和分析都不搜索首页的新闻来源。",
      points: ["默认没有历史记录，这里不会填入假列表。", "演示模式不会假装已经接上实时模型。", "首页搜索读的是订阅里选中的来源，不会把结果存进这里。"],
      title: "已保存的历史资料",
      intro: "每篇分析只纳入已保存文本的前 2000 字。超出部分未纳入分析。不能据此推断完整原文缺乏证据。",
    };
  }
  return {
    lead: "The library only handles text you already saved. Import, search, and analysis do not search the sources followed on Subscribe.",
    points: [
      "There is no saved history until you import. Nothing here is filled in.",
      "Demo mode does not pretend a live model is connected.",
      "Home search reads the sources selected on Subscribe and does not save those results here.",
    ],
    title: "Saved historical materials",
    intro: "Each analysis includes only the first 2000 characters of saved text. The rest is not included, and that cutoff is not evidence about the rest of the original.",
  };
}

export function settingsFrame(language: UiLanguage): FrameCopy & {
  crumb: string;
  title: string;
  library: string;
  libraryBody: (count: number) => string;
  provider: string;
  providerSecret: string;
  samples: string;
  samplesBody: string;
} {
  if (language === "zh-Hant") {
    return {
      lead: "設定只說明已經能打開的入口，不會把未開通的功能裝成可用。",
      points: ["資料庫不是首頁新聞流。", "提供方狀態是公開說明，不讀取密鑰。", "首頁熱度沒有數字。"],
      crumb: "設定",
      title: "設定",
      library: "已保存的歷史資料",
      libraryBody: (count) => `導入和檢索已經保存的文字。當前 ${count} 條。這不是首頁上的新聞流。`,
      provider: "提供方",
      providerSecret: "這裡不讀取密鑰，也不發起呼叫。",
      samples: "首頁示例",
      samplesBody: "首頁只標「演示示例 · 非即時」。熱度沒有記錄，所以寫暫無數據。熱度不是可信度。下面的主張計數來自夾具，不是對整件事的真偽判斷。",
    };
  }
  if (language === "zh") {
    return {
      lead: "设置只说明已经能打开的入口，不会把未开通的功能装成可用。",
      points: ["资料库不是首页新闻流。", "提供方状态是公开说明，不读取密钥。", "首页热度没有数字。"],
      crumb: "设置",
      title: "设置",
      library: "已保存的历史资料",
      libraryBody: (count) => `导入和检索已经保存的文字。当前 ${count} 条。这不是首页上的新闻流。`,
      provider: "提供方",
      providerSecret: "这里不读取密钥，也不发起调用。",
      samples: "首页示例",
      samplesBody: "首页只标「演示示例 · 非实时」。热度没有记录，所以写暂无数据。热度不是可信度。下面的主张计数来自夹具，不是对整件事的真伪判断。",
    };
  }
  return {
    lead: "Settings only describes entries that already open.",
    points: ["The library is not the home feed.", "Provider status is public. No secret is read.", "Heat has no number."],
    crumb: "Settings",
    title: "Settings",
    library: "Saved historical materials",
    libraryBody: (count) => `Import and search text you already saved. ${count} items now. This is not the home news feed.`,
    provider: "Provider",
    providerSecret: "This screen does not read a secret and does not make a call.",
    samples: "Home samples",
    samplesBody:
      "Home is marked as a sample, not live. Heat has no record, so it says there is no data. Heat is not credibility. The claim counts below come from the fixtures and are not a verdict on the whole event.",
  };
}

export function describeHomeSample(language: UiLanguage, card: HomeEventCard): string {
  const mode = script(language);
  if (card.sampleKind === "layout-sample") {
    if (mode === "zh-Hant") return "虛構佈局樣例。沒有來源、沒有日期、沒有分析頁。";
    if (mode === "zh") return "虚构布局样例。没有来源、没有日期、没有分析页。";
    return "Fictional layout sample. No source, no date, and no analysis page.";
  }
  const status = card.statusCounts.map((item) => `${item.status} ${item.count}`).join(" · ") || (mode === "en" ? "none" : mode === "zh-Hant" ? "無" : "无");
  const kind =
    card.sampleKind === "fictional-demo"
      ? mode === "zh-Hant"
        ? "虛構演示。"
        : mode === "zh"
          ? "虚构演示。"
          : "Fictional demonstration."
      : mode === "zh-Hant"
        ? "示例。夾具中的來源連結，分析是預生成的。"
        : mode === "zh"
          ? "示例。夹具中的来源链接，分析是预生成的。"
          : "Sample. Fixture source links, and the analysis is pre-generated.";
  if (mode === "zh-Hant") {
    return `${kind} 生成時間 ${card.generatedAt}。夾具內 ${card.articleCount} 篇，列出 ${card.outletCount} 家媒體。日期 ${card.datedFrom ?? "無"} 至 ${card.datedTo ?? "無"}。沒有日期的 ${card.undatedCount} 篇。主張計數：${status}。首頁卡片只顯示其中一篇的來源和日期。`;
  }
  if (mode === "zh") {
    return `${kind} 生成时间 ${card.generatedAt}。夹具内 ${card.articleCount} 篇，列出 ${card.outletCount} 家媒体。日期 ${card.datedFrom ?? "无"} 至 ${card.datedTo ?? "无"}。没有日期的 ${card.undatedCount} 篇。主张计数：${status}。首页卡片只显示其中一篇的来源和日期。`;
  }
  return `${kind} Generated ${card.generatedAt}. Fixture ${card.articleCount} articles, ${card.outletCount} outlets. Dates ${card.datedFrom ?? "none"} to ${card.datedTo ?? "none"}. Undated ${card.undatedCount}. Claim counts: ${status}. The home card shows one article’s source and date.`;
}

export function analysisFrame(language: UiLanguage): FrameCopy {
  if (language === "zh-Hant") {
    return {
      lead: "這一頁讀的是已經準備好的簡報。三個分頁不會再呼叫模型。",
      points: [
        "真實來源樣本使用報導連結，分析是 PRECOMPUTED。",
        "虛構演示保持 DEMO，不是真實新聞。",
        "證據核查只看單條主張，不對整件事下結論。",
      ],
    };
  }
  if (language === "zh") {
    return {
      lead: "这一页读的是已经准备好的简报。三个分页不会再调用模型。",
      points: [
        "真实来源样本使用报道链接，分析是 PRECOMPUTED。",
        "虚构演示保持 DEMO，不是真实新闻。",
        "证据核查只看单条主张，不对整件事下结论。",
      ],
    };
  }
  return {
    lead: "This page reads a prepared briefing. The three sections do not call a model.",
    points: [
      "The real-source sample uses reporting links. Its analysis is PRECOMPUTED.",
      "The fictional demonstration stays DEMO. It is not real news.",
      "Evidence audit checks claims one by one. It does not judge the whole story.",
    ],
  };
}

export function suggestionKind(language: UiLanguage, index: number): string {
  const primary = index === 0;
  if (language === "zh-Hant") return primary ? "主要演示" : "預備演示";
  if (language === "zh") return primary ? "主要演示" : "预备演示";
  return primary ? "Primary demo" : "Prepared demo";
}

export function runFrame(language: UiLanguage): FrameCopy & { title: string } {
  if (language === "zh-Hant") {
    return {
      title: "分析運行",
      lead: "這一頁只顯示已建立的運行狀態。它不是開通測試，也不會改寫演示簡報。",
      points: ["liveCallVerified 保持 false。", "失敗不會自動再付費。", "演示簡報仍是預生成的。"],
    };
  }
  if (language === "zh") {
    return {
      title: "分析运行",
      lead: "这一页只显示已经创建的运行状态。它不是开通测试，也不会改写演示简报。",
      points: ["liveCallVerified 保持 false。", "失败不会自动再付费。", "演示简报仍是预生成的。"],
    };
  }
  return {
    title: "Analysis run",
    lead: "This page shows a run that was already created. It is not a connection test and it does not rewrite a demonstration briefing.",
    points: ["liveCallVerified stays false.", "A failure does not start another paid run by itself.", "Demonstration briefings stay pre-generated."],
  };
}
