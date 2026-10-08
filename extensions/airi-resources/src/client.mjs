import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resourcesFrom } from './resources.mjs'

export const inject = ['slots', 'locale', 'sessions', 'uiConversation', 'sidebarRight', 'sidebarRightTabs']
const KIND = 'airi-resources'
const ID = 'dsh-airi-resources'
const NS = 'airiResources'
const zh = { title: '资源', empty: '当前会话还没有图片或视频资源', download: '下载原文件', open: '打开原文件', loading: '正在加载预览…', failed: '无法预览，请下载原文件', preview: '图片预览', close: '关闭预览' }
const en = { title: 'Resources', empty: 'No images or videos in this session yet', download: 'Download original', open: 'Open original', loading: 'Loading preview…', failed: 'Preview unavailable; download the original', preview: 'Image preview', close: 'Close preview' }

function PreviewImage({ resource, loadImage, t }) {
  const [fallback, setFallback] = useState(!resource.url || /^image\/hei[cf](?:-sequence)?$/i.test(resource.mediaType))
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const opener = useRef(null)
  const fail = useCallback(() => { if (fallback) setFailed(true); else setFallback(true) }, [fallback])
  const close = useCallback(() => setOpen(false), [])
  useEffect(() => {
    if (!fallback || !resource.preview) return
    let live = true
    setFailed(false)
    setSrc(null)
    loadImage(resource.preview).then(url => { if (live) setSrc(url) }).catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [fallback, resource.preview, loadImage])
  useEffect(() => {
    if (!open) return
    const escape = event => { if (event.key === 'Escape') close(); if (event.key === 'Tab') event.preventDefault() }
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('keydown', escape); opener.current?.focus() }
  }, [open, close])
  const url = fallback ? src : resource.url
  if (failed || (fallback && !resource.preview)) return h('p', { className: 'airi-resource-status' }, t('failed'))
  if (!url) return h('p', { className: 'airi-resource-status' }, t('loading'))
  return h('div', null,
    h('button', { type: 'button', className: 'airi-resource-image', ref: opener, onClick: () => setOpen(true), 'aria-label': `${t('preview')}: ${resource.name}` }, h('img', { src: url, alt: resource.name, loading: 'lazy', onError: fail })),
    open && h('div', { className: 'airi-resource-lightbox', role: 'dialog', 'aria-modal': true, 'aria-label': t('preview'), onClick: close },
      h('button', { type: 'button', onClick: close, autoFocus: true }, t('close')),
      h('img', { src: url, alt: resource.name, onClick: event => event.stopPropagation() }),
    ),
  )
}

function PreviewVideo({ resource, loadImage }) {
  const [poster, setPoster] = useState(undefined)
  useEffect(() => {
    if (!resource.preview) return
    let live = true
    loadImage(resource.preview).then(url => { if (live) setPoster(url) }).catch(() => { /* A missing poster does not prevent native video playback. */ })
    return () => { live = false }
  }, [resource.preview, loadImage])
  return h('video', { src: resource.url, poster, controls: true, preload: 'metadata', playsInline: true, 'aria-label': resource.name })
}

function ResourceCard({ resource, loadImage, t }) {
  let body
  if (resource.mediaType.startsWith('image/')) body = h(PreviewImage, { resource, loadImage, t })
  else if (resource.mediaType.startsWith('video/')) body = h(PreviewVideo, { resource, loadImage })
  else if (resource.mediaType.startsWith('audio/')) body = h('audio', { src: resource.url, controls: true, preload: 'metadata', 'aria-label': resource.name })
  else if (resource.mediaType === 'application/pdf') body = h('iframe', { src: resource.url, title: resource.name, loading: 'lazy' })
  return h('article', { className: 'airi-resource-card', 'data-resource-id': resource.id }, body,
    h('div', { className: 'airi-resource-name', title: resource.name }, resource.name),
    resource.url && h('a', { className: 'airi-resource-download', href: resource.url, download: resource.name }, t('download')),
  )
}

function ResourceList({ useResourceChat, loadImage, t }) {
  const snapshot = useResourceChat(value => value)
  const resources = useMemo(() => resourcesFrom(snapshot, window.location.origin), [snapshot])
  return h('section', { className: 'airi-resource-list', 'aria-label': t('title') },
    resources.length === 0 ? h('p', null, t('empty')) : resources.map(resource => h(ResourceCard, { key: resource.id, resource, loadImage, t })),
  )
}

function ResourceButton({ useResourceChat, openResources, t }) {
  const snapshot = useResourceChat(value => value)
  const resources = useMemo(() => resourcesFrom(snapshot, window.location.origin), [snapshot])
  return h('button', { type: 'button', className: 'airi-resource-button', onClick: openResources, 'aria-label': t('title') }, `${t('title')} (${resources.length})`)
}

/** Register a Session-scoped tab and header action through the 0.2.1 public slots. */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }))
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.sidebarRightTabs.register({ id: ID, kind: KIND, title: () => t('title'), guide: [{ id: KIND, order: 30, title: () => t('title') }] }))
  const face = sessionId => {
    const binding = ctx.sessions.binding(sessionId)
    if (!binding) throw new Error('Unknown resource session')
    const target = ctx.uiConversation.binding(binding).target('chat')
    return {
      hooks: { resourceChat: target },
      loadImage: attachment => ctx.uiConversation.imageUrl(sessionId, attachment),
      openResources: () => ctx.sidebarRight.openTab(KIND),
    }
  }
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: ID, locale: NS, inject: face }, ResourceList)))
  ctx.effect(() => ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({ name: 'conversation.session.header.utilities', id: KIND, order: 15, locale: NS, inject: face }, ResourceButton)))
  ctx.effect(() => {
    const style = document.createElement('style')
    style.textContent = `.airi-resource-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));align-content:start;gap:12px;padding:12px;overflow:auto;height:100%;box-sizing:border-box;color:var(--dsw-alias-label-primary)}.airi-resource-card{overflow:hidden;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}.airi-resource-image{display:block;width:100%;padding:0;border:0;background:transparent;cursor:zoom-in}.airi-resource-card img,.airi-resource-card video{display:block;width:100%;max-height:280px;object-fit:contain}.airi-resource-card iframe{width:100%;height:300px;border:0}.airi-resource-name{padding:8px 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.airi-resource-download{display:block;padding:0 10px 10px;color:var(--dsw-alias-state-business-primary,#356ae6);font-size:12px}.airi-resource-status{padding:20px 10px;font-size:13px}.airi-resource-button{white-space:nowrap;border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:8px;padding:6px 10px;background:var(--dsw-alias-bg-layer-1);color:inherit;cursor:pointer}.airi-resource-lightbox{position:fixed;inset:0;z-index:9999;background:#000d;display:flex;align-items:center;justify-content:center}.airi-resource-lightbox img{max-width:95vw;max-height:90vh;width:auto}.airi-resource-lightbox button{position:absolute;right:20px;top:20px}`
    document.head.append(style)
    return () => style.remove()
  })
}
