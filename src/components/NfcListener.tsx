import { useEffect } from 'react'
import { isNfcSupported, startNfcScan, stopNfcScan } from '../lib/nfc'

type Props = {
  onScan: () => void
  active: boolean
}

export default function NfcListener({ onScan, active }: Props) {
  useEffect(() => {
    if (!isNfcSupported() || !active) return

    startNfcScan(onScan).catch(() => {
      // NFC indisponível — usuário usa o toque na carta
    })

    return () => {
      stopNfcScan()
    }
  }, [active, onScan])

  return null
}
