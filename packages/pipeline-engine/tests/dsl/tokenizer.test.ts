import { DslParseError, tokenize } from '../../src/dsl/tokenizer';

describe('tokenize', () => {
  it('tokenizes numbers, idents and operators', () => {
    expect(tokenize('Income / (Age + 1.5)').map((t) => t.type)).toEqual([
      'ident', 'op', 'lparen', 'ident', 'op', 'number', 'rparen', 'eof',
    ]);
  });

  it('tokenizes ** and // before * and /', () => {
    const ops = tokenize('A ** 2 // B % C').filter((t) => t.type === 'op').map((t) => (t as { op: string }).op);
    expect(ops).toEqual(['**', '//', '%']);
  });

  it('tokenizes comparison operators', () => {
    const ops = tokenize('A >= 1 == B != C <= D < E > F').filter((t) => t.type === 'op').map((t) => (t as { op: string }).op);
    expect(ops).toEqual(['>=', '==', '!=', '<=', '<', '>']);
  });

  it('tokenizes commas for function calls', () => {
    expect(tokenize('clip(A, 0, 100)').map((t) => t.type)).toEqual([
      'ident', 'lparen', 'ident', 'comma', 'number', 'comma', 'number', 'rparen', 'eof',
    ]);
  });

  it('rejects ^ with a hint to use **', () => {
    expect(() => tokenize('A ^ 2')).toThrow(DslParseError);
    try {
      tokenize('A ^ 2');
      fail('should have thrown');
    } catch (e) {
      expect((e as DslParseError).message).toContain('**');
      expect((e as DslParseError).position).toBe(2);
    }
  });

  it('rejects string literals', () => {
    expect(() => tokenize("'hello'")).toThrow(/String literals/);
    expect(() => tokenize('"hello"')).toThrow(/String literals/);
  });

  it('rejects unexpected characters with position', () => {
    try {
      tokenize('A @ B');
      fail('should have thrown');
    } catch (e) {
      expect((e as DslParseError).position).toBe(2);
    }
  });
});
