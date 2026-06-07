'use client';

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from 'react';

import QRCode from 'qrcode';

import {
  CheckCircle2,
  XCircle,
  Info,
  X,
  Download,
  RefreshCw,
  Search,
  QrCode,
  Users,
  Loader2,
  IdCard,
  ListFilter,
} from 'lucide-react';

import type { Student, Pagination } from '@/types';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  type: ToastType;
  message: string;
  details?: string;
}

function ToastMessage({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  const config = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      iconColor: 'text-emerald-600',
      title: 'Success',
    },
    error: {
      icon: XCircle,
      border: 'border-red-200',
      bg: 'bg-red-50',
      text: 'text-red-800',
      iconColor: 'text-red-600',
      title: 'Error',
    },
    info: {
      icon: Info,
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      iconColor: 'text-blue-600',
      title: 'Information',
    },
  };

  const selected = config[toast.type];
  const Icon = selected.icon;

  return (
    <div className="fixed right-5 top-5 z-50 w-[calc(100%-2rem)] max-w-md animate-[slideIn_0.25s_ease-out]">
      <div
        className={`flex gap-3 rounded-2xl border ${selected.border} ${selected.bg} p-4 shadow-2xl backdrop-blur`}
      >
        <div className={`mt-0.5 ${selected.iconColor}`}>
          <Icon size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${selected.text}`}>
            {selected.title}
          </p>

          <p className={`mt-0.5 text-sm ${selected.text}`}>
            {toast.message}
          </p>

          {toast.details && (
            <p className="mt-1 max-h-12 overflow-hidden text-xs text-slate-500">
              {toast.details}
            </p>
          )}

          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/70">
            <div className="h-full animate-[toastTimer_5s_linear_forwards] rounded-full bg-current opacity-40" />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>

      <div className="mt-0.5 text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

export default function StudentQRListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasGeneratedQR, setHasGeneratedQR] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);

  const classes = ['6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const pageSizeOptions = [10, 25, 50, 100];

  const isBusy = loadingStudents || generating;

  const hasMinimumFilter =
    searchInput.trim().length > 0 ||
    filterClass.length > 0 ||
    filterSection.length > 0;

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback(
    (type: ToastType, message: string, details?: string) => {
      setToast({ type, message, details });
    },
    []
  );

  function makeSafeFileName(value: string) {
    return value
      .trim()
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  function buildStudentQRPayload(student: Student) {
    return JSON.stringify({
      type: 'student-attendance-qr',
      studentId: student.studentId,
      qrToken: student.qrToken,
      name: student.name,
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber,
      email: student.email,
      phone: student.phone || '',
    });
  }

  async function loadStudentsFromFilter() {
    const searchKeyword = searchInput.trim();

    if (!searchKeyword && !filterClass && !filterSection) {
      showToast(
        'info',
        'Please select at least one filter.',
        'Use Search, Class, or Section before loading students.'
      );
      return;
    }

    setLoadingStudents(true);
    setToast(null);
    setStudents([]);
    setQrImages({});
    setHasLoaded(true);
    setHasGeneratedQR(false);
    setAppliedSearch(searchKeyword);

    try {
      const allStudents: Student[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const params = new URLSearchParams();

        params.set('page', String(page));
        params.set('limit', '100');

        if (searchKeyword) params.set('search', searchKeyword);
        if (filterClass) params.set('class', filterClass);
        if (filterSection) params.set('section', filterSection);

        const res = await fetch(`/api/students?${params}`);

        const data: {
          students?: Student[];
          pagination?: Pagination;
          error?: string;
        } = await res.json();

        if (!res.ok) {
          showToast('error', data.error || 'Failed to load students.');
          return;
        }

        allStudents.push(...(data.students || []));

        totalPages = data.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      setStudents(allStudents);

      setPagination((prev) => ({
        ...prev,
        page: 1,
        total: allStudents.length,
        totalPages: Math.max(Math.ceil(allStudents.length / prev.limit), 1),
      }));

      if (!allStudents.length) {
        showToast('info', 'No students found for selected filter.');
        return;
      }

      showToast(
        'success',
        'Students loaded successfully.',
        `${allStudents.length} student(s) found. Now click Generate QR Codes.`
      );
    } catch {
      showToast('error', 'Unable to load students.');
    } finally {
      setLoadingStudents(false);
    }
  }

  const generateQRCodes = useCallback(
    async (studentList: Student[]) => {
      if (!studentList.length) {
        showToast(
          'info',
          'No students loaded.',
          'Load students first, then generate QR codes.'
        );
        return;
      }

      setGenerating(true);
      setToast(null);
      setQrImages({});
      setHasGeneratedQR(false);

      try {
        const entries = await Promise.all(
          studentList.map(async (student) => {
            const payload = buildStudentQRPayload(student);

            const qrDataUrl = await QRCode.toDataURL(payload, {
              width: 320,
              margin: 2,
              errorCorrectionLevel: 'M',
            });

            return [student._id, qrDataUrl] as const;
          })
        );

        setQrImages(Object.fromEntries(entries));
        setHasGeneratedQR(true);

        showToast(
          'success',
          'QR codes generated successfully.',
          `${studentList.length} QR card(s) are ready.`
        );
      } catch {
        showToast('error', 'Failed to generate QR codes.');
      } finally {
        setGenerating(false);
      }
    },
    [showToast]
  );

  async function generateLoadedStudentQRCodes() {
    if (!students.length) {
      showToast(
        'info',
        'Please load students first.',
        'Select a filter and click Load Students before generating QR codes.'
      );
      return;
    }

    await generateQRCodes(students);
  }

  async function refreshCurrentQRCodes() {
    if (!students.length) {
      showToast('info', 'Load students first.');
      return;
    }

    await generateQRCodes(students);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      loadStudentsFromFilter();
    }
  }

  function clearFilters() {
    setSearchInput('');
    setAppliedSearch('');
    setFilterClass('');
    setFilterSection('');
    setStudents([]);
    setQrImages({});
    setHasLoaded(false);
    setHasGeneratedQR(false);

    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

    setToast(null);
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;

    setPagination((prev) => ({
      ...prev,
      page: nextPage,
    }));
  }

  function changeLimit(limit: number) {
    setPagination((prev) => ({
      ...prev,
      page: 1,
      limit,
      totalPages: Math.max(Math.ceil(students.length / limit), 1),
    }));
  }

  function downloadSingleQR(student: Student) {
    const qrDataUrl = qrImages[student._id];

    if (!qrDataUrl) {
      showToast(
        'error',
        'QR code is not ready.',
        'Please generate QR codes first.'
      );
      return;
    }

    const link = document.createElement('a');

    link.href = qrDataUrl;
    link.download = `${makeSafeFileName(student.rollNumber)}-${makeSafeFileName(
      student.studentId
    )}-${makeSafeFileName(student.name)}-qr.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const displayStudents = students.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  const showingFrom =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  return (
    <div>
      {toast && (
        <ToastMessage toast={toast} onClose={() => setToast(null)} />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <QrCode size={26} />
            Student QR Code List
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            First load students using a filter, then generate student QR cards.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadStudentsFromFilter}
            disabled={isBusy || !hasMinimumFilter}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {loadingStudents ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ListFilter size={16} />
            )}
            Load Students
          </button>

          <button
            type="button"
            onClick={generateLoadedStudentQRCodes}
            disabled={isBusy || !students.length}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <QrCode size={16} />
            )}
            Generate QR Codes
          </button>

          <button
            type="button"
            onClick={refreshCurrentQRCodes}
            disabled={isBusy || !students.length}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh QR
          </button>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              

              <input
                className="input w-full pl-9 pr-24"
                placeholder="Search name, ID, email, roll..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                disabled={isBusy}
              />

              <button
                type="button"
                onClick={loadStudentsFromFilter}
                disabled={isBusy || !hasMinimumFilter}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Load
              </button>
            </div>

            <select
              className="input w-full sm:max-w-[170px]"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              disabled={isBusy}
            >
              <option value="">All Classes</option>

              {['6', '7', '8', '9', '10', '11', '12'].map((item) => (
                <option key={item} value={item}>
                  Class {item}
                </option>
              ))}
            </select>

            <select
              className="input w-full sm:max-w-[170px]"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              disabled={isBusy}
            >
              <option value="">All Sections</option>

              {['A', 'B', 'C', 'D'].map((item) => (
                <option key={item} value={item}>
                  Section {item}
                </option>
              ))}
            </select>

            {(searchInput ||
              appliedSearch ||
              filterClass ||
              filterSection ||
              students.length > 0) && (
              <button
                type="button"
                onClick={clearFilters}
                disabled={isBusy}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Users size={16} />
            Loaded {students.length} student(s)
          </div>
        </div>

        {!hasMinimumFilter && !hasLoaded && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            Please select at least one filter: Search, Class, or Section before
            loading students.
          </div>
        )}

        {(appliedSearch || filterClass || filterSection) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Loaded filter:</span>

            {appliedSearch && (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                Search: {appliedSearch}
              </span>
            )}

            {filterClass && (
              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                Class: {filterClass}
              </span>
            )}

            {filterSection && (
              <span className="rounded-full bg-purple-50 px-3 py-1 font-medium text-purple-700">
                Section: {filterSection}
              </span>
            )}

            {students.length > 0 && !hasGeneratedQR && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                Students loaded — QR not generated
              </span>
            )}

            {hasGeneratedQR && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                QR generated
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <IdCard size={18} />
            Student QR Cards
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Load students first. Then click Generate QR Codes to create QR cards.
          </p>
        </div>

        {isBusy ? (
          <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
            <div>
              <Loader2
                size={44}
                className="mx-auto mb-4 animate-spin text-slate-900"
              />

              <p className="text-sm font-semibold text-slate-700">
                {loadingStudents
                  ? 'Loading students from selected filter...'
                  : 'Generating QR codes...'}
              </p>
            </div>
          </div>
        ) : !hasLoaded ? (
          <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
            <div>
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
                <ListFilter size={34} />
              </div>

              <p className="text-base font-bold text-slate-800">
                No students loaded yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Select Search, Class, or Section and click Load Students.
              </p>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
            <div>
              <div className="mb-3 text-5xl">🎓</div>

              <p className="text-base font-bold text-slate-800">
                No students found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Change the filter and load students again.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200">
              {displayStudents.map((student) => (
                <div
                  key={student._id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                      {qrImages[student._id] ? (
                        <img
                          src={qrImages[student._id]}
                          alt={`${student.name} QR Code`}
                          className="h-full w-full rounded-xl object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-slate-50 text-center text-sm text-slate-400">
                          <QrCode size={34} className="mb-2" />
                          QR not generated
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {student.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Student ID Card QR Information
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoPill
                          label="Student ID"
                          value={student.studentId}
                        />

                        <InfoPill label="Roll" value={student.rollNumber} />

                        <InfoPill
                          label="Class"
                          value={`${student.class}-${student.section}`}
                        />

                        <InfoPill label="Email" value={student.email} />

                        <InfoPill
                          label="Phone"
                          value={student.phone || 'N/A'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadSingleQR(student)}
                      disabled={!qrImages[student._id]}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                    >
                      <Download size={16} />
                      Download QR
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-slate-600">
                Showing{' '}
                <span className="font-bold text-slate-900">
                  {showingFrom}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-900">
                  {showingTo}
                </span>{' '}
                of{' '}
                <span className="font-bold text-slate-900">
                  {pagination.total}
                </span>{' '}
                students
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => changePage(1)}
                >
                  First
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => changePage(pagination.page - 1)}
                >
                  Prev
                </button>

                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
                  <span className="px-2 text-sm text-slate-500">Page</span>

                  <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">
                    {pagination.page}
                  </span>

                  <span className="px-2 text-sm text-slate-500">
                    of {pagination.totalPages}
                  </span>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => changePage(pagination.page + 1)}
                >
                  Next
                </button>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => changePage(pagination.totalPages)}
                >
                  Last
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="text-sm font-medium text-slate-500">
                  Per page
                </span>

                <select
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={pagination.limit}
                  onChange={(event) => changeLimit(Number(event.target.value))}
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}