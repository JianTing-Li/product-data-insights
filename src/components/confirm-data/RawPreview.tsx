import type { RawRow } from '@/lib/processing/types'

export function RawPreview({ headers, rows }: { headers: string[]; rows: RawRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm italic text-neutral-500 dark:text-neutral-400">No preview rows available.</p>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row, i) => (
            <tr key={i}>
              {headers.map((h) => (
                <td key={h} className="max-w-[200px] truncate whitespace-nowrap px-3 py-2 text-neutral-600 dark:text-neutral-400">
                  {row[h]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
