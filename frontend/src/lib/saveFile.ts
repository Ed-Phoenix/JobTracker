/**
 * Hands a Blob to the browser as a download: a temporary object URL on an <a download> link.
 * The URL is released shortly after, so the file does not stay in memory. Not immediately:
 * some browsers start reading the URL only after click() returns.
 */
export function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
