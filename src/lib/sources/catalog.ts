import type { UiLanguage } from "@/lib/i18n/ui-language";

export type SourceCategory =
  | "wire"
  | "anglophone"
  | "europe"
  | "middle_east"
  | "asia"
  | "investigative"
  | "institution";

export interface NewsSource {
  id: string;
  name: string;
  domain: string;
  kind: "media" | "investigative" | "institution";
  category: SourceCategory;
  access: "official_rss" | "google_rss";
  feedUrl?: string;
  focus: string;
  logo: string;
}

export const SOURCE_CATEGORIES: readonly { id: SourceCategory; label: string; labelHant: string; labelEn: string }[] = [
  { id: "wire", label: "通讯社与财经", labelHant: "通訊社與財經", labelEn: "Wires and business" },
  { id: "anglophone", label: "英美媒体", labelHant: "英美媒體", labelEn: "US and UK outlets" },
  { id: "europe", label: "欧洲", labelHant: "歐洲", labelEn: "Europe" },
  { id: "middle_east", label: "中东", labelHant: "中東", labelEn: "Middle East" },
  { id: "asia", label: "亚太", labelHant: "亞太", labelEn: "Asia Pacific" },
  { id: "investigative", label: "调查机构", labelHant: "調查機構", labelEn: "Investigative" },
  { id: "institution", label: "国际组织", labelHant: "國際組織", labelEn: "International bodies" },
];

export const NEWS_SOURCES: readonly NewsSource[] = [
  { id: "reuters", name: "Reuters 路透社", domain: "reuters.com", kind: "media", access: "google_rss", category: "wire", focus: "国际突发、政治、财经", logo: "/sources/reuters.png" },
  { id: "ap", name: "AP 美联社", domain: "apnews.com", kind: "media", access: "google_rss", category: "wire", focus: "国际事件、现场报道", logo: "/sources/ap.png" },
  { id: "bloomberg", name: "Bloomberg 彭博", domain: "bloomberg.com", kind: "media", access: "google_rss", category: "wire", focus: "金融、能源、制裁影响", logo: "/sources/bloomberg.png" },
  { id: "bbc", name: "BBC", domain: "bbc.com", kind: "media", access: "official_rss", category: "anglophone", feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", focus: "国际综合报道", logo: "/sources/bbc.png" },
  { id: "ft", name: "Financial Times 金融时报", domain: "ft.com", kind: "media", access: "official_rss", category: "wire", feedUrl: "https://www.ft.com/rss/home", focus: "经济、外交、政策分析", logo: "/sources/ft.png" },
  { id: "guardian", name: "The Guardian 卫报", domain: "theguardian.com", kind: "media", access: "official_rss", category: "anglophone", feedUrl: "https://www.theguardian.com/world/rss", focus: "国际政治、调查报道", logo: "/sources/guardian.png" },
  { id: "npr", name: "NPR", domain: "npr.org", kind: "media", access: "official_rss", category: "anglophone", feedUrl: "https://feeds.npr.org/1001/rss.xml", focus: "美国政策、国际报道", logo: "/sources/npr.png" },
  { id: "cnn", name: "CNN", domain: "cnn.com", kind: "media", access: "official_rss", category: "anglophone", feedUrl: "https://rss.cnn.com/rss/cnn_world.rss", focus: "突发事件、现场报道", logo: "/sources/cnn.png" },
  { id: "france24", name: "France 24", domain: "france24.com", kind: "media", access: "official_rss", category: "europe", feedUrl: "https://www.france24.com/en/rss", focus: "欧洲、中东、非洲", logo: "/sources/france24.png" },
  { id: "dw", name: "DW 德国之声", domain: "dw.com", kind: "media", access: "google_rss", category: "europe", focus: "欧洲政策、国际事件", logo: "/sources/dw.png" },
  { id: "euronews", name: "Euronews", domain: "euronews.com", kind: "media", access: "official_rss", category: "europe", feedUrl: "https://www.euronews.com/rss?format=xml", focus: "欧洲事务、地区补充", logo: "/sources/euronews.png" },
  { id: "aljazeera", name: "Al Jazeera 半岛电视台", domain: "aljazeera.com", kind: "media", access: "official_rss", category: "middle_east", feedUrl: "https://www.aljazeera.com/xml/rss/all.xml", focus: "中东、地区现场报道", logo: "/sources/aljazeera.png" },
  { id: "scmp", name: "South China Morning Post 南华早报", domain: "scmp.com", kind: "media", access: "official_rss", category: "asia", feedUrl: "https://www.scmp.com/rss/91/feed/", focus: "中国、亚洲事务", logo: "/sources/scmp.png" },
  { id: "nikkei", name: "Nikkei Asia 日经亚洲", domain: "asia.nikkei.com", kind: "media", access: "google_rss", category: "asia", focus: "亚洲经济、产业、政策", logo: "/sources/nikkei.png" },
  { id: "haaretz", name: "Haaretz 国土报", domain: "haaretz.com", kind: "media", access: "google_rss", category: "middle_east", focus: "以色列政治、地区事件", logo: "/sources/haaretz.png" },
  { id: "arabnews", name: "Arab News", domain: "arabnews.com", kind: "media", access: "google_rss", category: "middle_east", focus: "沙特、海湾地区视角", logo: "/sources/arabnews.png" },
  { id: "bellingcat", name: "Bellingcat", domain: "bellingcat.com", kind: "investigative", access: "official_rss", category: "investigative", feedUrl: "https://www.bellingcat.com/feed/", focus: "图片、视频、地理定位调查", logo: "/sources/bellingcat.png" },
  { id: "iaea", name: "IAEA 国际原子能机构", domain: "iaea.org", kind: "institution", access: "official_rss", category: "institution", feedUrl: "https://www.iaea.org/feeds/topnews", focus: "核查报告、核设施与核安全", logo: "/sources/iaea.png" },
  { id: "un", name: "UN News 联合国新闻", domain: "news.un.org", kind: "institution", access: "official_rss", category: "institution", feedUrl: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", focus: "联合国声明、人道与冲突信息", logo: "/sources/un.png" },
  { id: "who", name: "WHO 世界卫生组织", domain: "who.int", kind: "institution", access: "google_rss", category: "institution", focus: "公共卫生、疫情与健康数据", logo: "/sources/who.png" },
];

const TRADITIONAL_NAMES: Record<string, string> = {
  ap: "AP 美聯社",
  ft: "Financial Times 金融時報",
  guardian: "The Guardian 衛報",
  dw: "DW 德國之聲",
  aljazeera: "Al Jazeera 半島電視台",
  scmp: "South China Morning Post 南華早報",
  nikkei: "Nikkei Asia 日經亞洲",
  haaretz: "Haaretz 國土報",
  iaea: "IAEA 國際原子能機構",
  un: "UN News 聯合國新聞",
  who: "WHO 世界衛生組織",
};

const ENGLISH_NAMES: Record<string, string> = {
  reuters: "Reuters",
  ap: "AP",
  bloomberg: "Bloomberg",
  ft: "Financial Times",
  guardian: "The Guardian",
  dw: "DW",
  aljazeera: "Al Jazeera",
  scmp: "South China Morning Post",
  nikkei: "Nikkei Asia",
  haaretz: "Haaretz",
  iaea: "IAEA",
  un: "UN News",
  who: "WHO",
};

export function sourceTitle(source: NewsSource, language: UiLanguage): string {
  if (language === "zh-Hant") return TRADITIONAL_NAMES[source.id] ?? source.name;
  if (language === "zh") return source.name;
  return ENGLISH_NAMES[source.id] ?? source.name.replace(/\s+[\u4e00-\u9fff].*$/u, "");
}

export function buildFeedUrl(source: NewsSource, query: string): string {
  if (source.access === "official_rss") return source.feedUrl!;
  const words = query.match(/[\p{L}\p{N}]+/gu) ?? [];
  const params = new URLSearchParams({
    q: `site:${source.domain} ${words.map((word) => `"${word}"`).join(" ")} when:3d`,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  return `https://news.google.com/rss/search?${params}`;
}