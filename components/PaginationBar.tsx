'use client';

export type PaginationState = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function PaginationBar({
  pagination,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100],
  label = 'records',
}: {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  pageSizeOptions?: number[];
  label?: string;
}) {
  const showingFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total);

  function changePage(page: number) {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    onPageChange(page);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="text-sm text-slate-600">
        Showing <b>{showingFrom}</b> to <b>{showingTo}</b> of <b>{pagination.total}</b> {label}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page <= 1} onClick={() => changePage(1)}>First</button>
        <button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>Prev</button>
        <span className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-black text-white">{pagination.page} / {pagination.totalPages}</span>
        <button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)}>Next</button>
        <button className="rounded-xl border bg-white px-3 py-2 text-sm font-bold disabled:opacity-50" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.totalPages)}>Last</button>
      </div>

      <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" value={pagination.limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
        {pageSizeOptions.map((size) => <option key={size} value={size}>{size} per page</option>)}
      </select>
    </div>
  );
}
