import { CheckCircle } from '@phosphor-icons/react';
import { useState } from 'react';

import type { MigrationTask } from '../../core/model.js';

export function MigrationPanel({ tasks }: { tasks: MigrationTask[] }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (taskId: string): void => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  return (
    <section className="panel migration-panel" aria-labelledby="migration-heading">
      <div className="panel-heading">
        <div>
          <h2 id="migration-heading">Migration checklist</h2>
          <p>
            {completed.size} of {tasks.length} reviewed in this session
          </p>
        </div>
        <CheckCircle aria-hidden="true" size={24} />
      </div>
      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>No migration tasks were generated.</p>
        </div>
      ) : (
        <div className="migration-list">
          {tasks.map((task) => (
            <label className="migration-task" key={task.id}>
              <input
                checked={completed.has(task.id)}
                onChange={() => toggle(task.id)}
                type="checkbox"
              />
              <span>
                <strong>{task.title}</strong>
                <span>{task.action}</span>
                <code>{task.evidencePath.join(' -> ')}</code>
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
