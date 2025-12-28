/* eslint-disable no-undef */
const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const appDir = path.join(scriptDir, '../app');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('.')) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function extractRoutes(content) {
  const routes = new Set();
  
  const patterns = [
    /router\.push\(['"`]([^'"`]+)['"`]/g,
    /router\.replace\(['"`]([^'"`]+)['"`]/g,
    /href=['"`]([^'"`]+)['"`]/g,
    /pathname:\s*['"`]([^'"`]+)['"`]/g,
    /route:\s*['"`]([^'"`]+)['"`]/g,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      routes.add(match[1]);
    }
  });
  
  return routes;
}

function getScreenFiles(dir) {
  const screens = new Set();
  
  function scan(currentDir, relativePath = '') {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          const newRelative = relativePath ? `${relativePath}/${file}` : file;
          scan(fullPath, newRelative);
        }
      } else if (file.endsWith('.tsx')) {
        let route = relativePath ? `/${relativePath}/${file}` : `/${file}`;
        route = route.replace(/\.tsx$/, '');
        route = route.replace(/\/index$/, '');
        route = route.replace(/\(tabs\)\//g, '');
        route = route.replace(/\(.*?\)/g, '');
        route = route.replace(/\/+/g, '/');
        
        if (route === '/') route = '';
        
        screens.add({
          route: route || '/',
          file: fullPath.replace(appDir + '/', 'app/')
        });
      }
    });
  }
  
  scan(dir);
  return screens;
}

const allFiles = getAllFiles(path.join(scriptDir, '..'));
const referencedRoutes = new Set();

console.log('Scanning all files for route references...\n');
allFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const routes = extractRoutes(content);
    routes.forEach(route => referencedRoutes.add(route));
  } catch (_err) {
    // Ignore read errors
  }
});

const screenFiles = getScreenFiles(appDir);

console.log(`Found ${screenFiles.size} screen files`);
console.log(`Found ${referencedRoutes.size} route references\n`);

const unusedScreens = [];
const usedScreens = [];

screenFiles.forEach(screen => {
  const isReferenced = referencedRoutes.has(screen.route) || 
                       screen.route === '/' ||
                       screen.route.includes('_layout') ||
                       screen.route.includes('+html') ||
                       screen.route.includes('+not-found') ||
                       screen.route.includes('+native-intent');
  
  if (isReferenced) {
    usedScreens.push(screen);
  } else {
    unusedScreens.push(screen);
  }
});

console.log('═══════════════════════════════════════════════════════');
console.log(`UNUSED SCREENS: ${unusedScreens.length}`);
console.log('═══════════════════════════════════════════════════════\n');

unusedScreens.forEach(screen => {
  console.log(`  ${screen.file}`);
  console.log(`    Route: ${screen.route}`);
  console.log('');
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`USED SCREENS: ${usedScreens.length}`);
console.log('═══════════════════════════════════════════════════════\n');

console.log('Referenced routes that might not have files:');
referencedRoutes.forEach(route => {
  const hasScreen = Array.from(screenFiles).some(s => s.route === route);
  if (!hasScreen) {
    console.log(`  ${route}`);
  }
});

if (unusedScreens.length === 0) {
  console.log('\n✅ Great! No unused screens found.');
} else {
  console.log(`\n⚠️  Found ${unusedScreens.length} potentially unused screens.`);
  console.log('Review these files before deleting to ensure they are truly unused.');
}
