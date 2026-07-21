import { CATEGORY_ICON_COMPONENT, CATEGORY_COLOR_HEX } from '../../lib/categoryIcons'
import type { Category, CategoryIcon } from '../../../../shared/ledger'

interface Props {
  category: Pick<Category, 'name' | 'icon' | 'color'> | undefined
  fallbackName: string
  size?: number
}

export default function CategoryBadge({ category, fallbackName, size = 22 }: Props): JSX.Element {
  const color = category?.color ? CATEGORY_COLOR_HEX[category.color] : '#94a3b8'
  const Icon = category?.icon ? CATEGORY_ICON_COMPONENT[category.icon as CategoryIcon] : null
  const name = category?.name ?? fallbackName

  return (
    <span
      className="category-badge"
      style={{ width: size, height: size, background: `${color}26`, color }}
      title={name}
    >
      {Icon ? <Icon size={Math.round(size * 0.6)} strokeWidth={1.75} /> : name.charAt(0).toUpperCase()}
    </span>
  )
}
