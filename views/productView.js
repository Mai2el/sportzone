function createProductView({ layout, page, card, productBanner }) {
  return {
    renderNotFound(req) {
      return layout(req, 'Không tìm thấy', '<div class="head"><h2>Không có mục này</h2></div><p><a href="/">Về trang chủ</a></p>');
    },

    renderList(req, data) {
      const title = data.category ? data.category.name : 'Tất cả sản phẩm';
      const pageBanner = data.category || productBanner;
      const base = (data.categorySlug ? '/category/' + data.categorySlug : '/products') + '?'
        + (data.query ? 'q=' + encodeURIComponent(data.query) + '&amp;' : '') + 'page=';
      const numbers = Array.from({ length: data.pages }, (_, index) => {
        const pageNumber = index + 1;
        return `<a class="${pageNumber === data.currentPage ? 'on' : ''}" href="${base}${pageNumber}">${pageNumber}</a>`;
      }).join('');

      return page(req, title, pageBanner, `<div class="crumb"><a href="/">Trang chủ</a> / <span>${title}</span></div>
<div class="head"><h2>${title}</h2><span>${data.total} sản phẩm</span></div>
<div class="grid">${data.products.map(card).join('') || '<p>Không tìm thấy sản phẩm. Thử từ khóa khác.</p>'}</div>
<div class="pager">${data.currentPage > 1 ? `<a href="${base}${data.currentPage - 1}">Trước</a>` : ''}${numbers}${data.currentPage < data.pages ? `<a href="${base}${data.currentPage + 1}">Sau</a>` : ''}</div>`);
    },

    renderCards(products) {
      return products.map(card).join('');
    },
  };
}

module.exports = createProductView;