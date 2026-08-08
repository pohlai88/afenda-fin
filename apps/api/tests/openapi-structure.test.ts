import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument, createApi } from '../src/create-api.ts';
import { checkOpenApiDrift } from '../scripts/check-openapi-drift.ts';
import { renderOpenApiJson } from '../scripts/generate-openapi.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const committedPath = path.join(__dirname, '..', 'openapi.json');

describe('OpenAPI document', () => {
  it('matches committed openapi.json (drift check)', () => {
    const report = checkOpenApiDrift(committedPath);
    expect(report.ok).toBe(true);
  });

  it('runtime GET /openapi.json matches committed document', async () => {
    const app = createApi();
    const res = await app.request('/openapi.json');
    expect(res.status).toBe(200);
    const runtime = await res.json();
    const committed = JSON.parse(readFileSync(committedPath, 'utf8')) as unknown;
    expect(runtime).toEqual(committed);
  });

  it('renderOpenApiJson equals committed file bytes', () => {
    const committed = readFileSync(committedPath, 'utf8');
    expect(renderOpenApiJson()).toBe(committed);
  });

  it('declares Money minorUnits as string, not number', () => {
    const doc = buildOpenApiDocument() as {
      components?: { schemas?: Record<string, { properties?: Record<string, { type?: string }>; required?: string[] }> };
    };
    const money = doc.components?.schemas?.['MoneyWire'];
    expect(money).toBeDefined();
    expect(money?.properties?.['minorUnits']?.type).toBe('string');
    expect(money?.properties?.['currency']?.type).toBe('string');
    expect(money?.required).toEqual(expect.arrayContaining(['currency', 'minorUnits']));
  });

  it('requires both AsOf boundaries', () => {
    const doc = buildOpenApiDocument() as {
      components?: { schemas?: Record<string, { required?: string[] }> };
    };
    const asOf = doc.components?.schemas?.['AsOfWire'];
    expect(asOf?.required).toEqual(expect.arrayContaining(['businessAsOf', 'knowledgeAsOf']));
  });

  it('PublicFailureWire has no cause field', () => {
    const doc = buildOpenApiDocument() as {
      components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> };
    };
    const failure = doc.components?.schemas?.['PublicFailureWire'];
    expect(failure?.properties).toBeDefined();
    expect(failure?.properties).not.toHaveProperty('cause');
  });

  it('documents 422 on all verify routes', () => {
    const doc = buildOpenApiDocument() as {
      paths?: Record<string, { post?: { responses?: Record<string, unknown> } }>;
    };
    const verifyPaths = [
      '/_afenda/verify/money',
      '/_afenda/verify/instant',
      '/_afenda/verify/civil-date',
      '/_afenda/verify/as-of',
    ];
    for (const p of verifyPaths) {
      expect(doc.paths?.[p]?.post?.responses?.['422'], p).toBeDefined();
    }
  });
});
