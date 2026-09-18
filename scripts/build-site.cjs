const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const dest = path.join(root, 'dist');
  if (path.dirname(dest) !== root || path.basename(dest) !== 'dist') throw new Error('Invalid output directory');
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });
  for (const name of ['index.html', 'services.html', 'work.html', 'reviews.html', 'contact.html', 'css', 'js', 'images']) {
    await fs.cp(path.join(root, name), path.join(dest, name), {
      recursive: true,
      filter: source => name !== 'images' || (!source.endsWith('.png') && !source.endsWith('.txt') && !source.endsWith('VTOP_Velesta_walkthrough.MOV.mp4')),
    });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
