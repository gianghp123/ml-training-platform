const fs = require('fs');
const path = require('path');
const ts = require(path.join(__dirname, '..', 'web', 'node_modules', 'typescript'));

const definitionsDir = path.join(__dirname, '..', 'web', 'features', 'builder', 'blocks', 'definitions');
const variables = new Map();
const blocks = [];

function unwrap(node) {
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
    node = node.expression;
  }
  return node;
}

function evaluate(node) {
  node = unwrap(node);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) {
    return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -evaluate(node.operand);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(evaluate);
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name)
        ? prop.name.text
        : prop.name.getText();
      result[key] = evaluate(prop.initializer);
    }
    return result;
  }
  if (ts.isIdentifier(node)) {
    if (!variables.has(node.text)) throw new Error(`Unknown identifier: ${node.text}`);
    return variables.get(node.text);
  }
  throw new Error(`Unsupported syntax: ${node.getText()}`);
}

for (const filename of fs.readdirSync(definitionsDir).filter((name) => name.endsWith('.ts')).sort()) {
  const sourceText = fs.readFileSync(path.join(definitionsDir, filename), 'utf8');
  const source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const value = evaluate(declaration.initializer);
      variables.set(declaration.name.text, value);
      if (value && typeof value === 'object' && !Array.isArray(value) && value.id && value.code && value.categoryId) {
        blocks.push({ symbol: declaration.name.text, sourceFile: filename, ...value });
      }
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'blocks.json'), JSON.stringify(blocks, null, 2), 'utf8');
console.log(`Extracted ${blocks.length} blocks.`);
