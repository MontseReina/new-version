import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fmtDate, fmtDateTime } from '../../lib/dates'
import { DEMO } from '../../store/repo'
import { conectar, desconectar, sincronizar, type EstadoOura } from './conexion'

const HORAS = 'Se actualiza al abrir la app, a las 10:30 y a las 22:00.'

/** Tarjeta de arriba de Oura Ring: estado de la conexión con el anillo. */
export function TarjetaOura({ o, onDemo }: { o: EstadoOura; onDemo: () => void }) {
  const [params] = useSearchParams()
  const [confirmar, setConfirmar] = useState(false)
  const vuelta = params.get('oura')

  if (DEMO) {
    return (
      <div className="card tight row between">
        <div>
          <strong>Conectado</strong> <span className="tag verde">Oura Gen3</span>
          <div className="muted small">Última sincronización: hoy, 10:30 · {HORAS.toLowerCase()}</div>
        </div>
        <div className="row">
          <button className="btn sm" onClick={onDemo}>Sincronizar ahora</button>
          <button className="btn sm ghost" onClick={onDemo}>Desconectar</button>
        </div>
      </div>
    )
  }
  if (o.conectado === null) return <p className="muted small">Comprobando la conexión con Oura…</p>

  return (
    <div className="card tight">
      <div className="row between">
        <div><strong>Anillo Oura</strong> {o.conectado && <span className="tag verde">Conectado</span>}</div>
        {o.conectado
          ? <button className="btn sm secondary" disabled={o.sincronizando} onClick={() => { void sincronizar() }}>{o.sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}</button>
          : <button className="btn sm" disabled={!o.configurado} onClick={() => { void conectar() }}>Conectar con Oura</button>}
      </div>
      {o.conectado ? (
        <>
          <p className="muted small" style={{ margin: '.3rem 0 0' }}>
            {o.ultima ? `Última sincronización: ${fmtDateTime(o.ultima)}. ` : 'Aún sin sincronizar. '}{HORAS}{' '}
            {!confirmar && <button type="button" className="linkbtn small" onClick={() => setConfirmar(true)}>Desconectar</button>}
            {confirmar && (
              <>
                ¿Desconectar? Lo ya traído se queda en la app.{' '}
                <button type="button" className="linkbtn small" onClick={() => { setConfirmar(false); void desconectar() }}>Sí</button>{' · '}
                <button type="button" className="linkbtn small" onClick={() => setConfirmar(false)}>No</button>
              </>
            )}
          </p>
          {!o.historicoCompleto && (
            <p className="small" style={{ margin: '.3rem 0 0' }}>
              Trayendo tu histórico de Oura{o.historicoHasta ? `: ya hasta el ${fmtDate(o.historicoHasta)}` : ''}… Puedes seguir usando la app; si la cierras, sigue sola cada media hora.
            </p>
          )}
          {o.historicoCompleto && o.desde && <p className="muted small" style={{ margin: '.3rem 0 0' }}>Histórico completo: datos desde el {fmtDate(o.desde)}.</p>}
          {o.sinPermiso.length > 0 && (
            <p className="muted small" style={{ margin: '.3rem 0 0' }}>
              Oura no deja leer: {o.sinPermiso.join(', ')}. Si quieres verlos, hay que marcarlos en la aplicación de desarrolladora de Oura y volver a conectar.
            </p>
          )}
        </>
      ) : (
        <p className="muted small" style={{ margin: '.3rem 0 0' }}>
          {!o.configurado
            ? 'La conexión con Oura todavía no está preparada en el servidor.'
            : vuelta === 'cancelado' ? 'No se ha dado el permiso en Oura.'
            : vuelta === 'error' ? 'Oura no ha completado la conexión. Vuelve a intentarlo.'
            : 'Sin conectar. Al conectar, Oura te pide permiso; la app solo lee tus datos, no cambia nada en tu cuenta de Oura.'}
        </p>
      )}
      {o.error && <p className="error small" style={{ margin: '.3rem 0 0' }}>{o.error}</p>}
    </div>
  )
}
