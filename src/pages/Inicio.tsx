import { useEffect, useState } from 'react'
import { modules } from '../modules'
import { counts } from '../store/repo'

export function Inicio() {
  const [state, setState] = useState<'cargando' | 'ok' | 'error'>('cargando')
  useEffect(() => { counts().then(() => setState('ok'), () => setState('error')) }, [])
  return (
    <section className="stack">
      <h1>Inicio</h1>
      <p className={'status ' + state} role="status">
        {state === 'cargando' && 'Comprobando la conexión con tu base de datos…'}
        {state === 'ok' && 'Conectada a tu base de datos.'}
        {state === 'error' && 'No se pudo conectar con la base de datos. Revisa tu conexión a internet.'}
      </p>
      {modules.length === 0 && (
        <div className="empty">
          Aquí aparecerá tu día cuando se añadan los módulos: registro diario, ciclo, suplementos, desvíos y prevención.
        </div>
      )}
    </section>
  )
}
