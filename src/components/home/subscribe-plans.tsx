"use client";

import { useState } from "react";
import type { SubscribeCopy } from "@/lib/i18n/app-pages";

export function SubscribePlans({ copy }: { copy: SubscribeCopy }) {
  const [openName, setOpenName] = useState<string | null>(null);
  return (
    <>
      <ul className="mt-5 space-y-4">
        {copy.plans.map((plan) => {
          const open = openName === plan.name;
          return (
            <li key={plan.name} className="topic-card" data-selected={open ? "true" : "false"}>
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
              <button
                type="button"
                className="paper-action mt-4 w-full"
                aria-expanded={open}
                onClick={() => setOpenName(open ? null : plan.name)}
              >
                {open ? copy.closeDemo : copy.cta}
              </button>
              <div className="card-fold" data-open={open ? "true" : "false"}>
                <div>
                  <div className="paper-note mt-3" role="status">
                    <p className="text-[16px] font-bold">{copy.demoTitle}</p>
                    <p className="mt-2 text-[15px] leading-7">{copy.demoBody.replace("{name}", plan.name)}</p>
                    <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{copy.noCharge}</p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[13px] leading-6 text-muted-foreground">{copy.footnote}</p>
    </>
  );
}
