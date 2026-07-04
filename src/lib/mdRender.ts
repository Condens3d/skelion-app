/**
 * Minimal, XSS-safe Markdown renderer.
 *
 * Security model: every character is HTML-escaped FIRST, so no author-supplied
 * HTML can survive. Only the markdown syntax handled below is then turned back
 * into a small whitelist of tags. Link hrefs are restricted to http/https/mailto.
 *
 * Deliberately dependency-free: for a security firm's own platform, a small
 * audited renderer is a smaller supply-chain surface than a full parser. It
 * covers headings, bold, italic, inline code, fenced code, links, lists, and
 * blockquotes. It can be swapped for marked + DOMPurify later if richer
 * Markdown is needed.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:\/\/|mailto:|\/)/i.test(url)) return url;
  return null;
}

function inline(text: string): string {
  // text is already HTML-escaped. Apply inline markdown.
  let out = text;
  // inline code first, protect its contents
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  // bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // links [text](href)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const safe = safeHref(href);
    if (!safe) return label;
    const external = /^https?:\/\//i.test(safe);
    const rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${safe}"${rel}>${label}</a>`;
  });
  return out;
}

export function renderMarkdown(src: string): string {
  const lines = esc(src || '').replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  const flushList = (buf: string[], ordered: boolean) => {
    if (!buf.length) return;
    const tag = ordered ? 'ol' : 'ul';
    html.push(`<${tag}>${buf.map((li) => `<li>${inline(li)}</li>`).join('')}</${tag}>`);
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line.trim())) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      html.push(`<pre><code>${code.join('\n')}</code></pre>`);
      continue;
    }

    // heading
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      flushList(buf, false);
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      flushList(buf, true);
      continue;
    }

    // blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // paragraph (gather until blank / block start)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{2,3}\s|>\s?|[-*]\s+|\d+\.\s+|```)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    html.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return html.join('\n');
}
