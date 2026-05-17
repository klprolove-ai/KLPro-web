import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Services.css';
import API_BASE_URL from '../config/apiConfig';
import { SERVICE_HIERARCHY, getHierarchyOptions, getServiceTypeOptions } from '../config/serviceHierarchy';

const buildProfessionalsPath = (params) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      searchParams.set(key, String(value));
    }
  });

  const search = searchParams.toString();
  return search ? `/professionals?${search}` : '/professionals';
};

function Services() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [pinnedCategory, setPinnedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState('all');
  const [selectedServiceType, setSelectedServiceType] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [servicesData, setServicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
  }, [location.search]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const services = await response.json();
      // Map database services to display format
      const formattedServices = (Array.isArray(services) ? services : services.services || [])
        .map(service => ({
          id: service._id,
          name: service.name,
          category: service.category,
          subCategory: service.subCategory || '',
          subSubCategory: service.subSubCategory || '',
          serviceType: service.serviceType || '',
          price: service.basePrice,
          duration: `${service.estimatedDuration} min`,
          rating: service.rating || 0,
          reviews: service.reviewCount || 0,
          description: service.description,
          availability: 'Instant',
          image: service.image || null
        }));
      
      setServicesData(formattedServices);
    } catch (err) {
      setError(err.message || 'Failed to load services');
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  // Removed categoryIcons mapping (no icons)

  const dataCategories = Array.from(new Set(servicesData.map((service) => service.category).filter(Boolean)));
  const hierarchyCategories = Object.keys(SERVICE_HIERARCHY);
  const mergedCategories = Array.from(new Set([...hierarchyCategories, ...dataCategories]));

  const categories = [
    { id: 'all', name: 'All Services' },
    ...mergedCategories.map((category) => ({
      id: category,
      name: category,
    })),
  ];

  const getServiceHierarchyForCategory = (category) => {
    if (!category || category === 'all') return [];

    const configured = SERVICE_HIERARCHY[category] || {};
    const tree = new Map();

    Object.entries(configured).forEach(([subCategory, subSubCategories]) => {
      const subSubMap = new Map();
      (subSubCategories || []).forEach((subSubCategory) => {
        subSubMap.set(subSubCategory, new Set());
      });
      tree.set(subCategory, subSubMap);
    });

    servicesData
      .filter((service) => service.category === category)
      .forEach((service) => {
        const subCategory = service.subCategory || 'General';
        const subSubCategory = service.subSubCategory || 'General';
        const serviceType = service.serviceType || '';

        if (!tree.has(subCategory)) {
          tree.set(subCategory, new Map());
        }

        const subSubMap = tree.get(subCategory);
        if (!subSubMap.has(subSubCategory)) {
          subSubMap.set(subSubCategory, new Set());
        }

        if (serviceType) {
          subSubMap.get(subSubCategory).add(serviceType);
        }
      });

    return Array.from(tree.entries()).map(([subCategory, subSubMap]) => ({
      subCategory,
      subSubCategories: Array.from(subSubMap.entries()).map(([subSubCategory, serviceTypesSet]) => {
        const configuredServiceTypes = getServiceTypeOptions(category, subCategory, subSubCategory);
        return {
          subSubCategory,
          serviceTypes: Array.from(
            new Set([
              ...Array.from(serviceTypesSet),
              ...configuredServiceTypes,
            ])
          ),
        };
      }),
    }));
  };

  const activePanelCategory = pinnedCategory || hoveredCategory;
  const hoveredServiceHierarchy = getServiceHierarchyForCategory(activePanelCategory);

  const applyCategoryFilter = (category) => {
    setSelectedCategory(category);
    setSelectedSubCategory('all');
    setSelectedSubSubCategory('all');
    setSelectedServiceType('all');
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
    setSelectedServiceType('all');
  };

  const handleSubSubCategorySelect = (category, subCategory, subSubCategory) => {
    setSelectedCategory(category);
    setSelectedSubCategory(subCategory);
    setSelectedSubSubCategory(subSubCategory);
    setSelectedServiceType('all');
  };

  const handleServiceTypeSelect = (category, subCategory, subSubCategory, serviceType) => {
    setSelectedCategory(category);
    setSelectedSubCategory(subCategory);
    setSelectedSubSubCategory(subSubCategory);
    setSelectedServiceType(serviceType);
  };

  const getSubCategoryOptions = () => {
    if (selectedCategory === 'all') {
      return Array.from(new Set(servicesData.map((service) => service.subCategory).filter(Boolean)));
    }

    if (SERVICE_HIERARCHY[selectedCategory]) {
      return getHierarchyOptions(selectedCategory).subCategories;
    }

    return Array.from(
      new Set(
        servicesData
          .filter((service) => service.category === selectedCategory)
          .map((service) => service.subCategory)
          .filter(Boolean)
      )
    );
  };

  const getSubSubCategoryOptions = () => {
    if (selectedSubCategory === 'all') {
      return Array.from(
        new Set(
          servicesData
            .filter((service) => selectedCategory === 'all' || service.category === selectedCategory)
            .map((service) => service.subSubCategory)
            .filter(Boolean)
        )
      );
    }

    if (selectedCategory !== 'all' && SERVICE_HIERARCHY[selectedCategory]) {
      return getHierarchyOptions(selectedCategory, selectedSubCategory).subSubCategories;
    }

    return Array.from(
      new Set(
        servicesData
          .filter(
            (service) =>
              (selectedCategory === 'all' || service.category === selectedCategory) &&
              service.subCategory === selectedSubCategory
          )
          .map((service) => service.subSubCategory)
          .filter(Boolean)
      )
    );
  };

  const getServiceTypeFilterOptions = () => {
    if (selectedSubSubCategory === 'all') {
      if (selectedCategory !== 'all' && selectedSubCategory !== 'all') {
        return getServiceTypeOptions(selectedCategory, selectedSubCategory, selectedSubSubCategory);
      }

      return Array.from(
        new Set(
          servicesData
            .filter(
              (service) =>
                (selectedCategory === 'all' || service.category === selectedCategory) &&
                (selectedSubCategory === 'all' || service.subCategory === selectedSubCategory)
            )
            .map((service) => service.serviceType)
            .filter(Boolean)
        )
      );
    }

    if (selectedCategory !== 'all' && selectedSubCategory !== 'all') {
      return getServiceTypeOptions(selectedCategory, selectedSubCategory, selectedSubSubCategory);
    }

    return Array.from(
      new Set(
        servicesData
          .filter(
            (service) =>
              (selectedCategory === 'all' || service.category === selectedCategory) &&
              (selectedSubCategory === 'all' || service.subCategory === selectedSubCategory) &&
              service.subSubCategory === selectedSubSubCategory
          )
          .map((service) => service.serviceType)
          .filter(Boolean)
      )
    );
  };

  const subCategoryOptions = getSubCategoryOptions();
  const subSubCategoryOptions = getSubSubCategoryOptions();

  const activeServicePath = [
    selectedCategory !== 'all' ? { level: 'category', label: selectedCategory } : null,
    selectedSubCategory !== 'all' ? { level: 'subCategory', label: selectedSubCategory } : null,
    selectedSubSubCategory !== 'all' ? { level: 'subSubCategory', label: selectedSubSubCategory } : null,
    selectedServiceType !== 'all' ? { level: 'serviceType', label: selectedServiceType } : null,
  ].filter(Boolean);

  const clearServicePathFromLevel = (level) => {
    if (level === 'category') {
      setSelectedCategory('all');
      setSelectedSubCategory('all');
      setSelectedSubSubCategory('all');
      setSelectedServiceType('all');
      setPinnedCategory(null);
      setHoveredCategory(null);
      return;
    }

    if (level === 'subCategory') {
      setSelectedSubCategory('all');
      setSelectedSubSubCategory('all');
      setSelectedServiceType('all');
      return;
    }

    if (level === 'subSubCategory') {
      setSelectedSubSubCategory('all');
      setSelectedServiceType('all');
      return;
    }

    if (level === 'serviceType') {
      setSelectedServiceType('all');
    }
  };

  const filtered = servicesData.filter((service) => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSubCategory = selectedSubCategory === 'all' || service.subCategory === selectedSubCategory;
    const matchesSubSubCategory =
      selectedSubSubCategory === 'all' || service.subSubCategory === selectedSubSubCategory;
    const matchesServiceType = selectedServiceType === 'all' || service.serviceType === selectedServiceType;

    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      service.name.toLowerCase().includes(search) ||
      service.description.toLowerCase().includes(search) ||
      service.category.toLowerCase().includes(search) ||
      service.subCategory.toLowerCase().includes(search);

    return matchesCategory && matchesSubCategory && matchesSubSubCategory && matchesServiceType && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const handleBookNow = (service) => {
    const bookingDraft = {
      serviceId: service.id,
      serviceName: service.name,
      scheduledDate: new Date().toISOString().slice(0, 10),
      expectedPrice: service.price,
    };

    localStorage.setItem('bookingDraft', JSON.stringify(bookingDraft));
    navigate(
      buildProfessionalsPath({
        service: service.name,
        category: service.category,
        subCategory: service.subCategory,
        subSubCategory: service.subSubCategory,
        serviceType: service.serviceType,
      })
    );
  };

  return (
    <div className="services-page">
      <section className="services-hero">
        <div className="services-hero-bg" style={{ backgroundImage: "url('/kl2.png')" }} />
      </section>

      <div className="container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-message">
            Loading services...
          </div>
        ) : (
          <>
            <section className="filters-section">
              <div className="filters-title-row">
                <h2>Choose Your Service</h2>
                <p>{sorted.length} results</p>
              </div>

              {activeServicePath.length > 0 && (
                <div className="active-filter-path" aria-label="Active service filters">
                  {activeServicePath.map((item, index) => (
                    <React.Fragment key={`${item.level}-${item.label}`}>
                      {index > 0 && <span className="path-separator">&gt;</span>}
                      <button
                        type="button"
                        className="path-chip"
                        onClick={() => clearServicePathFromLevel(item.level)}
                        title={`Clear ${item.label} and deeper levels`}
                      >
                        {item.label}
                        <span className="path-chip-close">x</span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              <div
                className="category-hover-wrap"
                onMouseLeave={() => {
                  if (!pinnedCategory) {
                    setHoveredCategory(null);
                  }
                }}
              >
                <div className="category-tabs" role="tablist" aria-label="Service categories">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                      onMouseEnter={() => {
                        if (!pinnedCategory) {
                          setHoveredCategory(cat.id === 'all' ? null : cat.id);
                        }
                      }}
                      onFocus={() => {
                        if (!pinnedCategory) {
                          setHoveredCategory(cat.id === 'all' ? null : cat.id);
                        }
                      }}
                      onClick={() => handleCategoryTabClick(cat.id)}
                      type="button"
                    >
                      <span className="tab-name">{cat.name}</span>
                    </button>
                  ))}
                </div>

                {activePanelCategory && hoveredServiceHierarchy.length > 0 && (
                  <div className="services-hover-panel" role="region" aria-label={`${activePanelCategory} hierarchy`}>
                    <div className="services-hover-panel-head">{activePanelCategory}</div>
                    <div className="services-hover-columns">
                      {hoveredServiceHierarchy.map((node) => (
                        <article key={node.subCategory} className="services-hover-col">
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
                                  {leaf.serviceTypes.length > 0 && (
                                    <p>
                                      {leaf.serviceTypes.map((serviceType) => (
                                        <button
                                          key={`${leaf.subSubCategory}-${serviceType}`}
                                          type="button"
                                          className="hover-mini-chip"
                                          onClick={() =>
                                            handleServiceTypeSelect(
                                              activePanelCategory,
                                              node.subCategory,
                                              leaf.subSubCategory,
                                              serviceType
                                            )
                                          }
                                        >
                                          {serviceType}
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

              <div className="hierarchy-filters" aria-label="Service hierarchy filters">
                <div className="hierarchy-filter-item">
                  <label htmlFor="subCategory">Subcategory</label>
                  <select
                    id="subCategory"
                    value={selectedSubCategory}
                    onChange={(e) => {
                      setSelectedSubCategory(e.target.value);
                      setSelectedSubSubCategory('all');
                      setSelectedServiceType('all');
                    }}
                    className="sort-select"
                  >
                    <option value="all">All Subcategories</option>
                    {subCategoryOptions.map((subCategory) => (
                      <option key={subCategory} value={subCategory}>
                        {subCategory}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hierarchy-filter-item">
                  <label htmlFor="subSubCategory">Sub-subcategory</label>
                  <select
                    id="subSubCategory"
                    value={selectedSubSubCategory}
                    onChange={(e) => {
                      setSelectedSubSubCategory(e.target.value);
                      setSelectedServiceType('all');
                    }}
                    className="sort-select"
                  >
                    <option value="all">All Sub-subcategories</option>
                    {subSubCategoryOptions.map((subSubCategory) => (
                      <option key={subSubCategory} value={subSubCategory}>
                        {subSubCategory}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hierarchy-filter-item">
                  <label htmlFor="serviceType">Service Type</label>
                  <select
                    id="serviceType"
                    value={selectedServiceType}
                    onChange={(e) => setSelectedServiceType(e.target.value)}
                    className="sort-select"
                  >
                    <option value="all">All Service Types</option>
                    {getServiceTypeFilterOptions().map((serviceType) => (
                      <option key={serviceType} value={serviceType}>
                        {serviceType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sort-options">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price">Price: Low to High</option>
                </select>
              </div>
            </section>

            <section className="services-section">
              <div className="services-grid">
                {sorted.length > 0 ? (
                  sorted.map((service) => (
                    <div key={service.id} className="service-card">
                      <div className="service-image">
                        {service.image ? (
                          <img src={service.image} alt={service.name} />
                        ) : (
                          <div className="image-placeholder">📷</div>
                        )}
                      </div>
                      
                      <div className="service-content">
                        <h3 className="service-name">{service.name}</h3>
                        <p className="service-description">{service.description}</p>

                        <div className="service-hierarchy-badges">
                          <span className="service-hierarchy-badge">{service.category}</span>
                          {service.subCategory && <span className="service-hierarchy-badge">{service.subCategory}</span>}
                          {service.subSubCategory && (
                            <span className="service-hierarchy-badge">{service.subSubCategory}</span>
                          )}
                          {service.serviceType && (
                            <span className="service-hierarchy-badge">{service.serviceType}</span>
                          )}
                        </div>
                        
                        <div className="rating-section">
                          <span className="rating">⭐ {service.rating.toFixed(1)}</span>
                          <span className="reviews">({service.reviews})</span>
                        </div>

                        <div className="service-meta">
                          <span className="duration">⏱️ {service.duration}</span>
                          <span className={`availability ${service.availability === 'Instant' ? 'instant' : ''}`}>
                            {service.availability}
                          </span>
                        </div>

                        <div className="service-footer">
                          <span className="price">₹{service.price}</span>
                          <button className="book-now-btn" type="button" onClick={() => handleBookNow(service)}>
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-services">
                    <p>No services available with the selected filters</p>
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

export default Services;
