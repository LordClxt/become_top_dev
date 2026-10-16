// Transforme la sortie de tsc en un test au format `go test -json`, que la plateforme sait lire.
import { readFileSync } from 'node:fs';

const NAME = 'Vérification des types (tsc --strict)';
const raw = readFileSync(process.argv[2], 'utf8').trim();
const emit = (ev) => console.log(JSON.stringify({ Test: NAME, ...ev }));
if (raw) {
  // « tests/types.ts(12,3): error TS2322: … » → « tests/types.ts:12:3 TS2322 : … »
  const lines = raw.split('\n').map((l) =>
    l.replace(/^\/?(?:work\/)?(.+?)\((\d+),(\d+)\): error (TS\d+): /, '$1:$2:$3 $4 : '));
  emit({ Action: 'output', Output: lines.join('\n') + '\n' });
  emit({ Action: 'fail' });
} else {
  emit({ Action: 'pass' });
}
