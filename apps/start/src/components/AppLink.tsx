import type { LinkProps } from '@bench/ui';
import { Link } from '@tanstack/react-router';

/**
 * The shared components take plain string hrefs. The router parses `href` into path and search itself, but its types
 * still ask for a typed `to`, so the route type is asserted here, like `as Route` in the Next app.
 * The app's own links would use typed `to`, `params` and `search`.
 */
export const AppLink = (props: LinkProps) => (
    <Link
        to={undefined as never}
        href={props.href}
        className={props.className}
    >
        {props.children}
    </Link>
);
