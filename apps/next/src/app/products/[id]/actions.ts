'use server';

import { addReview } from '@bench/data';
import { refresh } from 'next/cache';

export const createReview = async (productId: string, formData: FormData) => {
    addReview({
        productId,
        author: String(formData.get('author') ?? ''),
        rating: Number(formData.get('rating') ?? 5),
        text: String(formData.get('text') ?? ''),
    });
    refresh();
};
