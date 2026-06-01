import { useState } from "react";
import { Link2, Check } from "lucide-react";
import Modal from "./Modal";
import { useTheme } from "../../context/ThemeContext";

export default function ShareLinkModal({ url, title, onClose }) {
  const T = useTheme();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Modal title={title || "Share"} onClose={onClose} width={460}>
      <div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, lineHeight: 1.6 }}>
          Copy this link and send it — anyone with an account can open it directly.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              flex: 1, background: T.surface,
              border: "1px solid " + T.border,
              borderRadius: 7, padding: "8px 12px",
              fontSize: 12, color: T.dim,
              fontFamily: "monospace",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            title={url}
          >
            {url}
          </div>
          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 7,
              background: copied ? T.green : T.accent,
              color: "#fff", border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", minWidth: 88,
              transition: "background 0.2s",
            }}
          >
            {copied ? <><Check size={12} /> Copied!</> : <><Link2 size={12} /> Copy</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
