export let cart = JSON.parse(localStorage.getItem('bichi_cart')) || [];

export function saveCart() {
    localStorage.setItem('bichi_cart', JSON.stringify(cart));
    updateCartCount();
}

export function addToCart(product, quantity = 1) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }
    saveCart();
    alert('Product added to cart!');
}

export function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
}

export function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = parseInt(newQuantity, 10);
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
        }
    }
}

export function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countEl.textContent = totalItems;
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', updateCartCount);
