const fetch = require('node-fetch');

async function testSearch(query) {
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    console.log("HTML length:", html.length);
    
    const results = [];
    // We match the result title link, then skip any intermediate HTML up to the result__snippet link
    const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 5) {
      let url = match[1];
      
      // Clean redirect URLs if DuckDuckGo routes them
      if (url.startsWith('//')) url = 'https:' + url;
      try {
        const urlObj = new URL(url);
        const uddg = urlObj.searchParams.get('uddg');
        if (uddg) url = uddg;
      } catch {}

      // Strip HTML tags from title and snippet
      const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const snippet = match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      
      // Filter out ads or empty results
      if (url.includes('duckduckgo.com/l/?') && url.includes('ad_provider')) {
        continue; // skip ads
      }

      results.push({ title, url, snippet });
      count++;
    }
    
    console.log("Results extracted:");
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Search failed:", err);
  }
}

testSearch("electron js version");
