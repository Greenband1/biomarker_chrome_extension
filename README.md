# Personal Health Data Tool

A Chrome extension that extracts biomarker data from health services into exportable formats (CSV, JSON, table).

![Extension Version](https://img.shields.io/badge/version-2.6.0-blue.svg)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome%20Extension-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 What's New (v2.6.0)

### API & Data Improvements
- **New Results-Report API** - Switched to authoritative `/api/v1/results-report` endpoint for accurate categorization
- **Dynamic API Discovery** - Automatically discovers API endpoints with fallback mechanisms
- **Improved Categorization** - 96% of biomarkers now use API-provided categories (vs. keyword matching)
- **Reference Range in CSV** - Export now includes reference range column for easier analysis

### Visual View Enhancements
- **Fixed Sparkline Positioning** - Out-of-range values now correctly appear outside the green zone
- **Better Qualitative Results** - Improved display for results like "NEG", "NON-REACTIVE", etc.
- **API-Powered Tooltips** - Info button now shows descriptions from Function Health API
- **Native Print/PDF** - Print button uses browser's native print for direct PDF export

### Previous Features (v2.5.x)
- Complete UI redesign with health-focused color palette
- Premium DM Sans typography and custom SVG icons
- Interactive trend lines in Visual View
- Smart biomarker grouping and duplicate elimination

## ⚠️ Legal Disclaimer

**This project is open-source for personal use only, not affiliated with any health service provider. Users must adhere to the target website's Terms of Service. Consider legal advice before use.**

This extension is an independent tool created to help users export their own biomarker data for personal use only.

## 🔬 Features

- **🎯 One-Click Extraction** - Single "Extract My Biomarkers" button for streamlined workflow
- **📈 Complete Historical Data** - Automatically extracts all biomarker results across all test dates
- **🔧 Advanced Filtering** - Filter by specific dates, categories, or get latest results only
- **⚡ Latest Only Mode** - Get the most recent result for each biomarker with category flexibility
- **📁 Multiple Export Formats** - CSV, JSON, and clipboard-friendly formats
- **🏥 Smart Categorization** - Automatically organizes biomarkers by medical category
- **🎨 Progressive Interface** - Export options appear after extraction for clean workflow
- **🔄 Auto-Navigation** - Automatically navigates to correct page
- **💾 Session Filters** - Filter preferences persist during your session
- **✨ Premium Design** - Health-focused UI with DM Sans typography, custom SVG icons, and refined micro-interactions

## 🚀 Installation

### From Source (Recommended)

1. **Clone or Download**
   ```bash
   git clone https://github.com/Greenband1/biomarker_chrome_extension.git
   cd biomarker_chrome_extension
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extension folder
   - The extension icon should appear in your toolbar

### From Chrome Web Store
*Coming soon - extension will be submitted to Chrome Web Store*

## 📖 Usage

### Prerequisites
- Google Chrome browser
- Active Function Health account
- Must be logged into [Function Health](https://my.functionhealth.com)

### Step-by-Step Guide

1. **Navigate to Health Service**
   - Go to your health service biomarkers page
   - Ensure you're logged in

2. **Open the Extension**
   - Click the extension icon in your Chrome toolbar
   - Extension auto-navigates to correct page if needed

3. **Extract Your Data**
   - Click **"Extract My Biomarkers"** to get all historical data
   - Export options appear after extraction

4. **Export Your Data**
   - **Download CSV** - Excel-compatible spreadsheet format
   - **Download JSON** - Machine-readable format for developers
   - **Copy to Clipboard** - CSV format for pasting into documents

5. **Advanced Filtering (Optional)**
   - Click **"Advanced Filters"** for customized exports
   - Use **"Latest Only"** for most recent results per biomarker
   - Select specific dates and categories

## 📊 Data Format

### CSV/Table Output
```
Category,Biomarker,Status,Value,Unit,Reference Range,Date
Heart & Cardiovascular,HDL Cholesterol,In Range,65,mg/dL,>40,2025-07-25
Kidney & Renal,Creatinine,In Range,0.9,mg/dL,0.7-1.3,2025-07-25
Infectious Disease,Herpes Simplex Virus 1,In Range,<0.90,,<0.90,2025-07-25
```

### Biomarker Categories
- Heart & Cardiovascular
- Blood & Hematology  
- Metabolic & Diabetes
- Kidney & Renal
- Liver
- Thyroid
- Hormones
- Nutrients
- Electrolytes
- Urinalysis
- Infectious Disease
- Inflammation
- General

## 🔧 Technical Details

### Architecture
- **Manifest V3** Chrome Extension
- **API Integration** - Direct access to Function Health's REST API
- **Content Script** - Handles page interaction and data extraction
- **Background Processing** - Efficient data parsing and categorization

### Data Sources
- Primary: Function Health REST API (`/api/v1/results-report`)
- Fallback: Dynamic API discovery with endpoint caching
- Authentication: Uses existing Function Health session tokens
- No data is stored or transmitted outside your browser

### Privacy & Security
- ✅ **Local Processing** - All data processing happens in your browser
- ✅ **No External Servers** - No data sent to third-party services
- ✅ **Session-Based** - Uses your existing Function Health login
- ✅ **No Storage** - Extension doesn't permanently store your data
- ✅ **Open Source** - Full code transparency

## 🐛 Troubleshooting

### Common Issues

**"Please log in to Function Health"**
- Ensure you're logged into your Function Health account
- Try refreshing the biomarkers page
- Clear browser cache if needed

**"Please navigate to the biomarkers page"**
- Click "Go to Biomarkers Page" button in the extension
- Or manually navigate to https://my.functionhealth.com/biomarkers

**"No biomarker results found"**
- Ensure you have completed blood tests in your Function Health account
- Try refreshing the page and extracting again

**Extension not appearing**
- Check that Developer Mode is enabled in `chrome://extensions/`
- Verify the extension is enabled (toggle switch)
- Try reloading the extension

### Getting Help
- 📋 Check the browser console (F12) for detailed error messages
- 🔄 Try refreshing the Function Health page
- 🔌 Reload the extension in `chrome://extensions/`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
git clone https://github.com/Greenband1/functionhealth_chrome_extension.git
cd functionhealth_chrome_extension
# Load unpacked extension in Chrome for development
```

### Reporting Issues
- Use GitHub Issues for bug reports
- Include Chrome version, extension version, and error messages
- Describe steps to reproduce the issue

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚖️ Legal

- **Not affiliated with Function Health** - This is an independent project
- **For personal use** - Extract and use your own biomarker data responsibly  
- **Respect Terms of Service** - Ensure your usage complies with Function Health's terms
- **No warranty** - Use at your own risk

## 🙏 Acknowledgments

- Function Health for providing comprehensive biomarker testing
- Chrome Extensions community for development resources
- Contributors and users providing feedback and improvements

## 📞 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/Greenband1/functionhealth_chrome_extension/issues)
- **Discussions**: [Community discussions and questions](https://github.com/Greenband1/functionhealth_chrome_extension/discussions)

---

**Made with ❤️ for the Function Health community**

*This extension helps you take control of your health data by making it easily exportable and analyzable.*
