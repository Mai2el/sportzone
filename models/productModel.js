const CATS = [
  { slug: 'giay', name: 'Giày', icon: '👟', k: 'Chạy bền, bước xa', c: ['#e63950', '#8f1d33'] },
  { slug: 'quan-ao', name: 'Quần áo', icon: '👕', k: 'Thoáng nhẹ cho mọi trận đấu', c: ['#1f5fbf', '#0c1b2e'] },
  { slug: 'pickleball', name: 'Pickleball', icon: '🏓', k: 'Sân mới, vợt mới', c: ['#16a085', '#0b4f47'] },
  { slug: 'doi-tuyen', name: 'Đội tuyển', icon: '⚽', k: 'Mặc áo, ghi dấu', c: ['#f26a2e', '#8f2b12'] },
];

const NAMES = {
  giay: ['Giày chạy bộ Cloud', 'Giày đá bóng Kumo', 'Giày pickleball Vortex', 'Giày thể thao Vento'],
  'quan-ao': ['Áo polo Flame', 'Áo phông Pixel', 'Quần short Flex', 'Váy thể thao Serena'],
  pickleball: ['Vợt Solus Core', 'Vợt Solus Prime', 'Bóng pickleball Pro', 'Túi đựng vợt'],
  'doi-tuyen': ['Áo CLB Hà Nội', 'Bộ thi đấu Nam Định', 'Áo đội tuyển quốc gia', 'Bộ suvec Olympic'],
};

const products = [];
let nextId = 1;
for (const category of CATS) {
  for (let revision = 1; revision <= 3; revision++) {
    NAMES[category.slug].forEach((name, index) => {
      const id = nextId++;
      products.push({
        id,
        base: `${category.slug}-${index + 1}`,
        cat: category.slug,
        name: revision === 1 ? name : `${name} v${revision}`,
        price: (250 + ((index * 7 + revision * 13) % 40) * 30) * 1000,
        sale: (index + revision) % 3 === 0 ? 15 : 0,
        out: id % 7 === 0,
      });
    });
  }
}

function getProducts({ category, query = '' } = {}) {
  const normalizedQuery = String(query).toLowerCase().trim();
  return products.filter(product => (!category || product.cat === category)
    && product.name.toLowerCase().includes(normalizedQuery));
}

function findProductById(id) {
  return products.find(product => product.id === Number(id));
}

function findProductsByIds(ids) {
  return ids.map(findProductById).filter(Boolean);
}

function findCategoryBySlug(slug) {
  return CATS.find(category => category.slug === slug);
}

module.exports = { CATS, products, getProducts, findProductById, findProductsByIds, findCategoryBySlug };