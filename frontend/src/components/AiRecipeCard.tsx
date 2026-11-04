import type { Ref } from 'react'
import type { RecipeDetail } from '../api/recipes'

type AiRecipeCardProps = {
  recipe: RecipeDetail
  onOpen: (trigger: HTMLButtonElement) => void
  buttonRef?: Ref<HTMLButtonElement>
}

/** Card for the AI recipe: no photo or used/missing lists, clearly labelled. */
function AiRecipeCard({ recipe, onOpen, buttonRef }: AiRecipeCardProps) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-300 transition-shadow hover:shadow-md">
      <div className="flex aspect-[4/3] w-full items-start bg-emerald-50 p-4">
        <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-sm font-medium text-white">
          KI-Vorschlag
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-lg leading-snug font-semibold text-stone-900">
          {/* The overlay makes the whole card clickable without block content in a button. */}
          <button
            ref={buttonRef}
            type="button"
            onClick={(event) => onOpen(event.currentTarget)}
            className="text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-emerald-700"
          >
            {recipe.title}
          </button>
        </h3>
        {recipe.ready_in_minutes !== null && (
          <p className="text-sm text-stone-600">{recipe.ready_in_minutes} Min.</p>
        )}
        <p className="mt-auto text-sm text-stone-600">
          Aus deinen Zutaten, ergänzt um Gewürze und Grundzutaten.
        </p>
      </div>
    </article>
  )
}

export default AiRecipeCard
