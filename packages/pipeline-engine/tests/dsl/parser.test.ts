import { parseExpression } from '../../src/dsl/parser';
import { dump } from '../../src/dsl/dump';
import { DslParseError } from '../../src/dsl/tokenizer';
import vectors from './vectors.json';

describe('parseExpression (shared vectors)', () => {
  for (const v of vectors.valid) {
    it(`parses: ${v.expr}`, () => {
      expect(dump(parseExpression(v.expr))).toBe(v.dump);
    });
  }

  for (const v of vectors.parseErrors) {
    it(`rejects: ${JSON.stringify(v.expr)}`, () => {
      try {
        parseExpression(v.expr);
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(DslParseError);
        expect((e as DslParseError).message).toContain(v.messageIncludes);
      }
    });
  }
});
