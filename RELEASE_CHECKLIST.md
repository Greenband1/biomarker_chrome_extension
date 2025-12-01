# Release Checklist

Use this checklist before publishing updates to GitHub or Chrome Web Store.

## Pre-Release Testing

### Functionality Testing
- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] All buttons and UI elements work correctly
- [ ] Validation properly detects login status
- [ ] Validation properly detects correct page
- [ ] "Extract Current Results" returns only latest results per biomarker
- [ ] "Extract Current & Historical Results" returns all historical data
- [ ] CSV export works and opens correctly in Excel/Google Sheets
- [ ] JSON export is valid JSON format
- [ ] Copy Table works and pastes correctly
- [ ] All biomarkers are properly categorized
- [ ] Dates are included in all exports
- [ ] Results are sorted by Category → Biomarker → Date

### Error Handling Testing
- [ ] Extension handles "not logged in" state gracefully
- [ ] Extension handles "wrong page" state with helpful messaging
- [ ] Extension handles API errors without crashing
- [ ] Extension handles network connectivity issues
- [ ] Console shows helpful debug information (not errors)

### Browser Compatibility
- [ ] Works in latest Chrome version
- [ ] Works in Chrome Beta (if available)
- [ ] No console errors or warnings
- [ ] Extension popup displays correctly
- [ ] All fonts and styling render properly

## Code Quality

### Code Review
- [ ] No console.log statements left in production code
- [ ] No TODO comments left unresolved
- [ ] All functions have proper error handling
- [ ] Code follows consistent style guidelines
- [ ] No unused variables or functions
- [ ] All files have proper copyright/license headers

### Security Review
- [ ] No hardcoded credentials or tokens
- [ ] No external API calls to unauthorized services
- [ ] Proper input validation on all user data
- [ ] No eval() or innerHTML usage with user data
- [ ] CSP-compliant code (no inline scripts)

## Documentation

### User Documentation
- [ ] README.md is up-to-date with current features
- [ ] Installation instructions are clear and accurate
- [ ] Usage examples work as documented
- [ ] Troubleshooting section covers common issues
- [ ] Screenshots/GIFs are current (if included)

### Developer Documentation
- [ ] CONTRIBUTING.md has current development setup
- [ ] Code comments explain complex logic
- [ ] API integration details are documented
- [ ] Architecture decisions are explained

## Version Management

### Version Numbering
- [ ] manifest.json version is updated
- [ ] Version follows semantic versioning (MAJOR.MINOR.PATCH)
- [ ] Version number is consistent across all files
- [ ] CHANGELOG.md is updated with new version (if exists)

### Git Management
- [ ] All changes are committed
- [ ] Commit messages are clear and descriptive
- [ ] Branch is ready for merge to main
- [ ] No sensitive files in git history

## File Cleanup

### Production Files
- [ ] Only necessary files are included
- [ ] No development/testing files in release
- [ ] No .DS_Store or other OS files
- [ ] Icons are optimized and correct sizes
- [ ] All referenced files exist and are accessible

### Manifest Validation
- [ ] manifest.json passes Chrome extension validation
- [ ] All permissions are necessary and documented
- [ ] Host permissions are minimal and specific
- [ ] Web accessible resources are minimal
- [ ] Extension name and description are accurate

## Chrome Web Store (if applicable)

### Store Listing
- [ ] Extension description is clear and compelling
- [ ] Screenshots show key functionality
- [ ] Privacy policy is linked (if required)
- [ ] Categories are appropriate
- [ ] Keywords are relevant and not spammy

### Store Requirements
- [ ] Follows Chrome Web Store policies
- [ ] No trademark violations
- [ ] Proper age rating
- [ ] Correct pricing (free)
- [ ] Terms of service compliance

## GitHub Release

### Repository Preparation
- [ ] README.md is comprehensive and professional
- [ ] LICENSE file is included and appropriate
- [ ] .gitignore excludes development files
- [ ] Repository description is clear
- [ ] Topics/tags are relevant
- [ ] Issues template exists (optional)
- [ ] Pull request template exists (optional)

### Release Notes
- [ ] Create GitHub release with version tag
- [ ] Include changelog/release notes
- [ ] Mention breaking changes (if any)
- [ ] Thank contributors
- [ ] Link to installation instructions

## Post-Release

### Monitoring
- [ ] Monitor GitHub issues for bug reports
- [ ] Check Chrome Web Store reviews (if applicable)
- [ ] Monitor extension analytics (if enabled)
- [ ] Respond to user feedback promptly

### Updates
- [ ] Plan next version improvements
- [ ] Update development roadmap
- [ ] Consider user feature requests
- [ ] Monitor Function Health for API changes

---

## Quick Release Commands

```bash
# Prepare release
git add .
git commit -m "Release v2.4.0: Health-focused UI redesign"
git tag v2.4.0
git push origin main --tags

# Create GitHub release
# Go to GitHub → Releases → Create new release
# Select tag v2.4.0, add release notes
```

**Remember:** Test thoroughly before each release. Users depend on this extension for their health data!
