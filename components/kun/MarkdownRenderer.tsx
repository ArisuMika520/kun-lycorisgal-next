'use client'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import rehypePrismPlus from 'rehype-prism-plus'
import { useEffect, useState } from 'react'
import { rehypeCodeLanguage } from './rehype-code-language'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  const [htmlContent, setHtmlContent] = useState('')

  useEffect(() => {
    const processMarkdown = async () => {
      try {
        // 自定义 sanitize 配置，允许 data-language 属性
        const customSchema = {
          tagNames: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'del', 'ins', 'sup', 'sub', 'span', 'div'],
          attributes: {
            '*': ['className'],
            pre: ['className', 'dataLanguage'],
            code: ['className'],
            a: ['href', 'title'],
            img: ['src', 'alt', 'title', 'width', 'height']
          }
        }

        const result = await unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype)
          .use(rehypePrismPlus, {
            ignoreMissing: true,
            showLineNumbers: true,
            defaultLanguage: 'text'
          })
          .use(rehypeSanitize, customSchema)
          .use(rehypeCodeLanguage)
          .use(rehypeStringify)
          .process(content)

        setHtmlContent(String(result))
      } catch (error) {
        console.error('Markdown processing error:', error)
        setHtmlContent(content)
      }
    }

    if (content) {
      processMarkdown()
    }
  }, [content])

  return (
    <div 
      className={`kun-prose max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}