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
    isMockData?: boolean; // Flag to indicate mock data
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

// Define mock data type
interface MockDataMap {
    [key: string]: StockData;
}

export const useFinancialApi = () => {
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const data = ref<any>(null)
    const isMockData = ref(false)

    // Main query endpoint - use the same as Python implementation
    const queryFinancialData = async (query: string) => {
        isLoading.value = true
        error.value = null
        data.value = null
        isMockData.value = false // Start with assumption that we'll get real data

        try {
            console.log(`Querying financial data for: "${query}"`)

            // Keep track of attempts to allow retrying for timeouts
            let attempts = 0
            const maxAttempts = 2
            let result: ApiResponse | null = null
            let lastError = null

            // Retry loop for handling timeouts
            while (attempts < maxAttempts) {
                attempts++
                try {
                    console.log(`API query attempt ${attempts}/${maxAttempts}`)

                    // Use our server proxy endpoint that forwards to /query?query={query}
                    result = await $fetch('/api/financial/query', {
                        method: 'POST',
                        query: { query },
                        body: {}, // Empty object to match the server proxy implementation
                    }) as ApiResponse

                    console.log('API response received, status:', result ? 'success' : 'empty')

                    // Check if the response contains an error flag (added in our proxy)
                    if (result?.error) {
                        lastError = result.message
                        // If it's a timeout error, try again
                        if (result.isTimeout) {
                            console.log('Timeout detected, will retry if attempts remain')
                            if (attempts < maxAttempts) {
                                // Wait before retrying
                                await new Promise(resolve => setTimeout(resolve, 1000))
                                continue
                            }
                        }
                        // Non-timeout error or max attempts reached
                        throw new Error(result.message || 'API error')
                    }

                    // Successfully received a response
                    break
                } catch (e) {
                    lastError = e
                    console.warn(`API query attempt ${attempts} failed:`, e)

                    // Check if we should retry (for timeout errors)
                    const isTimeout = e instanceof Error && e.message.includes('timeout')
                    if (isTimeout && attempts < maxAttempts) {
                        console.log('Timeout detected, will retry')
                        // Wait before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000))
                        continue
                    }

                    // Either not a timeout or max attempts reached
                    throw e
                }
            }

            data.value = result

            // Process the API response if we have a result
            let processedData: StockData | null = null
            if (result) {
                processedData = processApiResponse(result)
            } else {
                console.warn("No API response received")
            }

            // If processing returned null, use mock data
            if (!processedData) {
                console.warn("API response couldn't be processed, falling back to mock data")
                processedData = getMockStockData(query)
                isMockData.value = true // Set this flag when we use mock data

                // Log the specific reasons why processing failed
                if (!result) {
                    console.warn("Reason: Empty API response")
                } else if (!result.messages) {
                    console.warn("Reason: No messages in API response")
                } else {
                    const aiMessage = result.messages.find((msg) => msg.type === 'ai')
                    if (!aiMessage) {
                        console.warn("Reason: No AI message in response")
                    } else if (!aiMessage.tool_calls || !aiMessage.tool_calls.length) {
                        console.warn("Reason: No tool calls in AI message")
                    } else {
                        const toolCall = aiMessage.tool_calls[0]
                        const toolResponse = result.messages.find(
                            (msg) => msg.type === 'tool' && msg.tool_call_id === toolCall.id
                        )
                        if (!toolResponse) {
                            console.warn(`Reason: No tool response for tool call ID: ${toolCall.id}`)
                        } else {
                            console.warn(`Reason: Error processing ${toolCall.name} data`)
                        }
                    }
                }
            } else {
                // Successfully processed the API response, mark data as real
                isMockData.value = false
                console.log("Successfully processed API data:",
                    processedData.symbol,
                    `First: ${processedData.firstPrice}`,
                    `Last: ${processedData.lastPrice}`,
                    `Return: ${processedData.return}`,
                    `Data points: ${processedData.priceData.length}`,
                    `Mock: ${processedData.isMockData}`)
            }

            // Make sure the isMockData flag is set on the object that's returned to the UI
            if (processedData) {
                // Set the isMockData property on the result object to match our ref state
                processedData.isMockData = isMockData.value
                console.log(`Returning final data with isMockData flag: ${processedData.isMockData}`)
            }

            return processedData
        } catch (e) {
            console.error("API error:", e)
            error.value = e instanceof Error ? e.message : 'An unknown error occurred'

            // Return mock data on error
            console.warn("API error, using mock data instead")
            isMockData.value = true // Set this flag when we use mock data
            return getMockStockData(query)
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
            const queryParams: Record<string, string> = {
                query,
                first
            }

            if (last) {
                queryParams.last = last
            }

            const result = await $fetch('/api/financial/ohlcv', {
                method: 'POST',
                query: queryParams,
                body: {}, // Empty object instead of empty string
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

    // Mock data implementation for testing
    const getMockStockData = (query: string): StockData => {
        // Extract ticker from query (simplistic approach)
        const upperQuery = query.toUpperCase()
        let ticker = 'TSLA'

        // Try to determine ticker from query
        if (upperQuery.includes('APPLE') || upperQuery.includes('AAPL')) ticker = 'AAPL'
        else if (upperQuery.includes('TESLA') || upperQuery.includes('TSLA')) ticker = 'TSLA'
        else if (upperQuery.includes('MICROSOFT') || upperQuery.includes('MSFT')) ticker = 'MSFT'
        else if (upperQuery.includes('GOOGLE') || upperQuery.includes('GOOG')) ticker = 'GOOG'
        else if (upperQuery.includes('NVIDIA') || upperQuery.includes('NVDA')) ticker = 'NVDA'

        // Mock data based on ticker
        const mockData: MockDataMap = {
            'AAPL': {
                symbol: 'AAPL',
                name: 'Apple Inc.',
                firstPrice: 148.56,
                lastPrice: 183.79,
                minPrice: 145.17,
                maxPrice: 189.83,
                return: '23.71%',
                priceData: []
            },
            'TSLA': {
                symbol: 'TSLA',
                name: 'Tesla, Inc.',
                firstPrice: 172.38,
                lastPrice: 225.31,
                minPrice: 138.82,
                maxPrice: 248.42,
                return: '30.70%',
                priceData: []
            },
            'MSFT': {
                symbol: 'MSFT',
                name: 'Microsoft Corporation',
                firstPrice: 337.22,
                lastPrice: 407.46,
                minPrice: 328.39,
                maxPrice: 427.21,
                return: '20.83%',
                priceData: []
            },
            'GOOG': {
                symbol: 'GOOG',
                name: 'Alphabet Inc.',
                firstPrice: 130.83,
                lastPrice: 150.67,
                minPrice: 117.34,
                maxPrice: 153.92,
                return: '15.16%',
                priceData: []
            },
            'NVDA': {
                symbol: 'NVDA',
                name: 'NVIDIA Corporation',
                firstPrice: 459.77,
                lastPrice: 925.66,
                minPrice: 430.15,
                maxPrice: 974.85,
                return: '101.33%',
                priceData: []
            }
        }

        // Generate mock price data
        const today = new Date()
        const mockStockData = { ...mockData[ticker as keyof typeof mockData] }
        mockStockData.isMockData = true // Explicitly set this flag for mock data
        const priceData: StockData['priceData'] = []

        for (let i = 365; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)

            // Simple sinusoidal pattern for price variation
            const progress = i / 365
            const amplitude = (mockStockData.maxPrice - mockStockData.minPrice) * 0.5
            const center = (mockStockData.maxPrice + mockStockData.minPrice) / 2
            const noise = Math.random() * amplitude * 0.2

            // For positive return, trend up; for negative, trend down
            const trend = parseFloat(mockStockData.return) > 0
                ? (1 - progress) * amplitude * 0.5
                : progress * amplitude * 0.5

            const price = center + Math.sin(progress * Math.PI * 4) * amplitude * 0.3 + noise + trend

            priceData.push({
                date: date.toISOString().split('T')[0],
                open: price * (1 - Math.random() * 0.02),
                high: price * (1 + Math.random() * 0.015),
                low: price * (1 - Math.random() * 0.015),
                close: price,
                volume: Math.floor(1000000 + Math.random() * 5000000)
            })
        }

        mockStockData.priceData = priceData
        return mockStockData
    }

    const processApiResponse = (apiResponse: ApiResponse): StockData | null => {
        console.log("Processing API response...");

        // Safely stringify the response with a depth limit to avoid overwhelming the console
        const safeStringify = (obj: any, maxDepth = 2, indent = 0): string => {
            try {
                if (indent > maxDepth) return '...';
                if (obj === null) return 'null';
                if (obj === undefined) return 'undefined';
                if (typeof obj !== 'object') return String(obj);

                const isArray = Array.isArray(obj);
                const result: string[] = [];
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        const value = obj[key];
                        result.push(`${' '.repeat(indent * 2)}${isArray ? '' : `"${key}": `}${safeStringify(value, maxDepth, indent + 1)}`);
                    }
                }

                // Fix: Handle the case where indent - 1 is negative
                const indentSpace = indent > 0 ? ' '.repeat((indent - 1) * 2) : '';

                return isArray
                    ? `[${result.length > 0 ? '\n' + result.join(',\n') + '\n' + indentSpace : ''}]`
                    : `{${result.length > 0 ? '\n' + result.join(',\n') + '\n' + indentSpace : ''}}`;
            } catch (err) {
                console.warn("Error in safeStringify:", err);
                return String(obj);
            }
        };

        try {
            // Log the structure safely - with a try/catch to prevent errors
            try {
                console.log("API response structure:", safeStringify(apiResponse));
            } catch (stringifyError) {
                console.warn("Error stringifying API response:", stringifyError);
            }

            // Check if there are messages in the response
            if (!apiResponse?.messages || !Array.isArray(apiResponse.messages)) {
                console.warn("No messages array in API response");
                return null;
            }

            // Log message types for debugging
            console.log("Number of messages:", apiResponse.messages.length);
            console.log("Message types:", apiResponse.messages.map((msg, i) => `${i}:${msg.type}`).join(', '));

            // Based on the API description:
            // - First message (0) is usually the human message
            // - Second message (1) is usually the AI message with tool_calls
            // - Third message (2) is usually the tool message with the data in the item property

            let toolMessage = null;

            // First try to find any tool message with an item property
            toolMessage = apiResponse.messages.find(msg => msg.type === 'tool' && msg.item);

            // If no tool message found, try the third message directly if it exists
            if (!toolMessage && apiResponse.messages.length >= 3) {
                toolMessage = apiResponse.messages[2];
                console.log("Using third message as tool message:", toolMessage.type);
            }

            if (!toolMessage) {
                console.warn("No tool message found in response");
                return null;
            }

            console.log("Tool message found, type:", toolMessage.type);

            // Check for item property
            if (!toolMessage.item) {
                console.warn("Tool message has no item property");
                return null;
            }

            console.log("Tool item type:", typeof toolMessage.item);

            try {
                // Get tool call information from the AI message (index 1) if it exists
                const aiMessage = apiResponse.messages.find(msg => msg.type === 'ai');
                const toolType = aiMessage?.tool_calls?.[0]?.name || toolMessage.name || "Unknown";
                console.log("Tool type:", toolType);

                let result: StockData | null = null;

                // Process based on tool type, handling Historical_Price_Data and Show_Summary
                if (toolType.includes("Price") || toolType.includes("OHLC") || toolType === "Historical_Price_Data") {
                    console.log("Processing as Historical_Price_Data");
                    result = processHistoricalPriceData(toolMessage, { query: "auto-detected" });
                } else {
                    console.log("Processing as Summary data");
                    result = processSummaryData(toolMessage, { query: "auto-detected" });
                }

                if (result) {
                    // Make absolutely sure the isMockData flag is explicitly set to false
                    result.isMockData = false;
                    console.log("Successfully processed data:", result.symbol);
                    return result;
                } else {
                    console.warn("Failed to process data");
                    return null;
                }
            } catch (error) {
                console.error("Error processing tool message:", error);
                return null;
            }
        } catch (error) {
            console.error("Error in processApiResponse:", error);
            return null;
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
            'DIS': 'The Walt Disney Company'
        };

        // Return the name if found, otherwise use the symbol + " Stock"
        return stockNames[symbol] || `${symbol} Stock`;
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
                                        const unescaped = ohlcDataStr.replace(/\\\\"/g, '\\"').replace(/\\\\/g, '\\');
                                        ohlcData = JSON.parse(unescaped);
                                        console.log(`Successfully parsed unescaped OHLC data with ${ohlcData ? Object.keys(ohlcData).length : 0} entries`);
                                    } catch (unescapeErr) {
                                        console.warn("Error parsing unescaped OHLC data:", unescapeErr);

                                        // As a last resort, try using a regex to extract the basic structure
                                        try {
                                            console.log("Attempting regex extraction of OHLC data");
                                            const dateMatches = ohlcDataStr.match(/\\\"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\\\"/g);
                                            const openMatches = ohlcDataStr.match(/\\\"open\\\":([\d\.]+)/g);
                                            const highMatches = ohlcDataStr.match(/\\\"high\\\":([\d\.]+)/g);
                                            const lowMatches = ohlcDataStr.match(/\\\"low\\\":([\d\.]+)/g);
                                            const closeMatches = ohlcDataStr.match(/\\\"close\\\":([\d\.]+)/g);
                                            const volMatches = ohlcDataStr.match(/\\\"vol\\\":([\d]+)/g);

                                            if (dateMatches && dateMatches.length > 0) {
                                                console.log(`Found ${dateMatches.length} date entries via regex`);
                                                // Create a manual OHLC data structure
                                                ohlcData = {};
                                                for (let i = 0; i < dateMatches.length; i++) {
                                                    const date = dateMatches[i].replace(/\\\"/g, '');
                                                    ohlcData[date] = {
                                                        open: openMatches && openMatches[i] ? parseFloat(openMatches[i].replace(/\\\"open\\\":/, '')) : 0,
                                                        high: highMatches && highMatches[i] ? parseFloat(highMatches[i].replace(/\\\"high\\\":/, '')) : 0,
                                                        low: lowMatches && lowMatches[i] ? parseFloat(lowMatches[i].replace(/\\\"low\\\":/, '')) : 0,
                                                        close: closeMatches && closeMatches[i] ? parseFloat(closeMatches[i].replace(/\\\"close\\\":/, '')) : 0,
                                                        vol: volMatches && volMatches[i] ? parseInt(volMatches[i].replace(/\\\"vol\\\":/, ''), 10) : 0
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

                        const symbol = stockInfo['Ticker symbol'] || args?.company || 'TSLA';

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
                            isMockData: false // This is real data from the API
                        };
                    }
                } catch (e) {
                    console.error('Error parsing summary data:', e);
                }
            } else if (toolResponse.content) {
                // Try to extract data from the content directly if item is missing
                console.log("No item found, trying to extract from content:", toolResponse.content?.substring(0, 100));

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

                        // Get symbol either from arguments or content
                        const symbol = args?.company || stockData['Ticker symbol'] || 'TSLA';
                        const name = stockData['Name'] || getStockName(symbol);

                        // Parse numeric values
                        const firstPrice = parseFloat(stockData['open'] || '0');
                        const lastPrice = parseFloat(stockData['close'] || '0');
                        const highPrice = parseFloat(stockData['high'] || '0');
                        const lowPrice = parseFloat(stockData['low'] || '0');

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
                            volume: parseInt(stockData['vol'] || '0') || 0
                        }];

                        return {
                            symbol,
                            name,
                            firstPrice,
                            lastPrice,
                            minPrice: lowPrice,
                            maxPrice: highPrice,
                            return: returnValue,
                            priceData,
                            isMockData: false // This is real data from the API
                        };
                    }
                } catch (e) {
                    console.error('Error extracting data from content:', e);
                }
            }

            console.warn("No valid data found in summary response");
            return null;
        } catch (e) {
            console.error('Error processing summary data:', e);
            return null;
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

                    const response = await $fetch('/api/financial/ping', {
                        method: 'POST',
                        timeout: 15000 // Allow more time for the connectivity check
                    }) as ApiResponse

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
        // This function would be called by external components to force the state
        isMockData.value = !available
        console.log(`API availability manually set to: ${available}, isMockData: ${isMockData.value}`)
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
        setApiAvailable
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
    timeout: 15000, // 15 seconds timeout
    debugMode: process.env.NODE_ENV === 'development'
} 