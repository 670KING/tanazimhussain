import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/render-performance.css";
import "./components/chat/RenderingFix.css";

createRoot(document.getElementById("root")!).render(<App />);
