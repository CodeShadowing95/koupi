import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

function clean(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }
function validUrl(value: string): boolean { try { const url=new URL(value); return (url.protocol==='https:'||url.protocol==='http:') && Boolean(url.hostname); } catch { return false; } }
export async function POST(request: Request){
  try {
    const body=await request.json() as Record<string, unknown>;
    const toolName=clean(body.toolName,120), creatorName=clean(body.creatorName,160), code=clean(body.code,120), discountLabel=clean(body.discountLabel,240), sourceUrl=clean(body.sourceUrl,1000);
    const creatorLink=clean(body.creatorLink,1000), comment=clean(body.comment,2000), submitterEmail=clean(body.submitterEmail,320);
    if(!toolName||!creatorName||!code||!discountLabel||!validUrl(sourceUrl)) return NextResponse.json({error:'Vérifie les champs obligatoires et le lien source.'},{status:400});
    if(creatorLink&&!validUrl(creatorLink)) return NextResponse.json({error:'Le lien du créateur doit être une URL valide.'},{status:400});
    if(submitterEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) return NextResponse.json({error:'L’adresse e-mail semble invalide.'},{status:400});
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const salt=process.env.HASH_SALT||'koupi-development-salt';
    const ipHash=createHash('sha256').update(`${salt}:${ip}`).digest('hex');
    const fingerprint=createHash('sha256').update(`${toolName.toLocaleLowerCase('fr-FR')}::${code.toLocaleLowerCase('fr-FR')}`).digest('hex');
    const client=getAdminClient();
    const {data: duplicate}=await client.from('submissions').select('id').eq('fingerprint',fingerprint).in('status',['new','approved']).limit(1).maybeSingle();
    const {error}=await client.from('submissions').insert({tool_name:toolName,creator_name:creatorName,code,discount_label:discountLabel,source_url:sourceUrl,creator_link:creatorLink||null,comment:comment||null,submitter_email:submitterEmail||null,ip_hash:ipHash,fingerprint,status:duplicate?'duplicate':'new',admin_note:duplicate?'Proposition similaire déjà présente.':null});
    if(error) throw error;
    return NextResponse.json({ok:true});
  } catch (error) { console.error('submission create failed',error); return NextResponse.json({error:'Impossible d’enregistrer la proposition pour le moment.'},{status:500}); }
}
