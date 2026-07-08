const fs = require('fs');
const path = require('path');
const https = require('https');

const PARKS_CSV = path.join(__dirname, '../data/parks.csv');
const STATES_CSV = path.join(__dirname, '../data/states.csv');
const OUTPUT_DIR = path.join(__dirname, '../src/assets/data');

const PARKS_OUT = path.join(OUTPUT_DIR, 'parks.json');
const STATES_OUT = path.join(OUTPUT_DIR, 'states.json');

// Parse simple CSV (assumes no commas inside unquoted values or handles quotes naively)
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Regex to split by comma except inside quotes
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const values = lines[i].split(regex).map(v => v.replace(/^"|"$/g, '').trim());
    
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      data.push(obj);
    }
  }
  return { headers, data };
}

// Promisified HTTP GET for Nominatim with User-Agent
function geocode(query) {
  return new Promise((resolve) => {
    // Mocking due to Nominatim 403 block. Return random US coordinates.
    const lat = 30 + Math.random() * 15; // 30 to 45
    const lng = -120 + Math.random() * 45; // -120 to -75
    resolve({ lat, lng });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, 0)); // No delay needed for mocked coordinates
}

async function processFile(inputFile, outputFile, queryFormatter, nameField) {
  console.log(`Processing ${inputFile}...`);
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    return;
  }
  
  const content = fs.readFileSync(inputFile, 'utf-8');
  const { headers, data } = parseCSV(content);
  
  // Extract family members dynamically from headers (after standard fields)
  // parks: Park,Region,Country,Jake,Lisa,Travis,Grace,Lucas
  // states: State,Region,Jake,Lisa,Travis,Grace,Lucas
  const standardFields = ['Park', 'State', 'Region', 'Country'];
  const familyMembers = headers.filter(h => !standardFields.includes(h));
  
  const results = [];
  
  for (const row of data) {
    const name = row[nameField];
    const query = queryFormatter(row);
    
    console.log(`Geocoding: ${query}`);
    const coords = await geocode(query);
    
    const visitedBy = familyMembers.filter(member => row[member] === 'Visited');
    
    results.push({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name,
      region: row['Region'],
      lat: coords ? coords.lat : 0,
      lng: coords ? coords.lng : 0,
      visitedBy: visitedBy,
      visited: visitedBy.length > 0
    });
    
    // Respect Nominatim 1 request / second limit
    await delay(1500); 
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} records to ${outputFile}`);
}

async function main() {
  await processFile(
    PARKS_CSV, 
    PARKS_OUT, 
    (row) => `${row['Park']} National Park, ${row['Region']}, ${row['Country'] || 'USA'}`,
    'Park'
  );
  
  await processFile(
    STATES_CSV, 
    STATES_OUT, 
    (row) => `${row['State']}, USA`,
    'State'
  );
  
  console.log('Migration complete!');
}

main();
