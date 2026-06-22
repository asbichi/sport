import { auth, firebaseDb, getCurrentUser } from './firebase.js';
import { addToCart } from './cart.js';

let latestProductsGrid;
let isSeeding = false;

document.addEventListener('DOMContentLoaded', async () => {
    latestProductsGrid = document.getElementById('latest-products-grid');
    
    // Check if we are on pages that load products
    if (latestProductsGrid) {
        await loadLatestProducts();
    }
    
    initLiveSearch();
    initScrollReveal();
});

async function loadLatestProducts() {
    latestProductsGrid.innerHTML = `
        <div class="bg-gray-100 rounded overflow-hidden animate-pulse">
            <div class="aspect-[4/5] bg-gray-200"></div>
            <div class="p-4"><div class="h-4 bg-gray-200 rounded w-1/3 mb-3"></div><div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div><div class="h-5 bg-gray-200 rounded w-1/4"></div></div>
        </div>
        <div class="bg-gray-100 rounded overflow-hidden animate-pulse">
            <div class="aspect-[4/5] bg-gray-200"></div>
            <div class="p-4"><div class="h-4 bg-gray-200 rounded w-1/3 mb-3"></div><div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div><div class="h-5 bg-gray-200 rounded w-1/4"></div></div>
        </div>
        <div class="bg-gray-100 rounded overflow-hidden animate-pulse">
            <div class="aspect-[4/5] bg-gray-200"></div>
            <div class="p-4"><div class="h-4 bg-gray-200 rounded w-1/3 mb-3"></div><div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div><div class="h-5 bg-gray-200 rounded w-1/4"></div></div>
        </div>
        <div class="bg-gray-100 rounded overflow-hidden animate-pulse">
            <div class="aspect-[4/5] bg-gray-200"></div>
            <div class="p-4"><div class="h-4 bg-gray-200 rounded w-1/3 mb-3"></div><div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div><div class="h-5 bg-gray-200 rounded w-1/4"></div></div>
        </div>
    `;

    try {
        const { seedData } = await import('/js/seed.js');
        // First check if collection exists and if we need to seed missing products
        const { data: existingProducts, error: checkError } = await firebaseDb.getAll('Products');

        let combinedProducts = (existingProducts || []);
        
        // Try inserting missing
        const existingNames = combinedProducts.map(p => p.product_name);
        const newItemsToInsert = seedData.filter(item => !existingNames.includes(item.product_name));

        if (newItemsToInsert.length > 0) {
            try {
                // Inserts the new seed items
                const { error: insertErr } = await firebaseDb.insert('Products', newItemsToInsert);
                if (insertErr) throw insertErr;
                
                // Refetch if successful
                const { data: refetched } = await firebaseDb.getAll('Products');
                if (refetched) combinedProducts = refetched;
            } catch (err) {
                console.error("Firebase insert failed, using mock data as fallback.", err);
                combinedProducts = [...newItemsToInsert, ...combinedProducts];
            }
        }
        
        // Ensure standard clothes appear at the top
        combinedProducts.sort((a, b) => {
            if (a.created_at && b.created_at) {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            return 0; // maintain original seed priority order which has clothes at the top
        });
        
        // Use a slice for the homepage grid if necessary
        const productsToRender = combinedProducts.slice(0, 16);
        renderProducts(productsToRender, latestProductsGrid);
    } catch (err) {
        console.error('Error fetching products:', err);
        latestProductsGrid.innerHTML = '<div class="col-span-full py-12 text-center text-red-500 font-bold tracking-widest text-sm">COULD NOT LOAD PRODUCTS.</div>';
    }
}

export async function trySeedDatabase(existingProducts = []) {
    if (isSeeding) return;
    isSeeding = true;
    
    const seedData = [
        { product_name: 'Authentic Home Jersey 23/24 (White)', category: 'Jerseys', price: 119.99, stock_quantity: 50, image_url: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=800&q=80', description: 'Engineered for performance, worn by the pros. Clean white edition.' },
        { product_name: 'Elite Strike FG Boots (Cloud White)', category: 'Boots', price: 249.99, stock_quantity: 30, image_url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80', description: 'Maximum traction and precision striking zone in striking white.' },
        { product_name: 'Pro Match Football', category: 'Footballs', price: 149.99, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1614632537190-23e4146777db?w=800&q=80', description: 'FIFA Quality Pro certified match ball.' },
        { product_name: 'Pro Grip Goalkeeper Gloves (White/Green)', category: 'Accessories', price: 89.99, stock_quantity: 20, image_url: 'https://images.unsplash.com/photo-1551847677-dc82d73356bc?w=800&q=80', description: 'Ultimate grip in all weather conditions.' },
        { product_name: 'Classic Away Jersey (All White)', category: 'Jerseys', price: 95.99, stock_quantity: 60, image_url: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&q=80', description: 'Sweat-wicking fabric for intense away sessions.' },
        { product_name: 'Agility Training Cones Set', category: 'Accessories', price: 24.99, stock_quantity: 200, image_url: 'https://images.unsplash.com/photo-1510823819871-33230c115e61?w=800&q=80', description: 'Essential for footwork and agility drills.' },
        { product_name: 'Captain Armband Premium (White)', category: 'Accessories', price: 14.99, stock_quantity: 150, image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80', description: 'Elastic comfort fit for the team leader.' },
        { product_name: 'Shin Guards Elite (Monochrome White)', category: 'Accessories', price: 34.99, stock_quantity: 80, image_url: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&q=80', description: 'High-impact protection with lightweight feel.' },
        { product_name: 'Compression Baselayer (White)', category: 'Accessories', price: 45.99, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1612462767175-6893699c33bb?w=800&q=80', description: 'Keep muscles warm and supported.' },
        { product_name: 'Training Bibs 10-Pack (White)', category: 'Accessories', price: 35.99, stock_quantity: 40, image_url: 'https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=800&q=80', description: 'Essential practice bibs for team drills.' },
        { product_name: 'Pro Boot Bag (Stealth Black)', category: 'Accessories', price: 29.99, stock_quantity: 60, image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', description: 'Ventilated compartment for your match boots.' },
        { product_name: 'Insulated Water Bottle 1L', category: 'Accessories', price: 19.99, stock_quantity: 120, image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80', description: 'Keep your drinks ice cold during intense matches.' },
        { product_name: 'Dual-Action Ball Pump', category: 'Accessories', price: 15.99, stock_quantity: 85, image_url: 'https://images.unsplash.com/photo-1584048443906-8153ce27bcbe?w=800&q=80', description: 'Quickly inflate footballs on the go.' },
        { product_name: 'Grip Crew Socks (White)', category: 'Accessories', price: 18.99, stock_quantity: 200, image_url: 'https://images.unsplash.com/photo-1582966772680-860e372bb558?w=800&q=80', description: 'Anti-slip technology for maximum power transfer.' },
        { product_name: 'Tactics Coaching Board', category: 'Accessories', price: 49.99, stock_quantity: 15, image_url: 'https://images.unsplash.com/photo-1579308696773-1002271842cc?w=800&q=80', description: 'Magnetic pitch board with markers for strategy.' },
        { product_name: 'Sweatband Set (Wrist & Head)', category: 'Accessories', price: 12.99, stock_quantity: 110, image_url: 'https://images.unsplash.com/photo-1608248593842-8021c6a2e2dc?w=800&q=80', description: 'Absorbent terry cloth to keep sweat out of your eyes.' },
        { product_name: 'Referees Whistle Pro', category: 'Accessories', price: 9.99, stock_quantity: 40, image_url: 'https://images.unsplash.com/photo-1582098670183-fcf202dfbde1?w=800&q=80', description: 'Loud crisp sound for commanding the pitch.' }
    ];

    const existingNames = existingProducts.map(p => p.product_name);
    const newItemsToInsert = seedData.filter(item => !existingNames.includes(item.product_name));

    if (newItemsToInsert.length > 0) {
        if (latestProductsGrid) {
            latestProductsGrid.innerHTML = '<div class="col-span-full py-12 text-center text-gray-500 animate-pulse">Initializing store catalogue with new items...</div>';
        }
        try {
            const { error } = await firebaseDb.insert('Products', newItemsToInsert);
            if (error) throw error;
        } catch (err) {
            console.error('Seeding failed:', err);
        }
    }
    
    isSeeding = false;
}

function handleMissingTable() {
    latestProductsGrid.innerHTML = `
        <div class="col-span-full py-16 text-center">
            <h3 class="text-2xl font-bold mb-4">Database Not Configured</h3>
            <p class="text-gray-500 mb-8 max-w-lg mx-auto">The 'Products' table does not exist or requires permissions. To set up your Supabase database, please execute the SQL schema provided in the Admin guide.</p>
            <a href="/admin.html" class="bg-black text-white hover:bg-orange-600 hover:text-white font-bold py-3 px-8 rounded-full transition-all uppercase tracking-wider text-sm">Go to Admin Setup</a>
        </div>
    `;
}

export function renderProducts(products, container) {
    container.innerHTML = '';
    products.forEach((p, index) => {
        const div = document.createElement('div');
        const delayClass = `reveal-delay-${((index % 4) + 1) * 100}`;
        div.className = `group flex flex-col bg-white border border-gray-200/60 rounded-3xl p-4 reveal ${delayClass} transition-all duration-500 hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] hover:border-orange-500/10 hover:scale-[1.015]`;
        div.innerHTML = `
            <div class="block relative bg-gray-50 aspect-[4/5] object-cover overflow-hidden mb-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-500 cursor-pointer">
               <a href="/product.html?id=${p.id}" class="block w-full h-full">
                 <img src="${p.image_url || 'https://via.placeholder.com/300x400?text=Product'}" alt="${escapeHtml(p.product_name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out">
               </a>
               ${p.stock_quantity <= 0 ? '<div class="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center font-black uppercase tracking-widest text-red-600 pointer-events-none">Sold Out</div>' : ''}
               <div class="absolute top-3 left-3 bg-black/80 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm pointer-events-none">${escapeHtml(p.category || 'Gear')}</div>
               
               <button class="wishlist-btn absolute top-3 right-3 bg-white/95 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:scale-110 transition-all shadow-sm z-10" data-id="${p.id}" title="Add to Wishlist">
                  <svg class="w-3.5 h-3.5 fill-current pointer-events-none" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
               </button>

               <!-- Quick View Button -->
               <button class="quick-view-btn absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-zinc-950/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest py-2 px-5 rounded-full shadow-lg hover:bg-orange-600 hover:text-white transition-all transform translate-y-3 group-hover:translate-y-0" data-id="${p.id}">Quick View</button>
            </div>
            
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bichi Pro Wear</span>
            <h3 class="font-extrabold text-base mb-2 text-gray-900 leading-snug line-clamp-2 min-h-[2.75rem]">
                <a href="/product.html?id=${p.id}" class="hover:text-orange-600 transition-colors">${escapeHtml(p.product_name)}</a>
            </h3>
            
            <div class="mt-auto flex items-center justify-between pt-2 border-t border-gray-100">
               <span class="text-orange-600 font-extrabold text-lg font-display tracking-tight">$${parseFloat(p.price).toFixed(2)}</span>
               <button class="bg-gray-100 text-black hover:bg-orange-600 hover:text-white text-xs font-black py-2 px-4 rounded-full transition-all duration-300 add-to-cart-btn uppercase tracking-wider border border-transparent hover:shadow-lg" data-id="${p.id}" ${p.stock_quantity <= 0 ? 'disabled' : ''}>
                 ${p.stock_quantity > 0 ? 'Add' : 'Out'}
               </button>
            </div>
        `;
        container.appendChild(div);
    });

    const btns = container.querySelectorAll('.add-to-cart-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const product = products.find(prod => String(prod.id) === String(id));
            if (product) {
                addToCart(product);
                
                // Visual feedback
                const origText = e.target.innerText;
                e.target.innerText = 'ADDED ✓';
                e.target.classList.replace('bg-gray-100', 'bg-orange-600');
                e.target.classList.replace('text-black', 'text-white');
                setTimeout(() => {
                    e.target.innerText = origText;
                    e.target.classList.replace('bg-orange-600', 'bg-gray-100');
                    e.target.classList.replace('text-white', 'text-black');
                }, 1500);
            }
        });
    });

    const qvBtns = container.querySelectorAll('.quick-view-btn');
    qvBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = e.target.getAttribute('data-id');
            const product = products.find(prod => String(prod.id) === String(id));
            if (product) {
                openQuickView(product);
            }
        });
    });

    const wlBtns = container.querySelectorAll('.wishlist-btn');
    wlBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const btnEl = e.currentTarget;
            const id = btnEl.getAttribute('data-id');
            const currentUser = await getCurrentUser();
            
            if (!currentUser) {
                alert("Please sign in to add items to your wishlist.");
                window.location.href = '/login.html';
                return;
            }

            try {
                // Check if already in wishlist
                const { data: wishlists, error: checkErr } = await firebaseDb.query('Wishlists', [
                    ['user_id', '==', currentUser.uid],
                    ['product_id', '==', id]
                ]);
                
                if (checkErr) throw checkErr;
                const existing = wishlists && wishlists.length > 0 ? wishlists[0] : null;

                if (existing) {
                    await firebaseDb.delete('Wishlists', existing.id);
                    btnEl.classList.remove('text-red-500');
                    btnEl.classList.add('text-gray-300');
                } else {
                    const { error: insErr } = await firebaseDb.insert('Wishlists', { 
                        user_id: currentUser.uid, 
                        product_id: id 
                    });
                    if (insErr) throw insErr;
                    btnEl.classList.remove('text-gray-300');
                    btnEl.classList.add('text-red-500');
                }
            } catch (err) {
                console.error("Wishlist error:", err);
                alert("Failed to update wishlist. "+err.message);
            }
        });
    });

    syncWishlistStates(container);
    initScrollReveal();
}

async function syncWishlistStates(container) {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;
    
    try {
        const { data } = await firebaseDb.query('Wishlists', [
            ['user_id', '==', currentUser.uid]
        ]);
        if (data) {
            const wishlistIds = data.map(item => String(item.product_id));
            const wlBtns = container.querySelectorAll('.wishlist-btn');
            wlBtns.forEach(btn => {
                if (wishlistIds.includes(btn.getAttribute('data-id'))) {
                    btn.classList.remove('text-gray-300');
                    btn.classList.add('text-red-500');
                }
            });
        }
    } catch(err) {
        // fail silently for ui sync
    }
}

function openQuickView(product) {
    let modal = document.getElementById('quick-view-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quick-view-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300 px-4 py-6';
        modal.innerHTML = `
            <div class="bg-white rounded w-full max-w-4xl overflow-hidden relative flex flex-col md:flex-row max-h-[90vh] scale-95 transition-transform duration-300 shadow-2xl" id="quick-view-content">
                <button id="quick-view-close" class="absolute top-4 right-4 z-20 bg-black/10 hover:bg-black hover:text-white text-black p-2 rounded-full transition-colors backdrop-blur-sm">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div class="w-full md:w-1/2 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                    <img id="qv-img" src="" alt="Product" class="w-full h-full object-cover">
                </div>
                <div class="w-full md:w-1/2 p-8 md:p-10 overflow-y-auto flex flex-col">
                    <div class="uppercase tracking-widest text-[10px] font-black text-gray-400 mb-2" id="qv-category">Category</div>
                    <h2 class="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-4 text-gray-900 leading-none" id="qv-title">Product Name</h2>
                    <p class="text-gray-600 mb-8 font-medium leading-relaxed text-sm flex-grow" id="qv-desc">Description</p>
                    
                    <div class="mb-8">
                        <label class="block text-[10px] font-black uppercase tracking-widest mb-3 text-gray-900">Select Size</label>
                        <div class="flex flex-wrap gap-2">
                            <button class="qv-size bg-white border border-gray-300 hover:border-black text-black w-12 h-12 flex items-center justify-center font-bold uppercase tracking-wider text-xs transition-colors rounded">S</button>
                            <button class="qv-size bg-white border border-gray-300 hover:border-black text-black w-12 h-12 flex items-center justify-center font-bold uppercase tracking-wider text-xs transition-colors rounded">M</button>
                            <button class="qv-size bg-white border border-gray-300 hover:border-black text-black w-12 h-12 flex items-center justify-center font-bold uppercase tracking-wider text-xs transition-colors rounded">L</button>
                            <button class="qv-size bg-white border border-gray-300 hover:border-black text-black w-12 h-12 flex items-center justify-center font-bold uppercase tracking-wider text-xs transition-colors rounded">XL</button>
                        </div>
                    </div>
                    
                    <button class="w-full bg-black hover:bg-orange-600 text-white py-4 uppercase font-black tracking-widest transition-all mb-4 rounded-xl shadow-lg text-sm" id="qv-add-cart">Add to Cart</button>
                    <a href="#" id="qv-details-link" class="block text-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors underline mb-2">View Full Details</a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeQuickView();
        });
        document.getElementById('quick-view-close').addEventListener('click', closeQuickView);

        // Size selection logic
        const sizes = modal.querySelectorAll('.qv-size');
        sizes.forEach(btn => {
            btn.addEventListener('click', () => {
                sizes.forEach(b => {
                    b.classList.remove('bg-black', 'text-white', 'border-black');
                    b.classList.add('bg-white', 'text-black', 'border-gray-300');
                });
                btn.classList.remove('bg-white', 'text-black', 'border-gray-300');
                btn.classList.add('bg-black', 'text-white', 'border-black');
            });
        });
    }

    // Populate data
    document.getElementById('qv-img').src = product.image_url || 'https://via.placeholder.com/800x1000?text=Product';
    document.getElementById('qv-title').innerText = product.product_name;
    document.getElementById('qv-category').innerText = product.category || 'Gear';
    document.getElementById('qv-desc').innerText = product.description || 'No description available.';
    document.getElementById('qv-details-link').href = `/product.html?id=${product.id}`;
    
    // reset sizes state
    const sizes = modal.querySelectorAll('.qv-size');
    sizes.forEach(b => {
        b.classList.remove('bg-black', 'text-white', 'border-black');
        b.classList.add('bg-white', 'text-black', 'border-gray-300');
    });

    const addCartBtn = document.getElementById('qv-add-cart');
    
    // Clear previous event listeners (by replacing the button clone)
    const newAddCartBtn = addCartBtn.cloneNode(true);
    addCartBtn.parentNode.replaceChild(newAddCartBtn, addCartBtn);

    if (product.stock_quantity <= 0) {
        newAddCartBtn.disabled = true;
        newAddCartBtn.innerText = 'Out of Stock';
        newAddCartBtn.classList.replace('hover:bg-orange-600', 'opacity-50');
        newAddCartBtn.classList.replace('hover:text-black', 'cursor-not-allowed');
    } else {
        newAddCartBtn.disabled = false;
        newAddCartBtn.innerText = 'Add to Cart';
        newAddCartBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        newAddCartBtn.addEventListener('click', () => {
            const selectedSizeBtn = modal.querySelector('.qv-size.bg-black');
            let size = null;
            if (selectedSizeBtn) {
                size = selectedSizeBtn.innerText.trim();
            }
            
            const productToAdd = { ...product };
            if (size) productToAdd.selectedSize = size;
            
            addToCart(productToAdd);
            
            newAddCartBtn.innerText = 'ADDED ✓';
            newAddCartBtn.classList.replace('bg-black', 'bg-orange-600');
            setTimeout(() => {
                newAddCartBtn.innerText = 'Add to Cart';
                newAddCartBtn.classList.replace('bg-orange-600', 'bg-black');
                closeQuickView();
            }, 1000);
        });
    }

    // Show modal
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('quick-view-content').classList.remove('scale-95');
        document.body.style.overflow = 'hidden'; 
    });
}

function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('quick-view-content').classList.add('scale-95');
        document.body.style.overflow = '';
    }
}

function escapeHtml(unsafe) {
    if(!unsafe) return '';
    return unsafe.toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function initLiveSearch() {
    const searchInputs = document.querySelectorAll('.live-search-input');
    if (!searchInputs.length) return;

    searchInputs.forEach(input => {
        const container = input.parentElement.querySelector('.search-results-container');
        let timeout = null;

        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                container.classList.add('hidden');
                container.innerHTML = '';
                return;
            }

            timeout = setTimeout(async () => {
                container.classList.remove('hidden');
                container.classList.add('flex');
                container.innerHTML = '<div class="p-4 text-center text-gray-500 text-xs">Searching...</div>';

                try {
                    const { data: allProducts, error } = await firebaseDb.getAll('Products');
                    if (error) throw error;

                    const filtered = (allProducts || [])
                        .filter(product => product.product_name.toLowerCase().includes(query.toLowerCase()))
                        .slice(0, 5);

                    if (filtered && filtered.length > 0) {
                        container.innerHTML = filtered.map(item => `
                            <a href="/product.html?id=${item.id}" class="flex items-center p-3 hover:bg-gray-50 border-b border-gray-50 transition-colors last:border-0 cursor-pointer">
                                <img src="${item.image_url || 'https://via.placeholder.com/150'}" class="w-12 h-12 object-cover rounded bg-gray-100 mr-3">
                                <div>
                                    <div class="text-xs font-bold text-gray-900 line-clamp-2">${escapeHtml(item.product_name)}</div>
                                </div>
                            </a>
                        `).join('');
                    } else {
                        container.innerHTML = '<div class="p-4 text-center text-gray-500 text-xs font-bold">No products found.</div>';
                    }
                } catch (err) {
                    console.error('Search error:', err);
                    if (err.code === '42P01') {
                         container.innerHTML = '<div class="p-4 text-center text-gray-500 text-xs">Database not setup.</div>';
                    } else {
                         container.innerHTML = '<div class="p-4 text-center text-red-500 text-xs">Search failed.</div>';
                    }
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !container.contains(e.target)) {
                container.classList.add('hidden');
                container.classList.remove('flex');
            }
        });
        
        input.addEventListener('focus', () => {
            if (input.value.trim().length >= 2 && container.innerHTML !== '') {
                container.classList.remove('hidden');
                container.classList.add('flex');
            }
        });
    });
}

export function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });

    reveals.forEach(reveal => {
        observer.observe(reveal);
    });
}

