'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Html5Qrcode } from 'html5-qrcode';
import PaginationBar, { type PaginationState } from '@/components/PaginationBar';

import {
  CheckCircle2,
  XCircle,
  Info,
  X,
  RefreshCw,
  Loader2,
  Users,
  Clock,
  ClipboardList,
} from 'lucide-react';

interface AttendanceRecord {
  _id: string;
  status: 'present' | 'absent' | 'late';
  markedAt: string;
  date: string;
  subject?: string;
  period?: string;
  studentId: {
    _id: string;
    name: string;
    studentId: string;
    class: string;
    section: string;
  };
}

interface ParsedQrPayload {
  qrToken?: string;
  studentId?: string;
  name?: string;
  class?: string;
  section?: string;
  year?: string;
  session?: string;
  department?: string;
  rollNumber?: string;
  email?: string;
}

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  type: ToastType;
  message: string;
  details?: string;
}

interface MasterOption {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  periodName?: string;
  startTime?: string;
  endTime?: string;
}

interface MasterOptions {
  classes: MasterOption[];
  sections: MasterOption[];
  subjects: MasterOption[];
  periods: MasterOption[];
}

const emptyMasterOptions: MasterOptions = {
  classes: [],
  sections: [],
  subjects: [],
  periods: [],
};

const scannerRegionId = 'qr-reader';
const emptyPagination: PaginationState = { page: 1, limit: 10, total: 0, totalPages: 1 };

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

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: 'green' | 'yellow' | 'red' | 'purple';
  icon: React.ReactNode;
}) {
  const styles = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    yellow: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    purple: 'border-violet-200 bg-violet-50 text-violet-700',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles[tone]}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold opacity-80">{label}</span>
        <span>{icon}</span>
      </div>

      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>(emptyPagination);
  const [options, setOptions] = useState<MasterOptions>(emptyMasterOptions);

  const [loading, setLoading] = useState(true);

  const [enabled, setEnabled] = useState(false);
  const [scannerOpening, setScannerOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  const [toast, setToast] = useState<ToastState | null>(null);

  const [lastScan, setLastScan] = useState<{
    student?: string;
    studentId?: string;
    time?: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockedRef = useRef(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/master-options', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load options');
        setOptions({
          classes: data.classes || [],
          sections: data.sections || [],
          subjects: data.subjects || [],
          periods: data.periods || [],
        });
      } catch {
        setOptions(emptyMasterOptions);
      }
    }

    void loadOptions();
  }, []);

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

  const fetchRecords = useCallback(async (page = pagination.page, limit = pagination.limit) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ date, page: String(page), limit: String(limit) });

      if (filterClass) params.set('class', filterClass);
      if (filterSection) params.set('section', filterSection);
      if (filterSubject) params.set('subject', filterSubject);
      if (filterPeriod) params.set('period', filterPeriod);

      const res = await fetch(`/api/attendance/records?${params}`);
      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error || 'Failed to load attendance records.');
        setRecords([]);
        setTotalStudents(0);
        return;
      }

      setRecords(data.records || []);
      setTotalStudents(data.totalStudents || 0);
      setPagination(data.pagination || { page, limit, total: data.records?.length || 0, totalPages: 1 });
    } catch {
      showToast('error', 'Unable to load attendance records.');
      setRecords([]);
      setTotalStudents(0);
    } finally {
      setLoading(false);
    }
  }, [date, filterClass, filterSection, filterSubject, filterPeriod, pagination.limit, pagination.page, showToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!enabled) {
      void stopScanner();
      return;
    }

    void startScanner();

    return () => {
      void stopScanner();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  function waitForScannerElement(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const check = () => {
        const element = document.getElementById(scannerRegionId);

        if (element) {
          resolve();
          return;
        }

        attempts += 1;

        if (attempts > 30) {
          reject(new Error('Scanner element not found'));
          return;
        }

        window.setTimeout(check, 50);
      };

      check();
    });
  }

  function parseQrPayload(decodedText: string): ParsedQrPayload {
    try {
      const parsed = JSON.parse(decodedText);

      return {
        qrToken: parsed.qrToken || parsed.token,
        studentId: parsed.studentId || parsed.Roll || parsed.roll,
        name: parsed.name || parsed.Name,
        class: parsed.class || parsed.Class,
        section: parsed.section || parsed.Section,
        year: parsed.year || parsed.Year,
        session: parsed.session || parsed.Session,
        department: parsed.department || parsed.Department,
        rollNumber: parsed.rollNumber || parsed.Roll || parsed.roll,
        email: parsed.email || parsed.Email,
      };
    } catch {
      const parts = decodedText.split('|').map((item) => item.trim());

      // Supports: Name|Roll|Year|Session|Department
      if (parts.length >= 5) {
        return {
          name: parts[0],
          studentId: parts[1],
          rollNumber: parts[1],
          year: parts[2],
          session: parts[3],
          department: parts[4],
        };
      }

      return {
        qrToken: decodedText,
      };
    }
  }

  async function startScanner() {
    setScannerOpening(true);
    setResult(null);

    try {
      await waitForScannerElement();

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerRegionId);
      }

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras.length) {
        setResult({
          ok: false,
          text: 'No camera found. Please connect or enable a camera device.',
        });

        showToast(
          'error',
          'No camera found.',
          'Please connect or enable a camera device.'
        );

        setEnabled(false);
        return;
      }

      const selectedCamera =
        cameras.find((camera) =>
          camera.label.toLowerCase().includes('back')
        ) ||
        cameras.find((camera) =>
          camera.label.toLowerCase().includes('environment')
        ) ||
        cameras[cameras.length - 1] ||
        cameras[0];

      await scannerRef.current.start(
        selectedCamera.id,
        {
          fps: 10,
          qrbox: {
            width: 260,
            height: 260,
          },
          aspectRatio: 1,
        },
        async (decodedText) => {
          await submitScan(decodedText);
        },
        () => {
          // Ignore frame-level scan errors.
        }
      );


      setResult({
        ok: true,
        text: 'Camera started. Ready to scan student QR code.',
      });

      showToast(
        'info',
        'Camera scanner started.',
        'Point the camera at a student QR code.'
      );
    } catch (error) {
      console.error(error);

      setResult({
        ok: false,
        text: 'Unable to open camera. Please allow camera permission and use HTTPS or localhost.',
      });

      showToast(
        'error',
        'Unable to open camera.',
        'Please allow camera permission and use HTTPS or localhost.'
      );

      setEnabled(false);
    } finally {
      setScannerOpening(false);
    }
  }

  async function stopScanner() {
    scanLockedRef.current = false;
    setBusy(false);
    setScannerOpening(false);

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }

        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (error) {
      console.error(error);
      scannerRef.current = null;
    } finally {
    }
  }

  function getScannerDeviceId() {
    const key = 'smart_atd_scanner_device_id';
    let id = window.localStorage.getItem(key);

    if (!id) {
      id = window.crypto?.randomUUID?.() || `scanner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(key, id);
    }

    return id;
  }

  function getScannerDeviceName() {
    const platform = window.navigator.platform || 'Unknown device';
    const userAgent = window.navigator.userAgent || 'Unknown browser';
    return `${platform} - ${userAgent.slice(0, 90)}`;
  }

  async function submitScan(decodedText: string) {
    if (scanLockedRef.current) return;

    scanLockedRef.current = true;
    setBusy(true);
    setResult(null);

    const parsed = parseQrPayload(decodedText);
    const deviceId = getScannerDeviceId();
    const deviceName = getScannerDeviceName();

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-device-name': deviceName,
        },
        body: JSON.stringify({
          deviceId,
          deviceName,
          qrData: decodedText,
          qrPayload: decodedText,
          qrToken: parsed.qrToken || decodedText,
          studentId: parsed.studentId,
          date,
          class: filterClass || parsed.class,
          section: filterSection || parsed.section,
          subject: filterSubject,
          period: filterPeriod,
          status: 'present',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const text =
          data.error ||
          `Scan failed${parsed.name ? ` for ${parsed.name}` : ''}. Ready for next QR.`;

        setResult({
          ok: false,
          text,
        });

        showToast('error', 'Attendance scan failed.', text);
      } else {
        const studentName =
          data.student?.name ||
          data.record?.studentId?.name ||
          parsed.name ||
          'Student';

        const scannedStudentId =
          data.student?.studentId ||
          data.record?.studentId?.studentId ||
          parsed.studentId ||
          '';

        const scanTime = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setLastScan({
          student: studentName,
          studentId: scannedStudentId,
          time: scanTime,
        });

        setResult({
          ok: true,
          text: `Attendance marked successfully: ${studentName}${
            scannedStudentId ? ` | ID: ${scannedStudentId}` : ''
          }`,
        });

        showToast(
          'success',
          'Attendance marked successfully.',
          `${studentName}${scannedStudentId ? ` | ID: ${scannedStudentId}` : ''}`
        );

        fetchRecords();
      }
    } catch {
      setResult({
        ok: false,
        text: 'Unable to submit attendance scan. Ready for next QR.',
      });

      showToast('error', 'Unable to submit attendance scan.');
    } finally {
      window.setTimeout(() => {
        scanLockedRef.current = false;
        setBusy(false);
      }, 1200);
    }
  }

  const present = records.filter((record) => record.status === 'present').length;
  const late = records.filter((record) => record.status === 'late').length;
  const absent = Math.max(totalStudents - present - late, 0);

  const rate =
    totalStudents > 0
      ? Math.round(((present + late) / totalStudents) * 100)
      : 0;

  return (
    <div>
      {toast && (
        <ToastMessage toast={toast} onClose={() => setToast(null)} />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ClipboardList size={26} />
            Attendance Records
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View daily attendance and scan student QR codes using camera.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchRecords()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      <div className="card mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-[190px]">
              

              <input
                className="input w-full pl-9"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <select
              className="input w-full sm:max-w-[170px]"
              value={filterClass}
              onChange={(event) => setFilterClass(event.target.value)}
            >
              <option value="">All Classes</option>

              {options.classes.map((item) => (
                <option key={item._id || item.id || item.name} value={item.name || ''}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              className="input w-full sm:max-w-[170px]"
              value={filterSection}
              onChange={(event) => setFilterSection(event.target.value)}
            >
              <option value="">All Sections</option>

              {options.sections.map((item) => (
                <option key={item._id || item.id || item.name} value={item.name || ''}>
                  {item.name}
                </option>
              ))}
            </select>


            <select
              className="input w-full sm:max-w-[190px]"
              value={filterSubject}
              onChange={(event) => setFilterSubject(event.target.value)}
            >
              <option value="">All Subjects</option>
              {options.subjects.map((item) => (
                <option key={item._id || item.id || item.code || item.name} value={item.name || ''}>
                  {item.name}{item.code ? ` (${item.code})` : ''}
                </option>
              ))}
            </select>

            <select
              className="input w-full sm:max-w-[190px]"
              value={filterPeriod}
              onChange={(event) => setFilterPeriod(event.target.value)}
            >
              <option value="">All Periods</option>
              {options.periods.map((item) => (
                <option key={item._id || item.id || item.periodName} value={item.periodName || ''}>
                  {item.periodName}{item.startTime && item.endTime ? ` (${item.startTime}-${item.endTime})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Users size={16} />
            Total Students: {totalStudents}
          </div>
        </div>
      </div>

      <section className="card mb-6 p-5">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Scan Student QR
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              QR must contain Name, Roll, Year, Session and Department.
            </p>
          </div>

          <button
            className={
              enabled
                ? 'rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100'
                : 'rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
            }
            type="button"
            onClick={() => setEnabled((value) => !value)}
            disabled={scannerOpening}
          >
            {scannerOpening
              ? 'Opening Scanner...'
              : enabled
                ? 'Stop Scanner'
                : 'Start Scanner'}
          </button>
        </div>

        {busy ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            Processing scan...
          </div>
        ) : null}

        {result ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
              result.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {result.text}
          </div>
        ) : null}

        {enabled ? (
          <div className="scanner-box mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-black p-2 shadow-sm">
            <div
              id="qr-reader"
              className="min-h-[320px] overflow-hidden rounded-2xl"
            />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            Camera is off.
          </div>
        )}

        {enabled && (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-base font-bold text-slate-900">
              Scan Status
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Selected Date
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {date}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Class Filter
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {filterClass || 'All Classes'}{' '}
                  {filterSection ? `- ${filterSection}` : ''}
                  {filterSubject ? ` | ${filterSubject}` : ''}
                  {filterPeriod ? ` | ${filterPeriod}` : ''}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Last Successful Scan
                </div>

                {lastScan ? (
                  <div className="mt-2 text-sm text-slate-700">
                    <p className="font-bold text-slate-900">
                      {lastScan.student}
                    </p>

                    <p>ID: {lastScan.studentId || 'N/A'}</p>
                    <p>Time: {lastScan.time}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No QR scanned yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Present"
          value={present}
          tone="green"
          icon={<CheckCircle2 size={22} />}
        />

        <StatCard
          label="Late"
          value={late}
          tone="yellow"
          icon={<Clock size={22} />}
        />

        <StatCard
          label="Absent"
          value={absent}
          tone="red"
          icon={<XCircle size={22} />}
        />

        <StatCard
          label="Rate"
          value={`${rate}%`}
          tone="purple"
          icon={<Info size={22} />}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Daily Attendance List
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing records for {date}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center p-8 text-center">
            <div>
              <Loader2
                size={44}
                className="mx-auto mb-4 animate-spin text-slate-900"
              />

              <p className="text-sm font-semibold text-slate-700">
                Loading attendance records...
              </p>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center p-8 text-center">
            <div>
              <div className="mb-3 text-5xl">📋</div>

              <p className="text-base font-bold text-slate-800">
                No attendance records found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Start scanner and scan student QR codes.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Marked At</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record._id}>
                    <td className="font-semibold text-slate-900">
                      {record.studentId?.name}
                    </td>

                    <td>
                      <span className="badge badge-info">
                        {record.studentId?.studentId}
                      </span>
                    </td>

                    <td>
                      {record.studentId?.class}-{record.studentId?.section}
                    </td>

                    <td>{record.subject || 'General'}</td>

                    <td>{record.period || 'General'}</td>

                    <td>
                      <span
                        className={`badge ${
                          record.status === 'present'
                            ? 'badge-success'
                            : record.status === 'late'
                              ? 'badge-warning'
                              : 'badge-danger'
                        }`}
                      >
                        {record.status === 'present'
                          ? '✅'
                          : record.status === 'late'
                            ? '⏰'
                            : '❌'}{' '}
                        {record.status}
                      </span>
                    </td>

                    <td className="text-sm text-slate-500">
                      {new Date(record.markedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && (
          <PaginationBar
            pagination={pagination}
            onPageChange={(nextPage) => fetchRecords(nextPage, pagination.limit)}
            onLimitChange={(nextLimit) => fetchRecords(1, nextLimit)}
            label="attendance records"
          />
        )}
      </div>
    </div>
  );
}