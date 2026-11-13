import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { SourceSubscriptions } from "@/components/home/source-subscriptions";

export default async function SubscribePage() {
  const language = await readUiLanguage();
  const zh = language === "zh";
  return (
    <PaperFrame
      language={language}
      lead={
        zh
          ? "订阅只决定默认关注哪些固定新闻来源。没有套餐，不会收费，也不会上传你的选择。"
          : "Subscriptions only decide which fixed news sources are followed by default. There are no plans, no charges, and your choices are not uploaded."
      }
      points={
        zh
          ? ["未选中的来源显示为灰色。", "选择只保存在当前浏览器。", "关注来源不等于核实内容，也不代表与来源建立正式订阅。"]
          : ["Unsubscribed sources appear gray.", "Choices stay in this browser.", "Following a source is not verification and is not a formal subscription with that outlet."]
      }
    >
      <p className="wordmark text-[1.85rem]">SpectraX</p>
      <h1 className="mt-4 text-[1.75rem] font-bold">{zh ? "订阅" : "Subscribe"}</h1>
      <SourceSubscriptions language={language} />
    </PaperFrame>
  );
}
