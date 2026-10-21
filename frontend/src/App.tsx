import { useEffect, useState } from 'react'

type ApiStatus = 'checking' | 'ok' | 'unreachable'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setApiStatus(res.ok ? 'ok' : 'unreachable'))
      .catch(() => setApiStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>Recipe Crawler</h1>
      <p>Pick your ingredients and get recipe suggestions.</p>
      <p>
        API: <strong>{apiStatus}</strong>
      </p>
    </main>
  )
}

export default App
