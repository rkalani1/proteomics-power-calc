import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundle the KaTeX stylesheet from the installed package so it always matches
// the katex JS version (avoids a CDN version mismatch and an external request).
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
