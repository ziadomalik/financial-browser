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
}

// Define mock data type
interface MockDataMap {
    [key: string]: StockData;
}

export const useFinancialApi = () => {
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const data = ref<any>(null)

    const SIX_API_BASE_URL = 'https://idchat-api-containerapp01-dev.orangepebble-16234c4b.switzerlandnorth.azurecontainerapps.io'

    const queryFinancialData = async (query: string) => {
        isLoading.value = true
        error.value = null
        data.value = null

        try {
            const response = await fetch(`${SIX_API_BASE_URL}/query?query=${encodeURIComponent(query)}`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`)
            }

            const result = await response.json()
            data.value = result

            // Process the tool calls from the response
            let processedData = processApiResponse(result)

            // If processing returned null, use mock data
            if (!processedData) {
                console.log("API response couldn't be processed, using mock data")
                processedData = getMockStockData(query)
            }

            return processedData
        } catch (e) {
            console.error("API error:", e)
            error.value = e instanceof Error ? e.message : 'An unknown error occurred'

            // Return mock data on error
            console.log("API error, using mock data instead")
            return getMockStockData(query)
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

    const processApiResponse = (response: any): StockData | null => {
        try {
            // Check if we have tool calls in the response
            const aiMessage = response.messages.find((msg: any) => msg.type === 'ai')

            if (aiMessage && aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                // Get the first tool call
                const toolCall = aiMessage.tool_calls[0]

                // Find the tool response
                const toolResponse = response.messages.find(
                    (msg: any) => msg.type === 'tool' && msg.tool_call_id === toolCall.id
                )

                if (toolResponse) {
                    // Process based on the tool type
                    switch (toolCall.name) {
                        case 'Historical_Price_Data':
                            return processHistoricalPriceData(toolResponse, toolCall.args)
                        // Add more tool types as needed
                        default:
                            console.warn(`Unknown tool type: ${toolCall.name}`)
                            return null
                    }
                }
            }

            console.warn("No valid tool calls found in response")
            return null
        } catch (error) {
            console.error("Error processing API response:", error)
            return null
        }
    }

    const processHistoricalPriceData = (toolResponse: any, args: any): StockData | null => {
        try {
            // Extract table data from the response
            const tableMatch = toolResponse.content.match(/\|(.*?)\|/g)

            if (!tableMatch) return null

            // Parse the response to extract the data
            const headerRow = tableMatch[0].split('|').map((cell: string) => cell.trim()).filter(Boolean)
            const dataRow = tableMatch[1].split('|').map((cell: string) => cell.trim()).filter(Boolean)

            // Get the stock symbol
            const stockSymbol = dataRow[0]

            // Extract the actual object data if available
            let rawOhlcData = null
            if (toolResponse.item) {
                try {
                    const parsedItem = JSON.parse(toolResponse.item)
                    if (parsedItem.data) {
                        // This should contain the full OHLC data
                        rawOhlcData = JSON.parse(parsedItem.data)
                    }
                } catch (e) {
                    console.error('Error parsing OHLC data:', e)
                }
            }

            // Build the stock data object
            const firstPrice = parseFloat(dataRow[1])
            const lastPrice = parseFloat(dataRow[2])
            const minPrice = parseFloat(dataRow[3])
            const maxPrice = parseFloat(dataRow[4])
            const returnValue = dataRow[5]

            // Process the OHLC data to get historical prices for charting
            const priceData: StockData['priceData'] = []

            if (rawOhlcData && rawOhlcData[stockSymbol]) {
                const stockData = JSON.parse(rawOhlcData[stockSymbol])

                Object.entries(stockData).forEach(([date, data]: [string, any]) => {
                    priceData.push({
                        date: new Date(date).toISOString().split('T')[0],
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        close: data.close,
                        volume: data.vol
                    })
                })

                // Sort by date
                priceData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            }

            return {
                symbol: stockSymbol,
                name: `${stockSymbol} Stock`,
                firstPrice,
                lastPrice,
                minPrice,
                maxPrice,
                return: returnValue,
                priceData
            }
        } catch (e) {
            console.error('Error processing historical price data:', e)
            return null
        }
    }

    return {
        isLoading,
        error,
        data,
        queryFinancialData
    }
} 