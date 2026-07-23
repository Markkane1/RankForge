import assert from 'assert/strict';
import { buildGeoGridScanResult } from '../src/geo-grid';

const scan = buildGeoGridScanResult(
  {
    average_rank: 4.236,
    points: [{ lat: 25.2, lng: 55.3, rank: 4 }],
    run_id: 'local-falcon-run-1',
  },
  {
    locationId: 'locations/selected',
    keyword: 'emergency plumber',
    gridSize: '3x3',
    gridRadius: '1.0mi',
  },
);

assert.equal(scan.averageRank, 4.24);
assert.deepEqual(scan.pointResults, [{ lat: 25.2, lng: 55.3, rank: 4 }]);
assert.deepEqual(scan.sourceLineage, {
  provider: 'LOCAL_FALCON',
  endpoint: 'https://api.localfalcon.com/api/v1/reports/run',
  request: {
    locationId: 'locations/selected',
    keyword: 'emergency plumber',
    gridSize: '3x3',
    gridRadius: '1.0mi',
  },
  providerRunId: 'local-falcon-run-1',
  rawResponse: {
    average_rank: 4.236,
    points: [{ lat: 25.2, lng: 55.3, rank: 4 }],
    run_id: 'local-falcon-run-1',
  },
});

console.log('Worker geo-grid behavior verified.');
