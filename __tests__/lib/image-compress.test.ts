import { computeTargetDimensions } from '@/lib/image-compress'

describe('computeTargetDimensions', () => {
  it('leaves an image within the max dimension unchanged', () => {
    expect(computeTargetDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('downscales a landscape image proportionally', () => {
    expect(computeTargetDimensions(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 })
  })

  it('downscales a portrait image proportionally', () => {
    expect(computeTargetDimensions(1600, 3200, 1600)).toEqual({ width: 800, height: 1600 })
  })

  it('treats an image exactly at the max dimension as unchanged', () => {
    expect(computeTargetDimensions(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 })
  })
})
