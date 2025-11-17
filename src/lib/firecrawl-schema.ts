/**
 * JSON schema for Firecrawl extract() method
 * Defines the structure for extracting city data from Wikipedia
 */

export const cityEnrichmentSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'The official name of the city',
    },
    description: {
      type: 'string',
      description:
        'A comprehensive overview/introduction of the city (2-4 paragraphs)',
    },
    history: {
      type: 'string',
      description:
        'Historical background of the city, including major events and development',
    },
    geography: {
      type: 'string',
      description:
        'Geographic features, topography, location details, and physical characteristics',
    },
    climate: {
      type: 'string',
      description:
        'Climate information including weather patterns, seasons, and temperature ranges',
    },
    transportation: {
      type: 'string',
      description:
        'Transportation infrastructure including public transit, airports, rail, and major roads',
    },
    tourism: {
      type: 'object',
      properties: {
        overview: {
          type: 'string',
          description: 'General tourism information and visitor highlights',
        },
        landmarks: {
          type: 'array',
          description: 'Notable landmarks and monuments in the city',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the landmark',
              },
              description: {
                type: 'string',
                description:
                  'Brief description of the landmark (1-2 sentences)',
              },
            },
          },
        },
        museums: {
          type: 'array',
          description: 'Museums and cultural institutions',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the museum',
              },
              description: {
                type: 'string',
                description: 'Brief description of the museum (1-2 sentences)',
              },
            },
          },
        },
        attractions: {
          type: 'array',
          description: 'Tourist attractions and points of interest',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the attraction',
              },
              description: {
                type: 'string',
                description:
                  'Brief description of the attraction (1-2 sentences)',
              },
            },
          },
        },
      },
    }
  },
  required: ['name', 'description'],
}
