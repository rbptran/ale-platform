// Lightweight markdown renderer — no external dependency needed.
// Handles: headings, bold, italic, code blocks, inline code, bullet lists,
// numbered lists, blockquotes, horizontal rules, and tables.

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  const html = parseMarkdown(content);
  return (
    <div
      className="md-body"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        lineHeight: 1.7,
        fontSize: 15,
        color: '#1e293b',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    />
  );
}

function escape(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  return text
    // Bold + italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;font-family:monospace;color:#4f46e5">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#4f46e5">$1</a>');
}

function parseMarkdown(raw) {
  const lines = raw.split('\n');
  const out   = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ───────────────────────────────
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(escape(lines[i]));
        i++;
      }
      out.push(
        `<pre style="background:#0f172a;border-radius:10px;padding:18px 20px;overflow-x:auto;margin:20px 0">` +
        `<code style="font-family:monospace;font-size:13px;line-height:1.6;color:#e2e8f0">${codeLines.join('\n')}</code></pre>`
      );
      i++;
      continue;
    }

    // ── Headings ────────────────────────────────────────
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      const level  = h[1].length;
      const sizes  = [28, 22, 18, 16];
      const margins = ['32px 0 12px', '24px 0 10px', '20px 0 8px', '16px 0 6px'];
      out.push(
        `<h${level} style="font-size:${sizes[level-1]}px;font-weight:700;color:#1e293b;` +
        `margin:${margins[level-1]};line-height:1.3">${inlineMarkdown(h[2])}</h${level}>`
      );
      i++; continue;
    }

    // ── Horizontal rule ─────────────────────────────────
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      out.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">');
      i++; continue;
    }

    // ── Blockquote ──────────────────────────────────────
    if (line.startsWith('> ')) {
      const bqLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(inlineMarkdown(lines[i].slice(2)));
        i++;
      }
      out.push(
        `<blockquote style="border-left:4px solid #4f46e5;margin:16px 0;padding:10px 16px;` +
        `background:#f8f4ff;border-radius:0 8px 8px 0;color:#475569">` +
        bqLines.join('<br>') + '</blockquote>'
      );
      continue;
    }

    // ── Table ────────────────────────────────────────────
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean));
        i++;
      }
      const headerHtml = headers
        .map(h => `<th style="padding:10px 14px;background:#e0e7ff;text-align:left;font-size:13px;color:#1e293b;border:1px solid #c7d2fe">${inlineMarkdown(h)}</th>`)
        .join('');
      const rowsHtml = rows
        .map((r, ri) =>
          `<tr style="background:${ri % 2 === 0 ? '#fff' : '#f8fafc'}">` +
          r.map(c => `<td style="padding:9px 14px;border:1px solid #e2e8f0;font-size:13px">${inlineMarkdown(c)}</td>`).join('') +
          '</tr>'
        ).join('');
      out.push(
        `<div style="overflow-x:auto;margin:16px 0"><table style="width:100%;border-collapse:collapse;font-family:inherit">` +
        `<thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`
      );
      continue;
    }

    // ── Unordered list ──────────────────────────────────
    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(`<li style="margin-bottom:6px">${inlineMarkdown(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul style="padding-left:24px;margin:12px 0">${items.join('')}</ul>`);
      continue;
    }

    // ── Ordered list ────────────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li style="margin-bottom:6px">${inlineMarkdown(lines[i].replace(/^\d+\.\s/, ''))}</li>`);
        i++;
      }
      out.push(`<ol style="padding-left:24px;margin:12px 0">${items.join('')}</ol>`);
      continue;
    }

    // ── Blank line ──────────────────────────────────────
    if (line.trim() === '') {
      i++; continue;
    }

    // ── Paragraph ───────────────────────────────────────
    out.push(`<p style="margin:0 0 14px">${inlineMarkdown(line)}</p>`);
    i++;
  }

  return out.join('\n');
}
