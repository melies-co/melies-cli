---
name: melies
description: "AI filmmaking CLI with 148 built-in actors, 98 visual styles, and smart model selection. Generate images, videos, posters, and thumbnails without prompt engineering. Text-to-image, text-to-video, image-to-video pipeline, upscaling, background removal. Use --actor, --art-style, --lighting, --mood flags instead of writing prompts."
version: 2.0.0
user-invocable: false
allowed-tools: Bash(melies:*)
homepage: https://melies.co
metadata:
  openclaw:
    emoji: "🎬"
    requires:
      env:
        - MELIES_TOKEN
        - MELIES_API_URL
      config:
        - ~/.melies/config.json
      bins:
        - melies
    primaryEnv: MELIES_TOKEN
    install:
      - kind: node
        package: melies
        bins: [melies]
---

# Melies CLI

AI filmmaking from the command line. 148 AI actors, 98 visual styles, 50+ models. Generate images, videos, posters, and YouTube thumbnails without prompt engineering.

## Install

```bash
npm install -g melies
```

## Authentication

1. Go to [melies.co/settings](https://melies.co/settings) > User
2. Copy your API token
3. Run:

```bash
melies login --token YOUR_TOKEN
```

Or set as environment variable:

```bash
export MELIES_TOKEN=your_jwt_token
```

## Quick Start

```bash
# Generate an image with an AI actor, Ghibli style, and golden lighting
melies image "portrait in a café" --actor mei --art-style ghibli --lighting golden --sync

# Generate a movie poster with a preset style
melies poster "Neon Shadows" --style noir --actor james --sync

# Image → video pipeline in one command
melies pipeline "warrior on a cliff at sunset" --actor mei --best --sync

# Generate 4 YouTube thumbnails
melies thumbnail "shocked face reacting to AI news" --actor aria -n 4 --sync

# Preview cost before generating
melies image "sunset" --quality --actor hailey --dry-run
```

## Smart Model Selection

No model names needed. Use quality presets:

| Flag | Image Model | Video Model |
|------|------------|-------------|
| (default / `--fast`) | flux-schnell (2cr) | kling-v2 (30cr) |
| `--quality` | flux-pro (8cr) | kling-v3-pro (100cr) |
| `--best` | seedream-3 (6cr) | veo-3.1 (400cr) |
| `-m <id>` | exact model | exact model |

`-m` overrides quality presets. Use `melies models` to list all available models.

## Visual Style Flags

Add these flags to any `image`, `video`, `thumbnail`, or `pipeline` command:

| Flag | Example Values |
|------|---------------|
| `--camera` | eye-level, high, low, overhead, dutch, ots, profile, three-quarter |
| `--shot` | ecu, close-up, medium, cowboy, full-body, wide, tighter, wider |
| `--expression` | smile, laugh, serious, surprised, villain-smirk, seductive, horrified |
| `--lighting` | soft, golden, noir, rembrandt, backlit, neon, candle, hard |
| `--time` | dawn, sunrise, golden, dusk, night, morning, midday |
| `--weather` | clear, fog, rain, storm, snow, overcast, mist |
| `--color-grade` | natural, teal-orange, mono, warm, cool, filmic, sepia |
| `--mood` | romantic, mysterious, tense, ethereal, gritty, epic, nostalgic |
| `--art-style` | film-still, blockbuster, noir, anime, ghibli, shinkai, oil, watercolor, concept |
| `--era` | victorian, 1920s, 1980s, modern, dystopian, medieval |

Multiple flags combine. Example:

```bash
melies image "woman in a café" --lighting golden --mood romantic --art-style ghibli --sync
```

## Commands

### melies image \<prompt\>

Generate images from text.

```bash
melies image "sunset over mountains" --quality --sync
melies image "portrait" --actor mei --lighting golden --sync
melies image "cyberpunk city" --art-style neo-noir --mood gritty -n 4 --sync
melies image "product photo" -a 1:1 --best --sync --output photo.webp
```

**Options:**
- `-m, --model` Model override (use quality presets instead)
- `-a, --aspectRatio` 1:1, 16:9, 9:16, 4:3, 3:4 (default: 1:1)
- `-n, --numOutputs` 1-4 images (default: 1)
- `-r, --resolution` Output resolution (model-dependent)
- `-i, --imageUrl` Reference image for img2img
- `--ref` Reference ID for custom characters (see `melies ref`)
- `--actor` Built-in AI actor name (see `melies actors`)
- `--sref` Style reference code (see `melies styles`)
- `--fast` / `--quality` / `--best` Quality presets
- `--camera`, `--shot`, `--expression`, `--lighting`, `--time`, `--weather`, `--color-grade`, `--mood`, `--art-style`, `--era` Visual style flags
- `--seed` Reproducible generation
- `--dry-run` Preview prompt, model, and cost without generating
- `-o, --output` Save file to path (use with --sync)
- `-s, --sync` Wait for completion

### melies video \<prompt\>

Generate videos from text or images.

```bash
melies video "drone shot over forest" --quality --sync
melies video "walking down the street" --actor mei --camera low --sync
melies video "zoom into product" -i https://example.com/product.jpg --sync
```

**Options:** Same as `image` plus:
- `-d, --duration` Video duration in seconds
- Default aspect ratio is 16:9
- Sync timeout is 5 minutes

### melies poster \<title\>

Generate movie posters with style presets.

```bash
melies poster "Neon Shadows" --style noir --sync
melies poster "The Last Garden" --style anime --genre drama --actor mei --sync
melies poster "Blood Moon" -l "A detective hunts a killer" -g horror --quality --sync
```

**Options:**
- `-l, --logline` Short synopsis
- `-g, --genre` Genre (horror, sci-fi, comedy, drama, etc.)
- `--style` Poster preset: cinematic, anime, retro, film-noir, minimalist, horror, sci-fi, watercolor, comic-book, art-deco, grindhouse, bollywood, western, pixel-art, surrealist, documentary, cartoon, epic-fantasy, indie-film, neon-noir
- `--actor` AI actor name
- `--fast` / `--quality` / `--best` Quality presets
- `--seed`, `--dry-run`, `--output`, `--sync`

### melies thumbnail \<prompt\>

Generate YouTube thumbnails (forced 16:9, optimized for click-through).

```bash
melies thumbnail "shocked face reacting to AI news" --actor aria -n 4 --sync
melies thumbnail "cooking tutorial intro" --actor sofia --expression smile --quality --sync
```

**Options:** Same as `image`. Aspect ratio is always 16:9. Default expression is smile, default lighting is soft.

### melies pipeline \<prompt\>

Generate an image then animate it into a video. One command, both steps.

```bash
melies pipeline "warrior on a cliff at sunset" --actor mei --art-style concept --best --sync
melies pipeline "serene lake at dawn" --mood ethereal --lighting golden --sync
```

**Options:**
- `--im` Image model override
- `--vm` Video model override
- `-a, --aspectRatio` Ratio for both steps (default: 16:9)
- `-d, --duration` Video duration
- All style flags, `--actor`, quality presets, `--dry-run`, `--output`
- Sync defaults to true

Returns `{ imageUrl, videoUrl }`.

### melies upscale \<imageUrl\>

Upscale an image to higher resolution.

```bash
melies upscale "https://..." --model esrgan --scale 2 --sync
melies upscale "https://..." --model clarity --scale 4 --sync
```

Models: esrgan (3cr), clarity (8cr), seedvr2 (5cr). Scale 4x costs double.

### melies remove-bg \<imageUrl\>

Remove background from an image. Returns transparent PNG.

```bash
melies remove-bg "https://..." --sync
```

Cost: 3 credits.

### melies actors

Browse 148 built-in AI actors.

```bash
melies actors                              # List all actors
melies actors --type influencer            # Filter by type
melies actors --gender female --age 20s    # Filter by gender and age
melies actors search "asian"               # Search by name/tags
melies actors search "male 30s"            # Multi-word search
```

### melies styles

Browse and search style references (sref codes).

```bash
melies styles search "cyberpunk"           # Search by keyword
melies styles top                          # Popular keywords
melies styles info 1234567                 # Details for a code
```

### melies credits

Check credit balance and usage.

```bash
melies credits
melies credits -g day
```

### melies models

List available AI models.

```bash
melies models                    # All models
melies models -t image           # Image models only
melies models -t video           # Video models only
```

### melies status \<assetId\>

Check generation job status.

```bash
melies status 6502a3b1f2e4a123456789ab
```

### melies assets

List recent generated assets.

```bash
melies assets
melies assets -l 50 -t text_to_image
```

### melies ref

Manage custom AI actor/object references.

```bash
melies ref list
melies ref create "John" -i https://example.com/john.jpg
melies ref delete <id>
```

## Common Patterns

### YouTube Thumbnail Pipeline with AI Actors

```bash
melies thumbnail "shocked face reacting to AI news" \
  --actor aria --expression surprised -n 4 --sync
```

### Consistent Character Across Media

```bash
# Same actor in different scenes
melies image "Mei in a coffee shop" --actor mei --lighting soft --sync
melies image "Mei on a mountain" --actor mei --mood epic --sync
melies video "Mei walks toward camera" --actor mei --camera low --sync
```

### Image → Video Pipeline

```bash
melies pipeline "a warrior on a cliff at sunset" \
  --actor mei --art-style concept --lighting golden \
  --best --sync
```

### Movie Poster Batch

```bash
melies poster "Neon Requiem" --style neon-noir --sync
melies poster "Whispers in the Dark" --style horror -l "A blind woman hears the dead" --sync
melies poster "Starbound" --style sci-fi -l "Humanity's last colony ship" --sync
```

### Dry Run Before Expensive Generation

```bash
# Preview everything without spending credits
melies pipeline "epic battle scene" --actor james --best --dry-run
```

### Budget-Aware Generation

```bash
CREDITS=$(melies credits | jq '.credits')
if [ "$CREDITS" -gt 100 ]; then
  melies video "Epic aerial shot" --best --sync
else
  melies image "Epic aerial shot" --fast --sync
fi
```

## Credit Costs

| Command | Cost |
|---------|------|
| Image (--fast) | 2 credits |
| Image (--quality) | 8 credits |
| Image (--best) | 6 credits |
| Video (--fast) | 30 credits |
| Video (--quality) | 100 credits |
| Video (--best) | 400 credits |
| Upscale (esrgan, 2x) | 3 credits |
| Upscale (clarity, 2x) | 8 credits |
| Remove background | 3 credits |
| Pipeline | image + video cost combined |

## Gotchas

1. **Generation is async by default.** Use `--sync` to wait for results.
2. **Video generation takes time.** 30s to 3min depending on model. `--sync` waits up to 5 min.
3. **Credits are deducted upfront.** Refunded automatically on failure.
4. **Actor names are case-insensitive.** `--actor Mei` and `--actor mei` both work.
5. **Style flags combine.** `--lighting golden --mood romantic --art-style ghibli` all apply to one generation.
6. **Pipeline defaults to sync.** It needs to wait for the image before generating the video.
7. **--dry-run shows the full prompt.** Useful for debugging what modifiers get applied.
8. **Poster --style is separate from --art-style.** Poster styles are preset poster designs. Art styles are visual rendering options.
9. **Token expiry.** If you get 401 errors, run `melies login` again.
10. **Rate limits.** Max 1000 requests per 15 minutes.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MELIES_TOKEN` | JWT auth token (overrides stored config) |
| `MELIES_API_URL` | API base URL (default: https://melies.co/api) |

## Quick Reference

```bash
melies image "prompt" --actor <name> --art-style <style> --quality --sync
melies video "prompt" --actor <name> --lighting <light> --best --sync
melies poster "title" --style <preset> -g <genre> --sync
melies thumbnail "prompt" --actor <name> -n 4 --sync
melies pipeline "prompt" --actor <name> --best --sync
melies upscale <url> --scale 2 --sync
melies remove-bg <url> --sync
melies actors search "query"
melies styles search "keyword"
melies credits
melies models
```

## Links

- [melies.co](https://melies.co)
- [Documentation](https://melies.co/docs)
- [Agent Skills Directory](https://agentskill.sh)
