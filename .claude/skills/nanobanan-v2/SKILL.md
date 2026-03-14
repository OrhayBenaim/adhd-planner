---
name: nanobanan-v2
description: Generate images and videos using Nano Banana 2 (Google Gemini 3.1 Flash Image) and Veo 3.1 via the @google/genai TypeScript SDK. This skill should be used when the agent needs to generate images from text prompts, create AI-generated visuals or videos, or integrate Nano Banana 2 / Veo 3.1 into a project.
---

# Nano Banana v2 Image & Video Generation

Nano Banana 2 is Google's fast AI image generation model powered by Gemini 3.1 Flash Image. It generates high-fidelity images with accurate text rendering, character consistency, and support for 1K/2K/4K resolutions across 14 aspect ratios. Combined with **Veo 3.1**, it also supports text-to-video and image-to-video generation with native audio.

**Image Model ID:** `gemini-3.1-flash-image-preview`
**Video Model ID:** `veo-3.1-generate-preview`
**SDK:** `@google/genai` (Google GenAI JS/TS SDK)
**API Key:** Obtain from [Google AI Studio](https://aistudio.google.com/apikey)

## Installation

```bash
npm install @google/genai
npm install --save-dev @types/node  # for TypeScript
```

## Core Patterns

### Text-to-Image Generation

Generate an image from a text prompt and save it to disk:

```ts
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "A photorealistic image of a sunset over mountains",
  config: {
    responseModalities: ["TEXT", "IMAGE"],
  },
});

for (const part of response.candidates[0].content.parts) {
  if (part.text) {
    console.log(part.text);
  } else if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("output.png", buffer);
  }
}
```

### Image-Only Response (No Text)

To receive only an image without accompanying text:

```ts
const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "A minimalist logo for a coffee shop called 'Brew'",
  config: {
    responseModalities: ["IMAGE"],
  },
});
```

### Configuring Aspect Ratio and Resolution

```ts
const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: prompt,
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "16:9",
      imageSize: "2K",
    },
  },
});
```

**Supported aspect ratios:** `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9`

**Supported resolutions:** `512`, `1K`, `2K`, `4K`

### Image Editing (Image + Text Input)

Pass an existing image alongside a text prompt to edit it:

```ts
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const imageData = fs.readFileSync("input.png");
const base64Image = imageData.toString("base64");

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: [
    { text: "Add a rainbow in the sky of this image" },
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Image,
      },
    },
  ],
  config: {
    responseModalities: ["TEXT", "IMAGE"],
  },
});
```

## Response Handling

Every response contains `candidates[0].content.parts` -- an array of parts that can be either text or image data:

```ts
for (const part of response.candidates[0].content.parts) {
  if (part.text) {
    // Text description or commentary from the model
    console.log(part.text);
  } else if (part.inlineData) {
    // Base64-encoded image data
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("output.png", buffer);
    // part.inlineData.mimeType contains the MIME type (e.g., "image/png")
  }
}
```

## Prompting Best Practices

Refer to `references/prompting-guide.md` for detailed prompting strategies. Key principles:

- **Be specific and descriptive** -- include style, lighting, composition, and subject details
- **Text in images** -- put desired text in quotes and specify positioning (e.g., `sign reading 'OPEN' centered above the door`)
- **Limit text elements** to 3-5 per image for best accuracy
- **Use standard typography** for reliable text rendering
- **Aspect ratio selection:**
  - Social media: `1:1` (feed), `9:16` (stories/reels), `16:9` (YouTube)
  - Marketing: `16:9` or `21:9` (website heroes)
  - Mobile screens: `9:16`

## Video Generation (Veo 3.1)

Veo 3.1 generates high-fidelity 8-second videos at 720p/1080p/4K with natively generated audio. Video generation is asynchronous -- submit a request, then poll until complete.

### Text-to-Video

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const prompt = `A cinematic slow-motion shot of a golden retriever running
through a sunlit meadow with wildflowers, joyful energy, warm color grading`;

let operation = await ai.models.generateVideos({
  model: "veo-3.1-generate-preview",
  prompt: prompt,
});

// Poll until the video is ready (generation takes ~1-2 minutes)
while (!operation.done) {
  console.log("Waiting for video generation...");
  await new Promise((resolve) => setTimeout(resolve, 10000));
  operation = await ai.operations.getVideosOperation({ operation });
}

// Download the generated video
ai.files.download({
  file: operation.response.generatedVideos[0].video,
  downloadPath: "output.mp4",
});
```

### Video with Portrait Aspect Ratio (TikTok/Reels)

```ts
let operation = await ai.models.generateVideos({
  model: "veo-3.1-generate-preview",
  prompt: "A person dancing in a neon-lit urban alley at night, vertical framing",
  config: {
    aspectRatio: "9:16",
  },
});
```

**Supported video aspect ratios:** `16:9` (landscape, default), `9:16` (portrait/vertical)

### Image-to-Video (Animate a Nano Banana Image)

Generate an image with Nano Banana 2, then use it as the starting frame for a Veo video:

```ts
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Step 1: Generate an image with Nano Banana 2
const imageResponse = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "A serene Japanese garden with cherry blossoms and a koi pond",
  config: { responseModalities: ["IMAGE"] },
});

const imagePart = imageResponse.candidates[0].content.parts.find(p => p.inlineData);
const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
fs.writeFileSync("keyframe.png", imageBuffer);

// Step 2: Use the image as the first frame for video generation
let operation = await ai.models.generateVideos({
  model: "veo-3.1-generate-preview",
  prompt: "Camera slowly pans across the garden, cherry blossom petals gently falling, koi fish swimming",
  image: {
    imageBytes: imageBuffer.toString("base64"),
    mimeType: "image/png",
  },
});

// Poll until done
while (!operation.done) {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  operation = await ai.operations.getVideosOperation({ operation });
}

ai.files.download({
  file: operation.response.generatedVideos[0].video,
  downloadPath: "garden_video.mp4",
});
```

### Video Extension

Extend a previously generated video with a new prompt:

```ts
let extensionOp = await ai.models.generateVideos({
  model: "veo-3.1-generate-preview",
  prompt: "The camera zooms in on a single koi fish as it leaps out of the water",
  video: operation.response.generatedVideos[0].video, // from a previous generation
  config: {
    numberOfVideos: 1,
    resolution: "720p",
  },
});
```

### Video Generation Notes

- Generation takes ~1-2 minutes; always poll with 10-second intervals
- Veo 3.1 generates **natively generated audio** (dialogue, sound effects, ambient sounds)
- Videos are 8 seconds long; use video extension to create longer content
- Use `numberOfVideos` in config to generate multiple variations
- Resolution options: `720p`, `1080p`, `4k`

## Environment Setup

Store the API key in an environment variable -- never hardcode it:

```
GEMINI_API_KEY=your_key_here
```

## Limitations

- The model is in preview (`gemini-3.1-flash-image-preview`) and may change
- Rate limits apply -- check Google AI Studio for current quotas
- Generated images may include watermarks during preview
- Complex multi-element scenes may require iterative prompting
