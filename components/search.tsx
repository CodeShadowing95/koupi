'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchTools } from '@/lib/data';

export function Search({ placeholder = 'Hostinger, NordVPN, ElevenLabs…', button = 'Trouver le code' }: { placeholder?: string; button?: string }) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const suggestions = query.trim().length >= 2 ? searchTools(query).slice(0, 5) : [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (suggestions[0]) router.push(`/outils/${suggestions[0].slug}`);
    else if (query.trim()) router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="search-wrap">
      <form className="search-box" onSubmit={submit} role="search">
        <label htmlFor="q" className="sr-only">Nom de l&apos;outil</label>
        <input id="q" type="search" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} placeholder={placeholder} />
        <button className="search-button" type="submit">{button}</button>
      </form>
      {suggestions.length > 0 && (
        <div className="suggestions" aria-label="Suggestions">
          {suggestions.map(tool => (
            <button key={tool.slug} type="button" className="suggestion" onClick={() => router.push(`/outils/${tool.slug}`)}>
              <span className="tool-logo" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', color: 'var(--ink)', fontSize: 16 }}>
                <strong style={{ fontWeight: 600 }}>{tool.name}</strong>
                <span>{tool.category}</span>
              </span>
              <span>{tool.codes} code{tool.codes > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
