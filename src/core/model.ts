export type PackageKind = 'package' | 'consumer' | 'example';
export type DependencyRelationship = 'dependency' | 'devDependency' | 'peerDependency';
export type ReleaseBump = 'major' | 'minor' | 'patch';
export type Severity = 'high' | 'medium' | 'low' | 'info';
export type ApiChangeType = 'api-added' | 'api-removed' | 'api-signature-changed';
export type ChangeType = ApiChangeType | 'peer-range-incompatible' | 'release-intent';
export type RiskType = 'breaking-api' | 'example-breakage' | 'peer-dependency';
export type EvidenceKind = 'api-report' | 'changeset' | 'manifest' | 'source';

export interface PackageManifest {
  name: string;
  version: string;
  relativePath: string;
  kind: PackageKind;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

export interface ApiMember {
  id: string;
  name: string;
  kind: string;
  signature: string;
}

export interface ApiSnapshot {
  packageName: string;
  packageVersion: string;
  relativePath: string;
  members: ApiMember[];
}

export interface ChangesetRelease {
  name: string;
  type: ReleaseBump;
}

export interface ChangesetRecord {
  id: string;
  summary: string;
  relativePath: string;
  releases: ChangesetRelease[];
}

export interface SourceUsage {
  consumerName: string;
  consumerFile: string;
  importedPackage: string;
  importedMembers: string[];
  line: number;
}

export interface AnalysisInput {
  rootLabel: string;
  manifests: PackageManifest[];
  previousApiSnapshots: ApiSnapshot[];
  currentApiSnapshots: ApiSnapshot[];
  changesets: ChangesetRecord[];
  sourceUsages: SourceUsage[];
}

export interface Evidence {
  kind: EvidenceKind;
  path: string;
  detail: string;
  line?: number;
}

export interface ChangeRecord {
  id: string;
  packageName: string;
  changeType: ChangeType;
  severity: Severity;
  currentVersion: string;
  evidence: Evidence[];
  memberId?: string;
  memberName?: string;
  previousVersion?: string;
  previousSignature?: string;
  currentSignature?: string;
  releaseType?: ReleaseBump;
}

export interface GraphNode {
  id: string;
  name: string;
  version: string;
  kind: PackageKind;
  manifestPath: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationship: DependencyRelationship;
  range: string;
  evidencePath: string;
}

export interface DownstreamGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SourceLocation {
  path: string;
  line?: number;
}

export interface Impact {
  id: string;
  changeId: string;
  changeType: ChangeType;
  changedPackage: string;
  targetPackage: string;
  targetKind: PackageKind;
  severity: Severity;
  riskType: RiskType;
  evidencePath: string[];
  evidence: Evidence[];
  memberName?: string;
  sourceLocation?: SourceLocation;
}

export interface MigrationTask {
  id: string;
  changeId: string;
  changedPackage: string;
  targetPackage: string;
  severity: Severity;
  title: string;
  action: string;
  evidencePath: string[];
  evidence: Evidence[];
}

export interface ReportSummary {
  packages: number;
  consumers: number;
  examples: number;
  changes: number;
  breakingChanges: number;
  impacts: number;
  migrationTasks: number;
}

export interface AnalysisReport {
  formatVersion: number;
  toolVersion: string;
  generatedAt: string;
  rootLabel: string;
  summary: ReportSummary;
  graph: DownstreamGraph;
  changes: ChangeRecord[];
  impacts: Impact[];
  migrationTasks: MigrationTask[];
}

export interface AnalysisOptions {
  now: () => Date;
}
