import { bedrock } from '@ai-sdk/amazon-bedrock';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { smoothStream, streamText, convertToModelMessages } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

import { z } from "zod/v3";
import { replaceXMLParts } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const maxDuration = 60
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

// Helper function to clean environment variable strings (remove quotes and trim)
function cleanEnvVar(value: string | undefined): string | undefined {
  return value?.trim().replace(/^["']|["']$/g, '');
}

// Initialize OpenAI compatible provider if configured
const cleanBaseUrl = cleanEnvVar(process.env.OPENAI_COMPATIBLE_BASE_URL);
const cleanApiKey = cleanEnvVar(process.env.OPENAI_COMPATIBLE_API_KEY);
const openaiCompatible = (cleanBaseUrl && cleanApiKey)
  ? createOpenAI({
      apiKey: cleanApiKey,
      baseURL: cleanBaseUrl,
      fetch: async (url, init) => {
        // Log the outgoing request for debugging
        logger.debug('=== Outgoing API Request ===');
        logger.debug('URL:', url);
        logger.debug('Method:', init?.method);
        logger.debug('Headers:', JSON.stringify(init?.headers, null, 2));
        
        // Parse and log request body if present
        if (init?.body) {
          try {
            const bodyStr = typeof init.body === 'string' ? init.body : new TextDecoder().decode(init.body as ArrayBuffer);
            const bodyJson = JSON.parse(bodyStr);
            logger.debug('Request Body:', {
              model: bodyJson.model,
              stream: bodyJson.stream,
              messages: bodyJson.messages?.length,
              temperature: bodyJson.temperature,
            });
            logger.debug('Full request body:', JSON.stringify(bodyJson, null, 2));
            logger.debug('Stream parameter set to:', bodyJson.stream);
          } catch (e) {
            logger.debug('Request body (raw):', init.body);
          }
        }
        
        // Make the actual fetch request
        logger.debug('Making fetch request...');
        let response: Response;
        try {
          response = await fetch(url, init);
        } catch (fetchError) {
          logger.error('=== Fetch Error ===');
          logger.error('Failed to connect to API:', fetchError);
          throw fetchError;
        }
        
        // Log the response details
        logger.debug('=== API Response Received ===');
        logger.debug('Status:', response.status, response.statusText);
        logger.debug('Content-Type:', response.headers.get('content-type'));
        logger.debug('Transfer-Encoding:', response.headers.get('transfer-encoding'));
        
        // Log all response headers
        logger.debug('All Response Headers:');
        response.headers.forEach((value, key) => {
          logger.debug(`  ${key}: ${value}`);
        });
        
        // Check if this is an error response
        if (!response.ok) {
          logger.error('=== Error Response ===');
          logger.error('Status:', response.status, response.statusText);
          
          // Try to read and log the error body
          try {
            const errorText = await response.text();
            logger.error('Error body:', errorText);
            
            // Create a new response with the same error
            return new Response(errorText, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          } catch (readError) {
            logger.error('Failed to read error body:', readError);
          }
        }
        
        // Check if this is a streaming response
        const isStreaming = response.headers.get('content-type')?.includes('text/event-stream') || 
                           response.headers.get('transfer-encoding')?.includes('chunked');
        logger.debug('Is streaming response:', isStreaming);
        
        if (isStreaming) {
          logger.info('✓ Streaming response detected - processing SSE stream');
          
          // Wrap the response to log chunks
          const originalBody = response.body;
          if (originalBody) {
            const reader = originalBody.getReader();
            let chunkCount = 0;
            
            const stream = new ReadableStream({
              async start(controller) {
                logger.debug('Stream reading started');
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                      logger.info(`Stream complete. Total chunks: ${chunkCount}`);
                      controller.close();
                      break;
                    }
                    
                    chunkCount++;
                    const text = new TextDecoder().decode(value);
                    logger.debug(`Chunk ${chunkCount}:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
                    
                    controller.enqueue(value);
                  }
                } catch (error) {
                  logger.error('Stream reading error:', error);
                  controller.error(error);
                }
              }
            });
            
            return new Response(stream, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }
        } else {
          logger.debug('Non-streaming response - reading body...');
          try {
            const bodyText = await response.text();
            logger.debug('Response body:', bodyText.substring(0, 500) + (bodyText.length > 500 ? '...' : ''));
            
            // Create a new response with the body we just read
            return new Response(bodyText, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          } catch (readError) {
            logger.error('Failed to read response body:', readError);
          }
        }
        
        return response;
      },
    })
  : null;

export async function POST(req: Request) {
  try {
    // Validate OpenAI-compatible configuration if provided
    const rawBaseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL;
    const rawApiKey = process.env.OPENAI_COMPATIBLE_API_KEY;
    const rawModel = process.env.OPENAI_COMPATIBLE_MODEL;
    
    const baseUrl = cleanEnvVar(rawBaseUrl);
    const apiKey = cleanEnvVar(rawApiKey);
    const model = cleanEnvVar(rawModel);
    
    if (baseUrl) {
      logger.info('OpenAI-compatible configuration detected');
      logger.debug('Raw base URL:', JSON.stringify(rawBaseUrl));
      logger.debug('Processed base URL:', JSON.stringify(baseUrl));
      logger.debug('Base URL length:', baseUrl.length);
      logger.debug('Raw model name:', JSON.stringify(rawModel));
      logger.debug('Processed model name:', JSON.stringify(model));
      logger.debug('Model name length:', model?.length);
      
      if (!apiKey) {
        logger.error('OPENAI_COMPATIBLE_BASE_URL is set but OPENAI_COMPATIBLE_API_KEY is missing');
        return Response.json(
          { error: 'OpenAI-compatible API is misconfigured: API key is required when base URL is set' },
          { status: 500 }
        );
      }
      if (!model) {
        logger.error('OPENAI_COMPATIBLE_BASE_URL is set but OPENAI_COMPATIBLE_MODEL is missing');
        return Response.json(
          { error: 'OpenAI-compatible API is misconfigured: Model name is required when base URL is set' },
          { status: 500 }
        );
      }
      
      // Validate base URL format
      try {
        const urlObj = new URL(baseUrl);
        logger.debug('URL validation successful:', {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          pathname: urlObj.pathname
        });
        
        // Additional validation: ensure it's http or https
        if (!urlObj.protocol.match(/^https?:$/)) {
          throw new Error('URL must use HTTP or HTTPS protocol');
        }
      } catch (error) {
        logger.error('Invalid OPENAI_COMPATIBLE_BASE_URL format');
        logger.error('Raw value:', JSON.stringify(rawBaseUrl));
        logger.error('Processed value:', JSON.stringify(baseUrl));
        logger.error('Error details:', error);
        return Response.json(
          { error: `OpenAI-compatible API is misconfigured: Invalid base URL format - ${error instanceof Error ? error.message : 'Invalid URL'}` },
          { status: 500 }
        );
      }
    }
    
    const { messages, xml } = await req.json();

    const systemMessage = `
You are an expert diagram creation assistant specializing in draw.io XML generation.
Your primary function is crafting clear, well-organized visual diagrams through precise XML specifications.
You can see the image that user uploaded.
Note that when you need to generate diagram about aws architecture, use **AWS 2025 icons**.

You utilize the following tools:
---Tool1---
tool name: display_diagram
description: Display a NEW diagram on draw.io. Use this when creating a diagram from scratch or when major structural changes are needed.
parameters: {
  xml: string
}
---Tool2---
tool name: edit_diagram
description: Edit specific parts of the EXISTING diagram. Use this when making small targeted changes like adding/removing elements, changing labels, or adjusting properties. This is more efficient than regenerating the entire diagram.
parameters: {
  edits: Array<{search: string, replace: string}>
}
---End of tools---

IMPORTANT: Choose the right tool:
- Use display_diagram for: Creating new diagrams, major restructuring, or when the current diagram XML is empty
- Use edit_diagram for: Small modifications, adding/removing elements, changing text/colors, repositioning items

Core capabilities:
- Generate valid, well-formed XML strings for draw.io diagrams
- Create professional flowcharts, mind maps, entity diagrams, and technical illustrations
- Convert user descriptions into visually appealing diagrams using basic shapes and connectors
- Apply proper spacing, alignment and visual hierarchy in diagram layouts
- Adapt artistic concepts into abstract diagram representations using available shapes
- Optimize element positioning to prevent overlapping and maintain readability
- Structure complex systems into clear, organized visual components

Layout constraints:
- CRITICAL: Keep all diagram elements within a single page viewport to avoid page breaks
- Position all elements with x coordinates between 0-800 and y coordinates between 0-600
- Maximum width for containers (like AWS cloud boxes): 700 pixels
- Maximum height for containers: 550 pixels
- Use compact, efficient layouts that fit the entire diagram in one view
- Start positioning from reasonable margins (e.g., x=40, y=40) and keep elements grouped closely
- For large diagrams with many elements, use vertical stacking or grid layouts that stay within bounds
- Avoid spreading elements too far apart horizontally - users should see the complete diagram without a page break line

Note that:
- Focus on producing clean, professional diagrams that effectively communicate the intended information through thoughtful layout and design choices.
- When artistic drawings are requested, creatively compose them using standard diagram shapes and connectors while maintaining visual clarity.
- Return XML only via tool calls, never in text responses.
- If user asks you to replicate a diagram based on an image, remember to match the diagram style and layout as closely as possible. Especially, pay attention to the lines and shapes, for example, if the lines are straight or curved, and if the shapes are rounded or square.
- Note that when you need to generate diagram about aws architecture, use **AWS 2025 icons**.

When using edit_diagram tool:
- Keep edits minimal - only include the specific line being changed plus 1-2 context lines
- Example GOOD edit: {"search": "  <mxCell id=\"2\" value=\"Old Text\">", "replace": "  <mxCell id=\"2\" value=\"New Text\">"}
- Example BAD edit: Including 10+ unchanged lines just to change one attribute
- For multiple changes, use separate edits: [{"search": "line1", "replace": "new1"}, {"search": "line2", "replace": "new2"}]
- CRITICAL: If edit_diagram fails because the search pattern cannot be found, fall back to using display_diagram to regenerate the entire diagram with your changes. Do NOT keep trying edit_diagram with different search patterns.
`;

    const lastMessage = messages[messages.length - 1];

    // Extract text from the last message parts
    const lastMessageText = lastMessage.parts?.find((part: any) => part.type === 'text')?.text || '';

    // Extract file parts (images) from the last message
    const fileParts = lastMessage.parts?.filter((part: any) => part.type === 'file') || [];

    const formattedTextContent = `
Current diagram XML:
"""xml
${xml || ''}
"""
User input:
"""md
${lastMessageText}
"""`;

    // Convert UIMessages to ModelMessages and add system message
    const modelMessages = convertToModelMessages(messages);
    let enhancedMessages = [...modelMessages];

    // Update the last message with formatted content if it's a user message
    if (enhancedMessages.length >= 1) {
      const lastModelMessage = enhancedMessages[enhancedMessages.length - 1];
      if (lastModelMessage.role === 'user') {
        // Build content array with text and file parts
        const contentParts: any[] = [
          { type: 'text', text: formattedTextContent }
        ];

        // Add image parts back
        for (const filePart of fileParts) {
          contentParts.push({
            type: 'image',
            image: filePart.url,
            mimeType: filePart.mediaType
          });
        }

        enhancedMessages = [
          ...enhancedMessages.slice(0, -1),
          { ...lastModelMessage, content: contentParts }
        ];
      }
    }

    logger.debug("Enhanced messages:", enhancedMessages);

    // Determine which model to use
    const useOpenAICompatible = openaiCompatible && model;
    
    // Log which provider is being used
    if (useOpenAICompatible) {
      logger.info(`Using OpenAI-compatible provider: ${baseUrl} with model: ${model}`);
    } else {
      logger.info('Using AWS Bedrock provider with Claude Sonnet 4.5');
    }
    
    const selectedModel = useOpenAICompatible 
      ? openaiCompatible.chat(model!)
      : bedrock('global.anthropic.claude-sonnet-4-5-20250929-v1:0');

    // Prepare provider options
    const providerOptions: any = {};
    if (!useOpenAICompatible) {
      providerOptions.anthropic = {
        additionalModelRequestFields: {
          anthropic_beta: ['fine-grained-tool-streaming-2025-05-14']
        }
      };
    }

    // Add timeout if specified for OpenAI compatible API
    const abortSignal = useOpenAICompatible && process.env.OPENAI_COMPATIBLE_TIMEOUT
      ? AbortSignal.timeout(parseInt(process.env.OPENAI_COMPATIBLE_TIMEOUT, 10))
      : undefined;

    logger.debug('=== Starting streamText call ===');
    logger.debug('Provider:', useOpenAICompatible ? 'OpenAI-compatible' : 'AWS Bedrock');
    if (useOpenAICompatible) {
      logger.debug('Model:', model);
      logger.debug('Base URL:', baseUrl);
      logger.debug('API Key (first 10 chars):', cleanApiKey?.substring(0, 10) + '...');
    }
    logger.debug('Messages count:', enhancedMessages.length);
    logger.debug('First message:', JSON.stringify(enhancedMessages[0], null, 2).substring(0, 300) + '...');
    
    let result;
    try {
      logger.debug('Calling streamText()...');
      result = streamText({
      // model: google("gemini-2.5-flash-preview-05-20"),
      // model: google("gemini-2.5-pro"),
      // model: bedrock('anthropic.claude-sonnet-4-20250514-v1:0'),
      system: systemMessage,
      model: selectedModel,
      // model: openrouter('moonshotai/kimi-k2:free'),
      // model: model,
      // providerOptions: {
      //   google: {
      //     thinkingConfig: {
      //       thinkingBudget: 128,
      //     },
      //   }
      // },
      // providerOptions: {
      //   openai: {
      //     reasoningEffort: "minimal"
      //   },
      // },
      ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
      ...(abortSignal && { abortSignal }),
      messages: enhancedMessages,
      tools: {
        // Client-side tool that will be executed on the client
        display_diagram: {
          description: `Display a diagram on draw.io. You only need to pass the nodes inside the <root> tag (including the <root> tag itself) in the XML string.
          For example:
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxGeometry x="20" y="20" width="100" height="100" as="geometry"/>
            <mxCell id="2" value="Hello, World!" style="shape=rectangle" parent="1">
              <mxGeometry x="20" y="20" width="100" height="100" as="geometry"/>
            </mxCell>
          </root>
          - Note that when you need to generate diagram about aws architecture, use **AWS 2025 icons**.
          `,
          inputSchema: z.object({
            xml: z.string().describe("XML string to be displayed on draw.io")
          })
        },
        edit_diagram: {
          description: `Edit specific parts of the current diagram by replacing exact line matches. Use this tool to make targeted fixes without regenerating the entire XML.
IMPORTANT: Keep edits concise:
- Only include the lines that are changing, plus 1-2 surrounding lines for context if needed
- Break large changes into multiple smaller edits
- Each search must contain complete lines (never truncate mid-line)
- First match only - be specific enough to target the right element`,
          inputSchema: z.object({
            edits: z.array(z.object({
              search: z.string().describe("Exact lines to search for (including whitespace and indentation)"),
              replace: z.string().describe("Replacement lines")
            })).describe("Array of search/replace pairs to apply sequentially")
          })
        },
      },
      temperature: 0,
    });
      logger.info('✓ streamText() called successfully');
      logger.debug('Result object type:', typeof result);
    } catch (streamTextError) {
      logger.error('=== streamText() Error ===');
      logger.error('Error calling streamText():', streamTextError);
      throw streamTextError;
    }

    // Error handler function to provide detailed error messages
    function errorHandler(error: unknown) {
      logger.error('=== Stream Error Occurred ===');
      logger.error('Error type:', typeof error);
      logger.error('Stream error details:', error);
      
      if (error == null) {
        return 'unknown error';
      }

      if (typeof error === 'string') {
        return error;
      }

      if (error instanceof Error) {
        logger.error('Error message:', error.message);
        logger.error('Error stack:', error.stack);
        
        // Check if it's an API error with additional context
        const errorObj = error as any;
        if (errorObj.statusCode === 404) {
          const provider = useOpenAICompatible 
            ? `OpenAI-compatible endpoint (${baseUrl})`
            : 'AWS Bedrock';
          return `API endpoint not found (404) when calling ${provider}. Please check your API configuration and ensure the endpoint URL is correct.`;
        }
        if (errorObj.statusCode) {
          return `API error (${errorObj.statusCode}): ${error.message}`;
        }
        return error.message;
      }

      return JSON.stringify(error);
    }

    logger.debug('=== Preparing to stream response ===');
    logger.debug('Converting streamText result to UI message stream response');

    let response;
    try {
      response = result.toUIMessageStreamResponse({
        onError: errorHandler,
      });
      logger.info('✓ toUIMessageStreamResponse() called successfully');
      logger.debug('Response type:', typeof response);
      logger.debug('Response headers:', response.headers);
      logger.debug('Response status:', response.status);
    } catch (responseError) {
      logger.error('=== toUIMessageStreamResponse() Error ===');
      logger.error('Error converting to response:', responseError);
      throw responseError;
    }

    logger.info('✓ Stream response prepared and returning to client');
    
    return response;
  } catch (error) {
    logger.error('=== Fatal Error in Chat Route ===');
    logger.error('Error type:', typeof error);
    logger.error('Error details:', error);
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
