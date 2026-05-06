import type { ModelServiceStatus } from '@/lib/db/schema';

type WorkerDefinition = {
  id: string;
  name: string;
  category: ModelServiceStatus['category'];
  url: string | undefined;
  healthPath: string;
};

const WORKERS: WorkerDefinition[] = [
  {
    id: 'real-estate-regression',
    name: 'Real Estate Regression',
    category: 'valuation',
    url: process.env.REAL_ESTATE_MODEL_URL?.trim(),
    healthPath: '/health',
  },
  {
    id: 'realvalue-vision',
    name: 'RealValue Vision',
    category: 'vision',
    url: process.env.REALVALUE_MODEL_URL?.trim(),
    healthPath: '/health',
  },
  {
    id: 'house-price-ensemble',
    name: 'House Price Ensemble',
    category: 'ensemble',
    url: process.env.HOUSE_PRICE_ESTIMATOR_URL?.trim(),
    healthPath: '/health',
  },
  {
    id: 'graphsage-intelligence',
    name: 'GraphSAGE Intelligence',
    category: 'graph',
    url: process.env.GRAPHSAGE_MODEL_URL?.trim(),
    healthPath: '/health',
  },
];

async function probeWorker(worker: WorkerDefinition): Promise<ModelServiceStatus> {
  if (!worker.url) {
    return {
      id: worker.id,
      name: worker.name,
      category: worker.category,
      status: 'unconfigured',
      message: 'Worker URL is not configured.',
      checkedAt: new Date(),
    };
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(`${worker.url}${worker.healthPath}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    const responseTimeMs = Date.now() - startedAt;
    const details = response.headers.get('content-type')?.includes('application/json')
      ? ((await response.json()) as Record<string, unknown>)
      : undefined;

    if (!response.ok) {
      return {
        id: worker.id,
        name: worker.name,
        category: worker.category,
        url: worker.url,
        status: 'down',
        message: `Worker responded with ${response.status}.`,
        checkedAt: new Date(),
        responseTimeMs,
        details,
      };
    }

    return {
      id: worker.id,
      name: worker.name,
      category: worker.category,
      url: worker.url,
      status: responseTimeMs > 1500 ? 'degraded' : 'online',
      message: responseTimeMs > 1500 ? 'Worker is slow but reachable.' : 'Worker is online.',
      checkedAt: new Date(),
      responseTimeMs,
      details,
    };
  } catch (error) {
    return {
      id: worker.id,
      name: worker.name,
      category: worker.category,
      url: worker.url,
      status: 'down',
      message: error instanceof Error ? error.message : 'Worker is unreachable.',
      checkedAt: new Date(),
    };
  }
}

export async function getModelWorkerStatuses() {
  return Promise.all(WORKERS.map((worker) => probeWorker(worker)));
}

export function summarizeWorkerStatuses(statuses: ModelServiceStatus[]) {
  const totals = statuses.reduce(
    (acc, status) => {
      acc[status.status] += 1;
      return acc;
    },
    { online: 0, degraded: 0, down: 0, unconfigured: 0 }
  );

  const overallStatus =
    totals.down > 0
      ? 'attention'
      : totals.degraded > 0
        ? 'degraded'
        : totals.online > 0
          ? 'healthy'
          : 'unconfigured';

  return {
    overallStatus,
    totals,
    message:
      overallStatus === 'healthy'
        ? 'All configured workers are healthy.'
        : overallStatus === 'degraded'
          ? 'Some workers are responding slowly.'
          : overallStatus === 'attention'
            ? 'One or more workers are unavailable. The app will continue with local inference.'
            : 'No external model workers are configured.',
  };
}
