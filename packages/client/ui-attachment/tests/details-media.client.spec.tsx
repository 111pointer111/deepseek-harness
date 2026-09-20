// @vitest-environment jsdom

import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DetailsMedia } from '../src/client/DetailsMedia.tsx'

describe('DetailsMedia', () => {
  it('renders a PDF original with a native download action', () => {
    const t = ((key: string) => ({
      'resource.download': '下载原文件',
      'resource.open': '打开原文件',
      'resource.openSource': '在 Paperless 中打开',
    })[key] ?? key) as never
    const props = {
      originals: [{
        url: '/airi-resource?resource_ref=paperless%3Adocument%3A43&signature=x',
        mediaType: 'application/pdf',
        name: 'offer.pdf',
        sourceUrl: 'https://paperless.example/documents/43/details',
      }],
      images: [],
      loadImage: vi.fn(),
      align: 'start',
      t,
    } as unknown as ComponentProps<typeof DetailsMedia>
    const view = render(<DetailsMedia {...props} />)
    expect(view.container.querySelector('iframe')?.getAttribute('src')).toContain('/airi-resource?')
    const download = view.getByRole('link', { name: '下载原文件' })
    expect(download.getAttribute('download')).toBe('offer.pdf')
    expect(view.getByRole('link', { name: '在 Paperless 中打开' }).getAttribute('href'))
      .toBe('https://paperless.example/documents/43/details')
  })
})
