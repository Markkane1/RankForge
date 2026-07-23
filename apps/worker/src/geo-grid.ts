export type LocalFalconGeoGridRequest = {
  locationId: string;
  keyword: string;
  gridSize: '3x3';
  gridRadius: '1.0mi';
};

export function buildGeoGridScanResult(scanData: any, request: LocalFalconGeoGridRequest) {
  const averageRank = Number(scanData.averageRank ?? scanData.average_rank ?? scanData.report?.average_rank ?? 0);
  const pointResults = scanData.pointResults ?? scanData.points ?? scanData.results ?? scanData;

  return {
    averageRank: parseFloat(averageRank.toFixed(2)),
    pointResults,
    sourceLineage: {
      provider: 'LOCAL_FALCON',
      endpoint: 'https://api.localfalcon.com/api/v1/reports/run',
      request,
      providerRunId: scanData.runId ?? scanData.run_id ?? scanData.report?.id ?? null,
      rawResponse: scanData,
    },
  };
}
