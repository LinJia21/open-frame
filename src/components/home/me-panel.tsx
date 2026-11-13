"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { MeCopy } from "@/lib/i18n/app-pages";

export function MePanel({ copy }: { copy: MeCopy }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const [draft, setDraft] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(true);
    setDraft("");
  }

  return (
    <>
      <section className="topic-card mt-5">
        <div className="flex items-center gap-3">
          <span className="profile-mark" aria-hidden="true">
            <PersonMark />
          </span>
          <div className="min-w-0">
            <p className="text-[1.25rem] font-bold">{copy.name}</p>
            <span className="lav-badge mt-1">{copy.badge}</span>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-7 text-[#3a342c]">{copy.intro}</p>
        <button type="button" className="paper-action mt-4 w-full" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? copy.closeDemo : copy.login}
        </button>
        <div className="card-fold" data-open={open ? "true" : "false"}>
          <div>
            <form className="paper-note mt-3 space-y-3" onSubmit={onSubmit}>
              <p className="text-[16px] font-bold">{copy.demoTitle}</p>
              <label className="block text-[14px]" htmlFor="demo-name">
                {copy.demoField}
                <input id="demo-name" value={draft} onChange={(event) => setDraft(event.target.value)} className="paper-field mt-1" autoComplete="off" />
              </label>
              <button type="submit" className="paper-action w-full">
                {copy.demoSubmit}
              </button>
              <p className="text-[13px] leading-6 text-muted-foreground">{copy.loginHint}</p>
              {notice ? (
                <p role="status" className="text-[15px] leading-7">
                  {copy.demoResult}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </section>
      <ul className="mt-4 space-y-3">
        <li>
          <Link href="/settings" className="topic-card menu-row">
            <span>
              <span className="block text-[16px] font-bold">{copy.settings}</span>
              <span className="mt-1 block text-[13px] leading-6 text-muted-foreground">{copy.settingsHint}</span>
            </span>
            <span className="scope-pill">{copy.settingsState}</span>
          </Link>
        </li>
        <li className="topic-card menu-row">
          <span>
            <span className="block text-[16px] font-bold">{copy.account}</span>
            <span className="mt-1 block text-[13px] leading-6 text-muted-foreground">{copy.accountHint}</span>
          </span>
          <span className="lav-badge">{copy.accountState}</span>
        </li>
      </ul>
    </>
  );
}

function PersonMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7">
      <circle cx="12" cy="8.2" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 19.2c1.2-2.6 3.4-3.9 6.5-3.9s5.3 1.3 6.5 3.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
