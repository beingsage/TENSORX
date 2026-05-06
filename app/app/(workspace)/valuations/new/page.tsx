'use client';

import { Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { AppShell } from '@/components/workspace/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSessionUser } from '@/hooks/use-session-user';
import { IntakeMapPreview } from './_components/IntakeMapPreview';
import type {
  IntakeDocumentInsight,
  IntakeReconstructionJob,
  ValuationRequest,
} from '@/lib/db/schema';
import type { SpatialSnapshot } from '@/lib/providers/openData';

type Project = { projectId: string; name: string };

type UploadedAsset = {
  assetId: string;
  displayName: string;
  secureUrl: string;
  status: string;
  projectId: string;
};

type ExtractedDocument = {
  asset: UploadedAsset;
  insight?: IntakeDocumentInsight;
};

type PreviewPayload = {
  location: {
    address: string;
    displayName?: string;
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
    pincode?: string;
    micromarket?: string;
    source?: string;
  };
  suggestedPatch?: Partial<ValuationRequest>;
  spatialContext?: SpatialSnapshot | null;
};

type FormState = {
  projectId: string;
  propertyId: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  propertyType: string;
  propertyConfiguration: string;
  builtupArea: string;
  landArea: string;
  plotArea: string;
  bedroomCount: string;
  bathroomCount: string;
  yearBuilt: string;
  renovationYear: string;
  ageInYears: string;
  floorNumber: string;
  totalFloors: string;
  balconyCount: string;
  facing: string;
  condition: 'new' | 'good' | 'needs-renovation' | 'dilapidated';
  constructionQuality: 'premium' | 'standard' | 'basic';
  isFreehold: 'true' | 'false';
  loanAmount: string;
  rentalIncome: string;
  occupancyStatus: 'occupied' | 'vacant' | 'under-construction';
  legalStatus: 'clear' | 'pending-clearance' | 'disputed';
  mortgageStatus: 'clear' | 'mortgaged' | 'multiple-mortgages';
  parking: string;
  flooring: string;
  furnishing: string;
  ownerEmail: string;
  ownerPhone: string;
  description: string;
};

const AUTOSAVE_KEY = 'valuation-intake-draft';

const FORM_FIELD_LABELS: Record<keyof FormState, string> = {
  projectId: 'Project ID',
  propertyId: 'Property ID',
  address: 'Address',
  pincode: 'Pincode',
  city: 'City',
  state: 'State',
  latitude: 'Latitude',
  longitude: 'Longitude',
  propertyType: 'Property type',
  propertyConfiguration: 'Configuration',
  builtupArea: 'Built-up area',
  landArea: 'Land area',
  plotArea: 'Plot area',
  bedroomCount: 'Bedrooms',
  bathroomCount: 'Bathrooms',
  yearBuilt: 'Year built',
  renovationYear: 'Renovation year',
  ageInYears: 'Age in years',
  floorNumber: 'Floor number',
  totalFloors: 'Total floors',
  balconyCount: 'Balconies',
  facing: 'Facing',
  condition: 'Condition',
  constructionQuality: 'Construction quality',
  isFreehold: 'Ownership',
  loanAmount: 'Loan amount',
  rentalIncome: 'Monthly rental income',
  occupancyStatus: 'Occupancy',
  legalStatus: 'Legal status',
  mortgageStatus: 'Mortgage status',
  parking: 'Parking spots',
  flooring: 'Flooring',
  furnishing: 'Furnishing',
  ownerEmail: 'Owner email',
  ownerPhone: 'Owner phone',
  description: 'Inspection notes',
};

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function capitalizeWords(value?: string) {
  if (!value) return '';
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mergeString(current: string, incoming: unknown, force = false) {
  if (incoming === undefined || incoming === null || incoming === '') {
    return current;
  }
  const next = String(incoming);
  return force || !current ? next : current;
}

function mergeNumericString(current: string, incoming: unknown, force = false) {
  if (incoming === undefined || incoming === null || incoming === '') {
    return current;
  }
  const next = String(incoming);
  return force || !current ? next : current;
}

function deriveAgeInYears(yearBuilt: string, explicitAge: string) {
  const typedAge = parseNumber(explicitAge);
  if (typedAge !== undefined) {
    return typedAge;
  }

  const builtYear = parseNumber(yearBuilt);
  if (builtYear === undefined) {
    return 0;
  }

  return Math.max(0, new Date().getFullYear() - builtYear);
}

function summarizeUploadError(payload: any, fallback: string) {
  return payload?.error?.message || payload?.message || fallback;
}

function toUniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function AutosaveToast({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-3 border-l-2 border-l-[var(--primary)] bg-[var(--surface-container-highest)] px-3 py-2 font-[family-name:var(--font-data)] text-xs text-[var(--on-surface)] shadow-lg transition-all duration-200 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <span>Draft restored from autosave.</span>
      <button
        type="button"
        onClick={onDismiss}
        className="font-[family-name:var(--font-data)] text-xs text-[var(--primary)]"
      >
        Dismiss
      </button>
    </div>
  );
}

function SystemHealthIndicator() {
  const [status, setStatus] = useState<'down' | 'green' | 'yellow' | 'red'>('down');

  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;

    async function pollHealth() {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch('/api/health', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (response.status === 404) {
          if (mounted) {
            setStatus('down');
          }
          return;
        }

        const payload = await response.json().catch(() => null);

        if (!mounted) return;

        if (response.ok && payload?.status === 'ok') {
          setStatus('green');
        } else if (response.ok && payload?.status === 'degraded') {
          setStatus('yellow');
        } else if (response.ok && payload?.status === 'partial') {
          setStatus('red');
        } else {
          setStatus('red');
        }
      } catch (healthError) {
        if (healthError instanceof DOMException && healthError.name === 'AbortError') {
          return;
        }
        if (mounted) {
          setStatus('down');
        }
      }
    }

    void pollHealth();
    const intervalId = window.setInterval(() => {
      void pollHealth();
    }, 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      controller?.abort();
    };
  }, []);

  const tooltip =
    status === 'green'
      ? 'All systems operational'
      : status === 'yellow'
        ? 'System under load — expect latency'
        : status === 'red'
          ? 'Some pipelines degraded'
          : '';

  const dotClass =
    status === 'green'
      ? 'h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)] animate-pulse'
      : status === 'yellow'
        ? 'h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.5)]'
        : status === 'red'
          ? 'h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_2px_rgba(244,63,94,0.5)]'
          : '';

  return (
    <div className="relative group flex items-center gap-2">
      {status === 'down' ? (
        <span className="font-mono text-xs text-[var(--on-surface-variant)]">—</span>
      ) : (
        <>
          <div className={dotClass} />
          <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-container-highest)] px-2 py-1 text-[10px] font-mono text-[var(--on-surface)] opacity-0 transition-opacity group-hover:opacity-100">
            {tooltip}
          </div>
        </>
      )}
    </div>
  );
}

function NewValuationPageInner() {
  const { user, loading } = useSessionUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveSuppressedRef = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [previewDisplayName, setPreviewDisplayName] = useState('');
  const [spatialContext, setSpatialContext] = useState<SpatialSnapshot | null>(null);
  const [uploadingKind, setUploadingKind] = useState<null | 'exterior' | 'layout' | 'legal'>(null);
  const [error, setError] = useState<string | null>(null);
  const [exteriorAssets, setExteriorAssets] = useState<UploadedAsset[]>([]);
  const [layoutAsset, setLayoutAsset] = useState<UploadedAsset | null>(null);
  const [layoutReconstruction, setLayoutReconstruction] = useState<IntakeReconstructionJob | null>(null);
  const [legalDocuments, setLegalDocuments] = useState<ExtractedDocument[]>([]);
  const [nerfJob, setNerfJob] = useState<IntakeReconstructionJob | null>(null);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [autosaveToastMounted, setAutosaveToastMounted] = useState(false);
  const [autosaveToastVisible, setAutosaveToastVisible] = useState(false);
  const [detectedExteriorFiles, setDetectedExteriorFiles] = useState<Array<{ name: string; path: string; size: number; modified: string }>>([]);
  const [detectingExterior, setDetectingExterior] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    projectId: '',
    propertyId: searchParams.get('propertyId') || '',
    address: '',
    pincode: '',
    city: '',
    state: '',
    latitude: '',
    longitude: '',
    propertyType: '2BHK',
    propertyConfiguration: 'Residential apartment',
    builtupArea: '1200',
    landArea: '',
    plotArea: '',
    bedroomCount: '2',
    bathroomCount: '2',
    yearBuilt: '',
    renovationYear: '',
    ageInYears: '',
    floorNumber: '',
    totalFloors: '',
    balconyCount: '',
    facing: '',
    condition: 'good',
    constructionQuality: 'standard',
    isFreehold: 'true',
    loanAmount: '7500000',
    rentalIncome: '',
    occupancyStatus: 'occupied',
    legalStatus: 'clear',
    mortgageStatus: 'clear',
    parking: '',
    flooring: '',
    furnishing: '',
    ownerEmail: '',
    ownerPhone: '',
    description: '',
  });

  const deferredAddress = useDeferredValue(formData.address);
  const deferredPincode = useDeferredValue(formData.pincode);
  const deferredLatitude = useDeferredValue(formData.latitude);
  const deferredLongitude = useDeferredValue(formData.longitude);
  const printDate = useMemo(
    () =>
      new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    []
  );
  const printFormRows = useMemo(
    () =>
      (Object.entries(formData) as Array<[keyof FormState, string]>)
        .filter(([, value]) => value.trim())
        .map(([key, value]) => ({
          label: FORM_FIELD_LABELS[key],
          value,
        })),
    [formData]
  );

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(AUTOSAVE_KEY);

    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft) as Partial<FormState>;

        if (parsedDraft && typeof parsedDraft === 'object') {
          setFormData((current) => {
            const next = { ...current } as Record<keyof FormState, string>;

            (Object.keys(FORM_FIELD_LABELS) as Array<keyof FormState>).forEach((key) => {
              const value = parsedDraft[key];
              if (typeof value === 'string') {
                next[key] = value;
              }
            });

            return next as FormState;
          });
          setAutosaveToastMounted(true);
          window.setTimeout(() => setAutosaveToastVisible(true), 0);
        }
      } catch {
        window.localStorage.removeItem(AUTOSAVE_KEY);
      }
    }

    setAutosaveReady(true);
  }, []);

  useEffect(() => {
    if (!autosaveReady || autosaveSuppressedRef.current) return;

    autosaveTimerRef.current = window.setTimeout(() => {
      if (!autosaveSuppressedRef.current) {
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
      }
      autosaveTimerRef.current = null;
    }, 1200);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [autosaveReady, formData]);

  useEffect(() => {
    if (!user) return;

    fetch('/api/projects', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        const loadedProjects = payload?.data?.projects || [];
        setProjects(loadedProjects);
        setFormData((current) => ({
          ...current,
          projectId:
            current.projectId ||
            searchParams.get('projectId') ||
            loadedProjects[0]?.projectId ||
            '',
        }));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load projects.');
      });
  }, [searchParams, user]);

  async function loadPreview(includeSpatial = false) {
    const latitude = parseNumber(formData.latitude);
    const longitude = parseNumber(formData.longitude);
    const hasCoordinates = latitude !== undefined && longitude !== undefined;
    const hasAddress = Boolean(formData.address.trim() && formData.pincode.trim());

    if (!hasCoordinates && !hasAddress) {
      return;
    }

    setPreviewStatus('loading');
    setPreviewMessage(includeSpatial ? 'Loading parcel context…' : 'Resolving location…');

    try {
      const response = await fetch('/api/intake/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: formData.address,
          pincode: formData.pincode,
          latitude,
          longitude,
          includeSpatial,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(summarizeUploadError(payload, 'Preview lookup failed.'));
      }

      const preview = payload.data as PreviewPayload;
      setPreviewStatus('ready');
      setPreviewMessage(
        includeSpatial
          ? 'Location, reverse geocode, and parcel surroundings loaded.'
          : 'Location resolved and form fields autofilled.'
      );
      setPreviewDisplayName(preview.location.displayName || preview.location.address || '');
      setSpatialContext(preview.spatialContext || null);

      setFormData((current) => ({
        ...current,
        address: current.address || preview.location.address || '',
        pincode: mergeString(current.pincode, preview.location.pincode, !current.pincode),
        city: mergeString(current.city, capitalizeWords(preview.location.city), !current.city),
        state: mergeString(current.state, preview.location.state, !current.state),
        latitude: mergeNumericString(current.latitude, preview.location.latitude, !current.latitude),
        longitude: mergeNumericString(current.longitude, preview.location.longitude, !current.longitude),
      }));
    } catch (previewError) {
      setPreviewStatus('error');
      setPreviewMessage(
        previewError instanceof Error ? previewError.message : 'Failed to resolve location.'
      );
    }
  }

  useEffect(() => {
    if (!user) return;
    const latitude = parseNumber(deferredLatitude);
    const longitude = parseNumber(deferredLongitude);
    const hasCoordinates = latitude !== undefined && longitude !== undefined;
    const hasAddress = Boolean(deferredAddress.trim() && deferredPincode.trim());

    if (!hasCoordinates && !hasAddress) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadPreview(false);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [deferredAddress, deferredLatitude, deferredLongitude, deferredPincode, user]);

  useEffect(() => {
    if (!nerfJob?.jobId || !['queued', 'running'].includes(nerfJob.status)) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/intake/nerfstudio?jobId=${encodeURIComponent(nerfJob.jobId!)}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.success) {
        setNerfJob(payload.data.job);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [nerfJob?.jobId, nerfJob?.status]);

  function patchFormFromSuggestion(suggestion: Partial<ValuationRequest>, force = false) {
    setFormData((current) => ({
      ...current,
      address: mergeString(current.address, suggestion.address, force),
      pincode: mergeString(current.pincode, suggestion.pincode, force),
      city: mergeString(current.city, suggestion.city ? capitalizeWords(String(suggestion.city)) : undefined, force),
      state: mergeString(current.state, suggestion.state, force),
      latitude: mergeNumericString(current.latitude, suggestion.latitude, force),
      longitude: mergeNumericString(current.longitude, suggestion.longitude, force),
      propertyType: mergeString(current.propertyType, suggestion.propertyType, force),
      builtupArea: mergeNumericString(current.builtupArea, suggestion.builtupArea, force),
      landArea: mergeNumericString(current.landArea, suggestion.landArea, force),
      plotArea: mergeNumericString(current.plotArea, suggestion.plotArea, force),
      bedroomCount: mergeNumericString(current.bedroomCount, suggestion.bedroomCount, force),
      bathroomCount: mergeNumericString(current.bathroomCount, suggestion.bathroomCount, force),
      yearBuilt: mergeNumericString(current.yearBuilt, suggestion.yearBuilt, force),
      renovationYear: mergeNumericString(current.renovationYear, suggestion.renovationYear, force),
      floorNumber: mergeNumericString(current.floorNumber, suggestion.floorNumber, force),
      ownerEmail: mergeString(current.ownerEmail, suggestion.ownerEmail, force),
      ownerPhone: mergeString(current.ownerPhone, suggestion.ownerPhone, force),
      legalStatus: (suggestion.legalStatus as FormState['legalStatus']) || current.legalStatus,
      mortgageStatus:
        (suggestion.mortgageStatus as FormState['mortgageStatus']) || current.mortgageStatus,
      condition: (suggestion.condition as FormState['condition']) || current.condition,
    }));
  }

  type ExteriorUploadKind = 'exterior-photo' | 'exterior-video' | 'exterior-glb'

  function inferExteriorUploadKind(file: File): ExteriorUploadKind {
    const lower = file.name.toLowerCase()
    if (file.type.startsWith('video/') || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
      return 'exterior-video'
    }
    if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
      return 'exterior-glb'
    }
    return 'exterior-photo'
  }

  async function uploadIntakeFile(
    file: File,
    kind: 'legal-document' | 'exterior-photo' | 'layout-plan' | ExteriorUploadKind,
    options?: { startReconstruction?: boolean }
  ) {
    if (!formData.projectId) {
      throw new Error('Select a project before uploading intake files.');
    }

    const payload = new FormData();
    payload.append('file', file);
    payload.append('projectId', formData.projectId);
    payload.append('kind', kind);
    payload.append('displayName', file.name);
    payload.append('propertyId', formData.propertyId);
    payload.append('propertyType', formData.propertyType);
    payload.append('tags', `valuation-intake,${kind}`);
    if (options?.startReconstruction) {
      payload.append('startReconstruction', 'true');
    }

    const response = await fetch('/api/intake/upload', {
      method: 'POST',
      body: payload,
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(summarizeUploadError(result, 'Upload failed.'));
    }

    return result.data as {
      asset: UploadedAsset;
      extraction?: { insight: IntakeDocumentInsight; suggestedPatch: Partial<ValuationRequest> } | null;
      reconstruction?: IntakeReconstructionJob | null;
    };
  }

  async function handleExteriorUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadingKind('exterior');
    setError(null);

    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => uploadIntakeFile(file, inferExteriorUploadKind(file)))
      );
      setExteriorAssets((current) => [...current, ...uploaded.map((item) => item.asset)]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Exterior upload failed.');
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleLayoutUpload(file: File | null) {
    if (!file) return;
    setUploadingKind('layout');
    setError(null);

    try {
      const uploaded = await uploadIntakeFile(file, 'layout-plan', {
        startReconstruction: true,
      });
      setLayoutAsset(uploaded.asset);
      setLayoutReconstruction(uploaded.reconstruction || null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Layout upload failed.');
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleLegalUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadingKind('legal');
    setError(null);

    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => uploadIntakeFile(file, 'legal-document'))
      );

      setLegalDocuments((current) => [
        ...current,
        ...uploaded.map((item) => ({
          asset: item.asset,
          insight: item.extraction?.insight,
        })),
      ]);

      uploaded.forEach((item) => {
        if (item.extraction?.suggestedPatch) {
          patchFormFromSuggestion(item.extraction.suggestedPatch);
        }
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Document upload failed.');
    } finally {
      setUploadingKind(null);
    }
  }

  async function detectExteriorFiles() {
    if (!formData.projectId) {
      setError('Select a project before detecting exterior files.');
      return;
    }

    setDetectingExterior(true);
    setError(null);

    try {
      const response = await fetch(`/api/intake/upload/detect?projectId=${formData.projectId}`);
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error?.message || 'Failed to detect exterior files.');
      }

      setDetectedExteriorFiles(result.data.exteriorFiles);
    } catch (detectError) {
      setError(detectError instanceof Error ? detectError.message : 'Exterior file detection failed.');
    } finally {
      setDetectingExterior(false);
    }
  }

  function inferDetectedExteriorUploadKind(fileName: string): ExteriorUploadKind {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
      return 'exterior-video'
    }
    if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
      return 'exterior-glb'
    }
    return 'exterior-photo'
  }

  async function uploadDetectedExteriorFile(fileInfo: { name: string; path: string }) {
    if (!formData.projectId) {
      throw new Error('Select a project before uploading exterior files.');
    }

    const kind = inferDetectedExteriorUploadKind(fileInfo.name)

    try {
      // Read the file from the filesystem
      const response = await fetch('/api/intake/upload/detected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: formData.projectId,
          filePath: fileInfo.path,
          fileName: fileInfo.name,
          kind,
          displayName: fileInfo.name,
          propertyId: formData.propertyId,
          propertyType: formData.propertyType,
          tags: `valuation-intake,${kind},auto-detected`,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error?.message || 'Failed to upload detected file.');
      }

      return result.data.asset as UploadedAsset;
    } catch (error) {
      throw error;
    }
  }

  async function uploadAllDetectedExteriorFiles() {
    if (!detectedExteriorFiles.length) return;
    setUploadingKind('exterior');
    setError(null);

    try {
      const uploaded = await Promise.all(
        detectedExteriorFiles.map((fileInfo) => uploadDetectedExteriorFile(fileInfo))
      );
      setExteriorAssets((current) => [...current, ...uploaded]);
      setDetectedExteriorFiles([]); // Clear detected files after upload
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Exterior upload failed.');
    } finally {
      setUploadingKind(null);
    }
  }

  async function startNerfstudioRun() {
    if (!exteriorAssets.length) {
      setError('Upload exterior photos before starting NeRFstudio.');
      return;
    }

    setError(null);
    const response = await fetch('/api/intake/nerfstudio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: formData.projectId,
        assetIds: exteriorAssets.map((asset) => asset.assetId),
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(summarizeUploadError(payload, 'Failed to start NeRFstudio.'));
      return;
    }

    setNerfJob(payload.data.job);
  }

  const documentInsights = useMemo(
    () => legalDocuments.map((document) => document.insight).filter(Boolean) as IntakeDocumentInsight[],
    [legalDocuments]
  );

  function dismissAutosaveToast() {
    setAutosaveToastVisible(false);
    window.setTimeout(() => setAutosaveToastMounted(false), 200);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const exteriorAssetIds = exteriorAssets.map((asset) => asset.assetId);
    const layoutAssetIds = layoutAsset ? [layoutAsset.assetId] : [];
    const legalDocumentAssetIds = legalDocuments.map((document) => document.asset.assetId);
    const assetIds = toUniqueStrings([
      ...exteriorAssetIds,
      ...layoutAssetIds,
      ...legalDocumentAssetIds,
    ]);

    const response = await fetch('/api/valuations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: formData.projectId || undefined,
        propertyId: formData.propertyId || undefined,
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        latitude: parseNumber(formData.latitude),
        longitude: parseNumber(formData.longitude),
        propertyType: formData.propertyType.trim(),
        propertyConfiguration: formData.propertyConfiguration.trim() || undefined,
        builtupArea: parseNumber(formData.builtupArea) || 0,
        landArea: parseNumber(formData.landArea),
        plotArea: parseNumber(formData.plotArea),
        bedroomCount: parseNumber(formData.bedroomCount),
        bathroomCount: parseNumber(formData.bathroomCount),
        yearBuilt: parseNumber(formData.yearBuilt),
        renovationYear: parseNumber(formData.renovationYear),
        ageInYears: deriveAgeInYears(formData.yearBuilt, formData.ageInYears),
        floorNumber: parseNumber(formData.floorNumber),
        totalFloors: parseNumber(formData.totalFloors),
        balconyCount: parseNumber(formData.balconyCount),
        facing: formData.facing.trim() || undefined,
        condition: formData.condition,
        constructionQuality: formData.constructionQuality,
        isFreehold: formData.isFreehold === 'true',
        loanAmount: parseNumber(formData.loanAmount) || 0,
        rentalIncome: parseNumber(formData.rentalIncome),
        occupancyStatus: formData.occupancyStatus,
        legalStatus: formData.legalStatus,
        mortgageStatus: formData.mortgageStatus,
        parking: parseNumber(formData.parking),
        flooring: formData.flooring.trim() || undefined,
        furnishing: formData.furnishing.trim() || undefined,
        ownerEmail: formData.ownerEmail.trim() || undefined,
        ownerPhone: formData.ownerPhone.trim() || undefined,
        description: formData.description.trim() || undefined,
        photoUrls: exteriorAssets.map((asset) => asset.secureUrl),
        photos: exteriorAssets.map((asset) => asset.secureUrl),
        documents: legalDocuments.map((document) => document.asset.secureUrl),
        documentInsights,
        reconstruction: {
          exterior: nerfJob || undefined,
          layout: layoutReconstruction || undefined,
        },
        assetIds,
        exteriorAssetIds,
        layoutAssetIds,
        legalDocumentAssetIds,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setError(summarizeUploadError(payload, 'Failed to run valuation.'));
      setSubmitting(false);
      return;
    }

    autosaveSuppressedRef.current = true;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    router.push(`/valuation-results/${payload.valuationId}`);
    window.localStorage.removeItem(AUTOSAVE_KEY);
    router.refresh();
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Loading valuation intake...</div>;
  }

  return (
    <>
      <AppShell
      user={user}
      title="Valuation Intake Studio"
      subtitle="Map-driven property intake with address autofill, richer asset capture, local reconstruction hooks, and legal document extraction."
      actions={
        <>
          <Button
            type="button"
            onClick={() => void loadPreview(true)}
            variant="outline"
            className="rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Refresh parcel context
          </Button>
          <Button
            type="button"
            onClick={() => window.print()}
            variant="ghost"
            className="border border-[var(--outline)] text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
          <SystemHealthIndicator />
        </>
      }
    >
      <form className="grid gap-6 xl:grid-cols-[0.9fr_1.35fr]" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={formData.latitude}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, latitude: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="28.6139"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={formData.longitude}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, longitude: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="77.2090"
                />
              </div>
            </div>
          </div>

          <IntakeMapPreview
            latitude={parseNumber(formData.latitude)}
            longitude={parseNumber(formData.longitude)}
            address={formData.address}
            city={formData.city}
            state={formData.state}
            pincode={formData.pincode}
            displayName={previewDisplayName}
            previewStatus={previewStatus}
            previewMessage={previewMessage}
            spatialContext={spatialContext}
          />

          {(spatialContext || previewStatus === 'ready') && (
            <div className="space-y-px border border-[var(--outline-variant)] bg-[var(--surface-container)]">
              <p className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                Spatial Analysis
              </p>

              {spatialContext && (
                <div className="border-t border-[var(--outline-variant)] px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                    Market Signals
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-[var(--on-surface)]">
                    {spatialContext.amenities.length} amenities
                  </p>
                  <p className="text-xs text-[var(--on-surface-variant)]">
                    {spatialContext.nearbyBuildings.length} buildings nearby
                  </p>
                </div>
              )}

              {formData.latitude && formData.longitude && (
                <div className="border-t border-[var(--outline-variant)] px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                    Location Signal
                  </p>
                  <p className="mt-1 font-mono text-sm font-medium text-[var(--on-surface)]">
                    {parseFloat(formData.latitude).toFixed(5)}, {parseFloat(formData.longitude).toFixed(5)}
                  </p>
                  <p className="text-xs text-[var(--on-surface-variant)]">
                    {previewDisplayName || formData.city || '—'}
                  </p>
                </div>
              )}

              {formData.legalStatus && (
                <div className="border-t border-[var(--outline-variant)] px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                    Risk Signal
                  </p>
                  <p
                    className={`mt-1 font-mono text-sm font-semibold ${
                      formData.legalStatus === 'clear'
                        ? 'text-[var(--success)]'
                        : formData.legalStatus === 'disputed'
                          ? 'text-[var(--error)]'
                          : 'text-[var(--primary)]'
                    }`}
                  >
                    {formData.legalStatus === 'clear'
                      ? 'Title Clear'
                      : formData.legalStatus === 'disputed'
                        ? 'Disputed'
                        : 'Pending Clearance'}
                  </p>
                  <p className="text-xs text-[var(--on-surface-variant)]">
                    Mortgage: {formData.mortgageStatus}
                  </p>
                </div>
              )}

              <div className="border-t border-[var(--outline-variant)] px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  Confidence
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-container-high)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all duration-700"
                      style={{
                        width:
                          previewStatus === 'ready'
                            ? '68%'
                            : previewStatus === 'loading'
                              ? '30%'
                              : previewStatus === 'error'
                                ? '10%'
                                : '0%',
                      }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                    {previewStatus === 'ready' ? '0.68' : previewStatus === 'loading' ? '...' : '—'}
                  </span>
                </div>
              </div>

              {spatialContext && spatialContext.greenAreas.length > 0 && (
                <div className="border-t border-[var(--outline-variant)] px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                    Green Areas
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-[var(--on-surface)]">
                    {spatialContext.greenAreas.length}
                  </p>
                </div>
              )}
            </div>
          )}

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <h3 className="text-xl font-semibold">3D reconstruction hooks</h3>
            <div className="mt-4 space-y-4 text-sm text-white/65">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <p className="font-medium text-white">Exterior media</p>
                <p className="mt-1">
                  {exteriorAssets.length
                    ? `${exteriorAssets.length} saved asset${exteriorAssets.length === 1 ? '' : 's'} will appear in the valuation exterior tab.`
                    : 'Upload the GLB or video that should appear in the valuation exterior tab.'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <p className="font-medium text-white">Layout to noidea</p>
                <p className="mt-1">
                  {layoutReconstruction
                    ? `${layoutReconstruction.status}: ${layoutReconstruction.message || 'Layout uploaded.'}`
                    : 'Upload a floor plan to initialize the noidea reconstruction flow.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <h3 className="text-xl font-semibold">Project and location</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <select
                  id="projectId"
                  value={formData.projectId}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, projectId: event.target.value }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
                >
                  {projects.map((project) => (
                    <option key={project.projectId} value={project.projectId}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyId">Existing property ID</Label>
                <Input
                  id="propertyId"
                  value={formData.propertyId}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, propertyId: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Optional reuse"
                />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, address: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Flat / plot / tower address"
                  required={!formData.propertyId}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, pincode: event.target.value }))
                    }
                    className="border-white/10 bg-slate-950/50 text-white"
                    placeholder="110001"
                    required={!formData.propertyId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, city: event.target.value }))
                    }
                    className="border-white/10 bg-slate-950/50 text-white"
                    placeholder="Delhi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, state: event.target.value }))
                    }
                    className="border-white/10 bg-slate-950/50 text-white"
                    placeholder="Delhi"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <h3 className="text-xl font-semibold">Property details</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property type</Label>
                <Input
                  id="propertyType"
                  value={formData.propertyType}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, propertyType: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="2BHK"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyConfiguration">Configuration</Label>
                <Input
                  id="propertyConfiguration"
                  value={formData.propertyConfiguration}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      propertyConfiguration: event.target.value,
                    }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Residential apartment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="builtupArea">Built-up area (sqft)</Label>
                <Input
                  id="builtupArea"
                  value={formData.builtupArea}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, builtupArea: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plotArea">Plot area (sqft)</Label>
                <Input
                  id="plotArea"
                  value={formData.plotArea}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, plotArea: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landArea">Land area (sqft)</Label>
                <Input
                  id="landArea"
                  value={formData.landArea}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, landArea: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedroomCount">Bedrooms</Label>
                <Input
                  id="bedroomCount"
                  value={formData.bedroomCount}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, bedroomCount: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathroomCount">Bathrooms</Label>
                <Input
                  id="bathroomCount"
                  value={formData.bathroomCount}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, bathroomCount: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parking">Parking spots</Label>
                <Input
                  id="parking"
                  value={formData.parking}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, parking: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearBuilt">Year built</Label>
                <Input
                  id="yearBuilt"
                  value={formData.yearBuilt}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, yearBuilt: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="2016"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="renovationYear">Renovation year</Label>
                <Input
                  id="renovationYear"
                  value={formData.renovationYear}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      renovationYear: event.target.value,
                    }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="2022"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageInYears">Age in years</Label>
                <Input
                  id="ageInYears"
                  value={formData.ageInYears}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, ageInYears: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Auto-derived if blank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floorNumber">Floor number</Label>
                <Input
                  id="floorNumber"
                  value={formData.floorNumber}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, floorNumber: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalFloors">Total floors</Label>
                <Input
                  id="totalFloors"
                  value={formData.totalFloors}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, totalFloors: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balconyCount">Balconies</Label>
                <Input
                  id="balconyCount"
                  value={formData.balconyCount}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, balconyCount: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facing">Facing</Label>
                <Input
                  id="facing"
                  value={formData.facing}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, facing: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="North East"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  value={formData.condition}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      condition: event.target.value as FormState['condition'],
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
                >
                  <option value="new">New</option>
                  <option value="good">Good</option>
                  <option value="needs-renovation">Needs renovation</option>
                  <option value="dilapidated">Dilapidated</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="constructionQuality">Construction quality</Label>
                <select
                  id="constructionQuality"
                  value={formData.constructionQuality}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      constructionQuality: event.target.value as FormState['constructionQuality'],
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
                >
                  <option value="premium">Premium</option>
                  <option value="standard">Standard</option>
                  <option value="basic">Basic</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isFreehold">Ownership</Label>
                <select
                  id="isFreehold"
                  value={formData.isFreehold}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, isFreehold: event.target.value as 'true' | 'false' }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
                >
                  <option value="true">Freehold</option>
                  <option value="false">Leasehold</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupancyStatus">Occupancy</Label>
                <select
                  id="occupancyStatus"
                  value={formData.occupancyStatus}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      occupancyStatus: event.target.value as FormState['occupancyStatus'],
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
                >
                  <option value="occupied">Occupied</option>
                  <option value="vacant">Vacant</option>
                  <option value="under-construction">Under construction</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <h3 className="text-xl font-semibold">Finance and legal</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="loanAmount">Loan amount</Label>
                <Input
                  id="loanAmount"
                  value={formData.loanAmount}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, loanAmount: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentalIncome">Monthly rental income</Label>
                <Input
                  id="rentalIncome"
                  value={formData.rentalIncome}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, rentalIncome: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalStatus">Legal status</Label>
                <select
                  id="legalStatus"
                  value={formData.legalStatus}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      legalStatus: event.target.value as FormState['legalStatus'],
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
                >
                  <option value="clear">Clear</option>
                  <option value="pending-clearance">Pending clearance</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgageStatus">Mortgage status</Label>
                <select
                  id="mortgageStatus"
                  value={formData.mortgageStatus}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      mortgageStatus: event.target.value as FormState['mortgageStatus'],
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 text-white"
                >
                  <option value="clear">Clear</option>
                  <option value="mortgaged">Mortgaged</option>
                  <option value="multiple-mortgages">Multiple mortgages</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="furnishing">Furnishing</Label>
                <Input
                  id="furnishing"
                  value={formData.furnishing}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, furnishing: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Semi-furnished"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flooring">Flooring</Label>
                <Input
                  id="flooring"
                  value={formData.flooring}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, flooring: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                  placeholder="Vitrified tiles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Owner email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, ownerEmail: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPhone">Owner phone</Label>
                <Input
                  id="ownerPhone"
                  value={formData.ownerPhone}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, ownerPhone: event.target.value }))
                  }
                  className="border-white/10 bg-slate-950/50 text-white"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="description">Inspection notes</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
                className="min-h-32 border-white/10 bg-slate-950/50 text-white"
                placeholder="Site condition, borrower context, renovation notes, and any lender-specific observations."
              />
            </div>
          </Card>

          <Card className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white">
            <h3 className="text-xl font-semibold">Uploads and extraction</h3>
            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">Exterior media</p>
                  <Button
                    type="button"
                    onClick={() => void detectExteriorFiles()}
                    disabled={detectingExterior || !formData.projectId}
                    className="h-8 px-3 text-xs"
                    variant="outline"
                  >
                    {detectingExterior ? 'Detecting...' : 'Auto-detect'}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  Upload the saved GLB, walkthrough video, or reference captures that should appear in the valuation exterior tab.
                  {detectedExteriorFiles.length > 0 && (
                    <span className="ml-2 text-cyan-200">
                      {detectedExteriorFiles.length} file{detectedExteriorFiles.length === 1 ? '' : 's'} detected in exterior folder.
                    </span>
                  )}
                </p>
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*,.glb,.gltf"
                  onChange={(event) => void handleExteriorUpload(event.target.files)}
                  className="mt-4 border-white/10 bg-slate-950/50 text-white"
                />
                {detectedExteriorFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/60">Detected files:</p>
                      <Button
                        type="button"
                        onClick={() => void uploadAllDetectedExteriorFiles()}
                        disabled={uploadingKind === 'exterior'}
                        className="h-6 px-2 text-xs"
                        size="sm"
                      >
                        Upload All
                      </Button>
                    </div>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {detectedExteriorFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-xs text-white/60 bg-slate-950/20 rounded px-2 py-1">
                          <span className="truncate">{file.name}</span>
                          <span className="text-white/40 ml-2">
                            {(file.size / 1024 / 1024).toFixed(1)}MB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 space-y-2 text-xs text-white/60">
                  {exteriorAssets.length === 0 ? (
                    <p>No exterior media uploaded yet.</p>
                  ) : (
                    exteriorAssets.map((asset) => <p key={asset.assetId}>{asset.displayName}</p>)
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
                <p className="font-medium text-white">Layout / floor plan</p>
                <p className="mt-2 text-sm text-white/60">
                  Upload the plan and initialize the noidea reconstruction pipeline.
                </p>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => void handleLayoutUpload(event.target.files?.[0] || null)}
                  className="mt-4 border-white/10 bg-slate-950/50 text-white"
                />
                <div className="mt-4 text-xs text-white/60">
                  {layoutAsset ? <p>{layoutAsset.displayName}</p> : <p>No layout uploaded yet.</p>}
                  {layoutReconstruction?.runId ? (
                    <p className="mt-2 text-cyan-200">noidea run: {layoutReconstruction.runId}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
                <p className="font-medium text-white">Legal / house documents</p>
                <p className="mt-2 text-sm text-white/60">
                  PDFs and text documents are parsed automatically and mapped back into the form.
                </p>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.json,.csv,.xml,.html,image/*"
                  onChange={(event) => void handleLegalUpload(event.target.files)}
                  className="mt-4 border-white/10 bg-slate-950/50 text-white"
                />
                <div className="mt-4 space-y-3 text-xs text-white/60">
                  {legalDocuments.length === 0 ? (
                    <p>No documents uploaded yet.</p>
                  ) : (
                    legalDocuments.map((document) => (
                      <div key={document.asset.assetId} className="rounded-2xl border border-white/10 px-3 py-2">
                        <p className="font-medium text-white">{document.asset.displayName}</p>
                        <p className="mt-1">{document.insight?.summary || 'Uploaded and linked.'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {error ? (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={submitting || loading || uploadingKind !== null}
              className="h-12 rounded-2xl bg-white px-6 text-slate-950 hover:bg-slate-100"
            >
              {submitting ? 'Running valuation pipeline...' : 'Run valuation'}
            </Button>
            <p className="text-sm text-white/55">
              {uploadingKind
                ? `Uploading ${uploadingKind} files...`
                : 'Uploads, doc extraction, and reconstruction job references are attached to this valuation.'}
            </p>
          </div>
        </div>
      </form>
      </AppShell>

      <div
        id="valuation-print-view"
        className="hidden min-h-screen bg-[var(--surface)] p-8 text-[var(--on-surface)] print:block"
      >
        <div className="border-b border-[var(--outline-variant)] pb-4">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
            TenzorX Collateral Intelligence
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--on-surface)]">
            {formData.address || 'Property address pending'}
          </h1>
          <p className="mt-2 font-mono text-xs text-[var(--on-surface-variant)]">{printDate}</p>
        </div>

        <section className="mt-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[var(--on-surface)]">
            Property Details
          </h2>
          <div className="mt-3 grid grid-cols-2 border border-[var(--outline-variant)]">
            {printFormRows.map((row) => (
              <div
                key={row.label}
                className="border-b border-r border-[var(--outline-variant)] px-3 py-2"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  {row.label}
                </p>
                <p className="mt-1 text-sm text-[var(--on-surface)]">{row.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[var(--on-surface)]">
            Spatial Analysis
          </h2>
          {spatialContext ? (
            <div className="mt-3 grid grid-cols-2 border border-[var(--outline-variant)]">
              <div className="border-b border-r border-[var(--outline-variant)] px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  Amenities count
                </p>
                <p className="mt-1 text-sm text-[var(--on-surface)]">
                  {spatialContext.amenities.length}
                </p>
              </div>
              <div className="border-b border-r border-[var(--outline-variant)] px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  Buildings count
                </p>
                <p className="mt-1 text-sm text-[var(--on-surface)]">
                  {spatialContext.nearbyBuildings.length}
                </p>
              </div>
              <div className="border-r border-[var(--outline-variant)] px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  Green areas count
                </p>
                <p className="mt-1 text-sm text-[var(--on-surface)]">
                  {spatialContext.greenAreas.length}
                </p>
              </div>
              <div className="px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  Coordinates
                </p>
                <p className="mt-1 text-sm text-[var(--on-surface)]">
                  {formData.latitude && formData.longitude
                    ? `${formData.latitude}, ${formData.longitude}`
                    : 'Not resolved'}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--on-surface-variant)]">
              No spatial context loaded.
            </p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[var(--on-surface)]">
            Status
          </h2>
          <div className="mt-3 border border-[var(--outline-variant)] px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
              {previewStatus}
            </p>
            <p className="mt-1 text-sm text-[var(--on-surface)]">
              {previewMessage || 'No preview message yet.'}
            </p>
          </div>
        </section>

        <footer className="mt-10 border-t border-[var(--outline-variant)] pt-4 font-mono text-xs text-[var(--on-surface-variant)]">
          Generated by TenzorX · Confidential · Not for distribution
        </footer>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #valuation-print-view { display: block !important; }
          @page { margin: 20mm; size: A4; }
        }
      `}</style>

      {autosaveToastMounted ? (
        <AutosaveToast visible={autosaveToastVisible} onDismiss={dismissAutosaveToast} />
      ) : null}
    </>
  );
}

export default function NewValuationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading valuation intake...
        </div>
      }
    >
      <NewValuationPageInner />
    </Suspense>
  );
}
