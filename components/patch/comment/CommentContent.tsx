'use client'

import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import DOMPurify from 'isomorphic-dompurify'
import { useMounted } from '~/hooks/useMounted'
import { KunExternalLink } from '~/components/kun/external-link/ExternalLink'
import { Code } from '@heroui/code'
import { Chip } from '@heroui/chip'
import { Quote } from 'lucide-react'
import { scrollIntoComment } from './_scrollIntoComment'
import type { PatchComment } from '~/types/api/patch'

interface Props {
  comment: PatchComment
}

export const CommentContent = ({ comment }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const isMounted = useMounted()

  useEffect(() => {
    if (!contentRef.current || !isMounted) {
      return
    }

    const externalLinkElements = contentRef.current.querySelectorAll(
      '[data-kun-external-link]'
    )
    externalLinkElements.forEach((element) => {
      const text = element.getAttribute('data-text')
      const href = element.getAttribute('data-href')
      if (!text || !href) {
        return
      }
      const root = document.createElement('div')
      root.className = element.className
      element.replaceWith(root)
      const videoRoot = createRoot(root)
      videoRoot.render(<KunExternalLink link={href}>{text}</KunExternalLink>)
    })
  }, [isMounted])

  return (
    <>
      {comment.quotedContent && (
        <Code
          color="primary"
          onClick={() => scrollIntoComment(comment.parentId)}
          className="cursor-pointer"
        >
          <span>{comment.quotedUsername}</span>
          <Chip
            endContent={<Quote className="text-primary-500 size-4" />}
            variant="light"
          >
            {comment.quotedContent}
          </Chip>
        </Code>
      )}
      <div
        ref={contentRef}
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(comment.content)
        }}
        className="kun-prose max-w-none"
      />
    </>
  )
}
