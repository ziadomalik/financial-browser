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
            const queryChips = generateQueryChips(transcriptionResult)
            
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

// Add a simple version of the generate function to guarantee at least some chips
function generateQueryChips(transcription: string): Array<{text: string, type: string}> {
    // If the transcription is empty or an error, return empty array
    if (!transcription || transcription.startsWith('Error')) {
        return [];
    }
    
    console.log('Generating query chips from:', transcription)
    
    // Always include at least one default chip for testing
    const chips = [{
        text: 'Finance Research',
        type: 'general'
    }];
    
    // Extract key terms from transcription
    const keywords = [
        { term: 'stock', type: 'general' },
        { term: 'market', type: 'general' },
        { term: 'tech', type: 'tech' },
        { term: 'volatile', type: 'volatile' },
        { term: 'crash', type: 'crash' },
        { term: 'microsoft', type: 'msft' },
        { term: 'apple', type: 'aapl' },
        { term: 'amazon', type: 'amzn' },
        { term: 'nvidia', type: 'nvidia' },
        { term: 'nasdaq', type: 'nasdaq' },
        { term: 'federal', type: 'administration' }
    ];
    
    // Find any keywords in the transcription
    const text = transcription.toLowerCase();
    keywords.forEach(({ term, type }) => {
        if (text.includes(term)) {
            // Find the word and a bit of context
            const words = text.split(' ');
            const index = words.findIndex(w => w.includes(term));
            if (index >= 0) {
                const start = Math.max(0, index - 1);
                const end = Math.min(words.length, index + 2);
                const phrase = words.slice(start, end).join(' ');
                
                // Capitalize first letter
                const formattedPhrase = phrase.charAt(0).toUpperCase() + phrase.slice(1);
                
                chips.push({
                    text: formattedPhrase,
                    type
                });
            }
        }
    });
    
    // Add stock symbols (uppercase 1-5 letter words)
    const symbolRegex = /\b[A-Z]{1,5}\b/g;
    const symbols = transcription.match(symbolRegex) || [];
    symbols.forEach(symbol => {
        chips.push({
            text: symbol,
            type: 'general'
        });
    });
    
    // Limit to 5 chips
    console.log('Generated chips:', chips.slice(0, 5))
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
