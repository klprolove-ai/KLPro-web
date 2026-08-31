import React, { useCallback, useEffect, useState } from 'react';
import './Products.css';
import { useLocation, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';
import { addToCart } from '../utils/cart';
import { trackAddToCart } from '../utils/analytics';
import { PRODUCT_CATEGORY_HIERARCHY } from '../config/productCategoryHierarchy';

function Products() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [pinnedCategory, setPinnedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState('all');
  const [selectedLevel4, setSelectedLevel4] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [productsData, setProductsData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
    setSelectedCategory(params.get('category') || 'all');
    setSortBy(params.get('sort') || 'popular');
  }, [location.search]);

  const getProductImage = (product) => {
    const image = product?.images?.[0];

    if (typeof image === 'string') {
      return image;
    }

    return image?.url || product?.image || product?.imageUrl || '';
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/products?limit=1000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.products || [];

      setProductsData(
        items.map((product) => ({
          id: product._id || product.id,
          name: product.name,
          category: product.category || 'Uncategorized',
          subCategory: product.subcategory || '',
          subSubCategory: product.subSubcategory || '',
          size: product.size || '',
          price: product.price || 0,
          rating: product.rating || 0,
          reviews: product.reviewCount || 0,
          stock: product.stock || 0,
          description: product.description || '',
          image: getProductImage(product),
        }))
      );
    } catch (err) {
      setError(err.message || 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const payload = await response.json();
      const data = payload?.data ?? payload;

      if (data?.success) {
        setCategories(data.mainCategories || data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const updateQuery = (nextValues) => {
    const params = new URLSearchParams();
    const nextSearch = nextValues.searchTerm ?? searchTerm;
    const nextCategory = nextValues.selectedCategory ?? selectedCategory;
    const nextSort = nextValues.sortBy ?? sortBy;

    if (nextSearch) params.set('search', nextSearch);
    if (nextCategory && nextCategory !== 'all') params.set('category', nextCategory);
    if (nextSort && nextSort !== 'popular') params.set('sort', nextSort);

    navigate({ pathname: '/products', search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  };

  // Removed categoryIcons mapping (no icons)

  const mergedCategories = Array.from(
    new Set(['all', ...categories, ...productsData.map((product) => product.category).filter(Boolean)])
  );

  const tabs = [
    { id: 'all', name: 'All Products' },
    ...mergedCategories
      .filter((category) => category !== 'all')
      .map((category) => ({
        id: category,
        name: category,
      })),
  ];

  const getProductHierarchyForCategory = (category) => {
    if (!category || category === 'all') return [];

    const configured = PRODUCT_CATEGORY_HIERARCHY[category] || {};
    const tree = new Map();

    Object.entries(configured).forEach(([subCategory, subSubObject]) => {
      const subSubMap = new Map();
      Object.entries(subSubObject || {}).forEach(([subSubCategory, subSubSubValues]) => {
        subSubMap.set(subSubCategory, new Set(subSubSubValues || []));
      });
      tree.set(subCategory, subSubMap);
    });

    productsData
      .filter((product) => product.category === category)
      .forEach((product) => {
        const subCategory = product.subCategory || 'General';
        const subSubCategory = product.subSubCategory || 'General';
        const level4 = product.size || '';

        if (!tree.has(subCategory)) {
          tree.set(subCategory, new Map());
        }

        const subSubMap = tree.get(subCategory);
        if (!subSubMap.has(subSubCategory)) {
          subSubMap.set(subSubCategory, new Set());
        }

        if (level4) {
          subSubMap.get(subSubCategory).add(level4);
        }
      });

    return Array.from(tree.entries()).map(([subCategory, subSubMap]) => ({
      subCategory,
      subSubCategories: Array.from(subSubMap.entries()).map(([subSubCategory, level4Set]) => ({
        subSubCategory,
        level4Values: Array.from(level4Set),
      })),
    }));
  };

  const activePanelCategory = pinnedCategory || hoveredCategory;
  const hoveredProductHierarchy = getProductHierarchyForCategory(activePanelCategory);

  const applyCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubCategory('all');
    setSelectedSubSubCategory('all');
    setSelectedLevel4('all');
    updateQuery({ selectedCategory: categoryId });
  };

  const handleCategoryTabClick = (categoryId) => {
    applyCategoryFilter(categoryId);
    if (categoryId === 'all') {
      setPinnedCategory(null);
      setHoveredCategory(null);
      return;
    }
    setPinnedCategory((prev) => (prev === categoryId ? null : categoryId));
    setHoveredCategory(categoryId);
  };

  const handleSubCategorySelect = (category, subCategory) => {
    setSelectedCategory(category);
    setSelectedSubCategory(subCategory);
    setSelectedSubSubCategory('all');
    setSelectedLevel4('all');
    updateQuery({ selectedCategory: category });
  };

  const handleSubSubCategorySelect = (category, subCategory, subSubCategory) => {
    setSelectedCategory(category);
    setSelectedSubCategory(subCategory);
    setSelectedSubSubCategory(subSubCategory);
    setSelectedLevel4('all');
    updateQuery({ selectedCategory: category });
  };

  const handleLevel4Select = (category, subCategory, subSubCategory, level4) => {
    setSelectedCategory(category);
    setSelectedSubCategory(subCategory);
    setSelectedSubSubCategory(subSubCategory);
    setSelectedLevel4(level4);
    updateQuery({ selectedCategory: category });
  };

  const activeProductPath = [
    selectedCategory !== 'all' ? { level: 'category', label: selectedCategory } : null,
    selectedSubCategory !== 'all' ? { level: 'subCategory', label: selectedSubCategory } : null,
    selectedSubSubCategory !== 'all' ? { level: 'subSubCategory', label: selectedSubSubCategory } : null,
    selectedLevel4 !== 'all' ? { level: 'level4', label: selectedLevel4 } : null,
  ].filter(Boolean);

  const clearProductPathFromLevel = (level) => {
    if (level === 'category') {
      setSelectedCategory('all');
      setSelectedSubCategory('all');
      setSelectedSubSubCategory('all');
      setSelectedLevel4('all');
      setPinnedCategory(null);
      setHoveredCategory(null);
      updateQuery({ selectedCategory: 'all' });
      return;
    }

    if (level === 'subCategory') {
      setSelectedSubCategory('all');
      setSelectedSubSubCategory('all');
      setSelectedLevel4('all');
      return;
    }

    if (level === 'subSubCategory') {
      setSelectedSubSubCategory('all');
      setSelectedLevel4('all');
      return;
    }

    if (level === 'level4') {
      setSelectedLevel4('all');
    }
  };

  const filtered = productsData.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSubCategory = selectedSubCategory === 'all' || product.subCategory === selectedSubCategory;
    const matchesSubSubCategory = selectedSubSubCategory === 'all' || product.subSubCategory === selectedSubSubCategory;
    const matchesLevel4 = selectedLevel4 === 'all' || product.size === selectedLevel4;
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search) ||
      product.description.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search);

    return matchesCategory && matchesSubCategory && matchesSubSubCategory && matchesLevel4 && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return b.reviews - a.reviews;
  });

  const renderStars = (rating = 0) => (
    <div className="rating-section">
      <span className="rating">⭐ {rating.toFixed(1)}</span>
      <span className="reviews">({rating > 0 ? Math.max(1, Math.round(rating * 2)) : 0})</span>
    </div>
  );

  const openProduct = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleBuyNow = (product) => {
    addToCart(product, 1);
    trackAddToCart({ productId: product._id || product.id, productName: product.name, value: Number(product.price) });
    navigate('/cart');
  };

  return (
    <div className="products-page">
      <div className="products-banner">
        <img src="/product.png" alt="Products Banner" />
      </div>

      <div className="container">
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-message">Loading products...</div>
        ) : (
          <>
            <section className="filters-section">
              <div className="filters-title-row">
                <h2>Choose Your Product</h2>
                <p>{sorted.length} results</p>
              </div>

              {activeProductPath.length > 0 && (
                <div className="active-filter-path" aria-label="Active product filters">
                  {activeProductPath.map((item, index) => (
                    <React.Fragment key={`${item.level}-${item.label}`}>
                      {index > 0 && <span className="path-separator">&gt;</span>}
                      <button
                        type="button"
                        className="path-chip"
                        onClick={() => clearProductPathFromLevel(item.level)}
                        title={`Clear ${item.label} and deeper levels`}
                      >
                        {item.label}
                        <span className="path-chip-close">x</span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              <div className="search-row">
                <div className="search-field">
                  <label htmlFor="productSearch">Search Products</label>
                  <input
                    id="productSearch"
                    type="text"
                    placeholder="Search by product name, category, or description"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      updateQuery({ searchTerm: e.target.value });
                    }}
                  />
                </div>

                <div className="sort-options">
                  <label htmlFor="productSort">Sort</label>
                  <select
                    id="productSort"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      updateQuery({ sortBy: e.target.value });
                    }}
                    className="sort-select"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                    <option value="price">Price: Low to High</option>
                  </select>
                </div>
              </div>

              <div
                className="category-hover-wrap"
                onMouseLeave={() => {
                  if (!pinnedCategory) {
                    setHoveredCategory(null);
                  }
                }}
              >
                <div className="category-tabs" role="tablist" aria-label="Product categories">
                  {tabs.map((category) => (
                    <button
                      key={category.id}
                      className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
                      onMouseEnter={() => {
                        if (!pinnedCategory) {
                          setHoveredCategory(category.id === 'all' ? null : category.id);
                        }
                      }}
                      onFocus={() => {
                        if (!pinnedCategory) {
                          setHoveredCategory(category.id === 'all' ? null : category.id);
                        }
                      }}
                      onClick={() => handleCategoryTabClick(category.id)}
                      type="button"
                    >
                      <span className="tab-name">{category.name}</span>
                    </button>
                  ))}
                </div>

                {activePanelCategory && hoveredProductHierarchy.length > 0 && (
                  <div className="products-hover-panel" role="region" aria-label={`${activePanelCategory} hierarchy`}>
                    <div className="products-hover-panel-head">{activePanelCategory}</div>
                    <div className="products-hover-columns">
                      {hoveredProductHierarchy.map((node) => (
                        <article key={node.subCategory} className="products-hover-col">
                          <h4>
                            <button
                              type="button"
                              className="hover-action-btn"
                              onClick={() => handleSubCategorySelect(activePanelCategory, node.subCategory)}
                            >
                              {node.subCategory}
                            </button>
                          </h4>
                          {node.subSubCategories.length > 0 ? (
                            <ul>
                              {node.subSubCategories.map((leaf) => (
                                <li key={`${node.subCategory}-${leaf.subSubCategory}`}>
                                  <button
                                    type="button"
                                    className="hover-leaf-name hover-action-btn"
                                    onClick={() =>
                                      handleSubSubCategorySelect(
                                        activePanelCategory,
                                        node.subCategory,
                                        leaf.subSubCategory
                                      )
                                    }
                                  >
                                    {leaf.subSubCategory}
                                  </button>
                                  {leaf.level4Values.length > 0 && (
                                    <p>
                                      {leaf.level4Values.map((level4) => (
                                        <button
                                          key={`${leaf.subSubCategory}-${level4}`}
                                          type="button"
                                          className="hover-mini-chip"
                                          onClick={() =>
                                            handleLevel4Select(
                                              activePanelCategory,
                                              node.subCategory,
                                              leaf.subSubCategory,
                                              level4
                                            )
                                          }
                                        >
                                          {level4}
                                        </button>
                                      ))}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="hover-empty">No subcategories</p>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="products-section">
              <div className="products-grid">
                {sorted.length > 0 ? (
                  sorted.map((product) => (
                    <div key={product.id} className="service-card product-card">
                      <div className="service-image product-image-wrap">
                        {product.image ? (
                          <img src={product.image} alt={product.name} />
                        ) : (
                          <div className="image-placeholder">📷</div>
                        )}
                        <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                          {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      <div className="service-content product-content">
                        <h3 className="service-name">{product.name}</h3>
                        <p className="service-description">{product.description}</p>

                        <div className="service-hierarchy-badges">
                          <span className="service-hierarchy-badge">{product.category}</span>
                          {product.subCategory && <span className="service-hierarchy-badge">{product.subCategory}</span>}
                          {product.subSubCategory && <span className="service-hierarchy-badge">{product.subSubCategory}</span>}
                          {product.size && <span className="service-hierarchy-badge">{product.size}</span>}
                        </div>

                        {renderStars(product.rating)}

                        <div className="service-meta product-meta-row">
                          <span className="duration">🧩 {product.reviews} reviews</span>
                          <span className="availability instant">Premium</span>
                        </div>

                        <div className="service-footer">
                          <span className="price">₹{product.price}</span>
                          <div className="product-card-actions">
                            <button className="book-now-btn secondary-action" type="button" onClick={() => openProduct(product.id)}>
                              View Details
                            </button>
                            <button
                              className="book-now-btn"
                              type="button"
                              disabled={product.stock <= 0}
                              onClick={() => handleBuyNow(product)}
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-services">
                    <p>No products available with the selected filters</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default Products;
