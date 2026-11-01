export function parseCsv(text: string): Record<string, string>[];
export function slugify(value: string): string;
export function statusFromProposal(proposal: string): 'to_test' | 'pending' | 'rejected';
export function discountFromExcerpt(excerpt: string): string;
export function buildCatalog(input: { toolsCsv: string; candidatesCsv: string; manual: { descriptions: Record<string, string>; codes: { id: string; tool: string; code: string; status: string; discount?: string; creatorLink?: string; votes?: number; success?: number }[] } }): {
  categories: { slug: string; name: string; count: number; tracked: number }[];
  tools: { slug: string; name: string; category: string; website: string; description: string; priority: number; codes: number }[];
  codes: { id: string; tool: string; creator: string; code: string; discount: string; status: string; source: string; sourceTitle: string; creatorLink?: string; votes: number; success: number; note?: string }[];
  tracked: number;
};
