import type { Impact, MigrationTask } from './model.js';

function taskText(impact: Impact): Pick<MigrationTask, 'action' | 'title'> {
  if (impact.changeType === 'peer-range-incompatible') {
    return {
      title: `Review ${impact.targetPackage} peer range for ${impact.changedPackage}`,
      action: `Update the declared peer range, install ${impact.changedPackage}, and run the consumer test suite.`,
    };
  }

  const member = impact.memberName ?? 'changed API';
  return {
    title: `Migrate ${impact.targetPackage} away from ${member}`,
    action: `Update the evidenced usage path for ${member} and run the affected consumer or example tests.`,
  };
}

export function createMigrationTasks(impacts: Impact[]): MigrationTask[] {
  const tasks = new Map<string, MigrationTask>();

  for (const impact of impacts) {
    if (impact.severity === 'info' || impact.severity === 'low') {
      continue;
    }
    const id = `task:${impact.changeId}:${impact.targetPackage}`;
    if (tasks.has(id)) {
      continue;
    }
    const text = taskText(impact);
    tasks.set(id, {
      id,
      changeId: impact.changeId,
      changedPackage: impact.changedPackage,
      targetPackage: impact.targetPackage,
      severity: impact.severity,
      title: text.title,
      action: text.action,
      evidencePath: impact.evidencePath,
      evidence: impact.evidence,
    });
  }

  return [...tasks.values()].sort(
    (left, right) =>
      left.changedPackage.localeCompare(right.changedPackage) ||
      left.targetPackage.localeCompare(right.targetPackage) ||
      left.id.localeCompare(right.id),
  );
}
