import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypePrismPlus from 'rehype-prism-plus'
import { unified } from 'unified'
import { rehypeCodeLanguage } from '~/components/kun/rehype-code-language'

const customSchema: Options = {
  // Start from the default schema to preserve its built-in safety rules.
  ...defaultSchema,
  tagNames: Array.from(
    new Set([
      ...(defaultSchema.tagNames || []),
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'del',
      'ins',
      'sup',
      'sub',
      'span',
      'div'
    ])
  ),
  attributes: {
    ...(defaultSchema.attributes || {}),
    '*': [
      ...(defaultSchema.attributes?.['*'] || []),
      'className'
    ],
    pre: [
      ...(defaultSchema.attributes?.pre || []),
      'className',
      'dataLanguage'
    ],
    code: [
      ...(defaultSchema.attributes?.code || []),
      'className'
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      'href',
      'title'
    ],
    img: [
      ...(defaultSchema.attributes?.img || []),
      'src',
      'alt',
      'title',
      'width',
      'height'
    ]
  },
  // protocols 以属性名（href/src）为键，而非标签名（a/img）
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: Array.from(
      new Set([
        ...(defaultSchema.protocols?.href || []),
        'http',
        'https',
        'mailto',
        'tel'
      ])
    ),
    src: Array.from(
      new Set([...(defaultSchema.protocols?.src || []), 'http', 'https'])
    )
  }
}

export const renderMarkdownToHtml = async (markdown: string) => {
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
    .process(markdown)

  return String(result)
}
