export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack'
export type RecipeCategory = 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'postre' | 'otro'

export interface RecipeIngredient {
  id: number
  name: string
  quantity: number | null
  unit: string
}

export interface NewRecipeIngredient {
  name: string
  quantity: number | null
  unit: string
}

export interface Recipe {
  id: number
  title: string
  categories: RecipeCategory[]
  prepMinutes: number | null
  servings: number | null
  steps: string
  notes: string
  favorite: boolean
  ingredients: RecipeIngredient[]
}

export interface NewRecipe {
  title: string
  categories: RecipeCategory[]
  prepMinutes: number | null
  servings: number | null
  steps: string
  notes: string
  ingredients: NewRecipeIngredient[]
}

export type UpdateRecipe = NewRecipe

export interface MealPlanEntry {
  id: number
  date: string
  mealType: MealType
  recipeId: number
  recipeTitle: string
}

export interface NewMealPlanEntry {
  date: string
  mealType: MealType
  recipeId: number
}

export interface ShoppingListItem {
  id: number
  weekStart: string
  name: string
  quantity: number | null
  unit: string
  checked: boolean
}

export interface NewShoppingListItem {
  weekStart: string
  name: string
  quantity: number | null
  unit: string
}

export const MEAL_TYPES: MealType[] = ['desayuno', 'almuerzo', 'cena', 'snack']

export const MEAL_TYPE_LABEL_KEY: Record<MealType, string> = {
  desayuno: 'recipes.mealType.desayuno',
  almuerzo: 'recipes.mealType.almuerzo',
  cena: 'recipes.mealType.cena',
  snack: 'recipes.mealType.snack'
}

export const RECIPE_CATEGORIES: RecipeCategory[] = ['desayuno', 'almuerzo', 'cena', 'snack', 'postre', 'otro']

export const RECIPE_CATEGORY_LABEL_KEY: Record<RecipeCategory, string> = {
  desayuno: 'recipes.mealType.desayuno',
  almuerzo: 'recipes.mealType.almuerzo',
  cena: 'recipes.mealType.cena',
  snack: 'recipes.mealType.snack',
  postre: 'recipes.category.postre',
  otro: 'recipes.category.otro'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toIso(date)
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}
