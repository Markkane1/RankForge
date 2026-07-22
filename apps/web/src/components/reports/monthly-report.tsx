import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2', fontWeight: 700 },
  ],
});

import xss from 'xss';

// Utility to mitigate XSS in PDF rendering (Gap 06)
function sanitizeText(str: string | null | undefined): string {
  if (!str) return '';
  return xss(str, {
    whiteList: {}, // strictly strip all HTML tags
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1a1a1a',
  },
  headerBar: {
    backgroundColor: '#059669',
    padding: '16 24',
    borderRadius: 6,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 10,
    color: '#d1fae5',
    marginTop: 2,
  },
  headerDate: {
    fontSize: 11,
    color: '#d1fae5',
    fontWeight: 600,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#059669',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: '14 12',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#059669',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    padding: '8 12',
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: 600,
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '8 12',
    borderBottom: '1px solid #f3f4f6',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  chartBar: {
    borderRadius: 2,
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
    width: 120,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartValue: {
    fontSize: 9,
    fontWeight: 600,
    width: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
  },
});

interface ClientRow {
  name: string;
  state: string;
  tasksDone: number;
  leads: number;
  avgRating: number | null;
  searchVisibility?: number;
  competitorPosition?: string;
  nextMonthPlan?: string;
  whatsappSummary?: string;
}

interface LeadSourceData {
  name: string;
  count: number;
}

interface ReportProps {
  month: number;
  year: number;
  totalClients: number;
  totalTasksCompleted: number;
  totalLeads: number;
  leadValue: number;
  clients: ClientRow[];
  leadSources: LeadSourceData[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BAR_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#6366f1', '#94a3b8'];

export function MonthlyReportDocument({
  month,
  year,
  totalClients,
  totalTasksCompleted,
  totalLeads,
  leadValue,
  clients,
  leadSources,
}: ReportProps) {
  const maxSourceCount = Math.max(...leadSources.map((s) => s.count), 1);
  const maxBarWidth = 300;

  return (
    <Document>
      {/* Page 1 - Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>SEO Delivery Platform</Text>
            <Text style={styles.headerSub}>Agency Performance Report</Text>
          </View>
          <View>
            <Text style={styles.headerDate}>{MONTH_NAMES[month - 1]} {year}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Executive Summary</Text>

        {(() => {
          const getSourceCount = (src: string) => leadSources.find((s) => s.name === src)?.count || 0;
          const totalCalls = getSourceCount('GBP_CALL') + getSourceCount('PHONE_CALL');
          const totalDirections = getSourceCount('GBP_DIRECTIONS');
          const totalWebsite = getSourceCount('GBP_WEBSITE');
          return (
            <View style={[styles.card, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', padding: 12, marginBottom: 16 }]}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: '#047857', marginBottom: 2 }}>Monthly Performance Highlight</Text>
              <Text style={{ fontSize: 9, lineHeight: 1.4, color: '#065f46' }}>
                You got {totalCalls} calls, {totalDirections} direction requests, and {totalWebsite} website clicks this month!
              </Text>
            </View>
          );
        })()}

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalClients}</Text>
            <Text style={styles.kpiLabel}>Total Clients</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalTasksCompleted}</Text>
            <Text style={styles.kpiLabel}>Tasks Completed</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalLeads}</Text>
            <Text style={styles.kpiLabel}>Total Leads</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>${leadValue.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Lead Value</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Lead Breakdown by Source</Text>
        <View style={styles.card}>
          {leadSources.length === 0 ? (
            <Text style={{ fontSize: 9, color: '#6b7280' }}>No lead data for this period.</Text>
          ) : (
            leadSources.map((source, i) => (
              <View key={source.name} style={styles.chartRow}>
                <Text style={styles.chartLabel}>{source.name}</Text>
                <View
                  style={{
                    width: Math.max((source.count / maxSourceCount) * maxBarWidth, 8),
                    height: 18,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    borderRadius: 2,
                  }}
                />
                <Text style={styles.chartValue}>{source.count}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by SEO Delivery Platform</Text>
          <Text style={styles.footerText}>{new Date().toLocaleDateString()}</Text>
        </View>
      </Page>

      {/* Page 2 - Client Performance */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>SEO Delivery Platform</Text>
            <Text style={styles.headerSub}>Client Performance — {MONTH_NAMES[month - 1]} {year}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Client Performance</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Client Name</Text>
            <Text style={styles.tableHeaderCell}>State</Text>
            <Text style={styles.tableHeaderCell}>Tasks Done</Text>
            <Text style={styles.tableHeaderCell}>Leads</Text>
            <Text style={styles.tableHeaderCell}>Avg Rating</Text>
            <Text style={styles.tableHeaderCell}>Visibility</Text>
          </View>
          {clients.map((c, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{sanitizeText(c.name)}</Text>
              <Text style={styles.tableCell}>{sanitizeText(c.state)}</Text>
              <Text style={styles.tableCell}>{c.tasksDone}</Text>
              <Text style={styles.tableCell}>{c.leads}</Text>
              <Text style={styles.tableCell}>{c.avgRating != null ? c.avgRating.toFixed(1) : '—'}</Text>
              <Text style={styles.tableCell}>{c.searchVisibility != null ? `${c.searchVisibility}%` : '—'}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Next Month Plan</Text>
        <View style={styles.card}>
          {clients.map((c) => (
            <View key={c.name} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 700 }}>{sanitizeText(c.name)}</Text>
              <Text style={{ fontSize: 8, color: '#4b5563' }}>Competitor: {sanitizeText(c.competitorPosition)}</Text>
              <Text style={{ fontSize: 8, color: '#4b5563' }}>{sanitizeText(c.whatsappSummary)}</Text>
              <Text style={{ fontSize: 8, color: '#4b5563' }}>Plan: {sanitizeText(c.nextMonthPlan)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by SEO Delivery Platform</Text>
          <Text style={styles.footerText}>{new Date().toLocaleDateString()}</Text>
        </View>
      </Page>

      {/* Page 3 - Charts */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>SEO Delivery Platform</Text>
            <Text style={styles.headerSub}>Charts — {MONTH_NAMES[month - 1]} {year}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Leads by Source</Text>
        <View style={styles.card}>
          {leadSources.length === 0 ? (
            <Text style={{ fontSize: 9, color: '#6b7280' }}>No lead data for this period.</Text>
          ) : (
            <View>
              {/* SVG Bar Chart */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 200, borderBottom: '1px solid #e5e7eb', paddingLeft: 10, paddingRight: 10, paddingBottom: 4 }}>
                {leadSources.map((source, i) => {
                  const barHeight = maxSourceCount > 0 ? (source.count / maxSourceCount) * 160 : 0;
                  return (
                    <View key={source.name} style={{ alignItems: 'center', flex: 1, maxWidth: 70 }}>
                      <Text style={{ fontSize: 9, fontWeight: 600, marginBottom: 4, color: '#1a1a1a' }}>{source.count}</Text>
                      <View
                        style={{
                          width: 36,
                          height: Math.max(barHeight, 4),
                          backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                          borderRadius: '4 4 0 0',
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 6,
                          color: '#6b7280',
                          marginTop: 4,
                          textAlign: 'center',
                          maxWidth: 70,
                        }}
                      >
                        {source.name.length > 14 ? source.name.slice(0, 12) + '...' : source.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Client Task Completion</Text>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 200, borderBottom: '1px solid #e5e7eb', paddingLeft: 10, paddingRight: 10, paddingBottom: 4 }}>
            {clients.slice(0, 8).map((c, i) => {
              const maxTasks = Math.max(...clients.map((x) => x.tasksDone), 1);
              const barHeight = (c.tasksDone / maxTasks) * 160;
              return (
                <View key={c.name} style={{ alignItems: 'center', flex: 1, maxWidth: 60 }}>
                  <Text style={{ fontSize: 8, fontWeight: 600, marginBottom: 4 }}>{c.tasksDone}</Text>
                  <View
                    style={{
                      width: 32,
                      height: Math.max(barHeight, 4),
                      backgroundColor: '#10b981',
                      borderRadius: '4 4 0 0',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 5,
                      color: '#6b7280',
                      marginTop: 4,
                      textAlign: 'center',
                      maxWidth: 60,
                    }}
                  >
                    {sanitizeText(c.name).length > 10 ? sanitizeText(c.name).slice(0, 8) + '...' : sanitizeText(c.name)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by SEO Delivery Platform</Text>
          <Text style={styles.footerText}>{new Date().toLocaleDateString()}</Text>
        </View>
      </Page>
    </Document>
  );
}
