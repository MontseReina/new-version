import { Empty } from '../components/ui'

export function EnPreparacion({ name }: { name: string }) {
  return (
    <div>
      <h1>{name}</h1>
      <div className="card"><Empty>Este apartado está en preparación.</Empty></div>
    </div>
  )
}
