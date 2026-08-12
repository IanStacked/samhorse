// Behavioral coverage for scripts/health.sh — the health-contract emitter the
// dashboard runs live (MANAGED-PROJECTS.md). Exercises the three cases the
// script's case-arm has to tell apart: reachable (200), a non-200 response,
// and a refused connection — asserting the emitted JSON's `liveness` field
// each time, since a dead case-arm here previously reported "down" for an
// unreachable site instead of "unknown".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);
const ROOT = new URL('..', import.meta.url).pathname;
const SCRIPT = join(ROOT, 'scripts', 'health.sh');

async function runHealthCheck(url) {
  const { stdout } = await execFileAsync('bash', [SCRIPT], {
    env: { ...process.env, SAMHORSE_URL: url },
  });
  return JSON.parse(stdout);
}

async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('a reachable 200 response reports green', async () => {
  await withServer(
    (_req, res) => res.writeHead(200).end('ok'),
    async (url) => {
      const health = await runHealthCheck(url);
      assert.equal(health.liveness, 'green');
      assert.equal(health.services[0].status, 'green');
    },
  );
});

test('a non-200 response reports down', async () => {
  await withServer(
    (_req, res) => res.writeHead(500).end('error'),
    async (url) => {
      const health = await runHealthCheck(url);
      assert.equal(health.liveness, 'down');
      assert.equal(health.services[0].status, 'down');
    },
  );
});

test('a refused connection reports unknown', async () => {
  // Bind then immediately release a port so nothing is listening on it.
  const port = await new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
  const health = await runHealthCheck(`http://127.0.0.1:${port}/`);
  assert.equal(health.liveness, 'unknown');
  assert.equal(health.services[0].status, 'unknown');
});
