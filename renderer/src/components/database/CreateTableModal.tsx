import { useState } from 'react'
import { Plus, Trash2, X, Table2, Check } from 'lucide-react'

interface ColumnDef {
  name: string
  type: string
  isPk: boolean
  isNotNull: boolean
  defaultValue: string
}

interface CreateTableModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (tableName: string, sql: string) => Promise<void>
}

const DATA_TYPES = [
  'INTEGER',
  'TEXT',
  'REAL',
  'BOOLEAN',
  'DATETIME',
  'VARCHAR(255)',
  'BLOB'
]

export default function CreateTableModal({ isOpen, onClose, onCreate }: CreateTableModalProps) {
  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<ColumnDef[]>([
    { name: 'id', type: 'INTEGER', isPk: true, isNotNull: true, defaultValue: '' }
  ])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const addColumn = () => {
    setColumns(prev => [
      ...prev,
      { name: `col_${prev.length + 1}`, type: 'TEXT', isPk: false, isNotNull: false, defaultValue: '' }
    ])
  }

  const removeColumn = (index: number) => {
    if (columns.length === 1) return
    setColumns(prev => prev.filter((_, i) => i !== index))
  }

  const updateColumn = (index: number, fields: Partial<ColumnDef>) => {
    setColumns(prev => prev.map((c, i) => i === index ? { ...c, ...fields } : c))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableName.trim()) {
      setError('Escribe un nombre para la tabla')
      return
    }
    const invalidCol = columns.find(c => !c.name.trim())
    if (invalidCol) {
      setError('Todas las columnas deben tener nombre')
      return
    }

    const cleanTableName = tableName.trim().replace(/"/g, '')
    const colSpecs = columns.map(c => {
      let spec = `"${c.name.trim()}" ${c.type}`
      if (c.isPk) spec += ' PRIMARY KEY'
      if (c.isNotNull) spec += ' NOT NULL'
      if (c.defaultValue.trim()) spec += ` DEFAULT ${c.defaultValue.trim()}`
      return spec
    })

    const sql = `CREATE TABLE "${cleanTableName}" (\n  ${colSpecs.join(',\n  ')}\n);`
    
    setError(null)
    setSubmitting(true)
    try {
      await onCreate(cleanTableName, sql)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error al crear la tabla')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--cipher-border)] px-4 py-3 bg-[var(--cipher-surface)]">
          <div className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-[var(--cipher-accent)]" />
            <h3 className="text-[14px] font-semibold text-[var(--cipher-text)]">Crear Nueva Tabla</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--cipher-text-muted)] hover:bg-white/5 hover:text-[var(--cipher-text)]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Table Name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase text-[var(--cipher-text-muted)] mb-1">
              Nombre de la Tabla
            </label>
            <input
              type="text"
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              placeholder="ej. usuarios, productos"
              className="w-full rounded-md border border-[var(--cipher-border)] bg-[var(--cipher-surface)] px-3 py-1.5 text-[13px] text-[var(--cipher-text)] outline-none focus:border-[var(--cipher-accent)]"
              autoFocus
            />
          </div>

          {/* Columns list */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase text-[var(--cipher-text-muted)]">
                Definición de Columnas ({columns.length})
              </label>
              <button
                type="button"
                onClick={addColumn}
                className="flex items-center gap-1 rounded bg-[var(--cipher-accent)]/10 border border-[var(--cipher-accent)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--cipher-accent)] hover:bg-[var(--cipher-accent)]/20 transition-all"
              >
                <Plus size={12} /> Columna
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-[var(--cipher-border)] bg-[var(--cipher-surface)] p-2.5"
                >
                  <input
                    type="text"
                    value={col.name}
                    onChange={e => updateColumn(idx, { name: e.target.value })}
                    placeholder="Nombre columna"
                    className="flex-1 min-w-0 rounded border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-2 py-1 text-[12px] text-[var(--cipher-text)] outline-none focus:border-[var(--cipher-accent)]"
                  />

                  <select
                    value={col.type}
                    onChange={e => updateColumn(idx, { type: e.target.value })}
                    className="rounded border border-[var(--cipher-border)] bg-[var(--cipher-surface-alt)] px-2 py-1 text-[11px] text-[var(--cipher-text)] outline-none"
                  >
                    {DATA_TYPES.map(dt => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-[var(--cipher-text-muted)]" title="Primary Key">
                    <input
                      type="checkbox"
                      checked={col.isPk}
                      onChange={e => updateColumn(idx, { isPk: e.target.checked })}
                      className="accent-[var(--cipher-accent)]"
                    />
                    PK
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-[var(--cipher-text-muted)]" title="Not Null">
                    <input
                      type="checkbox"
                      checked={col.isNotNull}
                      onChange={e => updateColumn(idx, { isNotNull: e.target.checked })}
                      className="accent-[var(--cipher-accent)]"
                    />
                    NN
                  </label>

                  <button
                    type="button"
                    onClick={() => removeColumn(idx)}
                    disabled={columns.length === 1}
                    className="rounded p-1 text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Eliminar columna"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-[12px] text-red-400">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--cipher-border)] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--cipher-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--cipher-text-muted)] hover:text-[var(--cipher-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-md bg-[var(--cipher-accent)] px-4 py-1.5 text-[12px] font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50"
            >
              <Check size={14} />
              {submitting ? 'Creando...' : 'Crear Tabla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
