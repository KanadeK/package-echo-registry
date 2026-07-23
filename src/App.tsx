import {
  ArrowClockwise,
  Cube,
  DownloadSimple,
  FileArrowUp,
  Funnel,
  GitBranch,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { parseReportJson, serializeReportJson } from './adapters/reportImportAdapter.js';
import type { AnalysisReport, Impact, RiskType, Severity } from './core/model.js';
import { renderMarkdownReport } from './core/reportExport.js';
import { ImpactGraph } from './features/graph/ImpactGraph.js';
import { ImpactDetail } from './features/report/ImpactDetail.js';
import { ImpactList } from './features/report/ImpactList.js';
import { MigrationPanel } from './features/report/MigrationPanel.js';
import { SummaryStrip } from './features/report/SummaryStrip.js';

type SeverityFilter = 'all' | Severity;
type RiskFilter = 'all' | RiskType;

function downloadText(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(
    new Blob([content], {
      type,
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The report could not be loaded.';
}

export default function App() {
  const [report, setReport] = useState<AnalysisReport>();
  const [reportRevision, setReportRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedImpactId, setSelectedImpactId] = useState<string>();
  const [selectedNode, setSelectedNode] = useState<string>();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [search, setSearch] = useState('');

  const acceptReport = useCallback((nextReport: AnalysisReport): void => {
    setReport(nextReport);
    setReportRevision((current) => current + 1);
    setSelectedImpactId(nextReport.impacts[0]?.id);
    setSelectedNode(undefined);
    setSeverityFilter('all');
    setRiskFilter('all');
    setSearch('');
    setError(undefined);
  }, []);

  const fetchDemo = useCallback(async (signal?: AbortSignal): Promise<AnalysisReport> => {
    const response = await fetch(`${import.meta.env.BASE_URL}demo-report.json`, { signal });
    if (!response.ok) {
      throw new Error(`Demo report request failed with HTTP ${response.status}.`);
    }
    return parseReportJson(await response.text());
  }, []);

  const loadDemo = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      acceptReport(await fetchDemo());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [acceptReport, fetchDemo]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDemo(controller.signal)
      .then(acceptReport)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [acceptReport, fetchDemo]);

  const handleReportFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    void file
      .text()
      .then((content) => {
        acceptReport(parseReportJson(content));
      })
      .catch((loadError: unknown) => {
        setError(errorMessage(loadError));
      });
  };

  const filteredImpacts = useMemo(() => {
    if (!report) {
      return [];
    }
    const query = search.trim().toLocaleLowerCase();
    return report.impacts.filter((impact) => {
      const matchesSeverity = severityFilter === 'all' || impact.severity === severityFilter;
      const matchesRisk = riskFilter === 'all' || impact.riskType === riskFilter;
      const matchesNode = !selectedNode || impact.evidencePath.includes(selectedNode);
      const searchable = [
        impact.changedPackage,
        impact.targetPackage,
        impact.memberName ?? '',
        impact.changeType,
        ...impact.evidencePath,
      ]
        .join(' ')
        .toLocaleLowerCase();
      return (
        matchesSeverity && matchesRisk && matchesNode && (!query || searchable.includes(query))
      );
    });
  }, [report, riskFilter, search, selectedNode, severityFilter]);

  const selectedImpact: Impact | undefined =
    filteredImpacts.find((impact) => impact.id === selectedImpactId) ?? filteredImpacts[0];

  const focusNode = (nodeId: string): void => {
    setSelectedNode((current) => (current === nodeId ? undefined : nodeId));
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href="#report" aria-label="Package Echo Registry report">
            <span className="brand-mark">
              <Cube aria-hidden="true" size={22} weight="duotone" />
            </span>
            <span>Package Echo Registry</span>
          </a>
          <div className="header-actions">
            <label className="btn" htmlFor="report-file">
              <FileArrowUp aria-hidden="true" size={17} />
              Open report
            </label>
            <input
              accept="application/json,.json"
              className="sr-only"
              id="report-file"
              onChange={handleReportFile}
              type="file"
            />
            <button className="btn" onClick={() => void loadDemo()} type="button">
              <ArrowClockwise aria-hidden="true" size={17} />
              Reset demo
            </button>
          </div>
        </div>
      </header>

      <main className="app-main" id="report">
        <section className="report-intro" aria-labelledby="report-title">
          <div>
            <p className="context-label">Local monorepo analysis</p>
            <h1 id="report-title">Downstream impact report</h1>
            <p>
              Follow each package change to the consumer file, example, and migration action it can
              affect.
            </p>
          </div>
          <div className="export-actions">
            <button
              className="btn btn-primary"
              disabled={!report}
              onClick={() =>
                report &&
                downloadText(
                  'package-echo-report.json',
                  serializeReportJson(report),
                  'application/json',
                )
              }
              type="button"
            >
              <DownloadSimple aria-hidden="true" size={17} />
              Export JSON
            </button>
            <button
              className="btn"
              disabled={!report}
              onClick={() =>
                report &&
                downloadText(
                  'package-echo-report.md',
                  renderMarkdownReport(report),
                  'text/markdown',
                )
              }
              type="button"
            >
              <DownloadSimple aria-hidden="true" size={17} />
              Export Markdown
            </button>
          </div>
        </section>

        {error ? (
          <div className="flash flash-error error-banner" role="alert">
            <strong>Report error</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {loading && !report ? (
          <div className="loading-state" aria-label="Loading demo report" role="status">
            <div />
            <div />
            <div />
          </div>
        ) : null}

        {report ? (
          <>
            <SummaryStrip summary={report.summary} />

            <section className="panel graph-panel" aria-labelledby="graph-heading">
              <div className="panel-heading">
                <div>
                  <h2 id="graph-heading">Downstream graph</h2>
                  <p>Select a node to focus the impact list.</p>
                </div>
                <GitBranch aria-hidden="true" size={24} />
              </div>
              <ImpactGraph
                graph={report.graph}
                onSelectNode={focusNode}
                selectedNode={selectedNode}
              />
              <div className="graph-legend" aria-label="Graph legend">
                <span>Package</span>
                <span>Consumer</span>
                <span>Example</span>
                {selectedNode ? (
                  <button
                    className="Link--primary"
                    onClick={() => setSelectedNode(undefined)}
                    type="button"
                  >
                    Clear node focus
                  </button>
                ) : null}
              </div>
            </section>

            <section className="panel filters-panel" aria-labelledby="filters-heading">
              <div className="panel-heading compact-heading">
                <div>
                  <h2 id="filters-heading">Filter impacts</h2>
                  <p>{filteredImpacts.length} matching results</p>
                </div>
                <Funnel aria-hidden="true" size={22} />
              </div>
              <div className="filter-grid">
                <label>
                  <span>Search</span>
                  <span className="input-with-icon">
                    <MagnifyingGlass aria-hidden="true" size={17} />
                    <input
                      className="form-control"
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Package, member, or path"
                      type="search"
                      value={search}
                    />
                  </span>
                </label>
                <label>
                  <span>Severity</span>
                  <select
                    className="form-select"
                    onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
                    value={severityFilter}
                  >
                    <option value="all">All severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                  </select>
                </label>
                <label>
                  <span>Risk</span>
                  <select
                    className="form-select"
                    onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
                    value={riskFilter}
                  >
                    <option value="all">All risk types</option>
                    <option value="breaking-api">Breaking API</option>
                    <option value="peer-dependency">Peer dependency</option>
                    <option value="example-breakage">Example breakage</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="impact-workspace" aria-label="Impact explorer">
              <div className="panel impact-results">
                <div className="panel-heading compact-heading">
                  <div>
                    <h2>Impact results</h2>
                    <p>Ordered by package and target.</p>
                  </div>
                </div>
                <ImpactList
                  impacts={filteredImpacts}
                  onSelectImpact={setSelectedImpactId}
                  selectedImpactId={selectedImpact?.id}
                />
              </div>
              <div className="panel detail-panel">
                <ImpactDetail impact={selectedImpact} />
              </div>
            </section>

            <MigrationPanel key={reportRevision} tasks={report.migrationTasks} />
          </>
        ) : null}
      </main>

      <footer className="app-footer">
        <p>
          Analysis stays local. The viewer accepts versioned report JSON and does not upload
          repository files.
        </p>
      </footer>
    </div>
  );
}
