import { assertPublicHttpsUrl } from '@/lib/fetch-guard'

describe('assertPublicHttpsUrl', () => {
  it('rejects non-https URLs', async () => {
    await expect(assertPublicHttpsUrl('http://example.com/a.jpg')).rejects.toThrow('https')
  })
  it('rejects malformed URLs', async () => {
    await expect(assertPublicHttpsUrl('not a url')).rejects.toThrow('Ongeldige URL')
  })
  it('rejects a loopback address by hostname', async () => {
    await expect(assertPublicHttpsUrl('https://127.0.0.1/a.jpg')).rejects.toThrow('niet-toegestaan')
  })
  it('rejects a private 10.x address by hostname', async () => {
    await expect(assertPublicHttpsUrl('https://10.1.2.3/a.jpg')).rejects.toThrow('niet-toegestaan')
  })
  it('rejects a 169.254 link-local address (cloud metadata range)', async () => {
    await expect(assertPublicHttpsUrl('https://169.254.169.254/latest/meta-data')).rejects.toThrow('niet-toegestaan')
  })
})
