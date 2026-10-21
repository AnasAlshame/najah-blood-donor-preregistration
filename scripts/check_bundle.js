const https = require('https');

https.get('https://najah-blood-donor-preregistration.vercel.app', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const regex = /\/_next\/static\/immutable\/chunks\/[^"]+\.js/g;
    const matches = html.match(regex) || [];
    console.log(`Found ${matches.length} immutable chunks`);

    let done = 0;
    matches.forEach(chunkPath => {
      https.get('https://najah-blood-donor-preregistration.vercel.app' + chunkPath, (cRes) => {
        let code = '';
        cRes.on('data', d => code += d);
        cRes.on('end', () => {
          if (code.includes('تفريغ') || code.includes('empty-date')) {
            console.log('SUCCESS! Found new date reset code in:', chunkPath);
          }
          done++;
          if (done === matches.length) {
            console.log('All immutable chunks checked.');
          }
        });
      });
    });
  });
});
