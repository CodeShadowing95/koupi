import catalog from './catalog.json';

// Le catalogue est généré par `npm run catalog` (scripts/build-catalog.mjs) à partir de data/.
export type Category = { slug:string; name:string; count:number };
export type Tool = { slug:string; name:string; category:string; website:string; description:string; priority:number; codes:number };
export type CodeStatus = 'verified'|'to_test'|'pending'|'rejected';
export type Code = { id:string; tool:string; creator:string; code:string; discount:string; status:CodeStatus; source:string; sourceTitle:string; creatorLink?:string; votes:number; success:number; note?:string };

export const tools: Tool[] = catalog.tools;
export const codes: Code[] = catalog.codes as Code[];
/** Nombre d'outils suivis par le sourcing, même sans code publié. */
export const trackedTools: number = catalog.tracked;

/** Un code est visible sur le site s'il est vérifié ou à tester. En attente et rejeté restent dans l'admin. */
export function isPublic(code: Pick<Code,'status'>){return code.status==='verified'||code.status==='to_test'}

/** Toutes les catégories suivies (formulaire de proposition, filtres admin), y compris celles sans outil publié. */
export const categories: Category[] = catalog.categories;

export function findTool(slug:string){return tools.find(tool=>tool.slug===slug)}
export function findCode(id:string){return codes.find(code=>code.id===id)}
export function toolCodes(tool:string){return codes.filter(code=>code.tool.toLowerCase()===tool.toLowerCase())}
export function searchTools(query:string){const q=query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s/g,'');return tools.filter(t=>t.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s/g,'').includes(q))}
