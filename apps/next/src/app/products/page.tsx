import { listProducts, parseCategory, parsePage, parseSort, type ProductQuery } from '@bench/data';
import { Page, ProductFilters, ProductGrid, SearchBox } from '@bench/ui';
import { AppLink } from '@components/AppLink';

export default async function ProductsPage(props: PageProps<'/products'>) {
    // Reading searchParams makes the page render on every request.
    const searchParams = await props.searchParams;
    const query: ProductQuery = {
        q: typeof searchParams['q'] === 'string' ? searchParams['q'] : undefined,
        category: parseCategory(searchParams['category']),
        sort: parseSort(searchParams['sort']),
        page: parsePage(searchParams['page']),
    };
    return (
        <Page title={'Products'}>
            <SearchBox />
            <div className={'mt-6'}>
                <ProductFilters query={query} />
            </div>
            <div className={'mt-6'}>
                <ProductGrid
                    result={listProducts(query)}
                    query={query}
                    Link={AppLink}
                />
            </div>
        </Page>
    );
}
