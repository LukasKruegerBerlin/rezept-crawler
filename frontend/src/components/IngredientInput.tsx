import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react'

type IngredientInputProps = {
  ingredients: string[]
  knownIngredients: string[]
  onChange: (ingredients: string[]) => void
  /** Raw field text; '' means no time limit. */
  maxReadyTime: string
  onMaxReadyTimeChange: (value: string) => void
  onSearch: (ingredients: string[]) => void
  isSearching: boolean
}

function withIngredient(ingredients: string[], text: string): string[] {
  const name = text.trim()
  const exists = ingredients.some((i) => i.toLowerCase() === name.toLowerCase())
  return name === '' || exists ? ingredients : [...ingredients, name]
}

const MAX_SUGGESTIONS = 5
const LISTBOX_ID = 'ingredient-suggestions'

function optionId(index: number): string {
  return `ingredient-suggestion-${index}`
}

/** Known ingredients starting with the typed text, minus the chosen ones. */
function suggestionsFor(known: string[], text: string, chosen: string[]): string[] {
  const prefix = text.trim().toLowerCase()
  if (prefix === '') return []
  const taken = new Set(chosen.map((i) => i.toLowerCase()))
  return known
    .filter((name) => {
      const lower = name.toLowerCase()
      return lower.startsWith(prefix) && !taken.has(lower)
    })
    .slice(0, MAX_SUGGESTIONS)
}

function IngredientInput({
  ingredients,
  knownIngredients,
  onChange,
  maxReadyTime,
  onMaxReadyTimeChange,
  onSearch,
  isSearching,
}: IngredientInputProps) {
  const [text, setText] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  // Escape hides the list until the text changes.
  const [isDismissed, setIsDismissed] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const canSearch = !isSearching && (ingredients.length > 0 || text.trim() !== '')

  const suggestions = suggestionsFor(knownIngredients, text, ingredients)
  const isOpen = isFocused && !isDismissed && suggestions.length > 0
  const activeIndex = isOpen && highlight < suggestions.length ? highlight : -1

  function addChip(name: string) {
    onChange(withIngredient(ingredients, name))
    setText('')
    setHighlight(-1)
    setIsDismissed(false)
  }

  function handleTextChange(value: string) {
    setText(value)
    setHighlight(-1)
    setIsDismissed(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = suggestions.length
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (count === 0) return
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        const start = activeIndex === -1 ? (step === 1 ? -1 : 0) : activeIndex
        setIsDismissed(false)
        setHighlight((start + step + count) % count)
        return
      }
      case 'Escape':
        if (!isOpen) return
        event.preventDefault()
        setIsDismissed(true)
        setHighlight(-1)
        return
      case 'Enter':
        // Enter adds a chip; searching is the button's job.
        event.preventDefault()
        addChip(activeIndex === -1 ? text : suggestions[activeIndex])
        return
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
        <div className="relative flex-1">
          <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
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
              onChange={(event) => handleTextChange(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={LISTBOX_ID}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex === -1 ? undefined : optionId(activeIndex)}
              placeholder="Zutat eingeben und Enter drücken"
              autoComplete="off"
              className="min-w-40 flex-1 bg-transparent py-1 outline-none placeholder:text-stone-400"
            />
          </div>
          <ul
            id={LISTBOX_ID}
            role="listbox"
            aria-label="Vorschläge"
            hidden={!isOpen}
            className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-xl border border-stone-300 bg-white py-1 shadow-lg"
          >
            {isOpen &&
              suggestions.map((name, index) => (
                <li
                  key={name}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  // mousedown instead of click, so the input keeps its focus.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    addChip(name)
                  }}
                  className={`cursor-pointer px-4 py-2 text-stone-800 hover:bg-emerald-50 ${index === activeIndex ? 'bg-emerald-50 text-emerald-900' : ''}`}
                >
                  {name}
                </li>
              ))}
          </ul>
        </div>
        <button
          type="submit"
          disabled={!canSearch}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          {isSearching ? 'Suche läuft…' : 'Rezepte suchen'}
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="max-ready-time" className="text-sm font-medium text-stone-700">
          Max. Kochzeit (Minuten)
        </label>
        {/* Native constraint validation blocks the submit for invalid values. */}
        <input
          id="max-ready-time"
          type="number"
          min={1}
          max={1440}
          step={1}
          inputMode="numeric"
          value={maxReadyTime}
          onChange={(event) => onMaxReadyTimeChange(event.target.value)}
          disabled={isSearching}
          aria-describedby="max-ready-time-hint"
          className="w-40 rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-stone-100"
        />
        <p id="max-ready-time-hint" className="text-sm text-stone-500">
          Leer lassen für keine Begrenzung
        </p>
      </div>
    </form>
  )
}

export default IngredientInput
