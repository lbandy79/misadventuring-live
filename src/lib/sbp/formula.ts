/**
 * Evaluate the small arithmetic formulas the rules data uses for
 * level-dependent values, e.g. `level + CON` or `proficiency_bonus`.
 *
 * Tokens (per `$conventions.scaling`): `level`, `proficiency_bonus`, and the
 * six ability keys, which stand for MODIFIERS. Supports + - * / and
 * parentheses over integers. Anything else evaluates to null rather than
 * throwing, so one odd formula can't take a whole sheet down.
 */

export interface FormulaContext {
  level: number;
  proficiency_bonus: number;
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Token[] | null {
  const out: Token[] = [];
  const re = /\s*(?:(\d+)|([A-Za-z_][A-Za-z0-9_]*)|([+\-*/()]))/gy;
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) return null;
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: 'id', v: m[2] });
    else out.push({ t: 'op', v: m[3] });
    i = re.lastIndex;
    if (i === m.index) return null;
  }
  return out;
}

export function evaluateFormula(formula: string, ctx: FormulaContext): number | null {
  const tokens = tokenize(formula.trim());
  if (!tokens || tokens.length === 0) return null;
  let pos = 0;
  let failed = false;

  const peek = () => tokens[pos];
  const take = () => tokens[pos++];

  function primary(): number {
    const tok = take();
    if (!tok) { failed = true; return 0; }
    if (tok.t === 'num') return tok.v;
    if (tok.t === 'id') {
      const v = (ctx as unknown as Record<string, unknown>)[tok.v];
      if (typeof v !== 'number') { failed = true; return 0; }
      return v;
    }
    if (tok.v === '(') {
      const v = expr();
      const close = take();
      if (!close || close.t !== 'op' || close.v !== ')') failed = true;
      return v;
    }
    if (tok.v === '-') return -primary();
    failed = true;
    return 0;
  }

  function term(): number {
    let v = primary();
    for (;;) {
      const tok = peek();
      if (!tok || tok.t !== 'op' || (tok.v !== '*' && tok.v !== '/')) return v;
      take();
      const rhs = primary();
      if (tok.v === '*') v *= rhs;
      else if (rhs === 0) { failed = true; return 0; }
      else v = Math.floor(v / rhs);
    }
  }

  function expr(): number {
    let v = term();
    for (;;) {
      const tok = peek();
      if (!tok || tok.t !== 'op' || (tok.v !== '+' && tok.v !== '-')) return v;
      take();
      const rhs = term();
      v = tok.v === '+' ? v + rhs : v - rhs;
    }
  }

  const result = expr();
  if (failed || pos !== tokens.length) return null;
  return result;
}
