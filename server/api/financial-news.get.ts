import { defineEventHandler } from 'h3'

interface NewsItem {
  title: string
  description: string
  url: string
  urlToImage: string
  publishedAt: string
  source: {
    name: string
  }
}

interface FirecrawlResult {
  url: string
  title: string
  content: string
  snippet: string
  published_at?: string
  source_name?: string
}

// Fallback financial news sites to crawl if the API fails
const FINANCIAL_NEWS_SITES = [
  'www.bloomberg.com',
  'www.cnbc.com',
  'www.reuters.com/business',
  'www.ft.com',
  'www.wsj.com/news/markets',
  'finance.yahoo.com'
];

export default defineEventHandler(async (event) => {
  try {
    // Get the API keys from runtime config
    const { newsApiKey, firecrawlApiKey } = useRuntimeConfig()
    
    let useFirecrawlFallback = false;
    let newsApiError = null;
    
    // Try News API first
    if (newsApiKey) {
      try {
        console.log('Attempting to fetch from NewsAPI')
        const response = await fetch(
          `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=10&apiKey=${newsApiKey}`,
          { 
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        console.log('NewsAPI response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          
          if (data?.articles && Array.isArray(data.articles) && data.articles.length > 0) {
            console.log('NewsAPI success, processing data')
            
            // Process the data to match our frontend format
            const items = data.articles.slice(1).map((article: NewsItem) => ({
              title: article.title,
              description: article.description,
              publishedAt: article.publishedAt,
              url: article.url,
              imageUrl: article.urlToImage,
              source: article.source?.name
            }))
            
            return {
              source: 'newsapi',
              featured: {
                title: data.articles[0].title,
                description: data.articles[0].description,
                publishedAt: data.articles[0].publishedAt,
                url: data.articles[0].url,
                imageUrl: data.articles[0].urlToImage,
                source: data.articles[0].source?.name
              },
              items
            }
          } else {
            console.log('NewsAPI returned empty or invalid results')
            useFirecrawlFallback = true
          }
        } else {
          const errorText = await response.text()
          newsApiError = `NewsAPI error: ${response.status} - ${errorText}`
          console.error(newsApiError)
          useFirecrawlFallback = true
        }
      } catch (err: any) {
        newsApiError = `NewsAPI fetch error: ${err.message}`
        console.error(newsApiError)
        useFirecrawlFallback = true
      }
    } else {
      console.warn('NewsAPI key not found, falling back to Firecrawl')
      useFirecrawlFallback = true
    }
    
    // Fallback to Firecrawl if NewsAPI failed
    if (useFirecrawlFallback && firecrawlApiKey) {
      try {
        console.log('Falling back to Firecrawl for news')
        
        // Create a query to search for financial news
        const query = "latest financial news markets stocks economy"
        const targetSites = FINANCIAL_NEWS_SITES.join(',')
        
        const firecrawlResponse = await fetch(
          `https://api.mendable.ai/v0/firecrawl/search`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${firecrawlApiKey}`
            },
            body: JSON.stringify({
              query,
              max_results: 8,
              include_domains: targetSites,
              recency_days: 2, // Get news from the last 2 days
              hyde: true
            })
          }
        )
        
        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json()
          
          if (firecrawlData?.results && Array.isArray(firecrawlData.results) && firecrawlData.results.length > 0) {
            console.log('Firecrawl success, processing data')
            
            // Map the firecrawl results to our format
            const items = firecrawlData.results.slice(1).map((result: FirecrawlResult) => {
              // Extract domain for source name if not provided
              const source = result.source_name || (new URL(result.url)).hostname.replace('www.', '')
              
              return {
                title: result.title,
                description: result.snippet || result.content?.substring(0, 150) || '',
                publishedAt: result.published_at || new Date().toISOString(),
                url: result.url,
                imageUrl: null, // Firecrawl doesn't provide images
                source: source
              }
            })
            
            // Featured article
            const featured = {
              title: firecrawlData.results[0].title,
              description: firecrawlData.results[0].snippet || firecrawlData.results[0].content?.substring(0, 300) || '',
              publishedAt: firecrawlData.results[0].published_at || new Date().toISOString(),
              url: firecrawlData.results[0].url,
              imageUrl: null,
              source: firecrawlData.results[0].source_name || (new URL(firecrawlData.results[0].url)).hostname.replace('www.', '')
            }
            
            return {
              source: 'firecrawl',
              message: newsApiError ? `Using fallback data source. ${newsApiError}` : 'Using alternative data source',
              featured,
              items
            }
          }
        } else {
          console.error('Firecrawl API error:', firecrawlResponse.status)
        }
      } catch (firecrawlErr: any) {
        console.error('Firecrawl fetch error:', firecrawlErr.message)
      }
    }
    
    // If all APIs failed, return sample data with an error message
    console.log('All API attempts failed, returning sample data')
    
    return {
      error: newsApiError || 'Failed to fetch financial news from all sources',
      source: 'sample',
      featured: {
        title: 'Market Rally Continues as Tech Stocks Surge',
        description: 'Major tech companies lead the market rally as investors show renewed confidence in the sector following strong earnings reports and positive economic indicators.',
        publishedAt: new Date().toISOString(),
        url: 'https://example.com/news/tech-rally',
        imageUrl: 'https://images.unsplash.com/photo-1569025743873-ea3a9ade89f9?q=80&w=2070'
      },
      items: [
        {
          title: 'Fed Signals Potential Rate Cut',
          description: 'Federal Reserve hints at possible interest rate cuts later this year as inflation pressures ease.',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news/fed-rates',
          imageUrl: 'https://images.unsplash.com/photo-1635840420799-f75477b0b977?q=80&w=2069'
        },
        {
          title: 'Oil Prices Fall Amid Supply Concerns',
          description: 'Crude oil prices dropped following reports of increased production despite OPEC+ cuts.',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news/oil-prices',
          imageUrl: 'https://images.unsplash.com/photo-1582580845852-879ea7bda1fb?q=80&w=1973'
        },
        {
          title: 'Startups Secure Record Funding in Q1',
          description: 'Venture capital investments reach new heights in the first quarter as investors bet on AI and fintech.',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news/startup-funding',
          imageUrl: 'https://images.unsplash.com/photo-1559526324-593bc073d938?q=80&w=2070'
        },
        {
          title: 'Housing Market Shows Signs of Cooling',
          description: 'After months of rising prices, the housing market is showing early signs of stabilization.',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news/housing-market',
          imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973'
        }
      ]
    }
  } catch (error: any) {
    console.error('Unhandled error in financial news handler:', error)
    
    // Always return sample data on error with error message
    return {
      error: error.message || 'An unexpected error occurred',
      source: 'sample',
      featured: {
        title: 'Market Rally Continues as Tech Stocks Surge',
        description: 'Major tech companies lead the market rally as investors show renewed confidence in the sector following strong earnings reports and positive economic indicators.',
        publishedAt: new Date().toISOString(),
        url: 'https://example.com/news/tech-rally',
        imageUrl: 'https://images.unsplash.com/photo-1569025743873-ea3a9ade89f9?q=80&w=2070'
      },
      items: [
        {
          title: 'Fed Signals Potential Rate Cut',
          description: 'Federal Reserve hints at possible interest rate cuts later this year as inflation pressures ease.',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news/fed-rates',
          imageUrl: 'https://images.unsplash.com/photo-1635840420799-f75477b0b977?q=80&w=2069'
        },
        // Other sample items...
        {
          title: 'Housing Market Shows Signs of Cooling',
          description: 'After months of rising prices, the housing market is showing early signs of stabilization.',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news/housing-market',
          imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1973'
        }
      ]
    }
  }
}) 