---
name: melies
description: AI image and video generation CLI. Generate images, videos, and movie posters using 50+ models including Flux, Kling, Veo, Wan, and more. Text-to-image, text-to-video, image-to-video, style transfer, and consistent character references. Built for filmmakers, content creators, YouTube thumbnails, and AI agents.
version: 1.1.0
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

AI filmmaking from the command line. Generate movie posters, YouTube thumbnails, character portraits, images, and videos using 50+ AI models.

## Install

```bash
npm install -g melies
```

## Authentication

Most users sign up via Google/SSO. To authenticate the CLI:

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

Email/password login also works if you have a password set:

```bash
melies login -e your@email.com -p yourpassword
```

Token is stored in `~/.melies/config.json`. Environment variable takes precedence.

## Core Workflow

The typical workflow for an agent:

1. **Check credits** before generating
2. **Pick a model** (list available models)
3. **Generate** the asset (image, video, or poster)
4. **Poll for completion** (use `--sync` or check status manually)
5. **Use the URL** from the completed asset

```bash
# 1. Check balance
melies credits

# 2. Browse models
melies models -t image

# 3. Generate with --sync to wait for result
melies image "A cyberpunk cityscape at night" -m flux-dev -a 16:9 --sync

# 4. Result includes the URL directly
```

## Commands

### melies login

Log in and store your auth token.

```bash
melies login -e user@example.com -p password
melies login --token your_jwt_token
```

### melies credits

Check your credit balance and usage history.

```bash
melies credits
melies credits -g day
```

### melies models

List available AI models. No authentication needed.

```bash
melies models                    # All models
melies models -t image           # Image models only
melies models -t video           # Video models only
melies models -t sound           # Sound/music models
```

### melies image \<prompt\>

Generate an image from a text prompt.

```bash
melies image "A sunset over mountains" -m flux-schnell
melies image "Product photo of sneakers" -m flux-dev -a 1:1
melies image "YouTube thumbnail" -m flux-pro -a 16:9 --sync
melies image "Portrait" -m flux-schnell -n 4 --sync
```

**Options:**
- `-m, --model` Image model (default: flux-schnell). See `melies models -t image`.
- `-a, --aspectRatio` Ratio: 1:1, 16:9, 9:16, 4:3, 3:4 (default: 1:1)
- `-n, --numOutputs` Number of images 1-4 (default: 1)
- `-r, --resolution` Output resolution (model-dependent)
- `-i, --imageUrl` Reference image URL for image-to-image generation
- `--ref` Reference ID for consistent character/object (see `melies ref`)
- `-s, --sync` Wait for completion and return the URL

### melies video \<prompt\>

Generate a video from a text prompt. Optionally provide a reference image.

```bash
melies video "A drone shot flying over a forest" -m kling-v2
melies video "Camera slowly pans across a cityscape" -m veo-3 -a 16:9 --sync
melies video "Zoom into the product" -m kling-v2 -i https://example.com/product.jpg
melies video "Timelapse of clouds" -m wan-v2 -d 10 --sync
```

**Options:**
- `-m, --model` Video model (default: kling-v2). See `melies models -t video`.
- `-i, --imageUrl` Reference image URL for image-to-video
- `-a, --aspectRatio` Ratio: 16:9, 9:16, 1:1 (default: 16:9)
- `-d, --duration` Duration in seconds (model-dependent)
- `-r, --resolution` Output resolution (model-dependent)
- `--ref` Reference ID for consistent character/object (see `melies ref`)
- `-s, --sync` Wait for completion and return the URL (timeout: 5 min)

### melies poster \<title\>

Generate a cinematic movie poster.

```bash
melies poster "The Last Horizon" -g sci-fi --sync
melies poster "Blood Moon" -l "A detective hunts a killer under a blood moon" -g horror --sync
melies poster "Summer Love" -g comedy -m flux-dev --sync
```

**Options:**
- `-l, --logline` Short synopsis for the poster
- `-g, --genre` Genre: horror, sci-fi, comedy, drama, action, thriller, fantasy, etc.
- `-m, --model` Image model (default: flux-dev)
- `--ref` Reference ID for consistent character/object (see `melies ref`)
- `-s, --sync` Wait for completion and return the URL

### melies status \<assetId\>

Check the status of a generation job.

```bash
melies status 6502a3b1f2e4a123456789ab
```

Returns: assetId, status (pending/completed/failed), url, prompt, model.

### melies assets

List your recently generated assets.

```bash
melies assets
melies assets -l 50
melies assets -t text_to_image
melies assets -t text_to_video
melies assets -t poster_generator
```

**Options:**
- `-l, --limit` Number of assets (default: 20, max: 100)
- `-o, --offset` Pagination offset
- `-t, --type` Filter by tool type

### melies ref

Manage AI actor and object references for consistent characters across generations.

```bash
melies ref list                                    # List your references
melies ref create "John" -i https://example.com/john.jpg    # Create actor reference
melies ref create "Red Chair" -i https://example.com/chair.jpg -t object  # Create object reference
melies ref delete 6502a3b1f2e4a123456789ab         # Delete a reference
```

**Subcommands:**
- `melies ref list` List saved references (actors, objects)
- `melies ref create <label> -i <imageUrl>` Create a new reference from an image
- `melies ref delete <id>` Delete a reference

**Using references in generation:**

```bash
# Get reference ID from list
REF_ID=$(melies ref list | jq -r '.[0].id')

# Use in any generation command
melies image "Portrait of John in a forest" --ref "$REF_ID" --sync
melies poster "The Last Stand" --ref "$REF_ID" -g action --sync
melies video "John walks toward camera" --ref "$REF_ID" --sync
```

## Common Patterns

### YouTube Thumbnail Pipeline

```bash
# Generate 4 thumbnail options
melies image "YouTube thumbnail: shocked face reacting to AI news, bold text overlay, bright colors" -m flux-dev -a 16:9 -n 4 --sync
```

### Movie Poster Batch

```bash
# Generate posters for multiple projects
melies poster "Neon Requiem" -g cyberpunk --sync
melies poster "Whispers in the Dark" -g horror -l "A blind woman hears the dead" --sync
melies poster "Starbound" -g sci-fi -l "Humanity's last colony ship" --sync
```

### Image to Video

```bash
# First generate an image, then animate it
RESULT=$(melies image "A serene lake at dawn" -m flux-dev --sync)
IMAGE_URL=$(echo $RESULT | jq -r '.url')
melies video "Slow camera push forward, water ripples gently" -m kling-v2 -i "$IMAGE_URL" --sync
```

### Consistent Character Across Media

```bash
# Create an actor reference from a photo
melies ref create "Sarah" -i https://example.com/sarah.jpg

# Get the reference ID
REF_ID=$(melies ref list | jq -r '.[0].id')

# Generate consistent images and videos with that character
melies image "Sarah standing on a cliff at sunset" --ref "$REF_ID" -m flux-dev --sync
melies poster "The Sarah Chronicles" --ref "$REF_ID" -g drama --sync
```

### Image to Image (Style Transfer)

```bash
# Use an existing image as reference for style/composition
melies image "Same scene but in watercolor style" -i https://example.com/photo.jpg -m flux-dev --sync
```

### Check and Generate

```bash
# Always check credits before expensive generation
CREDITS=$(melies credits | jq '.credits')
if [ "$CREDITS" -gt 100 ]; then
  melies video "Epic aerial shot" -m veo-3 --sync
else
  echo "Low credits: $CREDITS remaining"
fi
```

## Credit Costs

Credit costs vary by model. Check with `melies models`.

Typical ranges:
- **Fast images** (flux-schnell): 1-5 credits
- **Quality images** (flux-dev, flux-pro): 5-25 credits
- **Videos** (kling, wan): 30-100 credits
- **Premium videos** (veo-3, veo-3.1): 200-400 credits

Video costs can increase with duration and resolution. Audio generation may also add a multiplier.

## Gotchas

1. **Generation is async by default.** Without `--sync`, you get an assetId immediately. Use `melies status` to check later.
2. **Video generation takes time.** Expect 30s to 3min depending on model and duration. Use `--sync` to wait automatically.
3. **Credits are deducted upfront.** If generation fails, credits are refunded automatically.
4. **Token expiry.** If you get 401 errors, run `melies login` again.
5. **Model names are case-sensitive.** Use exact IDs from `melies models`.
6. **Aspect ratio matters.** Some models only support certain ratios. 16:9 is safest for video.
7. **Image-to-video needs a public URL.** The `--imageUrl` flag requires a publicly accessible image URL.
8. **Poster prompt is auto-generated.** The `poster` command builds a prompt from title, logline, and genre. You don't need to write one.
9. **Rate limits apply.** Don't exceed 1000 requests per 15 minutes.
10. **`--sync` has timeouts.** Images timeout at 2 min, videos at 5 min. For longer generation, use async + `melies status`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MELIES_TOKEN` | JWT auth token (overrides stored config) |
| `MELIES_API_URL` | API base URL (default: https://melies.co/api) |

## Quick Reference

```bash
melies login --token TOKEN             # Log in with token
melies credits                         # Check balance
melies models -t image                 # List image models
melies models -t video                 # List video models
melies image "prompt" -m model --sync  # Generate image
melies image "prompt" -i url --sync    # Image-to-image
melies video "prompt" -m model --sync  # Generate video
melies video "prompt" -i url --sync    # Image-to-video
melies poster "title" -g genre --sync  # Generate poster
melies ref list                        # List actor/object refs
melies ref create "name" -i url        # Create reference
melies image "prompt" --ref ID --sync  # Use ref in generation
melies status <assetId>                # Check job status
melies assets                          # List your assets
```

## Links

- [melies.co](https://melies.co)
- [Agent Skills Directory](https://agentskill.sh)
