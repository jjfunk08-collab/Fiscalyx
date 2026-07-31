"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { useTerminal, FUNCTION_CODES, FUNCTION_LABELS } from "@/lib/store";
import { UNIVERSE } from "@/lib/mock";
import { cn } from "@/lib/utils";
import type { FunctionCode } from "@/types";

type Suggestion =
  | { kind: "ticker"; symbol: string; name: string; assetClass: string }
  | { kind: "fn"; code: FunctionCode; label: string };

const ALL_FN_CODES = Array.from(new Set(Object.keys(FUNCTION_CODES)));

export default function CommandBar() {
  const input = useTerminal((s) => s.commandInput);
  const setInput = useTerminal((s) => s.setCommandInput);
  const execute = useTerminal((s) => s.execute);
  const recallHistory = useTerminal((s) => s.recallHistory);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);

  // Focus the command line on "/" from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const currentToken = useMemo(() => {
    const parts = input.split(/\s+/);
    return parts[parts.length - 1]?.toUpperCase() ?? "";
  }, [input]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const tok = currentToken.trim();
    if (!tok) return [];
    const tickers: Suggestion[] = UNIVERSE.filter(
      (i) =>
        i.symbol.startsWith(tok) ||
        i.name.toUpperCase().includes(tok)
    )
      .slice(0, 6)
      .map((i) => ({
        kind: "ticker",
        symbol: i.symbol,
        name: i.name,
        assetClass: i.assetClass,
      }));

    const fns: Suggestion[] = ALL_FN_CODES.filter((c) => c.startsWith(tok))
      .slice(0, 4)
      .map((c) => ({
        kind: "fn",
        code: FUNCTION_CODES[c],
        label: `${c} — ${FUNCTION_LABELS[FUNCTION_CODES[c]]}`,
      }));

    return [...tickers, ...fns];
  }, [currentToken]);

  useEffect(() => {
    setOpen(suggestions.length > 0 && input.trim().length > 0);
    setIdx(-1);
  }, [suggestions, input]);

  const applySuggestion = (s: Suggestion) => {
    const parts = input.split(/\s+/);
    parts.pop();
    const token = s.kind === "ticker" ? s.symbol : s.code;
    const next = [...parts, token].join(" ") + " ";
    setInput(next);
    setOpen(false);
    setIdx(-1);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && idx >= 0 && suggestions[idx]) {
        applySuggestion(suggestions[idx]);
      } else {
        execute();
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (open) setOpen(false);
      else setInput("");
    } else if (e.key === "Tab" && open && suggestions.length) {
      e.preventDefault();
      applySuggestion(suggestions[Math.max(0, idx)]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (open) setIdx((i) => Math.min(suggestions.length - 1, i + 1));
      else recallHistory(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) setIdx((i) => Math.max(-1, i - 1));
      else recallHistory(-1);
    }
  };

  return (
    <div className="relative border-b border-term-border bg-term-bg">
      <div className="flex items-center gap-2 px-3 h-10">
        <Search size={14} className="text-term-amber shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          spellCheck={false}
          autoComplete="off"
          placeholder="AAPL US Equity GP  ·  BTC Crypto DES  ·  US10Y Bond YCRV  ·  TOP  ·  NEWS   (press / to focus)"
          aria-label="Command line"
          className="flex-1 bg-transparent outline-none text-term-amber placeholder:text-term-dim
                     text-sm caret-term-amber tracking-wide"
        />
        <kbd className="hidden md:flex items-center gap-1 text-[10px] text-term-dim">
          <CornerDownLeft size={11} /> GO
        </kbd>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-30 left-3 right-3 md:right-auto md:w-[520px] top-10
                     border border-term-borderlight bg-term-panel shadow-xl max-h-72 overflow-auto"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.kind === "ticker" ? "t-" + s.symbol : "f-" + s.code + i}
              role="option"
              aria-selected={i === idx}
              onMouseEnter={() => setIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(s);
              }}
              className={cn(
                "flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs",
                i === idx ? "bg-term-amber text-black" : "text-term-white hover:bg-term-border"
              )}
            >
              {s.kind === "ticker" ? (
                <>
                  <span className="font-bold w-16">{s.symbol}</span>
                  <span className="flex-1 truncate px-2 opacity-80">{s.name}</span>
                  <span className={cn("text-[10px] uppercase", i === idx ? "text-black/70" : "text-term-cyan")}>
                    {s.assetClass}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold w-16">FN</span>
                  <span className="flex-1 px-2">{s.label}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
