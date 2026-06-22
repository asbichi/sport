import { auth, firebaseDb } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';

// Global Auth State
export let currentUser = null;

// Initialize Authentication Listener
export async function initAuth() {
    currentUser = auth.currentUser;
    updateAuthUI();

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI();
    });

    const logoutBtn = document.getElementById('nav-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
             await signOut(auth);
             window.location.href = '/';
        });
    }
}

function updateAuthUI() {
    const loginLink = document.getElementById('nav-login');
    const profileLink = document.getElementById('nav-profile');
    const logoutBtn = document.getElementById('nav-logout');
    const adminLink = document.getElementById('nav-admin');

    if (currentUser) {
        if (loginLink) {
            loginLink.classList.add('hidden');
            loginLink.classList.remove('md:inline-block');
        }
        if (profileLink) {
            profileLink.classList.remove('hidden');
            profileLink.classList.add('hidden', 'md:inline-block');
        }
        if (logoutBtn) {
            logoutBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden', 'md:inline-block');
        }
        
        // Simple mock check for admin based on email
        const isAdmin = currentUser.email && (currentUser.email.toLowerCase().includes('admin') || currentUser.email.toLowerCase().includes('bichi'));
        if (isAdmin) {
            if (adminLink) {
                adminLink.classList.remove('hidden');
                adminLink.classList.add('hidden', 'md:inline-block');
            }
        } else {
            if (adminLink) {
                adminLink.classList.add('hidden');
                adminLink.classList.remove('md:inline-block');
            }
        }
    } else {
        if (loginLink) {
            loginLink.classList.remove('hidden');
            loginLink.classList.add('hidden', 'md:inline-block');
        }
        if (profileLink) {
            profileLink.classList.add('hidden');
            profileLink.classList.remove('md:inline-block');
        }
        if (logoutBtn) {
            logoutBtn.classList.add('hidden');
            logoutBtn.classList.remove('md:inline-block');
        }
        if (adminLink) {
            adminLink.classList.add('hidden');
            adminLink.classList.remove('md:inline-block');
        }
    }

    // Populate Mobile Auth drawer section
    const mobileAuthContainer = document.getElementById('mobile-auth-container');
    if (mobileAuthContainer) {
        if (currentUser) {
            mobileAuthContainer.innerHTML = `
                <div class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Logged in as: <span class="text-black font-extrabold block mt-0.5 truncate">${currentUser.displayName || currentUser.email}</span></div>
                <a href="/profile.html" class="block w-full py-2.5 text-center bg-gray-150 hover:bg-gray-200 text-black font-bold uppercase tracking-widest text-xs rounded-xl transition">View Profile</a>
                ${currentUser.email && (currentUser.email.toLowerCase().includes('admin') || currentUser.email.toLowerCase().includes('bichi')) ? `
                <a href="/admin.html" class="block w-full py-2.5 text-center bg-black hover:bg-gray-800 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition">Admin Dashboard</a>
                ` : ''}
                <button id="mobile-nav-logout" class="block w-full py-2.5 text-center bg-red-50 hover:bg-red-100 text-red-600 font-bold uppercase tracking-widest text-xs rounded-xl transition mt-1">Sign Out</button>
            `;
            const mobileLogout = document.getElementById('mobile-nav-logout');
            if (mobileLogout) {
                mobileLogout.addEventListener('click', async () => {
                     await signOut(auth);
                     window.location.href = '/';
                });
            }
        } else {
            mobileAuthContainer.innerHTML = `
                <a href="/login.html" class="block w-full py-3 text-center bg-black hover:bg-orange-600 text-white font-black uppercase tracking-widest text-xs rounded-full transition-colors">Sign In</a>
            `;
        }
    }
}

export function setupMobileNav() {
    // Make Logo responsive on all pages
    document.querySelectorAll('nav a').forEach(a => {
       const href = a.getAttribute('href');
       if (href === '/' || href === '/index.html') {
           const span = a.querySelector('span');
           if (span) {
               span.className = 'text-black font-black uppercase not-italic tracking-tighter text-xl sm:text-2xl md:text-3xl lg:text-4xl';
           }
       }
    });

    // Make Cart text responsive
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const wordSpan = cartCount.previousElementSibling;
        if (wordSpan && wordSpan.innerText.toLowerCase().includes('cart')) {
            wordSpan.classList.add('hidden', 'sm:inline');
        }
    }

    // Is there a links menu to hide/replace on mobile?
    const navActions = document.querySelector('nav .flex.space-x-6.items-center, nav div.flex.space-x-6.items-center');
    if (!navActions) return;

    if (document.getElementById('mobile-menu-toggle')) {
        updateAuthUI();
        return;
    }

    // Create a beautiful hamburger toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'mobile-menu-toggle';
    toggleButton.className = 'md:hidden flex items-center justify-center p-2 rounded-lg text-gray-800 hover:bg-gray-100 transition focus:outline-none ml-2';
    toggleButton.setAttribute('aria-label', 'Open Menu');
    toggleButton.innerHTML = `
        <svg class="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
    `;

    navActions.appendChild(toggleButton);

    // Create the off-canvas drawer
    const drawer = document.createElement('div');
    drawer.id = 'mobile-menu-drawer';
    drawer.className = 'fixed inset-0 z-[100] overflow-hidden hidden';
    drawer.innerHTML = `
        <!-- Backdrop with overlay blur -->
        <div id="mobile-drawer-backdrop" class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 opacity-0"></div>
        
        <!-- Drawer Panel -->
        <div id="mobile-drawer-panel" class="absolute inset-y-0 right-0 max-w-xs w-full bg-white shadow-2xl p-6 flex flex-col justify-between transform translate-x-full transition-transform duration-300 ease-in-out">
            <div>
                <!-- Header -->
                <div class="flex items-center justify-between pb-6 border-b border-gray-100">
                    <div class="flex items-center gap-2">
                        <img src="https://i.ibb.co/bRDvmLgW/cea5b158-4e71-4446-84de-6924e17f2d51.jpg" alt="Logo" class="h-7 w-auto object-contain rounded">
                        <span class="text-black font-black uppercase text-lg tracking-tighter">BICHI'S WEAR</span>
                    </div>
                    <button id="mobile-drawer-close" class="p-2 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition focus:outline-none">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Search Input specifically for mobile, redirected to shop.html -->
                <div class="mt-6 relative">
                    <form action="/shop.html" method="GET" class="relative">
                        <input type="text" name="search" id="mobile-search-input" class="w-full bg-gray-100 border-none rounded-full py-2.5 pl-4 pr-10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-gray-500" placeholder="Search gear...">
                        <button type="submit" class="absolute right-3 top-2.5 text-gray-500 hover:text-black">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </button>
                    </form>
                </div>

                <!-- Navigation Links -->
                <nav class="mt-8 flex flex-col space-y-4">
                    <a href="/shop.html" class="text-sm font-extrabold uppercase tracking-wider text-gray-900 hover:text-orange-600 transition py-2 border-b border-gray-50">Shop All Products</a>
                    <a href="/shop.html" class="text-sm font-extrabold uppercase tracking-wider text-black hover:text-orange-600 transition py-2 border-b border-gray-50">🔥 Latest Drops</a>
                    <a href="/shop.html" class="text-sm font-extrabold uppercase tracking-wider text-black hover:text-orange-600 transition py-2 border-b border-gray-50">👕 Jerseys Collection</a>
                    <a href="/shop.html" class="text-sm font-extrabold uppercase tracking-wider text-black hover:text-orange-600 transition py-2 border-b border-gray-50">🧤 Pro Accessories</a>
                </nav>
            </div>

            <!-- Auth Controls Area and WhatsApp block -->
            <div class="border-t border-gray-100 pt-6">
                <div id="mobile-auth-container" class="space-y-3.5 mb-6">
                    <!-- Loaded dynamically in updateAuthUI -->
                </div>
                
                <div class="flex items-center justify-center">
                    <a href="https://wa.me/2348146600581" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md w-full justify-center">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.022-.079-.186-.285-.438-.41-.253-.125-1.493-.737-1.724-.82-.231-.085-.415-.125-.583.125-.168.25-.658.82-.806.988-.148.168-.297.188-.55.063-.254-.125-1.07-.394-2.037-1.258-.753-.672-1.261-1.503-1.409-1.753-.148-.25-.015-.386.11-.51.114-.11.253-.297.38-.445.126-.148.168-.253.253-.41.085-.168.043-.314-.02-.438-.064-.125-.583-1.405-.8-.192-.211-.5-.548-.514-.6-.015-.05-.084-.111-.125-.213-.042-.102-.457-1.125-.626-1.5-.165-.37-.34-.316-.497-.31-.153-.006-.33-.008-.507-.008-.178 0-.467.067-.71.332-.243.265-.928.906-.928 2.212 0 1.306.953 2.568 1.085 2.746.132.178 1.874 2.862 4.542 4.013.633.274 1.13.438 1.517.562.637.202 1.218.174 1.677.105.513-.077 1.493-.61 1.7-.197.207-.413.207-.768.148-.83l-.06-.085zm-5.451 7.143c-3.23-.05-6.195-1.92-7.51-4.757-.156-.34-.33-.357-.733-.217l-1.996.697c-.365.13-.675-.17-.55-.545l.613-1.848c.112-.34.053-.626-.143-.912C.367 12.043.1 9.497.51 6.89c.552-3.53 3.327-6.398 6.862-6.86 5.151-.673 9.4 3.197 9.4 8.21 0 4.548-3.648 8.243-8.151 8.285z"/>
                        </svg>
                        <span>WhatsApp Care</span>
                    </a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(drawer);

    const backdrop = document.getElementById('mobile-drawer-backdrop');
    const panel = document.getElementById('mobile-drawer-panel');
    const closeBtn = document.getElementById('mobile-drawer-close');

    function openDrawer() {
        drawer.classList.remove('hidden');
        setTimeout(() => {
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
            panel.classList.remove('translate-x-full');
            panel.classList.add('translate-x-0');
        }, 10);
    }

    function closeDrawer() {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
        panel.classList.remove('translate-x-0');
        panel.classList.add('translate-x-full');
        setTimeout(() => {
            drawer.classList.add('hidden');
        }, 300);
    }

    toggleButton.addEventListener('click', openDrawer);
    backdrop.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    // Call updateAuthUI to populate Auth menu correctly inside the newly appended list elements
    updateAuthUI();
}

export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { data: { user: userCredential.user }, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

export async function registerUser(email, password, fullName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update user profile with full name
        await updateProfile(user, { displayName: fullName });
        
        // Insert to Users table/collection
        await firebaseDb.insert('Users', {
            id: user.uid,
            full_name: fullName,
            email: email
        });
        
        return { data: { user: user }, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

function addFloatingWhatsAppButton() {
    if (document.getElementById('floating-whatsapp-btn')) return;

    const btn = document.createElement('a');
    btn.id = 'floating-whatsapp-btn';
    btn.href = 'https://wa.me/2348146600581';
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group cursor-pointer';
    btn.setAttribute('aria-label', 'Contact us on WhatsApp');

    btn.innerHTML = `
        <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.022-.079-.186-.285-.438-.41-.253-.125-1.493-.737-1.724-.82-.231-.085-.415-.125-.583.125-.168.25-.658.82-.806.988-.148.168-.297.188-.55.063-.254-.125-1.07-.394-2.037-1.258-.753-.672-1.261-1.503-1.409-1.753-.148-.25-.015-.386.11-.51.114-.11.253-.297.38-.445.126-.148.168-.253.253-.41.085-.168.043-.314-.02-.438-.064-.125-.583-1.405-.8-.192-.211-.5-.548-.514-.6-.015-.05-.084-.111-.125-.213-.042-.102-.457-1.125-.626-1.5-.165-.37-.34-.316-.497-.31-.153-.006-.33-.008-.507-.008-.178 0-.467.067-.71.332-.243.265-.928.906-.928 2.212 0 1.306.953 2.568 1.085 2.746.132.178 1.874 2.862 4.542 4.013.633.274 1.13.438 1.517.562.637.202 1.218.174 1.677.105.513-.077 1.493-.61 1.7-.197.207-.413.207-.768.148-.83l-.06-.085zm-5.451 7.143c-3.23-.05-6.195-1.92-7.51-4.757-.156-.34-.33-.357-.733-.217l-1.996.697c-.365.13-.675-.17-.55-.545l.613-1.848c.112-.34.053-.626-.143-.912C.367 12.043.1 9.497.51 6.89c.552-3.53 3.327-6.398 6.862-6.86 5.151-.673 9.4 3.197 9.4 8.21 0 4.548-3.648 8.243-8.151 8.285z"/>
        </svg>
        <div class="absolute right-16 bg-black text-white text-xs font-black px-3 py-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap uppercase tracking-widest shadow-md border border-gray-800 flex flex-col items-center gap-1">
            <span>WhatsApp Us</span>
            <span class="text-[10px] text-green-400 font-medium tracking-normal">08146600581</span>
        </div>
    `;

    document.body.appendChild(btn);
}

// Call initAuth right away to update UI on load
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    addFloatingWhatsAppButton();
    setupMobileNav();
});
