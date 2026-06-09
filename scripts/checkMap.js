const data = require('../src/resources/maps/map0.json');
for(let i=0; i<10; i++) {
  const hasNonWall = data.map[i].some(v => v != 1);
  console.log('Row ' + i + ': ' + (hasNonWall ? 'HAS PATHS' : 'ALL WALLS'));
}
console.log('Total rows:', data.map.length);
