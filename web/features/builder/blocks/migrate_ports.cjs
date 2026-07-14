const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'definitions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/inputSchema:\s*\[([\s\S]*?)\],\s*outputSchema:\s*\[([\s\S]*?)\]/g, (match, p1, p2) => {
    const parsePorts = (str, direction) => {
      const portRegex = /\{\s*name:\s*["']([^"']+)["']\s*,\s*type:\s*["']([^"']+)["']\s*(?:,\s*label:\s*["']([^"']+)["'])?(?:,\s*optional:\s*(true|false))?(?:,\s*meta:\s*\{[^\}]*\})?\s*\}/g;
      const ports = [];
      let m;
      while ((m = portRegex.exec(str)) !== null) {
        const id = m[1];
        const artifact = m[2];
        const label = m[3] || id;
        const required = m[4] === 'true' ? false : true;
        ports.push(`\n      { id: "${id}", label: "${label}", direction: "${direction}", artifact: "${artifact}", required: ${required}, multiple: ${direction === 'input' ? 'false' : 'true'} }`);
      }
      return ports.join(',');
    };

    const inputs = parsePorts(p1, 'input');
    const outputs = parsePorts(p2, 'output');
    
    let portsStr = '';
    if (inputs) portsStr += inputs + (outputs ? ',' : '');
    if (outputs) portsStr += outputs;
    
    return `portSchema: { ports: [${portsStr}\n    ] }`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Migrated ${file}`);
}
