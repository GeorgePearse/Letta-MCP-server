# Authentication

The Letta MCP Server supports two authentication methods depending on your Letta deployment.

## Authentication Methods

### Letta Cloud (LETTA_API_KEY)

For connecting to [Letta Cloud](https://api.letta.com):

```bash
export LETTA_API_KEY="sk-let-xxxxx"
```

**Header format:**
```
Authorization: Bearer {LETTA_API_KEY}
```

**When to use:**
- Using Letta's hosted cloud service
- API key obtained from Letta Cloud dashboard

### Self-Hosted (LETTA_PASSWORD)

For connecting to a self-hosted Letta server:

```bash
export LETTA_BASE_URL="http://localhost:8283"
export LETTA_PASSWORD="your-password"
```

**Header format:**
```
X-BARE-PASSWORD: password {LETTA_PASSWORD}
Authorization: Bearer {LETTA_PASSWORD}
```

**When to use:**
- Running Letta locally
- Self-hosted Letta deployment
- Development and testing

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LETTA_BASE_URL` | Self-hosted only | Base URL of your Letta server (e.g., `http://localhost:8283`) |
| `LETTA_API_KEY` | Cloud only | API key for Letta Cloud authentication |
| `LETTA_PASSWORD` | Self-hosted only | Password for self-hosted authentication |

## Configuration Examples

### .env file for Letta Cloud

```env
LETTA_API_KEY=sk-let-xxxxx
```

### .env file for Self-Hosted

```env
LETTA_BASE_URL=http://localhost:8283
LETTA_PASSWORD=your-secure-password
```

### .env file for Self-Hosted with /v1 suffix

Note: The server automatically appends `/v1` to the base URL, so do not include it:

```env
# Correct
LETTA_BASE_URL=http://localhost:8283

# Incorrect (will result in /v1/v1)
LETTA_BASE_URL=http://localhost:8283/v1
```

## Authentication Priority

The CLI tools check authentication in this order:

1. `LETTA_API_KEY` - If set, use Bearer token authentication
2. `LETTA_PASSWORD` - If set, use password authentication
3. Error - If neither is set, exit with error

## Security Best Practices

1. **Never commit credentials** - Add `.env` to `.gitignore`
2. **Use environment variables** - Don't hardcode credentials in code
3. **Rotate keys regularly** - Especially for production deployments
4. **Use secrets management** - In production, use a secrets manager
5. **Limit key permissions** - Use keys with minimal required permissions

## Troubleshooting

### 401 Unauthorized

```
API Error: 401 - Unauthorized
```

**Causes:**
- Invalid or expired API key
- Wrong authentication method for your deployment
- Missing environment variables

**Solutions:**
- Verify your API key is correct
- Check if you're using Cloud vs Self-hosted authentication
- Ensure environment variables are loaded

### Connection Refused

```
Error: connect ECONNREFUSED
```

**Causes:**
- Letta server not running
- Wrong `LETTA_BASE_URL`
- Firewall blocking connection

**Solutions:**
- Start your Letta server
- Verify the URL is correct
- Check network connectivity

### Missing Environment Variable

```
Error: LETTA_BASE_URL environment variable is required
```

**Solutions:**
- Create a `.env` file with required variables
- Export variables in your shell
- For Letta Cloud, only `LETTA_API_KEY` is needed (URL defaults to `https://api.letta.com`)

## Source Files

- `src/core/server.js` - Server authentication implementation
- `src/cli/list-memories.js` - CLI authentication handling
