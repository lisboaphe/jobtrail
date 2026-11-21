/**
 * DEMO HOME PAGE: used only by `npm run build:demo` (the GitHub Pages demo).
 * The normal app uses page.tsx instead. Which one is used is set in next.config.ts.
 */
import DemoApp from "@/demo/DemoApp";

export default function DemoPage() {
  return <DemoApp />;
}
