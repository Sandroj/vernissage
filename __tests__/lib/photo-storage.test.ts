/**
 * @jest-environment node
 */
const mockSend = jest.fn()
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn((input) => ({ input })),
  DeleteObjectCommand: jest.fn((input) => ({ input })),
  GetObjectCommand: jest.fn((input) => ({ input })),
}))
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/photo.jpg'),
}))
const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('optimized-bytes'))
jest.mock('sharp', () => jest.fn(() => ({
  rotate: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: mockToBuffer,
})))

import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { storePhoto, signedPhotoUrl, deletePhoto } from '@/lib/photo-storage'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  jest.clearAllMocks()
  process.env = {
    ...ORIGINAL_ENV,
    R2_ACCOUNT_ID: 'acc',
    R2_ACCESS_KEY: 'key',
    R2_SECRET_KEY: 'secret',
    R2_PRIVATE_BUCKET: 'private-bucket',
  }
})
afterAll(() => { process.env = ORIGINAL_ENV })

describe('storePhoto', () => {
  it('uploads a decoded data-URL and returns a photos/<userId>/<uuid>.jpg key', async () => {
    mockSend.mockResolvedValue({})
    const key = await storePhoto('user-1', 'data:image/jpeg;base64,aGVsbG8=')
    expect(key).toMatch(/^photos\/user-1\/[0-9a-f-]+\.jpg$/)
    expect(sharp).toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('rejects a payload over 15MB without calling sharp or uploading', async () => {
    const big = 'data:image/jpeg;base64,' + Buffer.alloc(16 * 1024 * 1024).toString('base64')
    await expect(storePhoto('user-1', big)).rejects.toThrow()
    expect(sharp).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('rejects an empty/undecodable payload', async () => {
    await expect(storePhoto('user-1', 'data:image/jpeg;base64,')).rejects.toThrow()
  })
})

describe('signedPhotoUrl', () => {
  it('returns a presigned URL for a real key', async () => {
    const url = await signedPhotoUrl('photos/user-1/abc.jpg')
    expect(url).toBe('https://signed.example/photo.jpg')
    expect(getSignedUrl).toHaveBeenCalledTimes(1)
  })

  it('passes a legacy data: value through unchanged, no signing attempted', async () => {
    const legacy = 'data:image/jpeg;base64,aGVsbG8='
    const url = await signedPhotoUrl(legacy)
    expect(url).toBe(legacy)
    expect(getSignedUrl).not.toHaveBeenCalled()
  })
})

describe('deletePhoto', () => {
  it('deletes a real key', async () => {
    mockSend.mockResolvedValue({})
    await deletePhoto('photos/user-1/abc.jpg')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('no-ops for a legacy data: value', async () => {
    await deletePhoto('data:image/jpeg;base64,aGVsbG8=')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('swallows an R2 delete failure instead of throwing', async () => {
    mockSend.mockRejectedValue(new Error('network down'))
    await expect(deletePhoto('photos/user-1/abc.jpg')).resolves.toBeUndefined()
  })
})
