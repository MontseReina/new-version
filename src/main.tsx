import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import { supabase } from './lib/supabase'
import './styles/tokens.css'
import './styles/app.css'

registerSW({ immediate: true })

// Si se llega desde el enlace del correo, la sesión viene en la dirección: se procesa antes
// de arrancar la navegación para que las rutas no la pisen.
await supabase?.auth.getSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
