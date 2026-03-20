import type { CommandModule } from 'yargs';
import { MeliesAPI } from '../api';
import { getToken } from '../config';
import { pollAsset } from './image';
import { resolveModel, getModelCredits } from '../utils/model-resolver';
import type { StyleOptions } from '../utils/prompt-builder';
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
  movement?: string;
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

      // Collect style options (resolved server-side)
      const styleOptions: StyleOptions = {};
      if (argv.camera) styleOptions.camera = argv.camera;
      if (argv.shot) styleOptions.shot = argv.shot;
      if (argv.expression) styleOptions.expression = argv.expression;
      if (argv.lighting) styleOptions.lighting = argv.lighting;
      if (argv.time) styleOptions.time = argv.time;
      if (argv.weather) styleOptions.weather = argv.weather;
      if (argv.colorGrade) styleOptions.colorGrade = argv.colorGrade;
      if (argv.mood) styleOptions.mood = argv.mood;
      if (argv.artStyle) styleOptions.artStyle = argv.artStyle;
      if (argv.era) styleOptions.era = argv.era;
      if (argv.movement) styleOptions.movement = argv.movement;

      const rawPrompt = actorModifier ? `${actorModifier}, ${argv.prompt}` : argv.prompt;
      const hasStyleOptions = Object.keys(styleOptions).length > 0;

      // Dry run
      if (argv.dryRun) {
        const imageCredits = await getModelCredits(imageModel);
        const videoCredits = await getModelCredits(videoModel);
        console.log(JSON.stringify({
          step1: {
            type: 'image',
            model: imageModel,
            credits: imageCredits ?? 'unknown',
          },
          step2: {
            type: 'video',
            model: videoModel,
            credits: videoCredits ?? 'unknown',
          },
          prompt: rawPrompt,
          styleOptions: hasStyleOptions ? styleOptions : undefined,
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
        prompt: rawPrompt,
        model: imageModel,
        aspectRatio: argv.aspectRatio,
        numOutputs: 1,
      };
      if (hasStyleOptions) imageParams.styleOptions = styleOptions;
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
        prompt: rawPrompt,
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
