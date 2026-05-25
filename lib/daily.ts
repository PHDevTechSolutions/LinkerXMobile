export function getRoomName(id: string): string {
  // Sanitize: Daily only allows alphanumeric and hyphens
  return `linkerx-${id}`.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 100);
}
