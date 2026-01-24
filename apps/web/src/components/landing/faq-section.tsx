import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PRICE_DISPLAY } from "@/lib/pricing";

interface FaqSectionProps {
  id?: string;
  className?: string;
}

/**
 * FaqSection Component
 * Displays expandable FAQ items with accordion behavior.
 *
 * Features:
 * - Single item open at a time (type="single")
 * - Keyboard accessible (Tab, Enter/Space)
 * - Screen reader compatible (aria-expanded)
 * - Warm, conversational copy tone
 * - Responsive layout
 *
 * @see Story 2.5 - FAQ Accordion
 */

const faqItems = [
  {
    question: "How accurate is BabyPeek?",
    answer:
      "BabyPeek creates a realistic AI interpretation based on what’s visible in your 4D ultrasound. Results vary by image quality and how clearly the face is shown. It’s meant as a fun preview—not a medical or genetic prediction.",
  },
  {
    question: "How does BabyPeek work?",
    answer:
      "Upload a clear 4D ultrasound image, and our AI transforms it into a realistic baby portrait. You’ll see a free preview first, then you can share it or upgrade to the HD download.",
  },
  {
    question: "What kind of ultrasound works best?",
    answer:
      "The clearer the face in your 4D ultrasound, the better the result. Look for images where the baby's face is visible without obstructions (like hands covering the face or the umbilical cord). A clear view of the nose, lips, and closed eyes gives the best results.",
  },
  {
    question: "How long does it take?",
    answer:
      "Most portraits are ready in about 60 seconds after upload. If your image needs extra processing, it may take a little longer.",
  },
  {
    question: "Why can't the AI predict skin color or hair?",
    answer:
      "Ultrasound images only show shapes and structures - they don't contain color information. The AI focuses on transforming the facial features you can see in the ultrasound into a realistic portrait, but it cannot determine genetic traits like skin tone, eye color, or hair color.",
  },
  {
    question: "What if my ultrasound quality is low?",
    answer:
      "Low quality or blurry ultrasounds may produce less accurate results. If the baby's face isn't clearly visible in your image, the AI has less information to work with. For best results, use a clear 4D ultrasound image where facial features are distinguishable.",
  },
  {
    question: "How much does it cost?",
    answer: `You can preview your baby's portrait for free. The HD download is ${PRICE_DISPLAY} (one-time purchase, no subscription). We also offer gifting so family can purchase it for you.`,
  },
  {
    question: "Is my data private?",
    answer:
      "Yes. Your images are transmitted securely via HTTPS, never shared, and automatically deleted after 30 days. You can also delete your data anytime.",
  },
  {
    question: "What makes the images so realistic?",
    answer:
      "We use advanced AI technology specifically trained to understand baby features from ultrasound images. Each result goes through quality checks to ensure you get the best possible portrait.",
  },
];

export function FaqSection({ id, className }: FaqSectionProps) {
  return (
    <section id={id} className={cn("py-12", className)}>
      <h2 className="font-display text-2xl text-charcoal text-center mb-8">
        Questions? We've got answers
      </h2>

      <Accordion className="w-full">
        {faqItems.map((item, index) => (
          <AccordionItem key={index} value={index}>
            <AccordionTrigger
              className={cn(
                "text-left text-base font-semibold text-charcoal",
                "hover:text-coral hover:no-underline",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
                "min-h-[48px] py-4",
              )}
            >
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-warm-gray text-sm leading-relaxed pb-4">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
