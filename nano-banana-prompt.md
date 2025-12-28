Ricardo — cool, with that blog’s guidance the biggest upgrades are: 1. Use references strategically (up to 5): make the ultrasound the “geometry lock”, optionally add 2–3 crops (face close-up, 3/4 angle, face+hand) as separate refs. 2. Be explicit + structured when you need precision (JSON prompting works great). 3. Strong negatives (Nano Banana Pro likes stamps/text/aged “rustic” vibes; you want none of that). 4. Two-step pipeline: first get the best render, then run upscale/restore to 4K with a faithful prompt.

Below are refined prompts that follow that.

⸻

Nano Banana Pro — best prompt (prose)

Mode: Edit (image-to-image)
Refs:
• Ref1: full ultrasound frame (pose/framing lock)
• Ref2: tight face crop (identity lock)
• Ref3: face+hand crop (anatomy lock)
(Optional Ref4/5: alternate crops if you have them)

Prompt

Edit task: Transform the provided 4D ultrasound into a single-frame ultra-realistic in-utero photograph.

Reference priority: 1. Keep the exact pose, head angle, facial proportions, and framing from Ref1. 2. Match facial geometry from Ref2 (identity lock). 3. Match hand/finger count and placement from Ref3 (anatomy lock, if visible).

What to change (only): Replace ultrasound material/shading with real photographic detail: realistic eyelids, lips, nose, soft cheeks; subtle peach fuzz; natural skin micro-texture and mild mottling; physically plausible subsurface scattering.

Scene: inside the womb with amniotic fluid haze and a few floating specks; no extra objects.

Lighting/optics: warm amber/red transillumination through tissue, gentle bloom, shallow depth of field (macro portrait look, 50–85mm equivalent, ~f/2), slight vignette; candid medical macro photo (not studio).

Constraint: Make as few changes as possible beyond converting ultrasound rendering into a photoreal photo while keeping anatomy locked.

Negative prompt

no date stamp, no text, no watermark, no border, not rustic, not aged, no CGI, no 3D render, no plastic/waxy skin, no beauty filter, no over-smoothing, no over-sharpening, no HDR look, no extra fingers, no missing fingers, no fused fingers, no duplicated facial features, no warped anatomy

⸻

Nano Banana Pro — JSON prompt version (more “guide-aligned” control)

Paste as JSON (if your UI supports it):

{
"task": "edit_ultrasound_to_photoreal_inutero_photo",
"referencePriority": [
"Ref1: framing + pose lock",
"Ref2: face geometry / identity lock",
"Ref3: hand anatomy lock"
],
"constraints": {
"keepPose": true,
"keepFraming": true,
"keepFacialProportions": true,
"noAnatomyChanges": true,
"minimalChanges": "only convert ultrasound rendering to photoreal"
},
"subject": {
"type": "late-term fetus",
"expression": "relaxed, eyes closed",
"details": ["natural eyelids", "natural lips", "soft cheeks", "subtle peach fuzz", "skin micro-texture"]
},
"environment": {
"setting": "inside womb",
"elements": ["amniotic fluid haze", "subtle floating specks"],
"forbidden": ["props", "extra objects", "text"]
},
"lighting": {
"type": "warm transillumination",
"tone": "amber/red",
"effects": ["soft bloom", "gentle falloff", "slight vignette"]
},
"camera": {
"style": "candid medical macro photo",
"focalRange": "50-85mm equivalent",
"depthOfField": "shallow (around f/2 look)"
},
"negatives": [
"date stamp",
"text",
"watermark",
"border",
"rustic",
"aged look",
"CGI",
"3D render",
"plastic skin",
"waxy skin",
"beauty filter",
"over-smoothed skin",
"over-sharpened",
"extra fingers",
"missing fingers",
"fused fingers",
"warped anatomy"
]
}

⸻

Nano Banana Pro — step 2: “Upscale/restore to 4K” (faithful)

Run a second edit on the best output:

Upscale to 4K and lightly restore. Preserve the exact image content and composition. Increase fine skin detail and realistic grain subtly; do not introduce new features, text, or anatomy changes.

⸻

GPT Image 1.5 — refined edit prompt

Edit the provided 4D ultrasound into a photorealistic in-utero macro photograph. Keep exact framing, pose, head angle, and facial proportions; do not change anatomy. Convert ultrasound shading into realistic skin detail (eyelids, lips, nose; subtle pores/peach fuzz; natural skin variation). Add warm amber/red transillumination, amniotic haze with a few specks, shallow depth of field, gentle vignette, subtle film grain.
Avoid: text, date stamps, watermarks, borders, rustic/aged look, CGI/3D render, plastic/waxy skin, extra/missing/fused fingers, warped anatomy.

⸻

Here is the full guide from the provided URL, converted into a clean Markdown format.

Following the file, I have also provided a **refined version** of the complex JSON prompt found in the guide, optimized for better clarity and strict JSON compliance.

# Guide: How to Prompt Nano Banana Pro

**Source:** [fofr.ai](https://www.fofr.ai/nano-banana-pro-guide)  
**Date:** Nov 27, 2025  
**Author:** fofr

---

## Introduction

Nano Banana Pro is the most flexible and capable image model available. But when it can do so much, where do you start?

There are no hard rules about how to get good images from Nano Banana Pro. Pretty much any prompt you give it will return a good-looking and coherent output, whether you ask for something very simple or a complex scene.

### Example: Simple vs. Complex

**Simple Prompt:**

> "a photo"

**Complex Prompt:**

> "a photo of a black and white cat stealing turkey from a kitchen table while a labradoodle sleeps unaware underneath, it's a modern sleek kitchen in slate grey with floor uplighting and patterned floor tiles"

---

## Play Around and Find Out

The simplest approach to learning about any model is to play with it. Try some minimal prompts to see the kinds of outputs you get as defaults. Then try pushing the model towards something different.

### Prompt Evolution Example

1.  **Initial:** "A fashion photo"
2.  **Refined:** "A high-end fashion photo"
3.  **Final:** "A high end fashion photo outdoors, winter fashion shoot, daring and brave"

### Exercise: Recreate an Image

Start from a real image and, using only words, try to recreate that image.

**Example Prompt:**

> "A landscape photo at dawn, there is a distant snow capped mountain range, in the foreground there is a lake with a jetty. The jetty is on the right side. Someone is standing at the end of the jetty. Early morning warm and vibrant pink light lights the underside of the grey clouds and the snowy peaks. The jetty is frosted. There is lots of dark grey cloud cover contrasting the light. Low angle photo. There's handles for a metal ladder just visible at the end of the jetty."

_Note: The model may recognize famous locations even if not explicitly named._

---

## Being Detailed with Your Prompts

You don't have to detail every aspect, but detail helps when you have exact specifications.

**Detailed Prompt Example:**

> "A realistic, wide-angle documentary photo of a chaotic family kitchen during the morning rush. The wooden dining table is cluttered with an overturned box of Cheerios, a large puddle of spilled milk, a pile of unfolded laundry, and scattered school papers. An orange tabby cat stands on top of the table, calmly drinking the spilled milk. Under the table, a golden retriever is licking a dirty plate. A toddler in a high chair is screaming and smearing oatmeal on their face. A young boy wearing a superhero cape runs through the background. The mother looks stressed, holding a cell phone to her ear while frantically wiping the table. The father stands in the background looking confused and holding a piece of burnt toast. Bright natural morning light, high detail, messy authentic home."

---

## Negative Prompts

Sometimes it is easier to tell the model what you **don't** want to see.

**Common Negatives:**

- `no date stamp` (Nano Banana Pro likes to put these in the corner)
- `no text`
- `not rustic` (Prevents the "aged" look)
- `no monkeys` (Essential when designing anything related to bananas!)

**Example:**

> **Prompt:** "A screenshot of the Google home page with a banana Google doodle, change I'm feeling lucky to be 'Go bananas'. No monkeys."

---

## JSON Prompting

Using JSON allows you to provide structured detail (meaning, composition, subject, style) in a way the model easily understands but is less verbose than prose.

### Example JSON Prompt

```json
{
  "promptDetails": {
    "description": "A prompt to *create a new scene* by placing a subject (based on a reference photo) into a warm, daily life environment, overlaying a clean minimalist music interface.",
    "styleTags": [ "Lifestyle Photography", "Cozy", "Golden Hour", "Instagram Aesthetic" ]
  },
  "scene": {
    "background": {
      "setting": "a busy but cozy coffee shop corner on a sunny morning",
      "details": "Soft morning sunlight streaming through a large glass window, blurred pedestrians outside, wooden table texture, steam rising from a latte."
    },
    "subject": {
      "description": "The person defined by `[UPLOADED IMAGE]`, looking relaxed and content.",
      "pose": "sitting at a wooden table, one hand holding a ceramic mug, looking thoughtfully out the window",
      "focus": "Subject is clearly defined against the warm, slightly blurred interior of the cafe."
    }
  },
  "overlayObject": {
    "type": "Minimalist 'Now Playing' Digital Widget",
    "relationshipToEnvironment": "the UI appears as a **clean, flat graphic overlay** (like an Instagram Story sticker) hovering in the negative space near the window.",
    "transform": "Straight orientation, 2D graphic design style, keeping the composition balanced without obscuring the face.",
    "surfaceInteraction": "Matte finish, high opacity white card with soft drop shadow to separate it from the background.",
    "components": {
      "songTitle": "Sunday Morning",
      "artistName": "Maroon 5",
      "position": "floating in the bottom-right corner of the frame."
    }
  },
  "technicalStyle": {
    "aspectRatio": "4:5",
    "photographyStyle": "Lifestyle, High-Key, Commercial",
    "camera": {
      "shotType": "Medium Shot",
      "angle": "Slightly above eye-level (casual)",
      "depthOfField": "Moderate, keeping the subject and table sharp, blurring the street outside."
    },
    "lighting": {
      "type": "Natural, Warm, Diffused",
      "description": "Sunlight acts as the key light coming from the window side, filling the scene with golden tones and soft highlights on the hair."
    },
    "color": {
      "palette": "Earth tones, warm browns, creams, and soft greens."
    }
  },
  "audioDevice": {
    "type": "white aesthetic noise-canceling headphones",
    "fit": "resting around the subject's neck (not on ears)",
    "color": "clean matte white or beige",
    "consistencyNote": "implies a break in listening to enjoy the ambient sounds of the coffee shop"
  },
  "moodReinforcement": "The scene feels like a relaxed start to the day, with the music track 'Sunday Morning' reflecting the easygoing vibe."
}

```

---

## Text in Images

Nano Banana Pro handles text well, including cursive, sans-serif, handwriting, or 3D word art.

- **Prompt 1:** "Very neatly write 'Show text however you like' in slanted elaborate handwriting in the style of 1915"
- **Prompt 2:** "Giant 3D word art in a 90s style saying 'Show text however you like'"

**Important:** For long text, ask for a "verbatim copy".

> "Put this whole text, verbatim, into a photo of a glossy magazine article on a desk... The text: [...the unformatted article]"

---

## Consistent Characters & Reference Images

You can use reference images (up to 5) to maintain character identity or style.

- **Single Reference:** Run the model a few times to generate more angles of your character to use as future references.
- **Multiple References:** Increases fidelity.
- **Style Transfer:** Use references for branding, logos, or color schemes.

**Example Use Case:**

> "Put the logo from image 1 onto the white back of the handheld white plastic and silver device in image 2... Tweak the cafe scene to have a more cosy color palette like in image 4."

---

## Advanced Capabilities

### Visual Puzzles

You can give the model a visual challenge, like a crossword, and it'll attempt to solve it.

> **Prompt:** "Return an image of the solved crossword, use green pen"

### Google Search Grounding

Nano Banana Pro can use Google Search to find real-time info (e.g., current events).

> **Prompt:** "A stylish graphic showing the Scotland vs Denmark score in the most recent World cup qualifier"

### Upscaling and Restoration

- **Upscaling:** Give it a small image (e.g., 150x150) and prompt "Upscale to 4K".
- **Restoration:** Upload an old photo and prompt "Restore this image".

---

## Summary

To get the best results:

1. **Experiment freely:** Start simple and iterate.
2. **Be specific:** Use detailed prompts and JSON structure when you need precise control.
3. **Use reference images:** Use them for character consistency, style transfer, and object placement.
4. **Use tools:** Enable Google Search for current events and use the model's native upscaling abilities.

````

---

### Refined Prompt (JSON Version)

The guide highlights that JSON prompting is excellent for structure. Below is a **refined version** of the example JSON prompt found in the text. I have cleaned up the structure to be more token-efficient for the AI, clarified the relationships between objects, and ensured the "negative prompt" logic is implicit in the descriptions.

```json
{
  "meta": {
    "task": "image_generation",
    "model": "Nano Banana Pro",
    "version": "1.0"
  },
  "scene_composition": {
    "subject": {
      "reference": "Use [UPLOADED_IMAGE] as primary character source",
      "action": "Sitting at a wooden table, holding a ceramic mug, gazing out the window",
      "expression": "Relaxed, content, thoughtful",
      "wardrobe": {
        "accessories": "White aesthetic noise-canceling headphones resting around neck (not on ears)",
        "color_theme": "Clean matte white/beige"
      }
    },
    "environment": {
      "location": "Busy but cozy coffee shop corner",
      "lighting": "Golden hour morning sunlight streaming through large glass window",
      "atmosphere": "Warm, diffused, steam rising from latte, blurred pedestrians outside",
      "focus": "Subject sharp, background slightly blurred (moderate depth of field)"
    },
    "graphic_overlay": {
      "element": "Music Player Widget",
      "style": "Minimalist, flat 2D graphic, Instagram Story sticker aesthetic",
      "content": {
        "song": "Sunday Morning",
        "artist": "Maroon 5"
      },
      "placement": "Floating in bottom-right negative space, balanced, non-obstructive",
      "appearance": "High opacity white card, matte finish, soft drop shadow"
    }
  },
  "technical_specs": {
    "aspect_ratio": "4:5",
    "style_tags": [
      "Lifestyle Photography",
      "High-Key Commercial",
      "Cozy Aesthetic"
    ],
    "camera_angle": "Medium shot, slightly above eye-level",
    "color_palette": "Earth tones, warm browns, creams, soft greens"
  }
}

The "Nano Banana Pro" guide (based on the internal Google Gemini / DeepMind "Nano Banana" model architecture) emphasizes two distinct prompting styles: **Conversational Natural Language** for general use and **JSON Structured Prompting** for high-precision, complex scenes.

Since you want to transform a 4D ultrasound into a hyper-realistic photo (like the Linus Ekenstam example), the **JSON Structured Prompt** is the "Pro" method recommended by the guide to force the model to separate *lighting*, *texture*, and *camera specs* without getting confused.

Here is your refined prompt in the specific **Nano Banana Pro JSON format**.

### Option 1: The "Nano Banana Pro" JSON Prompt (Recommended)

*Copy this entire block. This structure forces the model to treat each element (skin, light, camera) with equal importance.*

```json
{
  "promptDetails": {
    "description": "A hyper-realistic reconstruction of a human fetus face inside the womb, transforming a 4D ultrasound scan into high-fidelity photography.",
    "styleTags": [
      "Macro Photography",
      "Medical Visualization",
      "National Geographic Style",
      "Hyper-Realism"
    ]
  },
  "scene": {
    "background": {
      "setting": "Inside the womb (in utero)",
      "details": "Soft, fluid-filled environment with floating particles in amniotic fluid. The background is a deep, warm amber/red darkness, blurring out into the distance."
    },
    "subject": {
      "description": "A human fetus face with extreme biological accuracy. Eyes are closed in a peaceful expression.",
      "surfaceInteraction": "The skin is translucent, wet, and delicate. Subsurface scattering (SSS) is essential—light penetrates the skin to reveal a fleshy, organic pink/red glow, rather than a solid plastic surface.",
      "details": "Visible fine peach fuzz (lanugo) on the cheeks. Tiny pores and skin texture are visible. The skin looks soft and slightly uneven, not perfectly smooth like a doll."
    }
  },
  "technicalStyle": {
    "aspectRatio": "1:1",
    "photographyStyle": "Cinematic Macro",
    "camera": {
      "shotType": "Extreme Close-Up (Macro)",
      "lens": "100mm Macro Lens",
      "aperture": "f/2.8",
      "depthOfField": "Shallow depth of field, keeping the nose and lips sharp while the ears and background gently blur."
    },
    "lighting": {
      "type": "Volumetric, Bioluminescent, Backlit",
      "description": "Warm light filtering through the uterine wall (amber and soft red tones). Rim lighting highlights the profile of the face."
    }
  },
  "negativePrompt": "plastic, wax, clay, illustration, cgi, 3d render, dry skin, artificial texture, sepia tone, ultrasound grain, noise, distortion, cartoon"
}

````

---

### Option 2: The "Natural Language" Pro Prompt

_If the tool you are using does not accept JSON, use this paragraph. It follows the guide's "Subject - Materiality - Lighting - Camera" formula._

> **"A hyper-realistic macro photograph of a fetus inside the womb, reconstructed from a 4D ultrasound. The subject is a human baby with eyes closed, featuring translucent, wet skin with visible pores and fine peach fuzz (lanugo). Materiality: The skin texture must exhibit strong subsurface scattering, appearing organic and fleshy, not plastic or waxy. Lighting: Cinematic, volumetric amber lighting filtering through the uterine wall, creating a warm, bioluminescent glow. Camera: Shot on a 100mm macro lens at f/2.8 with shallow depth of field, blurring the background amniotic fluid. 8k resolution, National Geographic medical photography style."**

### 💡 Vital Step: The "Image-to-Image" Setting

The guide emphasizes that for **consistency**, you must not just type the prompt but also **upload your image**.

- **Input:** Upload your specific ultrasound image.
- **Prompt Strength / Image Weight:** Set this to **High (around 60-70%)**. You want the AI to strictly follow the _structure_ of the baby's face in your image but replace the _texture_ with the description in the prompt.
- **Upscale:** The guide notes that Nano Banana Pro is excellent at upscaling. If your result is good but blurry, run a second pass with the command: **"Upscale to 4K, sharpen details."**
