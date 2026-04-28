export interface IHealthStatus {
  status: string;
  service: string;
  timestamp: string;
}

export async function fetchHealthStatus(): Promise<IHealthStatus> {
  const response = await fetch('/api/health');

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json() as Promise<IHealthStatus>;
}
