import { useCallback, useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

interface UseConfirm {
  confirm: (message: string) => Promise<boolean>
  dialog: JSX.Element | null
}

export function useConfirm(): UseConfirm {
  const [message, setMessage] = useState<string | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((msg: string) => {
    setMessage(msg)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  function settle(value: boolean): void {
    setMessage(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }

  const dialog =
    message !== null ? (
      <ConfirmDialog message={message} onCancel={() => settle(false)} onConfirm={() => settle(true)} />
    ) : null

  return { confirm, dialog }
}
