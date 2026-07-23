import type { ApiSnapshot, ChangeRecord, Evidence } from './model.js';

function normalizeSignature(signature: string): string {
  return signature.replace(/\s+/g, ' ').trim();
}

function changeEvidence(previous: ApiSnapshot, current: ApiSnapshot, detail: string): Evidence[] {
  return [
    {
      kind: 'api-report',
      path: previous.relativePath,
      detail,
    },
    {
      kind: 'api-report',
      path: current.relativePath,
      detail: `Compared with ${current.packageName}@${current.packageVersion}.`,
    },
  ];
}

export function diffApiSnapshots(previous: ApiSnapshot, current: ApiSnapshot): ChangeRecord[] {
  if (previous.packageName !== current.packageName) {
    throw new Error(
      `Cannot compare API snapshots for ${previous.packageName} and ${current.packageName}.`,
    );
  }

  const previousMembers = new Map(previous.members.map((member) => [member.id, member]));
  const currentMembers = new Map(current.members.map((member) => [member.id, member]));
  const changes: ChangeRecord[] = [];

  for (const member of [...previous.members].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const currentMember = currentMembers.get(member.id);
    if (!currentMember) {
      changes.push({
        id: `api-removed:${previous.packageName}:${member.id}`,
        packageName: previous.packageName,
        changeType: 'api-removed',
        severity: 'high',
        currentVersion: current.packageVersion,
        evidence: changeEvidence(
          previous,
          current,
          `${member.name} existed in ${previous.packageName}@${previous.packageVersion}.`,
        ),
        memberId: member.id,
        memberName: member.name,
        previousVersion: previous.packageVersion,
        previousSignature: normalizeSignature(member.signature),
      });
      continue;
    }

    const previousSignature = normalizeSignature(member.signature);
    const currentSignature = normalizeSignature(currentMember.signature);
    if (previousSignature !== currentSignature) {
      changes.push({
        id: `api-signature-changed:${previous.packageName}:${member.id}`,
        packageName: previous.packageName,
        changeType: 'api-signature-changed',
        severity: 'high',
        currentVersion: current.packageVersion,
        evidence: changeEvidence(
          previous,
          current,
          `${member.name} changed its normalized public signature.`,
        ),
        memberId: member.id,
        memberName: member.name,
        previousVersion: previous.packageVersion,
        previousSignature,
        currentSignature,
      });
    }
  }

  for (const member of [...current.members].sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (previousMembers.has(member.id)) {
      continue;
    }
    changes.push({
      id: `api-added:${current.packageName}:${member.id}`,
      packageName: current.packageName,
      changeType: 'api-added',
      severity: 'info',
      currentVersion: current.packageVersion,
      evidence: [
        {
          kind: 'api-report',
          path: current.relativePath,
          detail: `${member.name} was added in ${current.packageName}@${current.packageVersion}.`,
        },
      ],
      memberId: member.id,
      memberName: member.name,
      previousVersion: previous.packageVersion,
      currentSignature: normalizeSignature(member.signature),
    });
  }

  const order = {
    'api-removed': 0,
    'api-signature-changed': 1,
    'api-added': 2,
  } as const;
  return changes.sort(
    (left, right) =>
      order[left.changeType as keyof typeof order] -
        order[right.changeType as keyof typeof order] ||
      (left.memberName ?? '').localeCompare(right.memberName ?? ''),
  );
}
