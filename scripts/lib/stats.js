/** Median, p95, spread: never one number per measurement. */
export const summarize = (values) => {
    const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) return { n: 0 };
    const at = (q) => {
        const index = (n - 1) * q;
        const low = Math.floor(index);
        const high = Math.ceil(index);
        return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
    };
    const mean = sorted.reduce((sum, value) => sum + value, 0) / n;
    const stdev = Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, n - 1));
    const round = (value) => Math.round(value * 100) / 100;
    return { n, median: round(at(0.5)), p95: round(at(0.95)), min: round(sorted[0]), max: round(sorted[n - 1]), mean: round(mean), stdev: round(stdev) };
};

/** Reads `--name value` and `--flag` from the command line, with defaults. */
export const args = (defaults) => {
    const result = { ...defaults };
    const argv = process.argv.slice(2);
    for (let index = 0; index < argv.length; index++) {
        const key = argv[index].replace(/^--/, '');
        if (!(key in defaults)) throw new Error(`Unknown option --${key}. Known: ${Object.keys(defaults).join(', ')}`);
        const next = argv[index + 1];
        if (typeof defaults[key] === 'boolean') result[key] = true;
        else {
            result[key] = typeof defaults[key] === 'number' ? Number(next) : next;
            index++;
        }
    }
    return result;
};
