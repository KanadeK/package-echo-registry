import { format } from 'prettier';

export async function formatDemoReportJson(reportJson: string): Promise<string> {
  return format(reportJson, {
    parser: 'json',
  });
}
