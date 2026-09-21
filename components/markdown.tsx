// A deliberately small, safe Markdown subset. Raw HTML is always rendered as text.
import { Fragment } from "react";
function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g)
    .map((part, i) => {
      if (part.startsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
      const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      return match ? (
        <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer">
          {match[1]}
        </a>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      );
    });
}
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/(```[^\n]*\n[\s\S]*?```)/g);
  return (
    <div className="markdown">
      {blocks.map((block, i) =>
        block.startsWith("```") ? (
          <pre key={i}>
            <code>{block.replace(/^```[^\n]*\n/, "").replace(/```$/, "")}</code>
          </pre>
        ) : (
          <Fragment key={i}>
            {block.split("\n").map((line, j) => {
              if (line.startsWith("### "))
                return <h3 key={j}>{inline(line.slice(4))}</h3>;
              if (line.startsWith("## "))
                return <h2 key={j}>{inline(line.slice(3))}</h2>;
              if (line.startsWith("# "))
                return <h2 key={j}>{inline(line.slice(2))}</h2>;
              if (/^[-*] /.test(line))
                return (
                  <p className="markdown-bullet" key={j}>
                    • {inline(line.slice(2))}
                  </p>
                );
              if (line.startsWith("> "))
                return <blockquote key={j}>{inline(line.slice(2))}</blockquote>;
              return line ? <p key={j}>{inline(line)}</p> : <br key={j} />;
            })}
          </Fragment>
        ),
      )}
    </div>
  );
}
