import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { SourceSubscriptions } from "@/components/home/source-subscriptions";
import { subscribeCopy } from "@/lib/i18n/app-pages";

export default async function SubscribePage() {
  const language = await readUiLanguage();
  const copy = subscribeCopy(language);
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
        <span className="lav-badge">{copy.badge}</span>
      </div>
      <p className="mt-3 text-base leading-7 text-[#3a342c]">{copy.intro}</p>
      <ul className="mt-5 space-y-4">
        {copy.plans.map((plan) => (
          <li key={plan.name} className="topic-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-[1.25rem] font-bold">{plan.name}</h2>
              <span className="lav-badge">{copy.unpriced}</span>
            </div>
            <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{plan.blurb}</p>
            <ul className="mt-3 space-y-1.5 text-[14px] leading-6 text-[#3a342c]">
              {plan.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
            <button type="button" className="closed-action mt-4" disabled aria-describedby={`plan-${plan.name}`}>
              {copy.cta}
            </button>
            <p id={`plan-${plan.name}`} className="mt-2 text-[13px] leading-6 text-muted-foreground">
              {copy.noCharge}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{copy.footnote}</p>
      <div className="mt-8">
        <SourceSubscriptions language={language} />
      </div>
    </PaperFrame>
  );
}
