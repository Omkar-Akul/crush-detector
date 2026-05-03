const fs = require('fs');

let content = fs.readFileSync('frontend/src/App.jsx', 'utf8');

if (!content.includes('InstallBanner')) {
    // Inject import
    content = content.replace("import './App.css';", "import './App.css';\nimport InstallBanner from './InstallBanner';");
    
    // Inject component right before closing </div> of <div className="App">
    const parts = content.split(/<\/(div|Router|BrowserRouter)>/);
    // Actually simpler: just replace the last closing div of the main App return.
    // Let's find the closing router.
    if (content.includes('</Router>')) {
        content = content.replace('</Router>', '  <InstallBanner />\n    </Router>');
    } else {
        content = content.replace(/<\/div>\s*$/, '  <InstallBanner />\n    </div>');
    }

    fs.writeFileSync('frontend/src/App.jsx', content);
}

console.log("InstallBanner injected.");
