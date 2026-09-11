// Prints a jsPDF document via a hidden iframe instead of opening it in a new
// browser tab/PDF viewer — clicking "Print" should only surface the OS print
// dialog, not a visible PDF preview tab alongside it.
export function printGeneratedPdf(doc) {
  const blobUrl = doc.output("bloburl")
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  iframe.style.visibility = "hidden"
  iframe.src = blobUrl

  const cleanup = () => {
    iframe.remove()
    URL.revokeObjectURL(blobUrl)
  }

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      // Most browsers fire 'afterprint' on the iframe's window once the print
      // dialog is dismissed (printed or cancelled) — clean up then.
      iframe.contentWindow.addEventListener("afterprint", cleanup, { once: true })
      // Fallback in case 'afterprint' never fires in some browsers.
      setTimeout(cleanup, 60000)
    } catch {
      // Some browsers block programmatic print from a blob iframe — fall back
      // to opening the document so the user can print it manually.
      window.open(blobUrl, "_blank")
      cleanup()
    }
  }

  document.body.appendChild(iframe)
}
