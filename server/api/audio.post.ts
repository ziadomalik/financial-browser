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
            
            return {
                success: true,
                message: 'Audio received and transcribed',
                fileName,
                transcription: transcriptionResult
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
