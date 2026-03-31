import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { richTextToPlainText } from '@/lib/editor/rich-text'

type ReportPdfInput = {
  title: string
  subtitle: string
  status: string
  versionLabel: string
  generatedOn: string
  html: string
}

const PAGE_MARGIN = 50
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const LINE_GAP = 6

export function normalizeReportHtmlForPdf(html: string) {
  return richTextToPlainText(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, ''),
  )
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let currentLine = ''

    for (const word of words) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word
      if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
        currentLine = nextLine
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }

    if (currentLine) lines.push(currentLine)
    lines.push('')
  }

  if (lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines
}

function drawWrappedLines({
  pdf,
  page,
  y,
  lines,
  font,
  size,
}: {
  pdf: PDFDocument
  page: PDFPage
  y: number
  lines: string[]
  font: PDFFont
  size: number
}) {
  let currentPage = page
  let currentY = y

  const createPage = () => {
    const nextPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    return { nextPage, nextY: PAGE_HEIGHT - PAGE_MARGIN }
  }

  for (const line of lines) {
    if (currentY < PAGE_MARGIN + 40) {
      const { nextPage, nextY } = createPage()
      currentPage = nextPage
      currentY = nextY
    }

    if (line) {
      currentPage.drawText(line, {
        x: PAGE_MARGIN,
        y: currentY,
        size,
        font,
        color: rgb(0.17, 0.23, 0.31),
      })
    }

    currentY -= size + LINE_GAP
  }

  return { page: currentPage, y: currentY }
}

export async function buildReportPdfBytes(input: ReportPdfInput) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(input.title)
  pdf.setSubject(input.subtitle)
  pdf.setProducer('ValuCore Africa')
  pdf.setCreator('ValuCore Africa')

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - PAGE_MARGIN

  page.drawRectangle({
    x: PAGE_MARGIN,
    y: y - 12,
    width: 120,
    height: 6,
    color: rgb(0.04, 0.42, 0.22),
  })

  y -= 36
  page.drawText(input.title, {
    x: PAGE_MARGIN,
    y,
    size: 24,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  })

  y -= 26
  page.drawText(input.subtitle, {
    x: PAGE_MARGIN,
    y,
    size: 12,
    font: regular,
    color: rgb(0.33, 0.41, 0.48),
  })

  y -= 34
  const metadata = [
    `Status: ${input.status}`,
    `Version: ${input.versionLabel}`,
    `Generated: ${input.generatedOn}`,
  ]
  metadata.forEach((item, index) => {
    page.drawText(item, {
      x: PAGE_MARGIN + index * 160,
      y,
      size: 10,
      font: bold,
      color: rgb(0.04, 0.42, 0.22),
    })
  })

  y -= 30
  page.drawLine({
    start: { x: PAGE_MARGIN, y },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
    thickness: 1,
    color: rgb(0.85, 0.9, 0.88),
  })

  y -= 22
  const bodyText = normalizeReportHtmlForPdf(input.html)
  const lines = wrapText(bodyText, regular, 11, PAGE_WIDTH - PAGE_MARGIN * 2)
  const result = drawWrappedLines({
    pdf,
    page,
    y,
    lines,
    font: regular,
    size: 11,
  })

  result.page.drawText('Generated server-side by ValuCore Africa', {
    x: PAGE_MARGIN,
    y: 24,
    size: 9,
    font: regular,
    color: rgb(0.5, 0.57, 0.63),
  })

  return pdf.save()
}
