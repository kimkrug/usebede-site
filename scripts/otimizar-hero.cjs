/* Conversão mecânica dos PNGs existentes. Sem recorte, redimensionamento ou geração. */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const files = [
  'hero_mulher_desktop.png',
  'hero_botas_desktop.png',
  'hero_bolsa_desktop.png',
  'hero_mulher_mobile.png',
  'hero_botas_mobile.png',
  'hero_bolsa_mobile.png'
];
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

async function main() {
  const report = [];
  for (const name of files) {
    const sourcePath = path.join(projectRoot, 'assets', name);
    const outputName = name.replace(/\.png$/, '.webp');
    const outputPath = path.join(projectRoot, 'assets', outputName);
    const source = await fs.readFile(sourcePath);
    const before = await sharp(source).metadata();
    const converted = await sharp(source).keepIccProfile().webp({ quality: 92, effort: 6 }).toBuffer();
    const after = await sharp(converted).metadata();
    if (before.width !== after.width || before.height !== after.height) {
      throw new Error(`Dimensões alteradas: ${name}`);
    }
    // WebP pode omitir um canal alpha inteiramente opaco sem alterar aparência.
    // Compara a transparência real de cada pixel, não a presença do canal.
    const alphaBefore = await sharp(source).ensureAlpha().extractChannel('alpha').raw().toBuffer();
    const alphaAfter = await sharp(converted).ensureAlpha().extractChannel('alpha').raw().toBuffer();
    if (!alphaBefore.equals(alphaAfter)) {
      throw new Error(`Transparência alterada: ${name}`);
    }
    if (converted.length >= source.length) throw new Error(`Conversão não reduziu o arquivo: ${name}`);

    // Nunca sobrescreve um arquivo preexistente diferente ou o PNG original.
    try {
      await fs.writeFile(outputPath, converted, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (hash(await fs.readFile(outputPath)) !== hash(converted)) {
        throw new Error(`Destino já existe com outro conteúdo: ${outputName}`);
      }
    }
    if (hash(await fs.readFile(sourcePath)) !== hash(source)) throw new Error(`PNG original mudou: ${name}`);
    report.push({
      source: name,
      output: outputName,
      width: before.width,
      height: before.height,
      pngBytes: source.length,
      webpBytes: converted.length,
      reductionPercent: Number(((1 - converted.length / source.length) * 100).toFixed(1)),
      pngSha256: hash(source),
      webpSha256: hash(converted)
    });
  }
  const pngBytes = report.reduce((sum, item) => sum + item.pngBytes, 0);
  const webpBytes = report.reduce((sum, item) => sum + item.webpBytes, 0);
  console.log(JSON.stringify({
    mode: 'Conversão WebP com perdas em qualidade 92; conteúdo, dimensões e enquadramento preservados.',
    files: report,
    total: { pngBytes, webpBytes, reductionPercent: Number(((1 - webpBytes / pngBytes) * 100).toFixed(1)) }
  }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
