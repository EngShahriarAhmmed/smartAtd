'use client';

import {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
  type ReactNode,
  type KeyboardEvent,
} from 'react';

import {
  CheckCircle2,
  XCircle,
  Info,
  X,
  Pencil,
  Eye,
  Trash2,
  RotateCcw,
  Upload,
  Plus,
  UserRound,
  Mail,
  Phone,
  GraduationCap,
  Hash,
  IdCard,
  Layers,
} from 'lucide-react';

interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  class: string;
  section: string;
  rollNumber: string;
  phone?: string;
  deletedAt?: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  type: ToastType;
  message: string;
  details?: string;
}

const emptyForm = {
  name: '',
  email: '',
  studentId: '',
  class: '10',
  section: 'A',
  rollNumber: '',
  phone: '',
};

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

function ActionIconButton({
  label,
  onClick,
  children,
  className = '',
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {children}

      <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg group-hover:block">
        {label}
      </span>
    </button>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>

      <div className="break-words text-sm font-semibold text-slate-900">
        {value || 'N/A'}
      </div>
    </div>
  );
}

function StudentViewModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <Eye size={14} />
              Student Details
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {student.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              ID: {student.studentId}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
            aria-label="Close student details"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <DetailItem
            icon={<UserRound size={16} />}
            label="Full Name"
            value={student.name}
          />

          <DetailItem
            icon={<IdCard size={16} />}
            label="Student ID"
            value={student.studentId}
          />

          <DetailItem
            icon={<GraduationCap size={16} />}
            label="Class"
            value={`Class ${student.class}`}
          />

          <DetailItem
            icon={<Layers size={16} />}
            label="Section"
            value={`Section ${student.section}`}
          />

          <DetailItem
            icon={<Hash size={16} />}
            label="Roll Number"
            value={student.rollNumber}
          />

          <DetailItem
            icon={<Mail size={16} />}
            label="Email"
            value={student.email}
          />

          <DetailItem
            icon={<Phone size={16} />}
            label="Phone"
            value={student.phone}
          />
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);

  const classes = classOptions.length ? classOptions : ['6', '7', '8', '9', '10', '11', '12'];
  const sections = sectionOptions.length ? sectionOptions : ['A', 'B', 'C', 'D'];
  const pageSizeOptions = [10, 25, 50, 100];

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [toast]);


  useEffect(() => {
    async function loadMasterData() {
      try {
        const [classRes, sectionRes] = await Promise.all([
          fetch('/api/admin/classes', { cache: 'no-store' }),
          fetch('/api/admin/sections', { cache: 'no-store' }),
        ]);
        const classData = await classRes.json();
        const sectionData = await sectionRes.json();

        if (classRes.ok) {
          const names = (classData.items || [])
            .map((item: { name?: string }) => item.name)
            .filter((name: string | undefined): name is string => Boolean(name));
          setClassOptions(names);
        }

        if (sectionRes.ok) {
          const names = (sectionData.items || [])
            .map((item: { name?: string }) => item.name)
            .filter((name: string | undefined): name is string => Boolean(name));
          setSectionOptions(names);
        }
      } catch {
        setClassOptions([]);
        setSectionOptions([]);
      }
    }

    loadMasterData();
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, details?: string) => {
      setToast({ type, message, details });
    },
    []
  );

  const fetchStudents = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (appliedSearch) params.set('search', appliedSearch);
      if (filterClass) params.set('class', filterClass);
      params.set('deleted', showDeleted ? 'true' : 'false');

      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));

      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to load students');
        setStudents([]);
        return;
      }

      setStudents(data.students || []);

      if (data.pagination) {
        setPagination(data.pagination);
      }

      setSelectedIds([]);
    } catch {
      showToast('error', 'Unable to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [
    appliedSearch,
    filterClass,
    showDeleted,
    pagination.page,
    pagination.limit,
    showToast,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  function applySearch() {
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));

    setAppliedSearch(searchInput.trim());
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      applySearch();
    }
  }

  function clearSearch() {
    setSearchInput('');
    setAppliedSearch('');

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }

  function handleClassFilterChange(value: string) {
    setFilterClass(value);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }

  async function saveStudent(e: FormEvent) {
    e.preventDefault();

    setSaving(true);
    setToast(null);

    const url = editingId ? `/api/students/${editingId}` : '/api/students';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to save student');
        return;
      }

      showToast(
        'success',
        editingId ? 'Student updated successfully.' : 'Student added successfully.',
        data.student?.name ? `Name: ${data.student.name}` : undefined
      );

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchStudents();
    } catch {
      showToast('error', 'Unable to save student');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(student: Student) {
    setEditingId(student._id);

    setForm({
      name: student.name || '',
      email: student.email || '',
      studentId: student.studentId || '',
      class: student.class || '10',
      section: student.section || 'A',
      rollNumber: student.rollNumber || '',
      phone: student.phone || '',
    });

    setShowForm(true);
    setShowUpload(false);
    setViewStudent(null);
    setToast(null);
  }

  function viewStudentDetails(student: Student) {
    setViewStudent(student);
    setShowForm(false);
    setShowUpload(false);
    setToast(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function uploadStudents(e: FormEvent) {
    e.preventDefault();

    if (!uploadFile) {
      showToast('error', 'Please select an Excel or CSV file.');
      return;
    }

    setUploading(true);
    setToast(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/students/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to upload students');
        return;
      }

      showToast(
        'success',
        'Student upload completed.',
        `Inserted: ${data.insertedCount || 0} | Skipped: ${
          data.skippedCount || 0
        }${
          data.errors?.length
            ? ` | Issues: ${data.errors.slice(0, 3).join(' | ')}`
            : ''
        }`
      );

      setUploadFile(null);
      setShowUpload(false);
      fetchStudents();
    } catch {
      showToast('error', 'Unable to upload students');
    } finally {
      setUploading(false);
    }
  }

  async function deleteStudent(id: string, name: string) {
    const permanent = showDeleted;
    if (!confirm(permanent ? `Permanently delete ${name}? This cannot be undone.` : `Remove ${name}? It will move to deleted records.`)) return;

    try {
      const res = await fetch(`/api/students/${id}${permanent ? '?permanent=true' : ''}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to remove student');
        return;
      }

      showToast('success', data.message || (permanent ? 'Student permanently deleted.' : 'Student moved to deleted records.'), name);
      fetchStudents();
    } catch {
      showToast('error', 'Unable to remove student');
    }
  }

  async function restoreStudent(id: string, name: string) {
    if (!confirm(`Restore ${name}?`)) return;

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to restore student');
        return;
      }

      showToast('success', data.message || 'Student restored successfully.', name);
      fetchStudents();
    } catch {
      showToast('error', 'Unable to restore student');
    }
  }

  async function bulkDeleteStudents() {
    if (!selectedIds.length) {
      showToast('info', 'Please select at least one student.');
      return;
    }

    if (!confirm(`Remove ${selectedIds.length} selected student(s)?`)) return;

    try {
      const res = await fetch('/api/students/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to remove selected students');
        return;
      }

      showToast(
        'success',
        'Selected students removed successfully.',
        `Removed: ${data.removedCount || selectedIds.length}`
      );

      setSelectedIds([]);
      fetchStudents();
    } catch {
      showToast('error', 'Unable to remove selected students');
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const currentPageIds = students.map((student) => student._id);
    const allSelected = currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
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
    }));
  }

  const allCurrentPageSelected =
    students.length > 0 &&
    students.every((student) => selectedIds.includes(student._id));

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

      {viewStudent && (
        <StudentViewModal
          student={viewStudent}
          onClose={() => setViewStudent(null)}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold text-slate-900">
            Students
          </h1>

          <p className="m-0 text-sm text-slate-500">
            {pagination.total} {showDeleted ? 'deleted' : 'active'} students
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowDeleted((value) => !value);
              setShowForm(false);
              setShowUpload(false);
              setEditingId(null);
              setSelectedIds([]);
              setViewStudent(null);
              setToast(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${showDeleted ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Trash2 size={16} />
            {showDeleted ? 'Show Active Data' : 'Show Deleted Data'}
          </button>

          {!showDeleted && (
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={bulkDeleteStudents}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              <Trash2 size={16} />
              Remove Selected {selectedIds.length ? `(${selectedIds.length})` : ''}
            </button>
          )}

          {!showDeleted && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowUpload(!showUpload);
                  setShowForm(false);
                  setEditingId(null);
                  setViewStudent(null);
                  setToast(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md"
              >
                <Upload size={16} />
                {showUpload ? 'Hide Upload' : 'Upload Excel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (showForm && !editingId) {
                    setShowForm(false);
                    setForm(emptyForm);
                    setToast(null);
                    return;
                  }
                  setShowForm(true);
                  setShowUpload(false);
                  setEditingId(null);
                  setViewStudent(null);
                  setForm(emptyForm);
                  setToast(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
              >
                {showForm && !editingId ? <X size={16} /> : <Plus size={16} />}
                {showForm && !editingId ? 'Hide Form' : 'Add Student'}
              </button>
            </>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="card mb-6 bg-slate-50 p-6">
          <h2 className="mb-2 text-base font-bold text-slate-900">
            Upload Students from Excel / CSV
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            Required columns: Name, Email, Student ID, Class, Section, Roll Number.
            Optional column: Phone.
          </p>

          <form onSubmit={uploadStudents}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input max-w-[360px]"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />

              <button
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={uploading}
              >
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Upload Students'}
              </button>

              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setUploadFile(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="card mb-6 bg-slate-50 p-6">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            {editingId ? 'Edit Student' : 'Add New Student'}
          </h2>

          <form onSubmit={saveStudent}>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name *
                </label>

                <input
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahim Uddin"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Email *
                </label>

                <input
                  className="input"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="student@email.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Student ID *
                </label>

                <input
                  className="input"
                  required
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                  placeholder="e.g. STU009"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Class *
                </label>

                <select
                  className="input"
                  value={form.class}
                  onChange={(e) => setForm({ ...form, class: e.target.value })}
                >
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Section *
                </label>

                <select
                  className="input"
                  value={form.section}
                  onChange={(e) =>
                    setForm({ ...form, section: e.target.value })
                  }
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Roll Number *
                </label>

                <input
                  className="input"
                  required
                  value={form.rollNumber}
                  onChange={(e) =>
                    setForm({ ...form, rollNumber: e.target.value })
                  }
                  placeholder="e.g. 01"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Phone
                </label>

                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : editingId ? 'Update Student' : 'Add Student'}
              </button>

              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                type="button"
                onClick={cancelForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <input
                className="input w-full pr-24"
                placeholder="Search name, ID, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />

              <button
                type="button"
                onClick={applySearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Enter
              </button>
            </div>

            {(searchInput || appliedSearch) && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Clear
              </button>
            )}

            <select
              className="input w-full sm:max-w-[170px]"
              value={filterClass}
              onChange={(e) => handleClassFilterChange(e.target.value)}
            >
              <option value="">All Classes</option>

              {classes.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(appliedSearch || filterClass) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Active filter:</span>

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
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="mb-2 text-4xl">👥</div>
            <p>{showDeleted ? 'No deleted students found.' : 'No students found. Add your first student!'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {!showDeleted && (
                      <th>
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th>Student</th>
                    <th>ID</th>
                    <th>Class</th>
                    <th>Roll</th>
                    <th>Email</th>
                    {showDeleted && <th>Deleted At</th>}
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      {!showDeleted && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(s._id)}
                            onChange={() => toggleSelect(s._id)}
                          />
                        </td>
                      )}

                      <td className="font-semibold text-slate-900">
                        {s.name}
                      </td>

                      <td>
                        <span className="badge badge-info">
                          {s.studentId}
                        </span>
                      </td>

                      <td>
                        {s.class}-{s.section}
                      </td>

                      <td>{s.rollNumber}</td>

                      <td className="text-sm text-slate-500">
                        {s.email}
                      </td>

                      {showDeleted && (
                        <td className="text-sm text-slate-500">
                          {s.deletedAt ? new Date(s.deletedAt).toLocaleString() : '—'}
                        </td>
                      )}

                      <td>
                        <div className="flex flex-wrap gap-2">
                          <ActionIconButton
                            label="View student"
                            onClick={() => viewStudentDetails(s)}
                            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <Eye size={16} />
                          </ActionIconButton>

                          {showDeleted ? (
                            <>
                              <ActionIconButton
                                label="Restore student"
                                onClick={() => restoreStudent(s._id, s.name)}
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                <RotateCcw size={16} />
                              </ActionIconButton>

                              <ActionIconButton
                                label="Permanent delete"
                                onClick={() => deleteStudent(s._id, s.name)}
                                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              >
                                <Trash2 size={16} />
                              </ActionIconButton>
                            </>
                          ) : (
                            <>
                              <ActionIconButton
                                label="Edit student"
                                onClick={() => startEdit(s)}
                                className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                <Pencil size={16} />
                              </ActionIconButton>

                              <ActionIconButton
                                label="Remove student"
                                onClick={() => deleteStudent(s._id, s.name)}
                                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              >
                                <Trash2 size={16} />
                              </ActionIconButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  onChange={(e) => changeLimit(Number(e.target.value))}
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