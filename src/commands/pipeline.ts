import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { resolveModel, getPresetCredits } from '../utils/model-resolver';
import { buildPrompt, type StyleOptions } from '../utils/prompt-builder';
import { findActor } from '../utils/actors';
import { downloadFile } from '../utils/download';
import { addStyleOptions, addQualityOptions, addActorOption, addGenerationOptions } from '../utils/style-options';

interface PipelineArgs {
  prompt: string;
  imageModel?: string;
  videoModel?: string;
  aspectRatio?: string;
  duration?: number;
  sync?: boolean;
  actor?: string;
  fast?: boolean;
  quality?: boolean;
  best?: boolean;
  camera?: string;
  shot?: string;
  expression?: string;
  lighting?: string;
  time?: string;
  weather?: string;
  colorGrade?: string;
  mood?: string;
  artStyle?: string;
  era?: string;
  dryRun?: boolean;
  seed?: number;
  output?: string;
}

export const pipelineCommand: CommandModule<{}, PipelineArgs> = {
  command: 'pipeline <prompt>',
  describe: 'Generate an image then animate it into a video (image -> video chain)',
  builder: (yargs) => {
    let y = yargs
      .positional('prompt', {
        type: 'string',
        description: 'Text prompt describing the scene',
        demandOption: true,
      })
      .option('imageModel', {
        alias: 'im',
        type: 'string',
        description: 'Image model override',
      })
      .option('videoModel', {
        alias: 'vm',
        type: 'string',
        description: 'Video model override',
      })
      .option('aspectRatio', {
        alias: 'a',
        type: 'string',
        default: '16:9',
        description: 'Aspect ratio for both image and video',
      })
      .option('duration', {
        alias: 'd',
        type: 'number',
        description: 'Video duration in seconds',
      })
      .option('sync', {
        alias: 's',
        type: 'boolean',
        default: true,
        description: 'Wait for both generations (default: true for pipeline)',
      });
    y = addStyleOptions(y);
    y = addQualityOptions(y);
    y = addActorOption(y);
    y = addGenerationOptions(y);
    return y as any;
  },
  handler: async (argv) => {
    try {
      const imageModel = argv.imageModel || resolveModel('image', argv);
      const videoModel = argv.videoModel || resolveModel('video', argv);

      // Resolve actor
      let actorModifier: string | undefined;
      let actorRef: string | undefined;
      if (argv.actor) {
        const actor = findActor(argv.actor);
        if (!actor) {
          console.error(JSON.stringify({ error: `Actor "${argv.actor}" not found. Run "melies actors" to see available actors.` }));
          process.exit(1);
        }
        actorModifier = actor.modifier;
        actorRef = actor.r2Url;
      }

      // Build prompt
      const styleOptions: StyleOptions = {
        camera: argv.camera,
        shot: argv.shot,
        expression: argv.expression,
        lighting: argv.lighting,
        time: argv.time,
        weather: argv.weather,
        colorGrade: argv.colorGrade,
        mood: argv.mood,
        artStyle: argv.artStyle,
        era: argv.era,
      };
      const finalPrompt = buildPrompt(argv.prompt, styleOptions, actorModifier);

      // Dry run
      if (argv.dryRun) {
        const imageCredits = getPresetCredits('image', { ...argv, model: argv.imageModel });
        const videoCredits = getPresetCredits('video', { ...argv, model: argv.videoModel });
        console.log(JSON.stringify({
          step1: {
            type: 'image',
            model: imageModel,
            credits: imageCredits || 'varies by model',
          },
          step2: {
            type: 'video',
            model: videoModel,
            credits: videoCredits || 'varies by model',
          },
          prompt: finalPrompt,
          aspectRatio: argv.aspectRatio,
          duration: argv.duration || null,
          actor: argv.actor || null,
          seed: argv.seed || null,
        }, null, 2));
        return;
      }

      const token = getToken();
      const api = new MeliesAPI(token);

      // Step 1: Generate image
      console.error('Step 1/2: Generating image...');
      const imageParams: Record<string, unknown> = {
        prompt: finalPrompt,
        model: imageModel,
        aspectRatio: argv.aspectRatio,
        numOutputs: 1,
      };
      if (argv.seed) imageParams.seed = argv.seed;
      if (actorRef) imageParams.imageUrl = actorRef;

      const imageResult = await api.executeTool('text_to_image', imageParams);
      const imageAsset = await pollAsset(api, imageResult.assetId as string);

      if (imageAsset.status !== 'completed' || !imageAsset.url) {
        console.error(JSON.stringify({ error: 'Image generation failed', details: imageAsset }));
        process.exit(1);
      }

      console.error(`Step 1/2: Image ready: ${imageAsset.url}`);

      // Step 2: Generate video from image
      console.error('Step 2/2: Generating video from image...');
      const videoParams: Record<string, unknown> = {
        prompt: argv.prompt,
        model: videoModel,
        imageUrl: imageAsset.url,
        aspectRatio: argv.aspectRatio,
      };
      if (argv.duration) videoParams.duration = argv.duration;

      const videoResult = await api.executeTool('text_to_video', videoParams);
      const videoAsset = await pollAsset(api, videoResult.assetId as string, 300000);

      const output: Record<string, any> = {
        status: videoAsset.status,
        imageUrl: imageAsset.url,
        imageAssetId: imageAsset.assetId,
        videoUrl: videoAsset.url || null,
        videoAssetId: videoAsset.assetId,
        prompt: finalPrompt,
      };

      if (videoAsset.url && argv.output) {
        const filePath = await downloadFile(videoAsset.url, argv.output);
        output.savedTo = filePath;
      }

      console.log(JSON.stringify(output, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    }
  },
};
