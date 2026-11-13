export interface NewsSource {
  id: string;
  name: string;
  domain: string;
  kind: "media" | "investigative" | "institution";
  access: "official_rss" | "google_rss";
  feedUrl?: string;
  focus: string;
}

export const NEWS_SOURCES: readonly NewsSource[] = [
  { id: "reuters", name: "Reuters 路透社", domain: "reuters.com", kind: "media", access: "google_rss", focus: "国际突发、政治、财经" },
  { id: "ap", name: "AP 美联社", domain: "apnews.com", kind: "media", access: "google_rss", focus: "国际事件、现场报道" },
  { id: "bloomberg", name: "Bloomberg 彭博", domain: "bloomberg.com", kind: "media", access: "google_rss", focus: "金融、能源、制裁影响" },
  { id: "bbc", name: "BBC", domain: "bbc.com", kind: "media", access: "official_rss", feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", focus: "国际综合报道" },
  { id: "ft", name: "Financial Times 金融时报", domain: "ft.com", kind: "media", access: "official_rss", feedUrl: "https://www.ft.com/rss/home", focus: "经济、外交、政策分析" },
  { id: "guardian", name: "The Guardian 卫报", domain: "theguardian.com", kind: "media", access: "official_rss", feedUrl: "https://www.theguardian.com/world/rss", focus: "国际政治、调查报道" },
  { id: "npr", name: "NPR", domain: "npr.org", kind: "media", access: "official_rss", feedUrl: "https://feeds.npr.org/1001/rss.xml", focus: "美国政策、国际报道" },
  { id: "cnn", name: "CNN", domain: "cnn.com", kind: "media", access: "official_rss", feedUrl: "https://rss.cnn.com/rss/cnn_world.rss", focus: "突发事件、现场报道" },
  { id: "france24", name: "France 24", domain: "france24.com", kind: "media", access: "official_rss", feedUrl: "https://www.france24.com/en/rss", focus: "欧洲、中东、非洲" },
  { id: "dw", name: "DW 德国之声", domain: "dw.com", kind: "media", access: "google_rss", focus: "欧洲政策、国际事件" },
  { id: "euronews", name: "Euronews", domain: "euronews.com", kind: "media", access: "official_rss", feedUrl: "https://www.euronews.com/rss?format=xml", focus: "欧洲事务、地区补充" },
  { id: "aljazeera", name: "Al Jazeera 半岛电视台", domain: "aljazeera.com", kind: "media", access: "official_rss", feedUrl: "https://www.aljazeera.com/xml/rss/all.xml", focus: "中东、地区现场报道" },
  { id: "scmp", name: "South China Morning Post 南华早报", domain: "scmp.com", kind: "media", access: "official_rss", feedUrl: "https://www.scmp.com/rss/91/feed/", focus: "中国、亚洲事务" },
  { id: "nikkei", name: "Nikkei Asia 日经亚洲", domain: "asia.nikkei.com", kind: "media", access: "google_rss", focus: "亚洲经济、产业、政策" },
  { id: "haaretz", name: "Haaretz 国土报", domain: "haaretz.com", kind: "media", access: "google_rss", focus: "以色列政治、地区事件" },
  { id: "arabnews", name: "Arab News", domain: "arabnews.com", kind: "media", access: "google_rss", focus: "沙特、海湾地区视角" },
  { id: "bellingcat", name: "Bellingcat", domain: "bellingcat.com", kind: "investigative", access: "official_rss", feedUrl: "https://www.bellingcat.com/feed/", focus: "图片、视频、地理定位调查" },
  { id: "iaea", name: "IAEA 国际原子能机构", domain: "iaea.org", kind: "institution", access: "official_rss", feedUrl: "https://www.iaea.org/feeds/topnews", focus: "核查报告、核设施与核安全" },
  { id: "un", name: "UN News 联合国新闻", domain: "news.un.org", kind: "institution", access: "official_rss", feedUrl: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", focus: "联合国声明、人道与冲突信息" },
  { id: "who", name: "WHO 世界卫生组织", domain: "who.int", kind: "institution", access: "google_rss", focus: "公共卫生、疫情与健康数据" },
];

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
