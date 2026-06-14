# MCP Image Recognition Plugin

Image recognition plugin for 0xray using AI vision capabilities.

## Features

- Image analysis and object identification
- Object detection with bounding boxes
- OCR text extraction from images
- Scene description generation

## Installation

```bash
# Copy to your plugins directory
cp -r examples/plugins/mcp-image-recognition .strray/plugins/

# Or use the CLI
npx 0xray plugin install mcp-image-recognition
```

## Usage

Once installed, the plugin automatically registers MCP servers and provides:

- `recognize-image` - Analyze images and identify objects
- `detect-objects` - Locate objects in images
- `read-text` - Extract text from images (OCR)
- `describe-scene` - Generate natural language descriptions

## Configuration

The plugin uses the following configuration:

```yaml
# plugin.yaml
runtime:
  command: npx
  args:
    - "-y"
    - "@modelcontextprotocol/server-image-recognition"
  timeout: 30000

resourceLimits:
  maxMemoryMB: 512
  maxCpuPercent: 80
  maxProcessTime: 300000
```

## Security

- Only `npx` and `node` commands allowed
- Sensitive environment variables blocked
- File access restricted to `/tmp` and `/var/tmp`

## License

MIT
