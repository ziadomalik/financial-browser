import { ref } from 'vue'

// Define stock data interface for better typing
interface StockData {
    symbol: string;
    name: string;
    firstPrice: number;
    lastPrice: number;
    minPrice: number;
    maxPrice: number;
    return: string;
    priceData: Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>;
    isMockData: boolean; // We'll keep this for future API status tracking
}

// Define API response interface
interface ApiResponse {
    messages: Array<{
        type: string;
        tool_call_id?: string;
        content?: string;
        item?: string;
        name?: string; // Add name property which exists on tool messages
        tool_calls?: Array<{
            id: string;
            name: string;
            args: any;
        }>;
    }>;
    [key: string]: any; // Allow for other properties
}

// Add interfaces for company data
interface CompanyMetric {
    [key: string]: any;
}

interface CompanyDataItem {
    period: string;
    metrics: CompanyMetric;
}

interface CompanyDataMap {
    [company: string]: CompanyDataItem;
}

interface ApiMessage {
    type: string;
    tool_call_id?: string;
    content?: string;
    item?: string;
    name?: string;
    tool_calls?: Array<{
        id: string;
        name: string;
        args: any;
    }>;
}

export const useFinancialApi = () => {
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const data = ref<any>(null)
    const isMockData = ref(false)

    // Add results state for different tool types
    const stockPriceData = ref<StockData | null>(null)
    const companyInfoData = ref<CompanyDataMap | null>(null)
    const availableTools = ref<string[]>([])

    const lastQuery = ref('')

    // Main query endpoint - use the same as Python implementation
    const queryFinancialData = async (query: string) => {
        isLoading.value = true
        error.value = null
        data.value = null
        isMockData.value = false // Start with assumption that we'll get real data
        lastQuery.value = query

        try {
            // Add a timestamp to ensure each query is unique, even for identical text
            const timestamp = Date.now()
            console.log(`Querying API for: ${query} (timestamp: ${timestamp})`)

            const response = await fetch("/api/financial/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    timestamp, // Add timestamp to ensure uniqueness
                    forceRefresh: true // Explicitly request fresh data
                })
            })

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`)
            }

            const apiResponse: ApiResponse = await response.json()
            console.log("API Response:", apiResponse)

            // Check if the response indicates an error
            if (apiResponse.error) {
                console.log("API response contains an error flag")
                throw new Error(apiResponse.message || "API returned an error response")
            }

            // Process the response
            const processedData = processApiResponse(apiResponse)

            if (!processedData) {
                throw new Error("Invalid API response structure")
            }

            console.log(`Processed data:`, {
                symbol: processedData.symbol,
                name: processedData.name,
                priceData: processedData.priceData ? `${processedData.priceData.length} points` : 'None',
                firstPrice: processedData.firstPrice,
                lastPrice: processedData.lastPrice,
                return: processedData.return,
                timestamp // Log the timestamp for debugging
            })

            // Always set isMockData to false as we don't use mock data
            isMockData.value = false
            processedData.isMockData = false
            console.log(`Returning data from API`)

            return processedData
        } catch (e) {
            console.error(`API query error:`, e)
            error.value = e instanceof Error ? e.message : 'An unexpected error occurred'
            // Don't use mock data - just throw the error
            throw new Error(`Failed to get data from the API: ${error.value}`)
        } finally {
            isLoading.value = false
        }
    }

    // Search with criteria endpoint
    const searchWithCriteria = async (query: string) => {
        isLoading.value = true
        error.value = null

        try {
            const result = await $fetch('/api/financial/searchwithcriteria', {
                method: 'POST',
                query: { query },
                body: {}, // Empty object instead of empty string
            })

            return result
        } catch (e) {
            console.error("Search with criteria error:", e)
            error.value = e instanceof Error ? e.message : 'An unknown error occurred'
            return null
        } finally {
            isLoading.value = false
        }
    }

    // OHLCV endpoint
    const getOHLCV = async (query: string, first: string = "01.01.2024", last?: string) => {
        isLoading.value = true
        error.value = null

        try {
            const timestamp = Date.now()
            console.log(`Fetching OHLCV data for: "${query}" with timestamp: ${timestamp}`)

            const queryParams: Record<string, string | number | boolean> = {
                query,
                first,
                timestamp,
                forceRefresh: true
            }

            if (last) {
                queryParams.last = last
            }

            const result = await $fetch('/api/financial/ohlcv', {
                method: 'POST',
                query: queryParams,
                body: {
                    query,
                    first,
                    last,
                    timestamp,
                    forceRefresh: true
                }
            })

            return result
        } catch (e) {
            console.error("OHLCV data error:", e)
            error.value = e instanceof Error ? e.message : 'An unknown error occurred'
            return null
        } finally {
            isLoading.value = false
        }
    }

    // Company data search endpoint
    const companyDataSearch = async (query: string) => {
        isLoading.value = true
        error.value = null

        try {
            const result = await $fetch('/api/financial/companydatasearch', {
                method: 'POST',
                query: { query },
                body: {}, // Empty object instead of empty string
            })

            return result
        } catch (e) {
            console.error("Company data search error:", e)
            error.value = e instanceof Error ? e.message : 'An unknown error occurred'
            return null
        } finally {
            isLoading.value = false
        }
    }

    // Summary endpoint
    const getSummary = async (query: string) => {
        isLoading.value = true
        error.value = null

        try {
            const result = await $fetch('/api/financial/summary', {
                method: 'POST',
                query: { query },
                body: {}, // Empty object instead of empty string
            })

            return result
        } catch (e) {
            console.error("Summary data error:", e)
            error.value = e instanceof Error ? e.message : 'An unexpected error occurred'
            return null
        } finally {
            isLoading.value = false
        }
    }

    const processApiResponse = (response: ApiResponse): StockData | null => {
        try {
            // Clear available tools
            availableTools.value = []

            if (!response || !response.messages) {
                console.warn('Invalid API response structure')
                throw new Error('Invalid API response structure')
            }

            // Find tool call results in the response
            const toolCalls: any[] = []

            for (const message of response.messages) {
                // Check for tool_calls in messages
                if (message.tool_calls && Array.isArray(message.tool_calls)) {
                    for (const toolCall of message.tool_calls) {
                        if (toolCall.name && !availableTools.value.includes(toolCall.name)) {
                            availableTools.value.push(toolCall.name)
                            toolCalls.push(toolCall)
                        }
                    }
                }
            }

            console.log('Available tools in response:', availableTools.value)

            // Process different tool responses
            let hasProcessedData = false

            // Process OHLCV data for price history
            if (availableTools.value.includes('ohlcv') || availableTools.value.includes('Historical_Price_Data')) {
                const ohlcvTool = toolCalls.find(call =>
                    call.name === 'ohlcv' || call.name === 'Historical_Price_Data'
                )

                if (ohlcvTool) {
                    console.log('Processing OHLCV data')
                    const toolMessage = response.messages.find(msg =>
                        msg.type === 'tool' &&
                        msg.tool_call_id === ohlcvTool.id
                    )

                    // Only process if we have a valid tool message
                    if (toolMessage) {
                        const processedData = processHistoricalPriceData(
                            toolMessage,
                            ohlcvTool.args
                        )

                        if (processedData) {
                            stockPriceData.value = processedData
                            return processedData
                        }
                    } else {
                        console.warn('No tool message found for OHLCV data')
                        throw new Error('No tool message found for OHLCV data')
                    }
                }
            }

            // Process company data search
            if (availableTools.value.includes('companydatasearch')) {
                const companyDataTool = toolCalls.find(call => call.name === 'companydatasearch')
                if (companyDataTool) {
                    console.log('Processing company data')
                    const toolMessage = response.messages.find(msg =>
                        msg.type === 'tool' &&
                        msg.tool_call_id === companyDataTool.id
                    )

                    if (toolMessage) {
                        const companyData = processCompanyData(
                            toolMessage,
                            companyDataTool.args
                        )

                        if (companyData) {
                            companyInfoData.value = companyData
                            // We should still have stock data to return

                            // If we already processed OHLCV data, use that
                            if (stockPriceData.value) {
                                return stockPriceData.value
                            }
                        }
                    }
                }
            }

            // If we haven't returned data from a specific tool, try to extract general stock data
            const extractedData = extractStockData(response)
            if (extractedData) {
                return extractedData
            }

            // If we've made it here, we couldn't process the data
            throw new Error('Could not extract valid stock data from the API response')
        } catch (e) {
            console.error('Error processing API response:', e)
            error.value = e instanceof Error ? e.message : 'An unexpected error occurred'
            throw e
        }
    }

    // Helper function to get a stock name from a symbol
    const getStockName = (symbol: string): string => {
        // Map of well-known stock symbols to company names
        const stockNames: Record<string, string> = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com, Inc.',
            'META': 'Meta Platforms, Inc.',
            'TSLA': 'Tesla, Inc.',
            'NVDA': 'NVIDIA Corporation',
            'BRK.A': 'Berkshire Hathaway Inc.',
            'JPM': 'JPMorgan Chase & Co.',
            'JNJ': 'Johnson & Johnson',
            'V': 'Visa Inc.',
            'WMT': 'Walmart Inc.',
            'PG': 'Procter & Gamble Co.',
            'MA': 'Mastercard Incorporated',
            'UNH': 'UnitedHealth Group Inc.',
            'HD': 'The Home Depot, Inc.',
            'BAC': 'Bank of America Corporation',
            'XOM': 'Exxon Mobil Corporation',
            'NFLX': 'Netflix, Inc.',
            'DIS': 'The Walt Disney Company',
            'TATASTEEL': 'Tata Steel Ltd.',
            'EQTATASTEEL': 'Tata Steel Ltd.'
        };

        // Clean up symbol - handle cases where it's a full string with extra info
        let cleanSymbol = symbol;

        // Check if symbol contains any of the known keys
        for (const knownSymbol of Object.keys(stockNames)) {
            if (symbol.includes(knownSymbol)) {
                cleanSymbol = knownSymbol;
                break;
            }
        }

        // Try to extract symbol from possible formats
        if (cleanSymbol.includes('TATA') || cleanSymbol.toLowerCase().includes('tata steel')) {
            return 'Tata Steel Ltd.';
        }

        // Return the name if found, otherwise use the symbol + " Stock"
        return stockNames[cleanSymbol] || `${symbol} Stock`;
    };

    const processHistoricalPriceData = (toolResponse: ApiResponse['messages'][0], args: any): StockData | null => {
        console.log(`Processing historical price data. Tool response type:`, typeof toolResponse);

        // Get the content and item from the tool response
        const tableData = toolResponse.content;
        const itemData = toolResponse.item;

        console.log(`Args:`, JSON.stringify(args, null, 2));

        // Check if we have table data in the response
        if (tableData) {
            console.log("Table data begins with:", tableData.substring(0, 150));

            // Try to extract symbol and performance metrics from the table content
            // Format is typically a markdown table with columns for symbol, first, last, min, max, return
            try {
                // Example: "| Banco Santander Rg |  3.7454 |  6.561 | 1.43969 | 6.595 | 54.29%   |"
                const symbolMatch = tableData.match(/\|\s*([^|]+?)\s*\|/);
                const returnMatch = tableData.match(/\|\s*([^|]+?)\s*\|$/);

                if (symbolMatch && symbolMatch[1]) {
                    console.log(`Extracted symbol from table: ${symbolMatch[1].trim()}`);
                }

                if (returnMatch && returnMatch[1]) {
                    console.log(`Extracted return from table: ${returnMatch[1].trim()}`);
                }
            } catch (e) {
                console.warn("Error parsing table data:", e);
            }
        } else {
            console.warn("No table data found in tool response");
        }

        // Process the item data which contains the OHLC data
        let stockData: any = null;
        let ohlcData: Record<string, any> | null = null;

        if (!itemData) {
            console.warn("No item data found in tool response");
            return null;
        }

        console.log(`Processing item data of type: ${typeof itemData}`);

        try {
            // Based on the example, the item is a string containing JSON that needs to be parsed
            if (typeof itemData === 'string') {
                try {
                    // First parse the outer JSON string
                    const parsedItem = JSON.parse(itemData);
                    console.log("Successfully parsed item as JSON, keys:", Object.keys(parsedItem));

                    // Check for the 'tool' property which should be 'OHLC'
                    if (parsedItem.tool === 'OHLC') {
                        console.log("Found OHLC tool data");

                        // The 'data' property contains another JSON string that needs to be parsed
                        if (parsedItem.data && typeof parsedItem.data === 'string') {
                            try {
                                // Parse the data string which contains the stock name and OHLC values
                                const stockDataObj = JSON.parse(parsedItem.data);
                                console.log("Successfully parsed data, stock keys:", Object.keys(stockDataObj));

                                // Get the stock symbol (e.g., "Banco Santander Rg")
                                const stockSymbol = Object.keys(stockDataObj)[0];
                                console.log(`Found stock symbol: ${stockSymbol}`);

                                // The OHLC data is yet another JSON string that needs to be parsed
                                const ohlcDataStr = stockDataObj[stockSymbol];

                                try {
                                    // Parse the OHLC data string
                                    ohlcData = JSON.parse(ohlcDataStr);
                                    console.log(`Successfully parsed OHLC data with ${ohlcData ? Object.keys(ohlcData).length : 0} entries`);

                                    // At this point, ohlcData should be an object with dates as keys and OHLC values as properties
                                } catch (ohlcErr) {
                                    console.warn("Error parsing OHLC data string:", ohlcErr);

                                    // Try unescaping the string before parsing
                                    try {
                                        // Handle heavily escaped JSON strings
                                        // First try with regular unescaping
                                        let unescaped = ohlcDataStr
                                            .replace(/\\\\"/g, '\\"')
                                            .replace(/\\\\/g, '\\');

                                        // If that doesn't work, try more aggressive unescaping for multi-level escaping
                                        if (unescaped.includes('\\\"')) {
                                            unescaped = unescaped
                                                .replace(/\\"/g, '"')
                                                .replace(/\\'/g, "'")
                                                .replace(/\\\\/g, '\\');
                                        }

                                        // Try to parse the unescaped string
                                        try {
                                            ohlcData = JSON.parse(unescaped);
                                            console.log(`Successfully parsed unescaped OHLC data with ${ohlcData ? Object.keys(ohlcData).length : 0} entries`);
                                        } catch (e) {
                                            // If it still fails, try one more approach with a more aggressive regex replacement
                                            unescaped = ohlcDataStr.replace(/\\+"/g, '"').replace(/\\+\\/g, '\\');
                                            ohlcData = JSON.parse(unescaped);
                                            console.log(`Successfully parsed double-unescaped OHLC data with ${ohlcData ? Object.keys(ohlcData).length : 0} entries`);
                                        }
                                    } catch (unescapeErr) {
                                        console.warn("Error parsing unescaped OHLC data:", unescapeErr);

                                        // As a last resort, try using a regex to extract the basic structure
                                        try {
                                            console.log("Attempting regex extraction of OHLC data");
                                            // Regular expression patterns to match date, open, high, low, close, vol
                                            const datePattern = /\\?"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\\?"/g;
                                            const openPattern = /\\?"open\\?":\s*([\d\.]+)/g;
                                            const highPattern = /\\?"high\\?":\s*([\d\.]+)/g;
                                            const lowPattern = /\\?"low\\?":\s*([\d\.]+)/g;
                                            const closePattern = /\\?"close\\?":\s*([\d\.]+)/g;
                                            const volPattern = /\\?"vol\\?":\s*(\d+)/g;

                                            // Extract all matches
                                            const extractNumbers = (str: string, pattern: RegExp): number[] => {
                                                const matches = [];
                                                let match;
                                                while ((match = pattern.exec(str)) !== null) {
                                                    matches.push(parseFloat(match[1]));
                                                }
                                                return matches;
                                            };

                                            const extractDates = (str: string, pattern: RegExp): string[] => {
                                                const matches = [];
                                                let match;
                                                while ((match = pattern.exec(str)) !== null) {
                                                    matches.push(match[1]);
                                                }
                                                return matches;
                                            };

                                            const dates = extractDates(ohlcDataStr, datePattern);
                                            const opens = extractNumbers(ohlcDataStr, openPattern);
                                            const highs = extractNumbers(ohlcDataStr, highPattern);
                                            const lows = extractNumbers(ohlcDataStr, lowPattern);
                                            const closes = extractNumbers(ohlcDataStr, closePattern);
                                            const volumes = extractNumbers(ohlcDataStr, volPattern);

                                            if (dates.length > 0) {
                                                console.log(`Found ${dates.length} date entries via regex`);
                                                // Create a manual OHLC data structure
                                                ohlcData = {};
                                                for (let i = 0; i < dates.length; i++) {
                                                    const date = dates[i];
                                                    ohlcData[date] = {
                                                        open: opens[i] || 0,
                                                        high: highs[i] || 0,
                                                        low: lows[i] || 0,
                                                        close: closes[i] || 0,
                                                        vol: volumes[i] || 0
                                                    };
                                                }
                                                console.log("Created manual OHLC data from regex matches");
                                            }
                                        } catch (regexErr) {
                                            console.warn("Error extracting OHLC data with regex:", regexErr);
                                        }
                                    }
                                }

                                // Extract the stock symbol from the content if available
                                let symbol = stockSymbol;
                                if (tableData) {
                                    // Try to extract a cleaner symbol from the table
                                    const symbolMatch = tableData.match(/\|\s*([^|]+?)\s*\|/);
                                    if (symbolMatch && symbolMatch[1]) {
                                        symbol = symbolMatch[1].trim();
                                    }
                                }

                                // Store the stock symbol for later use
                                stockData = { symbol };
                            } catch (dataErr) {
                                console.warn("Error parsing stock data string:", dataErr);
                            }
                        } else {
                            console.warn("OHLC data property missing or not a string");
                        }
                    } else {
                        console.warn("Item does not contain expected OHLC tool data");
                    }
                } catch (parseErr) {
                    console.warn("Error parsing item JSON:", parseErr);
                }
            } else {
                console.warn("Item is not a string, cannot parse as JSON");
            }
        } catch (err) {
            console.error("Error processing item data:", err);
        }

        // Extract symbol from various sources
        let symbol = stockData?.symbol || args?.symbol || args?.query || 'TSLA';
        console.log(`Using symbol: ${symbol}`);

        // Initialize an empty array for the price data
        const priceData: Array<{
            date: string;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        }> = [];

        // Process the OHLC data if we have it
        if (ohlcData) {
            console.log(`Processing ${Object.keys(ohlcData).length} OHLC data points`);
            let sampleEntry = null;

            for (const [date, values] of Object.entries(ohlcData)) {
                try {
                    if (!sampleEntry) {
                        sampleEntry = { date, values };
                        console.log("Sample OHLC entry:", JSON.stringify(sampleEntry, null, 2));
                    }

                    // Handle different structures of values
                    if (Array.isArray(values)) {
                        // It's an array like [open, high, low, close, volume]
                        priceData.push({
                            date: date.split('T')[0], // Remove time part if present
                            open: parseFloat(values[0]),
                            high: parseFloat(values[1]),
                            low: parseFloat(values[2]),
                            close: parseFloat(values[3]),
                            volume: parseInt(values[4], 10)
                        });
                    } else if (typeof values === 'object') {
                        // It's an object with named properties
                        const ohlcValues = values as any;
                        priceData.push({
                            date: date.split('T')[0], // Remove time part if present
                            open: parseFloat(ohlcValues.open || 0),
                            high: parseFloat(ohlcValues.high || 0),
                            low: parseFloat(ohlcValues.low || 0),
                            close: parseFloat(ohlcValues.close || 0),
                            volume: parseInt(ohlcValues.vol || ohlcValues.volume || 0, 10)
                        });
                    }
                } catch (err) {
                    console.warn(`Error processing data for date ${date}:`, err);
                    // Continue processing other dates
                }
            }
        } else {
            console.warn("No OHLC data to process");
            return null;
        }

        // Sort the price data by date
        priceData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        console.log(`Processed ${priceData.length} data points for ${symbol}`);

        if (priceData.length === 0) {
            console.warn("No price data was processed");
            return null;
        }

        // Calculate min, max, first, and last prices
        const firstPrice = priceData.length > 0 ? priceData[0].close : 0;
        const lastPrice = priceData.length > 0 ? priceData[priceData.length - 1].close : 0;
        const prices = priceData.map(d => d.close);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        // Calculate return
        const returnValue = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
        const returnFormatted = returnValue.toFixed(2) + '%';

        console.log(`Built stock data object with ${priceData.length} price points`);

        // Return the processed stock data
        return {
            symbol,
            name: getStockName(symbol),
            firstPrice,
            lastPrice,
            minPrice,
            maxPrice,
            return: returnFormatted,
            priceData,
            isMockData: false // This is real data from the API
        };
    };

    const processSummaryData = (toolResponse: any, args: any): StockData | null => {
        console.log(`Processing summary data. Tool response type:`, typeof toolResponse);
        console.log(`Args:`, JSON.stringify(args, null, 2));

        try {
            // Extract data from the response item which may contain JSON data
            if (toolResponse.item) {
                console.log("Tool response item found, type:", typeof toolResponse.item);
                try {
                    let stockInfo;
                    if (typeof toolResponse.item === 'string') {
                        // Parse the string if it's JSON
                        const parsedItem = JSON.parse(toolResponse.item);
                        console.log("Successfully parsed item string with keys:", Object.keys(parsedItem));

                        if (parsedItem.tool === "Summary" && parsedItem.data && parsedItem.data.length > 0) {
                            // Parse the data string to get stock info
                            try {
                                const stockData = JSON.parse(parsedItem.data[0]);
                                const stockSymbol = Object.keys(stockData)[0]; // e.g., "Tesla Rg"
                                stockInfo = stockData[stockSymbol];
                                console.log("Found stock info for symbol:", stockSymbol);
                            } catch (e) {
                                console.warn("Error parsing summary data string:", e);
                            }
                        }
                    } else {
                        // It's already an object
                        const parsedItem = toolResponse.item;
                        console.log("Using item directly as object, keys:", Object.keys(parsedItem));

                        if (parsedItem.tool === "Summary" && parsedItem.data && parsedItem.data.length > 0) {
                            try {
                                // Handle both string and direct object
                                const dataItem = typeof parsedItem.data[0] === 'string'
                                    ? JSON.parse(parsedItem.data[0])
                                    : parsedItem.data[0];

                                const stockSymbol = Object.keys(dataItem)[0]; // e.g., "Tesla Rg"
                                stockInfo = dataItem[stockSymbol];
                                console.log("Found stock info for symbol:", stockSymbol);
                            } catch (e) {
                                console.warn("Error processing summary data object:", e);
                            }
                        }
                    }

                    // If we found stock info, create a StockData object
                    if (stockInfo) {
                        console.log("Creating stock data from info:", stockInfo);
                        // Clean up values that might be strings
                        const parseValue = (val: any) => typeof val === 'string' ? parseFloat(val) || 0 : (val || 0);

                        const firstPrice = parseValue(stockInfo.open);
                        const lastPrice = parseValue(stockInfo.close);
                        const highPrice = parseValue(stockInfo.high);
                        const lowPrice = parseValue(stockInfo.low);

                        // Calculate return as percentage
                        const returnValue = firstPrice > 0
                            ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2) + '%'
                            : '0.00%';

                        // Create a simple price data array with just today's data
                        const today = new Date().toISOString().split('T')[0];
                        const priceData = [{
                            date: today,
                            open: firstPrice,
                            high: highPrice,
                            low: lowPrice,
                            close: lastPrice,
                            volume: parseInt(stockInfo.vol || '0') || 0
                        }];

                        // Use company from args if available, otherwise use data from response
                        const symbol = stockInfo['Ticker symbol'] || args?.company || 'Unknown';

                        // Return the processed stock data
                        return {
                            symbol,
                            name: stockInfo.Name || getStockName(symbol),
                            firstPrice,
                            lastPrice,
                            minPrice: lowPrice,
                            maxPrice: highPrice,
                            return: returnValue,
                            priceData,
                            isMockData: false
                        };
                    }
                } catch (e) {
                    console.error('Error parsing summary data:', e);
                }
            } else if (toolResponse.content) {
                // Try to extract data from the content directly if item is missing
                console.log("No item found, trying to extract from content:", toolResponse.content?.substring(0, 100));

                // Skip if content is just the query text itself
                if (args.query && toolResponse.content.toLowerCase().trim() === args.query.toLowerCase().trim()) {
                    console.log("Content is just the query text, skipping extraction");
                    return null;
                }

                // Skip if content is too short to contain valid data
                if (toolResponse.content.length < 20) {
                    console.log("Content too short to contain valid data");
                    return null;
                }

                // Extract data from table format in content
                try {
                    const content = toolResponse.content;
                    // Extract values using regex or line by line parsing
                    const lines = content.split('\n');
                    const stockData: Record<string, any> = {};

                    // Simple extraction of key-value pairs from lines
                    for (const line of lines) {
                        // Look for lines with patterns like "key value" or "key: value"
                        // Tesla's content has a specific format with multiple spaces as separator
                        const match = line.match(/^\s*([\w\s\.\-]+?)(?:[:]{0,1}|\s{2,})([^:].*?)(?:\s*)?$/);
                        if (match) {
                            const [_, key, value] = match;
                            stockData[key.trim()] = value.trim();
                            console.log(`Extracted: ${key.trim()} = ${value.trim()}`);
                        }
                    }

                    if (Object.keys(stockData).length > 0) {
                        console.log("Extracted stock data from content:", stockData);

                        // Extract key details from the extracted data
                        let symbol = 'Unknown'; // Default
                        let name = '';

                        // Look for ticker symbol in the extracted data
                        // Common key patterns for ticker symbols
                        const tickerKeys = ['Ticker symbol', 'ticker', 'symbol', 'T'];
                        for (const key of tickerKeys) {
                            if (stockData[key] && typeof stockData[key] === 'string') {
                                // Clean up the ticker - remove whitespace and extract just the symbol
                                const tickerValue = stockData[key].trim();
                                const tickerMatch = tickerValue.match(/([A-Z0-9]+)/);
                                if (tickerMatch) {
                                    symbol = tickerMatch[0];
                                    console.log(`Using extracted ticker symbol: ${symbol}`);
                                    break;
                                }
                            }
                        }

                        // Look for company name in the extracted data
                        const nameKeys = ['Name', 'name', 'company', 'N'];
                        for (const key of nameKeys) {
                            if (stockData[key] && typeof stockData[key] === 'string') {
                                const nameValue = stockData[key].trim();
                                if (nameValue.length > 0) {
                                    name = nameValue;
                                    console.log(`Using extracted company name: ${name}`);
                                    break;
                                }
                            }
                        }

                        // Parse numeric values - ensure they are numbers not strings
                        const parseNumericValue = (key: string): number => {
                            const value = stockData[key];
                            if (value === undefined) return 0;
                            if (typeof value === 'number') return value;
                            if (typeof value === 'string') {
                                // Extract the first number from the string
                                const match = value.match(/(\d+\.?\d*)/);
                                return match ? parseFloat(match[1]) : 0;
                            }
                            return 0;
                        };

                        // Get price values, handling different possible key formats
                        const firstPrice = parseNumericValue('open') || parseNumericValue('o');
                        const lastPrice = parseNumericValue('close') || parseNumericValue('c');
                        const highPrice = parseNumericValue('high') || parseNumericValue('h');
                        const lowPrice = parseNumericValue('low') || parseNumericValue('l');
                        const volume = parseNumericValue('vol') || parseNumericValue('v') || parseNumericValue('volume');

                        console.log(`Parsed values: open=${firstPrice}, close=${lastPrice}, high=${highPrice}, low=${lowPrice}, vol=${volume}`);

                        // If all prices are zero, throw an error
                        if (firstPrice === 0 && lastPrice === 0 && highPrice === 0 && lowPrice === 0) {
                            throw new Error('Could not extract valid price data from response');
                        }

                        // Calculate return as percentage
                        const returnValue = firstPrice > 0
                            ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2) + '%'
                            : '0.00%';

                        // Create a simple price data array with just today's data
                        const today = new Date().toISOString().split('T')[0];
                        const priceData = [{
                            date: today,
                            open: firstPrice,
                            high: highPrice,
                            low: lowPrice,
                            close: lastPrice,
                            volume: Math.floor(volume)
                        }];

                        return {
                            symbol,
                            name: name || getStockName(symbol),
                            firstPrice,
                            lastPrice,
                            minPrice: lowPrice,
                            maxPrice: highPrice,
                            return: returnValue,
                            priceData,
                            isMockData: false
                        };
                    }
                } catch (e) {
                    console.error('Error extracting data from content:', e);
                }
            }

            console.warn("No valid data found in summary response");
            throw new Error("Could not extract valid data from summary response");
        } catch (e) {
            console.error('Error processing summary data:', e);
            throw new Error(`Failed to process summary data: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }

    // API connectivity check
    const checkApiConnectivity = async (): Promise<boolean> => {
        try {
            console.log('Checking API connectivity from useFinancialApi')

            // Try to ping the API up to 2 times
            let attempts = 0
            const maxAttempts = 2
            let lastError = null

            while (attempts < maxAttempts) {
                attempts++
                try {
                    console.log(`API connectivity check attempt ${attempts}/${maxAttempts}`)

                    // Use Nuxt's $fetch but with explicit type annotation to avoid recursion
                    const response = await $fetch<ApiResponse>('/api/financial/ping', {
                        method: 'POST',
                        timeout: 20000 // Allow more time for the connectivity check
                    })

                    console.log('API connectivity check response received:', JSON.stringify({
                        hasResponse: !!response,
                        hasMessages: !!(response && response.messages),
                        messageTypes: response?.messages?.map(msg => msg.type).join(', ') || 'none',
                        hasError: !!response?.error
                    }))

                    // If the response indicates an error, treat it as a failure
                    if (response?.error) {
                        console.warn('API connectivity check: Error flag in response', response.message)
                        lastError = response.message
                        // If it's a timeout error, try again
                        if (response.isTimeout) {
                            console.log('Timeout detected, will retry if attempts remain')
                            // Wait before retrying
                            await new Promise(resolve => setTimeout(resolve, 1000))
                            continue
                        }
                        return false
                    }

                    // Check that we have a valid response structure
                    if (!response || !response.messages || !Array.isArray(response.messages)) {
                        console.warn('API connectivity check: Invalid response structure')
                        return false
                    }

                    // Check for AI message - API is considered available if we get a proper AI response
                    const aiMessage = response.messages.find(msg => msg.type === 'ai')
                    if (!aiMessage) {
                        console.warn('API connectivity check: No AI message found')
                        return false
                    }

                    console.log('API connectivity check: Success - API is available')
                    return true
                } catch (e) {
                    lastError = e
                    console.warn(`API connectivity check attempt ${attempts} failed:`, e)

                    // Wait before retrying
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                }
            }

            console.warn(`API connectivity check: Failed after ${maxAttempts} attempts. Last error:`, lastError)
            return false
        } catch (e) {
            console.warn('API connectivity check: Failed with exception', e)
            return false
        }
    }

    // Helper function to mark API as available/unavailable
    const setApiAvailable = (available: boolean) => {
        // We'll keep this function but not set isMockData anymore
        console.log(`API availability set to: ${available}`)
    }

    // Add function to process company data
    const processCompanyData = (toolResponse: ApiMessage | undefined, args: any): CompanyDataMap | null => {
        if (!toolResponse) {
            console.warn('Invalid company data tool response (undefined)')
            return null
        }

        try {
            console.log('Processing company data from tool response')
            // Try both content and item if available
            const content = toolResponse.content || ''
            const item = toolResponse.item || ''

            if (!content && !item) {
                console.warn('No content or item found in company data response')
                return null
            }

            // Try to extract the JSON data from the response content
            const companyDataMap: CompanyDataMap = {}

            // First try to parse data from item if available
            if (item && typeof item === 'string') {
                try {
                    const parsedItem = JSON.parse(item)
                    console.log('Successfully parsed company data item:', Object.keys(parsedItem))

                    if (parsedItem.tool === 'CompanyDataSearch' && parsedItem.data) {
                        let companyData

                        // Handle data as string or direct object
                        if (typeof parsedItem.data === 'string') {
                            companyData = JSON.parse(parsedItem.data)
                        } else if (Array.isArray(parsedItem.data) && parsedItem.data.length > 0) {
                            // Handle as array of data
                            companyData = typeof parsedItem.data[0] === 'string'
                                ? JSON.parse(parsedItem.data[0])
                                : parsedItem.data[0]
                        } else {
                            companyData = parsedItem.data
                        }

                        // Process the company data
                        for (const [company, info] of Object.entries(companyData)) {
                            if (typeof info === 'object' && info !== null) {
                                companyDataMap[company] = {
                                    period: extractPeriodFromQuery(args.query) || new Date().getFullYear().toString(),
                                    metrics: info as CompanyMetric
                                }
                            }
                        }

                        if (Object.keys(companyDataMap).length > 0) {
                            console.log(`Extracted company data for ${Object.keys(companyDataMap).length} companies from item`)
                            return companyDataMap
                        }
                    }
                } catch (itemError) {
                    console.warn('Error parsing company data item:', itemError)
                    // Continue to check content
                }
            }

            // Try to extract from content
            // Look for JSON pattern in the response content
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                content.match(/{[\s\S]*?}/)

            if (jsonMatch) {
                let jsonStr = jsonMatch[0]

                // Clean up if the string has markdown code blocks
                if (jsonStr.startsWith('```')) {
                    jsonStr = jsonMatch[1]
                }

                // Parse the JSON data
                try {
                    const data = JSON.parse(jsonStr)

                    // Process each company
                    for (const [company, info] of Object.entries(data)) {
                        if (typeof info === 'object' && info !== null) {
                            companyDataMap[company] = {
                                period: extractPeriodFromQuery(args.query) || new Date().getFullYear().toString(),
                                metrics: info as CompanyMetric
                            }
                        }
                    }

                    if (Object.keys(companyDataMap).length > 0) {
                        console.log(`Extracted company data for ${Object.keys(companyDataMap).length} companies from content`)
                        return companyDataMap
                    }
                } catch (jsonError) {
                    console.error('Failed to parse company data JSON:', jsonError)
                }
            }

            // If we couldn't parse JSON, try to extract from tables or text
            if (content.includes('|') && content.includes('\n')) {
                console.log('Trying to extract company data from markdown table')
                try {
                    // This is likely a markdown table
                    const companyData = extractCompanyDataFromTable(content)
                    if (Object.keys(companyData).length > 0) {
                        console.log(`Extracted company data for ${Object.keys(companyData).length} companies from table`)
                        return companyData
                    }
                } catch (tableError) {
                    console.warn('Error extracting company data from table:', tableError)
                }
            }

            console.warn('Could not extract company data from response')
            return null
        } catch (e) {
            console.error('Error processing company data:', e)
            return null
        }
    }

    // Helper function to extract period from query string
    const extractPeriodFromQuery = (query: string): string | null => {
        if (!query) return null

        // Look for pattern like 2023Q1 or just 2023
        const periodMatch = query.match(/(\d{4}(?:Q[1-4])?)/)
        return periodMatch ? periodMatch[1] : null
    }

    // Helper function to extract company data from a markdown table
    const extractCompanyDataFromTable = (tableContent: string): CompanyDataMap => {
        const result: CompanyDataMap = {}

        // Split by lines and filter out empty lines
        const lines = tableContent.split('\n').filter(line => line.trim().length > 0)

        if (lines.length < 3) {
            // Need at least header, separator, and one data row
            return result
        }

        // Get header row and extract column names
        const headerRow = lines[0]
        const columns = headerRow.split('|')
            .map(col => col.trim())
            .filter(col => col.length > 0)

        if (columns.length < 2) {
            // Need at least a company name column and one metric
            return result
        }

        // Process data rows (skip header and separator rows)
        for (let i = 2; i < lines.length; i++) {
            const row = lines[i]
            if (!row.includes('|')) continue

            const cells = row.split('|')
                .map(cell => cell.trim())
                .filter(cell => cell !== '')

            if (cells.length < columns.length) continue

            const company = cells[0]
            const metrics: Record<string, any> = {}

            // Process each metric
            for (let j = 1; j < columns.length && j < cells.length; j++) {
                const metricName = columns[j]
                const metricValue = cells[j]

                // Try to convert to number if possible
                const numericValue = parseFloat(metricValue.replace(/,/g, ''))
                metrics[metricName] = isNaN(numericValue) ? metricValue : numericValue
            }

            // Determine period - usually in the query or a separate column
            // For simplicity, using current year as default
            result[company] = {
                period: new Date().getFullYear().toString(),
                metrics
            }
        }

        return result
    }

    // Function to extract stock data from general API response
    const extractStockData = (response: ApiResponse): StockData | null => {
        console.log('Extracting stock data from general API response')

        try {
            // Try to identify specific companies from the query or response content
            const queryString = lastQuery.value.toLowerCase();

            // First try to find any summary data directly in the response
            // It could be in various formats, so we'll check multiple patterns

            // 1. Check if any message has summary-like data in the content
            if (response.messages) {
                // Look for content with stock information indicators
                for (const message of response.messages) {
                    if (message.content) {
                        // Skip content that is just the query or very similar to it
                        if (message.content.toLowerCase().trim() === queryString.trim()) {
                            console.log('Skipping content that is just the query text');
                            continue;
                        }

                        // Check if content has stock data markers like price, open, close
                        if ((message.content.includes('open') && message.content.includes('close')) ||
                            (message.content.includes('price') && message.content.includes('high')) ||
                            message.content.includes('volume')) {

                            console.log('Found potential stock data in message content');
                            // Try to process it as summary data
                            const mockSummaryResponse = {
                                type: 'tool',
                                content: message.content
                            }

                            const processedData = processSummaryData(mockSummaryResponse, {
                                query: lastQuery.value
                            });

                            if (processedData && isDataValid(processedData)) {
                                console.log('Successfully extracted valid stock data from message content');
                                return processedData;
                            } else {
                                console.log('Extracted data was invalid or incomplete, continuing search');
                            }
                        }
                    }

                    // Check if message has an item that might contain stock data
                    if (message.item && typeof message.item === 'string') {
                        try {
                            // Try parsing it as JSON
                            const itemData = JSON.parse(message.item);
                            if (itemData.tool === 'Summary' || itemData.tool === 'Show_Summary') {
                                console.log('Found Summary tool item data');
                                const processedData = processSummaryData(message, {
                                    query: lastQuery.value
                                });

                                if (processedData && isDataValid(processedData)) {
                                    console.log('Successfully extracted valid stock data from item');
                                    return processedData;
                                }
                            }
                        } catch (e) {
                            // Not valid JSON, continue to other checks
                        }
                    }
                }
            }

            // 2. Check if response has a direct property containing stock data
            // Some API responses might have data directly in the response
            const dataProperties = ['data', 'stockData', 'summary', 'result'];
            for (const prop of dataProperties) {
                if (response[prop]) {
                    console.log(`Found potential stock data in response.${prop}`);
                    try {
                        // Try to convert to StockData format
                        const data = response[prop];
                        if (typeof data === 'object') {
                            // Look for necessary stock data fields
                            if ((data.symbol || data.name) &&
                                (typeof data.open === 'number' || typeof data.close === 'number')) {
                                console.log('Creating stock data from direct response property');

                                // Create appropriate stock data object
                                const stockData = {
                                    symbol: data.symbol || data.name || lastQuery.value,
                                    name: data.name || getStockName(data.symbol || lastQuery.value),
                                    firstPrice: typeof data.open === 'number' ? data.open : 0,
                                    lastPrice: typeof data.close === 'number' ? data.close : 0,
                                    minPrice: typeof data.low === 'number' ? data.low : 0,
                                    maxPrice: typeof data.high === 'number' ? data.high : 0,
                                    return: data.return || '0.00%',
                                    priceData: data.priceData || [],
                                    isMockData: false
                                };

                                if (isDataValid(stockData)) {
                                    return stockData;
                                } else {
                                    console.log('Direct property data was invalid');
                                }
                            }
                        }
                    } catch (e) {
                        console.warn(`Error processing data from response.${prop}:`, e);
                    }
                }
            }

            // If we couldn't find valid stock data, throw an error
            throw new Error('Could not extract valid stock data from the API response');
        } catch (e) {
            console.error('Error in extractStockData:', e);
            throw e; // Don't fall back to mock data
        }
    }

    // Helper function to check if stock data is valid (has non-zero values)
    const isDataValid = (data: StockData): boolean => {
        // Check for essential non-zero values
        if (!data) return false;

        // Minimum criteria: symbol, name and at least one valid price
        if (!data.symbol || !data.name) return false;

        // Check for at least one non-zero price
        if (data.firstPrice <= 0 && data.lastPrice <= 0 && data.maxPrice <= 0) {
            console.log(`Data validation failed: All prices are zero for ${data.symbol}`);
            return false;
        }

        // Check that price data exists and contains valid points
        if (!data.priceData || data.priceData.length === 0) {
            console.log(`Data validation failed: No price data for ${data.symbol}`);
            return false;
        }

        // Check that at least one price point has valid values
        const hasValidPricePoint = data.priceData.some(
            p => p.close > 0 || p.open > 0 || p.high > 0 || p.low > 0
        );

        if (!hasValidPricePoint) {
            console.log(`Data validation failed: No valid price points for ${data.symbol}`);
            return false;
        }

        console.log(`Data validation passed for ${data.symbol}`);
        return true;
    }

    return {
        isLoading,
        error,
        data,
        isMockData,
        queryFinancialData,
        searchWithCriteria,
        getOHLCV,
        companyDataSearch,
        getSummary,
        checkApiConnectivity,
        setApiAvailable,
        stockPriceData,
        companyInfoData,
        availableTools
    }
}

// Export API endpoints for reference
export const API_ENDPOINTS = {
    QUERY: '/api/financial/query',
    SEARCH_WITH_CRITERIA: '/api/financial/searchwithcriteria',
    OHLCV: '/api/financial/ohlcv',
    COMPANY_DATA_SEARCH: '/api/financial/companydatasearch',
    SUMMARY: '/api/financial/summary'
}

// Config settings
export const API_CONFIG = {
    timeout: 20000, // 20 seconds timeout
    debugMode: process.env.NODE_ENV === 'development'
} 