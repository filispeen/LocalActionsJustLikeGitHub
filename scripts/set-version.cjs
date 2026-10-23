const fs = require('fs');

const tag = process.argv[2] || process.env.GITHUB_REF_NAME || '';
let version = tag.replace(/^v/, '');
if (!version) {
  version = '0.0.0-dev';
}

console.log(`Setting version: ${version}`);

const files = ['package.json', 'package-lock.json'];
for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, content.replaceAll('REPLACE_ME', version), 'utf8');
  }
}
