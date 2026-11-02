export type LogoTool = { slug: string; name: string; website: string };
export function mergeTools(
  dbTools: Array<LogoTool & { archived: boolean }>,
  catalogTools: LogoTool[],
): LogoTool[];
