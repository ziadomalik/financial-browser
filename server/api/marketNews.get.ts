// @ts-ignore
import finnhub from 'finnhub'

export default defineEventHandler(async (event) => {
    const { finnhubApiKey } = useRuntimeConfig(event)

    const api_key = finnhub.ApiClient.instance.authentications['api_key'];
    api_key.apiKey = finnhubApiKey 

    const finnhubClient = new finnhub.DefaultApi()

    // Use a promise-based approach instead of callbacks
    return new Promise((resolve, reject) => {
        finnhubClient.marketNews("general", {}, (error: any, data: any, response: any) => {
            if (error) {
                reject(error)
            } else {
                resolve(data)
            }
        });
    })
})