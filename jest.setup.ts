import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// jsdom doesn't expose these globally; next-auth (via jose/openid-client) needs them.
if (!global.TextEncoder) global.TextEncoder = TextEncoder as typeof global.TextEncoder
if (!global.TextDecoder) global.TextDecoder = TextDecoder as typeof global.TextDecoder
