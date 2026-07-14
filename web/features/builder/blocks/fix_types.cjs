const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'definitions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // We need to add import type { BlockPort } if it's missing, but we can just use `as import('@/lib/models').BlockPort[]`
  // Wait, `import type { BlockDefinition } from '@/lib/models';` is already there. We can replace it with `import type { BlockDefinition, BlockPort } from '@/lib/models';`
  
  if (!content.includes('BlockPort') && content.includes('BlockDefinition')) {
      content = content.replace(/import type { BlockDefinition } from '@\/lib\/models';/, "import type { BlockDefinition, BlockPort } from '@/lib/models';");
  }

  // Now find `const xxxPorts = [` and replace with `const xxxPorts: BlockPort[] = [`
  content = content.replace(/const ([a-zA-Z0-9_]+Ports) = \[/g, "const $1: BlockPort[] = [");
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed types in ${file}`);
}
