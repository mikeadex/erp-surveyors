function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function richTextValueToHtml(value: string | null | undefined) {
  if (!value) return ''

  if (looksLikeHtml(value)) {
    return value
  }

  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

const ALLOWED_RICH_TEXT_TAGS = new Set([
  'p',
  'br',
  'h1',
  'ul',
  'ol',
  'li',
  'hr',
  'strong',
  'b',
  'em',
  'i',
])

export function sanitizeRichTextHtml(value: string | null | undefined) {
  const html = richTextValueToHtml(value)
  if (!html) return ''

  return html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, rawTag) => {
    const tag = rawTag.toLowerCase()
    if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) return ''

    const isClosing = match.startsWith('</')
    if (isClosing) return `</${tag}>`
    if (tag === 'br' || tag === 'hr') return `<${tag} />`
    return `<${tag}>`
  })
}

export function richTextToPlainText(value: string | null | undefined) {
  if (!value) return ''

  const normalized = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/(p|div|h1|h2|h3|h4|ul|ol|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')

  return decodeHtmlEntities(normalized).replace(/\n{3,}/g, '\n\n').trim()
}
