import type { RecipeSummary } from '../api/search'

type RecipeCardProps = {
  recipe: RecipeSummary
  onOpen: (trigger: HTMLButtonElement) => void
}

function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  const isComplete = recipe.missing_count === 0

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 transition-shadow hover:shadow-md">
      {recipe.image ? (
        <img
          src={recipe.image}
          alt={recipe.title}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="aspect-[4/3] w-full bg-stone-100" aria-hidden="true" />
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-snug font-semibold text-stone-900">
            {/* The overlay makes the whole card clickable without block content in a button. */}
            <button
              type="button"
              onClick={(event) => onOpen(event.currentTarget)}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-emerald-700"
            >
              {recipe.title}
            </button>
          </h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium ${
              isComplete ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
            }`}
          >
            fehlt: {recipe.missing_count}
          </span>
        </div>
        {recipe.ready_in_minutes !== null && (
          <p className="text-sm text-stone-600">{recipe.ready_in_minutes} Min.</p>
        )}
        <dl className="mt-auto space-y-1 text-sm">
          {recipe.used_ingredients.length > 0 && (
            <div>
              <dt className="inline font-medium text-stone-700">Vorhanden: </dt>
              <dd className="inline text-stone-600">{recipe.used_ingredients.join(', ')}</dd>
            </div>
          )}
          {recipe.missing_ingredients.length > 0 && (
            <div>
              <dt className="inline font-medium text-stone-700">Fehlt: </dt>
              <dd className="inline text-stone-600">{recipe.missing_ingredients.join(', ')}</dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  )
}

export default RecipeCard
