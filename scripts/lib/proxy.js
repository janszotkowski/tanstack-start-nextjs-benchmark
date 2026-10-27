import { createServer, request } from 'node:http';
import { constants, createBrotliCompress, createGzip } from 'node:zlib';

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;

/**
 * The reverse proxy in front of both apps for browser measurements: compresses on the fly like a typical nginx/Caddy setup
 * (brotli 4, else gzip 6), and changes nothing else. Neither app compresses by itself, so both get exactly the same treatment.
 */
export const startProxy = (target, port) =>
    new Promise((resolve) => {
        const upstream = new URL(target);
        const server = createServer((incoming, outgoing) => {
            const forward = request(
                { host: upstream.hostname, port: upstream.port, method: incoming.method, path: incoming.url, headers: { ...incoming.headers, 'accept-encoding': 'identity' } },
                (response) => {
                    const accept = String(incoming.headers['accept-encoding'] ?? '');
                    const type = String(response.headers['content-type'] ?? '');
                    const encoding = !COMPRESSIBLE.test(type) || response.statusCode === 304 ? null : accept.includes('br') ? 'br' : accept.includes('gzip') ? 'gzip' : null;
                    const headers = { ...response.headers };
                    if (encoding !== null) {
                        delete headers['content-length'];
                        headers['content-encoding'] = encoding;
                        headers.vary = headers.vary ? `${headers.vary}, Accept-Encoding` : 'Accept-Encoding';
                    }
                    outgoing.writeHead(response.statusCode ?? 502, headers);
                    if (encoding === null) return void response.pipe(outgoing);
                    const compressor = encoding === 'br' ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }) : createGzip({ level: 6 });
                    response.pipe(compressor).pipe(outgoing);
                },
            );
            forward.on('error', () => outgoing.headersSent || outgoing.writeHead(502).end());
            incoming.pipe(forward);
        });
        server.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${port}`, stop: () => new Promise((done) => server.close(done)) }));
    });
