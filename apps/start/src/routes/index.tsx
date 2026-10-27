import { Home } from '@bench/ui';
import { AppLink } from '@components/AppLink';
import { createFileRoute } from '@tanstack/react-router';

const HomePage = () => <Home Link={AppLink} />;

export const Route = createFileRoute('/')({
    component: HomePage,
});
