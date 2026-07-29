import { toLocalIso, todayIso } from '../../../../shared/date'
import { HABIT_COLOR_HEX } from '../../../../shared/habits'
import type { HabitColor } from '../../../../shared/habits'

interface Props {
  color: HabitColor
  completedDates: Set<string>
  onToggleDate: (date: string) => void
}

const DAYS = 84

function buildDates(): string[] {
  const dates: string[] = []
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(toLocalIso(d))
  }
  return dates
}

export default function HabitHeatmap({ color, completedDates, onToggleDate }: Props): JSX.Element {
  const dates = buildDates()
  const today = todayIso()

  return (
    <div className="habit-heatmap">
      {dates.map((date) => {
        const completed = completedDates.has(date)
        const future = date > today
        return (
          <button
            key={date}
            type="button"
            className={`habit-heatmap-cell${completed ? ' completed' : ''}${future ? ' future' : ''}`}
            style={completed ? { background: HABIT_COLOR_HEX[color] } : undefined}
            disabled={future}
            title={date}
            onClick={() => onToggleDate(date)}
          />
        )
      })}
    </div>
  )
}
