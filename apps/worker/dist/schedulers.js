"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSchedulers = initSchedulers;
const queue_1 = require("@rankforge/queue");
async function initSchedulers() {
    console.log('Initializing repeat schedulers...');
    // 1. Daily Health Checks
    await queue_1.taskQueue.add('DailyHealthCheck', {}, {
        repeat: {
            pattern: '0 0 * * *', // Every day at midnight
        },
        jobId: 'daily-health-check-schedule',
    });
    await queue_1.taskQueue.add('OffboardingRetentionSweep', {}, {
        repeat: { pattern: '15 0 * * *' },
        jobId: 'offboarding-retention-sweep-schedule',
    });
    // 2. Weekly Rank Updates
    await queue_1.taskQueue.add('WeeklyRankUpdate', {}, {
        repeat: {
            pattern: '0 0 * * 0', // Every Sunday at midnight
        },
        jobId: 'weekly-rank-update-schedule',
    });
    // 3. Quarterly Category Syncs
    await queue_1.taskQueue.add('QuarterlyCategorySync', {}, {
        repeat: {
            pattern: '0 0 1 1,4,7,10 *', // 1st of Jan, Apr, Jul, Oct
        },
        jobId: 'quarterly-category-sync-schedule',
    });
    // 4. Monthly Post Generator
    await queue_1.taskQueue.add('MonthlyPostGenerator', {}, {
        repeat: { pattern: '0 0 1 * *' } // 1st of every month at midnight
    });
    await queue_1.taskQueue.add('FaqVisibilityMonitor', {}, {
        repeat: { pattern: '0 0 1 * *' } // 1st of every month at midnight
    });
    // 5. Weekly Geo-Grid Scan (every Sunday at midnight)
    await queue_1.taskQueue.add('WeeklyGeoGridScan', {}, {
        repeat: { pattern: '0 0 * * 0' }
    });
    // 6. Monthly Competitor Policy Scan (1st of every month at midnight)
    await queue_1.taskQueue.add('MonthlyCompetitorPolicyScan', {}, {
        repeat: { pattern: '0 0 1 * *' }
    });
    // 7. Monthly Conversion Optimization Loop (1st of every month at midnight)
    await queue_1.taskQueue.add('MonthlyConversionOptimizationLoop', {}, {
        repeat: { pattern: '0 0 1 * *' }
    });
    await queue_1.taskQueue.add('WelcomeClientCommunication', {}, {
        repeat: { pattern: '0 9 * * *' }
    });
    await queue_1.taskQueue.add('WeeklyBuildSummary', {}, {
        repeat: { pattern: '0 9 * * 1' }
    });
    await queue_1.taskQueue.add('MilestoneCommunication', {}, {
        repeat: { pattern: '30 9 * * *' }
    });
    await queue_1.taskQueue.add('MonthlyReportDelivery', {}, {
        repeat: { pattern: '0 10 1 * *' }
    });
    console.log('Background schedulers initialized.');
    console.log('Schedulers initialized successfully.');
}
