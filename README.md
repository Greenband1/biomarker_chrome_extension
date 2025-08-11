# Function Health Data Extractor

A Chrome extension that extracts biomarker data from Function Health into exportable formats (CSV, JSON, table).

![Extension Version](https://img.shields.io/badge/version-2.0.1-blue.svg)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome%20Extension-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ⚠️ Disclaimer

**This extension is not affiliated with or endorsed by Function Health.** It is an independent tool created to help users export their own biomarker data for personal use.

## 🔬 Features

- **🚀 Fast API Extraction** - Direct API access for complete biomarker data with dates
- **📊 Current Results** - Extract only the most recent result for each biomarker
- **📈 Historical Data** - Extract complete historical biomarker results across all test dates
- **📁 Multiple Export Formats** - CSV, JSON, and clipboard-friendly table formats
- **🏥 Smart Categorization** - Automatically organizes biomarkers by medical category
- **📅 Date Tracking** - Includes test dates for all biomarker results
- **✅ Validation** - Ensures you're logged in and on the correct page
- **📋 Sorted Output** - Results organized by Category → Biomarker → Date

## 🚀 Installation

### From Source (Recommended)

1. **Clone or Download**
   ```bash
   git clone https://github.com/Greenband1/functionhealth_chrome_extension.git
   cd functionhealth_chrome_extension
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

1. **Navigate to Function Health**
   - Go to https://my.functionhealth.com/biomarkers
   - Ensure you're logged in

2. **Open the Extension**
   - Click the extension icon in your Chrome toolbar
   - The extension will validate your login and page status

3. **Extract Your Data**
   - **"Extract Current & Historical Results"** - Gets all biomarker data across all test dates
   - **"Extract Current Results"** - Gets only the most recent result for each biomarker

4. **Export Your Data**
   - **Download CSV** - Excel-compatible spreadsheet format
   - **Download JSON** - Machine-readable format for developers
   - **Copy Table** - Tab-separated format for pasting into documents

## 📊 Data Format

### CSV/Table Output
```
Category,Biomarker,Status,Value,Unit,Date
Heart & Cardiovascular,HDL Cholesterol,In Range,65,mg/dL,2025-07-25
Kidney & Renal,Creatinine,In Range,0.9,mg/dL,2025-07-25
Infectious Disease,Herpes Simplex Virus 1,In Range,<0.90,,2025-07-25
```

### Biomarker Categories
- Heart & Cardiovascular
- Blood & Hematology  
- Metabolic & Diabetes
- Kidney & Renal
- Liver
- Thyroid
- Hormones
- Nutrients & Vitamins
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
- Primary: Function Health REST API (`/api/v1/requisitions`)
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
