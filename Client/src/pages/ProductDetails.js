import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ProductDetails.css';
import { useNavigate, useParams } from 'react-router-dom';
import { getProductById, getProductReviews, getProducts } from '../api/services';
import ReviewForm from '../components/ReviewForm';
import ReviewsList from '../components/ReviewsList';
import { addToCart } from '../utils/cart';
import { trackAddToCart, trackViewProduct } from '../utils/analytics';

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPages, setReviewPages] = useState(1);
  const [cartNotice, setCartNotice] = useState('');
  const lastTrackedProductId = useRef(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  const unwrapResponse = (response) => response?.data ?? response;

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getProductById(id);
      const data = unwrapResponse(response);

      if (data?.success) {
        setProduct(data.product);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async (page = reviewPage) => {
    try {
      const response = await getProductReviews(id, { page, limit: 5 });
      const data = unwrapResponse(response);

      if (data?.success) {
        setReviews(data.reviews || []);
        setReviewPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, [id, reviewPage]);

  const fetchRelatedProducts = useCallback(async (currentProduct) => {
    try {
      const response = await getProducts({ limit: 50 });
      const data = unwrapResponse(response);
      const items = Array.isArray(data) ? data : data?.products || [];
      const currentPrice = Number(currentProduct?.price || 0);

      const scoredItems = items
        .filter((item) => {
          const itemId = item?._id || item?.id;
          return itemId && itemId !== id;
        })
        .map((item) => {
          const itemPrice = Number(item?.price || 0);
          const priceDifference = currentPrice > 0 ? Math.abs(itemPrice - currentPrice) / currentPrice : 0;
          const sameCategory = item?.category === currentProduct?.category;
          const sameSubcategory = item?.subcategory && item?.subcategory === currentProduct?.subcategory;
          const sameSubSubcategory = item?.subSubcategory && item?.subSubcategory === currentProduct?.subSubcategory;
          const sameSize = item?.size && item?.size === currentProduct?.size;

          let score = 0;

          if (sameCategory) score += 100;
          if (sameSubcategory) score += 45;
          if (sameSubSubcategory) score += 20;
          if (sameSize) score += 10;

          if (sameCategory && currentPrice > 0) {
            score += Math.max(0, 35 - Math.round(priceDifference * 100));
          } else {
            score += Math.max(0, 18 - Math.round(priceDifference * 50));
          }

          if (item?.rating) {
            score += Math.min(12, Math.round(Number(item.rating) * 2));
          }

          return { ...item, score };
        })
        .sort((a, b) => b.score - a.score || Number(b.rating || 0) - Number(a.rating || 0));

      setRelatedProducts(scoredItems.slice(0, 4));
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [fetchProduct, fetchReviews]);

  useEffect(() => {
    if (product?.category) {
      fetchRelatedProducts(product);
    }
  }, [product, fetchRelatedProducts]);

  const getImageUrl = (image) => {
    if (!image) return '';
    if (typeof image === 'string') return image;
    return image.url || '';
  };

  const productImages = useMemo(() => {
    return (product?.images || []).map((image) => getImageUrl(image)).filter(Boolean);
  }, [product]);

  const heroImage = productImages[selectedImageIndex] || productImages[0] || '';

  const renderStars = (rating = 0) => (
    <div className="product-rating">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < Math.round(rating) ? 'star filled' : 'star'}>
          ★
        </span>
      ))}
      <span className="rating-value">({rating.toFixed(1)})</span>
    </div>
  );

  const onReviewSubmit = () => {
    setReviewPage(1);
    fetchProduct();
    fetchReviews(1);
  };

  const handleAddToCart = () => {
    addToCart(product, 1);
    trackAddToCart({ productId: product._id || product.id, productName: product.name, value: Number(product.price) });
    setCartNotice(`${product.name} added to cart.`);
  };

  const handleBuyNow = () => {
    addToCart(product, 1);
    trackAddToCart({ productId: product._id || product.id, productName: product.name, value: Number(product.price) });
    navigate('/cart');
  };

  useEffect(() => {
    const productId = product?._id || product?.id;
    if (!productId || lastTrackedProductId.current === productId) return;

    lastTrackedProductId.current = productId;
    trackViewProduct({ productId, productName: product.name });
  }, [product]);

  const openRelatedProduct = (productId) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    return <div className="loading-message">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="error-container">
        <p>Product not found</p>
        <button onClick={() => navigate('/products')}>Back to Products</button>
      </div>
    );
  }

  return (
    <div className="product-details-page">
      <div className="container">
        <section className="details-grid">
          <div className="image-column">
            <div className="main-image-card">
              {heroImage ? (
                <img src={heroImage} alt={product.name} className="main-image" />
              ) : (
                <div className="no-image">No Image Available</div>
              )}
              <div className={`stock-pill ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
              </div>
            </div>

            {productImages.length > 1 && (
              <div className="thumbnail-row">
                {productImages.map((imageUrl, index) => (
                  <button
                    key={imageUrl + index}
                    type="button"
                    className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img src={imageUrl} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="info-column">
            <div className="info-card">
              <div className="info-topline">
                <span className="category-chip">{product.category}</span>
                <span className="stock-text">{product.stock > 0 ? `${product.stock} available` : 'Limited stock'}</span>
              </div>

              <h2>{product.name}</h2>
              <div className="rating-row">
                {renderStars(product.rating || 0)}
                <span className="review-count">{product.reviewCount || 0} reviews</span>
              </div>

              <div className="price-row">
                <div>
                  <p className="price">₹{product.price}</p>
                  <span className="price-note">Inclusive pricing</span>
                </div>
              </div>

              <div className="description-block">
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>

              <div className="spec-grid">
                <div className="spec-item">
                  <span>Category</span>
                  <strong>{product.category}</strong>
                </div>
                <div className="spec-item">
                  <span>Subcategory</span>
                  <strong>{product.subcategory || '—'}</strong>
                </div>
                <div className="spec-item">
                  <span>Size</span>
                  <strong>{product.size || '—'}</strong>
                </div>
                <div className="spec-item">
                  <span>Reviews</span>
                  <strong>{product.reviewCount || 0}</strong>
                </div>
              </div>

              <div className="action-row">
                <button className="primary-btn" type="button" disabled={product.stock <= 0} onClick={handleAddToCart}>
                  Add to Cart
                </button>
                <button className="secondary-btn" type="button" disabled={product.stock <= 0} onClick={handleBuyNow}>
                  Buy Now
                </button>
              </div>

              {cartNotice && <div className="cart-notice">{cartNotice}</div>}

              {product.createdBy && (
                <div className="seller-card">
                  <h3>Seller Information</h3>
                  <p>
                    <strong>Name:</strong> {product.createdBy.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="reviews-section">
          <div className="reviews-header">
            <div>
              <p className="eyebrow">Customer reviews</p>
              <h2>Reviews & Ratings</h2>
            </div>
            <div className="reviews-summary">
              <strong>{(product.rating || 0).toFixed(1)} / 5</strong>
              <span>{product.reviewCount || 0} reviews</span>
            </div>
          </div>

          {token && user ? (
            <ReviewForm productId={id} onReviewSubmit={onReviewSubmit} reviewType="product" />
          ) : (
            <div className="login-prompt">
              <p>Please log in to leave a review</p>
              <button onClick={() => navigate('/login')}>Login</button>
            </div>
          )}

          <ReviewsList
            reviews={reviews}
            currentPage={reviewPage}
            totalPages={reviewPages}
            onPageChange={setReviewPage}
          />
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-products-section">
            <div className="related-header">
              <div>
                <p className="eyebrow">Related picks</p>
                <h2>You may also like</h2>
              </div>
              <button className="back-btn related-back-btn" type="button" onClick={() => navigate('/products')}>
                Browse All Products
              </button>
            </div>

            <div className="related-grid">
              {relatedProducts.map((related) => {
                const relatedImage = getImageUrl(related.images?.[0]);
                return (
                  <article key={related._id || related.id} className="related-card">
                    <button className="related-card-inner" type="button" onClick={() => openRelatedProduct(related._id || related.id)}>
                      <div className="related-image">
                        {relatedImage ? <img src={relatedImage} alt={related.name} /> : <div className="no-image">No Image</div>}
                      </div>
                      <div className="related-copy">
                        <span className="related-category">{related.category}</span>
                        <h3>{related.name}</h3>
                        <p>₹{related.price}</p>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProductDetails;
