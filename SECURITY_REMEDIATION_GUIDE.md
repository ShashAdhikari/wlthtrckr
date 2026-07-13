# Security Remediation Guide - WLTH Application

This guide provides step-by-step instructions to implement the security fixes identified in the audit report.

---

## Phase 1: Quick Wins (Recommended - Implement First)

### 1. Add SRI Hashes to CDN Scripts

**File**: `index.html`  
**Effort**: 15 minutes  
**Impact**: Prevents CDN compromise attacks  
**Priority**: 🔴 HIGH

**Current Code** (lines where scripts are loaded):
Search for all `<script src="https://cdn` tags.

**How to Generate SRI Hashes**:
1. Visit https://www.srihash.org/
2. Paste your CDN URL (e.g., https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js)
3. Copy the integrity hash and crossorigin attribute
4. Add to your script tag

**Implementation**:

```html
<!-- BEFORE: Vulnerable -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.x"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- AFTER: Secure -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
    integrity="sha384-e1r+kA80+Z9O5n8dHUlGp8l5VzF8L3hHwlEFCMxMK5xRvQ/B1xOzDQdJNGu/l4e4b"
    crossorigin="anonymous"></script>
    
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"
    integrity="sha512-16esztpgkirJm8gs1xdlмлrQH6DAkUirPZeWDe8WlS8S4oRIv1GTlAc3ioVsv32gmlYvnvm8gcXrBed8NjLgQ=="
    crossorigin="anonymous"></script>
    
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
    integrity="sha512-WrzlA55wgW0pDkMbakTZ3nXS8BqKdBIg7NAw2V3NeJj4RN6mrmOvLkr8PYWFNi5KnJwJRSNnrHRKQ3VwRpJ7Aw=="
    crossorigin="anonymous"></script>
```

**Validation**:
```bash
# Test that scripts still load correctly
# Open DevTools → Console, check for no CSP violations
# Should see: ✅ All resources loaded successfully
```

---

### 2. Pin Specific Dependency Versions

**File**: `index.html`  
**Effort**: 10 minutes  
**Impact**: Ensures consistent versions across deployments  
**Priority**: 🟡 MEDIUM

**Why**:
- Using version ranges (@4.x) means automatic updates
- Could introduce breaking changes
- Makes security audits harder

**Implementation**:

```html
<!-- BEFORE: Flexible versions (risky) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.x"></script>
<script src="https://cdn.jsdelivr.net/npm/three@latest"></script>

<!-- AFTER: Pinned versions (safe) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
```

**Version Reference**:
```
Chart.js: 4.4.0 (current stable)
Three.js: r128
GSAP: 3.12.2
SheetJS: 0.18.5
```

---

### 3. Add File Size Validation

**File**: `app.js`  
**Effort**: 20 minutes  
**Impact**: Prevents DoS attacks via large file uploads  
**Priority**: 🟡 MEDIUM

**Current Code** (around line 1136):
```javascript
document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    // No size validation!
    if (file.type.includes('csv') || file.type.includes('sheet')) {
        // Process file
    }
});
```

**Fixed Code**:
```javascript
// Add file size constant at top of file
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    
    // NEW: Add file size validation
    if (file.size > MAX_FILE_SIZE) {
        Toast.show('❌ File too large! Maximum size is 10MB. Your file: ' + 
                   (file.size / 1024 / 1024).toFixed(1) + 'MB');
        e.target.value = '';
        return;
    }
    
    if (file.type.includes('csv') || file.type.includes('sheet')) {
        try {
            Upload.init(file);
        } catch (err) {
            Toast.show('❌ Error processing file: ' + err.message);
        }
    } else {
        Toast.show('❌ Unsupported file type. Use CSV or Excel.');
    }
});
```

**Testing**:
```javascript
// Test in browser console
// Try uploading a file > 10MB
// Should see: "File too large!" error message
```

---

## Phase 2: Medium Priority (2-4 weeks)

### 4. Improve CSV Parser

**File**: `app.js`  
**Effort**: 1-2 hours  
**Impact**: Better handling of edge cases in data import  
**Priority**: 🟡 MEDIUM

**Current Code** (lines 1021-1039):
```javascript
parseCSV: function(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.length) return [];
    
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split(',');
        // Simple parsing - doesn't handle quoted fields properly
    }
    return records;
}
```

**Improved Implementation** (using PapaParse library):

Step 1: Add PapaParse to index.html (already in CDN):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"
    integrity="sha512-dfX5uYVXzyU8+KHqj8PIO2ZRHpLMoqXFDYvWGLUTRPcJ/5kYnZbuVExXeFKTvMRWWURf2ZModDy5K3NwZZkvFw=="
    crossorigin="anonymous"></script>
```

Step 2: Replace parseCSV function:
```javascript
parseCSV: function(text) {
    return Papa.parse(text, {
        header: true,           // Treat first row as column names
        skipEmptyLines: true,   // Ignore blank rows
        dynamicTyping: true,    // Auto-convert to numbers where possible
        transformHeader: (h) => h.toLowerCase().trim(),
        error: (error) => {
            Toast.show('⚠️ CSV parsing error: ' + error.message);
            return [];
        }
    }).data;
}
```

**Testing**:
```csv
# Test Case 1: Quoted fields with commas
description,amount,category,date,type
"Rent, utilities, internet",5000,housing,2024-01-01,expense
# Should parse correctly

# Test Case 2: Empty lines
description,amount,category,date,type

"Salary",5000,salary,2024-01-01,income

# Should skip empty lines and parse correctly
```

---

### 5. Add Formula Injection Protection on Export

**File**: `app.js`  
**Effort**: 30 minutes  
**Impact**: Prevents Excel formula attacks when data is re-opened in Excel  
**Priority**: 🟡 MEDIUM

**Current Export Code** (around line 1148):
```javascript
Backup.downloadJSON = function() {
    const data = JSON.stringify(Store.data, null, 2);
    // Downloads raw data without protection
};
```

**Fixed Implementation**:
```javascript
// Add sanitization function
function sanitizeForExcel(value) {
    if (typeof value !== 'string') return value;
    
    // Prevent formula injection by prefixing dangerous characters
    if (/^[=+\-@]/.test(value)) {
        return "'" + value;  // Prefix with apostrophe
    }
    return value;
}

// Apply when exporting
Backup.downloadJSON = function() {
    // Deep clone and sanitize data
    const sanitized = JSON.parse(JSON.stringify(Store.data));
    
    sanitized.transactions = sanitized.transactions.map(t => ({
        ...t,
        description: sanitizeForExcel(t.description),
        category: sanitizeForExcel(t.category)
    }));
    
    sanitized.investments = sanitized.investments.map(i => ({
        ...i,
        name: sanitizeForExcel(i.name)
    }));
    
    sanitized.debts = sanitized.debts.map(d => ({
        ...d,
        name: sanitizeForExcel(d.name)
    }));
    
    const data = JSON.stringify(sanitized, null, 2);
    // Continue with download...
};
```

---

## Phase 3: High Priority (4-8 weeks)

### 6. Implement localStorage Encryption

**File**: `app.js`  
**Effort**: 4-6 hours  
**Impact**: 🔴 Critical - Protects sensitive financial data at rest  
**Priority**: 🔴 HIGH (but requires master password)

**Note**: This requires adding a login/master password screen.

**Conceptual Implementation**:

```javascript
// Add new SecureStore module
const SecureStore = {
    // Use Web Crypto API (built into all modern browsers)
    
    async deriveKey(masterPassword) {
        const encoder = new TextEncoder();
        const data = encoder.encode(masterPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        
        return crypto.subtle.importKey(
            'raw',
            hashBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    },
    
    async encrypt(plaintext, masterPassword) {
        const key = await this.deriveKey(masterPassword);
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        
        // Generate random IV (Initialization Vector)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the data
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        
        // Combine IV + ciphertext and encode as base64
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);
        
        return btoa(String.fromCharCode(...combined));
    },
    
    async decrypt(encryptedData, masterPassword) {
        const key = await this.deriveKey(masterPassword);
        
        // Decode from base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        // Extract IV and ciphertext
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        
        // Decrypt
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(plaintext);
    }
};

// Usage example:
async function saveEncrypted(key, value, masterPassword) {
    const json = JSON.stringify(value);
    const encrypted = await SecureStore.encrypt(json, masterPassword);
    localStorage.setItem('wlth_' + key + '_encrypted', encrypted);
}

async function loadEncrypted(key, masterPassword) {
    const encrypted = localStorage.getItem('wlth_' + key + '_encrypted');
    if (!encrypted) return null;
    
    try {
        const json = await SecureStore.decrypt(encrypted, masterPassword);
        return JSON.parse(json);
    } catch (e) {
        console.error('Decryption failed (wrong password?):', e);
        return null;
    }
}
```

**Frontend Changes** (UI for master password):
```html
<!-- Add master password modal -->
<div class="modal" id="master-password-modal">
    <div class="modal-content glass">
        <h3>Secure Your Financial Data</h3>
        <p>Enter a master password to encrypt your data locally.</p>
        <input type="password" id="master-password-input" placeholder="Enter master password">
        <button onclick="initializeEncryption()">Secure My Data</button>
        <p class="help-text">⚠️ If you forget this password, your encrypted data cannot be recovered!</p>
    </div>
</div>
```

---

## Phase 4: Ongoing Monitoring

### 7. Set Up Dependency Monitoring

**Tools**:
1. **GitHub Dependabot**: Automatic security alerts
2. **Snyk**: Continuous vulnerability scanning
3. **npm audit**: Local dependency checks

**Implementation**:

```bash
# Run locally
npm audit

# Add to CI/CD pipeline
npm audit --audit-level=moderate
```

**GitHub Setup** (if using GitHub):
1. Go to Settings → Security & Analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"
4. Add workflow file `.github/workflows/security.yml`:

```yaml
name: Security Audit
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  push:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

---

## Implementation Checklist

### Phase 1 (Week 1):
- [ ] Add SRI hashes to all CDN scripts
- [ ] Pin specific dependency versions
- [ ] Add file size validation to imports
- [ ] Test all changes in browser

### Phase 2 (Weeks 2-4):
- [ ] Implement improved CSV parser (PapaParse)
- [ ] Add formula injection protection on export
- [ ] Test CSV import with edge cases
- [ ] Update documentation

### Phase 3 (Weeks 4-8):
- [ ] Design master password UI
- [ ] Implement encryption module
- [ ] Add password reset mechanism
- [ ] Thorough testing of encrypted storage
- [ ] User documentation

### Phase 4 (Ongoing):
- [ ] Set up dependency monitoring
- [ ] Weekly security audit runs
- [ ] Monthly vulnerability checks
- [ ] Quarterly security review

---

## Testing After Implementation

### Phase 1 Testing:
```javascript
// Verify SRI is working
// Console should show: ✅ No CSP violations

// Verify file size validation
// Try uploading 50MB file → Should be blocked

// Verify version pinning
// All scripts should load from exact versions
```

### Phase 2 Testing:
```csv
# Test CSV with quoted fields
description,amount,category
"Lunch, coffee",25.50,food
"Rent, utilities",5000,housing
# Should parse correctly

# Test formula injection prevention
=cmd|'/c calc'!A1,1000,salary
# Should be prefixed with apostrophe on export
```

### Phase 3 Testing:
```javascript
// Test encryption/decryption cycle
const password = "MySecurePassword123!";
const data = { test: "sensitive data" };

const encrypted = await SecureStore.encrypt(JSON.stringify(data), password);
const decrypted = JSON.parse(await SecureStore.decrypt(encrypted, password));
console.assert(decrypted.test === data.test, "Encryption failed!");
```

---

## Rollback Plan

If any fixes cause issues:

1. **Phase 1**: Safe to rollback (no functional changes)
   - Simply remove integrity and crossorigin attributes
   
2. **Phase 2**: Safe to rollback (backwards compatible)
   - Old CSV parser still works if new one has issues
   
3. **Phase 3**: Requires migration strategy
   - Keep old localStorage format for 1 version
   - Support both encrypted and unencrypted data
   - Provide clear migration path

---

## Security Maintenance

### Monthly:
- [ ] Check for new CVE advisories
- [ ] Run npm audit
- [ ] Review security logs

### Quarterly:
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Dependency review

### Annually:
- [ ] Third-party security assessment
- [ ] Compliance audit (GDPR/CCPA)
- [ ] Threat model review

---

For questions or issues implementing these fixes, refer back to the main `SECURITY_AUDIT_REPORT.md` document.
