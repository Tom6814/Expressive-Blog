import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import { Copy, Check } from "lucide-react";
import "katex/dist/katex.min.css";

// ── Code Block with Copy Button ───────────────────
function CodeBlock({ className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeText = String(children).replace(/\n$/, "");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeText]);

  return (
    <div className="code-block-wrapper">
      {language && (
        <span className="absolute top-3 left-4 text-xs font-mono text-on-surface-variant/40 uppercase">
          {language}
        </span>
      )}
      <pre className={className} {...props}>
        <code className={className}>{children}</code>
      </pre>
      <button className="copy-btn" onClick={handleCopy} title="Copy code">
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Admonition / Callout ──────────────────────────
function Admonition({ type, children }: { type: string; children: React.ReactNode }) {
  const titles: Record<string, string> = {
    note: "NOTE",
    tip: "TIP",
    important: "IMPORTANT",
    warning: "WARNING",
    caution: "CAUTION",
    danger: "DANGER",
  };
  return (
    <blockquote className={`callout callout-${type}`}>
      <div className="callout-title">{titles[type] || type.toUpperCase()}</div>
      {children}
    </blockquote>
  );
}

// ── Custom blockquote (detect callouts) ───────────
function BlockquoteRenderer({ children, ...props }: any) {
  const text = extractText(children);
  // Detect GFM-style admonitions: [!NOTE], [!TIP], etc.
  const admonitionMatch = text?.match(/^\[!(\w+)\]\s*/);
  if (admonitionMatch) {
    const type = admonitionMatch[1].toLowerCase();
    const cleanChildren = removeAdmonitionPrefix(children, admonitionMatch[0]);
    return <Admonition type={type}>{cleanChildren}</Admonition>;
  }
  return <blockquote {...props}>{children}</blockquote>;
}

function extractText(node: any): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (React.isValidElement(node)) {
    const child = node.props?.children;
    if (typeof child === "string") return child;
    if (Array.isArray(child)) return child.map(extractText).join("");
    return extractText(child);
  }
  if (Array.isArray(node)) return node.map(extractText).join("");
  return "";
}

function removeAdmonitionPrefix(children: any, prefix: string): any {
  if (typeof children === "string") return children.slice(prefix.length);
  if (Array.isArray(children) && typeof children[0] === "string") {
    const first = children[0] as string;
    if (first.startsWith(prefix)) {
      const rest = [first.slice(prefix.length), ...children.slice(1)].filter(
        (c) => c !== ""
      );
      return rest.length <= 1 ? rest[0] || null : rest;
    }
  }
  return children;
}

// ── Image with lightbox support ───────────────────
function ImageRenderer({ src, alt, ...props }: any) {
  return (
    <img 
      src={src} 
      alt={alt || ""} 
      loading="lazy" 
      referrerPolicy="no-referrer"
      className="cursor-pointer hover:opacity-90 transition-opacity"
      onClick={(e) => {
        const img = e.currentTarget;
        if (img.requestFullscreen) {
          img.requestFullscreen();
        } else {
          window.open(src, "_blank");
        }
      }}
      {...props} 
    />
  );
}

// ── Table wrapper for responsive ──────────────────
function TableRenderer({ children, ...props }: any) {
  return (
    <div className="table-wrapper">
      <table {...props}>{children}</table>
    </div>
  );
}

// ── Heading with anchor ───────────────────────────
function HeadingRenderer({ level, id, children, ...props }: any) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <Tag id={id} {...props}>
      {children}
      {id && (
        <a href={`#${id}`} className="anchor" aria-label="Anchor">
          <span className="anchor-icon">#</span>
        </a>
      )}
    </Tag>
  );
}

// ── Main Markdown Renderer ─────────────────────────
export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`markdown-body max-w-none text-on-surface flex-1 min-w-0 ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeKatex, rehypeSlug]}
        components={{
          pre: CodeBlock,
          blockquote: BlockquoteRenderer,
          table: TableRenderer,
          img: ImageRenderer,
          h1: (p) => <HeadingRenderer level={1} {...p} />,
          h2: (p) => <HeadingRenderer level={2} {...p} />,
          h3: (p) => <HeadingRenderer level={3} {...p} />,
          h4: (p) => <HeadingRenderer level={4} {...p} />,
          h5: (p) => <HeadingRenderer level={5} {...p} />,
          h6: (p) => <HeadingRenderer level={6} {...p} />,
          // Task lists
          input: ({ checked, ...props }: any) => {
            if (props.type === "checkbox") {
              return <input type="checkbox" checked={checked} readOnly disabled={false} {...props} />;
            }
            return <input disabled={true} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
