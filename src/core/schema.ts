import { z } from 'zod';

const packageKindSchema = z.enum(['package', 'consumer', 'example']);
const relationshipSchema = z.enum(['dependency', 'devDependency', 'peerDependency']);
const releaseBumpSchema = z.enum(['major', 'minor', 'patch']);
const severitySchema = z.enum(['high', 'medium', 'low', 'info']);
const changeTypeSchema = z.enum([
  'api-added',
  'api-removed',
  'api-signature-changed',
  'peer-range-incompatible',
  'release-intent',
]);
const riskTypeSchema = z.enum(['breaking-api', 'example-breakage', 'peer-dependency']);
const evidenceKindSchema = z.enum(['api-report', 'changeset', 'manifest', 'source']);

function isRepositoryRelativePath(value: string): boolean {
  if (
    value.startsWith('/') ||
    value.startsWith('\\') ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.includes('\\') ||
    value.includes('\0')
  ) {
    return false;
  }
  return value.split('/').every((segment) => segment !== '..' && segment !== '.');
}

const repositoryPathSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine(isRepositoryRelativePath, 'Expected a repository-relative POSIX path.');

const evidenceSchema = z
  .object({
    kind: evidenceKindSchema,
    path: repositoryPathSchema,
    detail: z.string().min(1),
    line: z.number().int().positive().optional(),
  })
  .strict();

const changeSchema = z
  .object({
    id: z.string().min(1),
    packageName: z.string().min(1),
    changeType: changeTypeSchema,
    severity: severitySchema,
    currentVersion: z.string().min(1),
    evidence: z.array(evidenceSchema).min(1),
    memberId: z.string().min(1).optional(),
    memberName: z.string().min(1).optional(),
    previousVersion: z.string().min(1).optional(),
    previousSignature: z.string().min(1).optional(),
    currentSignature: z.string().min(1).optional(),
    releaseType: releaseBumpSchema.optional(),
  })
  .strict();

const graphNodeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    kind: packageKindSchema,
    manifestPath: repositoryPathSchema,
  })
  .strict();

const graphEdgeSchema = z
  .object({
    id: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1),
    relationship: relationshipSchema,
    range: z.string().min(1),
    evidencePath: repositoryPathSchema,
  })
  .strict();

const impactSchema = z
  .object({
    id: z.string().min(1),
    changeId: z.string().min(1),
    changeType: changeTypeSchema,
    changedPackage: z.string().min(1),
    targetPackage: z.string().min(1),
    targetKind: packageKindSchema,
    severity: severitySchema,
    riskType: riskTypeSchema,
    evidencePath: z.array(z.string().min(1)).min(2),
    evidence: z.array(evidenceSchema).min(1),
    memberName: z.string().min(1).optional(),
    sourceLocation: z
      .object({
        path: repositoryPathSchema,
        line: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const migrationTaskSchema = z
  .object({
    id: z.string().min(1),
    changeId: z.string().min(1),
    changedPackage: z.string().min(1),
    targetPackage: z.string().min(1),
    severity: severitySchema,
    title: z.string().min(1),
    action: z.string().min(1),
    evidencePath: z.array(z.string().min(1)).min(2),
    evidence: z.array(evidenceSchema).min(1),
  })
  .strict();

export const reportSchema = z
  .object({
    formatVersion: z.number().int().positive(),
    toolVersion: z.string().min(1),
    generatedAt: z.iso.datetime(),
    rootLabel: z
      .string()
      .min(1)
      .max(256)
      .refine(
        (value) => !value.includes('/') && !value.includes('\\') && !value.includes('\0'),
        'Expected a local root label rather than an absolute path.',
      ),
    summary: z
      .object({
        packages: z.number().int().nonnegative(),
        consumers: z.number().int().nonnegative(),
        examples: z.number().int().nonnegative(),
        changes: z.number().int().nonnegative(),
        breakingChanges: z.number().int().nonnegative(),
        impacts: z.number().int().nonnegative(),
        migrationTasks: z.number().int().nonnegative(),
      })
      .strict(),
    graph: z
      .object({
        nodes: z.array(graphNodeSchema),
        edges: z.array(graphEdgeSchema),
      })
      .strict(),
    changes: z.array(changeSchema),
    impacts: z.array(impactSchema),
    migrationTasks: z.array(migrationTaskSchema),
  })
  .strict();
