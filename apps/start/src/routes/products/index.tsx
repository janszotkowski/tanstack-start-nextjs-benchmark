import { Page, ProductFilters, ProductGrid, SearchBox } from '@bench/ui';
import { AppLink } from '@components/AppLink';
import { fetchProducts, parseProductSearch } from '@server/data';
import { createFileRoute } from '@tanstack/react-router';

const ProductsPage = () => {
    const query = Route.useSearch();
    return (
        <Page title={'Products'}>
            <SearchBox />
            <div className={'mt-6'}>
                <ProductFilters query={query} />
            </div>
            <div className={'mt-6'}>
                <ProductGrid
                    result={Route.useLoaderData()}
                    query={query}
                    Link={AppLink}
                />
            </div>
        </Page>
    );
};

export const Route = createFileRoute('/products/')({
    validateSearch: parseProductSearch,
    loaderDeps: (context) => context.search,
    loader: (context) => fetchProducts({ data: context.deps }),
    component: ProductsPage,
});
