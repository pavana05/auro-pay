import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// iOS Safari address-bar viewport fix: expose --vh so pages using
// min-h-[calc(var(--vh,1vh)*100)] never get cut off behind the URL bar.
const setVh = () => {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
};
setVh();
window.addEventListener("resize", setVh, { passive: true });
window.addEventListener("orientationchange", setVh, { passive: true });

createRoot(document.getElementById("root")!).render(<App />);
