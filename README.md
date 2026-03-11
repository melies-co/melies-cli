# Melies CLI

Generate movie posters, images, and videos with AI from the command line. Access 50+ models including Flux, Kling, Veo, and more.

Built for filmmakers, content creators, and AI agents.

## Install

```bash
npm install -g melies
```

## Setup

```bash
melies login -e your@email.com -p yourpassword
```

Sign up at [melies.co](https://melies.co) if you don't have an account.

## Usage

### Generate Images

```bash
melies image "A sunset over mountains" -m flux-dev --sync
melies image "YouTube thumbnail" -m flux-pro -a 16:9 --sync
```

### Generate Videos

```bash
melies video "A drone shot flying over a forest" -m kling-v2 --sync
melies video "Zoom into product" -m kling-v2 -i https://example.com/image.jpg --sync
```

### Generate Movie Posters

```bash
melies poster "The Last Horizon" -g sci-fi --sync
melies poster "Blood Moon" -l "A detective under a blood moon" -g horror --sync
```

### Other Commands

```bash
melies credits                         # Check balance
melies models -t image                 # List image models
melies models -t video                 # List video models
melies status <assetId>                # Check generation status
melies assets                          # List your assets
```

## For AI Agents

This CLI is designed for use by AI agents. Short commands reduce token usage compared to raw API calls.

See [SKILL.md](./SKILL.md) for the full agent reference.

## Quick Reference

```bash
melies login -e email -p pass          # Log in
melies credits                         # Check balance
melies models -t image                 # List image models
melies image "prompt" -m model --sync  # Generate image
melies video "prompt" -m model --sync  # Generate video
melies poster "title" -g genre --sync  # Generate poster
melies status <assetId>                # Check job status
melies assets                          # List your assets
```

## Links

- [melies.co](https://melies.co)
- [Agent Skills Directory](https://agentskill.sh)
