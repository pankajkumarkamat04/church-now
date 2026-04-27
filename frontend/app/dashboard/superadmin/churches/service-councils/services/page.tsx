'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ChurchRecord, ServiceCouncil } from '../../types';

const btn =
  'inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50';

export default function SuperadminServiceCouncilServicesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mainChurch, setMainChurch] = useState<ChurchRecord | null>(null);
  const [rows, setRows] = useState<ServiceCouncil[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const mainChurchId = useMemo(() => mainChurch?._id || '', [mainChurch]);
  const selectedCouncilId = (searchParams.get('councilId') || '').trim();
  const selectedRows = useMemo(
    () => (selectedCouncilId ? rows.filter((r) => String(r._id) === selectedCouncilId) : rows),
    [rows, selectedCouncilId]
  );
  const visibleRows = selectedCouncilId && selectedRows.length === 0 ? rows : selectedRows;

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    const mains = await apiFetch<ChurchRecord[]>('/api/superadmin/main-churches', { token });
    const firstMain = mains[0] || null;
    setMainChurch(firstMain);
    if (!firstMain?._id) {
      setRows([]);
      return;
    }
    const serviceCouncils = await apiFetch<ServiceCouncil[]>(
      `/api/superadmin/main-churches/${firstMain._id}/service-councils`,
      { token }
    );
    setRows(serviceCouncils);
  }, [token]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'SUPERADMIN')) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'SUPERADMIN' && token) {
      load().catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load services'));
    }
  }, [user, token, load]);

  async function removeService(councilId: string, serviceId: string) {
    if (!token || !mainChurchId || !window.confirm('Delete this service?')) return;
    setErr(null);
    try {
      await apiFetch(`/api/superadmin/main-churches/${mainChurchId}/service-councils/${councilId}/services/${serviceId}`, {
        method: 'DELETE',
        token,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete service');
    }
  }

  if (!user || user.role !== 'SUPERADMIN') return null;

  return (
    <div className="w-full min-w-0 max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Manage Services</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {selectedCouncilId
              ? selectedRows.length === 0
                ? 'Selected service council was not found; showing all service councils.'
                : 'Manage services for the selected service council.'
              : 'Manage services and assign heads under each service council.'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Main church: {mainChurch?.name || 'Not created yet'}</p>
        </div>
        <Link href="/dashboard/superadmin/churches/service-councils" className={btn}>
          Back to service councils
        </Link>
      </div>

      {err ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}
      {!mainChurchId ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Create the main church first to manage services.
        </p>
      ) : (
        <div className="space-y-4">
          {visibleRows.map((row) => (
            <div key={row._id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-neutral-900">{row.name}</h2>
              <p className="mt-1 text-xs text-neutral-500">{row.description || '—'}</p>
              <div className="mt-3 space-y-2">
                {(row.services || []).map((service) => (
                  <div key={service._id} className="flex flex-wrap items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-2 py-2">
                    <span className="min-w-[160px] text-sm font-medium text-neutral-800">{service.name}</span>
                    <span className="min-w-[220px] text-xs text-neutral-600">
                      Head:{' '}
                      {typeof service.head === 'object'
                        ? service.head?.fullName || service.head?.email || service.head?._id || '—'
                        : String(service.head || '—')}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeService(row._id, service._id)}
                      className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Remove
                    </button>
                    <Link
                      href={`/dashboard/superadmin/churches/service-councils/services/${service._id}/edit?councilId=${row._id}`}
                      className={btn}
                    >
                      <Pencil className="mr-1 size-3.5" />
                      Edit
                    </Link>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link
                    href={`/dashboard/superadmin/churches/service-councils/services/create?councilId=${row._id}`}
                    className={btn}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add service
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {visibleRows.length === 0 ? (
            <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
              No service councils yet.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
