import React, { useState } from 'react';
import { SearchIcon } from './icons';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Buscar registros...',
  searchFilter,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado.',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredData = data.filter((item) => {
    if (!searchQuery.trim() || !searchFilter) return true;
    return searchFilter(item, searchQuery.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="medical-card rounded-2xl overflow-hidden">
      {/* Search Header */}
      {searchFilter && (
        <div className="p-4 bg-[#081533] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-[#060e20] text-sm text-white placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-white/20 focus:border-cyan-400 focus:outline-none transition-all"
            />
          </div>
          <div className="text-xs font-semibold text-slate-300">
            Total de registros: <span className="text-white font-bold">{filteredData.length}</span>
          </div>
        </div>
      )}

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[#061026] text-cyan-300 font-bold uppercase tracking-wider text-xs border-b border-white/10">
              {columns.map((col) => (
                <th key={col.key} className="py-3.5 px-5" style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-blue-600/15' : 'hover:bg-white/5'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="py-4 px-5 text-slate-200">
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 bg-[#081533] border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <div>
            Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/15 text-xs font-semibold"
            >
              Anterior
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-cyan-400/40 bg-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-500 text-xs font-bold shadow-sm"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
