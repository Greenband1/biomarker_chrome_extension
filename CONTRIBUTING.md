# Contributing to Function Health Data Extractor

Thank you for your interest in contributing to the Function Health Data Extractor! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

**Before submitting an issue:**
- Check existing issues to avoid duplicates
- Test with the latest version of the extension
- Gather relevant information (Chrome version, extension version, error messages)

**When creating an issue:**
- Use a clear, descriptive title
- Provide step-by-step reproduction instructions
- Include screenshots or console logs when helpful
- Specify your environment (Chrome version, OS, etc.)

### Suggesting Features

We welcome feature suggestions! Please:
- Check if the feature has already been requested
- Clearly describe the feature and its benefits
- Consider the scope and complexity
- Think about how it fits with the extension's purpose

### Code Contributions

#### Getting Started

1. **Fork the repository**
   ```bash
   git fork https://github.com/Greenband1/functionhealth_chrome_extension.git
   cd functionhealth_chrome_extension
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Load extension for development**
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select the project folder

#### Development Guidelines

**Code Style:**
- Use descriptive variable and function names
- Add comments for complex logic
- Follow existing code formatting patterns
- Use consistent indentation (spaces, not tabs)

**File Organization:**
- `manifest.json` - Extension configuration
- `popup.html` - Extension popup interface
- `popup-js.js` - Popup logic and UI interactions
- `content.js` - Page content script and data conversion
- `final-api-extractor.js` - API extraction and parsing logic

**Testing:**
- Test on the actual Function Health website
- Verify all export formats (CSV, JSON, Table)
- Test error conditions (not logged in, wrong page, etc.)
- Check console for errors or warnings

#### Code Quality

**Before submitting:**
- Ensure your code works with the latest Function Health website
- Test edge cases and error conditions
- Verify exports work correctly
- Check browser console for errors
- Test the extension popup UI

**Performance considerations:**
- Minimize API calls
- Efficient data processing
- Clean up resources and event listeners
- Handle large datasets gracefully

#### Pull Request Process

1. **Prepare your changes**
   - Ensure your code follows the style guidelines
   - Test thoroughly on Function Health
   - Update documentation if needed

2. **Submit the pull request**
   - Use a clear, descriptive title
   - Describe what your changes do
   - Reference any related issues
   - Include screenshots for UI changes

3. **Review process**
   - Maintainers will review your code
   - Address any feedback or requested changes
   - Once approved, your changes will be merged

## 🔧 Technical Architecture

### Extension Structure

**Manifest V3 Chrome Extension:**
- Uses modern Chrome Extension APIs
- Content scripts for page interaction
- Popup interface for user interaction
- No background service worker (lightweight)

**Key Components:**
- **API Extractor** - Handles Function Health API integration
- **Data Parser** - Processes and categorizes biomarker data
- **Export System** - Converts data to various formats
- **Validation** - Ensures proper page and login status

### Data Flow

1. User opens extension popup
2. Validation checks page and login status
3. User clicks extraction button
4. Content script injects API extractor
5. API extractor fetches data from Function Health
6. Data is parsed and categorized
7. Results are formatted and displayed
8. User can export in various formats

## 🐛 Debugging

### Development Tools

**Chrome DevTools:**
- Open popup → Right-click → "Inspect"
- Console tab shows extension logs
- Network tab shows API requests

**Extension Console:**
- `chrome://extensions/` → Extension details → "Inspect views: popup"
- Shows popup-specific console logs

**Content Script Console:**
- F12 on Function Health page
- Shows content script and API extractor logs

### Common Issues

**API Changes:**
- Function Health may update their API
- Check network requests for changes
- Update API endpoints or request format

**Authentication:**
- Token format or location changes
- Update token extraction logic
- Handle new authentication methods

**Page Structure:**
- Function Health UI updates may break selectors
- Update CSS selectors for new page elements
- Maintain backward compatibility when possible

## 📋 Issue Labels

We use these labels to categorize issues:

- `bug` - Something isn't working correctly
- `enhancement` - New feature or improvement
- `documentation` - Documentation updates needed
- `help wanted` - Good for contributors
- `good first issue` - Good for new contributors
- `priority: high` - Critical issues
- `priority: medium` - Important improvements
- `priority: low` - Nice-to-have features

## 🎯 Contribution Ideas

**Good first contributions:**
- Improve error messages
- Add more biomarker categories
- Enhance UI styling
- Fix typos or improve documentation
- Add unit tests

**Advanced contributions:**
- Performance optimizations
- New export formats
- Enhanced data validation
- Accessibility improvements
- Internationalization support

## 📞 Getting Help

**Need help contributing?**
- Open a GitHub Discussion
- Comment on existing issues
- Review the codebase and documentation

**Questions about Function Health integration?**
- Check the browser console for API details
- Review existing API extraction code
- Test changes on the actual Function Health website

## 🙏 Recognition

Contributors will be:
- Listed in the README.md contributors section
- Mentioned in release notes for significant contributions
- Given credit in commit messages and pull requests

## ⚖️ Code of Conduct

**Be respectful:**
- Use welcoming and inclusive language
- Respect different viewpoints and experiences
- Accept constructive feedback gracefully
- Focus on what's best for the community

**Be collaborative:**
- Help others learn and contribute
- Share knowledge and resources
- Work together to solve problems
- Celebrate successes together

Thank you for contributing to make biomarker data more accessible for everyone! 🎉
