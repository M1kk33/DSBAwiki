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
  const renderLines = (lines: string[], keyPrefix: string) => {
    const rendered = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const separator = lines[index + 1];
      if (line.startsWith("|") && separator?.startsWith("|") && /^\|\s*:?-{3,}/.test(separator)) {
        const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
        const header = cells(line);
        index += 2;
        const rows = [];
        while (index < lines.length && lines[index].startsWith("|")) {
          rows.push(cells(lines[index]));
          index++;
        }
        index--;
        rendered.push(
          <div className="markdown-table-scroll" key={`${keyPrefix}-table-${index}`}>
            <table className="markdown-table">
              <thead><tr>{header.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr></thead>
              <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{header.map((_, cellIndex) => <td key={cellIndex}>{inline(row[cellIndex] || "")}</td>)}</tr>)}</tbody>
            </table>
          </div>,
        );
        continue;
      }
      if (line.startsWith("### ")) rendered.push(<h3 key={`${keyPrefix}-${index}`}>{inline(line.slice(4))}</h3>);
      else if (line.startsWith("## ")) rendered.push(<h2 key={`${keyPrefix}-${index}`}>{inline(line.slice(3))}</h2>);
      else if (line.startsWith("# ")) rendered.push(<h2 key={`${keyPrefix}-${index}`}>{inline(line.slice(2))}</h2>);
      else if (/^[-*] /.test(line)) rendered.push(<p className="markdown-bullet" key={`${keyPrefix}-${index}`}>• {inline(line.slice(2))}</p>);
      else if (line.startsWith("Source: ")) rendered.push(<small className="markdown-attribution" key={`${keyPrefix}-${index}`}>{inline(line)}</small>);
      else if (line.startsWith("> ")) rendered.push(<blockquote key={`${keyPrefix}-${index}`}>{inline(line.slice(2))}</blockquote>);
      else rendered.push(line ? <p key={`${keyPrefix}-${index}`}>{inline(line)}</p> : <br key={`${keyPrefix}-${index}`} />);
    }
    return rendered;
  };
  return (
    <div className="markdown">
      {blocks.map((block, i) =>
        block.startsWith("```") ? (
          <pre key={i}>
            <code>{block.replace(/^```[^\n]*\n/, "").replace(/```$/, "")}</code>
          </pre>
        ) : <Fragment key={i}>{renderLines(block.split("\n"), `block-${i}`)}</Fragment>,
      )}
    </div>
  );
}
