# Melies CLI

AI filmmaking from the command line. 148 AI actors, 220+ visual styles, 50+ models. Generate images, videos, posters, and YouTube thumbnails without prompt engineering.

Built for AI agents, filmmakers, and content creators.

## Install

```bash
npm install -g melies
```

## Setup

Sign up at [melies.co](https://melies.co), then authenticate:

```bash
# Browser login (opens melies.co, authenticates automatically)
melies login

# Or use an API token (for CI/agents)
melies login --token YOUR_TOKEN

# Or set as environment variable
export MELIES_TOKEN=your_token
```

Generate an API token at [melies.co](https://melies.co) > Settings > API.

## Quick Start

```bash
# Generate an image with an AI actor
melies image "portrait in a café" --actor mei --art-style ghibli --lighting golden --sync

# Generate a movie poster
melies poster "Midnight Protocol" --actor dante --actor elena --style anime --sync

# Image to video pipeline in one command
melies pipeline "tracking shot through neon Tokyo" --actor hailey --best --sync

# Generate 4 YouTube thumbnails
melies thumbnail "shocked face reacting to AI news" --actor aria -n 4 --sync

# Preview cost before generating
melies image "sunset" --quality --actor hailey --dry-run
```

## Smart Model Selection

Use quality presets instead of model names:

| Flag | Image Model | Video Model |
|------|------------|-------------|
| `--fast` (default) | flux-schnell (2cr) | kling-v2 (30cr) |
| `--quality` | flux-pro (8cr) | kling-v3-pro (100cr) |
| `--best` | seedream-3 (6cr) | veo-3.1 (400cr) |

Override with `-m <model>`. Run `melies models` to list all available models.

## AI Actors

148 built-in characters with identity consistency across every generation.

```bash
melies actors                              # List all actors
melies actors --gender female --age 20s    # Filter
melies actors search "asian"               # Search

# Use in any command
melies image "walking in park" --actor hailey --sync

# Create a custom actor from any face
melies ref create "jean-pierre" -i photo-of-jean-pierre.jpg
```

## Visual Style Flags

Add to any `image`, `video`, `thumbnail`, or `pipeline` command:

| Flag | Examples |
|------|---------|
| `--art-style` | ghibli, anime, noir, oil, watercolor, concept |
| `--lighting` | golden, neon, noir, rembrandt, backlit, soft |
| `--camera` | eye-level, high, low, overhead, dutch |
| `--shot` | close-up, medium, cowboy, wide, full-body |
| `--expression` | smile, surprised, serious, villain-smirk |
| `--mood` | romantic, mysterious, tense, ethereal, epic |
| `--color-grade` | teal-orange, mono, warm, cool, filmic |
| `--era` | victorian, 1920s, 1980s, modern, dystopian |

Flags combine freely:

```bash
melies image "woman in a café" --lighting golden --mood romantic --art-style ghibli --sync
```

## Commands

### Image Generation

```bash
melies image "sunset over mountains" --quality --sync
melies image "portrait" --actor mei --lighting golden -a 16:9 --sync
melies image "cyberpunk city" --art-style neo-noir -n 4 --sync
```

### Video Generation

```bash
melies video "drone shot over forest" --quality --sync
melies video "walking down the street" --actor mei --camera low --sync
melies video "zoom into product" -i https://example.com/product.jpg --sync
```

### Image to Video Pipeline

```bash
melies pipeline "warrior on a cliff at sunset" --actor mei --best --sync
```

### Movie Posters

```bash
melies poster "Neon Shadows" --style noir --actor james --sync
melies poster "Blood Moon" -l "A detective under a blood moon" -g horror --sync
```

### YouTube Thumbnails

```bash
melies thumbnail "shocked face reacting to AI news" --actor aria -n 4 --sync
```

### Upscale and Background Removal

```bash
melies upscale --imageUrl photo.webp --sync
melies remove-bg --imageUrl photo.webp --sync
```

### Utility Commands

```bash
melies credits                    # Check balance
melies models                     # List all models
melies models -t image            # Image models only
melies status <assetId>           # Check generation status
melies assets                     # List your assets
melies styles search "cyberpunk"  # Browse style references
```

## For AI Agents

This CLI is designed for AI agents. Structured JSON output, predictable flags, and a SKILL.md file that any agent can read.

See [SKILL.md](./SKILL.md) for the full agent reference.

## Quick Reference

```bash
melies image "prompt" --actor <name> --art-style <style> --quality --sync
melies video "prompt" --actor <name> --lighting <light> --best --sync
melies poster "title" --style <preset> -g <genre> --sync
melies thumbnail "prompt" --actor <name> -n 4 --sync
melies pipeline "prompt" --actor <name> --best --sync
melies upscale --imageUrl <url> --sync
melies remove-bg --imageUrl <url> --sync
melies actors search "query"
melies styles search "keyword"
melies credits
melies models
```

## Links

- [Melies Agent Page](https://melies.co/agent)
- [Documentation](https://melies.co/docs)
- [agentskill.sh](https://agentskill.sh/@melies-co/melies-cli)
- [ClawHub](https://clawhub.ai/romainsimon/melies)
