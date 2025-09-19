# Permission Justifications for Chrome Web Store

## Extension Permissions Explained

### **Required Permissions:**

#### **1. `activeTab`**
**Purpose:** Access the currently active browser tab when user clicks the extension icon.

**Specific Use Cases:**
- Validate user is on the correct Function Health biomarkers page (`https://my.functionhealth.com/biomarkers`)
- Check if user is properly logged into their Function Health account
- Inject extraction scripts only when user initiates the action
- Provide helpful error messages if user is on wrong page or not logged in

**User Benefit:** Ensures extension only works when appropriate and provides clear guidance when it can't function.

**Privacy Impact:** Minimal - only accesses tab when user actively clicks extension icon.

---

#### **2. `scripting`**
**Purpose:** Inject JavaScript code into Function Health pages to extract biomarker data.

**Specific Use Cases:**
- Inject `final-api-extractor.js` to access Function Health's biomarker API
- Inject small validation scripts to check authentication status
- Extract and process biomarker data from the user's account
- Format data for export (CSV, JSON, table formats)

**User Benefit:** Enables the core functionality of extracting personal health data for export and analysis.

**Privacy Impact:** All injected code is static (bundled with extension), no remote code execution.

---

#### **3. Host Permissions: `https://*.functionhealth.com/*`**
**Purpose:** Allow extension to operate on Function Health domains only.

**Specific Use Cases:**
- Access Function Health's REST API endpoints to retrieve biomarker data
- Read existing authentication tokens from user's browser session
- Extract biomarker results, dates, and categorization information
- Interact with Function Health's web interface for data validation

**User Benefit:** Provides access to comprehensive biomarker data that users can export for personal use, sharing with healthcare providers, or analysis.

**Privacy Impact:** Limited to Function Health domains only - extension cannot access other websites.

---

## **Security & Privacy Measures**

### **No Remote Code Execution**
- ✅ All JavaScript code is bundled with the extension
- ✅ No `eval()` or dynamic code generation
- ✅ No external script loading from CDNs or remote servers
- ✅ No communication with external APIs outside Function Health
- ✅ All code is static and reviewable in the extension package

### **Minimal Data Handling**
- ✅ No permanent data storage - all processing is temporary
- ✅ No data transmission to external servers or third parties
- ✅ Uses existing user authentication - doesn't handle login credentials
- ✅ Data stays in user's browser throughout the entire process

### **User-Initiated Actions Only**
- ✅ Extension only activates when user clicks the icon
- ✅ All data extraction requires explicit user action (clicking extract buttons)
- ✅ No background processing or automatic data collection
- ✅ Clear user interface showing what data is being extracted

### **Domain Restrictions**
- ✅ Extension only works on Function Health domains
- ✅ Cannot access other websites or user data from other services
- ✅ Host permissions are narrowly scoped to necessary domains only

---

## **Final Permission Set - Minimal Required**

The extension uses only the absolute minimum permissions necessary for functionality:

### **Confirmed API Usage:**
- `chrome.scripting.executeScript()` → Requires `"scripting"` permission
- `chrome.tabs.query()` → Requires `"activeTab"` permission  
- `chrome.tabs.sendMessage()` → Requires `"activeTab"` permission
- `chrome.tabs.update()` → Requires `"activeTab"` permission
- `chrome.runtime.getManifest()` → No permission required
- `chrome.runtime.onMessage` → No permission required

### **Session-Only Features (v2.2.0+)**
- **Advanced Filters** - Filter preferences are session-only and reset when popup closes. No persistent storage needed or used.

This represents the absolute minimum permission set required for the extension to function.

---

## **Chrome Web Store Policy Compliance**

### **Single Purpose**
The extension has one clear purpose: Extract and export personal biomarker data from Function Health accounts.

### **Limited Permissions**
Only requests the minimum permissions necessary for core functionality.

### **User Transparency**
- Clear description of what the extension does
- Open source code for full transparency
- Comprehensive privacy policy explaining data handling
- No hidden functionality or undisclosed data collection

### **Legitimate Use Case**
Helps users export their own health data for:
- Personal health record keeping
- Sharing with healthcare providers
- Data analysis and trend tracking
- Integration with other health tools

---

## **Technical Implementation**

### **API Access Method**
- Uses Function Health's existing REST API (`/api/v1/requisitions`)
- Leverages user's existing authentication session
- No credential storage or handling by the extension
- Standard HTTP requests using browser's native fetch API

### **Data Processing**
- All processing occurs locally in user's browser
- Data parsing and categorization happens client-side
- Export formatting (CSV, JSON, table) done in browser memory
- No server-side processing or external data transmission

### **Code Architecture**
- Content scripts for page interaction and validation
- Popup interface for user controls and export options
- Modular design with clear separation of concerns
- Comprehensive error handling and user feedback

This permission structure provides the minimum necessary access to deliver the extension's core value while maintaining strong privacy and security practices.
