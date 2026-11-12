import { useState } from 'react'
import { Plegable } from '../../components/ui'
import { addDays, todayStr } from '../../lib/dates'
import { LeyendaEpisodios, ListaEpisodios, SelectorMes } from '../ciclo/Calendario'
import { nombreMes, sumaMeses } from '../ciclo/logica'
import { useEpisodios } from '../ciclo/useEpisodios'

/** Registro de episodios del mes (disautonomía y demás episodios con hora, gravedad e ingreso), con el mes a elegir. */
export function EpisodiosMes() {
  const hoy = todayStr()
  const [mes, setMes] = useState(hoy.slice(0, 7))
  const ep = useEpisodios(mes + '-01', addDays(sumaMeses(mes, 1) + '-01', -1))
  const ingresos = ep.lista.filter((e) => e.urgencias).length
  const mesTxt = nombreMes(mes).replace(/ de \d+$/, '')
  return (
    <Plegable id="eval-episodios" title={`Registro de episodios · ${mesTxt} (${ep.lista.length})`} abierto>
      <SelectorMes id="eval-episodios" mes={mes} onMes={setMes} desde={2025} />
      {ep.lista.length === 0
        ? <p className="muted small">Ningún episodio registrado en {mesTxt}.</p>
        : <>
          <p className="small"><strong>{ep.lista.length}</strong> {ep.lista.length === 1 ? 'episodio' : 'episodios'}{ingresos ? <> · <span className="epi-ingreso">{ingresos} con ingreso</span></> : null}</p>
          <LeyendaEpisodios lista={ep.lista} />
          <ListaEpisodios lista={ep.lista} />
        </>}
    </Plegable>
  )
}
