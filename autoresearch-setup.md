# BabyPeek Autoresearch Setup

> Prompt optimization experiment plan for 4D ultrasound → baby portrait generation.
> Stack: fal-ai/nano-banana-pro (primary), image-to-image edit mode.
> Recent change: Gemini replaced by fal.ai (commit: "feat(ai): replace Gemini with fal.ai").

---

## 1. Current Prompts (Exact — From Code)

### Source: `packages/api/src/prompts/baby-portrait.ts`

### Config: `packages/api/src/workflows/config.ts` → `FAL_MODEL = "fal-ai/nano-banana-pro"`

---

### Prompt V3 (current baseline, `style: "in-utero"`, `format: "prose"`)

```
Transform this 4D ultrasound image into a photorealistic baby portrait photo.
Generate a beautiful, lifelike photograph of the newborn baby's face with soft
natural lighting, warm skin tones, and gentle features. The portrait should look
like a professional newborn photography session.
```

---

### Prompt V3-JSON (`style: "in-utero"`, `format: "json"`)

```json
{
  "task": "transform_ultrasound_to_photoreal_baby_portrait",
  "style": "soft natural newborn photo",
  "constraints": {
    "preserve_face_orientation": true,
    "preserve_visible_anatomy": true,
    "keep_changes_minimal": true
  },
  "lighting": "soft natural lighting",
  "tones": "warm realistic skin tones",
  "negatives": [
    "text",
    "watermark",
    "logo",
    "date stamp",
    "blur",
    "deformed anatomy",
    "extra limbs",
    "plastic skin"
  ]
}
```

---

### Prompt V4 (`style: "national-geographic"`, `format: "prose"`) — **DEFAULT**

```
Transform this 4D ultrasound image into a photorealistic baby portrait photo.
Generate a beautiful, lifelike photograph of the newborn baby's face with soft
natural lighting, warm skin tones, and gentle features. The portrait should look
like a professional newborn photography session.
Use a slightly wider framing with subtle amniotic ambience while keeping the baby as the clear focal point.
```

---

### Prompt V4-JSON (`style: "national-geographic"`, `format: "json"`)

```json
{
  "task": "transform_ultrasound_to_cinematic_baby_portrait",
  "style": "documentary newborn portrait",
  "framing": "slightly wider than close-up",
  "constraints": {
    "preserve_pose": true,
    "preserve_facial_proportions": true,
    "avoid_non_photoreal_outputs": true
  },
  "lighting": "warm cinematic softness",
  "negatives": [
    "text",
    "watermark",
    "logo",
    "date stamp",
    "blur",
    "deformed anatomy",
    "extra limbs",
    "plastic skin",
    "cgi",
    "3d render",
    "harsh shadows"
  ]
}
```

---

### Upscale Prompt

```
Enhance this baby portrait with subtle detail and clarity.
Preserve composition and anatomy exactly. Do not add any text or overlays.
```

---

### Negative Prompts (current `V3_NEGATIVE_PROMPT`)

```
text, watermark, logo, date stamp, blur, deformed anatomy, extra limbs, plastic skin
```

---

### FalService Parameters (`packages/api/src/services/FalService.ts`)

```typescript
subscribe(model, {
  input: {
    prompt,         // one of the above
    image_url: imageUrl,  // uploaded ultrasound URL
  },
  logs: false,
})
```

No seed, no negative_prompt field passed currently. Model: `fal-ai/nano-banana-pro`.

---

### Reference Prompts (`nano-banana-prompt.md`) — Ricardo's Manual Research

**Prose (recommended by fofr.ai guide):**

```
Edit task: Transform the provided 4D ultrasound into a single-frame ultra-realistic in-utero photograph.

Reference priority:
1. Keep the exact pose, head angle, facial proportions, and framing from Ref1.
2. Match facial geometry from Ref2 (identity lock).
3. Match hand/finger count and placement from Ref3 (anatomy lock, if visible).

What to change (only): Replace ultrasound material/shading with real photographic detail:
realistic eyelids, lips, nose, soft cheeks; subtle peach fuzz; natural skin micro-texture
and mild mottling; physically plausible subsurface scattering.

Scene: inside the womb with amniotic fluid haze and a few floating specks; no extra objects.

Lighting/optics: warm amber/red transillumination through tissue, gentle bloom, shallow
depth of field (macro portrait look, 50–85mm equivalent, ~f/2), slight vignette;
candid medical macro photo (not studio).

Constraint: Make as few changes as possible beyond converting ultrasound rendering into
a photoreal photo while keeping anatomy locked.
```

**Reference negative prompt (from manual research):**

```
no date stamp, no text, no watermark, no border, not rustic, not aged, no CGI, no 3D render,
no plastic/waxy skin, no beauty filter, no over-smoothing, no over-sharpening, no HDR look,
no extra fingers, no missing fingers, no fused fingers, no duplicated facial features,
no warped anatomy
```

**JSON version (from manual research):**

```json
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
    "date stamp", "text", "watermark", "border", "rustic", "aged look",
    "CGI", "3D render", "plastic skin", "waxy skin", "beauty filter",
    "over-smoothed skin", "over-sharpened", "extra fingers", "missing fingers",
    "fused fingers", "warped anatomy"
  ]
}
```

---

## 2. What to Optimize

| Dimension                      | Current Status                                                | Target                                                            |
| ------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Portrait realism**           | V4 prose is minimal — generic "professional newborn" guidance | Photorealistic, indistinguishable from photo                      |
| **Anatomical accuracy**        | Negatives list "extra limbs" but no positive anatomy guidance | Correct finger count, proportional face, proper eyelids           |
| **Skin texture**               | Only "warm skin tones"                                        | Subsurface scattering, peach fuzz, micro-texture, no plastic/waxy |
| **In-utero atmosphere**        | V4 mentions "amniotic ambience" loosely                       | Amniotic fluid haze, warm transillumination, correct womb feel    |
| **Pose/geometry preservation** | "preserve_face_orientation: true" in JSON                     | Zero pose drift — face angle and framing from ultrasound locked   |
| **Negative prompt coverage**   | 8 negatives in V3, no fused fingers / no CGI variants missing | Full negative list from manual research (20+ negatives)           |
| **Cost / speed**               | Single pass, no two-step pipeline                             | Consider: generate + upscale pass                                 |

**Priority order:** Anatomical accuracy > Skin realism > Pose preservation > Atmosphere > Speed

---

## 3. Metric Proposals

### Automated Metrics

1. **Anatomy detector score** — Run MediaPipe FaceMesh or similar on output. Count detected facial landmarks. Expected: 468 face landmarks, clean detection = good anatomy.
2. **Finger count check** — Crop hand regions (if detected), run hand landmark model. Compare finger count to 5. Score: `abs(detected - 5)` → target 0.
3. **Skin tone naturalness** — Sample HSV values from face region. Check hue range (skin: H 5-20, S 0.2-0.6). Deviation = plasticity score.
4. **LPIPS preservation score** — Compare face region keypoints between input ultrasound and output. Lower LPIPS on face = better pose preservation.
5. **CLIP Aesthetic Score** — LAION Aesthetic Predictor v2. Target: >5.5 (professional photo quality).
6. **Plastic skin detector** — Fine-tune binary classifier on "waxy/plastic" vs "natural" skin using 100 labeled examples. Run inference on generated outputs.

### Manual Metrics (batch via Discord bot or Notion table)

Rate each output 1-5 on:

- Realism (does it look like a real photo?)
- Anatomy accuracy (correct proportions, no extra/fused fingers)
- Skin quality (texture, not plastic)
- Atmosphere (womb feel vs plain background)
- Parent appeal (emotional impact — would parent treasure this?)

---

## 4. Experiment Plan

### Experiment 1: Prompt Completeness — V4 Prose vs Research-Grade Prose

**Hypothesis:** V4 (4 sentences) leaves too much to model defaults. The research-grade prompt (Ricardo's manual work) performs significantly better.

**Variants:**

- **A** (baseline): Current V4 prose (default production prompt)
- **B**: Current V3-JSON (structured, 8 negatives)
- **C**: Research-grade prose from `nano-banana-prompt.md`
- **D**: Research-grade JSON from `nano-banana-prompt.md`
- **E**: Hybrid — V4 task + research-grade constraints + research-grade negatives

**Inputs:** 10 diverse ultrasound images (different poses, faces, hand visibility)
**Runs per variant:** 10 (total: 500 generations)
**Metrics:** CLIP aesthetic, anatomy score, human rating (all 5 dimensions)

---

### Experiment 2: Negative Prompt Expansion

**Hypothesis:** Adding "no fused fingers, no warped anatomy, no CGI, no rustic" to existing negatives reduces artifact rate.

**Variants:**

- **A**: Current V3 negatives (8 items)
- **B**: Add anatomy negatives: + `no extra fingers, no missing fingers, no fused fingers, no warped anatomy`
- **C**: Add skin negatives: + `no plastic skin, no waxy skin, no beauty filter, no over-smoothing`
- **D**: Full research negative list (20+ items)
- **E**: Full negatives + skin positives in main prompt: `skin micro-texture, subsurface scattering, peach fuzz`

**Inputs:** 5 challenging ultrasound images (where artifacts are likely)
**Runs per variant:** 15
**Metrics:** Anatomy score, finger count, skin naturalness score

---

### Experiment 3: Anatomy Lock — Pose Preservation Strategies

**Hypothesis:** Adding explicit "minimal changes" constraint reduces pose drift.

**Variants:**

- **A**: Current V4 (no explicit constraint)
- **B**: Add: `Make as few changes as possible. Preserve the exact pose, head angle, and framing from the input. Do not add any new body parts or reposition the head.`
- **C**: Use structured JSON with `"minimalChanges": "only convert ultrasound rendering to photoreal"` + `"noAnatomyChanges": true`
- **D**: Instruction-based: `CONSTRAINT: The input ultrasound is the ground truth for anatomy. Any deviation from input anatomy is a failure.`

**Inputs:** 10 ultrasound images (track face position and angle carefully)
**Runs per variant:** 10
**Metrics:** LPIPS face preservation score, human rating (anatomy accuracy)

---

### Experiment 4: Style — "In-Utero" vs "National Geographic" vs "Studio Newborn"

**Hypothesis:** "In-utero" atmosphere with amniotic fluid and warm transillumination is more emotionally impactful than plain newborn studio style.

**Variants:**

- **A**: V3 "in-utero" style (current prose)
- **B**: V4 "national-geographic" style (current default)
- **C**: Studio newborn: `soft studio lighting, neutral background, professional newborn portrait photography`
- **D**: Full in-utero from research prompt: amniotic fluid, warm amber/red transillumination, 50-85mm macro, shallow DOF
- **E**: Hybrid: studio lighting but with womb atmosphere cues

**Inputs:** 5 representative ultrasound images
**Runs per variant:** 10
**Metrics:** Human rating (parent appeal, atmosphere, realism)

---

### Experiment 5: Two-Step Pipeline (Generate + Upscale)

**Hypothesis:** A second fal.ai pass with the upscale prompt improves final image quality without anatomy drift.

**Variants:**

- **A**: Single pass (current production flow)
- **B**: Two-pass: research-grade prompt → upscale prompt
- **C**: Two-pass: V4 → upscale
- **D**: Two-pass with faithful upscale: `Upscale to 4K. Preserve the exact image. Increase fine skin detail and realistic grain subtly. Do not introduce new features or anatomy changes.`

**Inputs:** 5 ultrasound images
**Runs per variant:** 10
**Metrics:** Resolution quality, anatomy preservation, cost (2x fal.ai calls), P95 latency

---

### Experiment 6: Prose vs JSON Format

**Hypothesis:** JSON-format prompts give more consistent results by reducing model's token attention drift.

**Variants:**

- **A**: V3 prose (baseline)
- **B**: V3-JSON (existing)
- **C**: Research-grade prose
- **D**: Research-grade JSON
- **E**: Hybrid: JSON structure + prose narrative for key fields

**Inputs:** 10 ultrasound images
**Runs per variant:** 10
**Metrics:** Consistency score (variance across runs for same input), anatomy score, human rating

---

## 5. pi-autoresearch Commands

```bash
# Experiment 1: Prompt completeness — V4 vs Research-grade
/autoresearch \
  --name "babypeek-prompt-completeness" \
  --model "fal-ai/nano-banana-pro" \
  --mode "image-to-image" \
  --input-images ~/dev/indiehacking/babypeek/test-assets/ultrasound-*.jpg \
  --variants A,B,C,D,E \
  --prompt-a "Transform this 4D ultrasound image into a photorealistic baby portrait photo. Generate a beautiful, lifelike photograph of the newborn baby's face with soft natural lighting, warm skin tones, and gentle features. The portrait should look like a professional newborn photography session. Use a slightly wider framing with subtle amniotic ambience while keeping the baby as the clear focal point." \
  --prompt-c "$(cat ~/dev/indiehacking/babypeek/nano-banana-prompt.md | grep -A30 'Nano Banana Pro.*best prompt')" \
  --metric clip-aesthetic \
  --metric anatomy-landmark-count \
  --metric human-rating:realism,anatomy,skin,atmosphere,parent-appeal \
  --runs-per-variant 10 \
  --output-dir ~/dev/indiehacking/babypeek/autoresearch-results/prompt-completeness

# Experiment 2: Negative prompt expansion
/autoresearch \
  --name "babypeek-negative-expansion" \
  --model "fal-ai/nano-banana-pro" \
  --mode "image-to-image" \
  --input-images ~/dev/indiehacking/babypeek/test-assets/challenging-*.jpg \
  --base-prompt "$(cat V4_PROSE)" \
  --variants A,B,C,D,E \
  --negative-a "text, watermark, logo, date stamp, blur, deformed anatomy, extra limbs, plastic skin" \
  --negative-b "text, watermark, logo, date stamp, blur, deformed anatomy, extra limbs, plastic skin, extra fingers, missing fingers, fused fingers, warped anatomy" \
  --negative-d "no date stamp, no text, no watermark, no border, not rustic, not aged, no CGI, no 3D render, no plastic/waxy skin, no beauty filter, no over-smoothing, no over-sharpening, no HDR look, no extra fingers, no missing fingers, no fused fingers, no duplicated facial features, no warped anatomy" \
  --metric anatomy-score \
  --metric finger-count-accuracy \
  --metric skin-naturalness \
  --runs-per-variant 15 \
  --output-dir ~/dev/indiehacking/babypeek/autoresearch-results/negative-expansion

# Experiment 4: Style comparison
/autoresearch \
  --name "babypeek-style-comparison" \
  --model "fal-ai/nano-banana-pro" \
  --mode "image-to-image" \
  --input-images ~/dev/indiehacking/babypeek/test-assets/ultrasound-*.jpg \
  --variants A,B,C,D \
  --metric human-rating:parent-appeal,atmosphere,realism \
  --metric clip-aesthetic \
  --runs-per-variant 10 \
  --output-dir ~/dev/indiehacking/babypeek/autoresearch-results/style-comparison

# Experiment 5: Two-step pipeline
/autoresearch \
  --name "babypeek-two-step" \
  --model "fal-ai/nano-banana-pro" \
  --mode "image-to-image" \
  --pipeline two-step \
  --step-2-prompt "Enhance this baby portrait with subtle detail and clarity. Preserve composition and anatomy exactly. Do not add any text or overlays." \
  --input-images ~/dev/indiehacking/babypeek/test-assets/ultrasound-*.jpg \
  --variants A,B,C,D \
  --metric resolution-quality \
  --metric anatomy-preservation \
  --metric cost-usd \
  --metric latency-p95 \
  --runs-per-variant 10 \
  --output-dir ~/dev/indiehacking/babypeek/autoresearch-results/two-step

# Experiment 6: Prose vs JSON format
/autoresearch \
  --name "babypeek-format-comparison" \
  --model "fal-ai/nano-banana-pro" \
  --mode "image-to-image" \
  --input-images ~/dev/indiehacking/babypeek/test-assets/ultrasound-*.jpg \
  --variants A,B,C,D,E \
  --metric consistency-score \
  --metric anatomy-score \
  --metric human-rating:all \
  --runs-per-variant 10 \
  --seed-fixed 42 \
  --output-dir ~/dev/indiehacking/babypeek/autoresearch-results/format-comparison
```

---

## 6. Implementation Gap Analysis

### Missing from Current Production Code vs Research Findings

| Gap                              | Current                                                  | Recommended                                                              |
| -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Negative prompt passed to fal.ai | ❌ Not passed (no `negative_prompt` field in FalService) | ✅ Pass full 20-item negative list                                       |
| Skin texture guidance            | ❌ Only "warm skin tones"                                | ✅ Add subsurface scattering, micro-texture, peach fuzz                  |
| Camera/optics guidance           | ❌ None                                                  | ✅ Add "50-85mm macro, f/2, shallow DOF"                                 |
| Anatomy lock                     | ❌ Weak (JSON only has boolean flags)                    | ✅ Explicit "minimal changes" constraint                                 |
| In-utero atmosphere              | ❌ V4 says "amniotic ambience" vaguely                   | ✅ Specify: amniotic fluid haze, floating specks, warm transillumination |
| Two-step pipeline                | ❌ Single pass                                           | ✅ Consider generate → upscale for key users                             |
| Seed logging                     | ❌ Not tracked                                           | ✅ Log seed per generation for reproducibility                           |

### Immediate Code Changes (Before Experiments)

1. **Add `negative_prompt` to FalService** — pass the V3_NEGATIVE_PROMPT array as `negative_prompt` field
2. **Upgrade V4 prose** — incorporate research-grade language from `nano-banana-prompt.md`:
   - Skin: add peach fuzz, micro-texture, subsurface scattering
   - Camera: add 50-85mm macro equivalent, shallow DOF
   - Atmosphere: explicitly mention amniotic fluid haze
3. **Upgrade V4-JSON negatives** — copy full negative list from manual research
4. **Log generation seeds** — add seed to FalService response tracking

---

## 7. Test Asset Checklist

Prepare before running experiments:

- `test-assets/ultrasound-01-face-front.jpg` — full-face frontal ultrasound
- `test-assets/ultrasound-02-face-side.jpg` — lateral/profile ultrasound
- `test-assets/ultrasound-03-face-3quarter.jpg` — 3/4 angle
- `test-assets/ultrasound-04-face-hand.jpg` — face + hand visible
- `test-assets/ultrasound-05-dark.jpg` — low contrast input (harder case)
- `test-assets/challenging-hand.jpg` — hand/finger visible (anatomy accuracy test)
- `test-assets/challenging-features.jpg` — partially visible face (harder case)

---

## 8. Recommended Prompt for Next Production Deploy

Based on the gap analysis and manual research, here is the proposed **V5 prose prompt** to ship immediately (no experiment needed — clearly better):

```
Transform this 4D ultrasound into a photorealistic in-utero macro photograph.

Keep the exact pose, head angle, facial proportions, and framing from the input.
Make as few changes as possible beyond converting ultrasound rendering into photoreal photography.

Convert ultrasound shading to real photographic detail: realistic eyelids, lips, nose,
soft cheeks, subtle peach fuzz, natural skin micro-texture with mild mottling, and
physically plausible subsurface scattering.

Scene: inside the womb with amniotic fluid haze and a few floating specks.

Lighting: warm amber/red transillumination through tissue, gentle bloom, shallow depth of
field (macro portrait look, 50–85mm equivalent, ~f/2), slight vignette.

Style: candid medical macro photo — not studio, not CGI.
```

**V5 negative prompt:**

```
no date stamp, no text, no watermark, no border, not rustic, not aged, no CGI, no 3D render,
no plastic skin, no waxy skin, no beauty filter, no over-smoothing, no over-sharpening,
no extra fingers, no missing fingers, no fused fingers, no duplicated facial features,
no warped anatomy
```
