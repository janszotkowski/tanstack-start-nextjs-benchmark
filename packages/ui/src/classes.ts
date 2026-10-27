export const inputClass = 'h-9 w-full border border-neutral-300 bg-transparent px-3 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100';

export const buttonClass = 'h-9 rounded-full bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900';

export const linkClass = 'underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 dark:decoration-neutral-700 dark:hover:decoration-neutral-100';

export const formatPrice = (price: number): string => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
