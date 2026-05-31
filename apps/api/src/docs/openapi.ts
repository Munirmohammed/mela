/**
 * Hand-authored OpenAPI 3 contract for the Mela API. Kept concise and focused on
 * the endpoints the four clients consume; expand as the surface grows.
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Mela API',
    version: '2.0.0',
    description: 'B2B group-buying, delivery & embedded finance for Ethiopian kiosks.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: { success: { type: 'boolean' }, data: {} },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a shop (sends OTP)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'ownerName', 'shopName', 'zone', 'address'],
                properties: {
                  phone: { type: 'string' },
                  ownerName: { type: 'string' },
                  shopName: { type: 'string' },
                  zone: { type: 'string' },
                  address: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'OTP sent' } },
      },
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify OTP and receive tokens',
        security: [],
        responses: { '200': { description: 'Access + refresh tokens' } },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List catalog',
        security: [],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Products' } },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List my orders',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Orders' } },
      },
      post: {
        tags: ['Orders'],
        summary: 'Place an order (supports Idempotency-Key)',
        parameters: [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }],
        responses: { '201': { description: 'Order created' } },
      },
    },
    '/payments/initiate': {
      post: {
        tags: ['Payments'],
        summary: 'Initiate a payment (Chapa or wallet). Requires Idempotency-Key.',
        parameters: [
          { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string' } },
        ],
        responses: { '201': { description: 'Payment + optional checkout URL' } },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Chapa webhook (signature-verified)',
        security: [],
        responses: { '200': { description: 'Processed' }, '401': { description: 'Bad signature' } },
      },
    },
    '/payments/wallet': {
      get: { tags: ['Payments'], summary: 'Wallet balance', responses: { '200': { description: 'Balance' } } },
    },
    '/delivery/track/{orderId}': {
      get: {
        tags: ['Delivery'],
        summary: 'Live tracking for an order (status, driver location, ETA)',
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Tracking info' } },
      },
    },
    '/delivery/batch': {
      get: { tags: ['Delivery'], summary: "Driver's active batch + stops", responses: { '200': { description: 'Batch' } } },
    },
    '/shops/me': {
      get: { tags: ['Shops'], summary: 'My shop profile + stats', responses: { '200': { description: 'Shop' } } },
      put: { tags: ['Shops'], summary: 'Update my shop profile', responses: { '200': { description: 'Shop' } } },
    },
    '/credit/score': {
      get: { tags: ['Credit'], summary: 'My credit score, limit & loans', responses: { '200': { description: 'Credit' } } },
    },
  },
} as const
