import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const CartSection = () => {
    const [cart, setCart] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [couponCode, setCouponCode] = useState("");
    const [couponMessage, setCouponMessage] = useState("");
    const [couponError, setCouponError] = useState("");

    const fetchCart = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/cart?userId=guest_user');
            const data = await res.json();
            setCart(data);
        } catch (e) {
            console.error("Error fetching cart:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const handleQuantityChange = async (productId, quantity) => {
        try {
            await fetch('http://localhost:5000/api/cart/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'guest_user', productId, quantity })
            });
            fetchCart();
        } catch (e) {
            console.error("Error updating quantity:", e);
        }
    };

    const handleRemoveItem = async (productId) => {
        try {
            await fetch(`http://localhost:5000/api/cart/items/${productId}?userId=guest_user`, {
                method: 'DELETE'
            });
            fetchCart();
        } catch (e) {
            console.error("Error removing item:", e);
        }
    };

    const handleApplyCoupon = async (e) => {
        e.preventDefault();
        setCouponMessage("");
        setCouponError("");
        if (!couponCode.trim()) return;

        try {
            const res = await fetch('http://localhost:5000/api/cart/coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'guest_user', couponCode: couponCode.trim() })
            });
            const data = await res.json();
            if (res.ok) {
                setCouponMessage(data.message);
                fetchCart();
            } else {
                setCouponError(data.error || "Failed to apply coupon");
            }
        } catch (e) {
            setCouponError("Error connecting to coupon service");
        }
    };

    const handleRemoveCoupon = async () => {
        try {
            await fetch('http://localhost:5000/api/cart/coupon?userId=guest_user', {
                method: 'DELETE'
            });
            setCouponMessage("");
            setCouponCode("");
            fetchCart();
        } catch (e) {
            console.error("Error removing coupon:", e);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-80 w-100">
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-gray-500 mt-16 text-lg fw-medium">Loading Shopping Cart...</p>
            </div>
        );
    }

    const items = cart?.items || [];

    if (items.length === 0) {
        return (
            <section className="cart py-80">
                <div className="container container-lg text-center">
                    <div className="border border-gray-100 rounded-16 p-80 bg-gray-50 max-w-640 mx-auto">
                        <i className="ph ph-shopping-cart text-6xl text-gray-300 mb-24 d-block" style={{ fontSize: '64px' }}></i>
                        <h4 className="text-gray-800 mb-16">Your Shopping Cart is Empty</h4>
                        <p className="text-gray-500 mb-32">Fill it with premium products from our catalog to get started.</p>
                        <Link to="/shop" className="btn btn-main py-18 px-40 rounded-8 fw-semibold">
                            Shop Now
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="cart py-80">
            <div className="container container-lg">
                <div className="row gy-4">
                    <div className="col-xl-9 col-lg-8">
                        <div className="cart-table border border-gray-100 rounded-8 px-40 py-48">
                            <div className="overflow-x-auto scroll-sm scroll-sm-horizontal">
                                <table className="table style-three">
                                    <thead>
                                        <tr>
                                            <th className="h6 mb-0 text-lg fw-bold">Delete</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Product Name</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Price</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Quantity</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.product.id}>
                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.product.id)}
                                                        className="remove-tr-btn flex-align gap-12 hover-text-danger-600"
                                                    >
                                                        <i className="ph ph-x-circle text-2xl d-flex" />
                                                        Remove
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="table-product d-flex align-items-center gap-24">
                                                        <Link
                                                            to="/product-details-two"
                                                            className="table-product__thumb border border-gray-100 rounded-8 flex-center "
                                                        >
                                                            <img
                                                                src={item.product.image || "assets/images/thumbs/product-two-img1.png"}
                                                                alt={item.product.name}
                                                            />
                                                        </Link>
                                                        <div className="table-product__content text-start">
                                                            <h6 className="title text-lg fw-semibold mb-8">
                                                                <Link
                                                                    to="/product-details-two"
                                                                    className="link text-line-2"
                                                                    tabIndex={0}
                                                                >
                                                                    {item.product.name}
                                                                </Link>
                                                            </h6>
                                                            <div className="flex-align gap-16 mb-16">
                                                                <div className="flex-align gap-6">
                                                                    <span className="text-md fw-medium text-warning-600 d-flex">
                                                                        <i className="ph-fill ph-star" />
                                                                    </span>
                                                                    <span className="text-md fw-semibold text-gray-900">
                                                                        {item.product.ratings?.average || 4.5}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm fw-medium text-gray-200">
                                                                    |
                                                                </span>
                                                                <span className="text-neutral-600 text-sm">
                                                                    {item.product.ratings?.count || 120} Reviews
                                                                </span>
                                                            </div>
                                                            <div className="flex-align gap-16">
                                                                <span className="py-2 px-8 text-xs rounded-pill text-main-two-600 bg-main-two-50">
                                                                    {item.product.brand}
                                                                </span>
                                                                <span className="py-2 px-8 text-xs rounded-pill text-main-two-600 bg-main-two-50">
                                                                    {item.product.categoryName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="text-lg h6 mb-0 fw-semibold">
                                                        ${(item.product.price?.amount / 100).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex rounded-4 overflow-hidden border border-gray-100" style={{ width: '120px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(item.product.id, Math.max(1, item.quantity - 1))}
                                                            className="quantity__minus flex-shrink-0 h-40 w-40 text-neutral-600 flex-center hover-bg-main-600 hover-text-white border-0 bg-transparent"
                                                        >
                                                            <i className="ph ph-minus" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            className="quantity__input flex-grow-1 border-0 text-center w-32 px-4 bg-transparent"
                                                            value={item.quantity}
                                                            min={1}
                                                            readOnly
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                                                            className="quantity__plus flex-shrink-0 h-40 w-40 text-neutral-600 flex-center hover-bg-main-600 hover-text-white border-0 bg-transparent"
                                                        >
                                                            <i className="ph ph-plus" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="text-lg h6 mb-0 fw-semibold">
                                                        ${((item.product.price?.amount * item.quantity) / 100).toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-between flex-wrap gap-16 mt-32">
                                <form onSubmit={handleApplyCoupon} className="flex-align gap-16 flex-wrap">
                                    <input
                                        type="text"
                                        className="common-input"
                                        placeholder="Coupon Code"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        style={{ width: '200px' }}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-main py-18 px-24 rounded-8"
                                    >
                                        Apply Coupon
                                    </button>
                                </form>
                                <button
                                    onClick={fetchCart}
                                    className="text-lg text-gray-500 hover-text-main-600 bg-transparent border-0"
                                >
                                    Refresh Cart
                                </button>
                            </div>
                            {couponMessage && (
                                <div className="alert alert-success mt-16 py-8 px-16 border border-success-200 text-success-700 bg-success-50 rounded-8 flex-between">
                                    <span>{couponMessage}</span>
                                    <button onClick={handleRemoveCoupon} className="btn btn-sm btn-outline-danger py-2 px-8 border border-danger-300 text-danger hover-bg-danger hover-text-white rounded-4 ms-16">
                                        Remove Coupon
                                    </button>
                                </div>
                            )}
                            {couponError && (
                                <div className="alert alert-danger mt-16 py-8 px-16 border border-danger-200 text-danger-700 bg-danger-50 rounded-8">
                                    {couponError}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="col-xl-3 col-lg-4">
                        <div className="cart-sidebar border border-gray-100 rounded-8 px-24 py-40">
                            <h6 className="text-xl mb-32">Cart Totals</h6>
                            <div className="bg-color-three rounded-8 p-24">
                                <div className="mb-32 flex-between gap-8">
                                    <span className="text-gray-900 font-heading-two">Subtotal</span>
                                    <span className="text-gray-900 fw-semibold">${(cart.subtotal / 100).toFixed(2)}</span>
                                </div>
                                {cart.discount > 0 && (
                                    <div className="mb-32 flex-between gap-8 text-success-600">
                                        <span className="font-heading-two">Discount ({cart.appliedCoupon})</span>
                                        <span className="fw-semibold">-${(cart.discount / 100).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="mb-32 flex-between gap-8">
                                    <span className="text-gray-900 font-heading-two">
                                        Estimated Delivery
                                    </span>
                                    <span className="text-gray-900 fw-semibold">Free</span>
                                </div>
                                <div className="mb-0 flex-between gap-8">
                                    <span className="text-gray-900 font-heading-two">
                                        Estimated Tax (8%)
                                    </span>
                                    <span className="text-gray-900 fw-semibold">${(cart.tax / 100).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-color-three rounded-8 p-24 mt-24">
                                <div className="flex-between gap-8">
                                    <span className="text-gray-900 text-xl fw-semibold">Total</span>
                                    <span className="text-gray-900 text-xl fw-semibold">${(cart.total / 100).toFixed(2)}</span>
                                </div>
                            </div>
                            <Link
                                to="/checkout"
                                className="btn btn-main mt-40 py-18 w-100 rounded-8"
                            >
                                Proceed to checkout
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default CartSection