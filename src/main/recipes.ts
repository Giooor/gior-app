import { getDb, persistDb } from './db'
import { addDays } from '../shared/recipes'
import type {
  MealPlanEntry,
  MealType,
  NewMealPlanEntry,
  NewRecipe,
  NewShoppingListItem,
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  ShoppingListItem,
  UpdateRecipe
} from '../shared/recipes'

const VALID_CATEGORIES: RecipeCategory[] = ['desayuno', 'almuerzo', 'cena', 'snack', 'postre', 'otro']
const VALID_MEAL_TYPES: MealType[] = ['desayuno', 'almuerzo', 'cena', 'snack']

function validateRecipe(input: NewRecipe): string {
  if (!input.title.trim()) return 'errors.recipeTitleRequired'
  if (input.categories.length === 0) return 'errors.recipeCategoriesRequired'
  if (input.categories.some((c) => !VALID_CATEGORIES.includes(c))) return 'errors.invalidCategory'
  if (input.ingredients.some((i) => !i.name.trim())) return 'errors.ingredientNameRequired'
  return ''
}

function listIngredients(recipeId: number): RecipeIngredient[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, name, quantity, unit FROM recipe_ingredients WHERE recipe_id = :recipeId ORDER BY sort_order ASC'
  )
  stmt.bind({ ':recipeId': recipeId })

  const rows: RecipeIngredient[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      name: row.name as string,
      quantity: (row.quantity as number | null) ?? null,
      unit: row.unit as string
    })
  }
  stmt.free()
  return rows
}

function insertIngredients(db: ReturnType<typeof getDb>, recipeId: number, input: NewRecipe['ingredients']): void {
  input.forEach((ing, index) => {
    if (!ing.name.trim()) return
    db.run(
      'INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, sort_order) VALUES (:recipeId, :name, :quantity, :unit, :sortOrder)',
      {
        ':recipeId': recipeId,
        ':name': ing.name.trim(),
        ':quantity': ing.quantity,
        ':unit': ing.unit.trim(),
        ':sortOrder': index
      }
    )
  })
}

function listCategories(recipeId: number): RecipeCategory[] {
  const db = getDb()
  const stmt = db.prepare('SELECT category FROM recipe_categories WHERE recipe_id = :recipeId ORDER BY id ASC')
  stmt.bind({ ':recipeId': recipeId })

  const rows: RecipeCategory[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject().category as RecipeCategory)
  }
  stmt.free()
  return rows
}

function insertCategories(db: ReturnType<typeof getDb>, recipeId: number, categories: RecipeCategory[]): void {
  const unique = Array.from(new Set(categories))
  unique.forEach((category) => {
    db.run('INSERT INTO recipe_categories (recipe_id, category) VALUES (:recipeId, :category)', {
      ':recipeId': recipeId,
      ':category': category
    })
  })
}

export function listRecipes(): Recipe[] {
  const db = getDb()
  const stmt = db.prepare('SELECT id, title, prep_minutes, servings, steps, notes, favorite FROM recipes ORDER BY title ASC')

  const rows: Recipe[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    const id = row.id as number
    rows.push({
      id,
      title: row.title as string,
      categories: listCategories(id),
      prepMinutes: (row.prep_minutes as number | null) ?? null,
      servings: (row.servings as number | null) ?? null,
      steps: row.steps as string,
      notes: row.notes as string,
      favorite: Boolean(row.favorite),
      ingredients: listIngredients(id)
    })
  }
  stmt.free()
  return rows
}

export function addRecipe(input: NewRecipe): void {
  const error = validateRecipe(input)
  if (error) throw new Error(error)

  const db = getDb()
  db.run(
    'INSERT INTO recipes (title, prep_minutes, servings, steps, notes, favorite) VALUES (:title, :prepMinutes, :servings, :steps, :notes, 0)',
    {
      ':title': input.title.trim(),
      ':prepMinutes': input.prepMinutes,
      ':servings': input.servings,
      ':steps': input.steps.trim(),
      ':notes': input.notes.trim()
    }
  )
  const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
  insertIngredients(db, id, input.ingredients)
  insertCategories(db, id, input.categories)
  persistDb()
}

export function updateRecipe(id: number, input: UpdateRecipe): void {
  const error = validateRecipe(input)
  if (error) throw new Error(error)

  const db = getDb()
  db.run(
    'UPDATE recipes SET title = :title, prep_minutes = :prepMinutes, servings = :servings, steps = :steps, notes = :notes WHERE id = :id',
    {
      ':title': input.title.trim(),
      ':prepMinutes': input.prepMinutes,
      ':servings': input.servings,
      ':steps': input.steps.trim(),
      ':notes': input.notes.trim(),
      ':id': id
    }
  )
  db.run('DELETE FROM recipe_ingredients WHERE recipe_id = :id', { ':id': id })
  insertIngredients(db, id, input.ingredients)
  db.run('DELETE FROM recipe_categories WHERE recipe_id = :id', { ':id': id })
  insertCategories(db, id, input.categories)
  persistDb()
}

export function deleteRecipe(id: number): void {
  const db = getDb()
  db.run('DELETE FROM recipe_ingredients WHERE recipe_id = :id', { ':id': id })
  db.run('DELETE FROM recipe_categories WHERE recipe_id = :id', { ':id': id })
  db.run('DELETE FROM meal_plan WHERE recipe_id = :id', { ':id': id })
  db.run('DELETE FROM recipes WHERE id = :id', { ':id': id })
  persistDb()
}

export function toggleRecipeFavorite(id: number): void {
  getDb().run('UPDATE recipes SET favorite = NOT favorite WHERE id = :id', { ':id': id })
  persistDb()
}

// --- Meal plan ---

export function listMealPlan(startDate: string, endDate: string): MealPlanEntry[] {
  const db = getDb()
  const stmt = db.prepare(
    `SELECT mp.id, mp.date, mp.meal_type, mp.recipe_id, r.title AS recipe_title
     FROM meal_plan mp
     JOIN recipes r ON r.id = mp.recipe_id
     WHERE mp.date >= :startDate AND mp.date <= :endDate
     ORDER BY mp.date ASC`
  )
  stmt.bind({ ':startDate': startDate, ':endDate': endDate })

  const rows: MealPlanEntry[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      date: row.date as string,
      mealType: row.meal_type as MealType,
      recipeId: row.recipe_id as number,
      recipeTitle: row.recipe_title as string
    })
  }
  stmt.free()
  return rows
}

export function setMealPlanEntry(input: NewMealPlanEntry): void {
  if (!VALID_MEAL_TYPES.includes(input.mealType)) throw new Error('errors.invalidMealType')
  if (!input.date) throw new Error('errors.invalidDate')

  const db = getDb()
  db.run('DELETE FROM meal_plan WHERE date = :date AND meal_type = :mealType', {
    ':date': input.date,
    ':mealType': input.mealType
  })
  db.run('INSERT INTO meal_plan (date, meal_type, recipe_id) VALUES (:date, :mealType, :recipeId)', {
    ':date': input.date,
    ':mealType': input.mealType,
    ':recipeId': input.recipeId
  })
  persistDb()
}

export function removeMealPlanEntry(id: number): void {
  getDb().run('DELETE FROM meal_plan WHERE id = :id', { ':id': id })
  persistDb()
}

// --- Shopping list ---

export function listShoppingList(weekStart: string): ShoppingListItem[] {
  const db = getDb()
  const stmt = db.prepare(
    'SELECT id, week_start, name, quantity, unit, checked FROM shopping_list_items WHERE week_start = :weekStart ORDER BY checked ASC, id ASC'
  )
  stmt.bind({ ':weekStart': weekStart })

  const rows: ShoppingListItem[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    rows.push({
      id: row.id as number,
      weekStart: row.week_start as string,
      name: row.name as string,
      quantity: (row.quantity as number | null) ?? null,
      unit: row.unit as string,
      checked: Boolean(row.checked)
    })
  }
  stmt.free()
  return rows
}

export function generateShoppingList(weekStart: string): void {
  const db = getDb()
  const endDate = addDays(weekStart, 6)

  const stmt = db.prepare(
    `SELECT ri.name, ri.quantity, ri.unit
     FROM meal_plan mp
     JOIN recipe_ingredients ri ON ri.recipe_id = mp.recipe_id
     WHERE mp.date >= :startDate AND mp.date <= :endDate`
  )
  stmt.bind({ ':startDate': weekStart, ':endDate': endDate })

  const aggregated = new Map<string, { name: string; unit: string; quantity: number | null }>()
  while (stmt.step()) {
    const row = stmt.getAsObject()
    const name = row.name as string
    const unit = (row.unit as string) ?? ''
    const quantity = (row.quantity as number | null) ?? null
    const key = `${name.trim().toLowerCase()}::${unit.trim().toLowerCase()}`

    const existing = aggregated.get(key)
    if (!existing) {
      aggregated.set(key, { name: name.trim(), unit: unit.trim(), quantity })
    } else if (existing.quantity !== null && quantity !== null) {
      existing.quantity += quantity
    } else {
      existing.quantity = null
    }
  }
  stmt.free()

  const existingStmt = db.prepare(
    'SELECT name, unit FROM shopping_list_items WHERE week_start = :weekStart'
  )
  existingStmt.bind({ ':weekStart': weekStart })
  const existingKeys = new Set<string>()
  while (existingStmt.step()) {
    const row = existingStmt.getAsObject()
    existingKeys.add(`${(row.name as string).trim().toLowerCase()}::${(row.unit as string).trim().toLowerCase()}`)
  }
  existingStmt.free()

  let inserted = false
  for (const [key, item] of aggregated) {
    if (existingKeys.has(key)) continue
    db.run(
      'INSERT INTO shopping_list_items (week_start, name, quantity, unit, checked) VALUES (:weekStart, :name, :quantity, :unit, 0)',
      { ':weekStart': weekStart, ':name': item.name, ':quantity': item.quantity, ':unit': item.unit }
    )
    inserted = true
  }
  if (inserted) persistDb()
}

export function addShoppingListItem(input: NewShoppingListItem): void {
  if (!input.name.trim()) throw new Error('errors.itemNameRequired')

  getDb().run(
    'INSERT INTO shopping_list_items (week_start, name, quantity, unit, checked) VALUES (:weekStart, :name, :quantity, :unit, 0)',
    { ':weekStart': input.weekStart, ':name': input.name.trim(), ':quantity': input.quantity, ':unit': input.unit.trim() }
  )
  persistDb()
}

export function toggleShoppingListItem(id: number): void {
  getDb().run('UPDATE shopping_list_items SET checked = NOT checked WHERE id = :id', { ':id': id })
  persistDb()
}

export function removeShoppingListItem(id: number): void {
  getDb().run('DELETE FROM shopping_list_items WHERE id = :id', { ':id': id })
  persistDb()
}

export function clearShoppingList(weekStart: string): void {
  getDb().run('DELETE FROM shopping_list_items WHERE week_start = :weekStart', { ':weekStart': weekStart })
  persistDb()
}
