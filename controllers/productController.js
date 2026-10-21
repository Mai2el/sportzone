function createProductController({ model, view, perPage }) {
  function list(req, res, categorySlug) {
    const category = categorySlug ? model.findCategoryBySlug(categorySlug) : null;
    if (categorySlug && !category) {
      return res.status(404).send(view.renderNotFound(req));
    }

    const query = String(req.query.q || '').toLowerCase().trim();
    const products = model.getProducts({ category: categorySlug, query });
    const pages = Math.max(1, Math.ceil(products.length / perPage));
    const currentPage = Math.min(pages, Math.max(1, parseInt(req.query.page, 10) || 1));

    return res.send(view.renderList(req, {
      category,
      categorySlug,
      query,
      products: products.slice((currentPage - 1) * perPage, currentPage * perPage),
      total: products.length,
      currentPage,
      pages,
    }));
  }

  return {
    listAll: (req, res) => list(req, res),
    listCategory: (req, res) => list(req, res, req.params.slug),
    cards: (req, res) => {
      const ids = String(req.query.ids || '').split(',').slice(0, 8);
      return res.send(view.renderCards(model.findProductsByIds(ids)));
    },
  };
}

module.exports = createProductController;