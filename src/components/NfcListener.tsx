import { useEffect, useRef, useState } from 'react'
import { isNfcSupported, startNfcScan, stopNfcScan } from '../lib/nfc'

type Props = {
  onScan: () => void
  active: boolean
}

export default function NfcListener({ onScan, active }: Props) {
  const supported = isNfcSupported()
  const [scanning, setScanning] = useState(false)
  const [nfcError, setNfcError] = useState<string | null>(null)
  const pulseRef = useRef<boolean>(false)

  useEffect(() => {
    if (!supported || !active) return

    setNfcError(null)
    setScanning(true)
    pulseRef.current = false

    startNfcScan(() => {
      onScan()
    }).catch((err: Error) => {
      setNfcError(err.message)
      setScanning(false)
    })

    return () => {
      stopNfcScan()
      setScanning(false)
    }
  }, [supported, active, onScan])

  if (!supported) {
    return (
      <div className="nfc-unsupported">
        📵 NFC indisponível neste dispositivo — use o botão abaixo para sortear.
      </div>
    )
  }

  if (nfcError) {
    return (
      <div className="nfc-unsupported">
        ⚠️ NFC: {nfcError}
      </div>
    )
  }

  return (
    <div className={`nfc-area ${scanning ? 'nfc-scanning' : ''}`}>
      <div className="nfc-icon">📳</div>
      <p className="nfc-hint">
        {scanning ? 'Aproxime o celular da peça NFC para sortear' : 'Aguardando NFC...'}
      </p>
    </div>
  )
}
