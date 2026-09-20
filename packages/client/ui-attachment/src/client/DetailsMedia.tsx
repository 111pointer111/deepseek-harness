import { IconDownloadOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DetailsMediaOwnerProps, DetailsMediaProps } from '@deepseek-ai/dsh-client-ui-chat/client'
import { MessageImages } from './MessageImages.tsx'
import css from './DetailsMedia.module.css'

function Original({ url, mediaType, name, sourceUrl, t }: DetailsMediaOwnerProps['originals'][number] & Pick<DetailsMediaProps, 't'>) {
  const body = mediaType.startsWith('image/')
    ? <img className={css.image} src={url} alt={name} />
    : mediaType === 'application/pdf'
      ? <iframe className={css.document} src={url} title={name} />
      : mediaType.startsWith('video/')
        ? <video className={css.video} src={url} controls preload="metadata" />
        : mediaType.startsWith('audio/')
          ? <audio className={css.audio} src={url} controls preload="metadata" />
          : <a className={css.open} href={url} target="_blank" rel="noreferrer">{t('resource.open')}</a>
  return (
    <div className={css.card}>
      <a className={css.download} href={url} download={name} aria-label={t('resource.download')} title={t('resource.download')}>
        <IconDownloadOutline16 size={16} />
      </a>
      {body}
      <div className={css.name} title={name}>{name}</div>
      {sourceUrl !== undefined && (
        <a className={css.source} href={sourceUrl} target="_blank" rel="noreferrer">
          {t('resource.openSource')}
        </a>
      )}
    </div>
  )
}

/** Tool resource surface: original media first, preview-image fallback. */
export function DetailsMedia({ originals, images, ...props }: DetailsMediaProps) {
  return (
    <div className={css.list}>
      {originals.map(item => <Original key={item.url} {...item} t={props.t} />)}
      {images.length > 0 && <MessageImages images={images} {...props} />}
    </div>
  )
}
