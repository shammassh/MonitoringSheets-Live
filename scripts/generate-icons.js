/**
 * Generate PWA icons from SVG
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgTemplate = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  
  <!-- Clipboard shape -->
  <rect x="140" y="100" width="232" height="312" rx="16" fill="white" opacity="0.95"/>
  <rect x="180" y="70" width="152" height="50" rx="8" fill="white"/>
  <circle cx="256" cy="95" r="15" fill="#2563eb"/>
  
  <!-- Checkmarks -->
  <g fill="none" stroke="#16a34a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="175,180 195,200 235,160"/>
    <polyline points="175,260 195,280 235,240"/>
    <polyline points="175,340 195,360 235,320"/>
  </g>
  
  <!-- Lines -->
  <g fill="#e5e7eb">
    <rect x="260" y="170" width="100" height="12" rx="6"/>
    <rect x="260" y="190" width="70" height="8" rx="4"/>
    <rect x="260" y="250" width="100" height="12" rx="6"/>
    <rect x="260" y="270" width="70" height="8" rx="4"/>
    <rect x="260" y="330" width="100" height="12" rx="6"/>
    <rect x="260" y="350" width="70" height="8" rx="4"/>
  </g>
</svg>`;

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for each size
sizes.forEach(size => {
    const svg = svgTemplate(size);
    const filename = `icon-${size}.svg`;
    fs.writeFileSync(path.join(iconsDir, filename), svg);
    console.log(`Generated ${filename}`);
});

// Generate maskable icon with padding
const maskableSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  
  <!-- Full background for maskable -->
  <rect width="512" height="512" fill="url(#bg)"/>
  
  <!-- Centered content with safe zone padding -->
  <g transform="translate(76, 76) scale(0.7)">
    <!-- Clipboard shape -->
    <rect x="140" y="100" width="232" height="312" rx="16" fill="white" opacity="0.95"/>
    <rect x="180" y="70" width="152" height="50" rx="8" fill="white"/>
    <circle cx="256" cy="95" r="15" fill="#2563eb"/>
    
    <!-- Checkmarks -->
    <g fill="none" stroke="#16a34a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="175,180 195,200 235,160"/>
      <polyline points="175,260 195,280 235,240"/>
      <polyline points="175,340 195,360 235,320"/>
    </g>
    
    <!-- Lines -->
    <g fill="#e5e7eb">
      <rect x="260" y="170" width="100" height="12" rx="6"/>
      <rect x="260" y="190" width="70" height="8" rx="4"/>
      <rect x="260" y="250" width="100" height="12" rx="6"/>
      <rect x="260" y="270" width="70" height="8" rx="4"/>
      <rect x="260" y="330" width="100" height="12" rx="6"/>
      <rect x="260" y="350" width="70" height="8" rx="4"/>
    </g>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'maskable-icon.svg'), maskableSvg);
console.log('Generated maskable-icon.svg');

console.log('\n✅ All SVG icons generated!');
console.log('\n📝 Note: For production, convert SVGs to PNGs using:');
console.log('   - Online tool: realfavicongenerator.net');
console.log('   - Or install sharp: npm install sharp');
console.log('   Then update manifest.json with .png extensions\n');
