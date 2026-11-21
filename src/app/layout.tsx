/**
 * LAYOUT: the frame around every page.
 * Loads the fonts and global styles, sets the browser-tab title,
 * and switches on dark mode before the page appears (so it doesn't flash white).
 */
import type { Metadata } from "next";
import "@fontsource/mona-sans/latin-400.css";
import "@fontsource/mona-sans/latin-500.css";
import "@fontsource/mona-sans/latin-600.css";
import "@fontsource/geist-mono/latin-500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobtrail",
  description: "Keep track of where each CV was sent and what happened next.",
};

// Applies the saved/system theme before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
