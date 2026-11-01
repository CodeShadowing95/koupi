import { NextResponse } from 'next/server';
import { searchTools } from '@/lib/data';
import { getCatalog } from '@/lib/catalog-server';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') || '';
  const { tools } = await getCatalog();
  return NextResponse.json({ suggestions: searchTools(tools, query).slice(0, 8).map(tool => ({ type: 'tool', name: tool.name, slug: tool.slug, codes: tool.codes })) });
}
