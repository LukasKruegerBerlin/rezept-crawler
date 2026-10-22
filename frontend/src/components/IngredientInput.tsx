import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react'

type IngredientInputProps = {
  ingredients: string[]
  onChange: (ingredients: string[]) => void
  onSearch: (ingredients: string[]) => void
  isSearching: boolean
}

function withIngredient(ingredients: string[], text: string): string[] {
  const name = text.trim()
  const exists = ingredients.some((i) => i.toLowerCase() === name.toLowerCase())
  return name === '' || exists ? ingredients : [...ingredients, name]
}

function IngredientInput({ ingredients, onChange, onSearch, isSearching }: IngredientInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const canSearch = !isSearching && (ingredients.length > 0 || text.trim() !== '')

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      // Enter adds a chip; searching is the button's job.
      event.preventDefault()
      onChange(withIngredient(ingredients, text))
      setText('')
    }
  }

  function handleRemove(name: string) {
    onChange(ingredients.filter((i) => i !== name))
    inputRef.current?.focus()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Text still in the input counts as an ingredient.
    const next = withIngredient(ingredients, text)
    if (next.length === 0 || isSearching) return
    onChange(next)
    setText('')
    onSearch(next)
    // The button is disabled while searching, so keep focus in the input.
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="ingredient-input" className="text-sm font-medium text-stone-700">
        Zutaten
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex min-h-12 flex-1 flex-wrap items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
          {ingredients.length > 0 && (
            <ul className="contents" aria-label="Ausgewählte Zutaten">
              {ingredients.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-1 rounded-full bg-emerald-50 py-1 pr-1 pl-3 text-sm text-emerald-900"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => handleRemove(name)}
                    aria-label={`${name} entfernen`}
                    className="flex size-6 items-center justify-center rounded-full text-emerald-800 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            id="ingredient-input"
            ref={inputRef}
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zutat eingeben und Enter drücken"
            autoComplete="off"
            className="min-w-40 flex-1 bg-transparent py-1 outline-none placeholder:text-stone-400"
          />
        </div>
        <button
          type="submit"
          disabled={!canSearch}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          {isSearching ? 'Suche läuft…' : 'Rezepte suchen'}
        </button>
      </div>
    </form>
  )
}

export default IngredientInput
