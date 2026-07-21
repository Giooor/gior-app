import { ClipboardEvent, KeyboardEvent, useRef } from 'react'

const PIN_LENGTH = 6

interface Props {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  autoFocus?: boolean
  hasError?: boolean
  ariaLabel: string
}

export default function PinInput({ value, onChange, onComplete, autoFocus, hasError, ariaLabel }: Props): JSX.Element {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: PIN_LENGTH }, (_, i) => value[i] ?? '')

  function commit(next: string): void {
    onChange(next)
    if (next.length === PIN_LENGTH) onComplete?.(next)
  }

  function handleChange(index: number, raw: string): void {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const chars = value.split('')
    chars[index] = digit
    const next = chars.join('').slice(0, PIN_LENGTH)
    commit(next)
    if (digit && index < PIN_LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>): void {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH)
    if (!pasted) return
    e.preventDefault()
    commit(pasted)
    inputs.current[Math.min(pasted.length, PIN_LENGTH - 1)]?.focus()
  }

  return (
    <div className={`pin-input${hasError ? ' pin-input-error' : ''}`} role="group" aria-label={ariaLabel}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          autoFocus={autoFocus && i === 0}
          className={`pin-input-box${digit ? ' filled' : ''}`}
          aria-label={`${ariaLabel} ${i + 1}/${PIN_LENGTH}`}
        />
      ))}
    </div>
  )
}
