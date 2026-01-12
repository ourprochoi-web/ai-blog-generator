'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  triggerScraping,
  triggerGeneration,
  streamFullPipeline,
  getSchedulerStatus,
  getRecentActivityLogs,
  type PipelineProgressEvent,
  type ActivityLog,
} from '@/lib/admin-api';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'scrape' | 'generate' | 'evaluate' | 'pipeline';
  status: 'running' | 'success' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

interface PipelineStep {
  step: 'scrape' | 'evaluate' | 'generate';
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

export default function PipelinePage() {
  const [isScraping, setIsScraping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunningFull, setIsRunningFull] = useState(false);
  const [scrapeType, setScrapeType] = useState<'all' | 'news' | 'paper' | 'article'>('all');
  const [generateEdition, setGenerateEdition] = useState<'auto' | 'morning' | 'evening'>('auto');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [schedulerStatus, setSchedulerStatus] = useState<{
    running: boolean;
    next_run: string | null;
  } | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([
    { step: 'scrape', label: 'Scrape Sources', status: 'pending' },
    { step: 'evaluate', label: 'Evaluate with AI', status: 'pending' },
    { step: 'generate', label: 'Generate Articles', status: 'pending' },
  ]);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Load logs from database
  const loadLogs = useCallback(async () => {
    try {
      setIsLoadingLogs(true);
      const dbLogs = await getRecentActivityLogs(50);
      // Convert ActivityLog to LogEntry format
      const entries: LogEntry[] = dbLogs.map((log: ActivityLog) => ({
        id: log.id,
        timestamp: new Date(log.created_at).toLocaleTimeString(),
        type: log.type,
        status: log.status,
        message: log.message,
        details: log.details,
      }));
      setLogs(entries);
    } catch {
      // Failed to load logs, keep existing
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const status = await getSchedulerStatus();
        setSchedulerStatus(status);
      } catch {
        // Scheduler status not available
      }
      await loadLogs();
    }
    loadInitialData();

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [loadLogs]);

  const addLog = (type: 'scrape' | 'generate' | 'evaluate' | 'pipeline', status: 'running' | 'success' | 'error', message: string) => {
    const entry: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      status,
      message,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 50));
  };

  const handleFullPipeline = () => {
    setIsRunningFull(true);
    addLog('pipeline', 'running', 'Starting full pipeline...');

    // Reset pipeline steps
    setPipelineSteps([
      { step: 'scrape', label: 'Scrape Sources', status: 'pending' },
      { step: 'evaluate', label: 'Evaluate with AI', status: 'pending' },
      { step: 'generate', label: 'Generate Articles', status: 'pending' },
    ]);

    // Start streaming
    cleanupRef.current = streamFullPipeline(
      (event: PipelineProgressEvent) => {
        // Update pipeline step status
        if (event.step !== 'done' && event.step !== 'error') {
          setPipelineSteps((prev) =>
            prev.map((s) =>
              s.step === event.step
                ? { ...s, status: event.status === 'completed' ? 'completed' : event.status === 'error' ? 'error' : 'running', message: event.message }
                : s
            )
          );
        }

        // Add to log
        const logType = event.step === 'done' || event.step === 'error' ? 'pipeline' : event.step;
        const logStatus = event.status === 'completed' ? 'success' : event.status === 'error' ? 'error' : 'running';
        addLog(logType, logStatus, event.message);

        // Handle completion
        if (event.step === 'done' || event.step === 'error') {
          setIsRunningFull(false);
          // Reload logs from database after pipeline completes
          loadLogs();
        }
      },
      (error) => {
        addLog('pipeline', 'error', error.message);
        setIsRunningFull(false);
        loadLogs();
      },
      () => {
        cleanupRef.current = null;
      }
    );
  };

  const handleScrape = async () => {
    try {
      setIsScraping(true);
      addLog('scrape', 'running', `Starting scraping (type: ${scrapeType})...`);

      const result = await triggerScraping(scrapeType === 'all' ? undefined : scrapeType);

      addLog('scrape', 'success', `Scraped ${result.sources_count} sources`);
      await loadLogs(); // Reload logs from DB
    } catch (err) {
      addLog('scrape', 'error', err instanceof Error ? err.message : 'Scraping failed');
      await loadLogs();
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
      await loadLogs(); // Reload logs from DB
    } catch (err) {
      addLog('generate', 'error', err instanceof Error ? err.message : 'Generation failed');
      await loadLogs();
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

        {/* Pipeline Progress */}
        {isRunningFull && (
          <div style={styles.progressContainer}>
            {pipelineSteps.map((step, index) => (
              <div key={step.step} style={styles.progressStep}>
                <div style={styles.progressStepHeader}>
                  <span style={{
                    ...styles.progressIcon,
                    backgroundColor: step.status === 'completed' ? '#10B981' :
                      step.status === 'running' ? '#F59E0B' :
                      step.status === 'error' ? '#DC2626' : '#D1D5DB',
                  }}>
                    {step.status === 'completed' ? '✓' :
                     step.status === 'running' ? '⟳' :
                     step.status === 'error' ? '✕' : (index + 1)}
                  </span>
                  <span style={{
                    ...styles.progressLabel,
                    color: step.status === 'running' ? '#F59E0B' :
                           step.status === 'completed' ? '#10B981' :
                           step.status === 'error' ? '#DC2626' : '#6B7280',
                    fontWeight: step.status === 'running' ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
                {step.message && (step.status === 'running' || step.status === 'completed' || step.status === 'error') && (
                  <p style={styles.progressMessage}>{step.message}</p>
                )}
                {index < pipelineSteps.length - 1 && (
                  <div style={{
                    ...styles.progressLine,
                    backgroundColor: step.status === 'completed' ? '#10B981' : '#E5E7EB',
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
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
            Next scheduled run:{' '}
            <strong>
              {new Date(schedulerStatus.next_run).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })} KST
            </strong>
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
          <div style={styles.logHeaderActions}>
            <button
              onClick={loadLogs}
              disabled={isLoadingLogs}
              style={styles.refreshButton}
            >
              {isLoadingLogs ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div style={styles.logContainer}>
          {isLoadingLogs && logs.length === 0 ? (
            <p style={styles.emptyLog}>Loading activity logs...</p>
          ) : logs.length === 0 ? (
            <p style={styles.emptyLog}>No activity yet. Run a task to see logs here.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={styles.logEntry}>
                <span style={styles.logTimestamp}>{log.timestamp}</span>
                <span style={styles.logIcon}>{getStatusIcon(log.status)}</span>
                <span
                  style={{
                    ...styles.logType,
                    backgroundColor: log.type === 'scrape' ? '#DBEAFE' :
                                     log.type === 'evaluate' ? '#FEF3C7' :
                                     log.type === 'pipeline' ? '#D1FAE5' : '#E9D5FF',
                    color: log.type === 'scrape' ? '#1E40AF' :
                           log.type === 'evaluate' ? '#92400E' :
                           log.type === 'pipeline' ? '#065F46' : '#7C3AED',
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
  progressContainer: {
    marginTop: 24,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'left' as const,
    maxWidth: 400,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  progressStep: {
    position: 'relative' as const,
    paddingLeft: 40,
    paddingBottom: 16,
  },
  progressStepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  progressIcon: {
    position: 'absolute' as const,
    left: 0,
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: 'white',
  },
  progressLabel: {
    fontSize: 15,
  },
  progressMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 0,
  },
  progressLine: {
    position: 'absolute' as const,
    left: 13,
    top: 32,
    width: 2,
    height: 'calc(100% - 32px)',
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
  logHeaderActions: {
    display: 'flex',
    gap: 8,
  },
  refreshButton: {
    padding: '6px 12px',
    fontSize: 13,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    border: '1px solid #3B82F6',
    borderRadius: 4,
    cursor: 'pointer',
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
