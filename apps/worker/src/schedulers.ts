import { taskQueue } from '@rankforge/queue';

export async function initSchedulers() {
  console.log('Initializing repeat schedulers...');

  // 1. Daily Health Checks
  await taskQueue.add(
    'DailyHealthCheck',
    {},
    {
      repeat: {
        pattern: '0 0 * * *', // Every day at midnight
      },
      jobId: 'daily-health-check-schedule',
    }
  );

  await taskQueue.add('OffboardingRetentionSweep', {}, {
    repeat: { pattern: '15 0 * * *' },
    jobId: 'offboarding-retention-sweep-schedule',
  });

  // 2. Weekly Rank Updates
  await taskQueue.add(
    'WeeklyRankUpdate',
    {},
    {
      repeat: {
        pattern: '0 0 * * 0', // Every Sunday at midnight
      },
      jobId: 'weekly-rank-update-schedule',
    }
  );

  // 3. Quarterly Category Syncs
  await taskQueue.add(
    'QuarterlyCategorySync',
    {},
    {
      repeat: {
        pattern: '0 0 1 1,4,7,10 *', // 1st of Jan, Apr, Jul, Oct
      },
      jobId: 'quarterly-category-sync-schedule',
    }
  );

  // 4. Monthly Post Generator
  await taskQueue.add('MonthlyPostGenerator', {}, {
    repeat: { pattern: '0 0 1 * *' } // 1st of every month at midnight
  });
  
  await taskQueue.add('FaqVisibilityMonitor', {}, {
    repeat: { pattern: '0 0 1 * *' } // 1st of every month at midnight
  });

  // 5. Weekly Geo-Grid Scan (every Sunday at midnight)
  await taskQueue.add('WeeklyGeoGridScan', {}, {
    repeat: { pattern: '0 0 * * 0' }
  });

  // 6. Monthly Competitor Policy Scan (1st of every month at midnight)
  await taskQueue.add('MonthlyCompetitorPolicyScan', {}, {
    repeat: { pattern: '0 0 1 * *' }
  });

  // 7. Monthly Backlink Gap Pull (1st of every month at midnight)
  await taskQueue.add('MonthlyBacklinkGapPull', {}, {
    repeat: { pattern: '0 0 1 * *' }
  });

  // 8. Monthly Conversion Optimization Loop (1st of every month at midnight)
  await taskQueue.add('MonthlyConversionOptimizationLoop', {}, {
    repeat: { pattern: '0 0 1 * *' }
  });

  await taskQueue.add('WelcomeClientCommunication', {}, {
    repeat: { pattern: '0 9 * * *' }
  });

  await taskQueue.add('WeeklyBuildSummary', {}, {
    repeat: { pattern: '0 9 * * 1' }
  });

  await taskQueue.add('MilestoneCommunication', {}, {
    repeat: { pattern: '30 9 * * *' }
  });

  await taskQueue.add('MonthlyReportDelivery', {}, {
    repeat: { pattern: '0 10 1 * *' }
  });

  console.log('Background schedulers initialized.');

  console.log('Schedulers initialized successfully.');
}
