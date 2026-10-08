/** Project trusted, loaded Tool results into a deduplicated Session resource list. */
export function resourcesFrom(snapshot, origin) {
  const resources = new Map()
  const visit = block => {
    if (block.kind === 'tool-result' && !block.isError) {
      const images = block.content.filter(item => item.type === 'image' && item.attachment)
      let original
      for (const item of block.content) {
        if (item.type !== 'text') continue
        try {
          const value = JSON.parse(item.text)
          const candidate = value.original
          if (!candidate || typeof candidate.url !== 'string' || typeof candidate.media_type !== 'string' || typeof candidate.name !== 'string') continue
          const parsed = new URL(candidate.url, origin)
          if (parsed.origin !== origin || parsed.pathname !== '/airi-resource') continue
          original = { id: value.resource_ref || parsed.href, url: parsed.pathname + parsed.search, mediaType: candidate.media_type, name: candidate.name, preview: images[0]?.attachment }
          resources.set(original.id, original)
          break
        } catch {
          // Other Tool results can be ordinary prose rather than a resource descriptor.
        }
      }
      if (!original) for (const image of images) {
        const attachment = image.attachment
        resources.set(attachment.attachmentId, { id: attachment.attachmentId, mediaType: attachment.mediaType, name: attachment.name || 'image', preview: attachment })
      }
    }
    for (const child of block.subCalls || []) visit(child)
  }
  for (const key of snapshot?.order || []) {
    const node = snapshot.nodes.get(key)
    if (node?.kind === 'tool-call') visit(node.data.root)
  }
  return [...resources.values()]
}
