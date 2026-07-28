export { analyzeImpact } from './analyzeImpact.js';
export { diffApiSnapshots } from './apiDiff.js';
export {
  buildDownstreamGraph,
  evidenceForPath,
  findEvidencePath,
  listDownstreamTargets,
} from './dependencyGraph.js';
export { createMigrationTasks } from './migrationPlan.js';
export type * from './model.js';
export { redactSensitiveText, sanitizeReport } from './privacy.js';
export { PROJECT_METADATA } from './projectMetadata.js';
export { renderMarkdownReport } from './reportExport.js';
export { reportSchema } from './schema.js';
