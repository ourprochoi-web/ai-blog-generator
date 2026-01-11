'use client';

import { useState, useEffect } from 'react';
import {
  triggerScraping,
  triggerGeneration,
  triggerFullPipeline,
  getSchedulerStatus,
} from '@/lib/admin-api';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'scrape' | 'generate';
  status: 'running' | 'success' | 'error';
  message: string;
}

export default function PipelinePage() {
  const [isScraping, setIsScraping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningFull, setIsRunningFull] = useState(false);
  const [scrapeType, setScrapeType] = useState<'all' | 'news' | 'paper' | 'article'>('all');
  const [generateEdition, setGenerateEdition] = useState<'auto' | 'morning' | 'evening'>('auto');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<{
    running: boolean;
    next_run: string | null;
  } | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await getSchedulerStatus();
        setSchedulerStatus(status);
      } catch {
        // Scheduler status not available
      }
    }
    loadStatus();
  }, []);

  const addLog = (type: 'scrape' | 'generate' | 'pipeline', status: 'running' | 'success' | 'error', message: string) => {
    const entry: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type: type === 'pipeline' ? 'generate' : type,
      status,
      message,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 50));
  };

  const handleFullPipeline = async () => {
    try {
      setIsRunningFull(true);
      addLog('pipeline', 'running', 'Starting full pipeline (scrape -> evaluate -> generate)...');

      const result = await triggerFullPipeline();

      addLog('pipeline', 'success', result.message);
    } catch (err) {
      addLog('pipeline', 'error', err instanceof Error ? err.message : 'Pipeline failed');
    } finally {
      setIsRunningFull(false);
    }
  };

  const handleScrape = async () => {
    try {
      setIsScraping(true);
      addLog('scrape', 'running', `Starting scraping (type: ${scrapeType})...`);

      const result = await triggerScraping(scrapeType === 'all' ? undefined : scrapeType);

      addLog('scrape', 'success', `Scraped ${result.sources_count} sources`);
    } catch (err) {
      addLog('scrape', 'error', err instanceof Error ? err.message : 'Scraping failed');
    } finally {
      setIsScraping(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      addLog('generate', 'running', `Starting article generation (edition: ${generateEdition})...`);

      const result = await triggerGeneration(
        generateEdition === 'auto' ? undefined : generateEdition
      );

      addLog('generate', 'success', `Generated ${result.articles_count} articles`);
    } catch (err) {
      addLog('generate', 'error', err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '•';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#F59E0B';
      case 'success':
        return '#10B981';
      case 'error':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Pipeline</h1>
      <p style={styles.subtitle}>Manually trigger scraping and article generation</p>

      {/* Full Pipeline Button */}
      <div style={styles.fullPipelineSection}>
        <button
          onClick={handleFullPipeline}
          disabled={isRunningFull || isScraping || isGenerating}
          style={{
            ...styles.fullPipelineButton,
            backgroundColor: isRunningFull ? '#9CA3AF' : '#059669',
          }}
        >
          {isRunningFull ? (
            <>
              <span style={styles.spinner}>⟳</span> Running Full Pipeline...
            </>
          ) : (
            <>
              🚀 Run Full Pipeline
            </>
          )}
        </button>
        <p style={styles.fullPipelineHint}>
          Runs scrape → evaluate → generate in sequence
        </p>
      </div>

      <div style={styles.grid}>
        {/* Scraping Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>📰</span>
            <h2 style={styles.cardTitle}>Scraping</h2>
          </div>
          <p style={styles.cardDescription}>
            Scrape new sources from configured feeds (arXiv, news RSS, etc.)
          </p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Source Type</label>
            <select
              value={scrapeType}
              onChange={(e) => setScrapeType(e.target.value as typeof scrapeType)}
              style={styles.select}
            >
              <option value="all">All Types</option>
              <option value="news">News Only</option>
              <option value="paper">Papers Only (arXiv)</option>
              <option value="article">Articles Only</option>
            </select>
          </div>

          <button
            onClick={handleScrape}
            disabled={isScraping}
            style={{
              ...styles.actionButton,
              backgroundColor: isScraping ? '#9CA3AF' : '#3B82F6',
            }}
          >
            {isScraping ? (
              <>
                <span style={styles.spinner}>⟳</span> Scraping...
              </>
            ) : (
              'Run Scraping'
            )}
          </button>
        </div>

        {/* Generation Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>✨</span>
            <h2 style={styles.cardTitle}>Article Generation</h2>
          </div>
          <p style={styles.cardDescription}>
            Generate blog articles from pending sources using Gemini AI
          </p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Edition</label>
            <select
              value={generateEdition}
              onChange={(e) => setGenerateEdition(e.target.value as typeof generateEdition)}
              style={styles.select}
            >
              <option value="auto">Auto (based on time)</option>
              <option value="morning">Morning Edition</option>
              <option value="evening">Evening Edition</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              ...styles.actionButton,
              backgroundColor: isGenerating ? '#9CA3AF' : '#8B5CF6',
            }}
          >
            {isGenerating ? (
              <>
                <span style={styles.spinner}>⟳</span> Generating...
              </>
            ) : (
              'Generate Articles'
            )}
          </button>
        </div>
      </div>

      {/* Scheduler Info */}
      <div style={styles.infoBox}>
        <div style={styles.infoHeader}>
          <h3 style={styles.infoTitle}>Scheduler Status</h3>
          {schedulerStatus && (
            <span
              style={{
                ...styles.statusIndicator,
                backgroundColor: schedulerStatus.running ? '#D1FAE5' : '#FEE2E2',
                color: schedulerStatus.running ? '#065F46' : '#991B1B',
              }}
            >
              {schedulerStatus.running ? 'Running' : 'Stopped'}
            </span>
          )}
        </div>
        {schedulerStatus?.next_run && (
          <p style={styles.nextRun}>
            Next scheduled run: {new Date(schedulerStatus.next_run).toLocaleString()}
          </p>
        )}
        <div style={styles.scheduleGrid}>
          <div style={styles.scheduleItem}>
            <span style={styles.scheduleTime}>08:00 AM</span>
            <span style={styles.scheduleLabel}>Morning Edition (KST)</span>
          </div>
          <div style={styles.scheduleItem}>
            <span style={styles.scheduleTime}>08:00 PM</span>
            <span style={styles.scheduleLabel}>Evening Edition (KST)</span>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div style={styles.logSection}>
        <div style={styles.logHeader}>
          <h3 style={styles.logTitle}>Activity Log</h3>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              style={styles.clearButton}
            >
              Clear
            </button>
          )}
        </div>

        <div style={styles.logContainer}>
          {logs.length === 0 ? (
            <p style={styles.emptyLog}>No activity yet. Run a task to see logs here.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={styles.logEntry}>
                <span style={styles.logTimestamp}>{log.timestamp}</span>
                <span style={styles.logIcon}>{getStatusIcon(log.status)}</span>
                <span
                  style={{
                    ...styles.logType,
                    backgroundColor: log.type === 'scrape' ? '#DBEAFE' : '#E9D5FF',
                    color: log.type === 'scrape' ? '#1E40AF' : '#7C3AED',
                  }}
                >
                  {log.type}
                </span>
                <span
                  style={{
                    ...styles.logMessage,
                    color: getStatusColor(log.status),
                  }}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  title: {
    fontSize: 28,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  fullPipelineSection: {
    marginBottom: 32,
    textAlign: 'center' as const,
  },
  fullPipelineButton: {
    padding: '16px 48px',
    fontSize: 16,
    fontWeight: 600,
    color: 'white',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
  },
  fullPipelineHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 24,
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 28,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 1.5,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 8,
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #D1D5DB',
    borderRadius: 6,
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  actionButton: {
    width: '100%',
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 500,
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
    border: '1px solid #E5E7EB',
  },
  infoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  nextRun: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 16,
  },
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  scheduleItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  scheduleTime: {
    fontSize: 18,
    fontWeight: 600,
    color: '#111827',
  },
  scheduleLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  logSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #E5E7EB',
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
  },
  clearButton: {
    padding: '6px 12px',
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: 'transparent',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    cursor: 'pointer',
  },
  logContainer: {
    maxHeight: 400,
    overflowY: 'auto',
  },
  emptyLog: {
    padding: 40,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
  logEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    borderBottom: '1px solid #F3F4F6',
    fontSize: 14,
  },
  logTimestamp: {
    color: '#9CA3AF',
    fontSize: 13,
    fontFamily: 'monospace',
    minWidth: 80,
  },
  logIcon: {
    fontSize: 14,
  },
  logType: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  logMessage: {
    flex: 1,
  },
};
