import DOMPurify from 'isomorphic-dompurify'

interface HtmlContentProps {
  html: string
  className?: string
}

export const HtmlContent = ({ html, className = '' }: HtmlContentProps) => {
  const sanitizedHtml = DOMPurify.sanitize(html)

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
