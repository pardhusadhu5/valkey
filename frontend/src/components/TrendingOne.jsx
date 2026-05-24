import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const TrendingOne = () => {
    const [trendingProducts, setTrendingProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTrending = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/trending');
            const data = await res.json();
            setTrendingProducts(data);
        } catch (e) {
            console.error("Error fetching trending products:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTrending();
    }, []);

    const recordViewEvent = async (productId) => {
        try {
            await fetch('http://localhost:5000/api/events/view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
            fetchTrending();
        } catch (e) {
            console.error("Error recording view event:", e);
        }
    };

    const handleAddToCart = async (e, productId) => {
        e.stopPropagation();
        try {
            await fetch('http://localhost:5000/api/cart/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'guest_user', productId, quantity: 1 })
            });
            // Record view event as interaction for trending weight
            await recordViewEvent(productId);
        } catch (err) {
            console.error("Failed to add to cart:", err);
        }
    };

    const renderProductsGrid = (productsList) => {
        if (isLoading) {
            return (
                <div className="text-center py-80 w-100">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-gray-500 mt-16 text-lg fw-medium">Loading Valkey Trending Products...</p>
                </div>
            );
        }

        if (productsList.length === 0) {
            return (
                <div className="text-center py-80 w-100 border border-gray-100 rounded-16 bg-gray-50">
                    <h5 className="text-gray-700">No trending products in this category</h5>
                    <p className="text-gray-500">Visit products in the Shop to increase view scores in Valkey Sorted Sets.</p>
                </div>
            );
        }

        return (
            <div className="row g-12">
                {productsList.map((item) => (
                    <div key={item.id} className="col-xxl-2 col-xl-3 col-lg-4 col-sm-6" onClick={() => recordViewEvent(item.id)}>
                        <div className="product-card h-100 p-16 border border-gray-100 hover-border-main-600 rounded-16 position-relative transition-2">
                            <Link
                                to="/product-details-two"
                                className="product-card__thumb flex-center rounded-8 bg-gray-50 position-relative"
                            >
                                {item.ratings?.average >= 4.7 && (
                                    <span className="product-card__badge bg-tertiary-600 px-8 py-4 text-sm text-white position-absolute inset-inline-start-0 inset-block-start-0">
                                        Best Sale
                                    </span>
                                )}
                                <img
                                    src={item.image || "assets/images/thumbs/product-two-img1.png"}
                                    alt={item.name}
                                    className="w-auto max-w-unset"
                                    style={{ maxHeight: '120px' }}
                                />
                            </Link>
                            <div className="product-card__content mt-16">
                                <span className="text-success-600 bg-success-50 text-sm fw-medium py-4 px-8">
                                    15% OFF
                                </span>
                                <h6 className="title text-lg fw-semibold my-16">
                                    <Link
                                        to="/product-details-two"
                                        className="link text-line-2"
                                        tabIndex={0}
                                    >
                                        {item.name}
                                    </Link>
                                </h6>
                                <div className="flex-align gap-6 mb-16">
                                    <span className="text-xs fw-medium text-warning-600 d-flex">
                                        <i className="ph-fill ph-star" />
                                    </span>
                                    <span className="text-xs fw-medium text-gray-500">{item.ratings?.average || 4.5}</span>
                                    <span className="text-xs fw-medium text-gray-500">
                                        ({item.ratings?.count || 120})
                                    </span>
                                </div>
                                <span className="py-2 px-8 text-xs rounded-pill text-main-two-600 bg-main-two-50 d-inline-block mb-16">
                                    Fulfilled by Valkey
                                </span>
                                <div className="product-card__price mt-8 mb-20">
                                    {item.price?.compareAt && (
                                        <span className="text-gray-400 text-md fw-semibold text-decoration-line-through me-8">
                                            ${(item.price.compareAt / 100).toFixed(2)}
                                        </span>
                                    )}
                                    <span className="text-heading text-md fw-semibold ">
                                        ${(item.price?.amount / 100).toFixed(2)} <span className="text-gray-500 fw-normal">/Qty</span>
                                    </span>
                                </div>
                                <Link
                                    to="/cart"
                                    onClick={(e) => handleAddToCart(e, item.id)}
                                    className="product-card__cart btn bg-gray-50 text-heading text-sm hover-bg-main-600 hover-text-white py-11 px-16 rounded-8 flex-center gap-8 fw-medium w-100"
                                    tabIndex={0}
                                >
                                    Add To Cart <i className="ph ph-shopping-cart" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <section className="trending-productss pt-80">
            <div className="container container-lg">
                <div className="border border-gray-100 p-24 rounded-16">
                    <div className="section-heading mb-24">
                        <div className="flex-between flex-wrap gap-8">
                            <h5 className="mb-0">Trending Products</h5>
                            <ul
                                className="nav common-tab style-two nav-pills"
                                id="pills-tab"
                                role="tablist"
                            >
                                <li className="nav-item" role="presentation">
                                    <button
                                        className="nav-link active"
                                        id="pills-all-tab"
                                        data-bs-toggle="pill"
                                        data-bs-target="#pills-all"
                                        type="button"
                                        role="tab"
                                        aria-controls="pills-all"
                                        aria-selected="true"
                                    >
                                        All
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        className="nav-link"
                                        id="pills-mobile-tab"
                                        data-bs-toggle="pill"
                                        data-bs-target="#pills-mobile"
                                        type="button"
                                        role="tab"
                                        aria-controls="pills-mobile"
                                        aria-selected="false"
                                    >
                                        Mobile
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        className="nav-link"
                                        id="pills-headphone-tab"
                                        data-bs-toggle="pill"
                                        data-bs-target="#pills-headphone"
                                        type="button"
                                        role="tab"
                                        aria-controls="pills-headphone"
                                        aria-selected="false"
                                    >
                                        Headphone
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        className="nav-link"
                                        id="pills-usb-tab"
                                        data-bs-toggle="pill"
                                        data-bs-target="#pills-usb"
                                        type="button"
                                        role="tab"
                                        aria-controls="pills-usb"
                                        aria-selected="false"
                                    >
                                        Storage
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        className="nav-link"
                                        id="pills-laptop-tab"
                                        data-bs-toggle="pill"
                                        data-bs-target="#pills-laptop"
                                        type="button"
                                        role="tab"
                                        aria-controls="pills-laptop"
                                        aria-selected="false"
                                    >
                                        Laptop
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="trending-products-box rounded-16 overflow-hidden flex-between position-relative mb-24" style={{ background: 'linear-gradient(90deg, #5b21b6 0%, #1d4ed8 100%)', padding: '16px 32px' }}>
                        <div className="trending-products-box__content d-block w-100 text-center text-white">
                            <h6 className="mb-0 text-white" style={{ fontSize: '18px' }}>
                                Powered by <span className="fw-bold" style={{ color: '#6ee7b7' }}>Valkey ZSET</span> Leaderboard & Vector Discovery Analytics
                            </h6>
                        </div>
                    </div>
                    <div className="tab-content" id="pills-tabContent">
                        <div
                            className="tab-pane fade show active"
                            id="pills-all"
                            role="tabpanel"
                            aria-labelledby="pills-all-tab"
                            tabIndex={0}
                        >
                            {renderProductsGrid(trendingProducts)}
                        </div>
                        <div
                            className="tab-pane fade"
                            id="pills-mobile"
                            role="tabpanel"
                            aria-labelledby="pills-mobile-tab"
                            tabIndex={0}
                        >
                            {renderProductsGrid(trendingProducts.filter(p => p.categoryName === 'Mobile & Accessories'))}
                        </div>
                        <div
                            className="tab-pane fade"
                            id="pills-headphone"
                            role="tabpanel"
                            aria-labelledby="pills-headphone-tab"
                            tabIndex={0}
                        >
                            {renderProductsGrid(trendingProducts.filter(p => p.categoryName === 'Headphone'))}
                        </div>
                        <div
                            className="tab-pane fade"
                            id="pills-usb"
                            role="tabpanel"
                            aria-labelledby="pills-usb-tab"
                            tabIndex={0}
                        >
                            {renderProductsGrid(trendingProducts.filter(p => p.categoryName === 'Storage'))}
                        </div>
                        <div
                            className="tab-pane fade"
                            id="pills-laptop"
                            role="tabpanel"
                            aria-labelledby="pills-laptop-tab"
                            tabIndex={0}
                        >
                            {renderProductsGrid(trendingProducts.filter(p => p.categoryName === 'Laptop'))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TrendingOne;