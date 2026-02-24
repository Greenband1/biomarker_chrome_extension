# Chrome Web Store Listing Materials

## Store Listing Information

### **Extension Name**
```
Function Health Data Extractor
```

### **Short Description** (132 characters max)
```
Extract and export your biomarker data from Function Health into CSV, JSON, and table formats.
```

### **Detailed Description** (16,000 characters max)
```
🩺 Function Health Data Extractor

Export your biomarker data from Function Health into convenient formats for analysis, sharing with healthcare providers, or personal record-keeping.

⚠️ DISCLAIMER: This extension is not affiliated with or endorsed by Function Health. It is an independent tool created to help users export their own biomarker data for personal use.

🔬 KEY FEATURES

✅ One-Click Extraction - Single "Extract My Biomarkers" button for streamlined workflow
✅ Complete Historical Data - Automatically extracts all biomarker results across all test dates
✅ Advanced Filtering - Filter by specific dates, categories, or get latest results only
✅ Latest Only Mode - Get the most recent result for each biomarker with category flexibility
✅ Multiple Export Formats - CSV (Excel-compatible), JSON, and clipboard-friendly formats
✅ Smart Categorization - Automatically organizes biomarkers by medical category
✅ Progressive Interface - Export options appear after extraction for clean workflow
✅ Auto-Navigation - Automatically navigates to correct Function Health page
✅ Session Filters - Filter preferences persist during your session
✅ Premium Design - Health-focused UI with custom icons, DM Sans typography, and refined micro-interactions

📊 BIOMARKER CATEGORIES

• Heart & Cardiovascular
• Blood & Hematology  
• Metabolic & Diabetes
• Kidney & Renal
• Liver Function
• Thyroid
• Hormones
• Nutrients & Vitamins
• Infectious Disease
• Inflammation
• General Health

🚀 HOW TO USE

1. Log into your Function Health account
2. Navigate to the biomarkers page (extension auto-navigates if needed)
3. Click the extension icon in your Chrome toolbar
4. Click "Extract My Biomarkers" to get all your historical data
5. Export in your preferred format (CSV, JSON, or copy to clipboard)
6. Use "Advanced Filters" for customized exports:
   - Latest Only: Get most recent result per biomarker
   - Date Selection: Choose specific test dates
   - Category Filtering: Select biomarker categories

📋 EXPORT FORMATS

CSV Format - Perfect for Excel, Google Sheets, or data analysis:
Category,Biomarker,Quest ID,Status,Value,Unit,Reference Range,Optimal Range Min,Optimal Range Max,Out of Range Direction,Date
Heart & Cardiovascular,Apolipoprotein B (ApoB),50057700,Out of Range,97,mg/dL,<90,40,70,above,2026-01-19

Quest ID enables LOINC mapping for lab interoperability.
Optimal ranges are Function Health's tighter wellness targets (distinct from Quest reference ranges).

JSON Format - Machine-readable for developers and advanced analysis
Table Format - Tab-separated for easy pasting into documents

🔒 PRIVACY & SECURITY

• All processing happens locally in your browser
• No data sent to external servers or third parties
• Uses your existing Function Health login session
• Extension doesn't store your data permanently
• No remote code execution - all code is bundled with extension
• Minimal permissions: only activeTab, scripting, and Function Health domain access
• Open source code for full transparency

⚖️ LEGAL NOTICE

This extension is for personal use to export your own biomarker data. Please ensure your usage complies with Function Health's terms of service. The extension creators are not responsible for any violations of terms of service.

🛠️ TECHNICAL REQUIREMENTS

• Google Chrome browser
• Active Function Health account
• Must be logged into Function Health
• Internet connection for API access

💡 TROUBLESHOOTING

If you encounter issues:
• Ensure you're logged into Function Health
• Extension only works on functionhealth.com
• Extension auto-navigates to biomarkers page if needed
• Click the help icon (ℹ️) in the extension for detailed instructions
• Refresh the page if extraction fails
• Filter settings reset each session - this is intentional

🤝 OPEN SOURCE

This extension is open source and available on GitHub. Contributions, bug reports, and feature requests are welcome at: https://github.com/Greenband1/functionhealth_chrome_extension

📞 SUPPORT

For support, bug reports, or feature requests, please visit our GitHub repository or contact us through the Chrome Web Store support section.

Made with ❤️ for the Function Health community to help you take control of your health data.
```

### **Category**
```
Productivity
```

### **Language**
```
English (United States)
```

### **Visibility**
```
Public
```

## Required Assets

### **Icons** (Already included)
- ✅ 16x16 px (icon16.png)
- ✅ 48x48 px (icon48.png) 
- ✅ 128x128 px (icon128.png)

### **Screenshots Needed** (Create these)
You'll need 1-5 screenshots showing:

1. **Extension popup interface** - Show the main buttons and clean UI
2. **Validation messages** - Show helpful error/success states  
3. **Export options** - Show CSV/JSON download buttons
4. **Sample exported data** - Show CSV opened in Excel/Google Sheets
5. **Function Health integration** - Show extension working on the biomarkers page

Screenshot requirements:
- 1280x800 or 640x400 pixels
- PNG or JPEG format
- Show actual functionality, not mockups

### **Promotional Images** (Optional but recommended)
- Small tile: 440x280 px
- Large tile: 920x680 px  
- Marquee: 1400x560 px

## Privacy Policy Requirements

Since your extension accesses user data, you'll need a privacy policy. Here's a template:

### **Privacy Policy URL**
You can host this on GitHub Pages or create a simple webpage:

```
https://greenband1.github.io/functionhealth_chrome_extension/privacy-policy
```

### **Privacy Policy Content**
```
Privacy Policy for Function Health Data Extractor

Last updated: [Current Date]

This Privacy Policy describes how the Function Health Data Extractor Chrome extension handles your information.

DATA COLLECTION
The extension does not collect, store, or transmit any personal data to external servers. All data processing occurs locally within your browser.

DATA USAGE  
The extension accesses your Function Health biomarker data solely to:
- Extract and format your biomarker results
- Export data in various formats (CSV, JSON, table)
- Display results within the extension interface

DATA STORAGE
The extension does not permanently store your biomarker data. Data is only held temporarily in browser memory during the extraction and export process.

DATA SHARING
No data is shared with third parties, external services, or the extension developers. Your biomarker data remains private and under your control.

FUNCTION HEALTH INTEGRATION
The extension uses your existing Function Health login session to access the biomarker API. It does not store or handle your login credentials.

OPEN SOURCE
The extension is open source, allowing full transparency of data handling practices. Source code is available at: https://github.com/Greenband1/functionhealth_chrome_extension

CONTACT
For privacy questions, contact us through our GitHub repository or Chrome Web Store listing.

DISCLAIMER
This extension is not affiliated with Function Health. Users are responsible for complying with Function Health's terms of service.
```

## Store Submission Checklist

### **Before Submission**
- [ ] Extension ZIP package created (✅ Done: personal_health_data_tool_v2.8.0.zip)
- [ ] Developer account registered and verified
- [ ] $5 registration fee paid
- [ ] Screenshots prepared (1-5 images)
- [ ] Privacy policy hosted and accessible
- [ ] Store listing description written
- [ ] Extension tested thoroughly

### **Submission Process**
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "Add new item"
3. Upload the ZIP file (functionhealth_extension_v2.0.1.zip)
4. Fill in store listing information
5. Upload screenshots
6. Set privacy policy URL
7. Choose visibility and pricing (Free)
8. Submit for review

### **Review Process**
- Review time: Usually 1-3 business days
- Google will check for policy compliance
- May request changes if issues found
- You'll receive email notifications about status

### **After Approval**
- Extension goes live on Chrome Web Store
- Users can install with one click
- You can update by uploading new versions
- Monitor reviews and user feedback

## Potential Review Issues

### **Common Rejection Reasons**
- Missing or inadequate privacy policy
- Functionality doesn't match description  
- Screenshots don't show actual functionality
- Trademark issues (ensure no Function Health trademark violations)
- Security concerns with API access

### **How to Address**
- Clearly state "not affiliated with Function Health" 
- Show actual screenshots of working extension
- Provide comprehensive privacy policy
- Demonstrate legitimate use case (personal data export)
- Highlight open source transparency

## Cost Summary

- **Developer registration**: $5 (one-time)
- **Extension hosting**: Free
- **Updates**: Free
- **Total cost**: $5

Your extension package is ready! The ZIP file `personal_health_data_tool_v2.4.0.zip` contains everything needed for Chrome Web Store submission.
```
