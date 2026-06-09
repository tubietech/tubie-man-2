const fs = require('fs');
const m = JSON.parse(fs.readFileSync('./src/resources/maps/map0.json','utf8'));
for(let i=m.map.length-5; i<m.map.length; i++) {
  const hasNonWall = m.map[i].some(v => v != 1);
  console.log('Row ' + i + ': ' + (hasNonWall ? 'HAS PATHS' : 'ALL WALLS'));
}
