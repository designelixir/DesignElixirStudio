"use client";

import { useState } from "react";

export default function CSSFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const formatCSS = () => {
    let css = input.trim();

    css = css
      .replace(/\s*{\s*/g, " {")
      .replace(/\s*}\s*/g, "}")
      .replace(/\s*;\s*/g, "; ")
      .replace(/\s*:\s*/g, ":")
      .replace(/\s+/g, " ")
      .trim();

    css = css.replace(/}\s*/g, "}\n");

    setOutput(css);
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
  };

  const copyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output).then(() => {
        const btn = document.getElementById("copyBtn");
        if (btn) {
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 1500);
        }
      });
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "20px", background: "#f7f7f7" }}>
      <h2>CSS One-Line Formatter</h2>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste your CSS here..."
        style={{
          width: "100%",
          height: "150px",
          marginBottom: "10px",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
      />
      <br />
      <button onClick={formatCSS} style={{ padding: "10px 15px", marginRight: "10px", cursor: "pointer" }}>
        Format CSS
      </button>
      <button onClick={clearAll} style={{ padding: "10px 15px", cursor: "pointer" }}>
        Clear
      </button>
      
      <div className="flex-center-spacebetween">
      <h3>Result:</h3>
      <button id="copyBtn" onClick={copyOutput} style={{ marginLeft: "10px", padding: "8px 12px", fontSize: "14px", cursor: "pointer" }}>
          Copy
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <pre
          style={{
            background: "#fff",
            padding: "15px",
            border: "1px solid #ccc",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            flexGrow: 1,
          }}
        >
          {output}
        </pre>
        
      </div>
    </div>
  );
}