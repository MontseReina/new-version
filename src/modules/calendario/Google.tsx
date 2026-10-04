import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fmtDateTime } from '../../lib/dates'
import { DEMO } from '../../store/repo'
import { conectar, desconectar, sincronizar, useGoogle } from './google'

/** Tarjeta del Calendario con el estado de la unión con Google Calendar. */
export function TarjetaGoogle() {
  const g = useGoogle()
  const [params] = useSearchParams()
  const [confirmar, setConfirmar] = useState(false)
  const vuelta = params.get('google')

  if (DEMO) return <p className="muted small">En la app, el calendario se puede unir a Google Calendar.</p>
  if (g.conectado === null) return <p className="muted small">Comprobando la unión con Google Calendar…</p>

  return (
    <div className="card tight">
      <div className="row between">
        <strong>Google Calendar</strong>
        {g.conectado
          ? <button className="btn sm secondary" disabled={g.sincronizando} onClick={() => { void sincronizar() }}>{g.sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}</button>
          : <button className="btn sm" disabled={!g.configurado} onClick={() => { void conectar() }}>Conectar con Google</button>}
      </div>
      {g.conectado ? (
        <p className="muted small" style={{ margin: '.3rem 0 0' }}>
          Unido a tu calendario «New Version» de Google. {g.ultima ? `Última sincronización: ${fmtDateTime(g.ultima)}.` : 'Aún sin sincronizar.'}{' '}
          {!confirmar && <button type="button" className="linkbtn small" onClick={() => setConfirmar(true)}>Desconectar</button>}
          {confirmar && (
            <>
              ¿Desconectar? Los eventos se quedan en los dos sitios.{' '}
              <button type="button" className="linkbtn small" onClick={() => { setConfirmar(false); void desconectar() }}>Sí</button>{' · '}
              <button type="button" className="linkbtn small" onClick={() => setConfirmar(false)}>No</button>
            </>
          )}
        </p>
      ) : (
        <p className="muted small" style={{ margin: '.3rem 0 0' }}>
          {!g.configurado
            ? 'La unión con Google todavía no está preparada en el servidor.'
            : vuelta === 'cancelado' ? 'No se ha dado el permiso en Google.'
            : vuelta === 'error' ? 'Google no ha completado la conexión. Vuelve a intentarlo.'
            : 'Sin unir. Al conectar se crea en tu Google Calendar un calendario aparte llamado «New Version»; la app solo toca ese.'}
        </p>
      )}
      {g.error && <p className="error small" style={{ margin: '.3rem 0 0' }}>{g.error}</p>}
    </div>
  )
}
