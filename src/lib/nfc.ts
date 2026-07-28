export function isNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

type NfcCallback = () => void

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNDEFReader = any

let activeAbortController: AbortController | null = null

export async function startNfcScan(onScan: NfcCallback): Promise<void> {
  if (!isNfcSupported()) {
    throw new Error('NFC não suportado neste dispositivo ou navegador.')
  }

  stopNfcScan()

  const controller = new AbortController()
  activeAbortController = controller

  // NDEFReader is not in lib.dom.d.ts yet; access via window
  const NDEFReaderClass = (window as unknown as { NDEFReader: new () => AnyNDEFReader }).NDEFReader
  const reader: AnyNDEFReader = new NDEFReaderClass()

  reader.addEventListener('reading', () => {
    onScan()
  })

  await reader.scan({ signal: controller.signal })
}

export function stopNfcScan(): void {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
}
