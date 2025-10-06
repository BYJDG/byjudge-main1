// Payment modal state
let selectedProduct = '';
let selectedPrice = '';

function showPayment(product, price) {
  selectedProduct = product;
  selectedPrice = price;
  document.getElementById('productInfo').innerHTML = `
    <strong>Ürün:</strong> ${product} (${price})
  `;
  document.getElementById('paymentModal').style.display = 'block';
}

function closePayment() {
  document.getElementById('paymentModal').style.display = 'none';
}

// Ban Info Modal functions
function showBanInfo() {
  document.getElementById('banInfoModal').style.display = 'block';
}

function closeBanInfo() {
  document.getElementById('banInfoModal').style.display = 'none';
}

// Bypass Features Modal functions
function showBypassFeatures() {
  document.getElementById('bypassFeaturesModal').style.display = 'block';
}

function closeBypassFeatures() {
  document.getElementById('bypassFeaturesModal').style.display = 'none';
}

// Private Features Modal functions
function showPrivateFeatures() {
  document.getElementById('privateFeaturesModal').style.display = 'block';
}

function closePrivateFeatures() {
  document.getElementById('privateFeaturesModal').style.display = 'none';
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Başarıyla kopyalandı!');
  }).catch(err => {
    console.error('Kopyalama hatası:', err);
  });
}

function handlePaymentConfirmation() {
  closePayment();
  window.open('https://t.me/byjudgee', '_blank');
}

// Close modal when clicking outside
document.addEventListener('click', function (event) {
  const paymentModal = document.getElementById('paymentModal');
  const banInfoModal = document.getElementById('banInfoModal');
  const bypassFeaturesModal = document.getElementById('bypassFeaturesModal');
  const privateFeaturesModal = document.getElementById('privateFeaturesModal');
  
  if (event.target === paymentModal) {
    closePayment();
  }
  if (event.target === banInfoModal) {
    closeBanInfo();
  }
  if (event.target === bypassFeaturesModal) {
    closeBypassFeatures();
  }
  if (event.target === privateFeaturesModal) {
    closePrivateFeatures();
  }
});

// Mobile menu toggle
(function () {
  const menuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  if (!menuButton || !mobileMenu) return;

  const toggleMenu = () => {
    const isOpen = mobileMenu.classList.contains('open');
    const nextIsOpen = !isOpen;
    mobileMenu.classList.toggle('open', nextIsOpen);
    document.body.classList.toggle('no-scroll', nextIsOpen);
    menuButton.setAttribute('aria-expanded', String(nextIsOpen));
    const iconMenu = menuButton.querySelector('.icon-menu');
    const iconClose = menuButton.querySelector('.icon-close');
    if (iconMenu && iconClose) {
      iconMenu.classList.toggle('hidden', nextIsOpen);
      iconClose.classList.toggle('hidden', !nextIsOpen);
    }
  };

  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
  }

  // Close when clicking a link or outside drawer
  mobileMenu.addEventListener('click', (e) => {
    const target = e.target;
    const clickedLink = target && target.closest('a');
    const clickedInsideDrawer = target && target.closest('.mobile-drawer');
    if (clickedLink) {
      if (mobileMenu.classList.contains('open')) toggleMenu();
    } else if (!clickedInsideDrawer) {
      if (mobileMenu.classList.contains('open')) toggleMenu();
    }
  });

  // No global document listener needed; overlay handles outside clicks
})();

// Theme toggle functionality
(function() {
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');
  
  if (!themeToggle) return;
  
  // Get initial theme
  const getTheme = () => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return stored === 'dark' || (!stored && prefersDark) ? 'dark' : 'light';
  };
  
  // Apply theme
  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    
    if (sunIcon && moonIcon) {
      sunIcon.style.display = isDark ? 'block' : 'none';
      moonIcon.style.display = isDark ? 'none' : 'block';
    }
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = isDark ? '#0b1220' : '#ffffff';
    }
  };
  
  // Toggle theme
  const toggleTheme = () => {
    const currentTheme = getTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };
  
  // Initialize theme
  applyTheme(getTheme());
  
  // Add event listener
  themeToggle.addEventListener('click', toggleTheme);
})();


