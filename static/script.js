/**
 * Sawm - Prayer times and hydration app
 * Minimal, modern JavaScript with accessible theme and modal handling
 */

// Storage keys
const THEME_KEY = 'sawm-theme';
const LOCATION_KEY = 'sawm-location';
const LOCATION_EXPIRY_KEY = 'sawm-location-expiry';
const METHOD_KEY = 'sawm-method';
const LOCATION_EXPIRY_DAYS = 30;

// DOM Element References (lazy loaded)
const elements = {
    get html() { return document.documentElement; },
    get themeToggle() { return document.getElementById('themeToggle'); },
    get settingsBtn() { return document.getElementById('settingsBtn'); },
    get settingsModal() { return document.getElementById('settingsModal'); },
    get closeSettingsBtn() { return document.getElementById('closeSettings'); },
    get geolocateBtn() { return document.getElementById('geolocateBtn'); },
    get settingsLocation() { return document.getElementById('settingsLocation'); },
    get settingsMethod() { return document.getElementById('settingsMethod'); },
    get updateSettingsBtn() { return document.getElementById('updateLocationSettings'); },
    get yearEl() { return document.getElementById('year'); }
};

// ========================
// Theme Management
// ========================

function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    elements.html.classList.toggle('dark-mode', isDark);
    updateThemeIcon(isDark);
    
    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#111111' : '#ffffff');
    }
}

function updateThemeIcon(isDark) {
    const icon = elements.themeToggle?.querySelector('i');
    if (icon) {
        icon.className = isDark ? 'bx bxs-moon' : 'bx bxs-sun';
    }
}

function toggleTheme() {
    const isDark = elements.html.classList.toggle('dark-mode');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, newTheme);
    updateThemeIcon(isDark);
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#111111' : '#ffffff');
    }
}

// ========================
// Modal Management
// ========================

let previousActiveElement = null;

function openModal() {
    const modal = elements.settingsModal;
    if (!modal) return;
    
    previousActiveElement = document.activeElement;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Load cached location into input
    const cached = getCachedLocation();
    if (cached && elements.settingsLocation) {
        elements.settingsLocation.value = `${cached.city}, ${cached.country}`;
    }
    
    // Focus first focusable element
    const firstFocusable = modal.querySelector('input, button, select');
    if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 50);
    }
}

function closeModal() {
    const modal = elements.settingsModal;
    if (!modal) return;
    
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // Restore focus
    if (previousActiveElement) {
        previousActiveElement.focus();
        previousActiveElement = null;
    }
}

function handleModalKeydown(e) {
    if (!elements.settingsModal?.classList.contains('show')) return;
    
    if (e.key === 'Escape') {
        closeModal();
        return;
    }
    
    // Trap focus within modal
    if (e.key === 'Tab') {
        const modal = elements.settingsModal;
        const focusableElements = modal.querySelectorAll(
            'button, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
}

// ========================
// Location Management
// ========================

function parseLocation(input) {
    const parts = input.split(',').map(s => s.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return { city: parts[0], country: parts[1] };
    }
    return null;
}

function encodeLocation(city, country) {
    const method = localStorage.getItem(METHOD_KEY) || '2';
    return `/?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
}

function saveLocation(city, country) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + LOCATION_EXPIRY_DAYS);
    localStorage.setItem(LOCATION_KEY, JSON.stringify({ city, country }));
    localStorage.setItem(LOCATION_EXPIRY_KEY, expiry.getTime().toString());
}

function getCachedLocation() {
    const cached = localStorage.getItem(LOCATION_KEY);
    const expiry = localStorage.getItem(LOCATION_EXPIRY_KEY);
    
    if (!cached || !expiry) return null;
    
    if (Date.now() > parseInt(expiry, 10)) {
        localStorage.removeItem(LOCATION_KEY);
        localStorage.removeItem(LOCATION_EXPIRY_KEY);
        return null;
    }
    
    try {
        return JSON.parse(cached);
    } catch {
        return null;
    }
}

function updateLocation(city, country) {
    saveLocation(city, country);
    window.location.href = encodeLocation(city, country);
}

function requestGeolocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    const gpsBtn = elements.geolocateBtn;
    if (gpsBtn) {
        gpsBtn.disabled = true;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                    { headers: { 'Accept': 'application/json' } }
                );
                
                if (!response.ok) throw new Error('Geocoding failed');
                
                const data = await response.json();
                const { address } = data;
                const city = address.city || address.town || address.village || address.municipality || 'Unknown';
                const country = address.country || 'Unknown';
                
                closeModal();
                updateLocation(city, country);
            } catch (error) {
                console.error('Geolocation error:', error);
                alert('Could not determine your location. Please enter it manually.');
            } finally {
                if (gpsBtn) {
                    gpsBtn.disabled = false;
                }
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Location access denied. Please enter your location manually.');
            if (gpsBtn) {
                gpsBtn.disabled = false;
            }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
}

// ========================
// Settings Management
// ========================

function saveSettings() {
    const locationInput = elements.settingsLocation?.value.trim();
    
    if (!locationInput) {
        alert('Please enter a location');
        elements.settingsLocation?.focus();
        return;
    }
    
    const parsed = parseLocation(locationInput);
    if (!parsed) {
        alert('Please enter location in format: City, Country');
        elements.settingsLocation?.focus();
        return;
    }
    
    // Save method
    if (elements.settingsMethod) {
        localStorage.setItem(METHOD_KEY, elements.settingsMethod.value);
    }
    
    updateLocation(parsed.city, parsed.country);
}

// ========================
// Initialization
// ========================

function initializeTheme() {
    applyTheme(getPreferredTheme());
    elements.themeToggle?.addEventListener('click', toggleTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function initializeMethod() {
    const method = localStorage.getItem(METHOD_KEY) || '2';
    if (elements.settingsMethod) {
        elements.settingsMethod.value = method;
    }
}

function initializeModal() {
    // Open modal
    elements.settingsBtn?.addEventListener('click', openModal);
    
    // Close modal
    elements.closeSettingsBtn?.addEventListener('click', closeModal);
    
    // Close on backdrop click
    elements.settingsModal?.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            closeModal();
        }
    });
    
    // Keyboard handling
    document.addEventListener('keydown', handleModalKeydown);
    
    // Geolocation
    elements.geolocateBtn?.addEventListener('click', requestGeolocation);
    
    // Save settings
    elements.updateSettingsBtn?.addEventListener('click', saveSettings);
    
    // Save method on change
    elements.settingsMethod?.addEventListener('change', () => {
        localStorage.setItem(METHOD_KEY, elements.settingsMethod.value);
    });
    
    // Allow Enter key to submit in location input
    elements.settingsLocation?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveSettings();
        }
    });
}

function initializeFooter() {
    if (elements.yearEl) {
        elements.yearEl.textContent = new Date().getFullYear().toString();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeMethod();
    initializeModal();
    initializeFooter();
});
