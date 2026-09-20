const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'table-data.json');
const jdPath = path.join(__dirname, 'jd-products.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const jdProducts = JSON.parse(fs.readFileSync(jdPath, 'utf8'));

function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, '')
    .replace(/联想|lenovo/g, '');
}

function extractPrice(str) {
  const m = String(str).match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

function getBrandKeyword(name) {
  const n = String(name);
  if (n.includes('YOGA') || n.includes('yoga')) return 'yoga';
  if (n.includes('拯救者')) return '拯救者';
  if (n.includes('小新')) return '小新';
  if (n.includes('异能者')) return '异能者';
  if (n.includes('来酷')) return '来酷';
  return null;
}

const allItems = [
  ...data.entry_series.map(i => ({ ...i, series: 'entry' })),
  ...data.performance_series.map(i => ({ ...i, series: 'performance' })),
  ...data.premium_series.map(i => ({ ...i, series: 'premium' }))
];

let updated = 0;
for (const item of allItems) {
  const brand = getBrandKeyword(item.name);
  const itemKey = normalize(item.name);

  const matches = jdProducts
    .map(p => ({ p, price: extractPrice(p.price), key: normalize(p.name) }))
    .filter(x => {
      if (!x.key || x.price == null) return false;
      if (brand && !x.p.name.includes(brand)) return false;
      return x.key.includes(itemKey);
    });

  if (matches.length === 0) continue;

  const minPrice = Math.min(...matches.map(x => x.price));
  if (String(minPrice) !== String(item.price)) {
    item.price = String(minPrice);
    updated++;
    console.log('update price:', item.name, '->', minPrice);
  }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('price updated:', updated);
