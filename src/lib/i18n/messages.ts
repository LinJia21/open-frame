import type { Language } from "@/lib/i18n/languages";
import type { VerificationStatus } from "@/lib/openframe/openframe";

export interface Messages {
  skip: string;
  footer: string;
  bannerBody: string;
  nav: {
    home: string;
    perspectives: string;
    evidence: string;
    report: string;
    progress: string;
  };
  home: {
    eyebrow: string;
    sloganTranslated: string;
    deck: string;
    topicLabel: string;
    topicPlaceholder: string;
    topicHint: string;
    languageLabel: string;
    analyze: string;
    preparing: string;
    suggestionsTitle: string;
    suggestionsHint: string;
    flowTitle: string;
    steps: [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
    recentTitle: string;
    recentEmptyTitle: string;
    recentEmptyBody: string;
    recentErrorTitle: string;
    recentErrorBody: string;
    preparedChip: string;
    genericChip: string;
    openBriefing: string;
    validationEmpty: string;
    validationShort: string;
    validationLong: string;
    validationSymbols: string;
    errorNetwork: string;
    errorGeneric: string;
    errorProvider: string;
    errorStore: string;
    errorInvalid: string;
  };
  briefing: {
    yourTopic: string;
    preparedMatch: string;
    genericMatch: string;
    created: string;
    placeholderLink: string;
    narrativeTitle: string;
    sharedTitle: string;
    divergeTitle: string;
    emphasis: string;
    omission: string;
    articlesTitle: string;
    claimsTitle: string;
    legendTitle: string;
    whyLabel: string;
    evidenceChecked: string;
    limitationsTitle: string;
    emptyArticlesTitle: string;
    emptyArticlesBody: string;
    emptyClaimsTitle: string;
    emptyClaimsBody: string;
    emptyReportTitle: string;
    emptyReportBody: string;
    notFoundTitle: string;
    notFoundBody: string;
    errorTitle: string;
    errorBody: string;
    generatedUnretrieved: string;
    retry: string;
    backHome: string;
    loading: string;
  };
  verificationHelp: Record<VerificationStatus, string>;
  report: {
    summary: string;
    keyPerspectives: string;
    claimAudit: string;
    methodology: string;
    limitations: string;
    excerptLimit: string;
    sources: string;
    exportMd: string;
    exportJson: string;
    print: string;
    downloaded: string;
    columnClaim: string;
    columnLabel: string;
    columnEvidence: string;
    columnRationale: string;
    generated: string;
    query: string;
    language: string;
    provider: string;
    providerDemo: string;
    mastheadNote: string;
    kind: Record<"article_analysed" | "evidence" | "background" | "primary_source", string>;
    noneYet: string;
  };
}

const en: Messages = {
  skip: "Skip to content",
  footer:
    "OpenFrame AI is a research prototype. It does not search the live web. Sample briefings are fiction.",
  bannerBody:
    "This prototype does not search live news. Briefings are fictional, and links open example.com.",
  nav: {
    home: "Home",
    perspectives: "Perspectives",
    evidence: "Evidence Audit",
    report: "Research Report",
    progress: "Briefing steps",
  },
  home: {
    eyebrow: "Media intelligence prototype",
    sloganTranslated: "See Beyond the Headlines.",
    deck: "Compare how outlets frame a topic, check the factual claims they make, and leave with a structured research report.",
    topicLabel: "Topic",
    topicPlaceholder: "Try “Is AI-generated Animation Disrupting the Traditional Film and Television Industry?”, or type any topic",
    topicHint:
      "One prepared topic uses real sources. One uses fictional outlets. Any other topic returns a clearly labeled generic template, not an analysis of that subject.",
    languageLabel: "Report language",
    analyze: "Analyze",
    preparing: "Preparing briefing…",
    suggestionsTitle: "Prepared demo topics",
    suggestionsHint: "Open a prepared briefing, or fill the topic box. Labels follow data_mode.",
    flowTitle: "What you get",
    steps: [
      {
        title: "Perspectives",
        body: "Read sample articles and compare how each outlet frames the topic.",
      },
      {
        title: "Evidence audit",
        body: "Inspect extracted claims, the sources behind them, and a verification label.",
      },
      {
        title: "Research report",
        body: "Export a structured briefing as Markdown, JSON, or a printed PDF.",
      },
    ],
    recentTitle: "Recent briefings",
    recentEmptyTitle: "No briefings saved yet",
    recentEmptyBody:
      "After you analyze a topic, the briefing is stored in a local JSON file and listed here.",
    recentErrorTitle: "Saved briefings could not be read",
    recentErrorBody:
      "The local demo file may be damaged. You can still start a new analysis above.",
    preparedChip: "Prepared demo",
    genericChip: "Generic demo",
    openBriefing: "Open briefing",
    validationEmpty: "Enter a topic to analyze.",
    validationShort: "Use at least 2 characters.",
    validationLong: "Keep the topic under 200 characters.",
    validationSymbols: "Use words, not symbols alone.",
    errorNetwork:
      "The app could not reach its own server. Check that the dev server is running, then try again.",
    errorGeneric: "The analysis did not finish. Please try again.",
    errorProvider:
      "That analysis provider is not available yet. This prototype still uses demonstration data.",
    errorStore: "The briefing could not be saved to the local file.",
    errorInvalid: "The request was not understood. Check the topic and language.",
  },
  briefing: {
    yourTopic: "Your topic",
    preparedMatch: "Prepared demonstration",
    genericMatch: "Generic demonstration template",
    created: "Created",
    placeholderLink: "Original article",
    narrativeTitle: "How the sample outlets frame it",
    sharedTitle: "What they share",
    divergeTitle: "Where they diverge",
    emphasis: "Emphasizes",
    omission: "Leaves out",
    articlesTitle: "Sample articles",
    claimsTitle: "Extracted claims",
    legendTitle: "What the labels mean",
    whyLabel: "Why this label",
    evidenceChecked: "Evidence checked",
    limitationsTitle: "Limitations",
    emptyArticlesTitle: "No articles in this briefing",
    emptyArticlesBody:
      "The comparison needs at least one sample article. This record does not have any.",
    emptyClaimsTitle: "No claims in this briefing",
    emptyClaimsBody:
      "An evidence audit lists factual claims pulled from the sample articles. This record has none.",
    emptyReportTitle: "No report in this briefing",
    emptyReportBody:
      "The research report is missing from this record, so there is nothing to export.",
    notFoundTitle: "This briefing is not in the local store",
    notFoundBody:
      "The link may be mistyped, or the demo file was cleared. Start a new analysis from the home page.",
    errorTitle: "The briefing could not be loaded",
    errorBody: "Something went wrong while reading the local demo store.",
    generatedUnretrieved:
      "This briefing was generated when you asked. Citations, if any, are limited to the saved materials selected for the run. It is not a live internet search and not an external fact check. A demonstration briefing still uses example links only.",
    retry: "Try again",
    backHome: "Back to home",
    loading: "Loading briefing",
  },
  verificationHelp: {
    Verified: "Supported by the archive, with no credible contradiction in the file.",
    "Partially Supported": "Some of the claim is supported. The rest is incomplete or overstated.",
    Disputed: "Credible items in the archive conflict, and the file does not settle it.",
    Unverified: "The archive does not contain enough to treat the claim as established.",
    Contradicted: "The best item in the archive goes against the claim.",
  },
  report: {
    summary: "Summary",
    keyPerspectives: "Key perspectives",
    claimAudit: "Claim audit",
    methodology: "Methodology",
    limitations: "Limitations",
    excerptLimit: "Only the first 2000 characters of each saved text are included. Content beyond that was not included in the analysis. 超出部分未纳入分析。 That cutoff is not evidence that the rest of the original lacks support.",
    sources: "Sources",
    exportMd: "Download Markdown",
    exportJson: "Download JSON",
    print: "Print / Save as PDF",
    downloaded: "Download started.",
    columnClaim: "Claim",
    columnLabel: "Verification",
    columnEvidence: "Evidence",
    columnRationale: "Rationale",
    generated: "Generated",
    query: "Topic entered",
    language: "Language",
    provider: "Data provider",
    providerDemo: "Demonstration files (not a live model)",
    mastheadNote:
      "Fictional demonstration report. Not real news and not a live web search.",
    kind: {
      article_analysed: "Analysed article",
      evidence: "Evidence",
      background: "Background",
      primary_source: "Primary source",
    },
    noneYet: "None listed",
  },
};

const zh: Messages = {
  skip: "跳到正文",
  footer:
    "OpenFrame AI 是一个研究原型。它不搜索实时网页。示例简报都是虚构的。",
  bannerBody:
    "此原型不搜索实时新闻。简报是虚构的，链接会打开 example.com。",
  nav: {
    home: "首页",
    perspectives: "视角对照",
    evidence: "证据审计",
    report: "研究报告",
    progress: "简报步骤",
  },
  home: {
    eyebrow: "媒体情报原型",
    sloganTranslated: "看见标题之外。",
    deck: "比较不同媒体如何框定一个议题，核对其事实主张，并得到一份结构清楚的研究报告。",
    topicLabel: "议题",
    topicPlaceholder: "试试「人工智能生成的动画是否正在冲击传统影视行业？」，或输入任何议题",
    topicHint:
      "预备议题会返回虚构简报。其他议题会返回标明的通用演示，而不是对该议题的真实分析。",
    languageLabel: "报告语言",
    analyze: "开始分析",
    preparing: "正在准备简报…",
    suggestionsTitle: "预备演示议题",
    suggestionsHint: "点选后会填入议题栏。这些故事都是编造的。",
    flowTitle: "你会得到什么",
    steps: [
      {
        title: "视角对照",
        body: "阅读示例文章，并比较各媒体如何框定同一议题。",
      },
      {
        title: "证据审计",
        body: "查看抽出的事实主张、对应来源，以及核验标签。",
      },
      {
        title: "研究报告",
        body: "把结构化简报导出为 Markdown、JSON，或打印成 PDF。",
      },
    ],
    recentTitle: "最近的简报",
    recentEmptyTitle: "还没有保存的简报",
    recentEmptyBody: "分析一个议题后，简报会写入本机 JSON 文件，并出现在这里。",
    recentErrorTitle: "无法读取已保存的简报",
    recentErrorBody: "本地演示文件可能已损坏。你仍可以从上方开始一次新的分析。",
    preparedChip: "预备演示",
    genericChip: "通用演示",
    openBriefing: "打开简报",
    validationEmpty: "请输入要分析的议题。",
    validationShort: "至少输入 2 个字符。",
    validationLong: "请把议题控制在 200 个字符以内。",
    validationSymbols: "请输入包含文字的议题，不要只使用符号。",
    errorNetwork: "应用无法连接自己的服务器。请确认开发服务器正在运行，然后重试。",
    errorGeneric: "这次分析没有完成。请再试一次。",
    errorProvider: "所选的分析服务还不能使用。当前原型仍使用演示数据。",
    errorStore: "简报无法写入本地文件。",
    errorInvalid: "请求无法识别。请检查议题和语言。",
  },
  briefing: {
    yourTopic: "你输入的议题",
    preparedMatch: "预备演示",
    genericMatch: "通用演示模板",
    created: "创建时间",
    placeholderLink: "原文",
    narrativeTitle: "示例媒体如何框定这个故事",
    sharedTitle: "它们的共同点",
    divergeTitle: "它们的分歧",
    emphasis: "着重写",
    omission: "很少写",
    articlesTitle: "示例文章",
    claimsTitle: "抽出的主张",
    legendTitle: "标签是什么意思",
    whyLabel: "为何使用这个标签",
    evidenceChecked: "核对过的证据",
    limitationsTitle: "局限",
    emptyArticlesTitle: "这份简报没有文章",
    emptyArticlesBody: "对照至少需要一篇示例文章。这条记录里没有。",
    emptyClaimsTitle: "这份简报没有主张",
    emptyClaimsBody: "证据审计会列出从示例文章抽出的事实主张。这条记录里没有。",
    emptyReportTitle: "这份简报没有报告",
    emptyReportBody: "这条记录缺少研究报告，因此没有可导出的内容。",
    notFoundTitle: "本地库里没有这份简报",
    notFoundBody: "链接可能写错了，或演示文件已被清空。请从首页开始一次新的分析。",
    errorTitle: "简报无法加载",
    errorBody: "读取本地演示库时出了问题。",
    generatedUnretrieved: "这份简报是你请求时生成的。如果引用了资料，那些引用只来自这次选中的已保存材料。它不是实时互联网搜索，也不是外部事实核验。演示简报仍然只用示例链接。",
    retry: "重试",
    backHome: "返回首页",
    loading: "正在加载简报",
  },
  verificationHelp: {
    Verified: "档案支持该主张，文件中没有可信的相反材料。",
    "Partially Supported": "主张的一部分有支持，其余不完整或说过了头。",
    Disputed: "档案中的可信材料互相冲突，文件没有把问题定下来。",
    Unverified: "档案里的材料不足以把该主张视为已经成立。",
    Contradicted: "档案中最有力的材料与该主张相反。",
  },
  report: {
    summary: "摘要",
    keyPerspectives: "主要视角",
    claimAudit: "主张审计",
    methodology: "方法",
    limitations: "局限",
    excerptLimit: "每篇分析只纳入已保存文本的前 2000 字。超出部分未纳入分析。不能据此推断完整原文缺乏证据。",
    sources: "来源",
    exportMd: "下载 Markdown",
    exportJson: "下载 JSON",
    print: "打印 / 保存为 PDF",
    downloaded: "已开始下载。",
    columnClaim: "主张",
    columnLabel: "核验",
    columnEvidence: "证据",
    columnRationale: "理由",
    generated: "生成时间",
    query: "输入的议题",
    language: "语言",
    provider: "数据来源",
    providerDemo: "演示文件（不是实时模型）",
    mastheadNote: "虚构演示报告。不是真实新闻，也不是实时网页搜索。",
    kind: {
      article_analysed: "被分析的文章",
      evidence: "证据",
      background: "背景",
      primary_source: "原始来源",
    },
    noneYet: "未列出",
  },
};

const es: Messages = {
  skip: "Saltar al contenido",
  footer:
    "OpenFrame AI es un prototipo de investigación. No busca en la web en vivo. Los informes de muestra son ficción.",
  bannerBody:
    "Este prototipo no busca noticias en vivo. Los informes son ficticios y los enlaces abren example.com.",
  nav: {
    home: "Inicio",
    perspectives: "Perspectivas",
    evidence: "Auditoría de evidencia",
    report: "Informe de investigación",
    progress: "Pasos del informe",
  },
  home: {
    eyebrow: "Prototipo de inteligencia de medios",
    sloganTranslated: "Ver más allá de los titulares.",
    deck: "Compara cómo los medios enmarcan un tema, revisa las afirmaciones factuales y obtén un informe de investigación estructurado.",
    topicLabel: "Tema",
    topicPlaceholder:
      "Prueba “¿La animación generada por IA está alterando la industria tradicional del cine y la televisión?” o escribe cualquier tema",
    topicHint:
      "Los temas preparados devuelven un informe ficticio. Cualquier otro tema devuelve una demo genérica, claramente etiquetada, no un análisis real.",
    languageLabel: "Idioma del informe",
    analyze: "Analizar",
    preparing: "Preparando el informe…",
    suggestionsTitle: "Temas de demostración preparados",
    suggestionsHint:
      "Elige uno para rellenar el campo. Cada historia es inventada.",
    flowTitle: "Qué obtienes",
    steps: [
      {
        title: "Perspectivas",
        body: "Lee artículos de muestra y compara cómo cada medio enmarca el tema.",
      },
      {
        title: "Auditoría de evidencia",
        body: "Revisa las afirmaciones extraídas, sus fuentes y una etiqueta de verificación.",
      },
      {
        title: "Informe de investigación",
        body: "Exporta un informe estructurado en Markdown, JSON o PDF impreso.",
      },
    ],
    recentTitle: "Informes recientes",
    recentEmptyTitle: "Aún no hay informes guardados",
    recentEmptyBody:
      "Cuando analices un tema, el informe se guarda en un archivo JSON local y aparece aquí.",
    recentErrorTitle: "No se pudieron leer los informes guardados",
    recentErrorBody:
      "El archivo de demostración local puede estar dañado. Aún puedes iniciar un análisis arriba.",
    preparedChip: "Demo preparada",
    genericChip: "Demo genérica",
    openBriefing: "Abrir informe",
    validationEmpty: "Escribe un tema para analizar.",
    validationShort: "Usa al menos 2 caracteres.",
    validationLong: "Mantén el tema por debajo de 200 caracteres.",
    validationSymbols: "Usa palabras, no solo símbolos.",
    errorNetwork:
      "La aplicación no pudo conectar con su propio servidor. Comprueba que el servidor de desarrollo está en marcha e inténtalo de nuevo.",
    errorGeneric: "El análisis no terminó. Inténtalo de nuevo.",
    errorProvider:
      "Ese proveedor de análisis aún no está disponible. Este prototipo sigue usando datos de demostración.",
    errorStore: "El informe no se pudo guardar en el archivo local.",
    errorInvalid: "No se entendió la solicitud. Revisa el tema y el idioma.",
  },
  briefing: {
    yourTopic: "Tu tema",
    preparedMatch: "Demostración preparada",
    genericMatch: "Plantilla de demostración genérica",
    created: "Creado",
    placeholderLink: "Artículo original",
    narrativeTitle: "Cómo lo enmarcan los medios de muestra",
    sharedTitle: "Lo que comparten",
    divergeTitle: "Dónde divergen",
    emphasis: "Destaca",
    omission: "Deja fuera",
    articlesTitle: "Artículos de muestra",
    claimsTitle: "Afirmaciones extraídas",
    legendTitle: "Qué significan las etiquetas",
    whyLabel: "Por qué esta etiqueta",
    evidenceChecked: "Evidencia revisada",
    limitationsTitle: "Limitaciones",
    emptyArticlesTitle: "Este informe no tiene artículos",
    emptyArticlesBody:
      "La comparación necesita al menos un artículo de muestra. Este registro no tiene ninguno.",
    emptyClaimsTitle: "Este informe no tiene afirmaciones",
    emptyClaimsBody:
      "La auditoría enumera afirmaciones factuales extraídas de los artículos. Este registro no tiene ninguna.",
    emptyReportTitle: "Este informe no tiene reporte",
    emptyReportBody:
      "Falta el informe de investigación en este registro, así que no hay nada que exportar.",
    notFoundTitle: "Este informe no está en el almacén local",
    notFoundBody:
      "El enlace puede estar mal escrito, o el archivo de demostración se vació. Empieza un análisis nuevo desde el inicio.",
    errorTitle: "No se pudo cargar el informe",
    errorBody: "Algo falló al leer el almacén de demostración local.",
    generatedUnretrieved:
      "Este informe se generó al pedirlo. Las citas, si las hay, se limitan a los materiales guardados elegidos. No es una búsqueda en internet ni una verificación externa. La demostración sigue usando enlaces de ejemplo.",
    retry: "Reintentar",
    backHome: "Volver al inicio",
    loading: "Cargando el informe",
  },
  verificationHelp: {
    Verified: "El archivo apoya la afirmación y no hay una contradicción creíble.",
    "Partially Supported": "Parte de la afirmación está apoyada. El resto está incompleto o exagerado.",
    Disputed: "Hay piezas creíbles en conflicto y el archivo no lo cierra.",
    Unverified: "El archivo no contiene bastante para dar la afirmación por establecida.",
    Contradicted: "La mejor pieza del archivo va contra la afirmación.",
  },
  report: {
    summary: "Resumen",
    keyPerspectives: "Perspectivas clave",
    claimAudit: "Auditoría de afirmaciones",
    methodology: "Metodología",
    limitations: "Limitaciones",
    excerptLimit: "Cada análisis incluye solo los primeros 2000 caracteres del texto guardado. Lo que pasa de ahí no entra en el análisis. Ese corte no demuestra que el resto del original carezca de apoyo.",
    sources: "Fuentes",
    exportMd: "Descargar Markdown",
    exportJson: "Descargar JSON",
    print: "Imprimir / Guardar como PDF",
    downloaded: "La descarga ha empezado.",
    columnClaim: "Afirmación",
    columnLabel: "Verificación",
    columnEvidence: "Evidencia",
    columnRationale: "Motivo",
    generated: "Generado",
    query: "Tema introducido",
    language: "Idioma",
    provider: "Proveedor de datos",
    providerDemo: "Archivos de demostración (no un modelo en vivo)",
    mastheadNote:
      "Informe de demostración ficticio. No son noticias reales ni una búsqueda web en vivo.",
    kind: {
      article_analysed: "Artículo analizado",
      evidence: "Evidencia",
      background: "Contexto",
      primary_source: "Fuente primaria",
    },
    noneYet: "Ninguna",
  },
};

const fr: Messages = {
  skip: "Aller au contenu",
  footer:
    "OpenFrame AI est un prototype de recherche. Il ne cherche pas sur le web en direct. Les dossiers d’exemple sont fictifs.",
  bannerBody:
    "Ce prototype ne cherche pas l’actualité en direct. Les dossiers sont fictifs et les liens ouvrent example.com.",
  nav: {
    home: "Accueil",
    perspectives: "Perspectives",
    evidence: "Audit des preuves",
    report: "Rapport de recherche",
    progress: "Étapes du dossier",
  },
  home: {
    eyebrow: "Prototype d’intelligence média",
    sloganTranslated: "Voir au-delà des titres.",
    deck: "Comparez la façon dont les médias cadrent un sujet, vérifiez les affirmations factuelles, et repartez avec un rapport structuré.",
    topicLabel: "Sujet",
    topicPlaceholder:
      "Essayez « L’animation générée par IA bouleverse-t-elle l’industrie traditionnelle du cinéma et de la télévision ? », ou saisissez un sujet",
    topicHint:
      "Les sujets préparés renvoient un dossier fictif. Tout autre sujet renvoie une démo générique clairement indiquée, pas une analyse réelle.",
    languageLabel: "Langue du rapport",
    analyze: "Analyser",
    preparing: "Préparation du dossier…",
    suggestionsTitle: "Sujets de démonstration préparés",
    suggestionsHint:
      "Choisissez-en un pour remplir le champ. Chaque histoire est inventée.",
    flowTitle: "Ce que vous obtenez",
    steps: [
      {
        title: "Perspectives",
        body: "Lisez des articles d’exemple et comparez le cadrage de chaque média.",
      },
      {
        title: "Audit des preuves",
        body: "Examinez les affirmations extraites, leurs sources et une étiquette de vérification.",
      },
      {
        title: "Rapport de recherche",
        body: "Exportez un dossier structuré en Markdown, en JSON ou en PDF imprimé.",
      },
    ],
    recentTitle: "Dossiers récents",
    recentEmptyTitle: "Aucun dossier enregistré",
    recentEmptyBody:
      "Après une analyse, le dossier est écrit dans un fichier JSON local et apparaît ici.",
    recentErrorTitle: "Les dossiers enregistrés sont illisibles",
    recentErrorBody:
      "Le fichier de démonstration local est peut-être abîmé. Vous pouvez quand même lancer une analyse ci-dessus.",
    preparedChip: "Démo préparée",
    genericChip: "Démo générique",
    openBriefing: "Ouvrir le dossier",
    validationEmpty: "Saisissez un sujet à analyser.",
    validationShort: "Utilisez au moins 2 caractères.",
    validationLong: "Gardez le sujet sous 200 caractères.",
    validationSymbols: "Utilisez des mots, pas seulement des symboles.",
    errorNetwork:
      "L’application n’a pas atteint son propre serveur. Vérifiez que le serveur de développement tourne, puis réessayez.",
    errorGeneric: "L’analyse ne s’est pas terminée. Réessayez.",
    errorProvider:
      "Ce fournisseur d’analyse n’est pas encore disponible. Ce prototype utilise encore des données de démonstration.",
    errorStore: "Le dossier n’a pas pu être enregistré dans le fichier local.",
    errorInvalid: "La demande n’a pas été comprise. Vérifiez le sujet et la langue.",
  },
  briefing: {
    yourTopic: "Votre sujet",
    preparedMatch: "Démonstration préparée",
    genericMatch: "Modèle de démonstration générique",
    created: "Créé",
    placeholderLink: "Article original",
    narrativeTitle: "Comment les médias d’exemple cadrent le sujet",
    sharedTitle: "Ce qu’ils partagent",
    divergeTitle: "Là où ils divergent",
    emphasis: "Met en avant",
    omission: "Laisse de côté",
    articlesTitle: "Articles d’exemple",
    claimsTitle: "Affirmations extraites",
    legendTitle: "Ce que veulent dire les étiquettes",
    whyLabel: "Pourquoi cette étiquette",
    evidenceChecked: "Preuves examinées",
    limitationsTitle: "Limites",
    emptyArticlesTitle: "Ce dossier ne contient aucun article",
    emptyArticlesBody:
      "La comparaison a besoin d’au moins un article d’exemple. Cet enregistrement n’en a pas.",
    emptyClaimsTitle: "Ce dossier ne contient aucune affirmation",
    emptyClaimsBody:
      "L’audit liste des affirmations factuelles tirées des articles. Cet enregistrement n’en a pas.",
    emptyReportTitle: "Ce dossier ne contient pas de rapport",
    emptyReportBody:
      "Le rapport de recherche manque dans cet enregistrement. Il n’y a rien à exporter.",
    notFoundTitle: "Ce dossier n’est pas dans le fichier local",
    notFoundBody:
      "Le lien est peut-être mal saisi, ou le fichier de démonstration a été vidé. Lancez une nouvelle analyse depuis l’accueil.",
    errorTitle: "Le dossier n’a pas pu être chargé",
    errorBody: "Une erreur s’est produite en lisant le fichier de démonstration local.",
    generatedUnretrieved:
      "Cette note a été générée à la demande. Les citations, s’il y en a, se limitent aux documents enregistrés choisis. Ce n’est pas une recherche internet ni une vérification externe. La démonstration utilise encore des liens d’exemple.",
    retry: "Réessayer",
    backHome: "Retour à l’accueil",
    loading: "Chargement du dossier",
  },
  verificationHelp: {
    Verified: "Les archives appuient l’affirmation, sans contradiction crédible.",
    "Partially Supported": "Une partie est étayée. Le reste est incomplet ou exagéré.",
    Disputed: "Des pièces crédibles se contredisent et le dossier ne tranche pas.",
    Unverified: "Les archives ne contiennent pas assez pour tenir l’affirmation pour établie.",
    Contradicted: "La meilleure pièce du dossier va contre l’affirmation.",
  },
  report: {
    summary: "Résumé",
    keyPerspectives: "Perspectives clés",
    claimAudit: "Audit des affirmations",
    methodology: "Méthode",
    limitations: "Limites",
    excerptLimit: "Chaque analyse ne retient que les 2000 premiers caractères du texte enregistré. Le surplus n’est pas inclus. Cette limite ne prouve pas que le reste de l’original manque de preuves.",
    sources: "Sources",
    exportMd: "Télécharger le Markdown",
    exportJson: "Télécharger le JSON",
    print: "Imprimer / Enregistrer en PDF",
    downloaded: "Le téléchargement a commencé.",
    columnClaim: "Affirmation",
    columnLabel: "Vérification",
    columnEvidence: "Preuve",
    columnRationale: "Motif",
    generated: "Produit le",
    query: "Sujet saisi",
    language: "Langue",
    provider: "Source des données",
    providerDemo: "Fichiers de démonstration (pas un modèle en direct)",
    mastheadNote:
      "Rapport de démonstration fictif. Ce ne sont pas de vraies actualités, ni une recherche web en direct.",
    kind: {
      article_analysed: "Article analysé",
      evidence: "Preuve",
      background: "Contexte",
      primary_source: "Source primaire",
    },
    noneYet: "Aucune",
  },
};

export const messages: Record<Language, Messages> = { en, zh, es, fr };

export function messageForApiError(
  code: string | undefined,
  language: Language,
): string {
  const home = messages[language].home;
  switch (code) {
    case "query_required":
      return home.validationEmpty;
    case "query_too_short":
      return home.validationShort;
    case "query_too_long":
      return home.validationLong;
    case "query_needs_letters":
      return home.validationSymbols;
    case "language_invalid":
    case "invalid_json":
      return home.errorInvalid;
    case "provider_not_ready":
      return home.errorProvider;
    case "store_failed":
      return home.errorStore;
    default:
      return home.errorGeneric;
  }
}
