"use client";

import React from "react";

interface Block {
  type: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "ul" | "ol" | "code" | "hr";
  content?: string;
  items?: string[];
  language?: string;
  start?: number;
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeLanguage = "";
  let codeContent: string[] = [];

  let currentList: { type: "ul" | "ol"; items: string[]; start?: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block detection
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Exit code block
        blocks.push({
          type: "code",
          content: codeContent.join("\n"),
          language: codeLanguage,
        });
        inCodeBlock = false;
        codeContent = [];
        codeLanguage = "";
      } else {
        // Close any active list
        if (currentList) {
          blocks.push({ type: currentList.type, items: currentList.items, start: currentList.start });
          currentList = null;
        }
        // Enter code block
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Horizontal rule detection
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      if (currentList) {
        blocks.push({ type: currentList.type, items: currentList.items, start: currentList.start });
        currentList = null;
      }
      blocks.push({ type: "hr" });
      continue;
    }

    // Header detection
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      if (currentList) {
        blocks.push({ type: currentList.type, items: currentList.items, start: currentList.start });
        currentList = null;
      }
      const level = headerMatch[1].length;
      blocks.push({
        type: `h${level}` as any,
        content: headerMatch[2],
      });
      continue;
    }

    // Bullet list detection (- or * or + followed by space)
    const bulletMatch = line.match(/^[\s]*[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (currentList && currentList.type === "ol") {
        blocks.push({ type: "ol", items: currentList.items, start: currentList.start });
        currentList = null;
      }
      if (!currentList) {
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered list detection (1. or 2. etc followed by space)
    const numberedMatch = line.match(/^[\s]*\d+\.\s+(.*)$/);
    if (numberedMatch) {
      if (currentList && currentList.type === "ul") {
        blocks.push({ type: "ul", items: currentList.items });
        currentList = null;
      }
      if (!currentList) {
        const startNumMatch = line.match(/^[\s]*(\d+)\.\s+/);
        const start = startNumMatch ? parseInt(startNumMatch[1], 10) : 1;
        currentList = { type: "ol", items: [], start };
      }
      currentList.items.push(numberedMatch[1]);
      continue;
    }

    // Empty line or paragraph
    const trimmed = line.trim();
    if (trimmed === "") {
      // Look ahead to see if the next non-empty line is a list item of the same type
      let nextLineIsSameListType = false;
      if (currentList) {
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine === "") continue; // Skip multiple empty lines

          if (currentList.type === "ul") {
            const isBullet = nextLine.match(/^[-*+]\s+(.*)$/);
            if (isBullet) nextLineIsSameListType = true;
          } else if (currentList.type === "ol") {
            const isNumbered = nextLine.match(/^\d+\.\s+(.*)$/);
            if (isNumbered) nextLineIsSameListType = true;
          }
          break; // Stop checking after the first non-empty line
        }
      }

      if (currentList && !nextLineIsSameListType) {
        blocks.push({ type: currentList.type, items: currentList.items, start: currentList.start });
        currentList = null;
      }
      continue;
    }

    // If it's a normal paragraph line
    if (currentList) {
      blocks.push({ type: currentList.type, items: currentList.items, start: currentList.start });
      currentList = null;
    }

    blocks.push({
      type: "p",
      content: line,
    });
  }

  // Close any open blocks at the end
  if (inCodeBlock) {
    blocks.push({
      type: "code",
      content: codeContent.join("\n"),
      language: codeLanguage,
    });
  }

  if (currentList) {
    blocks.push({ type: currentList.type, items: currentList.items, start: currentList.start });
  }

  return blocks;
}

function parseInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining) {
    const rules = [
      {
        regex: /\*\*([^\*]+)\*\*/,
        render: (m: string[], k: string) => (
          <strong key={k} className="font-bold text-white">
            {m[1]}
          </strong>
        ),
      },
      {
        regex: /__([^_]+)__/,
        render: (m: string[], k: string) => (
          <strong key={k} className="font-bold text-white">
            {m[1]}
          </strong>
        ),
      },
      {
        regex: /\*([^\*]+)\*/,
        render: (m: string[], k: string) => (
          <em key={k} className="italic">
            {m[1]}
          </em>
        ),
      },
      {
        regex: /_([^_]+)_/,
        render: (m: string[], k: string) => (
          <em key={k} className="italic">
            {m[1]}
          </em>
        ),
      },
      {
        regex: /`([^`]+)`/,
        render: (m: string[], k: string) => (
          <code
            key={k}
            className="bg-zinc-800 text-purple-300 px-1 py-0.5 rounded font-mono text-[10px]"
          >
            {m[1]}
          </code>
        ),
      },
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/,
        render: (m: string[], k: string) => (
          <a
            key={k}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline cursor-pointer"
          >
            {m[1]}
          </a>
        ),
      },
    ];

    let firstMatch: { index: number; length: number; element: React.ReactNode } | null = null;

    for (const rule of rules) {
      const match = remaining.match(rule.regex);
      if (match && match.index !== undefined) {
        if (firstMatch === null || match.index < firstMatch.index) {
          firstMatch = {
            index: match.index,
            length: match[0].length,
            element: rule.render(match, `inline-${keyIndex++}`),
          };
        }
      }
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        tokens.push(remaining.substring(0, firstMatch.index));
      }
      tokens.push(firstMatch.element);
      remaining = remaining.substring(firstMatch.index + firstMatch.length);
    } else {
      tokens.push(remaining);
      break;
    }
  }

  return tokens;
}

export function MarkdownRenderer({ content, isDark = true }: { content: string; isDark?: boolean }) {
  const blocks = parseBlocks(content);

  const textClass = isDark ? "text-gray-300" : "text-gray-700";
  const headingClass = isDark ? "text-white font-bold mt-2" : "text-black font-bold mt-2";

  return (
    <div className="space-y-1.5 break-words">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.type) {
          case "h1":
            return (
              <h1 key={key} className={`text-sm font-extrabold ${headingClass}`}>
                {parseInline(block.content || "")}
              </h1>
            );
          case "h2":
            return (
              <h2 key={key} className={`text-xs font-bold ${headingClass}`}>
                {parseInline(block.content || "")}
              </h2>
            );
          case "h3":
            return (
              <h3 key={key} className={`text-[11px] font-bold ${headingClass}`}>
                {parseInline(block.content || "")}
              </h3>
            );
          case "h4":
          case "h5":
          case "h6":
            return (
              <h4 key={key} className={`text-[10px] font-semibold ${headingClass}`}>
                {parseInline(block.content || "")}
              </h4>
            );

          case "ul":
            return (
              <ul key={key} className={`list-disc pl-4 space-y-0.5 ${textClass}`}>
                {block.items?.map((item, idx) => (
                  <li key={idx}>{parseInline(item)}</li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={key} start={block.start} className={`list-decimal pl-4 space-y-0.5 ${textClass}`}>
                {block.items?.map((item, idx) => (
                  <li key={idx}>{parseInline(item)}</li>
                ))}
              </ol>
            );

          case "code":
            return (
              <pre
                key={key}
                className="bg-zinc-900 border border-zinc-800 rounded p-1.5 overflow-x-auto font-mono text-[10px] text-purple-300 my-1 leading-normal whitespace-pre"
              >
                <code>{block.content}</code>
              </pre>
            );

          case "hr":
            return (
              <hr
                key={key}
                className={`my-1.5 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
              />
            );

          case "p":
          default:
            return (
              <p key={key} className={textClass}>
                {parseInline(block.content || "")}
              </p>
            );
        }
      })}
    </div>
  );
}
