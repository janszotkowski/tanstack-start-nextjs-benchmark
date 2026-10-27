'use client';

import type { SearchHit } from '@bench/data';
import { useEffect, useState } from 'react';
import { formatPrice, inputClass } from './classes.ts';

/** Live search against `/api/search`: the same client code calls each framework's API route. */
export const SearchBox = () => {
    const [q, setQ] = useState('');
    const [hits, setHits] = useState<SearchHit[]>([]);

    useEffect(() => {
        if (q.trim() === '') return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
                .then((response) => response.json() as Promise<SearchHit[]>)
                .then(setHits)
                .catch(() => {});
        }, 150);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q]);

    // An empty query shows nothing, without clearing state in the effect.
    const visible = q.trim() === '' ? [] : hits;

    return (
        <div className={'relative'}>
            <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder={'Quick search (API)'}
                aria-label={'Quick search'}
                className={inputClass}
            />
            {visible.length === 0 ? null : (
                <ul
                    className={
                        'absolute inset-x-0 top-10 z-10 divide-y divide-neutral-200 border border-neutral-200 bg-white text-sm dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950'
                    }
                >
                    {visible.map((hit) => (
                        <li key={hit.id}>
                            <a
                                href={`/products/${hit.id}`}
                                className={'flex justify-between px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-900'}
                            >
                                <span>{hit.name}</span>
                                <span className={'font-mono text-neutral-500'}>{formatPrice(hit.price)}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
