# Code Implementation Guide for BabyPeek & VizCraft
**For:** Jarvis (Development Agent)  
**From:** Athena (Marketing Agent)  
**Created:** 2026-02-08  
**Priority:** URGENT

---

## What This Document Contains

**CODE ONLY.** No marketing, no ads, no campaign management.

Your job: Implement the technical changes that will improve conversion rates.  
My job (Athena): Everything marketing-related (Facebook Ads, copy, campaigns, analytics).

---

## PHASE 1: CRITICAL CODE FIXES (Week 1)
**Ship by:** Feb 15, 2026

### 1.1 Mobile Upload Button - BabyPeek & VizCraft
**Priority:** 🔴 CRITICAL  
**Problem:** 0.15% upload rate suggests mobile UX is broken

#### Desktop Implementation:
```css
.upload-cta {
  height: 60px;
  width: 100%;
  max-width: 400px;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border: none;
}

.upload-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
}

.upload-cta:active {
  transform: translateY(0);
}

.upload-cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### Mobile Sticky Bottom Implementation:
```css
@media (max-width: 768px) {
  .upload-cta-sticky {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    width: 100%;
    max-width: 100%;
    border-radius: 0;
    z-index: 1000;
    padding: 16px 24px;
    font-size: 22px;
    font-weight: 700;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    
    /* iOS safe area support */
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }

  /* Prevent content overlap */
  body.sticky-cta-active {
    padding-bottom: 100px;
  }

  /* Hide on scroll up (optional UX enhancement) */
  .upload-cta-sticky.hidden {
    transform: translateY(100%);
    transition: transform 0.3s ease;
  }
}
```

#### JavaScript for Scroll Behavior:
```javascript
// Show/hide sticky button based on scroll direction
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  const stickyButton = document.querySelector('.upload-cta-sticky');
  
  if (!stickyButton) return;
  
  if (currentScrollY > lastScrollY && currentScrollY > 100) {
    // Scrolling down - hide button
    stickyButton.classList.add('hidden');
  } else {
    // Scrolling up - show button
    stickyButton.classList.remove('hidden');
  }
  
  lastScrollY = currentScrollY;
});
```

#### HTML Structure:
```html
<button class="upload-cta upload-cta-sticky" id="mobile-upload-btn">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
    <span style="font-size: 22px; font-weight: 700;">Start FREE Preview</span>
    <span style="font-size: 14px; opacity: 0.9;">See results before you pay</span>
  </div>
</button>
```

**Testing Requirements:**
- [ ] iPhone Safari (iOS 16+)
- [ ] Android Chrome
- [ ] iPad
- [ ] Verify safe-area-inset-bottom works on notch devices
- [ ] Test scroll hide/show behavior
- [ ] Verify no content overlap
- [ ] Test tap target size (min 44px × 44px)

---

### 1.2 One-Click Upload Flow - BabyPeek & VizCraft
**Priority:** 🔴 CRITICAL  
**Problem:** Too many steps between "click button" and "start upload"

#### Current Flow (bad):
1. User clicks "Upload Photo"
2. Browser shows file picker
3. User selects file
4. Confirmation modal (???)
5. Upload starts

#### New Flow (good):
1. User clicks "Start FREE Preview"
2. Upload starts immediately

#### Implementation:
```html
<!-- Hidden file input -->
<input 
  type="file" 
  accept="image/*" 
  capture="environment"
  id="upload-input"
  style="display: none;"
  aria-label="Upload photo"
/>

<!-- Visible button -->
<button 
  onclick="document.getElementById('upload-input').click()"
  class="upload-cta upload-cta-sticky"
>
  Start FREE Preview
</button>
```

#### JavaScript Handler:
```javascript
const uploadInput = document.getElementById('upload-input');

uploadInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }
  
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showError('Image must be smaller than 10MB');
    return;
  }
  
  // Track upload start (PostHog)
  posthog.capture('upload_started', {
    file_type: file.type,
    file_size: file.size,
    source: 'one_click_upload'
  });
  
  // Show loading state
  showLoadingState();
  
  try {
    // Start upload immediately
    await uploadToServer(file);
    
    // Track upload success
    posthog.capture('upload_completed', {
      file_type: file.type,
      duration_ms: Date.now() - startTime
    });
    
  } catch (error) {
    // Track upload failure
    posthog.capture('upload_failed', {
      error: error.message
    });
    
    showError('Upload failed. Please try again.');
  }
});

async function uploadToServer(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      // Add CSRF token if needed
    }
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  
  const result = await response.json();
  return result;
}

function showLoadingState() {
  const button = document.querySelector('.upload-cta-sticky');
  button.disabled = true;
  button.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div class="spinner"></div>
      <span>Processing...</span>
    </div>
  `;
}

function showError(message) {
  // Show error toast/modal
  alert(message); // Replace with better UI
}
```

#### Loading Spinner CSS:
```css
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Testing Requirements:**
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Shows loading state during upload
- [ ] Shows error if upload fails
- [ ] Handles slow connections gracefully
- [ ] Validates file type/size before upload
- [ ] Tracks PostHog events correctly

---

### 1.3 Trust Signals & Messaging - BabyPeek & VizCraft
**Priority:** 🔴 CRITICAL  
**Problem:** Users don't know they can preview for free

#### Above-the-fold Trust Banner:
```html
<div class="trust-banner">
  <div class="trust-item">
    <svg class="icon-check"><!-- checkmark icon --></svg>
    <span>Free preview before purchase</span>
  </div>
  <div class="trust-item">
    <svg class="icon-lock"><!-- lock icon --></svg>
    <span>Secure upload</span>
  </div>
  <div class="trust-item">
    <svg class="icon-heart"><!-- heart icon --></svg>
    <span>Pay only if you love it</span>
  </div>
</div>
```

#### CSS:
```css
.trust-banner {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 24px 0;
  padding: 16px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #065f46;
}

.icon-check,
.icon-lock,
.icon-heart {
  width: 20px;
  height: 20px;
  color: #10b981;
}

@media (max-width: 768px) {
  .trust-banner {
    flex-direction: column;
    gap: 12px;
  }
}
```

**Athena will provide:** Final copy for trust signals (I'm handling all copy).

---

### 1.4 PostHog Integration Verification - BabyPeek & VizCraft
**Priority:** 🔴 CRITICAL  
**Problem:** Need to ensure events are tracking correctly

#### Events to Track:

```javascript
// Page view (automatic)
posthog.capture('$pageview');

// Upload button clicked
posthog.capture('upload_button_clicked', {
  button_location: 'sticky_bottom', // or 'hero', 'inline'
  device_type: /Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop'
});

// Upload started (file selected)
posthog.capture('upload_started', {
  file_type: file.type,
  file_size: file.size,
  source: 'one_click_upload'
});

// Upload completed (server processed)
posthog.capture('upload_completed', {
  processing_time_ms: duration,
  result_quality: 'hd' // or whatever metadata
});

// Payment page viewed
posthog.capture('payment_page_viewed', {
  price_tier: 'basic' // or 'plus', 'pro'
});

// Purchase completed
posthog.capture('purchase', {
  value: amount,
  currency: 'USD',
  tier: 'basic'
});
```

#### Verify PostHog Installation:
```javascript
// Add to <head> or before closing </body>
<script>
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  
  posthog.init('phx_7POlGlf6Kvn9RNlJE36gwnzo9JjmNLNIQkfuGugJF8E8V65', {
    api_host: 'https://app.posthog.com',
    loaded: function(posthog) {
      console.log('PostHog loaded successfully');
    }
  });
</script>
```

**Testing Requirements:**
- [ ] Verify events appear in PostHog dashboard
- [ ] Test event properties are correct
- [ ] Verify user identification works
- [ ] Check session recording is enabled
- [ ] Verify feature flags load correctly

---

## PHASE 2: A/B TESTING INFRASTRUCTURE (Week 2)
**Ship by:** Feb 22, 2026

### 2.1 Feature Flag Setup for A/B Tests - BabyPeek & VizCraft
**Priority:** 🟠 HIGH

#### Athena will configure in PostHog dashboard:
- Feature flag names
- Rollout percentages
- Targeting rules

#### Your job: Implement the code that responds to flags

```javascript
// Wait for PostHog to load
posthog.onFeatureFlags(function() {
  
  // Test 1: Sticky CTA variants
  const ctaVariant = posthog.getFeatureFlag('sticky_cta_test');
  
  switch(ctaVariant) {
    case 'control':
      renderStandardButton();
      break;
    case 'sticky_free_preview':
      renderStickyWithFreePreview();
      break;
    case 'sticky_with_arrow':
      renderStickyWithArrow();
      break;
    case 'sticky_with_countdown':
      renderStickyWithCountdown();
      break;
    default:
      renderStandardButton();
  }
  
  // Track which variant user saw
  posthog.capture('ab_test_variant_shown', {
    test_name: 'sticky_cta_test',
    variant: ctaVariant || 'control'
  });
  
});
```

#### Variant Rendering Functions:
```javascript
function renderStandardButton() {
  const button = document.getElementById('upload-btn');
  button.className = 'upload-cta';
  button.innerHTML = 'Start FREE Preview';
}

function renderStickyWithFreePreview() {
  const button = document.getElementById('upload-btn');
  button.className = 'upload-cta upload-cta-sticky';
  button.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <span style="font-size: 22px; font-weight: 700;">Start FREE Preview</span>
      <span style="font-size: 14px;">See results before you pay</span>
    </div>
  `;
}

function renderStickyWithArrow() {
  const button = document.getElementById('upload-btn');
  button.className = 'upload-cta upload-cta-sticky';
  button.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span>Start FREE Preview</span>
      <span class="arrow-bounce">↑</span>
    </div>
  `;
}

function renderStickyWithCountdown() {
  const button = document.getElementById('upload-btn');
  button.className = 'upload-cta upload-cta-sticky';
  
  // Show countdown timer (fake urgency)
  const minutesLeft = 15;
  button.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <span style="font-size: 18px; font-weight: 700;">Start FREE Preview</span>
      <span style="font-size: 14px;">⏱️ ${minutesLeft} minutes of free previews left</span>
    </div>
  `;
}
```

#### Arrow Bounce Animation:
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.arrow-bounce {
  display: inline-block;
  animation: bounce 1.5s ease-in-out infinite;
}
```

**Testing Requirements:**
- [ ] Each variant renders correctly
- [ ] Feature flags load before page render
- [ ] Tracking events fire for each variant
- [ ] No flickering/layout shift when variant loads

---

### 2.2 Pricing Tiers UI - BabyPeek & VizCraft
**Priority:** 🟠 HIGH  
**Goal:** Increase AOV from $9.99 to $14.99+

#### HTML Structure:
```html
<div class="pricing-container">
  <h2>Choose Your Package</h2>
  <p class="pricing-subtitle">All packages include instant delivery and money-back guarantee</p>
  
  <div class="pricing-cards">
    <!-- Basic Tier -->
    <div class="pricing-card">
      <h3>Basic</h3>
      <div class="price">
        <span class="currency">$</span>
        <span class="amount">9.99</span>
      </div>
      <ul class="features">
        <li>✓ 1 HD image</li>
        <li>✓ Basic enhancement</li>
        <li>✓ Instant download</li>
      </ul>
      <button class="btn-select" data-tier="basic" data-price="9.99">
        Choose Basic
      </button>
    </div>
    
    <!-- Plus Tier (RECOMMENDED) -->
    <div class="pricing-card pricing-card-popular">
      <div class="badge-popular">⭐ MOST POPULAR</div>
      <h3>Plus</h3>
      <div class="price">
        <span class="currency">$</span>
        <span class="amount">14.99</span>
      </div>
      <ul class="features">
        <li>✓ 3 HD images</li>
        <li>✓ Advanced enhancement</li>
        <li>✓ Multiple styles</li>
        <li>✓ Priority processing</li>
      </ul>
      <button class="btn-select btn-select-popular" data-tier="plus" data-price="14.99">
        Choose Plus
      </button>
    </div>
    
    <!-- Pro Tier -->
    <div class="pricing-card">
      <h3>Pro</h3>
      <div class="price">
        <span class="currency">$</span>
        <span class="amount">24.99</span>
      </div>
      <ul class="features">
        <li>✓ 10 HD images</li>
        <li>✓ Premium enhancement</li>
        <li>✓ All styles + custom</li>
        <li>✓ Commercial license</li>
        <li>✓ 24h support</li>
      </ul>
      <button class="btn-select" data-tier="pro" data-price="24.99">
        Choose Pro
      </button>
    </div>
  </div>
</div>
```

#### CSS:
```css
.pricing-container {
  max-width: 1200px;
  margin: 48px auto;
  padding: 0 24px;
  text-align: center;
}

.pricing-subtitle {
  color: #6b7280;
  margin-bottom: 32px;
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.pricing-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 32px 24px;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.pricing-card-popular {
  border-color: #667eea;
  border-width: 3px;
  transform: scale(1.05);
  box-shadow: 0 12px 48px rgba(102, 126, 234, 0.2);
  z-index: 10;
}

.badge-popular {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.pricing-card h3 {
  font-size: 24px;
  margin-bottom: 16px;
  color: #1f2937;
}

.price {
  font-size: 48px;
  font-weight: 700;
  color: #111827;
  margin: 16px 0;
}

.currency {
  font-size: 24px;
  vertical-align: super;
}

.features {
  list-style: none;
  padding: 0;
  margin: 24px 0;
  text-align: left;
}

.features li {
  padding: 8px 0;
  color: #4b5563;
}

.btn-select {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  background: #f3f4f6;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-select:hover {
  background: #e5e7eb;
}

.btn-select-popular {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-select-popular:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

@media (max-width: 768px) {
  .pricing-cards {
    grid-template-columns: 1fr;
  }
  
  .pricing-card-popular {
    transform: scale(1);
  }
}
```

#### JavaScript for Tier Selection:
```javascript
document.querySelectorAll('.btn-select').forEach(button => {
  button.addEventListener('click', (e) => {
    const tier = e.target.dataset.tier;
    const price = e.target.dataset.price;
    
    // Track selection
    posthog.capture('pricing_tier_selected', {
      tier: tier,
      price: parseFloat(price)
    });
    
    // Store selection
    sessionStorage.setItem('selected_tier', tier);
    sessionStorage.setItem('selected_price', price);
    
    // Proceed to checkout
    window.location.href = `/checkout?tier=${tier}&price=${price}`;
  });
});
```

**Testing Requirements:**
- [ ] All 3 tiers display correctly
- [ ] Middle tier visually stands out
- [ ] Buttons track clicks in PostHog
- [ ] Selection persists to checkout page
- [ ] Responsive on mobile

---

### 2.3 Facebook Pixel Integration - BabyPeek & VizCraft
**Priority:** 🟠 HIGH  
**Note:** Athena will provide the Pixel ID

#### Install Facebook Pixel:
```html
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', 'YOUR_PIXEL_ID'); // Athena will provide
fbq('track', 'PageView');
</script>
<noscript>
<img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"/>
</noscript>
<!-- End Facebook Pixel Code -->
```

#### Track Events:
```javascript
// Upload started
fbq('track', 'InitiateCheckout', {
  content_name: 'Upload Started',
  content_category: 'Conversion'
});

// Upload completed (ready to buy)
fbq('track', 'AddPaymentInfo', {
  content_name: 'Upload Completed',
  content_category: 'Conversion'
});

// Purchase
fbq('track', 'Purchase', {
  value: 9.99,
  currency: 'USD',
  content_name: 'Image Enhancement',
  content_type: 'product'
});
```

**Testing Requirements:**
- [ ] Pixel fires on page load
- [ ] Events appear in Facebook Events Manager
- [ ] Purchase value matches actual amount
- [ ] No duplicate events

---

## PHASE 3: PERFORMANCE OPTIMIZATION (Week 3)
**Ship by:** Mar 1, 2026

### 3.1 Image Upload Performance - BabyPeek & VizCraft
**Priority:** 🟡 MEDIUM

#### Optimize Upload Speed:

```javascript
// Compress image before upload (reduce bandwidth)
async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        }, 'image/jpeg', 0.85);
      };
    };
  });
}

// Use in upload flow
uploadInput.addEventListener('change', async (event) => {
  const originalFile = event.target.files[0];
  const compressedFile = await compressImage(originalFile);
  
  console.log(`Compressed from ${originalFile.size} to ${compressedFile.size} bytes`);
  
  await uploadToServer(compressedFile);
});
```

#### Upload Progress Bar:
```html
<div class="upload-progress" style="display: none;">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 0%;"></div>
  </div>
  <p class="progress-text">Uploading: 0%</p>
</div>
```

```css
.upload-progress {
  margin: 24px 0;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.progress-text {
  margin-top: 8px;
  font-size: 14px;
  color: #6b7280;
  text-align: center;
}
```

```javascript
async function uploadToServer(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  const progressBar = document.querySelector('.upload-progress');
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  
  progressBar.style.display = 'block';
  
  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const percentComplete = (e.loaded / e.total) * 100;
      progressFill.style.width = percentComplete + '%';
      progressText.textContent = `Uploading: ${Math.round(percentComplete)}%`;
    }
  });
  
  return new Promise((resolve, reject) => {
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });
    
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}
```

**Testing Requirements:**
- [ ] Progress bar shows during upload
- [ ] Compression reduces file size by 50%+
- [ ] Upload works on slow 3G
- [ ] No quality loss visible to user

---

## TECHNICAL DEBT & CLEANUP

### Error Handling:
```javascript
// Global error handler
window.addEventListener('error', (event) => {
  posthog.capture('javascript_error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  posthog.capture('unhandled_promise_rejection', {
    reason: event.reason
  });
});
```

### Performance Monitoring:
```javascript
// Track page load performance
window.addEventListener('load', () => {
  const perfData = performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  
  posthog.capture('page_performance', {
    load_time_ms: pageLoadTime,
    dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
    time_to_interactive: perfData.domInteractive - perfData.navigationStart
  });
});
```

---

## DEPLOYMENT CHECKLIST

### Before Deploy:
- [ ] All code tested on iPhone Safari
- [ ] All code tested on Android Chrome
- [ ] PostHog events verified in dashboard
- [ ] Facebook Pixel events verified
- [ ] No console errors
- [ ] Mobile viewport meta tag present
- [ ] Images optimized (WebP where supported)
- [ ] CSS/JS minified for production

### After Deploy:
- [ ] Verify upload flow works end-to-end
- [ ] Check PostHog for event tracking
- [ ] Check Facebook Events Manager
- [ ] Monitor error logs (Sentry/similar)
- [ ] Test on real devices (not just emulators)

---

## QUESTIONS FOR RICARDO

Before starting implementation:

1. **Tech stack?**
   - Framework: Next.js / React / Vue / Vanilla?
   - Backend: Node / Python / PHP?
   - Hosting: Vercel / AWS / Custom?

2. **Existing integrations?**
   - Is PostHog already installed?
   - Is Facebook Pixel already installed?
   - What payment processor? (Stripe / PayPal)

3. **Repo access?**
   - GitHub repo URL?
   - Which branch should I work on?
   - Any CI/CD pipelines?

4. **Timeline?**
   - Can Phase 1 ship by Feb 15?
   - Any blockers I should know about?

---

**Created by:** Athena 🦉  
**For:** Jarvis (code implementation only)  
**Version:** 1.0  
**Last Updated:** 2026-02-08
