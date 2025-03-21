import * as fs from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import OpenAI from 'openai'
import { createReadStream } from 'node:fs'
import { mkdir, access } from 'node:fs/promises'

import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

// Set the ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeInstaller.path)

export default defineEventHandler(async (event) => {
    try {
        // Parse the multipart form data
        const formData = await readMultipartFormData(event)
        if (!formData) {
            throw new Error('No form data received')
        }
        
        // Extract the audio blob and tab ID
        const audioFile = formData.find(part => part.name === 'audio')
        const tabIdPart = formData.find(part => part.name === 'tabId')
        
        if (!audioFile || !audioFile.data) {
            throw new Error('No audio data received')
        }
        
        const tabId = tabIdPart?.data.toString() || 'unknown'
        const fileId = randomUUID()
        const fileName = `${tabId}-${fileId}.webm`
        const tmpDir = join(process.cwd(), 'tmp')
        const filePath = join(tmpDir, fileName)
        
        // Ensure tmp directory exists
        try {
            await access(tmpDir)
        } catch (error) {
            // Directory doesn't exist, create it
            console.log(`Creating tmp directory at: ${tmpDir}`)
            await mkdir(tmpDir, { recursive: true })
        }
        
        // Save the audio file
        try {
            await writeFile(filePath, audioFile.data)
            console.log(`Successfully saved audio file to: ${filePath}`)
            
            // Transcribe the file directly
            const transcriptionResult = await transcribeAudioChunk(filePath)
            
            // Generate query chips based on transcription
            const queryChips = await generateQueryChips(transcriptionResult)
            
            return {
                success: true,
                message: 'Audio received and transcribed',
                fileName,
                transcription: transcriptionResult,
                queryChips: queryChips
            }
        } catch (writeError: any) {
            console.error('Error processing audio file:', {
                path: filePath,
                error: writeError.message,
                stack: writeError.stack
            })
            throw new Error(`Failed to process audio file: ${writeError.message}`)
        }
    } catch (error) {
        console.error('Error processing audio:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error processing audio'
        }
    }
})

// This function would integrate with your chosen transcription service
async function transcribeAudioChunk(audioFilePath: string): Promise<string> {
    try {
        console.log(`Attempting to transcribe file: ${audioFilePath}`)
        
        const openai = new OpenAI()
        
        // Create a read stream from the file
        const fileStream = createReadStream(audioFilePath);
        
        // Use the proper OpenAI SDK method for Node.js
        const transcription = await openai.audio.transcriptions.create({
            file: fileStream,
            model: "whisper-1",
        })
        
        // Debug the raw response
        console.log('Raw transcription:', JSON.stringify(transcription.text))
        
        // Process the response to ensure spaces
        let processedText = transcription.text
        
        // Add aggressive text processing here too
        processedText = processedText
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
            .replace(/([.,!?;:])/g, '$1 ')
            .replace(/\s+/g, ' ')
            .trim()
        
        console.log('Processed transcription:', processedText)
        
        // Return the processed text
        return processedText
    } catch (error: any) {
        console.error('Transcription error:', {
            path: audioFilePath,
            errorCode: error.status || 'unknown',
            errorMessage: error.message,
            errorDetails: error.response?.data || {},
            stack: error.stack
        })
        
        return `Error transcribing audio: ${error.message}`
    }
}

// Advanced query chip generation for financial consultants
async function generateQueryChips(transcription: string): Promise<Array<{text: string, type: string}>> {
    // If the transcription is empty or an error, return empty array
    if (!transcription || transcription.startsWith('Error')) {
        return [];
    }
    
    console.log('Generating query chips from:', transcription);
    
    try {
        // Use OpenAI to generate context-aware financial query chips
        const openai = new OpenAI();
        
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are an expert financial research assistant. Generate 3-5 useful, specific search queries 
                    that a financial consultant would find valuable when researching topics to discuss with clients.
                    
                    Each query should be:
                    1. Specific and actionable (e.g., "MSFT Q2 earnings forecast" instead of just "Microsoft")
                    2. Relevant to financial advisors and wealth management
                    3. Focused on topics like stock performance, market trends, investment strategies, or risk analysis
                    
                    For each query, also assign one of these categories:
                    - stock: For specific equity analysis
                    - macro: For macroeconomic trends
                    - sector: For industry sector analysis
                    - risk: For risk assessment queries
                    - strategy: For investment strategy queries
                    
                    Return JSON format only: 
                    [{"text": "Query text", "type": "category"}]`
                },
                {
                    role: "user",
                    content: `Generate financial research queries based on this client conversation: "${transcription}"`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 500
        });
        
        const result = JSON.parse(response.choices[0].message.content || "{}");
        
        if (Array.isArray(result.queries) && result.queries.length > 0) {
            console.log('AI-generated chips:', result.queries);
            return result.queries.slice(0, 5);
        }
        
        // Fallback to enhanced rule-based generation if AI fails
        return generateFallbackChips(transcription);
    } catch (error) {
        console.error('Error generating AI query chips:', error);
        // Fallback to enhanced rule-based generation
        return generateFallbackChips(transcription);
    }
}

// Enhanced fallback query chip generation
function generateFallbackChips(transcription: string): Array<{text: string, type: string}> {
    const chips = [];
    const text = transcription.toLowerCase();
    
    // Financial-specific patterns
    const stockPattern = /\b([A-Z]{1,5})\b\s?(stock|share|price|earnings|forecast|outlook|performance|analysis)/gi;
    const stockMatches = [...transcription.matchAll(stockPattern)];
    
    stockMatches.forEach(match => {
        if (match[1]) {
            chips.push({
                text: `${match[1]} ${match[2] || 'analysis'}`,
                type: 'stock'
            });
        }
    });
    
    // Sector-specific analysis
    const sectors = [
        { term: 'tech', type: 'sector', output: 'Technology sector analysis' },
        { term: 'healthcare', type: 'sector', output: 'Healthcare sector outlook' },
        { term: 'finance', type: 'sector', output: 'Financial sector performance' },
        { term: 'energy', type: 'sector', output: 'Energy market trends' },
        { term: 'consumer', type: 'sector', output: 'Consumer sector forecast' }
    ];
    
    sectors.forEach(({ term, type, output }) => {
        if (text.includes(term)) {
            chips.push({ text: output, type });
        }
    });
    
    // Economic indicators
    const indicators = [
        { term: 'inflation', type: 'macro', output: 'Inflation impact on portfolio' },
        { term: 'interest rate', type: 'macro', output: 'Interest rate outlook' },
        { term: 'recession', type: 'risk', output: 'Recession probability analysis' },
        { term: 'gdp', type: 'macro', output: 'GDP growth forecast' },
        { term: 'fed', type: 'macro', output: 'Federal Reserve policy impact' }
    ];
    
    indicators.forEach(({ term, type, output }) => {
        if (text.includes(term)) {
            chips.push({ text: output, type });
        }
    });
    
    // Investment strategies
    const strategies = [
        { term: 'dividend', type: 'strategy', output: 'High-yield dividend stocks' },
        { term: 'growth', type: 'strategy', output: 'Growth investment strategy' },
        { term: 'value', type: 'strategy', output: 'Value stock opportunities' },
        { term: 'etf', type: 'strategy', output: 'ETF investment options' },
        { term: 'portfolio', type: 'strategy', output: 'Portfolio diversification strategy' }
    ];
    
    strategies.forEach(({ term, type, output }) => {
        if (text.includes(term)) {
            chips.push({ text: output, type });
        }
    });
    
    // Add specific company analysis for well-known stocks
    const companies = [
        { term: 'microsoft', type: 'stock', output: 'MSFT growth drivers' },
        { term: 'apple', type: 'stock', output: 'AAPL revenue forecast' },
        { term: 'amazon', type: 'stock', output: 'AMZN market position' },
        { term: 'nvidia', type: 'stock', output: 'NVDA AI sector impact' },
        { term: 'google', type: 'stock', output: 'GOOGL advertising trends' }
    ];
    
    companies.forEach(({ term, type, output }) => {
        if (text.includes(term)) {
            chips.push({ text: output, type });
        }
    });
    
    // Add at least one default chip if none were generated
    if (chips.length === 0) {
        chips.push({
            text: 'Market performance overview',
            type: 'macro'
        });
    }
    
    // Limit to 5 chips with most relevant first
    console.log('Generated fallback chips:', chips.slice(0, 5));
    return chips.slice(0, 5);
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath)
        return true
    } catch {
        return false
    }
}

async function convertWebmToWav(webmPath: string, wavPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(webmPath)
      .outputOptions(['-ac 1', '-ar 16000'])
      .save(wavPath)
      .on('end', () => {
        console.log(`Successfully converted ${webmPath} to ${wavPath}`)
        resolve()
      })
      .on('error', (err: any) => {
        console.error(`Error converting file: ${err.message}`)
        reject(err)
      })
  })
}
