function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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
