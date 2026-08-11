import { DSL_FUNCTIONS, type CompareOp, type DslFunction, type DslNode } from './ast.js';
import { DslParseError, tokenize, type Token } from './tokenizer.js';

const COMPARE_OPS = ['>', '>=', '<', '<=', '==', '!='];

export function parseExpression(source: string): DslNode {
  const parser = new Parser(tokenize(source));
  const node = parser.parseComparison();
  parser.expectEof();
  return node;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  expectEof(): void {
    const tok = this.peek();
    if (tok.type !== 'eof') {
      throw new DslParseError(`Unexpected token '${tokenText(tok)}'.`, tok.pos);
    }
  }

  parseComparison(): DslNode {
    const left = this.parseArith();
    const tok = this.peek();
    if (tok.type === 'op' && COMPARE_OPS.includes(tok.op)) {
      this.advance();
      const right = this.parseArith();
      const after = this.peek();
      if (after.type === 'op' && COMPARE_OPS.includes(after.op)) {
        throw new DslParseError('Chained comparisons are not supported.', after.pos);
      }
      return { kind: 'compare', op: tok.op as CompareOp, left, right };
    }
    return left;
  }

  private parseArith(): DslNode {
    let left = this.parseTerm();
    for (;;) {
      const tok = this.peek();
      if (tok.type === 'op' && (tok.op === '+' || tok.op === '-')) {
        this.advance();
        left = { kind: 'binary', op: tok.op, left, right: this.parseTerm() };
      } else {
        return left;
      }
    }
  }

  private parseTerm(): DslNode {
    let left = this.parseUnary();
    for (;;) {
      const tok = this.peek();
      if (tok.type === 'op' && ['*', '/', '%', '//'].includes(tok.op)) {
        this.advance();
        left = { kind: 'binary', op: tok.op as '*', left, right: this.parseUnary() };
      } else {
        return left;
      }
    }
  }

  private parseUnary(): DslNode {
    const tok = this.peek();
    if (tok.type === 'op' && (tok.op === '-' || tok.op === '+')) {
      this.advance();
      return { kind: 'unary', op: tok.op, operand: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): DslNode {
    const base = this.parsePrimary();
    const tok = this.peek();
    if (tok.type === 'op' && tok.op === '**') {
      this.advance();
      return { kind: 'binary', op: '**', left: base, right: this.parseUnary() };
    }
    return base;
  }

  private parsePrimary(): DslNode {
    const tok = this.peek();
    if (tok.type === 'eof') {
      throw new DslParseError('Unexpected end of expression.', tok.pos);
    }
    if (tok.type === 'number') {
      this.advance();
      return { kind: 'number', value: tok.value };
    }
    if (tok.type === 'ident') {
      this.advance();
      if (this.peek().type === 'lparen') {
        if (!(DSL_FUNCTIONS as readonly string[]).includes(tok.name)) {
          throw new DslParseError(`Unknown function '${tok.name}'.`, tok.pos);
        }
        this.advance();
        const args: DslNode[] = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseComparison());
          while (this.peek().type === 'comma') {
            this.advance();
            args.push(this.parseComparison());
          }
        }
        const close = this.peek();
        if (close.type !== 'rparen') {
          throw new DslParseError(`Unexpected token '${tokenText(close)}'; expected ')'.`, close.pos);
        }
        this.advance();
        return { kind: 'call', fn: tok.name as DslFunction, args };
      }
      return { kind: 'column', name: tok.name };
    }
    if (tok.type === 'lparen') {
      this.advance();
      const inner = this.parseComparison();
      const close = this.peek();
      if (close.type !== 'rparen') {
        if (close.type === 'eof') {
          throw new DslParseError("Unexpected end of expression; expected ')'.", close.pos);
        }
        throw new DslParseError(`Unexpected token '${tokenText(close)}'; expected ')'.`, close.pos);
      }
      this.advance();
      return inner;
    }
    throw new DslParseError(`Unexpected token '${tokenText(tok)}'.`, tok.pos);
  }
}

function tokenText(tok: Token): string {
  switch (tok.type) {
    case 'number':
      return String(tok.value);
    case 'ident':
      return tok.name;
    case 'op':
      return tok.op;
    case 'lparen':
      return '(';
    case 'rparen':
      return ')';
    case 'comma':
      return ',';
    case 'eof':
      return '<end>';
  }
}
