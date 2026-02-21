# Contributing to Excel Pricing Calculator

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   `ash
   git clone https://github.com/YOUR_USERNAME/excelpricing.git
   cd excelpricing
   `
3. **Install dependencies**:
   `ash
   npm install
   `
4. **Set up the database** (see README.md for options)
5. **Create a branch** for your changes:
   `ash
   git checkout -b feature/your-feature-name
   `

## 📝 Types of Contributions

We welcome:
- 🐛 **Bug fixes**
- ✨ **New features**
- 📚 **Documentation improvements**
- 🎨 **UI/UX enhancements**
- ⚡ **Performance optimizations**
- 🧪 **Tests**

## 🔧 Development Workflow

### Before You Start
- Check existing [issues](https://github.com/sapradeep123/excelpricing/issues) to avoid duplicates
- For major changes, open an issue first to discuss
- Comment on an issue if you want to work on it

### Making Changes
1. Write clean, readable code
2. Follow existing code style and patterns
3. Add comments for complex logic
4. Update documentation if needed
5. Add/update tests for your changes

### Testing
`ash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Check TypeScript
npm run check
`

### Commit Messages
Use clear, descriptive commit messages:
- eat: add multi-currency support
- ix: resolve pagination bug
- docs: update API documentation
- 	est: add unit tests for quotes API

## 🎯 Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for new code
- Prefer const and let over ar
- Use async/await for asynchronous code
- Follow existing naming conventions

### React Components
- Use functional components with hooks
- Keep components focused and small
- Use React.memo for performance when appropriate
- Follow the existing folder structure

### Database
- Use Drizzle ORM for all database operations
- Write migrations for schema changes
- Test migrations locally before submitting

## 📋 Pull Request Process

1. **Push your branch** to your fork:
   `ash
   git push origin feature/your-feature-name
   `

2. **Open a Pull Request** with:
   - Clear title describing the change
   - Detailed description of what and why
   - Reference any related issues
   - Screenshots for UI changes

3. **Review Process**:
   - Maintainers will review your PR
   - Address any requested changes
   - Ensure all tests pass

4. **Merge**:
   - Squash commits if requested
   - Your PR will be merged by a maintainer

## 🐛 Reporting Bugs

When reporting bugs, please include:
- **Description**: Clear description of the bug
- **Steps to reproduce**: Numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, browser
- **Screenshots**: If applicable

## 💡 Requesting Features

Feature requests are welcome! Please:
- Describe the feature clearly
- Explain the use case
- Suggest implementation approach (optional)

## 🏷️ Issue Labels

- good first issue - Great for newcomers
- help wanted - Extra attention needed
- ug - Something isn't working
- enhancement - New feature requests
- documentation - Documentation improvements

## 🤝 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Personal attacks
- Publishing others' private information

## 📞 Getting Help

- 💬 Open a [Discussion](https://github.com/sapradeep123/excelpricing/discussions) for questions
- 🐛 Open an [Issue](https://github.com/sapradeep123/excelpricing/issues) for bugs
- 📧 Contact: [Your contact info]

## 🙏 Recognition

Contributors will be:
- Listed in the README (with permission)
- Mentioned in release notes
- Added to the contributors list

---

Thank you for contributing! 🎉
