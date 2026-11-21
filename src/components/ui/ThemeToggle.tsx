/**
 * THEME TOGGLE: the Light / Dark switch in the top-right corner.
 * Your choice is remembered in the browser.
 */
"use client";

/** Light/dark switch styled like the portfolio's EN/DE toggle.
 *  The highlight comes from the `dark` class via CSS, so it is right on first paint. */
export default function ThemeToggle() {
  const set = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  };
  const base = "mono grid h-7 place-items-center rounded-[4px] border px-2 text-[11px] transition";
  const on = "border-ink bg-ink text-ink-fg";
  const off = "border-line bg-transparent text-muted hover:text-foreground";
  return (
    <div className="flex gap-1" role="group" aria-label="Color theme">
      <button
        className={`${base} ${on} dark:border-line dark:bg-transparent dark:text-muted dark:hover:text-foreground`}
        onClick={() => set(false)}
      >
        Light
      </button>
      <button
        className={`${base} ${off} dark:border-ink dark:bg-ink dark:text-ink-fg dark:hover:text-ink-fg`}
        onClick={() => set(true)}
      >
        Dark
      </button>
    </div>
  );
}
