interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * EBI Complex Portal MCP.
 *
 * Wraps the keyless EBI Complex Portal web service — a manually curated
 * database of stable macromolecular (protein) complexes. Search complexes by
 * name/gene/GO term/biological process and retrieve a complex's participants
 * (subunits), stoichiometry, function, and species. Keyless. Complements
 * UniProt / IntAct / STRING.
 *
 * Base: https://www.ebi.ac.uk/intact/complex-ws
 */


const BASE = 'https://www.ebi.ac.uk/intact/complex-ws';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_complexes',
    description:
      'Search the EBI Complex Portal — a manually curated database of stable macromolecular protein complexes — by protein/complex name, gene, GO term, or biological process (e.g. "apoptosis", "SCF", "ribosome"). Returns matching complexes with their accession (e.g. CPX-7762), name, description, and organism. Keyless. Complements UniProt/IntAct/STRING.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Protein/complex name, gene, or GO term, e.g. "apoptosis", "SCF", "ribosome".',
        },
        limit: { type: 'number', description: 'Max results to return (default 15, max 100).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_complex',
    description:
      "Get a single Complex Portal record by its accession (e.g. CPX-7762). Returns the complex's participants (subunits) with UniProt identifiers, biological roles and stoichiometry, plus systematic name, function, species, and description. Keyless. Complements UniProt/IntAct/STRING.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'A complex accession like "CPX-7762".' },
      },
      required: ['id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_complexes':
        return await searchComplexes(args);
      case 'get_complex':
        return await getComplex(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function searchComplexes(args: Record<string, unknown>): Promise<unknown> {
  const query = reqStr(args, 'query', '"apoptosis"');
  let limit = typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : 15;
  if (limit < 1) limit = 15;
  if (limit > 100) limit = 100;

  const url = `${BASE}/search/${encodeURIComponent(query)}?number=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) return { error: `Complex Portal: ${res.status}` };

  const data = (await res.json()) as {
    size?: number;
    totalNumberOfResults?: number;
    elements?: Array<{
      complexAC?: string;
      complexName?: string;
      description?: string;
      organismName?: string;
    }>;
  };

  const elements = Array.isArray(data.elements) ? data.elements : [];
  const complexes = elements.map((e) => ({
    id: e.complexAC,
    name: e.complexName,
    description: e.description,
    organism: e.organismName,
  }));

  return {
    total: data.totalNumberOfResults ?? data.size,
    count: complexes.length,
    complexes,
  };
}

async function getComplex(args: Record<string, unknown>): Promise<unknown> {
  const id = reqStr(args, 'id', '"CPX-7762"');

  const url = `${BASE}/complex/${encodeURIComponent(id)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  } catch {
    return { error: 'complex not found', id };
  }
  if (!res.ok) return { error: 'complex not found', id };

  let data: {
    complexAc?: string;
    name?: string;
    systematicName?: string;
    species?: string;
    description?: string;
    functions?: unknown;
    function?: unknown;
    participants?: Array<{
      identifier?: string;
      name?: string;
      bioRole?: string;
      stochiometry?: string;
    }>;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { error: 'complex not found', id };
  }

  // The web service returns `functions` as an array of strings; older/spec
  // naming is `function`. Tolerate both, and collapse to a single string.
  let fn: string | undefined;
  if (Array.isArray(data.functions)) fn = data.functions.filter((f) => typeof f === 'string').join(' ');
  else if (typeof data.functions === 'string') fn = data.functions;
  else if (Array.isArray(data.function)) fn = (data.function as unknown[]).filter((f) => typeof f === 'string').join(' ');
  else if (typeof data.function === 'string') fn = data.function;

  const participants = Array.isArray(data.participants)
    ? data.participants.map((p) => ({
        identifier: p.identifier,
        name: p.name,
        role: p.bioRole,
        stoichiometry: p.stochiometry,
      }))
    : [];

  return {
    id: data.complexAc ?? id,
    name: data.name,
    systematic_name: data.systematicName,
    species: data.species,
    description: data.description,
    function: fn,
    participants,
  };
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
